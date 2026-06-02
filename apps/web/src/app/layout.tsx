import type { Metadata } from "next";
import Link from "next/link";
import { AppNavigation } from "@/components/app-navigation";
import { SessionContextHeader } from "@/components/session-context-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bitacora de Obra",
  description: "Base frontend del MVP de bitacora de obra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/dashboard" className="brand">
              Bitacora
            </Link>
            <AppNavigation />
            <SessionContextHeader />
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
