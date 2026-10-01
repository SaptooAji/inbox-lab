import { describe, expect, it } from "vitest";
import { TurnstileBotVerifier } from "@/infrastructure/bot/turnstile-bot-verifier";
import { bodyOf, createFakeFetch, headerOf, type FakeHandler } from "../../support/fake-fetch";
import { rejectionOf } from "../../support/rejection";

const SECRET = "ts_secret_value";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function setup(handler: FakeHandler) {
  const { fetch, calls } = createFakeFetch(handler);
  return { verifier: new TurnstileBotVerifier({ secretKey: SECRET, fetch }), calls };
}

const approved = () => Response.json({ success: true, "error-codes": [] });

describe("TurnstileBotVerifier", () => {
  it("accepts a token Cloudflare approves and sends the secret, token and client IP", async () => {
    const { verifier, calls } = setup(approved);

    expect(await verifier.verify("tok", "203.0.113.7")).toBe(true);

    const call = calls[0];
    expect(call?.url).toBe(SITEVERIFY);
    expect(call?.init.method).toBe("POST");
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call && headerOf(call, "content-type")).toBe("application/json");
    expect(call && bodyOf(call)).toEqual({
      secret: SECRET,
      response: "tok",
      remoteip: "203.0.113.7",
    });
  });

  it("leaves out the IP when the client could not be identified", async () => {
    const { verifier, calls } = setup(approved);

    await verifier.verify("tok", "unknown");

    expect(calls[0] && bodyOf(calls[0])).toEqual({ secret: SECRET, response: "tok" });
  });

  it("rejects a token Cloudflare refuses", async () => {
    const { verifier } = setup(() =>
      Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
    );

    expect(await verifier.verify("tok", "203.0.113.7")).toBe(false);
  });

  it.each(["", "   ", "a".repeat(2049)])(
    "rejects the token %#  without calling Cloudflare",
    async (token) => {
      const { verifier, calls } = setup(approved);

      expect(await verifier.verify(token, "203.0.113.7")).toBe(false);
      expect(calls).toHaveLength(0);
    },
  );

  it("still checks a token of exactly 2048 characters", async () => {
    const { verifier, calls } = setup(approved);

    expect(await verifier.verify("a".repeat(2048), "203.0.113.7")).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it.each([
    [
      "Cloudflare is unreachable",
      () => Promise.reject(new TypeError("fetch failed")),
      "could not be reached",
    ],
    [
      "Cloudflare answers with an error status",
      () => new Response("oops", { status: 500 }),
      "status 500",
    ],
    ["the answer is not JSON", () => new Response("<html>", { status: 200 }), "unreadable answer"],
    [
      "Cloudflare reports an internal error",
      () => Response.json({ success: false, "error-codes": ["internal-error"] }),
      "internal error",
    ],
  ] as [string, FakeHandler, string][])(
    "throws when %s, and never mentions the secret",
    async (_name, handler, message) => {
      const { verifier } = setup(handler);

      const error = await rejectionOf(verifier.verify("tok", "203.0.113.7"));

      expect(error.message).toContain(message);
      expect(error.message).not.toContain(SECRET);
    },
  );
});
