import { describe, expect, it } from "vitest";
import {
  BotCheckFailedError,
  DailyCapReachedError,
  EmailDeliveryError,
  InvalidRequestError,
  RateLimitedError,
  SendingDisabledError,
  TemplateNotFoundError,
} from "@/application/errors/application-errors";
import { ValidationError } from "@/domain/errors/validation-error";

describe("application errors", () => {
  it("exposes a stable code per error", () => {
    expect(new BotCheckFailedError().code).toBe("BOT_CHECK_FAILED");
    expect(new SendingDisabledError().code).toBe("SENDING_DISABLED");
    expect(new DailyCapReachedError().code).toBe("DAILY_CAP_REACHED");
    expect(new TemplateNotFoundError("ghost").code).toBe("TEMPLATE_NOT_FOUND");
    expect(new EmailDeliveryError("provider down").code).toBe("EMAIL_DELIVERY_FAILED");
    expect(new RateLimitedError("recipient", 120).code).toBe("RATE_LIMITED");
  });

  it("carries scope and retry delay on rate limit errors", () => {
    const error = new RateLimitedError("ip", 3600);

    expect(error.scope).toBe("ip");
    expect(error.retryAfterSeconds).toBe(3600);
  });

  it("is a real Error with a readable name and message", () => {
    const error = new TemplateNotFoundError("ghost");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("TemplateNotFoundError");
    expect(error.message).toContain("ghost");
  });
});

it("carries every validation failure", () => {
  const failures = [new ValidationError("email", "bad"), new ValidationError("firstName", "bad")];
  const error = new InvalidRequestError(failures);

  expect(error.code).toBe("INVALID_REQUEST");
  expect(error.errors).toHaveLength(2);
});
