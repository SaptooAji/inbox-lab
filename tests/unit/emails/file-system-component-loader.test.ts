import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemComponentLoader } from "../../../emails/build/file-system-component-loader";

describe("FileSystemComponentLoader", () => {
  let root: string;
  let loader: FileSystemComponentLoader;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "email-components-"));
    const directory = join(root, "components");
    mkdirSync(directory);
    writeFileSync(join(directory, "header.html"), "<h1>Header</h1>");
    writeFileSync(join(root, "secret.html"), "top secret");
    loader = new FileSystemComponentLoader(directory);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("loads a component by name", () => {
    expect(loader.load("header")).toBe("<h1>Header</h1>");
  });

  it("returns null for a component that does not exist", () => {
    expect(loader.load("footer")).toBeNull();
  });

  it.each(["../secret", "..\\secret", "Header", "head er", ""])(
    "refuses the unsafe or malformed name %j",
    (name) => {
      expect(loader.load(name)).toBeNull();
    },
  );
});
