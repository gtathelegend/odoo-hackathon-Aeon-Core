import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../components/auth-provider";

export const metadata: Metadata = {
  title: "AssetFlow — Enterprise Asset Management",
  description: "Enterprise Asset & Resource Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-fog text-on-surface">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
