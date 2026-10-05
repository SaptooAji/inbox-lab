import { describe, expect, it } from "vitest";
import type { RateLimitRule } from "@/application/ports/rate-limiter";
import type { FetchLike } from "@/infrastructure/http/fetch-like";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import {
  bodyOf,
  createFakeFetch,
  headerOf,
  type FakeHandler,
  type RecordedCall,
} from "../../support/fake-fetch";
import { FakeUpstash } from "../../support/fake-upstash";
import { ManualClock } from "../../support/clocks";
import { rejectionOf } from "../../support/rejection";

const URL_BASE = "https://redis.example.com";
const TOKEN = "up_secret_token";
const rule: RateLimitRule = { key: "abc", limit: 1, windowSeconds: 3600 };

function setup(baseUrl: string = URL_BASE) {
  const clock = new ManualClock();
  const upstash = new FakeUpstash(TOKEN, clock);
  const calls: RecordedCall[] = [];
  const fetch: FetchLike = (url, init) => {
    calls.push({ url, init });
    return upstash.fetch(url, init);
  };
  return { clock, calls, limiter: new UpstashRateLimiter({ url: baseUrl, token: TOKEN, fetch }) };
}

describe("UpstashRateLimiter requests", () => {
  it("runs one atomic transaction: create the window, count, read the wait", async () => {
    const { limiter, calls } = setup();

    await limiter.consume(rule);

    const call = calls[0];
    expect(call?.url).toBe(`${URL_BASE}/multi-exec`);
    expect(call?.init.method).toBe("POST");
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
    expect(call && headerOf(call, "authorization")).toBe(`Bearer ${TOKEN}`);
    expect(call && bodyOf(call)).toEqual([
      ["SET", "ratelimit:abc", "0", "EX", "3600", "NX"],
      ["INCR", "ratelimit:abc"],
      ["TTL", "ratelimit:abc"],
    ]);
  });

  it("ignores trailing slashes on the configured URL", async () => {
    const { limiter, calls } = setup(`${URL_BASE}//`);

    await limiter.consume(rule);

    expect(calls[0]?.url).toBe(`${URL_BASE}/multi-exec`);
  });
});

describe("UpstashRateLimiter windows", () => {
  it("opens a fresh window once the old one expires", async () => {
    const { limiter, clock } = setup();
    await limiter.consume(rule);
    expect((await limiter.consume(rule)).allowed).toBe(false);

    clock.advanceSeconds(3600);

    expect((await limiter.consume(rule)).allowed).toBe(true);
  });

  it("reports the remaining wait from the store", async () => {
    const { limiter, clock } = setup();
    await limiter.consume(rule);
    clock.advanceSeconds(1000);

    expect((await limiter.consume(rule)).retryAfterSeconds).toBe(2600);
  });
});

describe("UpstashRateLimiter failures", () => {
  const failures: [string, FakeHandler, string][] = [
    [
      "a rejected token",
      () => Response.json({ error: "unauthorized" }, { status: 401 }),
      "status 401",
    ],
    [
      "an unreachable store",
      () => Promise.reject(new TypeError("fetch failed")),
      "could not be reached",
    ],
    [
      "a command error",
      () => Response.json([{ result: "OK" }, { error: "ERR boom" }, { result: 1 }]),
      "rejected a command",
    ],
    ["an answer that is not a list", () => Response.json({ result: "OK" }), "unexpected answer"],
    ["a list of the wrong length", () => Response.json([{ result: "OK" }]), "unexpected answer"],
    [
      "a count that is not a number",
      () => Response.json([{ result: "OK" }, { result: "x" }, { result: 1 }]),
      "unexpected answer",
    ],
    ["an unreadable body", () => new Response("<html>", { status: 200 }), "unexpected answer"],
  ];

  it.each(failures)(
    "throws on %s, and never mentions the token",
    async (_name, handler, message) => {
      const { fetch } = createFakeFetch(handler);
      const limiter = new UpstashRateLimiter({ url: URL_BASE, token: TOKEN, fetch });

      const error = await rejectionOf(limiter.consume(rule));

      expect(error.message).toContain(message);
      expect(error.message).not.toContain(TOKEN);
    },
  );

  it("falls back to the full window when the store reports no expiry", async () => {
    const { fetch } = createFakeFetch(() =>
      Response.json([{ result: "OK" }, { result: 2 }, { result: -1 }]),
    );
    const limiter = new UpstashRateLimiter({ url: URL_BASE, token: TOKEN, fetch });

    expect(await limiter.consume(rule)).toEqual({ allowed: false, retryAfterSeconds: 3600 });
  });
});
