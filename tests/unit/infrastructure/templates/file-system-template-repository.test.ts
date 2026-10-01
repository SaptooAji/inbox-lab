import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TemplateId } from "@/domain/value-objects/template-id";
import { FileSystemTemplateRepository } from "@/infrastructure/templates/file-system-template-repository";
import { aTemplate } from "../../support/fakes";
import { createBuildOutputFixture, type BuildOutputFixture } from "../../support/build-output";
import { unwrap } from "../../support/unwrap";

describe("FileSystemTemplateRepository failures", () => {
  const fixtures: BuildOutputFixture[] = [];

  afterEach(() => {
    for (const fixture of fixtures.splice(0)) {
      fixture.dispose();
    }
  });

  function fixtureWith(...ids: ("welcome" | "win-back")[]): BuildOutputFixture {
    const fixture = createBuildOutputFixture(ids.map((id) => aTemplate(id)));
    fixtures.push(fixture);
    return fixture;
  }

  const manifest = (fixture: BuildOutputFixture, content: string) =>
    writeFileSync(join(fixture.directory, "manifest.json"), content);

  it("explains how to fix a missing build output", async () => {
    const repository = new FileSystemTemplateRepository(join(tmpdir(), "inbox-lab-no-such-output"));

    await expect(repository.list()).rejects.toThrow("npm run emails:build");
    await expect(repository.findById(unwrap(TemplateId.create("welcome")))).rejects.toThrow(
      "npm run emails:build",
    );
  });

  it("rejects a manifest that is not valid JSON", async () => {
    const fixture = fixtureWith("welcome");
    manifest(fixture, "{ nope");

    await expect(new FileSystemTemplateRepository(fixture.directory).list()).rejects.toThrow(
      "manifest.json is not valid JSON",
    );
  });

  it("rejects a manifest with the wrong shape", async () => {
    const fixture = fixtureWith("welcome");
    manifest(fixture, JSON.stringify({ templates: [{ id: "welcome" }] }));

    await expect(new FileSystemTemplateRepository(fixture.directory).list()).rejects.toThrow(
      "manifest.json has an unexpected shape",
    );
  });

  it("rejects a template id the domain does not know", async () => {
    const fixture = fixtureWith("welcome");
    manifest(
      fixture,
      JSON.stringify({ templates: [{ id: "ghost", name: "G", description: "d", subject: "s" }] }),
    );

    await expect(new FileSystemTemplateRepository(fixture.directory).list()).rejects.toThrow(
      '"ghost"',
    );
  });

  it("rejects invalid metadata, such as a blank subject", async () => {
    const fixture = fixtureWith("welcome");
    manifest(
      fixture,
      JSON.stringify({
        templates: [{ id: "welcome", name: "Welcome", description: "d", subject: "   " }],
      }),
    );

    await expect(new FileSystemTemplateRepository(fixture.directory).list()).rejects.toThrow(
      'Template "welcome" in the build output is invalid',
    );
  });

  it("names the file when one of a template's output files is missing", async () => {
    const fixture = fixtureWith("welcome");
    rmSync(join(fixture.directory, "welcome.txt"));

    await expect(new FileSystemTemplateRepository(fixture.directory).list()).rejects.toThrow(
      "welcome.txt",
    );
  });
});
