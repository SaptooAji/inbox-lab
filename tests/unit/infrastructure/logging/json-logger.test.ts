import { describe, expect, it } from "vitest";
import type { LogLevel } from "@/infrastructure/config/config";
import { JsonLogger } from "@/infrastructure/logging/json-logger";
import { ManualClock } from "../../support/clocks";

function setup(level: LogLevel = "info") {
  const lines: string[] = [];
  const logger = new JsonLogger(level, new ManualClock(), (line) => lines.push(line));
  return { lines, logger };
}

const parse = (line: string | undefined): unknown => JSON.parse(line ?? "null");

describe("JsonLogger", () => {
  it("writes one JSON line with the level, time, message and context", () => {
    const { lines, logger } = setup();

    logger.info("hello", { templateId: "welcome" });

    expect(lines).toHaveLength(1);
    expect(parse(lines[0])).toEqual({
      level: "info",
      time: "2026-01-01T00:00:00.000Z",
      message: "hello",
      templateId: "welcome",
    });
  });

  it("works without context", () => {
    const { lines, logger } = setup();

    logger.error("boom");

    expect(parse(lines[0])).toEqual({
      level: "error",
      time: "2026-01-01T00:00:00.000Z",
      message: "boom",
    });
  });

  it.each([
    ["debug", 3],
    ["info", 3],
    ["warn", 2],
    ["error", 1],
  ] as const)("at level %s it writes %i of info, warn and error", (level, expected) => {
    const { lines, logger } = setup(level);

    logger.info("a");
    logger.warn("b");
    logger.error("c");

    expect(lines).toHaveLength(expected);
  });

  it("lets its own fields win over colliding context keys", () => {
    const { lines, logger } = setup();

    logger.info("real", { level: "hacked", message: "fake", time: "never" });

    expect(parse(lines[0])).toEqual({
      level: "info",
      time: "2026-01-01T00:00:00.000Z",
      message: "real",
    });
  });
});
