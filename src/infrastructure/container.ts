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
import { TurnstileBotVerifier } from "./bot/turnstile-bot-verifier";
import type { AppConfig } from "./config/config";
import { ConsoleEmailSender } from "./email/console-email-sender";
import { ResendEmailSender } from "./email/resend-email-sender";
import { NoopEventPublisher } from "./events/noop-event-publisher";
import { WebhookEventPublisher } from "./events/webhook-event-publisher";
import type { FetchLike } from "./http/fetch-like";
import { JsonLogger } from "./logging/json-logger";
import { InMemoryRateLimiter } from "./rate-limit/in-memory-rate-limiter";
import { UpstashRateLimiter } from "./rate-limit/upstash-rate-limiter";
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
  readonly fetch: FetchLike;
}

function createEmailSender(
  config: AppConfig,
  options: ContainerOptions,
  logger: Logger,
): EmailSender {
  const { transport, from, replyTo } = config.email;
  switch (transport.driver) {
    case "console":
      return new ConsoleEmailSender(options.write);
    case "resend":
      return new ResendEmailSender({
        apiKey: transport.apiKey,
        from,
        replyTo,
        fetch: options.fetch,
        logger,
      });
  }
}

function createBotVerifier(config: AppConfig, options: ContainerOptions): BotVerifier {
  const { bot } = config;
  switch (bot.driver) {
    case "noop":
      return new NoopBotVerifier();
    case "turnstile":
      return new TurnstileBotVerifier({ secretKey: bot.secretKey, fetch: options.fetch });
  }
}

function createRateLimiter(config: AppConfig, options: ContainerOptions): RateLimiter {
  const { rateLimit } = config;
  switch (rateLimit.driver) {
    case "memory":
      return new InMemoryRateLimiter(options.clock);
    case "upstash":
      return new UpstashRateLimiter({
        url: rateLimit.url,
        token: rateLimit.token,
        fetch: options.fetch,
      });
  }
}

function createEventPublisher(config: AppConfig, options: ContainerOptions): EventPublisher {
  return config.webhookUrl === undefined
    ? new NoopEventPublisher()
    : new WebhookEventPublisher({ url: config.webhookUrl, fetch: options.fetch });
}

/** The only place that decides which adapter implements which port. */
export function createContainer(config: AppConfig, options: ContainerOptions): Container {
  const logger = new JsonLogger(config.logLevel, options.clock, options.write);
  const templates = new FileSystemTemplateRepository(options.buildOutputDirectory);
  const renderer = new MergeTagRenderer();

  return {
    sendTestEmail: new SendTestEmail({
      botVerifier: createBotVerifier(config, options),
      rateLimiter: createRateLimiter(config, options),
      templates,
      renderer,
      sender: createEmailSender(config, options, logger),
      events: createEventPublisher(config, options),
      hasher: new HmacIdentityHasher(config.identityHashSalt),
      logger,
      policy: config.policy,
    }),
    listTemplates: new ListTemplates(templates),
    getTemplate: new GetTemplate(templates, renderer),
    logger,
  };
}
