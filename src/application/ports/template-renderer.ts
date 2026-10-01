import type { EmailTemplate } from "@/domain/entities/email-template";

export interface MergeValues {
  readonly firstName: string;
}

export interface RenderedEmail {
  readonly html: string;
  readonly darkHtml: string;
  readonly text: string;
}

export interface TemplateRenderer {
  render(template: EmailTemplate, values: MergeValues): RenderedEmail;
}
