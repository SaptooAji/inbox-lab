import type { DeliveryReceipt, EmailSender, OutgoingEmail } from "@/application/ports/email-sender";
import { ok, type Result } from "@/domain/result";
import type { EmailDeliveryError } from "@/application/errors/application-errors";

/** Local development only. The production guard in the config refuses this driver. */
export class ConsoleEmailSender implements EmailSender {
  private sent = 0;

  constructor(private readonly write: (text: string) => void) {}

  send(email: OutgoingEmail): Promise<Result<DeliveryReceipt, EmailDeliveryError>> {
    this.sent += 1;
    this.write(
      [
        `--- email #${this.sent} (console driver, not sent) ---`,
        `To: ${email.to}`,
        `Subject: ${email.subject}`,
        "",
        email.text,
        "---",
      ].join("\n"),
    );
    return Promise.resolve(ok({ providerMessageId: `console-${this.sent}` }));
  }
}
