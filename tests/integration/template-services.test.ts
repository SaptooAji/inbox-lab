import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTemplateServices } from "@/infrastructure/template-services";
import { createBuildOutputFixture, type BuildOutputFixture } from "../unit/support/build-output";
import { aTemplate } from "../unit/support/fakes";
import { unwrap } from "../unit/support/unwrap";

describe("createTemplateServices", () => {
  let fixture: BuildOutputFixture;

  beforeEach(() => {
    fixture = createBuildOutputFixture([aTemplate("welcome"), aTemplate("win-back")]);
  });

  afterEach(() => {
    fixture.dispose();
  });

  it("lists and previews templates from a build output with no configuration at all", async () => {
    const services = createTemplateServices(fixture.directory);

    const listed = await services.listTemplates.execute();
    const preview = unwrap(await services.getTemplate.execute("welcome"));

    expect(listed.map((template) => template.id)).toEqual(["welcome", "win-back"]);
    expect(preview.html).toBe("<p>html</p>");
  });
});
