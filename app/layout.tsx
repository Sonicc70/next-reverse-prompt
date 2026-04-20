import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reverse Prompt Engineer — Decode & Reconstruct Any Prompt",
  description:
    "Paste any prompt and get an accurate, detailed reconstruction of the ideal prompt. Powered by Claude AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
