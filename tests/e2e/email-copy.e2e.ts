import { expect, test } from "@playwright/test";

test.describe("email copy", () => {
  test("the rating bars say '1 star', not '1 stars'", async ({ request }) => {
    const response = await request.get("/preview/feature-reviews/text");
    expect(response.ok()).toBe(true);

    const text = await response.text();

    expect(text).not.toMatch(/\b1 stars\b/);
    expect(text).toMatch(/\b1 star\b/);
  });
});
