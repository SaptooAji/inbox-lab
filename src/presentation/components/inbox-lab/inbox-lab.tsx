"use client";

import { useState } from "react";
import type { TemplateSummary } from "@/application/dto/template.dto";
import { SendForm } from "../send-form/send-form";
import { TemplateExplorer } from "../template-explorer/template-explorer";

export interface InboxLabProps {
  readonly templates: readonly TemplateSummary[];
  readonly turnstileSiteKey: string | undefined;
}

/** Holds the one piece of state the two sections share: which template is selected. */
export function InboxLab({ templates, turnstileSiteKey }: InboxLabProps) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selected = templates.find((template) => template.id === selectedId) ?? templates[0];

  return (
    <div className="mt-10 flex flex-col gap-12 xl:flex-row xl:items-start xl:gap-10">
      <section aria-labelledby="templates-heading" className="min-w-0 xl:flex-1">
        <h2 id="templates-heading" className="text-2xl font-semibold">
          Email templates
        </h2>
        <p className="mt-2 text-muted">
          Pick a template, then check it on desktop and mobile, in light and dark.
        </p>
        <div className="mt-6">
          <TemplateExplorer
            templates={templates}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </section>

      {selected === undefined ? null : (
        <section aria-labelledby="send-heading" className="xl:w-96 xl:shrink-0 sticky top-8">
          <h2 id="send-heading" className="text-2xl font-semibold">
            Send it to your inbox
          </h2>
          <p className="mt-2 text-muted">
            See the real thing in your own email app. It is a one-time demo email, not a
            subscription.
          </p>
          <div className="mt-6 max-w-2xl">
            <SendForm
              templateId={selected.id}
              templateName={selected.name}
              defaultSubject={selected.defaultSubject}
              turnstileSiteKey={turnstileSiteKey}
            />
          </div>
        </section>
      )}
    </div>
  );
}
