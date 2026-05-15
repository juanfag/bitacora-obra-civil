import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const navigation = [
  { href: "/projects", label: "Projects" },
  { href: "/daily-logs", label: "Daily Logs" },
];

export const metadata: Metadata = {
  title: "Bitacora de Obra",
  description: "Daily construction log MVP shell",
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
            <nav className="nav" aria-label="Main navigation">
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
