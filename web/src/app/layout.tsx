import type { Metadata, Viewport } from "next";
import { fontDisplay, fontBody, fontHand } from "@/lib/fonts";
import { AppShell } from "@/components/common/AppShell";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Sajag — Scam-call shield for Indian families",
  description:
    "Sajag listens to suspicious calls, marks warning signs on a live paper call sheet with exact quotes, and speaks an alert aloud in your language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="hi"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontHand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
