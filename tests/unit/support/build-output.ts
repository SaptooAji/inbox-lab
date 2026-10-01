import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EmailTemplate } from "@/domain/entities/email-template";

export interface BuildOutputFixture {
  readonly directory: string;
  dispose(): void;
}

/** Writes templates in the same layout the email build produces. */
export function createBuildOutputFixture(templates: readonly EmailTemplate[]): BuildOutputFixture {
  const directory = mkdtempSync(join(tmpdir(), "build-output-"));

  for (const template of templates) {
    const id = template.id.value;
    writeFileSync(join(directory, `${id}.html`), template.html);
    writeFileSync(join(directory, `${id}.dark.html`), template.darkHtml);
    writeFileSync(join(directory, `${id}.txt`), template.text);
  }

  const manifest = {
    templates: templates.map((template) => ({
      id: template.id.value,
      name: template.name,
      description: template.description,
      subject: template.defaultSubject.value,
    })),
  };
  writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest));

  return { directory, dispose: () => rmSync(directory, { recursive: true, force: true }) };
}
