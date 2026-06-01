"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiClientError, UserRead, UserRole, getUser } from "@/lib/api-client";
import { getAccessToken, logout } from "@/lib/auth";

type SessionTokenPayload = {
  sub: string;
  email: string;
  fullName?: string | null;
  status?: string | null;
};

type SessionState = {
  isLoading: boolean;
  profile: UserRead | null;
  tokenPayload: SessionTokenPayload | null;
  error: string | null;
};

const publicPaths = ["/login", "/public"];

export function SessionContextHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<SessionState>({
    isLoading: false,
    profile: null,
    tokenPayload: null,
    error: null,
  });

  const shouldHide = publicPaths.some((path) => pathname.startsWith(path));

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (shouldHide) {
      return;
    }

    let isMounted = true;
    const token = getAccessToken();

    if (!token) {
      setSession({
        isLoading: false,
        profile: null,
        tokenPayload: null,
        error: null,
      });
      return;
    }

    const tokenPayload = decodeSessionToken(token);

    if (!tokenPayload?.sub) {
      logout();
      router.replace("/login");
      return;
    }

    const currentTokenPayload = tokenPayload;

    setSession({
      isLoading: true,
      profile: null,
      tokenPayload: currentTokenPayload,
      error: null,
    });

    async function loadCurrentUser() {
      try {
        const profile = await getUser(currentTokenPayload.sub);

        if (isMounted) {
          setSession({
            isLoading: false,
            profile,
            tokenPayload: currentTokenPayload,
            error: null,
          });
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        setSession({
          isLoading: false,
          profile: null,
          tokenPayload: currentTokenPayload,
          error:
            caughtError instanceof ApiClientError && caughtError.status === 403
              ? "Roles no disponibles para esta sesión."
              : "No fue posible cargar el contexto de sesión.",
        });
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [router, shouldHide]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", closeOnOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, [isOpen]);

  const displayName =
    session.profile?.fullName ||
    session.profile?.name ||
    session.tokenPayload?.fullName ||
    session.tokenPayload?.email ||
    "Usuario";
  const email = session.profile?.email || session.tokenPayload?.email || "";
  const roles = useMemo(
    () => getDistinctRoles(session.profile?.roles ?? []),
    [session.profile?.roles],
  );
  const primaryRole = roles[0] ?? null;
  const remainingRoles = roles.slice(1);
  const initials = getInitials(displayName, email);

  if (shouldHide || !session.tokenPayload) {
    return null;
  }

  return (
    <div className="session-context" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        className="session-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="session-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="session-summary">
          <span className="session-name">{displayName}</span>
          <span className="session-role">
            {session.isLoading
              ? "Cargando rol..."
              : primaryRole?.name || primaryRole?.code || "Rol no disponible"}
          </span>
        </span>
      </button>

      <div className="session-role-row" aria-label="Roles asignados">
        {primaryRole ? (
          <span className="session-role-badge">
            {primaryRole.name || primaryRole.code}
          </span>
        ) : (
          <span className="session-role-badge session-role-badge-muted">
            {session.isLoading ? "Cargando" : "Sin roles visibles"}
          </span>
        )}
        {remainingRoles.length > 0 ? (
          <span
            className="session-role-badge session-role-badge-muted"
            title={remainingRoles
              .map((role) => role.name || role.code)
              .filter(Boolean)
              .join(", ")}
          >
            +{remainingRoles.length}
          </span>
        ) : null}
      </div>

      {isOpen ? (
        <div className="session-menu">
          <div className="session-menu-header">
            <strong>{displayName}</strong>
            {email ? <span>{email}</span> : null}
            {session.error ? <small>{session.error}</small> : null}
          </div>
          <Link href="/profile">Mi perfil</Link>
          <Link href="/profile#mi-firma">Mi firma</Link>
          <button
            className="session-menu-logout"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}

function decodeSessionToken(token: string): SessionTokenPayload | null {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = normalizeBase64Url(payload);
    const decoded = window.atob(normalizedPayload);
    const parsed = JSON.parse(decoded) as Partial<SessionTokenPayload>;

    if (!parsed.sub || !parsed.email) {
      return null;
    }

    return {
      sub: parsed.sub,
      email: parsed.email,
      fullName: parsed.fullName,
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

function normalizeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;

  if (padding === 0) {
    return normalized;
  }

  return `${normalized}${"=".repeat(4 - padding)}`;
}

function getDistinctRoles(roles: UserRole[]) {
  const seen = new Set<string>();

  return roles.filter((role) => {
    const key = role.code || role.name || role.id;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getInitials(name: string, email: string) {
  const source = name && name !== "Usuario" ? name : email;
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
