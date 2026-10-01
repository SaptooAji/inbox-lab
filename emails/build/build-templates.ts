import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BuildError } from "./build-step";
import { createPipeline } from "./create-pipeline";
import { FileSystemComponentLoader } from "./file-system-component-loader";
import { runPipeline } from "./pipeline";
import { TemplateEmitter } from "./template-emitter";
import { parseTemplateMeta, type TemplateMeta } from "./template-meta";

export interface BuildOptions {
  readonly templatesDirectory: string;
  readonly componentsDirectory: string;
  readonly outputDirectory: string;
  readonly tokens: ReadonlyMap<string, string>;
  readonly mergeTags: readonly string[];
}

export interface BuildReport {
  readonly built: readonly string[];
  readonly warnings: readonly string[];
}

interface ManifestEntry extends TemplateMeta {
  readonly id: string;
}

function listTemplateIds(directory: string): string[] {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".html"))
    .map((file) => file.slice(0, -".html".length))
    .sort();
}

function readMeta(directory: string, id: string): TemplateMeta {
  const file = join(directory, `${id}.json`);
  if (!existsSync(file)) {
    throw new BuildError(`${id}: missing metadata file ${id}.json`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new BuildError(`${id}: ${id}.json is not valid JSON.`);
  }
  return parseTemplateMeta(id, raw);
}

export async function buildTemplates(options: BuildOptions): Promise<BuildReport> {
  const ids = listTemplateIds(options.templatesDirectory);
  if (ids.length === 0) {
    throw new BuildError(`No templates found in ${options.templatesDirectory}.`);
  }

  rmSync(options.outputDirectory, { recursive: true, force: true });

  const steps = createPipeline({
    components: new FileSystemComponentLoader(options.componentsDirectory),
    tokens: options.tokens,
    mergeTags: options.mergeTags,
  });
  const emitter = new TemplateEmitter(options.outputDirectory);
  const manifest: ManifestEntry[] = [];
  const warnings: string[] = [];

  for (const id of ids) {
    const meta = readMeta(options.templatesDirectory, id);
    const source = readFileSync(join(options.templatesDirectory, `${id}.html`), "utf8");

    const built = await runPipeline(steps, { name: id, html: source });
    emitter.emit(built);

    manifest.push({ id, ...meta });
    warnings.push(...(built.warnings ?? []).map((warning) => `${id}: ${warning}`));
  }

  writeFileSync(
    join(options.outputDirectory, "manifest.json"),
    `${JSON.stringify({ templates: manifest }, null, 2)}\n`,
    "utf8",
  );
  return { built: ids, warnings };
}
