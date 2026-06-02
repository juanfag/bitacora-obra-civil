"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  AssignableRole,
  ApiClientError,
  ProjectSummary,
  UserProject,
  UserRead,
  getAssignableRoles,
  getProjects,
  getUser,
  invalidateUserSessions,
  resetUserPassword,
  updateUserRoles,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";
import { useCurrentPermissions } from "@/lib/use-current-permissions";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<AssignableRole[]>([]);
  const [assignableProjects, setAssignableProjects] = useState<ProjectSummary[]>(
    [],
  );
  const [selectedRoleKeys, setSelectedRoleKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectRoleId, setSelectedProjectRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rolesCatalogError, setRolesCatalogError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsSuccess, setProjectsSuccess] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsSuccess, setSessionsSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAdminCatalogs, setIsLoadingAdminCatalogs] = useState(false);
  const [canAdministerUser, setCanAdministerUser] = useState(false);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [isSavingProjects, setIsSavingProjects] = useState(false);
  const [isInvalidatingSessions, setIsInvalidatingSessions] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const permissions = useCurrentPermissions();
  const canAdministerUserByPermission = permissions.canAny([
    "users:manage",
    "roles:assign",
    "users:update",
  ]);
  const canRunAdminActions = canAdministerUser && canAdministerUserByPermission;

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
      setProjectsError(null);
      setProjectsSuccess(null);
      setSessionsError(null);
      setSessionsSuccess(null);
      setPasswordError(null);
      setPasswordSuccess(null);
      setCanAdministerUser(false);
      setIsLoadingAdminCatalogs(false);

      try {
        const userResponse = await getUser(params.id);

        if (isMounted) {
          setUser(userResponse);
          setSelectedRoleKeys(new Set(userResponse.roles.map(getRoleKey)));
          setAssignableRoles([]);
          setAssignableProjects([]);
          setSelectedProjectId("");
          setSelectedProjectRoleId("");
          setIsLoadingAdminCatalogs(true);
        }

        try {
          const [rolesResponse, projectsResponse] = await Promise.all([
            getAssignableRoles(),
            getProjects({ status: "ACTIVE" }),
          ]);

          if (isMounted) {
            setAssignableRoles(rolesResponse);
            setAssignableProjects(projectsResponse);
            setSelectedProjectRoleId(rolesResponse[0]?.id ?? "");
            setCanAdministerUser(true);
          }
        } catch (caughtError) {
          if (!isMounted) {
            return;
          }

          setAssignableRoles([]);
          setAssignableProjects([]);
          setCanAdministerUser(false);

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
              "No tienes permisos suficientes para administrar este usuario.",
            );
          } else {
            setRolesCatalogError(
              caughtError instanceof ApiClientError
                ? caughtError.message
                : "No fue posible cargar los catálogos administrativos.",
            );
          }
        } finally {
          if (isMounted) {
            setIsLoadingAdminCatalogs(false);
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

  const availableProjects = useMemo(() => {
    if (!user) {
      return [];
    }

    const assignedProjectIds = new Set(user.projects.map((project) => project.id));

    return assignableProjects.filter(
      (project) => !assignedProjectIds.has(project.id),
    );
  }, [assignableProjects, user]);

  async function persistRoleKeys(
    nextRoleKeys: Set<string>,
    options: {
      successMessage: string;
      setSaving: (isSaving: boolean) => void;
      setError: (message: string | null) => void;
      setSuccess: (message: string | null) => void;
    },
  ) {
    if (!user || !canRunAdminActions) {
      return;
    }

    options.setSaving(true);
    options.setError(null);
    options.setSuccess(null);

    try {
      const nextAssignments = [...nextRoleKeys]
        .map(parseRoleKey)
        .filter(
          (assignment): assignment is { projectId: string; roleId: string } =>
            assignment !== null,
        );
      const updatedUser = await updateUserRoles(user.id, nextAssignments);

      setUser(updatedUser);
      setSelectedRoleKeys(new Set(updatedUser.roles.map(getRoleKey)));
      setSelectedProjectId("");
      options.setSuccess(options.successMessage);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        options.setError("No tienes permisos suficientes para esta acción.");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 404) {
        options.setError("Usuario, proyecto o rol no encontrado.");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 409) {
        options.setError(caughtError.message);
        return;
      }

      options.setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible completar la acción.",
      );
    } finally {
      options.setSaving(false);
    }
  }

  async function handleSaveRoles() {
    if (!user || !canRunAdminActions) {
      return;
    }

    const confirmed = window.confirm(
      "¿Deseas guardar los cambios de roles visibles para este usuario?",
    );

    if (!confirmed) {
      return;
    }

    await persistRoleKeys(selectedRoleKeys, {
      successMessage: "Roles actualizados correctamente.",
      setSaving: setIsSavingRoles,
      setError: setRolesError,
      setSuccess: setRolesSuccess,
    });
  }

  function handleToggleRole(roleKey: string) {
    if (!canRunAdminActions) {
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

  async function handleAssignProject() {
    if (
      !user ||
      !canRunAdminActions ||
      !selectedProjectId ||
      !selectedProjectRoleId
    ) {
      setProjectsError("Selecciona un proyecto y un rol inicial.");
      return;
    }

    const project = assignableProjects.find(
      (candidate) => candidate.id === selectedProjectId,
    );
    const role = assignableRoles.find(
      (candidate) => candidate.id === selectedProjectRoleId,
    );
    const confirmed = window.confirm(
      `¿Deseas asociar a este usuario al proyecto ${project?.name ?? "seleccionado"} con el rol ${role?.name ?? "seleccionado"}?`,
    );

    if (!confirmed) {
      return;
    }

    const nextKeys = new Set(selectedRoleKeys);
    nextKeys.add(`${selectedProjectId}:${selectedProjectRoleId}`);

    await persistRoleKeys(nextKeys, {
      successMessage: "Proyecto asociado correctamente.",
      setSaving: setIsSavingProjects,
      setError: setProjectsError,
      setSuccess: setProjectsSuccess,
    });
  }

  async function handleRemoveProject(project: UserProject) {
    if (!user || !canRunAdminActions) {
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas remover a este usuario del proyecto ${project.name}? Se quitarán sus roles visibles en ese proyecto.`,
    );

    if (!confirmed) {
      return;
    }

    const nextKeys = new Set(
      [...selectedRoleKeys].filter((roleKey) => {
        const assignment = parseRoleKey(roleKey);

        return assignment?.projectId !== project.id;
      }),
    );

    await persistRoleKeys(nextKeys, {
      successMessage: "Proyecto removido correctamente.",
      setSaving: setIsSavingProjects,
      setError: setProjectsError,
      setSuccess: setProjectsSuccess,
    });
  }

  async function handleInvalidateSessions() {
    if (!user || !canRunAdminActions || isInvalidatingSessions) {
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que deseas invalidar todas las sesiones de este usuario? Esta acción cerrará sus sesiones activas.",
    );

    if (!confirmed) {
      return;
    }

    setIsInvalidatingSessions(true);
    setSessionsError(null);
    setSessionsSuccess(null);

    try {
      const updatedUser = await invalidateUserSessions(user.id);

      setUser(updatedUser);
      setSessionsSuccess("Sesiones invalidadas correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setSessionsError("No tienes permisos para invalidar sesiones.");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 404) {
        setSessionsError("Usuario no encontrado.");
        return;
      }

      setSessionsError("No se pudieron invalidar las sesiones.");
    } finally {
      setIsInvalidatingSessions(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !canRunAdminActions || isResettingPassword) {
      return;
    }

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setPasswordError("La confirmacion de contraseña no coincide.");
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que deseas resetear la contraseña de este usuario? Sus sesiones activas serán invalidadas.",
    );

    if (!confirmed) {
      return;
    }

    setIsResettingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const updatedUser = await resetUserPassword(user.id, resetPasswordForm);

      setUser(updatedUser);
      setResetPasswordForm({ newPassword: "", confirmPassword: "" });
      setPasswordSuccess(
        "Contraseña reseteada correctamente. Las sesiones activas fueron invalidadas.",
      );
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        logout();
        router.replace("/login");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setPasswordError("No tienes permisos para resetear contraseñas.");
        return;
      }

      if (caughtError instanceof ApiClientError && caughtError.status === 404) {
        setPasswordError(
          "No se encontró el usuario o no tienes alcance para modificarlo.",
        );
        return;
      }

      setPasswordError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible resetear la contraseña.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header dashboard-header">
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Detalle de usuario</h1>
            <p className="muted">
              Información operativa de usuario, roles, organizaciones y
              proyectos asociados.
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
                <InfoLine label="Activo" value={user.isActive ? "Sí" : "No"} />
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
                  <h2>Roles asignados</h2>
                  <p className="muted">Roles activos por proyecto visible.</p>
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
                      {role.name} · {role.projectName}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Organizaciones asociadas</h2>
                  <p className="muted">
                    Organizaciones derivadas de sus proyectos activos.
                  </p>
                </div>
              </div>
              {user.organizations.length === 0 ? (
                <div className="empty-state">
                  <p className="muted">
                    Sin organizaciones visibles para este usuario.
                  </p>
                </div>
              ) : (
                <div className="users-chip-list">
                  {user.organizations.map((organization) => (
                    <span className="badge" key={organization.id}>
                      {organization.name}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Proyectos asociados</h2>
                  <p className="muted">
                    Proyectos activos visibles para tu alcance actual.
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
                      {canRunAdminActions ? (
                        <button
                          className="button secondary"
                          disabled={isSavingProjects}
                          onClick={() => handleRemoveProject(project)}
                          type="button"
                        >
                          Remover proyecto
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Acciones administrativas disponibles</h2>
                  <p className="muted">
                    Las acciones se limitan a tu alcance y el backend conserva
                    las reglas RBAC.
                  </p>
                </div>
              </div>

              {isLoadingAdminCatalogs ? (
                <div className="audit-state">
                  <span className="audit-state-icon">...</span>
                  <div>
                    <strong>Cargando catálogos administrativos</strong>
                    <p className="muted">
                      Estamos consultando roles y proyectos disponibles.
                    </p>
                  </div>
                </div>
              ) : null}

              {!canRunAdminActions && !isLoadingAdminCatalogs ? (
                <div className="audit-state audit-state-error">
                  <span className="audit-state-icon">!</span>
                  <div>
                    <strong>Modo solo lectura</strong>
                    <p className="muted">
                      Tu usuario no tiene permisos administrativos suficientes
                      para modificar roles, proyectos o sesiones.
                    </p>
                  </div>
                </div>
              ) : null}

              {rolesCatalogError ? (
                <p className="form-error">{rolesCatalogError}</p>
              ) : null}
            </section>

            {canRunAdminActions ? (
              <>
                <section className="dashboard-section">
                  <div className="section-heading">
                    <div>
                      <h2>Administración de roles</h2>
                      <p className="muted">
                        Asigna o remueve roles permitidos en proyectos dentro de
                        tu alcance.
                      </p>
                    </div>
                  </div>

                  {rolesError ? <p className="form-error">{rolesError}</p> : null}
                  {rolesSuccess ? (
                    <p className="form-success">{rolesSuccess}</p>
                  ) : null}

                  {assignableRoles.length === 0 ? (
                    <div className="empty-state">
                      <p className="muted">
                        No hay roles asignables disponibles para tu alcance
                        actual.
                      </p>
                    </div>
                  ) : (
                    <RoleAssignmentMatrix
                      assignableRoles={assignableRoles}
                      disabled={!canRunAdminActions || isSavingRoles}
                      onToggleRole={handleToggleRole}
                      projects={user.projects}
                      selectedRoleKeys={selectedRoleKeys}
                    />
                  )}

                  <div className="toolbar">
                    <button
                      className="button"
                      disabled={
                        !hasRoleChanges(user.roles, selectedRoleKeys) ||
                        isSavingRoles
                      }
                      onClick={handleSaveRoles}
                      type="button"
                    >
                      {isSavingRoles ? "Guardando..." : "Guardar roles"}
                    </button>
                    <button
                      className="button secondary"
                      disabled={
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
                      <h2>Administración de proyectos</h2>
                      <p className="muted">
                        Asocia un proyecto con un rol inicial o remueve todos los
                        roles visibles de un proyecto.
                      </p>
                    </div>
                  </div>

                  {projectsError ? (
                    <p className="form-error">{projectsError}</p>
                  ) : null}
                  {projectsSuccess ? (
                    <p className="form-success">{projectsSuccess}</p>
                  ) : null}

                  <div className="users-admin-form">
                    <label>
                      <span>Proyecto</span>
                      <select
                        disabled={isSavingProjects || availableProjects.length === 0}
                        onChange={(event) =>
                          setSelectedProjectId(event.target.value)
                        }
                        value={selectedProjectId}
                      >
                        <option value="">Selecciona un proyecto</option>
                        {availableProjects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.code} · {project.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Rol inicial</span>
                      <select
                        disabled={isSavingProjects || assignableRoles.length === 0}
                        onChange={(event) =>
                          setSelectedProjectRoleId(event.target.value)
                        }
                        value={selectedProjectRoleId}
                      >
                        {assignableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button"
                      disabled={
                        isSavingProjects ||
                        !selectedProjectId ||
                        !selectedProjectRoleId
                      }
                      onClick={handleAssignProject}
                      type="button"
                    >
                      {isSavingProjects ? "Guardando..." : "Asociar proyecto"}
                    </button>
                  </div>

                  {availableProjects.length === 0 ? (
                    <div className="empty-state">
                      <p className="muted">
                        No hay proyectos adicionales disponibles para asociar.
                      </p>
                    </div>
                  ) : null}
                </section>

                <section className="dashboard-section">
                  <div className="section-heading">
                    <div>
                      <h2>Resetear contraseña</h2>
                      <p className="muted">
                        Define una contraseña temporal segura. El usuario deberá
                        iniciar sesión nuevamente.
                      </p>
                    </div>
                  </div>

                  {passwordError ? (
                    <p className="form-error">{passwordError}</p>
                  ) : null}
                  {passwordSuccess ? (
                    <p className="form-success">{passwordSuccess}</p>
                  ) : null}

                  <form className="users-admin-form" onSubmit={handleResetPassword}>
                    <label>
                      <span>Nueva contraseña</span>
                      <input
                        autoComplete="new-password"
                        disabled={isResettingPassword}
                        onChange={(event) =>
                          setResetPasswordForm((current) => ({
                            ...current,
                            newPassword: event.target.value,
                          }))
                        }
                        type="password"
                        value={resetPasswordForm.newPassword}
                      />
                    </label>
                    <label>
                      <span>Confirmar contraseña</span>
                      <input
                        autoComplete="new-password"
                        disabled={isResettingPassword}
                        onChange={(event) =>
                          setResetPasswordForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        type="password"
                        value={resetPasswordForm.confirmPassword}
                      />
                    </label>
                    <button
                      className="button secondary"
                      disabled={
                        isResettingPassword ||
                        !resetPasswordForm.newPassword ||
                        !resetPasswordForm.confirmPassword
                      }
                      type="submit"
                    >
                      {isResettingPassword
                        ? "Reseteando..."
                        : "Resetear contraseña"}
                    </button>
                  </form>
                </section>

                <section className="dashboard-section">
                  <div className="section-heading">
                    <div>
                      <h2>Administración de sesiones</h2>
                      <p className="muted">
                        Cierra todas las sesiones activas de este usuario.
                        Deberá iniciar sesión nuevamente.
                      </p>
                    </div>
                  </div>

                  {sessionsError ? (
                    <p className="form-error">{sessionsError}</p>
                  ) : null}
                  {sessionsSuccess ? (
                    <p className="form-success">{sessionsSuccess}</p>
                  ) : null}

                  <div className="toolbar">
                    <button
                      className="button secondary"
                      disabled={isInvalidatingSessions}
                      onClick={handleInvalidateSessions}
                      type="button"
                    >
                      {isInvalidatingSessions
                        ? "Invalidando..."
                        : "Invalidar sesiones"}
                    </button>
                  </div>
                </section>
              </>
            ) : null}
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
                      {role.code} · {formatPermissionSummary(role.permissions)}
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
    BLOCKED: "Bloqueado",
    PENDING_ACTIVATION: "Pendiente de activación",
  };

  return labels[status] ?? status;
}

function formatOrganizations(user: UserRead) {
  if (user.organizations.length === 0) {
    return "Sin organización";
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
