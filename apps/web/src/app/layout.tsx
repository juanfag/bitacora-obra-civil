import type { Metadata } from "next";
import Link from "next/link";
import { SessionContextHeader } from "@/components/session-context-header";
import "./globals.css";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Proyectos" },
  { href: "/daily-logs", label: "Bitácoras" },
  { href: "/users", label: "Usuarios" },
];

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
            <nav className="nav" aria-label="Navegacion principal">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <SessionContextHeader />
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
