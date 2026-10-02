"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_HEIGHT_PX = 640;
const MIN_HEIGHT_PX = 320;

export interface PreviewFrameProps {
  readonly src: string;
  readonly title: string;
  readonly widthPx: number;
}

/**
 * Same-origin sandbox without scripts: the email cannot run code, and the page can still
 * measure it. A ResizeObserver keeps the frame as tall as the email, including after the
 * width toggle reflows it.
 */
export function PreviewFrame({ src, title, widthPx }: PreviewFrameProps) {
  const [height, setHeight] = useState(INITIAL_HEIGHT_PX);
  const frame = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => () => observer.current?.disconnect(), []);

  function handleLoad(): void {
    const root = frame.current?.contentDocument?.documentElement;
    if (!root) {
      return;
    }
    const update = () =>
      setHeight(Math.max(Math.ceil(root.getBoundingClientRect().height), MIN_HEIGHT_PX));

    observer.current?.disconnect();
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(root);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2">
      <iframe
        ref={frame}
        src={src}
        title={title}
        sandbox="allow-same-origin"
        onLoad={handleLoad}
        style={{ width: widthPx, height }}
        className="mx-auto block max-w-none bg-white"
      />
    </div>
  );
}
