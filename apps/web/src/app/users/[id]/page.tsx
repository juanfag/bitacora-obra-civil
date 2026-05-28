"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  AssignableRole,
  ApiClientError,
  UserRead,
  UserProject,
  getAssignableRoles,
  getUser,
  updateUserRoles,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<AssignableRole[]>([]);
  const [selectedRoleKeys, setSelectedRoleKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [rolesCatalogError, setRolesCatalogError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRolesCatalog, setIsLoadingRolesCatalog] = useState(false);
  const [canEditRoles, setCanEditRoles] = useState(false);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!params.id) {
        setError("Usuario no disponible.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setRolesCatalogError(null);
      setRolesError(null);
      setRolesSuccess(null);
      setCanEditRoles(false);
      setIsLoadingRolesCatalog(false);

      try {
        const userResponse = await getUser(params.id);

        if (isMounted) {
          setUser(userResponse);
          setSelectedRoleKeys(new Set(userResponse.roles.map(getRoleKey)));
          setAssignableRoles([]);
          setRolesCatalogError(null);
          setCanEditRoles(false);
          setIsLoadingRolesCatalog(true);
        }

        try {
          const assignableRolesResponse = await getAssignableRoles();

          if (isMounted) {
            setAssignableRoles(assignableRolesResponse);
            setCanEditRoles(true);
          }
        } catch (caughtError) {
          if (!isMounted) {
            return;
          }

          setAssignableRoles([]);
          setCanEditRoles(false);

          if (
            caughtError instanceof ApiClientError &&
            caughtError.status === 401
          ) {
            logout();
            router.replace("/login");
            return;
          }

          if (
            caughtError instanceof ApiClientError &&
            caughtError.status === 403
          ) {
            setRolesCatalogError(
              "No tienes permisos suficientes para administrar roles.",
            );
          } else {
            setRolesCatalogError(
              caughtError instanceof ApiClientError
                ? caughtError.message
                : "No fue posible cargar el catalogo de roles asignables.",
            );
          }
        } finally {
          if (isMounted) {
            setIsLoadingRolesCatalog(false);
          }
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
            : "No fue posible cargar el usuario.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [params.id, router]);

  async function handleSaveRoles() {
    if (!user || !canEditRoles) {
      return;
    }

    const confirmed = window.confirm(
      "¿Deseas guardar los cambios de roles visibles para este usuario?",
    );

    if (!confirmed) {
      return;
    }

    setIsSavingRoles(true);
    setRolesError(null);
    setRolesSuccess(null);

    try {
      const nextAssignments = [...selectedRoleKeys]
        .map(parseRoleKey)
        .filter(
          (assignment): assignment is { projectId: string; roleId: string } =>
            assignment !== null,
        );
      const updatedUser = await updateUserRoles(user.id, nextAssignments);

      setUser(updatedUser);
      setSelectedRoleKeys(new Set(updatedUser.roles.map(getRoleKey)));
      setRolesSuccess("Roles actualizados correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setRolesError("No tienes permisos suficientes para administrar roles.");
        return;
      }

      setRolesError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible actualizar los roles.",
      );
    } finally {
      setIsSavingRoles(false);
    }
  }

  function handleToggleRole(roleKey: string) {
    if (!canEditRoles) {
      return;
    }

    setRolesSuccess(null);
    setRolesError(null);
    setSelectedRoleKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      if (nextKeys.has(roleKey)) {
        nextKeys.delete(roleKey);
      } else {
        nextKeys.add(roleKey);
      }

      return nextKeys;
    });
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header dashboard-header">
          <div>
            <p className="eyebrow">Administracion</p>
            <h1>Detalle de usuario</h1>
            <p className="muted">
              Informacion de usuario, roles y proyectos en modo solo lectura.
            </p>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/users">
              Volver a usuarios
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="dashboard-state">
            <strong>Cargando usuario</strong>
            <p className="muted">Estamos consultando el detalle del usuario.</p>
          </div>
        ) : null}

        {error ? (
          <div className="dashboard-state dashboard-state-error">
            <strong>No fue posible cargar el usuario</strong>
            <p className="muted">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && user ? (
          <div className="user-detail-layout">
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>{user.name}</h2>
                  <p className="muted">{user.email}</p>
                </div>
                <span className="badge">{formatUserStatus(user.status)}</span>
              </div>
              <div className="user-detail-grid">
                <InfoLine label="Estado" value={formatUserStatus(user.status)} />
                <InfoLine label="Activo" value={user.isActive ? "Si" : "No"} />
                <InfoLine label="Creado" value={formatDateTime(user.createdAt)} />
                <InfoLine
                  label="Actualizado"
                  value={formatDateTime(user.updatedAt)}
                />
                <InfoLine
                  label="Organizaciones"
                  value={formatOrganizations(user)}
                />
                <InfoLine label="Proyectos" value={String(user.projects.length)} />
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Roles</h2>
                  <p className="muted">Roles asignados por proyecto.</p>
                </div>
              </div>
              {user.roles.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">Sin roles visibles para este usuario.</p>
                </div>
              ) : (
                <div className="users-chip-list">
                  {user.roles.map((role) => (
                    <span className="badge" key={`${role.id}-${role.projectId}`}>
                      {role.name} - {role.projectName}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Administracion de roles</h2>
                  <p className="muted">
                    Gestiona asignaciones usando el catalogo real de roles
                    disponibles para tu alcance.
                  </p>
                </div>
              </div>

              {isLoadingRolesCatalog ? (
                <div className="audit-state">
                  <span className="audit-state-icon">...</span>
                  <div>
                    <strong>Cargando catalogo de roles</strong>
                    <p className="muted">
                      Estamos consultando los roles asignables para tu usuario.
                    </p>
                  </div>
                </div>
              ) : null}

              {!canEditRoles && !isLoadingRolesCatalog ? (
                <div className="audit-state audit-state-error">
                  <span className="audit-state-icon">!</span>
                  <div>
                    <strong>Permisos insuficientes</strong>
                    <p className="muted">
                      Tu usuario no tiene permisos administrativos para editar
                      roles.
                    </p>
                  </div>
                </div>
              ) : null}

              {rolesCatalogError ? (
                <p className="form-error">{rolesCatalogError}</p>
              ) : null}
              {rolesError ? (
                <p className="form-error">{rolesError}</p>
              ) : null}
              {rolesSuccess ? (
                <p className="form-success">{rolesSuccess}</p>
              ) : null}

              {canEditRoles && assignableRoles.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">
                    No hay roles asignables disponibles para tu alcance actual.
                  </p>
                </div>
              ) : (
                <RoleAssignmentMatrix
                  assignableRoles={assignableRoles}
                  disabled={!canEditRoles || isSavingRoles}
                  onToggleRole={handleToggleRole}
                  projects={user.projects}
                  selectedRoleKeys={selectedRoleKeys}
                />
              )}

              <div className="toolbar">
                <button
                  className="button"
                  disabled={
                    !canEditRoles ||
                    !hasRoleChanges(user.roles, selectedRoleKeys) ||
                    isSavingRoles
                  }
                  onClick={handleSaveRoles}
                  type="button"
                >
                  {isSavingRoles ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  className="button secondary"
                  disabled={
                    !canEditRoles ||
                    !hasRoleChanges(user.roles, selectedRoleKeys) ||
                    isSavingRoles
                  }
                  onClick={() =>
                    setSelectedRoleKeys(new Set(user.roles.map(getRoleKey)))
                  }
                  type="button"
                >
                  Revertir
                </button>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Proyectos asociados</h2>
                  <p className="muted">
                    Proyectos visibles para tu alcance actual.
                  </p>
                </div>
              </div>
              {user.projects.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">Sin proyectos visibles para este usuario.</p>
                </div>
              ) : (
                <div className="users-project-grid">
                  {user.projects.map((project) => (
                    <article className="quick-action-card" key={project.id}>
                      <strong>{project.name}</strong>
                      <span>{project.code}</span>
                      <span>{project.organization.name}</span>
                      <span>{project.status}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function getRoleKey(role: { projectId: string; id: string }) {
  return `${role.projectId}:${role.id}`;
}

function parseRoleKey(roleKey: string) {
  const [projectId, roleId] = roleKey.split(":");

  if (!projectId || !roleId) {
    return null;
  }

  return { projectId, roleId };
}

function hasRoleChanges(
  roles: Array<{ projectId: string; id: string }>,
  selectedRoleKeys: Set<string>,
) {
  const originalRoleKeys = new Set(roles.map(getRoleKey));

  if (originalRoleKeys.size !== selectedRoleKeys.size) {
    return true;
  }

  return [...originalRoleKeys].some((roleKey) => !selectedRoleKeys.has(roleKey));
}

function RoleAssignmentMatrix({
  assignableRoles,
  disabled,
  onToggleRole,
  projects,
  selectedRoleKeys,
}: {
  assignableRoles: AssignableRole[];
  disabled: boolean;
  onToggleRole: (roleKey: string) => void;
  projects: UserProject[];
  selectedRoleKeys: Set<string>;
}) {
  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p className="muted">
          Este usuario no tiene proyectos visibles donde administrar roles.
        </p>
      </div>
    );
  }

  if (assignableRoles.length === 0) {
    return null;
  }

  return (
    <div className="role-assignment-list role-assignment-matrix">
      {projects.map((project) => (
        <article className="role-assignment-project" key={project.id}>
          <div className="role-assignment-project-heading">
            <strong>{project.name}</strong>
            <p className="muted">{project.organization.name}</p>
          </div>
          <div className="role-assignment-options">
            {assignableRoles.map((role) => {
              const roleKey = `${project.id}:${role.id}`;

              return (
                <label className="role-assignment-item" key={roleKey}>
                  <input
                    checked={selectedRoleKeys.has(roleKey)}
                    disabled={disabled}
                    onChange={() => onToggleRole(roleKey)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{role.name}</strong>
                    <small>
                      {role.code} - {formatPermissionSummary(role.permissions)}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function formatPermissionSummary(permissions: AssignableRole["permissions"]) {
  if (permissions.length === 0) {
    return "Sin permisos activos";
  }

  if (permissions.length === 1) {
    return "1 permiso activo";
  }

  return `${permissions.length} permisos activos`;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="user-info-line">
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
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
