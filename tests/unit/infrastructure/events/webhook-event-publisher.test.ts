import { describe, expect, it } from "vitest";
import { WebhookEventPublisher } from "@/infrastructure/events/webhook-event-publisher";
import { bodyOf, createFakeFetch, headerOf, type FakeHandler } from "../../support/fake-fetch";
import { rejectionOf } from "../../support/rejection";

const URL_WITH_SECRET = "https://hook.example.com/secret-path-123";
const event = { type: "test-email.sent", templateId: "welcome" } as const;

function setup(handler: FakeHandler) {
  const { fetch, calls } = createFakeFetch(handler);
  return { publisher: new WebhookEventPublisher({ url: URL_WITH_SECRET, fetch }), calls };
}

describe("WebhookEventPublisher", () => {
  it("posts the event as JSON", async () => {
    const { publisher, calls } = setup(() => new Response(null, { status: 204 }));

    await publisher.publish(event);

    const call = calls[0];
    expect(call?.url).toBe(URL_WITH_SECRET);
    expect(call?.init.method).toBe("POST");
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call && headerOf(call, "content-type")).toBe("application/json");
    expect(call && bodyOf(call)).toEqual(event);
  });

  it.each([
    ["the webhook answers with an error", () => new Response("no", { status: 500 }), "status 500"],
    [
      "the webhook is unreachable",
      () => Promise.reject(new TypeError("fetch failed")),
      "could not be reached",
    ],
  ] as [string, FakeHandler, string][])(
    "throws when %s, without revealing its URL",
    async (_name, handler, message) => {
      const { publisher } = setup(handler);

      const error = await rejectionOf(publisher.publish(event));

      expect(error.message).toContain(message);
      expect(error.message).not.toContain("secret-path");
    },
  );
});
