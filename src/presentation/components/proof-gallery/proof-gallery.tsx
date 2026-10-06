import type { ProofEntry } from "@/application/dto/proof.dto";
import type { TemplateSummary } from "@/application/dto/template.dto";
import { groupProofByClient, proofSummary } from "@/presentation/proof/proof-view";
import { ProofTemplateBlock } from "./proof-template-block";

export interface ProofGalleryProps {
  readonly entries: readonly ProofEntry[];
  readonly templates: readonly TemplateSummary[];
}

/** Hidden until the manifest has entries, so the site never shows an empty promise. */
export function ProofGallery({ entries, templates }: ProofGalleryProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="proof-heading" className="mt-16">
      <h2 id="proof-heading" className="text-2xl font-semibold">
        Rendering proof
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        Screenshots of these emails in real inboxes and in simulations. Each one says which client
        and device or tool, which theme, which day, and whether it is a real render or a simulation.{" "}
        {proofSummary(entries)}.
      </p>
      {groupProofByClient(entries).map((group) => (
        <ProofTemplateBlock
          key={group.templateId}
          templateId={group.templateId}
          templateName={
            templates.find((template) => template.id === group.templateId)?.name ?? group.templateId
          }
          clients={group.clients}
        />
      ))}
    </section>
  );
}
