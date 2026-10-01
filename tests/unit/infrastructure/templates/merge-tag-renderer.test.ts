import { describe, expect, it } from "vitest";
import { EmailTemplate } from "@/domain/entities/email-template";
import { EmailSubject } from "@/domain/value-objects/email-subject";
import { TemplateId } from "@/domain/value-objects/template-id";
import { MergeTagRenderer } from "@/infrastructure/templates/merge-tag-renderer";
import { unwrap } from "../../support/unwrap";

function templateWith(html: string, darkHtml: string, text: string): EmailTemplate {
  return unwrap(
    EmailTemplate.create({
      id: unwrap(TemplateId.create("welcome")),
      name: "Welcome",
      description: "Test template",
      defaultSubject: unwrap(EmailSubject.create("Subject")),
      html,
      darkHtml,
      text,
    }),
  );
}

describe("MergeTagRenderer", () => {
  const renderer = new MergeTagRenderer();

  it("fills the tag in the html, dark html and text versions", () => {
    const template = templateWith(
      "<p>Hi {{firstName}}</p>",
      "<p>Dark {{firstName}}</p>",
      "Hi {{firstName}}",
    );

    const rendered = renderer.render(template, { firstName: "Rina" });

    expect(rendered).toEqual({
      html: "<p>Hi Rina</p>",
      darkHtml: "<p>Dark Rina</p>",
      text: "Hi Rina",
    });
  });

  it("replaces every occurrence and tolerates spaces inside the braces", () => {
    const template = templateWith("{{firstName}} {{ firstName }} {{  firstName  }}", "x", "x");

    expect(renderer.render(template, { firstName: "Rina" }).html).toBe("Rina Rina Rina");
  });

  it("escapes html in html versions but not in plain text", () => {
    const template = templateWith("{{firstName}}", "{{firstName}}", "{{firstName}}");

    const rendered = renderer.render(template, { firstName: `<b>"O'Neil" & co</b>` });

    expect(rendered.html).toBe("&lt;b&gt;&quot;O&#39;Neil&quot; &amp; co&lt;/b&gt;");
    expect(rendered.darkHtml).toBe(rendered.html);
    expect(rendered.text).toBe(`<b>"O'Neil" & co</b>`);
  });

  it("never expands tags that appear inside a value", () => {
    const template = templateWith("Hi {{firstName}}", "x", "x");

    expect(renderer.render(template, { firstName: "{{firstName}}!" }).html).toBe(
      "Hi {{firstName}}!",
    );
  });

  it("leaves unknown tags untouched", () => {
    const template = templateWith("{{unsubscribeUrl}} {{constructor}} {{firstName}}", "x", "x");

    expect(renderer.render(template, { firstName: "Rina" }).html).toBe(
      "{{unsubscribeUrl}} {{constructor}} Rina",
    );
  });
});
