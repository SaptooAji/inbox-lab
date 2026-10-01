import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentLoader } from "./steps/compose-step";

const SAFE_NAME = /^[a-z][a-z0-9-]*$/;

export class FileSystemComponentLoader implements ComponentLoader {
  constructor(private readonly directory: string) {}

  load(name: string): string | null {
    if (!SAFE_NAME.test(name)) {
      return null;
    }
    const file = join(this.directory, `${name}.html`);
    return existsSync(file) ? readFileSync(file, "utf8") : null;
  }
}
