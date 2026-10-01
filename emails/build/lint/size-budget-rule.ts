import {
  lintError,
  lintWarning,
  type LintIssue,
  type LintRule,
  type LintTarget,
} from "./lint-rule";

export const GMAIL_CLIP_LIMIT_BYTES = 102 * 1024;
const WARNING_RATIO = 0.8;

export class SizeBudgetRule implements LintRule {
  readonly id = "size-budget";

  constructor(private readonly limitBytes: number = GMAIL_CLIP_LIMIT_BYTES) {}

  check({ html }: LintTarget): readonly LintIssue[] {
    const size = Buffer.byteLength(html, "utf8");
    if (size > this.limitBytes) {
      return [
        lintError(
          this.id,
          `HTML is ${size} bytes; the limit is ${this.limitBytes} (Gmail clips larger messages).`,
        ),
      ];
    }
    if (size > this.limitBytes * WARNING_RATIO) {
      return [
        lintWarning(this.id, `HTML is ${size} bytes, close to the ${this.limitBytes} byte limit.`),
      ];
    }
    return [];
  }
}
