import juice from "juice";
import type { BuildContext, BuildStep } from "../build-step";

/**
 * Plain rules are inlined. Media queries (including dark mode) stay in a style tag.
 * Client hacks that inlining would destroy go in <style data-embed>.
 * Dark mode rules must use !important, because inline styles would otherwise win.
 */
export class InlineCssStep implements BuildStep {
  readonly name = "inline-css";

  run(context: BuildContext): BuildContext {
    const html = juice(context.html, {
      removeStyleTags: true,
      preserveMediaQueries: true,
      preserveImportant: true,
    });
    return { ...context, html };
  }
}
