import type { CheerioAPI } from "cheerio";

export type LintSeverity = "error" | "warning";

export interface LintIssue {
  readonly rule: string;
  readonly severity: LintSeverity;
  readonly message: string;
}

export interface LintTarget {
  readonly html: string;
  readonly document: CheerioAPI;
}

export interface LintRule {
  readonly id: string;
  check(target: LintTarget): readonly LintIssue[];
}

export function lintError(rule: string, message: string): LintIssue {
  return { rule, severity: "error", message };
}

export function lintWarning(rule: string, message: string): LintIssue {
  return { rule, severity: "warning", message };
}
