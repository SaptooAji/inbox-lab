import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RateLimitedError, SendingDisabledError } from "@/application/errors/application-errors";
import { parseConfig, type AppConfig } from "@/infrastructure/config/config";
import { createContainer } from "@/infrastructure/container";
import { createBuildOutputFixture, type BuildOutputFixture } from "../unit/support/build-output";
import { ManualClock } from "../unit/support/clocks";
import { aTemplate, validInput } from "../unit/support/fakes";
import { errorOf, unwrap } from "../unit/support/unwrap";
import type { FetchLike } from "@/infrastructure/http/fetch-like";
import { createFakeFetch } from "../unit/support/fake-fetch";

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

  const noNetwork: FetchLike = () => Promise.reject(new Error("No network expected in this test."));

  function build(config: AppConfig = localConfig(), fetch: FetchLike = noNetwork) {
    return createContainer(config, {
      buildOutputDirectory: fixture.directory,
      clock: new ManualClock(),
      write: (line) => printed.push(line),
      fetch,
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

  it("wires the real adapters for every service when they are configured", async () => {
    const { fetch, calls } = createFakeFetch(({ url }) => {
      if (url.startsWith("https://challenges.cloudflare.com/")) {
        return Response.json({ success: true, "error-codes": [] });
      }
      if (url.startsWith("https://redis.example.com/")) {
        return Response.json([{ result: "OK" }, { result: 1 }, { result: 86400 }]);
      }
      if (url === "https://api.resend.com/emails") {
        return Response.json({ id: "resend-1" });
      }
      if (url === "https://hook.example.com/x") {
        return new Response(null, { status: 204 });
      }
      return new Response("unexpected", { status: 500 });
    });
    const config = parseConfig({
      IDENTITY_HASH_SALT: SALT,
      EMAIL_DRIVER: "resend",
      RESEND_API_KEY: "re_key",
      BOT_DRIVER: "turnstile",
      TURNSTILE_SECRET_KEY: "ts_secret",
      RATE_LIMIT_DRIVER: "upstash",
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      UPSTASH_REDIS_REST_TOKEN: "up_token",
      WEBHOOK_URL: "https://hook.example.com/x",
    });

    const receipt = unwrap(await build(config, fetch).sendTestEmail.execute(validInput()));

    expect(receipt.receiptId).toBe("resend-1");
    expect(calls.map((call) => new URL(call.url).hostname)).toEqual([
      "challenges.cloudflare.com",
      "redis.example.com",
      "redis.example.com",
      "redis.example.com",
      "api.resend.com",
      "hook.example.com",
    ]);
  });
});
