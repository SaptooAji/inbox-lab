import { ValidationError } from "../errors/validation-error";
import { err, ok, type Result } from "../result";
import type { EmailSubject } from "../value-objects/email-subject";
import type { TemplateId } from "../value-objects/template-id";

export interface EmailTemplateProps {
  readonly id: TemplateId;
  readonly name: string;
  readonly description: string;
  readonly defaultSubject: EmailSubject;
  readonly html: string;
  readonly darkHtml: string;
  readonly text: string;
}

export class EmailTemplate {
  private constructor(
    readonly id: TemplateId,
    readonly name: string,
    readonly description: string,
    readonly defaultSubject: EmailSubject,
    readonly html: string,
    readonly darkHtml: string,
    readonly text: string,
  ) {}

  static create(props: EmailTemplateProps): Result<EmailTemplate, ValidationError> {
    const name = props.name.trim();

    if (name.length === 0) {
      return err(new ValidationError("name", "Template name is required."));
    }
    if (props.html.trim().length === 0) {
      return err(new ValidationError("html", "Template HTML is required."));
    }
    return ok(
      new EmailTemplate(
        props.id,
        name,
        props.description.trim(),
        props.defaultSubject,
        props.html,
        props.darkHtml,
        props.text,
      ),
    );
  }
}
