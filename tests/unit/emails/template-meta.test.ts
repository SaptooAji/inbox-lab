import { describe, expect, it } from "vitest";
import { BuildError } from "../../../emails/build/build-step";
import { parseTemplateMeta } from "../../../emails/build/template-meta";

const valid = {
  name: " Welcome ",
  description: "Activation email",
  subject: "Welcome to NusaFlow",
};

describe("parseTemplateMeta", () => {
  it("returns trimmed metadata", () => {
    expect(parseTemplateMeta("welcome", valid)).toEqual({
      name: "Welcome",
      description: "Activation email",
      subject: "Welcome to NusaFlow",
    });
  });

  it.each([null, undefined, "text", 5])("rejects %j as the whole document", (raw) => {
    expect(() => parseTemplateMeta("welcome", raw)).toThrow("metadata must be a JSON object");
  });

  it.each(["name", "description", "subject"])("rejects a missing %s", (field) => {
    const incomplete = Object.fromEntries(Object.entries(valid).filter(([key]) => key !== field));

    expect(() => parseTemplateMeta("welcome", incomplete)).toThrow(`field "${field}"`);
  });

  it.each([{ subject: "" }, { subject: "   " }, { subject: 42 }])("rejects %j", (override) => {
    const error = () => parseTemplateMeta("welcome", { ...valid, ...override });

    expect(error).toThrow(BuildError);
    expect(error).toThrow('field "subject"');
  });
});
