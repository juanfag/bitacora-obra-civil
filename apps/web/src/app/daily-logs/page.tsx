"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";

type DailyLog = {
  id: string;
  projectId: string;
  logDate: string;
  status: string;
  comments?: string | null;
};

type DailyLogsResponse = {
  items: DailyLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function DailyLogsPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hasCheckedProjectId, setHasCheckedProjectId] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const selectedProjectId = new URLSearchParams(window.location.search).get(
      "projectId",
    );

    setProjectId(selectedProjectId);
    setHasCheckedProjectId(true);
  }, []);

  useEffect(() => {
    if (!hasCheckedProjectId) {
      return;
    }

    if (!projectId) {
      setDailyLogs([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const selectedProjectId = projectId;

    async function loadDailyLogs() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiRequest<DailyLogsResponse>(
          `/daily-logs?projectId=${encodeURIComponent(selectedProjectId)}`,
        );

        if (isMounted) {
          setDailyLogs(response.items);
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
            : "No fue posible cargar las bitacoras.";

        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDailyLogs();

    return () => {
      isMounted = false;
    };
  }, [hasCheckedProjectId, projectId, router]);

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Bitacoras</p>
            <h1>Registro de bitacoras</h1>
            <p className="muted">
              Revisa las bitacoras del proyecto seleccionado.
            </p>
          </div>
          <Link className="button secondary" href="/projects">
            Volver a proyectos
          </Link>
        </div>

        {hasCheckedProjectId && !projectId ? (
          <div className="panel">
            <h2>Selecciona un proyecto primero</h2>
            <p className="muted">
              Las bitacoras se muestran dentro del contexto de un proyecto. Vuelve a proyectos y elige uno.
            </p>
            <Link className="button" href="/projects">
              Seleccionar proyecto
            </Link>
          </div>
        ) : null}

        {projectId && isLoading ? (
          <div className="panel">
            <p className="muted">Cargando...</p>
          </div>
        ) : null}

        {projectId && error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {projectId && !isLoading && !error && dailyLogs.length === 0 ? (
          <div className="panel">
            <h2>No hay bitacoras</h2>
            <p className="muted">
              Este proyecto aun no tiene bitacoras.
            </p>
          </div>
        ) : null}

        {projectId && !isLoading && !error && dailyLogs.length > 0 ? (
          <div className="grid">
            {dailyLogs.map((dailyLog) => (
              <article className="card" key={dailyLog.id}>
                <div className="status-row">
                  <span className="badge">{formatDate(dailyLog.logDate)}</span>
                  <span className="badge">{dailyLog.status}</span>
                </div>
                <h2>{dailyLog.comments || `Bitacora ${formatDate(dailyLog.logDate)}`}</h2>
                <p className="muted">
                  Bitacora del proyecto lista para revisar en detalle.
                </p>
                <Link className="button" href={`/daily-logs/${dailyLog.id}`}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
