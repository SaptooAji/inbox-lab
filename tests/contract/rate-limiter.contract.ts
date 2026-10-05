import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RateLimiter, RateLimitRule } from "@/application/ports/rate-limiter";

const WINDOW_SECONDS = 3600;

const ruleFor = (name: string, limit: number): RateLimitRule => ({
  key: `${name}-${randomUUID()}`,
  limit,
  windowSeconds: WINDOW_SECONDS,
});

/** Every RateLimiter implementation must pass this suite. */
export function describeRateLimiterContract(name: string, create: () => RateLimiter): void {
  describe(`${name} honours the RateLimiter contract`, () => {
    it("allows requests up to the limit, with no wait", async () => {
      const limiter = create();
      const rule = ruleFor("allow", 2);

      expect(await limiter.consume(rule)).toEqual({ allowed: true, retryAfterSeconds: 0 });
      expect(await limiter.consume(rule)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    });

    it("denies requests beyond the limit and says how long to wait", async () => {
      const limiter = create();
      const rule = ruleFor("deny", 1);
      await limiter.consume(rule);

      const decision = await limiter.consume(rule);

      expect(decision.allowed).toBe(false);
      expect(decision.retryAfterSeconds).toBeGreaterThan(0);
      expect(decision.retryAfterSeconds).toBeLessThanOrEqual(WINDOW_SECONDS);
    });

    it("keeps denying while the window is open", async () => {
      const limiter = create();
      const rule = ruleFor("keep", 1);
      await limiter.consume(rule);
      await limiter.consume(rule);

      expect((await limiter.consume(rule)).allowed).toBe(false);
    });

    it("counts each key separately", async () => {
      const limiter = create();
      const first = ruleFor("one", 1);
      const second = ruleFor("two", 1);
      await limiter.consume(first);

      expect((await limiter.consume(first)).allowed).toBe(false);
      expect((await limiter.consume(second)).allowed).toBe(true);
    });

    it("denies everything when the limit is zero", async () => {
      expect((await create().consume(ruleFor("zero", 0))).allowed).toBe(false);
    });
  });
}
