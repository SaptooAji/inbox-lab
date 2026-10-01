import { err, ok, type Result } from "@/domain/result";
import { TemplateId } from "@/domain/value-objects/template-id";
import type { TemplatePreview } from "../dto/template.dto";
import { TemplateNotFoundError } from "../errors/application-errors";
import { toTemplateSummary } from "../mappers/template-summary";
import type { TemplateRenderer } from "../ports/template-renderer";
import type { TemplateRepository } from "../ports/template-repository";

const PREVIEW_FIRST_NAME = "Rina";

export class GetTemplate {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly renderer: TemplateRenderer,
  ) {}

  async execute(rawId: string): Promise<Result<TemplatePreview, TemplateNotFoundError>> {
    const id = TemplateId.create(rawId);
    if (!id.ok) {
      return err(new TemplateNotFoundError(rawId));
    }

    const template = await this.templates.findById(id.value);
    if (template === null) {
      return err(new TemplateNotFoundError(rawId));
    }

    const rendered = this.renderer.render(template, { firstName: PREVIEW_FIRST_NAME });
    return ok({ ...toTemplateSummary(template), ...rendered });
  }
}
