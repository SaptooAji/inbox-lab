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
import type { SendPolicy } from "@/application/send-policy";
import { SendTestEmail } from "@/application/use-cases/send-test-email";
import type { EmailTemplate } from "@/domain/entities/email-template";
import {
  aTemplate,
  defaultPolicy,
  FakeBotVerifier,
  FakeEmailSender,
  FakeEventPublisher,
  FakeRateLimiter,
  FakeTemplateRenderer,
  FakeTemplateRepository,
  SpyLogger,
  TestIdentityHasher,
  validInput,
} from "../../support/fakes";
import { errorOf, unwrap } from "../../support/unwrap";

interface SutOptions {
  readonly policy?: Partial<SendPolicy>;
  readonly botPasses?: boolean;
  readonly senderFailure?: string;
  readonly eventsFail?: boolean;
  readonly templates?: readonly EmailTemplate[];
}

function createSut(options: SutOptions = {}) {
  const botVerifier = new FakeBotVerifier(options.botPasses ?? true);
  const rateLimiter = new FakeRateLimiter();
  const sender = new FakeEmailSender(options.senderFailure ?? null);
  const events = new FakeEventPublisher(options.eventsFail ?? false);
  const logger = new SpyLogger();
  const useCase = new SendTestEmail({
    botVerifier,
    rateLimiter,
    templates: new FakeTemplateRepository(options.templates ?? [aTemplate()]),
    renderer: new FakeTemplateRenderer(),
    sender,
    events,
    hasher: new TestIdentityHasher(),
    logger,
    policy: defaultPolicy(options.policy),
  });
  return { useCase, botVerifier, rateLimiter, sender, events, logger };
}

describe("SendTestEmail", () => {
  describe("happy path", () => {
    it("sends the rendered template with its default subject", async () => {
      const sut = createSut();

      const receipt = unwrap(await sut.useCase.execute(validInput()));

      expect(receipt.receiptId).toBe("msg-1");
      expect(sut.sender.sent).toEqual([
        {
          to: "rina@example.com",
          subject: "Default subject for welcome",
          html: "<p>html</p>|Rina",
          text: "text|Rina",
        },
      ]);
      expect(sut.events.published).toEqual([{ type: "test-email.sent", templateId: "welcome" }]);
    });

    it("uses a custom subject when one is given", async () => {
      const sut = createSut();

      await sut.useCase.execute(validInput({ subject: " Hello Rina " }));

      expect(sut.sender.sent[0]?.subject).toBe("Hello Rina");
    });

    it("falls back to the default subject when the subject is blank", async () => {
      const sut = createSut();

      await sut.useCase.execute(validInput({ subject: "   " }));

      expect(sut.sender.sent[0]?.subject).toBe("Default subject for welcome");
    });

    it("never logs personal data", async () => {
      const sut = createSut();

      await sut.useCase.execute(validInput());

      const logged = JSON.stringify(sut.logger.entries);
      expect(logged).not.toContain("rina@example.com");
      expect(logged).not.toContain("Rina");
      expect(logged).not.toContain("203.0.113.7");
    });
  });

  describe("guards", () => {
    it("refuses to send when the kill switch is off", async () => {
      const sut = createSut({ policy: { sendingEnabled: false } });

      const result = await sut.useCase.execute(validInput());

      expect(errorOf(result)).toBeInstanceOf(SendingDisabledError);
      expect(sut.sender.sent).toHaveLength(0);
    });

    it("silently discards honeypot submissions without any side effects", async () => {
      const sut = createSut();

      const result = await sut.useCase.execute(validInput({ website: "http://spam.example" }));

      expect(result.ok).toBe(true);
      expect(sut.sender.sent).toHaveLength(0);
      expect(sut.botVerifier.calls).toBe(0);
      expect(sut.rateLimiter.rules).toHaveLength(0);
    });

    it("reports every invalid field at once", async () => {
      const sut = createSut();

      const error = errorOf(
        await sut.useCase.execute(validInput({ email: "nope", firstName: "", consent: false })),
      );

      expect(error).toBeInstanceOf(InvalidRequestError);
      if (error instanceof InvalidRequestError) {
        expect(error.errors.map((e) => e.field)).toEqual(["email", "firstName", "consent"]);
      }
    });

    it("does not spend bot checks or limits on invalid requests", async () => {
      const sut = createSut();

      await sut.useCase.execute(validInput({ email: "nope" }));

      expect(sut.botVerifier.calls).toBe(0);
      expect(sut.rateLimiter.rules).toHaveLength(0);
    });

    it("rejects a failed bot check before touching the limits", async () => {
      const sut = createSut({ botPasses: false });

      const result = await sut.useCase.execute(validInput());

      expect(errorOf(result)).toBeInstanceOf(BotCheckFailedError);
      expect(sut.rateLimiter.rules).toHaveLength(0);
      expect(sut.sender.sent).toHaveLength(0);
    });

    it("rejects an unknown template id", async () => {
      const sut = createSut();

      const error = errorOf(await sut.useCase.execute(validInput({ templateId: "unknown" })));

      expect(error).toBeInstanceOf(InvalidRequestError);
      if (error instanceof InvalidRequestError) {
        expect(error.errors.map((e) => e.field)).toEqual(["templateId"]);
      }
    });

    it("rejects a subject with a line break (header injection)", async () => {
      const sut = createSut();

      const error = errorOf(
        await sut.useCase.execute(validInput({ subject: "Hi\nBcc: victim@example.com" })),
      );

      expect(error).toBeInstanceOf(InvalidRequestError);
      if (error instanceof InvalidRequestError) {
        expect(error.errors.map((e) => e.field)).toEqual(["subject"]);
      }
      expect(sut.sender.sent).toHaveLength(0);
    });
  });

  describe("rate limits", () => {
    it("allows one email per recipient per day", async () => {
      const sut = createSut();
      await sut.useCase.execute(validInput({ clientIp: "198.51.100.1" }));

      const second = errorOf(await sut.useCase.execute(validInput({ clientIp: "198.51.100.2" })));

      expect(second).toBeInstanceOf(RateLimitedError);
      if (second instanceof RateLimitedError) {
        expect(second.scope).toBe("recipient");
        expect(second.retryAfterSeconds).toBe(86_400);
      }
      expect(sut.sender.sent).toHaveLength(1);
    });

    it("allows three emails per client IP per day", async () => {
      const sut = createSut();
      for (const name of ["a", "b", "c"]) {
        unwrap(await sut.useCase.execute(validInput({ email: `${name}@example.com` })));
      }

      const fourth = errorOf(await sut.useCase.execute(validInput({ email: "d@example.com" })));

      expect(fourth).toBeInstanceOf(RateLimitedError);
      if (fourth instanceof RateLimitedError) {
        expect(fourth.scope).toBe("ip");
      }
      expect(sut.sender.sent).toHaveLength(3);
    });

    it("stops everything once the global daily cap is reached", async () => {
      const sut = createSut({ policy: { globalDailyCap: 1 } });
      unwrap(
        await sut.useCase.execute(validInput({ email: "a@example.com", clientIp: "198.51.100.1" })),
      );

      const result = await sut.useCase.execute(
        validInput({ email: "b@example.com", clientIp: "198.51.100.2" }),
      );

      expect(errorOf(result)).toBeInstanceOf(DailyCapReachedError);
      expect(sut.sender.sent).toHaveLength(1);
    });

    it("only gives the rate limiter hashed identities", async () => {
      const sut = createSut();

      await sut.useCase.execute(validInput());

      const keys = sut.rateLimiter.rules.map((rule) => rule.key).join(" ");
      expect(keys).not.toContain("rina@example.com");
      expect(keys).not.toContain("203.0.113.7");
    });
  });

  describe("delivery", () => {
    it("reports a missing template", async () => {
      const sut = createSut({ templates: [] });

      const result = await sut.useCase.execute(validInput());

      expect(errorOf(result)).toBeInstanceOf(TemplateNotFoundError);
    });

    it("returns the provider failure and publishes no event", async () => {
      const sut = createSut({ senderFailure: "provider down" });

      const result = await sut.useCase.execute(validInput());

      expect(errorOf(result)).toBeInstanceOf(EmailDeliveryError);
      expect(sut.events.published).toHaveLength(0);
    });

    it("still succeeds when publishing the event fails, and logs a warning", async () => {
      const sut = createSut({ eventsFail: true });

      const result = await sut.useCase.execute(validInput());

      expect(result.ok).toBe(true);
      expect(sut.sender.sent).toHaveLength(1);
      expect(sut.logger.entries.some((entry) => entry.level === "warn")).toBe(true);
    });
  });
});
