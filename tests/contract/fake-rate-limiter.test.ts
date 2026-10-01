import { FakeRateLimiter } from "../unit/support/fakes";
import { describeRateLimiterContract } from "./rate-limiter.contract";

describeRateLimiterContract("FakeRateLimiter", () => new FakeRateLimiter());
