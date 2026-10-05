import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "@/infrastructure/config/config";

const SALT = "a-long-enough-secret-salt";
const base = { IDENTITY_HASH_SALT: SALT };

const production = {
  NODE_ENV: "production",
  IDENTITY_HASH_SALT: SALT,
  EMAIL_DRIVER: "resend",
  RESEND_API_KEY: "re_key",
  BOT_DRIVER: "turnstile",
  TURNSTILE_SECRET_KEY: "ts_secret",
  RATE_LIMIT_DRIVER: "upstash",
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

const without = (env: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(env).filter(([name]) => name !== key));

describe("parseConfig defaults", () => {
  it("falls back to safe local settings", () => {
    expect(parseConfig(base)).toEqual({
      siteUrl: "http://localhost:3000",
      logLevel: "info",
      identityHashSalt: SALT,
      policy: {
        sendingEnabled: true,
        globalDailyCap: 30,
        perRecipientDailyLimit: 1,
        perIpDailyLimit: 3,
      },
      email: {
        from: "WDNusantara <hello@mail.wdnusantara.my.id>",
        replyTo: undefined,
        transport: { driver: "console" },
      },
      bot: { driver: "noop" },
      rateLimit: { driver: "memory" },
      webhookUrl: undefined,
    });
  });

  it("treats blank values as unset, so an empty cap cannot become zero", () => {
    const config = parseConfig({ ...base, GLOBAL_DAILY_CAP: "", EMAIL_REPLY_TO: "  " });

    expect(config.policy.globalDailyCap).toBe(30);
    expect(config.email.replyTo).toBeUndefined();
  });
});

describe("parseConfig overrides", () => {
  it("reads every setting it supports", () => {
    const config = parseConfig({
      ...base,
      SITE_URL: "https://inbox.wdnusantara.my.id",
      LOG_LEVEL: "debug",
      SENDING_ENABLED: "false",
      GLOBAL_DAILY_CAP: "5",
      PER_RECIPIENT_DAILY_LIMIT: "2",
      PER_IP_DAILY_LIMIT: "4",
      EMAIL_FROM: "Test <t@example.com>",
      EMAIL_REPLY_TO: "me@example.com",
      WEBHOOK_URL: "https://hook.example.com/x",
    });

    expect(config.siteUrl).toBe("https://inbox.wdnusantara.my.id");
    expect(config.logLevel).toBe("debug");
    expect(config.policy).toEqual({
      sendingEnabled: false,
      globalDailyCap: 5,
      perRecipientDailyLimit: 2,
      perIpDailyLimit: 4,
    });
    expect(config.email.from).toBe("Test <t@example.com>");
    expect(config.email.replyTo).toBe("me@example.com");
    expect(config.webhookUrl).toBe("https://hook.example.com/x");
  });
});

describe("parseConfig validation", () => {
  it("requires the identity salt and rejects a short one", () => {
    expect(() => parseConfig({})).toThrow("IDENTITY_HASH_SALT");
    expect(() => parseConfig({ IDENTITY_HASH_SALT: "short" })).toThrow("IDENTITY_HASH_SALT");
  });

  it.each([
    ["GLOBAL_DAILY_CAP", "abc"],
    ["GLOBAL_DAILY_CAP", "-1"],
    ["GLOBAL_DAILY_CAP", "1.5"],
    ["PER_IP_DAILY_LIMIT", "many"],
    ["SENDING_ENABLED", "yes"],
    ["SITE_URL", "not a url"],
    ["LOG_LEVEL", "loud"],
    ["EMAIL_DRIVER", "sendgrid"],
  ])("rejects %s=%j", (name, value) => {
    const run = () => parseConfig({ ...base, [name]: value });

    expect(run).toThrow(ConfigError);
    expect(run).toThrow(name);
  });

  it("reports every problem at once", () => {
    const run = () => parseConfig({ GLOBAL_DAILY_CAP: "x", EMAIL_DRIVER: "resend" });

    expect(run).toThrow("IDENTITY_HASH_SALT");
    expect(run).toThrow("GLOBAL_DAILY_CAP");
    expect(run).toThrow("RESEND_API_KEY");
  });
});

describe("parseConfig real drivers", () => {
  it("builds each transport from its secrets", () => {
    const config = parseConfig(production);

    expect(config.email.transport).toEqual({ driver: "resend", apiKey: "re_key" });
    expect(config.bot).toEqual({ driver: "turnstile", secretKey: "ts_secret" });
    expect(config.rateLimit).toEqual({
      driver: "upstash",
      url: "https://redis.example.com",
      token: "token",
    });
  });

  it.each([
    "RESEND_API_KEY",
    "TURNSTILE_SECRET_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ])("requires %s for its driver", (name) => {
    expect(() => parseConfig(without(production, name))).toThrow(name);
  });
});

describe("parseConfig production guard", () => {
  it("refuses local drivers in production", () => {
    const run = () => parseConfig({ ...base, NODE_ENV: "production" });

    expect(run).toThrow('EMAIL_DRIVER must not be "console" in production');
    expect(run).toThrow('BOT_DRIVER must not be "noop" in production');
    expect(run).toThrow('RATE_LIMIT_DRIVER must not be "memory" in production');
  });
});
