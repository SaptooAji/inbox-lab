import type { EmailTemplate } from "@/domain/entities/email-template";
import type { TemplateSummary } from "../dto/template.dto";

export function toTemplateSummary(template: EmailTemplate): TemplateSummary {
  return {
    id: template.id.value,
    name: template.name,
    description: template.description,
    defaultSubject: template.defaultSubject.value,
  };
}
