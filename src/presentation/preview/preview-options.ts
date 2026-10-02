export type Device = "desktop" | "mobile";
export type Scheme = "light" | "dark";
export type View = "email" | "text";

export const PREVIEW_VARIANTS = ["light", "dark", "text"] as const;
export type PreviewVariant = (typeof PREVIEW_VARIANTS)[number];

export const DEVICE_WIDTH_PX: Readonly<Record<Device, number>> = { desktop: 640, mobile: 375 };

export function isPreviewVariant(value: string): value is PreviewVariant {
  return (PREVIEW_VARIANTS as readonly string[]).includes(value);
}

export function previewVariant(view: View, scheme: Scheme): PreviewVariant {
  return view === "text" ? "text" : scheme;
}

export function previewUrl(templateId: string, variant: PreviewVariant): string {
  return `/preview/${encodeURIComponent(templateId)}/${variant}`;
}
