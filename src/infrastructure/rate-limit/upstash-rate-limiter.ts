import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitRule,
} from "@/application/ports/rate-limiter";
import { HTTP_TIMEOUT_MS, type FetchLike } from "../http/fetch-like";
import { readField } from "../http/read-field";

const KEY_PREFIX = "ratelimit:";
const EXPECTED_RESULTS = 3;
const UNEXPECTED_ANSWER = "The rate limit store sent an unexpected answer.";

export interface UpstashRateLimiterOptions {
  readonly url: string;
  readonly token: string;
  readonly fetch: FetchLike;
}

function integerAt(results: readonly unknown[], index: number): number {
  const result = readField(results[index], "result");
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(UNEXPECTED_ANSWER);
  }
  return result;
}

/**
 * Fixed window per key, in one atomic transaction (/multi-exec). A plain /pipeline is not
 * atomic, and a key that expired between SET and INCR would keep a counter with no expiry,
 * blocking that visitor forever. Store problems throw, so the handler logs them and answers 500.
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly endpoint: string;

  constructor(private readonly options: UpstashRateLimiterOptions) {
    this.endpoint = `${options.url.replace(/\/+$/, "")}/multi-exec`;
  }

  async consume(rule: RateLimitRule): Promise<RateLimitDecision> {
    const results = await this.transact(rule);
    const count = integerAt(results, 1);
    const secondsLeft = integerAt(results, 2);

    const allowed = count <= rule.limit;
    if (allowed) {
      return { allowed, retryAfterSeconds: 0 };
    }
    return { allowed, retryAfterSeconds: secondsLeft > 0 ? secondsLeft : rule.windowSeconds };
  }

  private async transact(rule: RateLimitRule): Promise<readonly unknown[]> {
    const key = `${KEY_PREFIX}${rule.key}`;
    const commands = [
      ["SET", key, "0", "EX", String(rule.windowSeconds), "NX"],
      ["INCR", key],
      ["TTL", key],
    ];

    let response: Response;
    try {
      response = await this.options.fetch(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(commands),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch {
      throw new Error("The rate limit store could not be reached.");
    }

    if (!response.ok) {
      throw new Error(`The rate limit store answered with status ${response.status}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error(UNEXPECTED_ANSWER);
    }
    if (!Array.isArray(body) || body.length !== EXPECTED_RESULTS) {
      throw new Error(UNEXPECTED_ANSWER);
    }
    if (body.some((item) => readField(item, "error") !== undefined)) {
      throw new Error("The rate limit store rejected a command.");
    }
    return body;
  }
}
