import { describe, expect, it } from "vitest";
import { AltTextRule, LinkRule, MergeTagRule } from "../../../../emails/build/lint/content-rules";
import type { LintRule } from "../../../../emails/build/lint/lint-rule";
import { createLintTarget } from "../../../../emails/build/lint/lint-target";

const issuesFor = (rule: LintRule, html: string) => rule.check(createLintTarget(html));

describe("AltTextRule", () => {
  const rule = new AltTextRule();

  it.each(['<img src="a.png" alt="Logo">', '<img src="a.png" alt="">'])(
    "accepts %j, since an empty alt marks a decorative image",
    (html) => {
      expect(issuesFor(rule, html)).toEqual([]);
    },
  );

  it("reports an image with no alt attribute and names its source", () => {
    const issues = issuesFor(rule, '<img src="hero.png">');

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.message).toContain("hero.png");
  });
});

describe("LinkRule", () => {
  const rule = new LinkRule();
  const link = (href: string, text = "Open dashboard") => `<a href="${href}">${text}</a>`;

  it.each([
    "https://example.com/a",
    "mailto:hi@example.com",
    "tel:+62123456",
    "{{unsubscribeUrl}}",
  ])("accepts the destination %j", (href) => {
    expect(issuesFor(rule, link(href))).toEqual([]);
  });

  it.each(["#", "", "http://example.com", "javascript:alert(1)"])(
    "rejects the destination %j",
    (href) => {
      const issues = issuesFor(rule, link(href));

      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("error");
    },
  );

  it("rejects a link with no href at all", () => {
    expect(issuesFor(rule, "<a>Open dashboard</a>")).toHaveLength(1);
  });

  it.each(["click here", "Click Here", "here", "Read more"])(
    "warns about the non-descriptive link text %j",
    (text) => {
      const issues = issuesFor(rule, link("https://example.com", text));

      expect(issues).toHaveLength(1);
      expect(issues[0]?.severity).toBe("warning");
    },
  );
});

describe("MergeTagRule", () => {
  const rule = new MergeTagRule(["firstName"]);

  it("accepts allowed tags, with or without inner spaces", () => {
    expect(issuesFor(rule, "Hi {{firstName}} and {{ firstName }}")).toEqual([]);
  });

  it("reports each unknown tag once", () => {
    const issues = issuesFor(rule, "{{unsubscribeUrl}} {{unsubscribeUrl}} {{constructor}}");

    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringContaining("unsubscribeUrl"),
      expect.stringContaining("constructor"),
    ]);
  });
});
