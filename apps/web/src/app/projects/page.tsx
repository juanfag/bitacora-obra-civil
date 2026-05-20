"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";

type Project = {
  id: string;
  code?: string | null;
  name: string;
  status?: string | null;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<Project[]>("/projects");

        if (isMounted) {
          setProjects(response);
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

        const message =
          caughtError instanceof ApiClientError
            ? caughtError.message
            : "No fue posible cargar los proyectos.";

        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Proyectos</p>
            <h1>Espacio de proyectos</h1>
            <p className="muted">
              Selecciona un proyecto antes de crear o revisar bitacoras.
            </p>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/daily-logs">
              Ver bitacoras
            </Link>
            <button className="button secondary" onClick={handleLogout} type="button">
              Cerrar sesion
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="panel">
            <p className="muted">Cargando...</p>
          </div>
        ) : null}

        {error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && projects.length === 0 ? (
          <div className="panel">
            <h2>No hay proyectos</h2>
            <p className="muted">
              No hay proyectos disponibles para este usuario.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && projects.length > 0 ? (
          <div className="grid">
            {projects.map((project) => (
              <article className="card" key={project.id}>
                <div className="status-row">
                  {project.status ? <span className="badge">{project.status}</span> : null}
                  {project.code ? <span className="badge">{project.code}</span> : null}
                </div>
                <h2>{project.name}</h2>
                <p className="muted">
                  Revisa y gestiona las bitacoras de este proyecto.
                </p>
                <Link className="button" href={`/daily-logs?projectId=${project.id}`}>
                  Ver bitacoras
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}
