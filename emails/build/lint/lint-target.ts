import { load } from "cheerio";
import type { LintTarget } from "./lint-rule";

export function createLintTarget(html: string): LintTarget {
  return { html, document: load(html) };
}
