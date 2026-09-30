export interface SendTestEmailInput {
  readonly email: string;
  readonly firstName: string;
  readonly subject?: string | undefined;
  readonly templateId: string;
  readonly consent: boolean;
  readonly botToken: string;
  /** Honeypot field: real people never fill it. */
  readonly website: string;
  readonly clientIp: string;
}

export interface SendReceipt {
  readonly receiptId: string;
}
