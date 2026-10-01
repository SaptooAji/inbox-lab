import type { BotVerifier } from "@/application/ports/bot-verifier";
import type { Clock } from "@/application/ports/clock";
import type { EmailSender } from "@/application/ports/email-sender";
import type { EventPublisher } from "@/application/ports/event-publisher";
import type { Logger } from "@/application/ports/logger";
import type { RateLimiter } from "@/application/ports/rate-limiter";
import { GetTemplate } from "@/application/use-cases/get-template";
import { ListTemplates } from "@/application/use-cases/list-templates";
import { SendTestEmail } from "@/application/use-cases/send-test-email";
import { NoopBotVerifier } from "./bot/noop-bot-verifier";
import type { AppConfig } from "./config/config";
import { ConsoleEmailSender } from "./email/console-email-sender";
import { NoopEventPublisher } from "./events/noop-event-publisher";
import { JsonLogger } from "./logging/json-logger";
import { InMemoryRateLimiter } from "./rate-limit/in-memory-rate-limiter";
import { HmacIdentityHasher } from "./security/hmac-identity-hasher";
import { FileSystemTemplateRepository } from "./templates/file-system-template-repository";
import { MergeTagRenderer } from "./templates/merge-tag-renderer";

export interface Container {
  readonly sendTestEmail: SendTestEmail;
  readonly listTemplates: ListTemplates;
  readonly getTemplate: GetTemplate;
  readonly logger: Logger;
}

export interface ContainerOptions {
  readonly buildOutputDirectory: string;
  readonly clock: Clock;
  readonly write: (line: string) => void;
}

/** Temporary: each call site disappears when its real adapter is added. */
function notImplementedYet(setting: string): never {
  throw new Error(`${setting} is not implemented yet.`);
}

function createEmailSender(config: AppConfig, write: (line: string) => void): EmailSender {
  switch (config.email.transport.driver) {
    case "console":
      return new ConsoleEmailSender(write);
    case "resend":
      return notImplementedYet("EMAIL_DRIVER=resend");
  }
}

function createBotVerifier(config: AppConfig): BotVerifier {
  switch (config.bot.driver) {
    case "noop":
      return new NoopBotVerifier();
    case "turnstile":
      return notImplementedYet("BOT_DRIVER=turnstile");
  }
}

function createRateLimiter(config: AppConfig, clock: Clock): RateLimiter {
  switch (config.rateLimit.driver) {
    case "memory":
      return new InMemoryRateLimiter(clock);
    case "upstash":
      return notImplementedYet("RATE_LIMIT_DRIVER=upstash");
  }
}

function createEventPublisher(config: AppConfig): EventPublisher {
  return config.webhookUrl === undefined
    ? new NoopEventPublisher()
    : notImplementedYet("WEBHOOK_URL");
}

/** The only place that decides which adapter implements which port. */
export function createContainer(config: AppConfig, options: ContainerOptions): Container {
  const logger = new JsonLogger(config.logLevel, options.clock, options.write);
  const templates = new FileSystemTemplateRepository(options.buildOutputDirectory);
  const renderer = new MergeTagRenderer();

  return {
    sendTestEmail: new SendTestEmail({
      botVerifier: createBotVerifier(config),
      rateLimiter: createRateLimiter(config, options.clock),
      templates,
      renderer,
      sender: createEmailSender(config, options.write),
      events: createEventPublisher(config),
      hasher: new HmacIdentityHasher(config.identityHashSalt),
      logger,
      policy: config.policy,
    }),
    listTemplates: new ListTemplates(templates),
    getTemplate: new GetTemplate(templates, renderer),
    logger,
  };
}
