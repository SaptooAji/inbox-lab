import type { Result } from "@/domain/result";
import type { EmailDeliveryError } from "../errors/application-errors";

export interface OutgoingEmail {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export interface DeliveryReceipt {
  readonly providerMessageId: string;
}

export interface EmailSender {
  send(email: OutgoingEmail): Promise<Result<DeliveryReceipt, EmailDeliveryError>>;
}
