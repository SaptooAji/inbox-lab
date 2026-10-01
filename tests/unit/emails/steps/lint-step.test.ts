import { describe, expect, it } from "vitest";
import { BuildError } from "../../../../emails/build/build-step";
import {
  lintError,
  lintWarning,
  type LintIssue,
  type LintRule,
  type LintTarget,
} from "../../../../emails/build/lint/lint-rule";
import { LintStep } from "../../../../emails/build/steps/lint-step";

const stub = (id: string, issues: readonly LintIssue[]): LintRule => ({ id, check: () => issues });
const base = { name: "welcome", html: "<p>x</p>" };

describe("LintStep", () => {
  it("returns the context unchanged when there are no issues", () => {
    expect(new LintStep([stub("a", [])]).run(base)).toEqual(base);
  });

  it("collects warnings into the context without failing", () => {
    const result = new LintStep([stub("w1", [lintWarning("w1", "careful")])]).run({
      ...base,
      warnings: ["earlier"],
    });

    expect(result.warnings).toEqual(["earlier", "[w1] careful"]);
  });

  it("fails and lists every error from every rule", () => {
    const step = new LintStep([
      stub("a", [lintError("a", "first problem")]),
      stub("b", [lintError("b", "second problem")]),
    ]);

    expect(() => step.run(base)).toThrow(BuildError);
    expect(() => step.run(base)).toThrow("[a] first problem");
    expect(() => step.run(base)).toThrow("[b] second problem");
  });

  it("fails even when there are warnings next to the errors", () => {
    const step = new LintStep([stub("a", [lintWarning("a", "minor"), lintError("a", "major")])]);

    expect(() => step.run(base)).toThrow("[a] major");
  });

  it("gives every rule a parsed document of the html", () => {
    let seen = "";
    const spy: LintRule = {
      id: "spy",
      check: (target: LintTarget) => {
        seen = target.document("p").text();
        return [];
      },
    };

    new LintStep([spy]).run(base);

    expect(seen).toBe("x");
  });
});
