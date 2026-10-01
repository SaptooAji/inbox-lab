import { z } from "zod";
import type { SendPolicy } from "@/application/send-policy";
import { err, ok, type Result } from "@/domain/result";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type EmailTransportConfig =
  { readonly driver: "console" } | { readonly driver: "resend"; readonly apiKey: string };

export type BotConfig =
  { readonly driver: "noop" } | { readonly driver: "turnstile"; readonly secretKey: string };

export type RateLimitConfig =
  | { readonly driver: "memory" }
  | { readonly driver: "upstash"; readonly url: string; readonly token: string };

export interface AppConfig {
  readonly siteUrl: string;
  readonly logLevel: LogLevel;
  readonly identityHashSalt: string;
  readonly policy: SendPolicy;
  readonly email: {
    readonly from: string;
    readonly replyTo: string | undefined;
    readonly transport: EmailTransportConfig;
  };
  readonly bot: BotConfig;
  readonly rateLimit: RateLimitConfig;
  readonly webhookUrl: string | undefined;
}

type Env = Readonly<Record<string, string | undefined>>;

export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid configuration:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

const schema = z.object({
  SITE_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  IDENTITY_HASH_SALT: z.string().min(16),
  SENDING_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  GLOBAL_DAILY_CAP: z.coerce.number().int().min(0).default(30),
  PER_RECIPIENT_DAILY_LIMIT: z.coerce.number().int().min(0).default(1),
  PER_IP_DAILY_LIMIT: z.coerce.number().int().min(0).default(3),
  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().min(3).default("WDNusantara <hello@mail.wdnusantara.my.id>"),
  EMAIL_REPLY_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  BOT_DRIVER: z.enum(["noop", "turnstile"]).default("noop"),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  RATE_LIMIT_DRIVER: z.enum(["memory", "upstash"]).default("memory"),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  WEBHOOK_URL: z.url().optional(),
});

/** Blank values count as unset, so an empty "GLOBAL_DAILY_CAP=" cannot coerce to zero. */
function withoutBlanks(source: Env): Env {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value.trim() !== ""),
  );
}

function resolveEmail(env: Env): Result<EmailTransportConfig, string> {
  if (env.EMAIL_DRIVER !== "resend") {
    return ok<EmailTransportConfig>({ driver: "console" });
  }
  return env.RESEND_API_KEY === undefined
    ? err("RESEND_API_KEY is required when EMAIL_DRIVER=resend.")
    : ok<EmailTransportConfig>({ driver: "resend", apiKey: env.RESEND_API_KEY });
}

function resolveBot(env: Env): Result<BotConfig, string> {
  if (env.BOT_DRIVER !== "turnstile") {
    return ok<BotConfig>({ driver: "noop" });
  }
  return env.TURNSTILE_SECRET_KEY === undefined
    ? err("TURNSTILE_SECRET_KEY is required when BOT_DRIVER=turnstile.")
    : ok<BotConfig>({ driver: "turnstile", secretKey: env.TURNSTILE_SECRET_KEY });
}

function resolveRateLimit(env: Env): Result<RateLimitConfig, string> {
  if (env.RATE_LIMIT_DRIVER !== "upstash") {
    return ok<RateLimitConfig>({ driver: "memory" });
  }
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env;
  return url === undefined || token === undefined
    ? err(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required when RATE_LIMIT_DRIVER=upstash.",
      )
    : ok<RateLimitConfig>({ driver: "upstash", url, token });
}

const LOCAL_DRIVERS: readonly (readonly [string, string])[] = [
  ["EMAIL_DRIVER", "console"],
  ["BOT_DRIVER", "noop"],
  ["RATE_LIMIT_DRIVER", "memory"],
];

/** A production deploy must never run with the bot check, real email or real limits switched off. */
function productionProblems(env: Env): string[] {
  if (env.NODE_ENV !== "production") {
    return [];
  }
  return LOCAL_DRIVERS.filter(([name, local]) => (env[name] ?? local) === local).map(
    ([name, local]) => `${name} must not be "${local}" in production.`,
  );
}

/** Pure and testable: reads only what it is given. Call it lazily, never at import time. */
export function parseConfig(source: Env): AppConfig {
  const env = withoutBlanks(source);
  const parsed = schema.safeParse(env);
  const email = resolveEmail(env);
  const bot = resolveBot(env);
  const rateLimit = resolveRateLimit(env);

  const problems = [
    ...(parsed.success
      ? []
      : parsed.error.issues.map(
          (issue) => `${issue.path.map(String).join(".")}: ${issue.message}`,
        )),
    ...[email, bot, rateLimit].flatMap((resolved) => (resolved.ok ? [] : [resolved.error])),
    ...productionProblems(env),
  ];

  if (!parsed.success || !email.ok || !bot.ok || !rateLimit.ok || problems.length > 0) {
    throw new ConfigError(problems);
  }

  const data = parsed.data;
  return {
    siteUrl: data.SITE_URL,
    logLevel: data.LOG_LEVEL,
    identityHashSalt: data.IDENTITY_HASH_SALT,
    policy: {
      sendingEnabled: data.SENDING_ENABLED,
      globalDailyCap: data.GLOBAL_DAILY_CAP,
      perRecipientDailyLimit: data.PER_RECIPIENT_DAILY_LIMIT,
      perIpDailyLimit: data.PER_IP_DAILY_LIMIT,
    },
    email: { from: data.EMAIL_FROM, replyTo: data.EMAIL_REPLY_TO, transport: email.value },
    bot: bot.value,
    rateLimit: rateLimit.value,
    webhookUrl: data.WEBHOOK_URL,
  };
}
