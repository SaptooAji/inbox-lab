import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { ProofEntry } from "@/application/dto/proof.dto";
import type { ProofRepository } from "@/application/ports/proof-repository";
import { TEMPLATE_IDS } from "@/domain/value-objects/template-id";
import { isNotFound } from "../fs/is-not-found";

const KNOWN_TEMPLATE_IDS: readonly string[] = TEMPLATE_IDS;
// Bare file names only: no folders, no dot segments, and no svg (it can carry script).
const IMAGE_FILE = /^[a-z0-9][a-z0-9._-]*\.(?:png|jpe?g|webp)$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) => z.string().trim().min(1).max(max);

const entrySchema = z.strictObject({
  id: z.string().regex(ID),
  templateId: z.string().refine((value) => KNOWN_TEMPLATE_IDS.includes(value), "Unknown template"),
  client: text(80),
  tool: text(80),
  scheme: z.enum(["light", "dark"]),
  date: z.iso.date(),
  source: z.enum(["real", "simulated"]),
  image: z.string().regex(IMAGE_FILE),
  alt: text(300),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  note: text(200).optional(),
});

const manifestSchema = z.strictObject({ entries: z.array(entrySchema) });

function compareProof(a: ProofEntry, b: ProofEntry): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  return a.id.localeCompare(b.id);
}

/** Reads public/proof/manifest.json. A missing file is an empty gallery; a bad one fails loudly. */
export class FileSystemProofRepository implements ProofRepository {
  constructor(private readonly manifestPath: string) {}

  async list(): Promise<readonly ProofEntry[]> {
    let raw: string;
    try {
      raw = await readFile(this.manifestPath, "utf8");
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      throw error;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Proof manifest is not valid JSON.");
    }

    const parsed = manifestSchema.safeParse(json);
    if (!parsed.success) {
      const problems = parsed.error.issues
        .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Proof manifest is invalid: ${problems}`);
    }

    const seen = new Set<string>();
    for (const entry of parsed.data.entries) {
      if (seen.has(entry.id)) {
        throw new Error(`Proof manifest is invalid: duplicate id "${entry.id}".`);
      }
      seen.add(entry.id);
    }

    return [...parsed.data.entries].sort(compareProof);
  }
}
