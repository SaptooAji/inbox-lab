const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileRenderOptions {
  readonly sitekey: string;
  readonly theme: "auto" | "light" | "dark";
  readonly callback: (token: string) => void;
  readonly "error-callback": () => void;
  readonly "expired-callback": () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's script once and resolves with its API. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile !== undefined) {
    return Promise.resolve(window.turnstile);
  }
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.turnstile === undefined) {
        loading = undefined;
        reject(new Error("The bot check script loaded without its API."));
        return;
      }
      resolve(window.turnstile);
    };
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error("The bot check could not be loaded."));
    };
    document.head.append(script);
  });
  return loading;
}
