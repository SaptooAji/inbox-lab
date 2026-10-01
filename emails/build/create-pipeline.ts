import type { BuildStep } from "./build-step";
import { AltTextRule, LinkRule, MergeTagRule } from "./lint/content-rules";
import { SizeBudgetRule } from "./lint/size-budget-rule";
import {
  LangAttributeRule,
  PreheaderRule,
  PresentationRoleRule,
  TitleRule,
} from "./lint/structure-rules";
import { ComposeStep, type ComponentLoader } from "./steps/compose-step";
import { DarkPreviewStep } from "./steps/dark-preview-step";
import { InlineCssStep } from "./steps/inline-css-step";
import { LintStep } from "./steps/lint-step";
import { PlaceholderGuardStep } from "./steps/placeholder-guard-step";
import { PlainTextStep } from "./steps/plain-text-step";
import { TokenStep } from "./steps/token-step";

export interface PipelineOptions {
  readonly components: ComponentLoader;
  readonly tokens: ReadonlyMap<string, string>;
  readonly mergeTags: readonly string[];
}

/** The one place that decides which steps run, and in what order. */
export function createPipeline(options: PipelineOptions): readonly BuildStep[] {
  return [
    new ComposeStep(options.components),
    new TokenStep(options.tokens),
    new PlaceholderGuardStep(),
    new InlineCssStep(),
    new DarkPreviewStep(),
    new PlainTextStep(),
    new LintStep([
      new SizeBudgetRule(),
      new LangAttributeRule(),
      new TitleRule(),
      new PresentationRoleRule(),
      new PreheaderRule(),
      new AltTextRule(),
      new LinkRule(),
      new MergeTagRule(options.mergeTags),
    ]),
  ];
}
