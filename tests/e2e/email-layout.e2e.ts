import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "../../src/domain/value-objects/template-id";

// Big display text (numbers, prices, scores, codes) must stay on one line on a phone.
// A real Gmail Android capture showed "30 days" breaking into "30" over "days".
test.describe("built emails on a phone (375 px)", () => {
  test.use({ viewport: { width: 375, height: 800 }, bypassCSP: true });

  for (const id of TEMPLATE_IDS) {
    test(`${id}: big numbers stay on one line`, async ({ page }) => {
      await page.goto(`/preview/${id}/light`);

      const wrapped = await page
        .locator(".stat-number, .price, .score, .promo-code")
        .evaluateAll((nodes) =>
          nodes
            .map((node) => {
              const lineHeight = parseFloat(getComputedStyle(node).lineHeight);
              const lines = Math.round(node.getBoundingClientRect().height / lineHeight);
              return { text: node.textContent?.trim() ?? "", lines };
            })
            .filter((item) => item.lines > 1),
        );

      expect(wrapped).toEqual([]);
    });
  }
});
