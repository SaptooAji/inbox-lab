import { BuildError } from "./build-step";

export interface TemplateMeta {
  readonly name: string;
  readonly description: string;
  readonly subject: string;
}

function readField(templateName: string, source: object, field: string): string {
  const value: unknown = Reflect.get(source, field);
  if (typeof value !== "string" || value.trim() === "") {
    throw new BuildError(`${templateName}: metadata field "${field}" must be a non-empty string.`);
  }
  return value.trim();
}

export function parseTemplateMeta(templateName: string, raw: unknown): TemplateMeta {
  if (typeof raw !== "object" || raw === null) {
    throw new BuildError(`${templateName}: metadata must be a JSON object.`);
  }
  return {
    name: readField(templateName, raw, "name"),
    description: readField(templateName, raw, "description"),
    subject: readField(templateName, raw, "subject"),
  };
}
