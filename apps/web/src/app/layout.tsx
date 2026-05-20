import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const navigation = [
  { href: "/projects", label: "Proyectos" },
  { href: "/daily-logs", label: "Bitacoras" },
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
            <Link href="/projects" className="brand">
              Bitacora
            </Link>
            <nav className="nav" aria-label="Navegacion principal">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
