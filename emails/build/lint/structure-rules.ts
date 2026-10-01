import { lintError, type LintIssue, type LintRule, type LintTarget } from "./lint-rule";

export class LangAttributeRule implements LintRule {
  readonly id = "lang-attribute";

  check({ document }: LintTarget): readonly LintIssue[] {
    const lang = document("html").attr("lang")?.trim() ?? "";
    return lang === "" ? [lintError(this.id, "The <html> element needs a lang attribute.")] : [];
  }
}

export class TitleRule implements LintRule {
  readonly id = "title";

  check({ document }: LintTarget): readonly LintIssue[] {
    return document("title").text().trim() === ""
      ? [lintError(this.id, "The document needs a non-empty <title>.")]
      : [];
  }
}

export class PresentationRoleRule implements LintRule {
  readonly id = "presentation-role";

  check({ document }: LintTarget): readonly LintIssue[] {
    return document("table")
      .toArray()
      .filter((table) => document(table).attr("role") !== "presentation")
      .map(() => lintError(this.id, 'Layout tables need role="presentation".'));
  }
}

export class PreheaderRule implements LintRule {
  readonly id = "preheader";

  check({ document }: LintTarget): readonly LintIssue[] {
    return document("[data-preheader]").first().text().trim() === ""
      ? [lintError(this.id, "Add a preheader: an element with data-preheader and some text.")]
      : [];
  }
}
