import type { TemplateSummary } from "../dto/template.dto";
import { toTemplateSummary } from "../mappers/template-summary";
import type { TemplateRepository } from "../ports/template-repository";

export class ListTemplates {
  constructor(private readonly templates: TemplateRepository) {}

  async execute(): Promise<readonly TemplateSummary[]> {
    const all = await this.templates.list();
    return all.map(toTemplateSummary);
  }
}
