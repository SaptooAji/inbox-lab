import { describe, expect, it } from "vitest";
import { EmailTemplate } from "@/domain/entities/email-template";
import { EmailSubject } from "@/domain/value-objects/email-subject";
import { TemplateId } from "@/domain/value-objects/template-id";
import { unwrap } from "../../support/unwrap";

const validProps = () => ({
  id: unwrap(TemplateId.create("welcome")),
  name: "Welcome",
  description: "Activation email for new workspaces.",
  defaultSubject: unwrap(EmailSubject.create("Welcome to NusaFlow")),
  html: "<html></html>",
  darkHtml: "<html></html>",
  text: "Welcome",
});

describe("EmailTemplate.create", () => {
  it("creates a template from valid props", () => {
    const result = EmailTemplate.create(validProps());

    expect(result.ok).toBe(true);
  });

  it("trims the name and description", () => {
    const result = EmailTemplate.create({
      ...validProps(),
      name: "  Welcome ",
      description: " Hello ",
    });

    expect(result.ok && result.value.name).toBe("Welcome");
    expect(result.ok && result.value.description).toBe("Hello");
  });

  it("rejects an empty name", () => {
    const result = EmailTemplate.create({ ...validProps(), name: "  " });

    expect(!result.ok && result.error.field).toBe("name");
  });

  it("rejects empty html", () => {
    const result = EmailTemplate.create({ ...validProps(), html: "" });

    expect(!result.ok && result.error.field).toBe("html");
  });
});
