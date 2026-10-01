import {
  lintError,
  lintWarning,
  type LintIssue,
  type LintRule,
  type LintTarget,
} from "./lint-rule";

export class AltTextRule implements LintRule {
  readonly id = "alt-text";

  check({ document }: LintTarget): readonly LintIssue[] {
    return document("img")
      .toArray()
      .filter((image) => document(image).attr("alt") === undefined)
      .map((image) =>
        lintError(
          this.id,
          `Image is missing an alt attribute (src: ${document(image).attr("src") ?? "none"}).`,
        ),
      );
  }
}

const ALLOWED_DESTINATION = /^(https:\/\/|mailto:|tel:|\{\{)/i;
const VAGUE_LINK_TEXT = new Set(["click here", "here", "read more", "more", "link", "this link"]);

export class LinkRule implements LintRule {
  readonly id = "links";

  check({ document }: LintTarget): readonly LintIssue[] {
    const issues: LintIssue[] = [];
    for (const element of document("a").toArray()) {
      const link = document(element);
      const href = (link.attr("href") ?? "").trim();
      const label = link.text().trim();

      if (href === "" || href === "#") {
        issues.push(lintError(this.id, `Link "${label}" has no real destination.`));
      } else if (!ALLOWED_DESTINATION.test(href)) {
        issues.push(lintError(this.id, `Link "${label}" must use https (found ${href}).`));
      }
      if (VAGUE_LINK_TEXT.has(label.toLowerCase())) {
        issues.push(
          lintWarning(this.id, `Link text "${label}" does not describe its destination.`),
        );
      }
    }
    return issues;
  }
}

const MERGE_TAG = /\{\{\s*([^}\s]*)\s*\}\}/g;

export class MergeTagRule implements LintRule {
  readonly id = "merge-tags";

  constructor(private readonly allowed: readonly string[]) {}

  check({ html }: LintTarget): readonly LintIssue[] {
    const unknown = new Set<string>();
    for (const match of html.matchAll(MERGE_TAG)) {
      const name = match[1];
      if (name !== undefined && !this.allowed.includes(name)) {
        unknown.add(name);
      }
    }
    return [...unknown].map((name) =>
      lintError(this.id, `Merge tag {{${name}}} is not in the allowlist.`),
    );
  }
}
