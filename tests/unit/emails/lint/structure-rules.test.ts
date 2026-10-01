import { describe, expect, it } from "vitest";
import type { LintRule } from "../../../../emails/build/lint/lint-rule";
import { createLintTarget } from "../../../../emails/build/lint/lint-target";
import {
  LangAttributeRule,
  PreheaderRule,
  PresentationRoleRule,
  TitleRule,
} from "../../../../emails/build/lint/structure-rules";

const issuesFor = (rule: LintRule, html: string) => rule.check(createLintTarget(html));

describe("LangAttributeRule", () => {
  const rule = new LangAttributeRule();

  it("passes when the html element has a language", () => {
    expect(issuesFor(rule, '<html lang="en"><body>x</body></html>')).toEqual([]);
  });

  it.each([
    "<html><body>x</body></html>",
    '<html lang=""><body>x</body></html>',
    '<html lang="  ">x</html>',
  ])("fails for %j", (html) => {
    expect(issuesFor(rule, html)).toHaveLength(1);
  });
});

describe("TitleRule", () => {
  const rule = new TitleRule();

  it("passes with a title", () => {
    expect(issuesFor(rule, "<html><head><title>Welcome</title></head></html>")).toEqual([]);
  });

  it.each(["<html><head></head></html>", "<html><head><title> </title></head></html>"])(
    "fails for %j",
    (html) => {
      expect(issuesFor(rule, html)).toHaveLength(1);
    },
  );
});

describe("PresentationRoleRule", () => {
  const rule = new PresentationRoleRule();

  it("passes when every table is a presentation table", () => {
    const html =
      '<table role="presentation"><tr><td><table role="presentation"><tr><td>x</td></tr></table></td></tr></table>';

    expect(issuesFor(rule, html)).toEqual([]);
  });

  it("reports each table that lacks the role", () => {
    const html =
      '<table><tr><td>a</td></tr></table><table role="presentation"><tr><td>b</td></tr></table><table><tr><td>c</td></tr></table>';

    expect(issuesFor(rule, html)).toHaveLength(2);
  });
});

describe("PreheaderRule", () => {
  const rule = new PreheaderRule();

  it("passes with a non-empty preheader", () => {
    expect(issuesFor(rule, "<div data-preheader>Your workspace is ready</div>")).toEqual([]);
  });

  it.each(["<p>no preheader</p>", "<div data-preheader> </div>"])("fails for %j", (html) => {
    expect(issuesFor(rule, html)).toHaveLength(1);
  });
});
