import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemProofRepository } from "@/infrastructure/proof/file-system-proof-repository";

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "gmail-web-welcome-light",
    templateId: "welcome",
    client: "Gmail web",
    tool: "Chrome on Windows",
    scheme: "light",
    date: "2026-10-02",
    source: "real",
    image: "gmail-web-welcome-light.png",
    alt: "The welcome email opened in Gmail on the web, light theme",
    width: 1200,
    height: 1600,
    ...overrides,
  };
}

describe("FileSystemProofRepository", () => {
  let dir = "";
  let manifestPath = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "proof-"));
    manifestPath = join(dir, "manifest.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeManifest(value: unknown): Promise<void> {
    await writeFile(manifestPath, JSON.stringify(value), "utf8");
  }

  it("returns an empty list when the manifest file does not exist", async () => {
    await expect(new FileSystemProofRepository(manifestPath).list()).resolves.toEqual([]);
  });

  it("returns an empty list for an empty manifest", async () => {
    await writeManifest({ entries: [] });

    await expect(new FileSystemProofRepository(manifestPath).list()).resolves.toEqual([]);
  });

  it("returns valid entries, including the optional note", async () => {
    await writeManifest({ entries: [entry({ note: "Images off" })] });

    const entries = await new FileSystemProofRepository(manifestPath).list();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: "gmail-web-welcome-light",
      templateId: "welcome",
      source: "real",
      note: "Images off",
    });
  });

  it("sorts newest first, then by id", async () => {
    await writeManifest({
      entries: [
        entry({ id: "b", date: "2026-10-02" }),
        entry({ id: "a", date: "2026-10-04" }),
        entry({ id: "c", date: "2026-10-02" }),
      ],
    });

    const entries = await new FileSystemProofRepository(manifestPath).list();

    expect(entries.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("rejects a manifest that is not valid JSON", async () => {
    await writeFile(manifestPath, "{ not json", "utf8");

    await expect(new FileSystemProofRepository(manifestPath).list()).rejects.toThrow(
      /proof manifest/i,
    );
  });

  it("rejects a manifest without an entries list", async () => {
    await writeManifest({ items: [] });

    await expect(new FileSystemProofRepository(manifestPath).list()).rejects.toThrow(
      /proof manifest/i,
    );
  });

  it.each([
    ["an unknown template", { templateId: "black-friday" }],
    ["a malformed id", { id: "Bad Id" }],
    ["a date in the wrong format", { date: "02/10/2026" }],
    ["a date that does not exist", { date: "2026-13-45" }],
    ["an unknown theme", { scheme: "sepia" }],
    ["an unknown source", { source: "maybe" }],
    ["an image path that climbs out of the folder", { image: "../secret.png" }],
    ["an image in a subfolder", { image: "sub/shot.png" }],
    ["an image type that can carry script", { image: "shot.svg" }],
    ["empty alt text", { alt: "" }],
    ["a zero width", { width: 0 }],
    ["a fractional height", { height: 10.5 }],
    ["an empty client", { client: "" }],
    ["an unknown extra field", { rating: 5 }],
  ])("rejects an entry with %s", async (_label, overrides) => {
    await writeManifest({ entries: [entry(overrides)] });

    await expect(new FileSystemProofRepository(manifestPath).list()).rejects.toThrow(
      /proof manifest/i,
    );
  });

  it("rejects two entries with the same id", async () => {
    await writeManifest({ entries: [entry(), entry()] });

    await expect(new FileSystemProofRepository(manifestPath).list()).rejects.toThrow(
      /proof manifest/i,
    );
  });
});
