import { afterEach, describe, expect, it, vi } from "vitest";
import type { SendTestEmailInput, SendReceipt } from "@/application/dto/send-test-email.dto";
import {
  EmailDeliveryError,
  InvalidRequestError,
  RateLimitedError,
} from "@/application/errors/application-errors";
import type { SendTestEmailError } from "@/application/use-cases/send-test-email";
import { ValidationError } from "@/domain/errors/validation-error";
import { ok, type Result, err } from "@/domain/result";
import { ConfigError } from "@/infrastructure/config/config";
import { handleTestSend } from "@/presentation/http/handle-test-send";
import { SpyLogger } from "../../support/fakes";

type Outcome =
  { readonly result: Result<SendReceipt, SendTestEmailError> } | { readonly throws: unknown };

class FakeSendTestEmail {
  readonly calls: SendTestEmailInput[] = [];

  constructor(private readonly outcome: Outcome = { result: ok({ receiptId: "r-1" }) }) {}

  execute(input: SendTestEmailInput): Promise<Result<SendReceipt, SendTestEmailError>> {
    this.calls.push(input);
    return "throws" in this.outcome
      ? Promise.reject(this.outcome.throws)
      : Promise.resolve(this.outcome.result);
  }
}

const valid = {
  email: "rina@example.com",
  firstName: "Rina",
  templateId: "welcome",
  consent: true,
  botToken: "token",
};

function jsonRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/test-sends", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function setup(outcome?: Outcome) {
  const sendTestEmail = new FakeSendTestEmail(outcome);
  const logger = new SpyLogger();
  const handle = (request: Request) => handleTestSend(request, () => ({ sendTestEmail, logger }));
  return { sendTestEmail, logger, handle };
}

const bodyOf = async (response: Response): Promise<unknown> => response.json();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleTestSend success", () => {
  it("answers 202 with the receipt id", async () => {
    const response = await setup().handle(jsonRequest(valid));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await bodyOf(response)).toEqual({ receiptId: "r-1" });
  });

  it("passes the parsed body and the client IP to the use case", async () => {
    const sut = setup();

    await sut.handle(jsonRequest(valid, { "x-real-ip": "203.0.113.7" }));

    expect(sut.sendTestEmail.calls[0]).toEqual({ ...valid, website: "", clientIp: "203.0.113.7" });
  });

  it("forwards an optional subject", async () => {
    const sut = setup();

    await sut.handle(jsonRequest({ ...valid, subject: "Hi there" }));

    expect(sut.sendTestEmail.calls[0]?.subject).toBe("Hi there");
  });

  it("accepts a content type with a charset", async () => {
    const response = await setup().handle(
      jsonRequest(valid, { "content-type": "application/json; charset=utf-8" }),
    );

    expect(response.status).toBe(202);
  });
});

describe("handleTestSend request checks", () => {
  it("rejects a request that is not JSON with 415", async () => {
    const sut = setup();
    const request = new Request("http://localhost/api/v1/test-sends", {
      method: "POST",
      body: JSON.stringify(valid),
    });

    const response = await sut.handle(request);

    expect(response.status).toBe(415);
    expect(sut.sendTestEmail.calls).toHaveLength(0);
  });

  it("rejects an oversized body with 413", async () => {
    const sut = setup();

    const response = await sut.handle(jsonRequest({ ...valid, website: "x".repeat(9000) }));

    expect(response.status).toBe(413);
    expect(sut.sendTestEmail.calls).toHaveLength(0);
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await setup().handle(jsonRequest("{ not json"));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({ code: "INVALID_JSON" });
  });

  it("rejects a body with the wrong shape and lists the fields", async () => {
    const sut = setup();

    const response = await sut.handle(jsonRequest({}));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({ code: "INVALID_REQUEST" });
    expect(sut.sendTestEmail.calls).toHaveLength(0);
  });
});

describe("handleTestSend failures from the use case", () => {
  it("maps a rate limit to 429 with Retry-After", async () => {
    const response = await setup({ result: err(new RateLimitedError("ip", 3600)) }).handle(
      jsonRequest(valid),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3600");
  });

  it("lists the invalid fields the use case found", async () => {
    const invalid = new InvalidRequestError([
      new ValidationError("email", "Enter a valid email address."),
    ]);

    const response = await setup({ result: err(invalid) }).handle(jsonRequest(valid));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({
      code: "INVALID_REQUEST",
      errors: [{ field: "email", message: "Enter a valid email address." }],
    });
  });

  it("logs the code, not the reason, when delivery fails", async () => {
    const sut = setup({ result: err(new EmailDeliveryError("provider said rina@example.com")) });

    const response = await sut.handle(jsonRequest(valid));

    expect(response.status).toBe(503);
    expect(sut.logger.entries).toEqual([
      {
        level: "warn",
        message: "a test send was not delivered",
        context: { code: "EMAIL_DELIVERY_FAILED" },
      },
    ]);
    expect(JSON.stringify(await bodyOf(response))).not.toContain("rina@example.com");
  });
});

describe("handleTestSend unexpected faults", () => {
  it("answers 500, logs the error, and tells the client nothing internal", async () => {
    const sut = setup({ throws: new Error("database exploded") });

    const response = await sut.handle(jsonRequest(valid));

    expect(response.status).toBe(500);
    expect(JSON.stringify(await bodyOf(response))).not.toContain("database exploded");
    expect(sut.logger.entries[0]).toMatchObject({
      level: "error",
      context: { errorName: "Error", errorMessage: "database exploded" },
    });
  });

  it("copes with something that is not an Error being thrown", async () => {
    const sut = setup({ throws: "plain text" });

    const response = await sut.handle(jsonRequest(valid));

    expect(response.status).toBe(500);
    expect(sut.logger.entries[0]?.context).toEqual({
      errorName: "unknown",
      errorMessage: "unknown",
    });
  });

  it("answers 500 and keeps config problems private when the container cannot be built", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handleTestSend(jsonRequest(valid), () => {
      throw new ConfigError(["IDENTITY_HASH_SALT: required"]);
    });

    expect(response.status).toBe(500);
    expect(JSON.stringify(await bodyOf(response))).not.toContain("IDENTITY_HASH_SALT");
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
