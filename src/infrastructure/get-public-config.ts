import { parsePublicConfig, type PublicConfig } from "./config/public-config";

export function getPublicConfig(): PublicConfig {
  return parsePublicConfig(process.env);
}
