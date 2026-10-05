import { describe, expect, it } from "vitest";
import {
  BotCheckFailedError,
  DailyCapReachedError,
  EmailDeliveryError,
  InvalidRequestError,
  RateLimitedError,
  SendingDisabledError,
  TemplateNotFoundError,
  type ApplicationError,
} from "@/application/errors/application-errors";
import type { SendTestEmailError } from "@/application/use-cases/send-test-email";
import { ValidationError } from "@/domain/errors/validation-error";
import { toProblem } from "@/presentation/http/map-error-to-http";

const invalid = new InvalidRequestError([
  new ValidationError("email", "Enter a valid email address."),
]);

const table: [ApplicationError & SendTestEmailError, number, string][] = [
  [invalid, 400, "INVALID_REQUEST"],
  [new BotCheckFailedError(), 403, "BOT_CHECK_FAILED"],
  [new TemplateNotFoundError("ghost"), 404, "TEMPLATE_NOT_FOUND"],
  [new RateLimitedError("ip", 120), 429, "RATE_LIMITED"],
  [new DailyCapReachedError(), 503, "DAILY_CAP_REACHED"],
  [new SendingDisabledError(), 503, "SENDING_DISABLED"],
  [new EmailDeliveryError("secret provider detail"), 503, "EMAIL_DELIVERY_FAILED"],
];

describe("toProblem", () => {
  it.each(table)("maps %o to %i %s", (error, status, code) => {
    const problem = toProblem(error);

    expect(problem.status).toBe(status);
    expect(problem.code).toBe(code);
    expect(problem.detail.length).toBeGreaterThan(0);
  });

  it("lists every invalid field", () => {
    expect(toProblem(invalid).errors).toEqual([
      { field: "email", message: "Enter a valid email address." },
    ]);
  });

  it("tells the client how long to wait", () => {
    expect(toProblem(new RateLimitedError("recipient", 3600)).headers).toEqual({
      "Retry-After": "3600",
    });
  });

  it("never echoes user input or provider messages", () => {
    expect(toProblem(new TemplateNotFoundError("ghost")).detail).not.toContain("ghost");
    expect(toProblem(new EmailDeliveryError("secret provider detail")).detail).not.toContain(
      "secret",
    );
  });
});
