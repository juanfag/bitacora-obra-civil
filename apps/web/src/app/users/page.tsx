"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  ApiClientError,
  UserRead,
  UsersReadResponse,
  getUsers,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";

const PAGE_SIZE = 10;

export default function UsersPage() {
  const router = useRouter();
  const [response, setResponse] = useState<UsersReadResponse | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const usersResponse = await getUsers({
          page,
          limit: PAGE_SIZE,
          search,
        });

        if (isMounted) {
          setResponse(usersResponse);
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

        setError(
          caughtError instanceof ApiClientError
            ? caughtError.message
            : "No fue posible cargar los usuarios.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [page, router, search]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  const users = response?.items ?? [];
  const meta = response?.meta;

  return (
    <AuthGuard>
      <section>
        <div className="page-header dashboard-header">
          <div>
            <p className="eyebrow">Administracion</p>
            <h1>Usuarios</h1>
            <p className="muted">
              Consulta usuarios, roles y proyectos asociados en modo solo lectura.
            </p>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/dashboard">
              Volver al dashboard
            </Link>
          </div>
        </div>

        <section className="dashboard-section">
          <form className="users-filters" onSubmit={handleSearch}>
            <label>
              Buscar usuario
              <input
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre o email"
                value={searchInput}
              />
            </label>
            <button className="button" type="submit">
              Buscar
            </button>
            <button
              className="button secondary"
              onClick={handleClearSearch}
              type="button"
            >
              Limpiar
            </button>
          </form>
        </section>

        {isLoading ? (
          <div className="dashboard-state">
            <strong>Cargando usuarios</strong>
            <p className="muted">Estamos consultando usuarios y asignaciones.</p>
          </div>
        ) : null}

        {error ? (
          <div className="dashboard-state dashboard-state-error">
            <strong>No fue posible cargar los usuarios</strong>
            <p className="muted">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && users.length === 0 ? (
          <div className="empty-state">
            <h2>Sin usuarios para mostrar</h2>
            <p className="muted">
              No hay usuarios que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && users.length > 0 ? (
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <h2>Listado de usuarios</h2>
                <p className="muted">
                  Mostrando {users.length} de {meta?.total ?? users.length} usuarios.
                </p>
              </div>
            </div>

            <div className="users-list">
              {users.map((user) => (
                <UserListCard key={user.id} user={user} />
              ))}
            </div>

            <div className="pagination-row">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                type="button"
              >
                Anterior
              </button>
              <span className="muted">
                Pagina {meta?.page ?? page} de {Math.max(meta?.totalPages ?? 1, 1)}
              </span>
              <button
                className="button secondary"
                disabled={!meta || page >= meta.totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function UserListCard({ user }: { user: UserRead }) {
  return (
    <article className="user-card">
      <div>
        <div className="status-row">
          <span className="badge">{formatUserStatus(user.status)}</span>
          {user.roles.slice(0, 3).map((role) => (
            <span className="badge" key={`${role.id}-${role.projectId}`}>
              {role.name}
            </span>
          ))}
        </div>
        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>
        <p className="muted">
          {formatOrganizations(user)} - {formatProjects(user)}
        </p>
        <p className="user-card-dates">
          Creado: {formatDateTime(user.createdAt)} · Actualizado:{" "}
          {formatDateTime(user.updatedAt)}
        </p>
      </div>
      <Link className="button secondary" href={`/users/${user.id}`}>
        Ver detalle
      </Link>
    </article>
  );
}

function formatUserStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
  };

  return labels[status] ?? status;
}

function formatOrganizations(user: UserRead) {
  if (user.organizations.length === 0) {
    return "Sin organizacion";
  }

  return user.organizations.map((organization) => organization.name).join(", ");
}

function formatProjects(user: UserRead) {
  if (user.projects.length === 0) {
    return "Sin proyectos asociados";
  }

  return `${user.projects.length} proyecto${user.projects.length === 1 ? "" : "s"}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
