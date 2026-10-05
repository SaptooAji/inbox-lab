import { expect, test } from "@playwright/test";

test.describe("send form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("can be completed and sent with the keyboard alone", async ({ page }) => {
    const email = page.getByLabel("Your email address");
    await email.focus();
    await page.keyboard.type("e2e+keyboard@example.com");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("First name")).toBeFocused();
    await page.keyboard.type("Rina");

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Subject (optional)")).toBeFocused();

    // The honeypot input is skipped, so the next stop is the consent box.
    await page.keyboard.press("Tab");
    const consent = page.getByRole("checkbox", { name: /one-time demo email/ });
    await expect(consent).toBeFocused();
    await page.keyboard.press("Space");
    await expect(consent).toBeChecked();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send me this email" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator("form").getByRole("status")).toContainText("Sent.", {
      timeout: 20_000,
    });
    await expect(email).toHaveValue("");
  });

  test("an empty submit flags every problem and moves focus to the first one", async ({ page }) => {
    await page.getByRole("button", { name: "Send me this email" }).click();

    const email = page.getByLabel("Your email address");
    await expect(email).toBeFocused({ timeout: 20_000 });
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#send-consent-error")).toBeVisible();
    await expect(page.locator("form").getByRole("status")).not.toContainText("Sent.");
  });

  test("a missing consent is reported and focused on its own", async ({ page }) => {
    await page.getByLabel("Your email address").fill("e2e+consent@example.com");
    await page.getByLabel("First name").fill("Rina");

    await page.getByRole("button", { name: "Send me this email" }).click();

    await expect(page.getByRole("checkbox", { name: /one-time demo email/ })).toBeFocused({
      timeout: 20_000,
    });
    await expect(page.locator("#send-consent-error")).toBeVisible();
  });
});
