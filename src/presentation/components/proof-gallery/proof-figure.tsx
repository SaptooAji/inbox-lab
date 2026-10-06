"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ProofEntry } from "@/application/dto/proof.dto";
import { proofCaption, sourceLabel } from "@/presentation/proof/proof-view";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const FADE = "linear-gradient(to bottom, black 78%, transparent)";

export interface ProofFigureProps {
  readonly entry: ProofEntry;
}

/** A short top-aligned peek of the screenshot. The whole email opens in a native dialog. */
export function ProofFigure({ entry }: ProofFigureProps) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const caption = proofCaption(entry);
  const src = `/proof/${entry.image}`;

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
    }
    if (!open && element.open) {
      element.close();
    }
  }, [open]);

  function handleClose(): void {
    setOpen(false);
    opener.current?.focus();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      event.currentTarget.close();
    }
  }

  return (
    <>
      <figure className="min-w-0">
        <div className="h-[520px] overflow-hidden rounded-md border border-border">
          <Image
            src={src}
            alt={entry.alt}
            width={entry.width}
            height={entry.height}
            sizes="(min-width: 640px) 45vw, 100vw"
            className="h-[520px] w-full object-cover object-top"
            style={{ maskImage: FADE, WebkitMaskImage: FADE }}
          />
        </div>
        <figcaption className="mt-2 text-sm text-muted">
          <span className="font-medium text-text">{sourceLabel(entry.source)}.</span> {caption}
          {entry.note === undefined ? "" : `. ${entry.note}`}
        </figcaption>
        <button
          ref={opener}
          type="button"
          aria-label={`View full email, ${entry.client}, ${entry.scheme} theme`}
          onClick={() => setOpen(true)}
          className={`mt-3 rounded-md border border-control px-3 py-1.5 text-sm font-medium ${FOCUS_RING}`}
        >
          View full email
        </button>
      </figure>

      <dialog
        ref={dialog}
        aria-label={caption}
        onClose={handleClose}
        onClick={handleBackdropClick}
        className="m-auto w-[min(48rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-text backdrop:bg-black/60"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border p-4">
          <p className="text-sm text-muted">{caption}</p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className={`rounded-md border border-control px-3 py-1.5 text-sm font-medium ${FOCUS_RING}`}
          >
            Close
          </button>
        </div>
        <div
          role="region"
          aria-label="Full email screenshot"
          tabIndex={0}
          className={`max-h-[75vh] overflow-y-auto p-4 ${FOCUS_RING}`}
        >
          {open ? (
            <Image
              src={src}
              alt={entry.alt}
              width={entry.width}
              height={entry.height}
              sizes="48rem"
              className="h-auto w-full rounded-md border border-border"
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
