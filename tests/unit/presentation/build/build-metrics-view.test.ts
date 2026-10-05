import { describe, expect, it } from "vitest";
import {
  budgetUsage,
  formatKilobytes,
  GMAIL_CLIP_LIMIT_BYTES,
} from "@/presentation/build/build-metrics-view";

describe("GMAIL_CLIP_LIMIT_BYTES", () => {
  it("is 102 KB", () => {
    expect(GMAIL_CLIP_LIMIT_BYTES).toBe(102 * 1024);
  });
});

describe("formatKilobytes", () => {
  it.each([
    [0, "0.0 KB"],
    [1024, "1.0 KB"],
    [10_445, "10.2 KB"],
    [104_448, "102.0 KB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatKilobytes(bytes)).toBe(expected);
  });
});

describe("budgetUsage", () => {
  it.each([
    [0, 0, "ok"],
    [52_224, 50, "ok"],
    [83_000, 79, "ok"],
    [83_559, 80, "warning"],
    [104_448, 100, "warning"],
    [104_449, 100, "over"],
  ] as const)("%i bytes is %i%% of the budget and reads %s", (bytes, percent, status) => {
    expect(budgetUsage(bytes)).toEqual({ percent, status });
  });
});
