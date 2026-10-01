import { InMemoryRateLimiter } from "@/infrastructure/rate-limit/in-memory-rate-limiter";
import { ManualClock } from "../unit/support/clocks";
import { describeRateLimiterContract } from "./rate-limiter.contract";

describeRateLimiterContract(
  "InMemoryRateLimiter",
  () => new InMemoryRateLimiter(new ManualClock()),
);
