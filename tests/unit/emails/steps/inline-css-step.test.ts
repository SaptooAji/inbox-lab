import { describe, expect, it } from "vitest";
import { InlineCssStep } from "../../../../emails/build/steps/inline-css-step";

const page = (head: string, body: string) =>
  `<html><head>${head}</head><body>${body}</body></html>`;
const run = (html: string) => new InlineCssStep().run({ name: "welcome", html }).html;

describe("InlineCssStep", () => {
  it("inlines plain rules and removes the style tag", () => {
    const html = run(page("<style>p{color:red}</style>", "<p>x</p>"));

    expect(html).toMatch(/<p style="[^"]*color:\s*red/);
    expect(html).not.toContain("<style");
  });

  it("keeps media queries in a style tag while still inlining the rest", () => {
    const html = run(
      page("<style>p{color:red}@media (max-width:480px){p{color:blue}}</style>", "<p>x</p>"),
    );

    expect(html).toMatch(/<p style="[^"]*color:\s*red/);
    expect(html).toMatch(/@media\s*\(max-width:\s*480px\)/);
    expect(html).toMatch(/color:\s*blue/);
  });

  it("keeps dark mode media queries and their !important flags", () => {
    const html = run(
      page(
        "<style>@media (prefers-color-scheme: dark){p{color:#fff !important}}</style>",
        "<p>x</p>",
      ),
    );

    expect(html).toMatch(/prefers-color-scheme:\s*dark/);
    expect(html).toMatch(/!important/);
  });

  it("keeps !important in inlined values", () => {
    const html = run(page("<style>p{color:red !important}</style>", "<p>x</p>"));

    expect(html).toMatch(/color:\s*red\s*!important/);
  });

  it("leaves a style tag marked data-embed untouched, for client-specific selectors", () => {
    const html = run(
      page("<style data-embed>[data-ogsc] .x{color:#fff !important}</style>", '<p class="x">x</p>'),
    );

    expect(html).toContain("[data-ogsc]");
  });

  it("leaves merge tags and Outlook conditional comments intact", () => {
    const html = run(
      page(
        "",
        "<!--[if mso]><table><tr><td>mso</td></tr></table><![endif]--><p>Hi {{firstName}}</p>",
      ),
    );

    expect(html).toContain("<!--[if mso]>");
    expect(html).toContain("<![endif]-->");
    expect(html).toContain("{{firstName}}");
  });
});
