import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sajag",
  description: "Sajag: a scam-call shield for Indian families.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
