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
            : "Unable to load daily logs.";

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
            <p className="eyebrow">Daily Logs</p>
            <h1>Daily log register</h1>
            <p className="muted">
              Review daily logs for the selected project.
            </p>
          </div>
          <Link className="button secondary" href="/projects">
            Back to projects
          </Link>
        </div>

        {hasCheckedProjectId && !projectId ? (
          <div className="panel">
            <h2>Select a project first</h2>
            <p className="muted">
              Daily logs are shown in the context of a project. Go back to projects and choose one.
            </p>
            <Link className="button" href="/projects">
              Select project
            </Link>
          </div>
        ) : null}

        {projectId && isLoading ? (
          <div className="panel">
            <p className="muted">Loading daily logs...</p>
          </div>
        ) : null}

        {projectId && error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {projectId && !isLoading && !error && dailyLogs.length === 0 ? (
          <div className="panel">
            <h2>No daily logs found</h2>
            <p className="muted">
              This project does not have daily logs yet.
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
                <h2>{dailyLog.comments || `Daily log ${formatDate(dailyLog.logDate)}`}</h2>
                <p className="muted">
                  Project daily log ready for detail review.
                </p>
                <Link className="button" href={`/daily-logs/${dailyLog.id}`}>
                  View details
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
