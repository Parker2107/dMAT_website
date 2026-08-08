import type { Metadata, Viewport } from "next";

import { Nav } from "@/components/Nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "dMAT Trainer",
  description:
    "Practice the three dMAT Core Module task types with unlimited generated questions.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "dMAT Trainer" },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark-mode browser extensions (Dark Reader and friends) stamp attributes
    // onto <html> before React hydrates, which otherwise reports as a mismatch.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
