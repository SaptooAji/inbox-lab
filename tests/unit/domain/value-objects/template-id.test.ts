import { describe, expect, it } from "vitest";
import { TEMPLATE_IDS, TemplateId } from "@/domain/value-objects/template-id";

describe("TemplateId.create", () => {
  it.each([...TEMPLATE_IDS])("accepts the known id %j", (raw) => {
    const result = TemplateId.create(raw);

    expect(result.ok && result.value.value).toBe(raw);
  });

  it.each(["", "Welcome", "unknown", "../etc/passwd", " welcome"])("rejects %j", (raw) => {
    const result = TemplateId.create(raw);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("templateId");
    }
  });
});
