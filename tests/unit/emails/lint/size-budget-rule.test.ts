import { describe, expect, it } from "vitest";
import { createLintTarget } from "../../../../emails/build/lint/lint-target";
import { SizeBudgetRule } from "../../../../emails/build/lint/size-budget-rule";

const check = (limit: number, size: number) =>
  new SizeBudgetRule(limit).check(createLintTarget("a".repeat(size)));

describe("SizeBudgetRule", () => {
  it("passes comfortably under the limit", () => {
    expect(check(100, 50)).toEqual([]);
  });

  it("passes at exactly the limit, with a warning because it is close", () => {
    const issues = check(100, 100);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("warns when above 80 percent of the limit", () => {
    expect(check(100, 90)[0]?.severity).toBe("warning");
  });

  it("fails above the limit", () => {
    const issues = check(100, 101);

    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("101");
  });

  it("measures bytes, not characters", () => {
    expect(check(10, 6)).toEqual([]);

    const multibyte = new SizeBudgetRule(10).check(createLintTarget("é".repeat(6)));

    expect(multibyte[0]?.severity).toBe("error");
  });

  it("defaults to the Gmail clipping limit", () => {
    expect(
      new SizeBudgetRule().check(createLintTarget("a".repeat(102 * 1024 + 1)))[0]?.severity,
    ).toBe("error");
  });
});
