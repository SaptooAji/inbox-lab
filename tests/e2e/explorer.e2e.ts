import { TEMPLATE_IDS } from "../../src/domain/value-objects/template-id";
import { expect, test, type Page } from "@playwright/test";

function templateGroup(page: Page) {
  return page.getByRole("group", { name: "Template", exact: true });
}

function option(page: Page, group: string, label: string) {
  return page
    .getByRole("group", { name: group, exact: true })
    .getByRole("radio", { name: label, exact: true });
}

async function choose(page: Page, group: string, label: string): Promise<void> {
  await page
    .getByRole("group", { name: group, exact: true })
    .getByText(label, { exact: true })
    .click();
}

test.describe("template explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("offers every template and selects the first one", async ({ page }) => {
    const radios = templateGroup(page).getByRole("radio");

    await expect(radios).toHaveCount(TEMPLATE_IDS.length);
    await expect(radios.first()).toBeChecked();
  });

  test("choosing a template updates the preview and the send form", async ({ page }) => {
    const labels = templateGroup(page).locator("label");
    const radio = templateGroup(page).getByRole("radio").nth(1);
    const id = await radio.getAttribute("value");
    const name = await labels.nth(1).locator("span").first().innerText();

    await labels.nth(1).click();

    await expect(radio).toBeChecked();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      new RegExp(`/preview/${id}/light$`),
    );
    await expect(page.getByText("Sending:")).toContainText(name);
  });

  test("the mobile toggle changes the preview", async ({ page }) => {
    await choose(page, "Device", "Mobile");

    await expect(option(page, "Device", "Mobile")).toBeChecked();
    await expect(page.locator("iframe")).toHaveAttribute("title", /mobile view/);
  });

  test("the dark toggle loads the simulated dark copy and says it is simulated", async ({
    page,
  }) => {
    await choose(page, "Theme", "Dark");

    await expect(page.locator("iframe")).toHaveAttribute("src", /\/dark$/);
    await expect(page.getByText("Dark mode is simulated in this preview.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open this version in a new tab" }),
    ).toHaveAttribute("href", /\/dark$/);
  });

  test("the plain text version disables the device and theme controls", async ({ page }) => {
    await choose(page, "Theme", "Dark");
    await choose(page, "Version", "Plain text");

    await expect(page.locator("iframe")).toHaveAttribute("src", /\/text$/);
    await expect(option(page, "Device", "Mobile")).toBeDisabled();
    await expect(option(page, "Theme", "Light")).toBeDisabled();
    await expect(page.getByText("Dark mode is simulated in this preview.")).toHaveCount(0);
  });

  test("the arrow keys move between options of a toggle", async ({ page }) => {
    await option(page, "Theme", "Light").focus();
    await page.keyboard.press("ArrowRight");

    await expect(option(page, "Theme", "Dark")).toBeChecked();
    await expect(page.locator("iframe")).toHaveAttribute("src", /\/dark$/);
  });
});
