import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileSystemProofRepository } from "@/infrastructure/proof/file-system-proof-repository";

const PROOF_DIR = join(process.cwd(), "public", "proof");
const MANIFEST = join(PROOF_DIR, "manifest.json");

describe("the committed proof manifest", () => {
  it("exists", () => {
    expect(existsSync(MANIFEST)).toBe(true);
  });

  it("is valid and every listed image file is committed next to it", async () => {
    const entries = await new FileSystemProofRepository(MANIFEST).list();

    for (const entry of entries) {
      expect(existsSync(join(PROOF_DIR, entry.image)), entry.image).toBe(true);
    }
  });
});
