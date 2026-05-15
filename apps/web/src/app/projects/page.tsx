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
            : "Unable to load projects.";

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
            <p className="eyebrow">Projects</p>
            <h1>Project workspace</h1>
            <p className="muted">
              Select a project before creating or reviewing daily logs.
            </p>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/daily-logs">
              View daily logs
            </Link>
            <button className="button secondary" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="panel">
            <p className="muted">Loading projects...</p>
          </div>
        ) : null}

        {error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error && projects.length === 0 ? (
          <div className="panel">
            <h2>No projects found</h2>
            <p className="muted">
              There are no projects available for this user yet.
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
                  Review and manage daily logs for this project.
                </p>
                <Link className="button" href={`/daily-logs?projectId=${project.id}`}>
                  View daily logs
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}
