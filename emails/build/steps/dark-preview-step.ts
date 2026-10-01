import type { BuildContext, BuildStep } from "../build-step";

// Only the exact query is rewritten. Compound queries keep their other conditions.
const DARK_QUERY = /@media\s+(?:screen\s+and\s+)?\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi;

/** Builds the copy the site shows when its "dark" toggle is on. Never shipped in an email. */
export class DarkPreviewStep implements BuildStep {
  readonly name = "dark-preview";

  run(context: BuildContext): BuildContext {
    return { ...context, darkHtml: context.html.replace(DARK_QUERY, "@media all") };
  }
}
