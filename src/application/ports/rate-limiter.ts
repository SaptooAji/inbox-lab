export interface RateLimitRule {
  /** Already hashed. Never pass a raw email address or IP. */
  readonly key: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(rule: RateLimitRule): Promise<RateLimitDecision>;
}
