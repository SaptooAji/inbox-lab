import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "../../src/domain/value-objects/template-id";
import { seriousViolations } from "./support/axe";

const SCENARIOS = [
  { name: "desktop, light", colorScheme: "light", viewport: { width: 1440, height: 900 } },
  { name: "desktop, dark", colorScheme: "dark", viewport: { width: 1440, height: 900 } },
  { name: "phone, light", colorScheme: "light", viewport: { width: 375, height: 800 } },
  { name: "phone, dark", colorScheme: "dark", viewport: { width: 375, height: 800 } },
] as const;

for (const scenario of SCENARIOS) {
  test.describe(`site, ${scenario.name}`, () => {
    test.use({ colorScheme: scenario.colorScheme, viewport: scenario.viewport });

    test("has no serious or critical axe violations", async ({ page }) => {
      await page.goto("/");

      // The preview iframe holds an email, which has its own audit below.
      expect(await seriousViolations(page, ["iframe"])).toEqual([]);
    });
  });
}

test("the form in its error state has no serious or critical axe violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Send me this email" }).click();
  await expect(page.locator("#send-consent-error")).toBeVisible({ timeout: 20_000 });

  expect(await seriousViolations(page, ["iframe"])).toEqual([]);
});

test.describe("built email documents", () => {
  // The preview route sends a strict CSP; the audit needs to inject axe.
  test.use({ bypassCSP: true });

  for (const id of TEMPLATE_IDS) {
    for (const variant of ["light", "dark"] as const) {
      test(`${id} (${variant}) has no serious or critical axe violations`, async ({ page }) => {
        await page.goto(`/preview/${id}/${variant}`);

        expect(await seriousViolations(page)).toEqual([]);
      });
    }
  }
});
