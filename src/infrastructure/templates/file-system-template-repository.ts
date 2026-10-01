import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { TemplateRepository } from "@/application/ports/template-repository";
import { EmailTemplate } from "@/domain/entities/email-template";
import type { Result } from "@/domain/result";
import { EmailSubject } from "@/domain/value-objects/email-subject";
import { TemplateId } from "@/domain/value-objects/template-id";

const manifestSchema = z.object({
  templates: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      subject: z.string(),
    }),
  ),
});

type ManifestEntry = z.infer<typeof manifestSchema>["templates"][number];

const REBUILD_HINT = "Run `npm run emails:build` first.";

async function readText(path: string, label: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new Error(`Cannot read ${label}. ${REBUILD_HINT}`);
  }
}

/** A broken build output is a deployment fault, so these failures throw instead of returning a Result. */
function required<T>(result: Result<T, { readonly message: string }>, id: string): T {
  if (!result.ok) {
    throw new Error(`Template "${id}" in the build output is invalid: ${result.error.message}`);
  }
  return result.value;
}

export class FileSystemTemplateRepository implements TemplateRepository {
  constructor(private readonly directory: string) {}

  async list(): Promise<readonly EmailTemplate[]> {
    const entries = await this.readManifest();
    return Promise.all(entries.map((entry) => this.load(entry)));
  }

  async findById(id: TemplateId): Promise<EmailTemplate | null> {
    const entries = await this.readManifest();
    const entry = entries.find((candidate) => candidate.id === id.value);
    return entry === undefined ? null : this.load(entry);
  }

  private async readManifest(): Promise<readonly ManifestEntry[]> {
    const path = join(this.directory, "manifest.json");
    const raw = await readText(path, `the email build manifest at ${path}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`manifest.json is not valid JSON. ${REBUILD_HINT}`);
    }

    const result = manifestSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`manifest.json has an unexpected shape. ${REBUILD_HINT}`);
    }
    return result.data.templates;
  }

  private async load(entry: ManifestEntry): Promise<EmailTemplate> {
    const id = required(TemplateId.create(entry.id), entry.id);
    const defaultSubject = required(EmailSubject.create(entry.subject), entry.id);

    const [html, darkHtml, text] = await Promise.all([
      this.readOutput(entry.id, `${entry.id}.html`),
      this.readOutput(entry.id, `${entry.id}.dark.html`),
      this.readOutput(entry.id, `${entry.id}.txt`),
    ]);

    return required(
      EmailTemplate.create({
        id,
        name: entry.name,
        description: entry.description,
        defaultSubject,
        html,
        darkHtml,
        text,
      }),
      entry.id,
    );
  }

  private readOutput(templateId: string, file: string): Promise<string> {
    return readText(join(this.directory, file), `${file} for template "${templateId}"`);
  }
}
