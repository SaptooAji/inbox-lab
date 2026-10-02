import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WDNusantara Inbox Lab",
  description:
    "Responsive, accessible, dark-mode-ready HTML email, built and tested by WDNusantara.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
