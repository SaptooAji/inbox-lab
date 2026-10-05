import type { Clock } from "@/application/ports/clock";
import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitRule,
} from "@/application/ports/rate-limiter";

interface Window {
  count: number;
  readonly resetsAt: number;
}

/**
 * Fixed window per key. Local development and tests only: state lives in one process
 * and is never cleaned up, so production uses the Upstash adapter instead.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly clock: Clock) {}

  consume(rule: RateLimitRule): Promise<RateLimitDecision> {
    const now = this.clock.now().getTime();
    const existing = this.windows.get(rule.key);
    const window: Window =
      existing !== undefined && existing.resetsAt > now
        ? existing
        : { count: 0, resetsAt: now + rule.windowSeconds * 1000 };

    window.count += 1;
    this.windows.set(rule.key, window);

    const allowed = window.count <= rule.limit;
    return Promise.resolve({
      allowed,
      retryAfterSeconds: allowed ? 0 : Math.ceil((window.resetsAt - now) / 1000),
    });
  }
}
