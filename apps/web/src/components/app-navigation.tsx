"use client";

import Link from "next/link";
import { useCurrentPermissions } from "@/lib/use-current-permissions";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    permissions: ["dashboard:read", "daily-logs:read"],
  },
  {
    href: "/projects",
    label: "Proyectos",
    permissions: ["projects:read"],
  },
  {
    href: "/daily-logs",
    label: "Bitacoras",
    permissions: ["daily-logs:read"],
  },
  {
    href: "/users",
    label: "Usuarios",
    permissions: ["users:read"],
  },
];

export function AppNavigation() {
  const permissions = useCurrentPermissions();

  return (
    <nav className="nav" aria-label="Navegacion principal">
      {navigation
        .filter((item) => permissions.canAny(item.permissions))
        .map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
    </nav>
  );
}
