import { statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "../../src/domain/value-objects/template-id";
import { formatKilobytes } from "../../src/presentation/build/build-metrics-view";

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
    const items = section.getByRole("list", { name: "QA checklist items" }).getByRole("listitem");
    expect(await items.count()).toBeGreaterThanOrEqual(5);
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
