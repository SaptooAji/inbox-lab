import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BuildError } from "../../../emails/build/build-step";
import { buildTemplates, type BuildOptions } from "../../../emails/build/build-templates";

const page = (body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Test email</title></head>` +
  `<body><div data-preheader data-text-skip>Preview</div>` +
  `<table role="presentation"><tr><td>${body}</td></tr></table></body></html>`;

const RICH_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Welcome</title>
<style>
p { color: [[color.text]]; }
@media (prefers-color-scheme: dark) { p { color: [[dark.color.text]] !important; } }
</style>
</head>
<body>
<div data-preheader data-text-skip>Preview text</div>
<table role="presentation"><tr><td>
<p>Hello {{firstName}}</p>
<!--@include cta href="https://example.com/go" label="Open dashboard"-->
</td></tr></table>
</body>
</html>`;

const ALPHA_META = { name: "Alpha", description: "Alpha email", subject: "Alpha subject" };
const BETA_META = { name: "Beta", description: "Beta email", subject: "Beta subject" };

describe("buildTemplates", () => {
  let root: string;
  let options: BuildOptions;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "email-build-"));
    mkdirSync(join(root, "templates"));
    mkdirSync(join(root, "components"));
    writeFileSync(join(root, "components", "cta.html"), '<a href="[[href]]">[[label]]</a>');
    options = {
      templatesDirectory: join(root, "templates"),
      componentsDirectory: join(root, "components"),
      outputDirectory: join(root, "dist", "emails"),
      tokens: new Map([
        ["color.text", "#1B1F1E"],
        ["dark.color.text", "#ECEFEA"],
      ]),
      mergeTags: ["firstName"],
    };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeTemplate(id: string, html: string, meta: unknown = ALPHA_META): void {
    writeFileSync(join(root, "templates", `${id}.html`), html);
    if (meta !== null) {
      writeFileSync(join(root, "templates", `${id}.json`), JSON.stringify(meta));
    }
  }

  const read = (file: string) => readFileSync(join(options.outputDirectory, file), "utf8");

  it("builds each template into light, dark and plain text files", async () => {
    writeTemplate("alpha", RICH_PAGE);

    await buildTemplates(options);

    expect(read("alpha.html")).toMatch(/#1b1f1e/i);
    expect(read("alpha.html")).toContain("Hello {{firstName}}");
    expect(read("alpha.html")).toContain("https://example.com/go");
    expect(read("alpha.dark.html")).toContain("@media all");
    expect(read("alpha.txt")).toContain("Hello {{firstName}}");
  });

  it("writes a manifest with each template's metadata, sorted by id", async () => {
    writeTemplate("beta", page("<p>b</p>"), BETA_META);
    writeTemplate("alpha", page("<p>a</p>"));

    await buildTemplates(options);

    expect(JSON.parse(read("manifest.json"))).toEqual({
      templates: [
        { id: "alpha", ...ALPHA_META },
        { id: "beta", ...BETA_META },
      ],
    });
  });

  it("reports what was built and prefixes warnings with the template name", async () => {
    writeTemplate("alpha", page("<p>fine</p>"));
    writeTemplate("beta", page('<a href="https://example.com">click here</a>'), BETA_META);

    const report = await buildTemplates(options);

    expect(report.built).toEqual(["alpha", "beta"]);
    expect(report.warnings).toEqual([expect.stringMatching(/^beta: \[links\]/)]);
  });

  it("removes stale output from earlier builds", async () => {
    mkdirSync(options.outputDirectory, { recursive: true });
    writeFileSync(join(options.outputDirectory, "stale.html"), "old");
    writeTemplate("alpha", page("<p>a</p>"));

    await buildTemplates(options);

    expect(existsSync(join(options.outputDirectory, "stale.html"))).toBe(false);
  });

  it("fails when a template has no metadata file", async () => {
    writeTemplate("alpha", page("<p>a</p>"), null);

    const run = buildTemplates(options);

    await expect(run).rejects.toThrow(BuildError);
    await expect(run).rejects.toThrow("alpha.json");
  });

  it("fails when metadata is invalid", async () => {
    writeTemplate("alpha", page("<p>a</p>"), { ...ALPHA_META, subject: "" });

    await expect(buildTemplates(options)).rejects.toThrow('field "subject"');
  });

  it("fails when metadata is not valid JSON", async () => {
    writeTemplate("alpha", page("<p>a</p>"), null);
    writeFileSync(join(root, "templates", "alpha.json"), "{ not json");

    await expect(buildTemplates(options)).rejects.toThrow("not valid JSON");
  });

  it("fails when there are no templates", async () => {
    await expect(buildTemplates(options)).rejects.toThrow("No templates found");
  });

  it("names the template and the rule when lint finds an error", async () => {
    writeTemplate("alpha", page('<img src="x.png">'));

    const run = buildTemplates(options);

    await expect(run).rejects.toThrow('alpha: step "lint" failed');
    await expect(run).rejects.toThrow("[alt-text]");
  });

  it("fails on an unknown component include", async () => {
    writeTemplate("alpha", page("<!--@include ghost-->"));

    await expect(buildTemplates(options)).rejects.toThrow('Unknown component "ghost"');
  });
});
