import { describe, expect, it } from "vitest";
import { TemplateNotFoundError } from "@/application/errors/application-errors";
import { GetTemplate } from "@/application/use-cases/get-template";
import type { EmailTemplate } from "@/domain/entities/email-template";
import { aTemplate, FakeTemplateRenderer, FakeTemplateRepository } from "../../support/fakes";
import { errorOf, unwrap } from "../../support/unwrap";

function createSut(templates: readonly EmailTemplate[] = [aTemplate()]) {
  return new GetTemplate(new FakeTemplateRepository(templates), new FakeTemplateRenderer());
}

describe("GetTemplate", () => {
  it("returns light, dark and text versions rendered with a sample name", async () => {
    const preview = unwrap(await createSut().execute("welcome"));

    expect(preview).toEqual({
      id: "welcome",
      name: "welcome",
      description: "Template welcome",
      defaultSubject: "Default subject for welcome",
      html: "<p>html</p>|Rina",
      darkHtml: "<p>dark</p>|Rina",
      text: "text|Rina",
    });
  });

  it.each(["unknown", "", "../etc/passwd"])("reports %j as not found", async (raw) => {
    const result = await createSut().execute(raw);

    expect(errorOf(result)).toBeInstanceOf(TemplateNotFoundError);
  });

  it("reports a valid id that the repository does not have", async () => {
    const result = await createSut([]).execute("welcome");

    expect(errorOf(result)).toBeInstanceOf(TemplateNotFoundError);
  });
});
