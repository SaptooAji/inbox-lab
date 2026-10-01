import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BuildError } from "./build-step";
import { buildTemplates } from "./build-templates";
import { flattenTokens, type TokenTree } from "./tokens";

/** Runtime merge tags the templates may use. Anything else fails the lint. */
const ALLOWED_MERGE_TAGS = ["firstName"];

async function main(): Promise<void> {
  const emailsDirectory = join(process.cwd(), "emails");
  const tokenTree = JSON.parse(
    readFileSync(join(emailsDirectory, "tokens", "tokens.json"), "utf8"),
  ) as TokenTree;

  const report = await buildTemplates({
    templatesDirectory: join(emailsDirectory, "templates"),
    componentsDirectory: join(emailsDirectory, "components"),
    outputDirectory: join(process.cwd(), "dist", "emails"),
    tokens: flattenTokens(tokenTree),
    mergeTags: ALLOWED_MERGE_TAGS,
  });

  for (const warning of report.warnings) {
    console.warn(`warning  ${warning}`);
  }
  console.log(`Built ${report.built.length} email template(s): ${report.built.join(", ")}`);
}

main().catch((error: unknown) => {
  const detail =
    error instanceof BuildError
      ? error.message
      : error instanceof Error
        ? error.stack
        : String(error);
  console.error(`Email build failed: ${detail}`);
  process.exitCode = 1;
});
