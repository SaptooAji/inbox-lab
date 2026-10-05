import { createHash } from "node:crypto";
import type { SendTestEmailInput } from "@/application/dto/send-test-email.dto";
import { EmailDeliveryError } from "@/application/errors/application-errors";
import type { BotVerifier } from "@/application/ports/bot-verifier";
import type { DeliveryReceipt, EmailSender, OutgoingEmail } from "@/application/ports/email-sender";
import type { AppEvent, EventPublisher } from "@/application/ports/event-publisher";
import type { IdentityHasher } from "@/application/ports/identity-hasher";
import type { LogContext, Logger } from "@/application/ports/logger";
import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitRule,
} from "@/application/ports/rate-limiter";
import type {
  MergeValues,
  RenderedEmail,
  TemplateRenderer,
} from "@/application/ports/template-renderer";
import type { TemplateRepository } from "@/application/ports/template-repository";
import type { SendPolicy } from "@/application/send-policy";
import { EmailTemplate } from "@/domain/entities/email-template";
import { err, ok, type Result } from "@/domain/result";
import { EmailSubject } from "@/domain/value-objects/email-subject";
import { TemplateId, type TemplateIdValue } from "@/domain/value-objects/template-id";
import { unwrap } from "./unwrap";

export class FakeBotVerifier implements BotVerifier {
  calls = 0;

  constructor(private readonly passes: boolean = true) {}

  verify(): Promise<boolean> {
    this.calls += 1;
    return Promise.resolve(this.passes);
  }
}

export class FakeEmailSender implements EmailSender {
  readonly sent: OutgoingEmail[] = [];

  constructor(private readonly failureReason: string | null = null) {}

  send(email: OutgoingEmail): Promise<Result<DeliveryReceipt, EmailDeliveryError>> {
    if (this.failureReason !== null) {
      return Promise.resolve(err(new EmailDeliveryError(this.failureReason)));
    }
    this.sent.push(email);
    return Promise.resolve(ok({ providerMessageId: `msg-${this.sent.length}` }));
  }
}

export class FakeRateLimiter implements RateLimiter {
  readonly rules: RateLimitRule[] = [];
  private readonly counts = new Map<string, number>();

  consume(rule: RateLimitRule): Promise<RateLimitDecision> {
    this.rules.push(rule);
    const used = (this.counts.get(rule.key) ?? 0) + 1;
    this.counts.set(rule.key, used);

    const allowed = used <= rule.limit;
    return Promise.resolve({ allowed, retryAfterSeconds: allowed ? 0 : rule.windowSeconds });
  }
}

export class FakeTemplateRepository implements TemplateRepository {
  constructor(private readonly templates: readonly EmailTemplate[] = []) {}

  list(): Promise<readonly EmailTemplate[]> {
    return Promise.resolve(this.templates);
  }

  findById(id: TemplateId): Promise<EmailTemplate | null> {
    return Promise.resolve(this.templates.find((t) => t.id.value === id.value) ?? null);
  }
}

export class FakeTemplateRenderer implements TemplateRenderer {
  render(template: EmailTemplate, values: MergeValues): RenderedEmail {
    return {
      html: `${template.html}|${values.firstName}`,
      darkHtml: `${template.darkHtml}|${values.firstName}`,
      text: `${template.text}|${values.firstName}`,
    };
  }
}

export class FakeEventPublisher implements EventPublisher {
  readonly published: AppEvent[] = [];

  constructor(private readonly shouldFail: boolean = false) {}

  publish(event: AppEvent): Promise<void> {
    if (this.shouldFail) {
      return Promise.reject(new Error("webhook down"));
    }
    this.published.push(event);
    return Promise.resolve();
  }
}

/** A real one-way hash, so tests can prove raw values never reach the rate limiter. */
export class TestIdentityHasher implements IdentityHasher {
  hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}

export interface LogEntry {
  readonly level: "info" | "warn" | "error";
  readonly message: string;
  readonly context: LogContext | undefined;
}

export class SpyLogger implements Logger {
  readonly entries: LogEntry[] = [];

  info(message: string, context?: LogContext): void {
    this.entries.push({ level: "info", message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.entries.push({ level: "warn", message, context });
  }

  error(message: string, context?: LogContext): void {
    this.entries.push({ level: "error", message, context });
  }
}

export function aTemplate(id: TemplateIdValue = "welcome"): EmailTemplate {
  return unwrap(
    EmailTemplate.create({
      id: unwrap(TemplateId.create(id)),
      name: id,
      description: `Template ${id}`,
      defaultSubject: unwrap(EmailSubject.create(`Default subject for ${id}`)),
      html: "<p>html</p>",
      darkHtml: "<p>dark</p>",
      text: "text",
    }),
  );
}

export function validInput(overrides: Partial<SendTestEmailInput> = {}): SendTestEmailInput {
  return {
    email: "rina@example.com",
    firstName: "Rina",
    templateId: "welcome",
    consent: true,
    botToken: "token",
    website: "",
    clientIp: "203.0.113.7",
    ...overrides,
  };
}

export function defaultPolicy(overrides: Partial<SendPolicy> = {}): SendPolicy {
  return {
    sendingEnabled: true,
    globalDailyCap: 30,
    perRecipientDailyLimit: 1,
    perIpDailyLimit: 3,
    ...overrides,
  };
}
