import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { ProofEntry } from "../../src/application/dto/proof.dto";
import { FileSystemProofRepository } from "../../src/infrastructure/proof/file-system-proof-repository";
import {
  groupProofByClient,
  proofCaption,
  sourceLabel,
} from "../../src/presentation/proof/proof-view";
import { seriousViolations } from "./support/axe";

const ROOT = process.cwd();
const MANIFEST = join(ROOT, "public", "proof", "manifest.json");

async function loadGroups() {
  return groupProofByClient(await new FileSystemProofRepository(MANIFEST).list());
}

function templateName(id: string): string {
  const { name } = JSON.parse(
    readFileSync(join(ROOT, "emails", "templates", `${id}.json`), "utf8"),
  ) as { name: string };
  return name;
}

function openerName(entry: ProofEntry): string {
  return `View full email, ${templateName(entry.templateId)}, ${entry.client}, ${entry.scheme} theme`;
}

function dialogName(entry: ProofEntry): string {
  return `${templateName(entry.templateId)}: ${proofCaption(entry)}`;
}

function block(page: Page, templateId: string) {
  return page.getByRole("region", { name: templateName(templateId), exact: true });
}

test.describe("proof gallery", () => {
  test("shows one client at a time, as a labelled light and dark pair", async ({ page }) => {
    const groups = await loadGroups();
    await page.goto("/");
    const heading = page.getByRole("heading", { name: "Rendering proof" });

    if (groups.length === 0) {
      await expect(heading).toHaveCount(0);
      return;
    }

    await expect(heading).toBeVisible();
    for (const group of groups) {
      const section = block(page, group.templateId);
      for (const client of group.clients) {
        await section
          .getByRole("group", { name: "Client", exact: true })
          .getByText(client.client, { exact: true })
          .click();

        for (const entry of [client.light, client.dark]) {
          if (entry === undefined) {
            continue;
          }
          const figure = section.locator("figure", {
            has: page.getByRole("img", { name: entry.alt, exact: true }),
          });
          await expect(figure).toContainText(sourceLabel(entry.source));
          await expect(figure).toContainText(proofCaption(entry));
        }

        for (const other of group.clients.filter((item) => item !== client)) {
          for (const entry of [other.light, other.dark]) {
            if (entry !== undefined) {
              await expect(page.getByRole("img", { name: entry.alt, exact: true })).toHaveCount(0);
            }
          }
        }
      }
    }
  });

  test("each screenshot is a short peek and the section stays compact", async ({ page }) => {
    const [group] = await loadGroups();
    test.skip(group === undefined, "No proof in the manifest.");
    if (group === undefined) {
      return;
    }
    await page.goto("/");
    const section = block(page, group.templateId);

    const heights = await section
      .locator("figure img")
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
    const box = await section.boundingBox();

    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) {
      expect(height).toBeGreaterThan(200);
      expect(height).toBeLessThanOrEqual(560);
    }
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1000);
  });

  test("opens the full email in a dialog, closes on Escape and returns focus", async ({ page }) => {
    const [group] = await loadGroups();
    const entry = group?.clients[0]?.light ?? group?.clients[0]?.dark;
    test.skip(entry === undefined, "No proof in the manifest.");
    if (entry === undefined) {
      return;
    }
    await page.goto("/");

    const opener = page.getByRole("button", {
      name: openerName(entry),
      exact: true,
    });
    await opener.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: dialogName(entry) });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: entry.alt, exact: true })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("the dialog also closes with its Close button", async ({ page }) => {
    const [group] = await loadGroups();
    const entry = group?.clients[0]?.light ?? group?.clients[0]?.dark;
    test.skip(entry === undefined, "No proof in the manifest.");
    if (entry === undefined) {
      return;
    }
    await page.goto("/");
    await page
      .getByRole("button", {
        name: openerName(entry),
        exact: true,
      })
      .click();

    const dialog = page.getByRole("dialog", { name: dialogName(entry) });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();

    await expect(dialog).toBeHidden();
  });

  test("has no serious or critical axe violations with the dialog open", async ({ page }) => {
    const [group] = await loadGroups();
    const entry = group?.clients[0]?.light ?? group?.clients[0]?.dark;
    test.skip(entry === undefined, "No proof in the manifest.");
    if (entry === undefined) {
      return;
    }
    await page.goto("/");
    await page
      .getByRole("button", {
        name: openerName(entry),
        exact: true,
      })
      .click();
    await expect(page.getByRole("dialog", { name: dialogName(entry) })).toBeVisible();

    expect(await seriousViolations(page, ["iframe"])).toEqual([]);
  });

  test.describe("phones (375 px)", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("the section is compact and does not scroll sideways", async ({ page }) => {
      const [group] = await loadGroups();
      test.skip(group === undefined, "No proof in the manifest.");
      if (group === undefined) {
        return;
      }
      await page.goto("/");
      const box = await block(page, group.templateId).boundingBox();
      const scrollsSideways = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );

      expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1800);
      expect(scrollsSideways).toBe(false);
    });
  });
});
