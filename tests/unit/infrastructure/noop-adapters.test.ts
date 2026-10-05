import { describe, expect, it } from "vitest";
import type { BotVerifier } from "@/application/ports/bot-verifier";
import type { EventPublisher } from "@/application/ports/event-publisher";
import { NoopBotVerifier } from "@/infrastructure/bot/noop-bot-verifier";
import { NoopEventPublisher } from "@/infrastructure/events/noop-event-publisher";

describe("no-op adapters", () => {
  it("the bot verifier accepts everyone", async () => {
    const verifier: BotVerifier = new NoopBotVerifier();

    expect(await verifier.verify("", "203.0.113.7")).toBe(true);
  });

  it("the event publisher does nothing", async () => {
    const publisher: EventPublisher = new NoopEventPublisher();

    await expect(
      publisher.publish({ type: "test-email.sent", templateId: "welcome" }),
    ).resolves.toBeUndefined();
  });
});
