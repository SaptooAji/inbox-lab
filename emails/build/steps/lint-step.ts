import { BuildError, type BuildContext, type BuildStep } from "../build-step";
import type { LintIssue, LintRule } from "../lint/lint-rule";
import { createLintTarget } from "../lint/lint-target";

const format = (issue: LintIssue): string => `[${issue.rule}] ${issue.message}`;

export class LintStep implements BuildStep {
  readonly name = "lint";

  constructor(private readonly rules: readonly LintRule[]) {}

  run(context: BuildContext): BuildContext {
    const target = createLintTarget(context.html);
    const issues = this.rules.flatMap((rule) => rule.check(target));

    const errors = issues.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      throw new BuildError(`Lint failed:\n${errors.map(format).join("\n")}`);
    }

    const warnings = issues
      .map(format)
      .filter((_line, index) => issues[index]?.severity === "warning");
    return warnings.length === 0
      ? context
      : { ...context, warnings: [...(context.warnings ?? []), ...warnings] };
  }
}
