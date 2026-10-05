import { ValidationError } from "../errors/validation-error";
import { err, ok, type Result } from "../result";

export const TEMPLATE_IDS = [
  "welcome",
  "community-digest",
  "win-back",
  "plan-sale",
  "feature-reviews",
  "topic-digest",
] as const;
export type TemplateIdValue = (typeof TEMPLATE_IDS)[number];

export class TemplateId {
  private constructor(readonly value: TemplateIdValue) {}

  static create(raw: string): Result<TemplateId, ValidationError> {
    const match = TEMPLATE_IDS.find((id) => id === raw);

    if (match === undefined) {
      return err(new ValidationError("templateId", "Choose one of the available templates."));
    }
    return ok(new TemplateId(match));
  }
}
