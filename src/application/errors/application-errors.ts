export abstract class ApplicationError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class SendingDisabledError extends ApplicationError {
  readonly code = "SENDING_DISABLED";

  constructor() {
    super("Sending is temporarily disabled.");
  }
}

export class DailyCapReachedError extends ApplicationError {
  readonly code = "DAILY_CAP_REACHED";

  constructor() {
    super("The daily demo limit has been reached.");
  }
}

export class BotCheckFailedError extends ApplicationError {
  readonly code = "BOT_CHECK_FAILED";

  constructor() {
    super("The bot check did not pass.");
  }
}

export type RateLimitScope = "recipient" | "ip";

export class RateLimitedError extends ApplicationError {
  readonly code = "RATE_LIMITED";

  constructor(
    readonly scope: RateLimitScope,
    readonly retryAfterSeconds: number,
  ) {
    super(`Rate limit reached for ${scope}.`);
  }
}

export class TemplateNotFoundError extends ApplicationError {
  readonly code = "TEMPLATE_NOT_FOUND";

  constructor(templateId: string) {
    super(`Template "${templateId}" was not found.`);
  }
}

export class EmailDeliveryError extends ApplicationError {
  readonly code = "EMAIL_DELIVERY_FAILED";

  constructor(reason: string) {
    super(`The email could not be delivered: ${reason}`);
  }
}
