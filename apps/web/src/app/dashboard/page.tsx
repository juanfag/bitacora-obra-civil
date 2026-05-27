"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  ApiClientError,
  DashboardMetrics,
  DashboardRecentActivityItem,
  apiRequest,
  getDashboardMetrics,
  getDashboardRecentActivity,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";

type Project = {
  id: string;
  code?: string | null;
  name: string;
  status?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    DashboardRecentActivityItem[]
  >([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      setMetrics(null);
      setRecentActivity([]);

      try {
        const [metricsResponse, projectsResponse, recentActivityResponse] =
          await Promise.all([
            getDashboardMetrics(),
            apiRequest<Project[]>("/projects"),
            getDashboardRecentActivity(20),
          ]);

        if (!isMounted) {
          return;
        }

        setMetrics(metricsResponse);
        setProjects(projectsResponse);
        setRecentActivity(recentActivityResponse.items);
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
            : "No fue posible cargar el dashboard.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const firstActiveProject =
    projects.find((project) => isActiveProject(project)) ?? projects[0] ?? null;
  const createDailyLogHref = firstActiveProject
    ? `/daily-logs/new?projectId=${encodeURIComponent(firstActiveProject.id)}`
    : "/projects";

  return (
    <AuthGuard>
      <section>
        <div className="page-header dashboard-header">
          <div>
            <p className="eyebrow">Vista general</p>
            <h1>Dashboard ejecutivo</h1>
            <p className="muted">
              Resumen general de proyectos y bitácoras.
            </p>
          </div>
          <div className="toolbar">
            <Link className="button" href="/projects">
              Ver proyectos
            </Link>
            <Link className="button secondary" href="/daily-logs">
              Ver bitácoras
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="dashboard-state">
            <strong>Cargando resumen ejecutivo</strong>
            <p className="muted">
              Estamos consultando proyectos, bitácoras y actividad reciente.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="dashboard-state dashboard-state-error">
            <strong>No fue posible cargar el dashboard</strong>
            <p className="muted">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="dashboard-layout">
            <section aria-label="Indicadores principales" className="kpi-grid">
              <KpiCard
                label="Proyectos activos"
                tone="primary"
                value={metrics?.activeProjects ?? 0}
              />
              <KpiCard
                label="Bitácoras abiertas"
                tone="info"
                value={metrics?.openDailyLogs ?? 0}
              />
              <KpiCard
                label="Pendientes de aprobación"
                tone="warning"
                value={metrics?.pendingApprovalDailyLogs ?? 0}
              />
              <KpiCard
                label="Bitácoras cerradas"
                tone="success"
                value={metrics?.closedDailyLogs ?? 0}
              />
              <KpiCard
                label="Eventos registrados"
                tone="neutral"
                value={metrics?.totalEvents ?? 0}
              />
              <KpiCard
                label="Usuarios activos"
                tone="neutral"
                value={metrics?.totalActiveUsers ?? 0}
              />
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Accesos rápidos</h2>
                  <p className="muted">
                    Atajos para las acciones operativas más frecuentes.
                  </p>
                </div>
              </div>
              <div className="quick-actions-grid">
                <QuickActionCard
                  description="Consulta el portafolio y entra a sus bitácoras."
                  href="/projects"
                  title="Ver proyectos"
                />
                <QuickActionCard
                  description="Revisa bitácoras dentro del contexto de proyecto."
                  href="/daily-logs"
                  title="Ver bitácoras"
                />
                <QuickActionCard
                  description="Registra un nuevo proyecto de obra."
                  href="/projects/new"
                  title="Crear proyecto"
                />
                <QuickActionCard
                  description={
                    firstActiveProject
                      ? `Crear bitácora para ${firstActiveProject.name}.`
                      : "Primero crea o selecciona un proyecto."
                  }
                  href={createDailyLogHref}
                  title="Crear bitácora diaria"
                />
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <h2>Actividad reciente</h2>
                  <p className="muted">
                    Últimos movimientos relevantes para seguimiento ejecutivo.
                  </p>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <h3>Sin actividad reciente</h3>
                  <p className="muted">
                    Cuando existan bitácoras, firmas, PDFs o eventos, aparecerán
                    aquí como una lista de seguimiento.
                  </p>
                </div>
              ) : (
                <div className="dashboard-activity-list">
                  {recentActivity.map((activity) => (
                    <article
                      className="dashboard-activity-item"
                      key={`${activity.type}-${activity.id}`}
                    >
                      <div>
                        <div className="status-row">
                          <span className="badge">
                            {formatActivityType(activity.type)}
                          </span>
                          <span className="badge">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                        <h3>{activity.title}</h3>
                        <p>{activity.description}</p>
                        <p className="muted">
                          {activity.projectName ?? "Proyecto no disponible"}
                          {" · "}
                          {activity.userName ?? "Usuario no disponible"}
                        </p>
                      </div>
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

function KpiCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number | string;
}) {
  return (
    <article className={`kpi-card kpi-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function QuickActionCard({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  return (
    <Link className="quick-action-card" href={href}>
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

function isActiveProject(project: Project) {
  return !project.status || project.status === "ACTIVE";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatActivityType(type: string) {
  const labels: Record<string, string> = {
    DAILY_LOG_APPROVED: "Aprobación",
    DAILY_LOG_CLOSED: "Cierre",
    DAILY_LOG_CREATED: "Bitácora",
    DAILY_LOG_EVENT_REPORTED: "Evento",
    DAILY_LOG_PDF_GENERATED: "PDF",
    DAILY_LOG_REJECTED: "Rechazo",
    DAILY_LOG_SIGNATURE_APPLIED: "Firma",
  };

  return labels[type] ?? "Actividad";
}
