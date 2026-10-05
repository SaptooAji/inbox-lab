import { EmailDeliveryError } from "@/application/errors/application-errors";
import type { DeliveryReceipt, EmailSender, OutgoingEmail } from "@/application/ports/email-sender";
import type { Logger } from "@/application/ports/logger";
import { err, ok, type Result } from "@/domain/result";
import { HTTP_TIMEOUT_MS, type FetchLike } from "../http/fetch-like";
import { readField } from "../http/read-field";

const RESEND_URL = "https://api.resend.com/emails";
const PROVIDER_ERROR_NAME = /^[a-z_]{1,64}$/;

export interface ResendEmailSenderOptions {
  readonly apiKey: string;
  readonly from: string;
  readonly replyTo: string | undefined;
  readonly fetch: FetchLike;
  readonly logger: Logger;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Only a strict identifier is logged, so provider text that may echo an address never is. */
function providerErrorName(body: unknown): string {
  const name = readField(body, "name");
  return typeof name === "string" && PROVIDER_ERROR_NAME.test(name) ? name : "unknown";
}

export class ResendEmailSender implements EmailSender {
  constructor(private readonly options: ResendEmailSenderOptions) {}

  async send(email: OutgoingEmail): Promise<Result<DeliveryReceipt, EmailDeliveryError>> {
    const { logger } = this.options;

    let response: Response;
    try {
      response = await this.options.fetch(RESEND_URL, this.requestFor(email));
    } catch {
      logger.warn("email request failed", { reason: "unreachable" });
      return err(new EmailDeliveryError("the email service could not be reached"));
    }

    const body = await readJson(response);
    if (!response.ok) {
      logger.warn("email request rejected", {
        status: response.status,
        providerError: providerErrorName(body),
      });
      return err(
        new EmailDeliveryError(`the email service answered with status ${response.status}`),
      );
    }

    const id = readField(body, "id");
    if (typeof id !== "string" || id === "") {
      logger.warn("email request failed", { reason: "unreadable-response" });
      return err(new EmailDeliveryError("the email service sent an unreadable answer"));
    }
    return ok({ providerMessageId: id });
  }

  private requestFor(email: OutgoingEmail): RequestInit {
    const { apiKey, from, replyTo } = this.options;
    return {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(replyTo === undefined ? {} : { reply_to: replyTo }),
      }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    };
  }
}
