import type { ProofEntry, ProofSource } from "@/application/dto/proof.dto";
import { TEMPLATE_IDS } from "@/domain/value-objects/template-id";

export interface ProofGroup {
  readonly templateId: string;
  readonly entries: readonly ProofEntry[];
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

/** Groups in template order; templates without screenshots are left out. */
export function groupProofByTemplate(entries: readonly ProofEntry[]): readonly ProofGroup[] {
  return TEMPLATE_IDS.map((templateId) => ({
    templateId,
    entries: entries.filter((entry) => entry.templateId === templateId),
  })).filter((group) => group.entries.length > 0);
}
