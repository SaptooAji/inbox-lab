import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export interface ViolationSummary {
  readonly id: string;
  readonly impact: string | null | undefined;
  readonly help: string;
  readonly targets: readonly string[];
}

/** Serious and critical axe violations only, in a shape that reads well in a failure message. */
export async function seriousViolations(
  page: Page,
  excludeSelectors: readonly string[] = [],
): Promise<readonly ViolationSummary[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of excludeSelectors) {
    builder = builder.exclude(selector);
  }
  const results = await builder.analyze();

  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
    }));
}
