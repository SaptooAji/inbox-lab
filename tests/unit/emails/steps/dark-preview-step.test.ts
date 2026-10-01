import { describe, expect, it } from "vitest";
import { DarkPreviewStep } from "../../../../emails/build/steps/dark-preview-step";

const run = (html: string) => new DarkPreviewStep().run({ name: "welcome", html });

describe("DarkPreviewStep", () => {
  it("forces the dark rules on in a separate copy and leaves html untouched", () => {
    const html = "<style>@media (prefers-color-scheme: dark){p{color:#fff!important}}</style>";

    const result = run(html);

    expect(result.html).toBe(html);
    expect(result.darkHtml).toBe("<style>@media all{p{color:#fff!important}}</style>");
  });

  it("handles spacing, letter case and a screen prefix", () => {
    const result = run("@MEDIA screen and (prefers-color-scheme:dark){a{b:c}}");

    expect(result.darkHtml).toBe("@media all{a{b:c}}");
  });

  it("does not touch compound queries, because their other conditions still matter", () => {
    const html = "@media (max-width:480px) and (prefers-color-scheme: dark){a{b:c}}";

    expect(run(html).darkHtml).toBe(html);
  });

  it("copies the html when there are no dark rules", () => {
    expect(run("<p>x</p>").darkHtml).toBe("<p>x</p>");
  });
});
