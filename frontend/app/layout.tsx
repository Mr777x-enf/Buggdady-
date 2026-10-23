import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugKill AI — Find and fix bugs",
  description: "AI-powered code analysis for GitHub repositories.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}