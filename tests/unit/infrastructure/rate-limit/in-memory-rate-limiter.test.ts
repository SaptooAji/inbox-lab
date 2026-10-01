import { describe, expect, it } from "vitest";
import type { RateLimitRule } from "@/application/ports/rate-limiter";
import { InMemoryRateLimiter } from "@/infrastructure/rate-limit/in-memory-rate-limiter";
import { ManualClock } from "../../support/clocks";

const rule: RateLimitRule = { key: "k", limit: 1, windowSeconds: 3600 };

function setup() {
  const clock = new ManualClock();
  return { clock, limiter: new InMemoryRateLimiter(clock) };
}

describe("InMemoryRateLimiter windows", () => {
  it("opens a fresh window once the old one ends", async () => {
    const { clock, limiter } = setup();
    await limiter.consume(rule);
    expect((await limiter.consume(rule)).allowed).toBe(false);

    clock.advanceSeconds(3600);

    expect((await limiter.consume(rule)).allowed).toBe(true);
  });

  it("counts the wait down as time passes", async () => {
    const { clock, limiter } = setup();
    await limiter.consume(rule);
    clock.advanceSeconds(1000);

    expect((await limiter.consume(rule)).retryAfterSeconds).toBe(2600);
  });

  it("rounds the wait up to whole seconds", async () => {
    const { clock, limiter } = setup();
    await limiter.consume(rule);
    clock.advanceSeconds(1.5);

    expect((await limiter.consume(rule)).retryAfterSeconds).toBe(3599);
  });

  it("does not extend the window when requests are denied", async () => {
    const { clock, limiter } = setup();
    await limiter.consume(rule);
    clock.advanceSeconds(3000);
    await limiter.consume(rule);
    clock.advanceSeconds(600);

    expect((await limiter.consume(rule)).allowed).toBe(true);
  });
});
