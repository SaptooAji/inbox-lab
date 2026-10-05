import { expect, test, type Page } from "@playwright/test";

async function boxes(page: Page) {
  const templates = await page.getByRole("region", { name: "Email templates" }).boundingBox();
  const send = await page.getByRole("region", { name: "Send it to your inbox" }).boundingBox();
  if (templates === null || send === null) {
    throw new Error("Both sections must be visible.");
  }
  return { templates, send };
}

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

test.describe("wide screens (1440 px)", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the explorer and the send form sit side by side", async ({ page }) => {
    await page.goto("/");
    const { templates, send } = await boxes(page);

    expect(send.x).toBeGreaterThan(templates.x + templates.width - 1);
    expect(send.y).toBeLessThan(templates.y + templates.height);
  });
});

test.describe("below the xl breakpoint (1024 px)", () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test("the send form stacks under the explorer", async ({ page }) => {
    await page.goto("/");
    const { templates, send } = await boxes(page);

    expect(send.y).toBeGreaterThanOrEqual(templates.y + templates.height - 1);
  });
});

test.describe("phones (375 px)", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the page does not scroll sideways", async ({ page }) => {
    await page.goto("/");

    expect(await hasHorizontalScroll(page)).toBe(false);
  });

  test("the page still does not scroll sideways with the mobile preview selected", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("group", { name: "Device", exact: true }).getByText("Mobile").click();

    expect(await hasHorizontalScroll(page)).toBe(false);
  });
});
