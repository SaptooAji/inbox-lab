import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RateLimitedError, SendingDisabledError } from "@/application/errors/application-errors";
import { parseConfig, type AppConfig } from "@/infrastructure/config/config";
import { createContainer } from "@/infrastructure/container";
import { createBuildOutputFixture, type BuildOutputFixture } from "../unit/support/build-output";
import { ManualClock } from "../unit/support/clocks";
import { aTemplate, validInput } from "../unit/support/fakes";
import { errorOf, unwrap } from "../unit/support/unwrap";

const SALT = "a-long-enough-secret-salt";
const localConfig = (): AppConfig => parseConfig({ IDENTITY_HASH_SALT: SALT });

describe("createContainer", () => {
  let fixture: BuildOutputFixture;
  let printed: string[];

  beforeEach(() => {
    fixture = createBuildOutputFixture([aTemplate("welcome"), aTemplate("win-back")]);
    printed = [];
  });

  afterEach(() => {
    fixture.dispose();
  });

  function build(config: AppConfig = localConfig()) {
    return createContainer(config, {
      buildOutputDirectory: fixture.directory,
      clock: new ManualClock(),
      write: (line) => printed.push(line),
    });
  }

  it("sends a template through the whole flow and prints the email", async () => {
    const container = build();

    const receipt = unwrap(await container.sendTestEmail.execute(validInput()));

    expect(receipt.receiptId).toBe("console-1");
    const email = printed.find((line) => line.includes("To: rina@example.com"));
    expect(email).toContain("Subject: Default subject for welcome");
  });

  it("enforces the per-recipient limit with the real in-memory limiter", async () => {
    const container = build();
    unwrap(await container.sendTestEmail.execute(validInput({ clientIp: "198.51.100.1" })));

    const second = errorOf(
      await container.sendTestEmail.execute(validInput({ clientIp: "198.51.100.2" })),
    );

    expect(second).toBeInstanceOf(RateLimitedError);
  });

  it("honours the kill switch from the config", async () => {
    const config = localConfig();
    const container = build({ ...config, policy: { ...config.policy, sendingEnabled: false } });

    const result = await container.sendTestEmail.execute(validInput());

    expect(errorOf(result)).toBeInstanceOf(SendingDisabledError);
  });

  it("never logs the visitor's address, name or IP", async () => {
    const container = build();

    await container.sendTestEmail.execute(validInput());

    const logLines = printed.filter((line) => line.startsWith("{"));
    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(line).not.toContain("rina@example.com");
      expect(line).not.toContain("203.0.113.7");
    }
  });

  it("lists and previews the templates it finds in the build output", async () => {
    const container = build();

    const listed = await container.listTemplates.execute();
    const preview = unwrap(await container.getTemplate.execute("welcome"));

    expect(listed.map((template) => template.id)).toEqual(["welcome", "win-back"]);
    expect(preview.id).toBe("welcome");
  });

  it.each([
    { EMAIL_DRIVER: "resend", RESEND_API_KEY: "key" },
    { BOT_DRIVER: "turnstile", TURNSTILE_SECRET_KEY: "secret" },
    {
      RATE_LIMIT_DRIVER: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      UPSTASH_REDIS_REST_TOKEN: "token",
    },
    { WEBHOOK_URL: "https://hook.example.com/x" },
  ])("refuses a real driver that has no adapter yet: %j", (env) => {
    expect(() => build(parseConfig({ IDENTITY_HASH_SALT: SALT, ...env }))).toThrow(
      "not implemented yet",
    );
  });
});
