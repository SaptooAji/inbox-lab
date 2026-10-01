import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GetTemplate } from "@/application/use-cases/get-template";
import { ListTemplates } from "@/application/use-cases/list-templates";
import { TEMPLATE_IDS } from "@/domain/value-objects/template-id";
import { FileSystemTemplateRepository } from "@/infrastructure/templates/file-system-template-repository";
import { MergeTagRenderer } from "@/infrastructure/templates/merge-tag-renderer";
import { buildTemplates } from "../../../emails/build/build-templates";
import { ALLOWED_MERGE_TAGS } from "../../../emails/build/merge-tags";
import { flattenTokens } from "../../../emails/build/tokens";
import tokens from "../../../emails/tokens/tokens.json";
import { unwrap } from "../../unit/support/unwrap";

describe("the real templates through the whole template stack", () => {
  it("builds, loads and renders every template with the visitor's name", async () => {
    const output = mkdtempSync(join(tmpdir(), "real-stack-"));
    const emails = join(process.cwd(), "emails");

    try {
      await buildTemplates({
        templatesDirectory: join(emails, "templates"),
        componentsDirectory: join(emails, "components"),
        outputDirectory: output,
        tokens: flattenTokens(tokens),
        mergeTags: ALLOWED_MERGE_TAGS,
      });
      const repository = new FileSystemTemplateRepository(output);

      const listed = await new ListTemplates(repository).execute();
      expect(listed.map((template) => template.id)).toEqual([...TEMPLATE_IDS].sort());

      const getTemplate = new GetTemplate(repository, new MergeTagRenderer());
      for (const { id } of listed) {
        const preview = unwrap(await getTemplate.execute(id));

        expect(preview.html, `${id} html`).toContain("Rina");
        expect(preview.html, `${id} html`).not.toContain("{{firstName}}");
        expect(preview.darkHtml, `${id} dark`).toContain("Rina");
        expect(preview.text, `${id} text`).toContain("Rina");
      }
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
