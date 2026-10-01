import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TemplateId } from "@/domain/value-objects/template-id";
import { buildTemplates } from "../../../emails/build/build-templates";
import { ALLOWED_MERGE_TAGS } from "../../../emails/build/merge-tags";
import { flattenTokens } from "../../../emails/build/tokens";
import tokens from "../../../emails/tokens/tokens.json";

describe("the project's real email templates", () => {
  it("build cleanly, with zero warnings, and match the domain's template ids", async () => {
    const output = mkdtempSync(join(tmpdir(), "real-emails-"));
    const emails = join(process.cwd(), "emails");

    try {
      const report = await buildTemplates({
        templatesDirectory: join(emails, "templates"),
        componentsDirectory: join(emails, "components"),
        outputDirectory: output,
        tokens: flattenTokens(tokens),
        mergeTags: ALLOWED_MERGE_TAGS,
      });

      expect(report.built).toContain("welcome");
      expect(report.warnings).toEqual([]);
      for (const id of report.built) {
        expect(TemplateId.create(id).ok, `"${id}" must exist in TEMPLATE_IDS`).toBe(true);
      }
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });
});
