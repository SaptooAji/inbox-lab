import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { TemplateBuildMetrics } from "@/application/dto/build-metrics.dto";
import type { BuildMetricsRepository } from "@/application/ports/build-metrics-repository";
import { isNotFound } from "../fs/is-not-found";

/** Measures the files the email build wrote to dist/emails, in bytes. */
export class FileSystemBuildMetricsRepository implements BuildMetricsRepository {
  constructor(
    private readonly distDir: string,
    private readonly templateIds: readonly string[],
  ) {}

  async list(): Promise<readonly TemplateBuildMetrics[]> {
    return Promise.all(
      this.templateIds.map(async (templateId) => ({
        templateId,
        htmlBytes: await this.sizeOf(`${templateId}.html`),
        textBytes: await this.sizeOf(`${templateId}.txt`),
      })),
    );
  }

  private async sizeOf(fileName: string): Promise<number> {
    try {
      return (await stat(join(this.distDir, fileName))).size;
    } catch (error) {
      if (isNotFound(error)) {
        throw new Error(
          `Built email file "${fileName}" was not found in ${this.distDir}. Run "npm run emails:build" first.`,
        );
      }
      throw error;
    }
  }
}
