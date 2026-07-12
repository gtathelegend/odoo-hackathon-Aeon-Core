import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AssetFlow — Enterprise Asset Management",
  description: "Enterprise Asset & Resource Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-fog text-on-surface">{children}</body>
    </html>
  );
}
