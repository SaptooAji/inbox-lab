"use client";

import { useState } from "react";
import type { ProofClientGroup } from "@/presentation/proof/proof-view";
import { SegmentedControl } from "../segmented-control";
import { ProofFigure } from "./proof-figure";

export interface ProofTemplateBlockProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly clients: readonly ProofClientGroup[];
}

/** One template: a client switch and that client's light and dark screenshots side by side. */
export function ProofTemplateBlock({ templateId, templateName, clients }: ProofTemplateBlockProps) {
  const [selected, setSelected] = useState(clients[0]?.client ?? "");
  const current = clients.find((item) => item.client === selected) ?? clients[0];
  if (current === undefined) {
    return null;
  }
  const headingId = `proof-${templateId}-heading`;

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h3 id={headingId} className="text-lg font-semibold">
        {templateName}
      </h3>
      <div className="mt-3">
        <SegmentedControl
          legend="Client"
          name={`proof-client-${templateId}`}
          options={clients.map((item) => ({ value: item.client, label: item.client }))}
          value={current.client}
          onChange={setSelected}
        />
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {current.light === undefined ? null : (
          <ProofFigure entry={current.light} templateName={templateName} />
        )}
        {current.dark === undefined ? null : (
          <ProofFigure entry={current.dark} templateName={templateName} />
        )}
      </div>
    </section>
  );
}
