import type { ProofEntry, ProofSource } from "@/application/dto/proof.dto";
import { TEMPLATE_IDS } from "@/domain/value-objects/template-id";

/** One client of one template: its light and dark screenshot, either of which may be missing. */
export interface ProofClientGroup {
  readonly client: string;
  readonly light: ProofEntry | undefined;
  readonly dark: ProofEntry | undefined;
}

export interface ProofTemplateGroup {
  readonly templateId: string;
  readonly clients: readonly ProofClientGroup[];
}

export function sourceLabel(source: ProofSource): string {
  return source === "real" ? "Real client render" : "Simulation";
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function proofCaption(entry: ProofEntry): string {
  return `${entry.client}, ${entry.tool}, ${entry.scheme} theme, ${longDate(entry.date)}`;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function proofSummary(entries: readonly ProofEntry[]): string {
  if (entries.length === 0) {
    return "No screenshots yet.";
  }
  const real = entries.filter((entry) => entry.source === "real").length;
  const simulated = entries.length - real;
  const parts: string[] = [];
  if (real > 0) {
    parts.push(plural(real, "real client render", "real client renders"));
  }
  if (simulated > 0) {
    parts.push(plural(simulated, "simulation", "simulations"));
  }
  return `${plural(entries.length, "screenshot", "screenshots")}: ${parts.join(", ")}`;
}

/**
 * Template, then client (sorted by name), then the light and dark pair.
 * The list is newest first, so when a theme appears twice the first entry wins.
 */
export function groupProofByClient(entries: readonly ProofEntry[]): readonly ProofTemplateGroup[] {
  return TEMPLATE_IDS.map((templateId) => {
    const ofTemplate = entries.filter((entry) => entry.templateId === templateId);
    const clients = [...new Set(ofTemplate.map((entry) => entry.client))]
      .sort((a, b) => a.localeCompare(b))
      .map((client) => ({
        client,
        light: ofTemplate.find((entry) => entry.client === client && entry.scheme === "light"),
        dark: ofTemplate.find((entry) => entry.client === client && entry.scheme === "dark"),
      }));
    return { templateId, clients };
  }).filter((group) => group.clients.length > 0);
}
