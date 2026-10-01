import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BuildError } from "../../../emails/build/build-step";
import { TemplateEmitter } from "../../../emails/build/template-emitter";

const complete = { name: "welcome", html: "<p>light</p>", darkHtml: "<p>dark</p>", text: "plain" };

describe("TemplateEmitter", () => {
  let root: string;
  let output: string;
  let emitter: TemplateEmitter;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "email-output-"));
    output = join(root, "nested", "emails");
    emitter = new TemplateEmitter(output);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("writes the light, dark and text files, creating the folder", () => {
    emitter.emit(complete);

    expect(readFileSync(join(output, "welcome.html"), "utf8")).toBe("<p>light</p>");
    expect(readFileSync(join(output, "welcome.dark.html"), "utf8")).toBe("<p>dark</p>");
    expect(readFileSync(join(output, "welcome.txt"), "utf8")).toBe("plain");
  });

  it("refuses to emit before the dark preview and text steps have run", () => {
    expect(() => emitter.emit({ name: "welcome", html: "<p>x</p>" })).toThrow(BuildError);
  });

  it.each(["../evil", "Welcome", "a/b", ""])("refuses the unsafe name %j", (name) => {
    expect(() => emitter.emit({ ...complete, name })).toThrow(BuildError);
  });
});
