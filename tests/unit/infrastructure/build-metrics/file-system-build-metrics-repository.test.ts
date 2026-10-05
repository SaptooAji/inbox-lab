import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystemBuildMetricsRepository } from "@/infrastructure/build-metrics/file-system-build-metrics-repository";

describe("FileSystemBuildMetricsRepository", () => {
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "metrics-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("measures the built html and text files in bytes, in the order of the template ids", async () => {
    await writeFile(join(dir, "welcome.html"), "a".repeat(10), "utf8");
    await writeFile(join(dir, "welcome.txt"), "é", "utf8"); // 1 character, 2 bytes
    await writeFile(join(dir, "win-back.html"), "a".repeat(300), "utf8");
    await writeFile(join(dir, "win-back.txt"), "abc", "utf8");

    const repository = new FileSystemBuildMetricsRepository(dir, ["welcome", "win-back"]);

    await expect(repository.list()).resolves.toEqual([
      { templateId: "welcome", htmlBytes: 10, textBytes: 2 },
      { templateId: "win-back", htmlBytes: 300, textBytes: 3 },
    ]);
  });

  it("fails with a hint to run the email build when a built file is missing", async () => {
    await writeFile(join(dir, "welcome.html"), "a", "utf8");

    const repository = new FileSystemBuildMetricsRepository(dir, ["welcome"]);

    await expect(repository.list()).rejects.toThrow(/emails:build/);
  });

  it("fails with the same hint when the build folder does not exist", async () => {
    const repository = new FileSystemBuildMetricsRepository(join(dir, "missing"), ["welcome"]);

    await expect(repository.list()).rejects.toThrow(/emails:build/);
  });
});
