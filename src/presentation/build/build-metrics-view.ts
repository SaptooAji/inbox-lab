/** Gmail clips a message above this size and hides the rest behind a link. */
export const GMAIL_CLIP_LIMIT_BYTES = 102 * 1024;

/** Same threshold as the build's SizeBudgetRule warning. */
const WARNING_RATIO = 0.8;

export type BudgetStatus = "ok" | "warning" | "over";

export interface BudgetUsage {
  readonly percent: number;
  readonly status: BudgetStatus;
}

export function formatKilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function budgetUsage(htmlBytes: number): BudgetUsage {
  const ratio = htmlBytes / GMAIL_CLIP_LIMIT_BYTES;
  const percent = Math.round(ratio * 100);
  if (ratio > 1) {
    return { percent, status: "over" };
  }
  if (ratio >= WARNING_RATIO) {
    return { percent, status: "warning" };
  }
  return { percent, status: "ok" };
}
