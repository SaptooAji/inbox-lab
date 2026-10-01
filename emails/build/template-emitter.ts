import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BuildError, type BuildContext } from "./build-step";

const SAFE_NAME = /^[a-z][a-z0-9-]*$/;

export class TemplateEmitter {
  constructor(private readonly directory: string) {}

  emit(context: BuildContext): void {
    if (!SAFE_NAME.test(context.name)) {
      throw new BuildError(`Unsafe template name "${context.name}".`);
    }
    if (context.darkHtml === undefined || context.text === undefined) {
      throw new BuildError(
        `${context.name}: the dark preview and plain text steps must run before emitting.`,
      );
    }

    mkdirSync(this.directory, { recursive: true });
    writeFileSync(join(this.directory, `${context.name}.html`), context.html, "utf8");
    writeFileSync(join(this.directory, `${context.name}.dark.html`), context.darkHtml, "utf8");
    writeFileSync(join(this.directory, `${context.name}.txt`), context.text, "utf8");
  }
}
