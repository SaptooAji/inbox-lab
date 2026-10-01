export interface TemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaultSubject: string;
}

export interface TemplatePreview extends TemplateSummary {
  readonly html: string;
  readonly darkHtml: string;
  readonly text: string;
}
