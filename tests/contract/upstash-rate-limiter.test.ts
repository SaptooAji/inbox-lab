import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";
import { ManualClock } from "../unit/support/clocks";
import { FakeUpstash } from "../unit/support/fake-upstash";
import { describeRateLimiterContract } from "./rate-limiter.contract";

describeRateLimiterContract("UpstashRateLimiter, against a fake Upstash", () => {
  const upstash = new FakeUpstash("token", new ManualClock());
  return new UpstashRateLimiter({
    url: "https://redis.example.com",
    token: "token",
    fetch: upstash.fetch,
  });
});
