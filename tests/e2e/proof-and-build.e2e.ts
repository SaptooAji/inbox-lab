import { statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "../../src/domain/value-objects/template-id";
import { FileSystemProofRepository } from "../../src/infrastructure/proof/file-system-proof-repository";
import { formatKilobytes } from "../../src/presentation/build/build-metrics-view";
import { proofCaption, sourceLabel } from "../../src/presentation/proof/proof-view";

const MANIFEST = join(process.cwd(), "public", "proof", "manifest.json");

test.describe("proof gallery", () => {
  // Driven by the same manifest the site reads: hidden while it is empty,
  // complete and honestly labelled as soon as it has entries.
  test("matches the manifest", async ({ page }) => {
    const entries = await new FileSystemProofRepository(MANIFEST).list();
    await page.goto("/");
    const heading = page.getByRole("heading", { name: "Rendering proof" });

    if (entries.length === 0) {
      await expect(heading).toHaveCount(0);
      return;
    }

    await expect(heading).toBeVisible();
    for (const entry of entries) {
      const figure = page.locator("figure", {
        has: page.getByRole("img", { name: entry.alt, exact: true }),
      });
      await expect(figure).toContainText(sourceLabel(entry.source));
      await expect(figure).toContainText(proofCaption(entry));
    }
  });
});

test.describe("how it is built", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has the three parts", async ({ page }) => {
    const section = page.getByRole("region", { name: "How it is built" });

    await expect(section).toBeVisible();
    await expect(section.getByRole("heading", { name: "Component library" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "QA checklist" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Performance" })).toBeVisible();
    expect(
      await section.getByRole("list", { name: "QA checklist items" }).getByRole("listitem").count(),
    ).toBeGreaterThanOrEqual(5);
  });

  test("reports the real size of every built email", async ({ page }) => {
    const table = page.getByRole("table", { name: "Email size by template" });

    await expect(table.getByRole("row")).toHaveCount(TEMPLATE_IDS.length + 1);
    for (const id of TEMPLATE_IDS) {
      const bytes = statSync(join(process.cwd(), "dist", "emails", `${id}.html`)).size;
      await expect(table).toContainText(formatKilobytes(bytes));
    }
    await expect(page.getByRole("region", { name: "How it is built" })).toContainText("102 KB");
  });
});
