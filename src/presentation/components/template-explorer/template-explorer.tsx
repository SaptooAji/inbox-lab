"use client";

import { useState } from "react";
import type { TemplateSummary } from "@/application/dto/template.dto";
import {
  DEVICE_WIDTH_PX,
  previewUrl,
  previewVariant,
  type Device,
  type Scheme,
  type View,
} from "@/presentation/preview/preview-options";
import { SegmentedControl } from "../segmented-control";
import { PreviewFrame } from "./preview-frame";

const DEVICE_OPTIONS: readonly { value: Device; label: string }[] = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];
const SCHEME_OPTIONS: readonly { value: Scheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const VIEW_OPTIONS: readonly { value: View; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "text", label: "Plain text" },
];

export function TemplateExplorer({
  templates,
}: {
  readonly templates: readonly TemplateSummary[];
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [device, setDevice] = useState<Device>("desktop");
  const [scheme, setScheme] = useState<Scheme>("light");
  const [view, setView] = useState<View>("email");

  const selected = templates.find((template) => template.id === selectedId) ?? templates[0];
  if (selected === undefined) {
    return <p className="text-muted">No templates are available right now.</p>;
  }

  const src = previewUrl(selected.id, previewVariant(view, scheme));
  const isText = view === "text";
  const title = isText
    ? `${selected.name}, plain text version`
    : `${selected.name}, ${device} view, ${scheme} theme`;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium text-muted">Template</legend>
        <div className="grid gap-3">
          {templates.map((template) => (
            <label
              key={template.id}
              className="block cursor-pointer rounded-lg border border-border bg-surface p-4 has-checked:border-primary has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
            >
              <input
                type="radio"
                name="template"
                value={template.id}
                checked={template.id === selected.id}
                onChange={() => setSelectedId(template.id)}
                className="sr-only"
              />
              <span className="block font-semibold">{template.name}</span>
              <span className="mt-1 block text-sm text-muted">{template.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <SegmentedControl
            legend="Device"
            name="device"
            options={DEVICE_OPTIONS}
            value={device}
            onChange={setDevice}
            disabled={isText}
          />
          <SegmentedControl
            legend="Theme"
            name="scheme"
            options={SCHEME_OPTIONS}
            value={scheme}
            onChange={setScheme}
            disabled={isText}
          />
          <SegmentedControl
            legend="Version"
            name="view"
            options={VIEW_OPTIONS}
            value={view}
            onChange={setView}
          />
        </div>

        <p className="text-sm text-muted">
          Subject: <span className="font-medium text-text">{selected.defaultSubject}</span>
        </p>

        <PreviewFrame
          src={src}
          title={title}
          widthPx={DEVICE_WIDTH_PX[isText ? "desktop" : device]}
        />

        <p className="text-sm text-muted">
          {scheme === "dark" && !isText
            ? "Dark mode is simulated in this preview. Real email clients may differ. "
            : ""}
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-link underline">
            Open this version in a new tab
          </a>
        </p>
      </div>
    </div>
  );
}
