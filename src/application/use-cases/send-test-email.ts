import type { EmailTemplate } from "@/domain/entities/email-template";
import { ValidationError } from "@/domain/errors/validation-error";
import { err, ok, type Result } from "@/domain/result";
import { EmailAddress } from "@/domain/value-objects/email-address";
import { EmailSubject } from "@/domain/value-objects/email-subject";
import { RecipientName } from "@/domain/value-objects/recipient-name";
import { TemplateId } from "@/domain/value-objects/template-id";
import type { SendReceipt, SendTestEmailInput } from "../dto/send-test-email.dto";
import {
  BotCheckFailedError,
  DailyCapReachedError,
  type EmailDeliveryError,
  InvalidRequestError,
  RateLimitedError,
  SendingDisabledError,
  TemplateNotFoundError,
} from "../errors/application-errors";
import type { BotVerifier } from "../ports/bot-verifier";
import type { EmailSender } from "../ports/email-sender";
import type { EventPublisher } from "../ports/event-publisher";
import type { IdentityHasher } from "../ports/identity-hasher";
import type { Logger } from "../ports/logger";
import type { RateLimitDecision, RateLimiter } from "../ports/rate-limiter";
import type { TemplateRenderer } from "../ports/template-renderer";
import type { TemplateRepository } from "../ports/template-repository";
import type { SendPolicy } from "../send-policy";

const ONE_DAY_SECONDS = 86_400;
const GLOBAL_LIMIT_KEY = "global:daily";
const DISCARDED_RECEIPT: SendReceipt = { receiptId: "accepted" };

export type SendTestEmailError =
  | SendingDisabledError
  | InvalidRequestError
  | BotCheckFailedError
  | RateLimitedError
  | DailyCapReachedError
  | TemplateNotFoundError
  | EmailDeliveryError;

export interface SendTestEmailDependencies {
  readonly botVerifier: BotVerifier;
  readonly rateLimiter: RateLimiter;
  readonly templates: TemplateRepository;
  readonly renderer: TemplateRenderer;
  readonly sender: EmailSender;
  readonly events: EventPublisher;
  readonly hasher: IdentityHasher;
  readonly logger: Logger;
  readonly policy: SendPolicy;
}

interface ParsedRequest {
  readonly email: EmailAddress;
  readonly firstName: RecipientName;
  readonly templateId: TemplateId;
  readonly subject: EmailSubject | null;
}

function parseOptionalSubject(
  raw: string | undefined,
): Result<EmailSubject | null, ValidationError> {
  if (raw === undefined || raw.trim() === "") {
    return ok(null);
  }
  return EmailSubject.create(raw);
}

function parseRequest(input: SendTestEmailInput): Result<ParsedRequest, InvalidRequestError> {
  const email = EmailAddress.create(input.email);
  const firstName = RecipientName.create(input.firstName);
  const templateId = TemplateId.create(input.templateId);
  const subject = parseOptionalSubject(input.subject);

  if (!email.ok || !firstName.ok || !templateId.ok || !subject.ok || !input.consent) {
    const failures: ValidationError[] = [];
    if (!email.ok) failures.push(email.error);
    if (!firstName.ok) failures.push(firstName.error);
    if (!templateId.ok) failures.push(templateId.error);
    if (!subject.ok) failures.push(subject.error);
    if (!input.consent) {
      failures.push(new ValidationError("consent", "Please confirm you want this one-time email."));
    }
    return err(new InvalidRequestError(failures));
  }

  return ok({
    email: email.value,
    firstName: firstName.value,
    templateId: templateId.value,
    subject: subject.value,
  });
}

export class SendTestEmail {
  constructor(private readonly deps: SendTestEmailDependencies) {}

  async execute(input: SendTestEmailInput): Promise<Result<SendReceipt, SendTestEmailError>> {
    if (!this.deps.policy.sendingEnabled) {
      return err(new SendingDisabledError());
    }
    if (input.website.trim() !== "") {
      return ok(DISCARDED_RECEIPT);
    }

    const parsed = parseRequest(input);
    if (!parsed.ok) {
      return parsed;
    }

    const isHuman = await this.deps.botVerifier.verify(input.botToken, input.clientIp);
    if (!isHuman) {
      return err(new BotCheckFailedError());
    }

    const limited = await this.enforceLimits(parsed.value.email, input.clientIp);
    if (!limited.ok) {
      return limited;
    }

    const template = await this.deps.templates.findById(parsed.value.templateId);
    if (template === null) {
      return err(new TemplateNotFoundError(parsed.value.templateId.value));
    }

    return this.deliver(template, parsed.value);
  }

  private async enforceLimits(
    email: EmailAddress,
    clientIp: string,
  ): Promise<Result<void, RateLimitedError | DailyCapReachedError>> {
    const { hasher, policy } = this.deps;

    const ip = await this.consume(hasher.hash(`ip:${clientIp}`), policy.perIpDailyLimit);
    if (!ip.allowed) {
      return err(new RateLimitedError("ip", ip.retryAfterSeconds));
    }

    const recipient = await this.consume(
      hasher.hash(`recipient:${email.value}`),
      policy.perRecipientDailyLimit,
    );
    if (!recipient.allowed) {
      return err(new RateLimitedError("recipient", recipient.retryAfterSeconds));
    }

    const global = await this.consume(GLOBAL_LIMIT_KEY, policy.globalDailyCap);
    if (!global.allowed) {
      return err(new DailyCapReachedError());
    }
    return ok(undefined);
  }

  private consume(key: string, limit: number): Promise<RateLimitDecision> {
    return this.deps.rateLimiter.consume({ key, limit, windowSeconds: ONE_DAY_SECONDS });
  }

  private async deliver(
    template: EmailTemplate,
    request: ParsedRequest,
  ): Promise<Result<SendReceipt, EmailDeliveryError>> {
    const { renderer, sender, logger } = this.deps;

    const rendered = renderer.render(template, { firstName: request.firstName.value });
    const subject = request.subject ?? template.defaultSubject;
    const sent = await sender.send({
      to: request.email.value,
      subject: subject.value,
      html: rendered.html,
      text: rendered.text,
    });
    if (!sent.ok) {
      return sent;
    }

    const receiptId = sent.value.providerMessageId;
    logger.info("test email sent", { templateId: template.id.value, receiptId });
    await this.publishSentEvent(template);
    return ok({ receiptId });
  }

  /** The email is already sent, so a failing webhook must not fail the request. */
  private async publishSentEvent(template: EmailTemplate): Promise<void> {
    try {
      await this.deps.events.publish({ type: "test-email.sent", templateId: template.id.value });
    } catch {
      this.deps.logger.warn("event publishing failed", { templateId: template.id.value });
    }
  }
}
