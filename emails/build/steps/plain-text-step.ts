import { convert } from "html-to-text";
import type { BuildContext, BuildStep } from "../build-step";

const WORD_WRAP = 78;

export class PlainTextStep implements BuildStep {
  readonly name = "plain-text";

  run(context: BuildContext): BuildContext {
    const text = convert(context.html, {
      wordwrap: WORD_WRAP,
      selectors: [
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "h1", options: { uppercase: false } },
        { selector: "h2", options: { uppercase: false } },
        { selector: "h3", options: { uppercase: false } },
        { selector: "[data-text-skip]", format: "skip" },
      ],
    });
    return { ...context, text };
  }
}
