import type {
  MergeValues,
  RenderedEmail,
  TemplateRenderer,
} from "@/application/ports/template-renderer";
import type { EmailTemplate } from "@/domain/entities/email-template";

const TAG_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;
const HTML_SPECIAL = /[&<>"']/g;
const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(HTML_SPECIAL, (char) => HTML_ESCAPES[char] ?? char);
}

/** Single pass, so a value can never introduce new tags. Unknown tags are kept as they are. */
function fill(source: string, values: ReadonlyMap<string, string>): string {
  return source.replace(TAG_PATTERN, (tag, name: string) => values.get(name) ?? tag);
}

export class MergeTagRenderer implements TemplateRenderer {
  render(template: EmailTemplate, values: MergeValues): RenderedEmail {
    const plain = new Map([["firstName", values.firstName]]);
    const escaped = new Map([["firstName", escapeHtml(values.firstName)]]);

    return {
      html: fill(template.html, escaped),
      darkHtml: fill(template.darkHtml, escaped),
      text: fill(template.text, plain),
    };
  }
}
