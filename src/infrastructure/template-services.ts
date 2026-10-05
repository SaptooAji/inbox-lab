import type { TemplateRenderer } from "@/application/ports/template-renderer";
import type { TemplateRepository } from "@/application/ports/template-repository";
import { GetTemplate } from "@/application/use-cases/get-template";
import { ListTemplates } from "@/application/use-cases/list-templates";
import { FileSystemTemplateRepository } from "./templates/file-system-template-repository";
import { MergeTagRenderer } from "./templates/merge-tag-renderer";

export interface TemplateServices {
  readonly repository: TemplateRepository;
  readonly renderer: TemplateRenderer;
  readonly listTemplates: ListTemplates;
  readonly getTemplate: GetTemplate;
}

/** Needs no configuration or secrets, so pages (and `next build` in CI) work without them. */
export function createTemplateServices(buildOutputDirectory: string): TemplateServices {
  const repository = new FileSystemTemplateRepository(buildOutputDirectory);
  const renderer = new MergeTagRenderer();
  return {
    repository,
    renderer,
    listTemplates: new ListTemplates(repository),
    getTemplate: new GetTemplate(repository, renderer),
  };
}
