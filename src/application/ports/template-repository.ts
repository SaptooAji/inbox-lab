import type { EmailTemplate } from "@/domain/entities/email-template";
import type { TemplateId } from "@/domain/value-objects/template-id";

export interface TemplateRepository {
  list(): Promise<readonly EmailTemplate[]>;
  findById(id: TemplateId): Promise<EmailTemplate | null>;
}
