import Image from "next/image";
import type { ProofEntry } from "@/application/dto/proof.dto";
import type { TemplateSummary } from "@/application/dto/template.dto";
import {
  groupProofByTemplate,
  proofCaption,
  proofSummary,
  sourceLabel,
} from "@/presentation/proof/proof-view";

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
      {groupProofByTemplate(entries).map((group) => (
        <div key={group.templateId} className="mt-8">
          <h3 className="text-lg font-semibold">
            {templates.find((template) => template.id === group.templateId)?.name ??
              group.templateId}
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((entry) => (
              <figure key={entry.id} className="min-w-0">
                <Image
                  src={`/proof/${entry.image}`}
                  alt={entry.alt}
                  width={entry.width}
                  height={entry.height}
                  sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full rounded-md border border-border"
                />
                <figcaption className="mt-2 text-sm text-muted">
                  <span className="font-medium text-text">{sourceLabel(entry.source)}.</span>{" "}
                  {proofCaption(entry)}
                  {entry.note === undefined ? "" : `. ${entry.note}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
