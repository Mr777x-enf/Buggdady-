
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugKill AI",
  description: "AI-powered GitHub repository code analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
