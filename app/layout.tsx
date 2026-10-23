import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nut-Cracks — Agentic File Downloader",
  description: "Paste a URL. AI navigates the download flow and hands you the file.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
