"use client";

import { useEffect, useRef, useState } from "react";
import { loadTurnstile } from "./turnstile-loader";

export interface TurnstileWidgetProps {
  readonly siteKey: string;
  /** Called with a token when the check passes, and with an empty string when it expires or fails. */
  readonly onToken: (token: string) => void;
}

export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current;
    if (container === null) {
      return;
    }
    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) {
          return;
        }
        widgetId = turnstile.render(container, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onToken(token),
          "error-callback": () => onToken(""),
          "expired-callback": () => onToken(""),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      if (widgetId !== undefined) {
        window.turnstile?.remove(widgetId);
      }
    };
  }, [siteKey, onToken]);

  return (
    <>
      <div ref={host} />
      {failed ? (
        <p role="alert" className="text-sm font-medium text-error">
          The bot check could not be loaded. Reload the page, or turn off any content blocker for
          this site.
        </p>
      ) : null}
    </>
  );
}
