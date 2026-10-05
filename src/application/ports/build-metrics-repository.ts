import type { TemplateBuildMetrics } from "../dto/build-metrics.dto";

export interface BuildMetricsRepository {
  list(): Promise<readonly TemplateBuildMetrics[]>;
}
