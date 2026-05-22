"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";
import { DailyLog } from "@/types/daily-log";

export default function NewDailyLogPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hasCheckedProjectId, setHasCheckedProjectId] = useState(false);
  const [logDate, setLogDate] = useState(getTodayForInput());
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const selectedProjectId = new URLSearchParams(window.location.search).get(
      "projectId",
    );

    setProjectId(selectedProjectId);
    setHasCheckedProjectId(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectId) {
      setError("Selecciona un proyecto antes de crear una bitácora.");
      return;
    }

    if (!logDate) {
      setError("Selecciona la fecha de la bitácora.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        projectId,
        logDate,
        comments: comments.trim() || undefined,
      };

      const dailyLog = await apiRequest<DailyLog>("/daily-logs", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.replace(`/daily-logs/${dailyLog.id}`);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        if (caughtError.status === 409) {
          setError(getConflictMessage(caughtError.message));
          return;
        }

        setError(caughtError.message || "No fue posible crear la bitácora.");
        return;
      }

      setError("No fue posible crear la bitácora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Nueva bitácora</p>
            <h1>Crear bitácora diaria</h1>
            <p className="muted">
              Registra una nueva bitácora para el proyecto seleccionado.
            </p>
          </div>
          <Link
            className="button secondary"
            href={projectId ? `/daily-logs?projectId=${projectId}` : "/projects"}
          >
            Volver
          </Link>
        </div>

        {hasCheckedProjectId && !projectId ? (
          <div className="panel">
            <h2>Selecciona un proyecto primero</h2>
            <p className="muted">
              Para crear una bitácora necesitas venir desde el listado de
              bitácoras de un proyecto.
            </p>
            <Link className="button" href="/projects">
              Seleccionar proyecto
            </Link>
          </div>
        ) : null}

        {projectId ? (
          <div className="panel">
            <form className="form" onSubmit={handleSubmit}>
              {error ? <p className="form-error">{error}</p> : null}

              <div className="field">
                <label htmlFor="logDate">Fecha</label>
                <input
                  disabled={isSubmitting}
                  id="logDate"
                  name="logDate"
                  onChange={(event) => setLogDate(event.target.value)}
                  required
                  type="date"
                  value={logDate}
                />
              </div>

              <div className="field">
                <label htmlFor="comments">Comentarios iniciales</label>
                <textarea
                  disabled={isSubmitting}
                  id="comments"
                  name="comments"
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Resumen inicial opcional"
                  rows={5}
                  value={comments}
                />
              </div>

              <button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creando..." : "Crear bitácora"}
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function getTodayForInput() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getConflictMessage(message: string) {
  if (message.includes("already exists")) {
    return "Ya existe una bitácora para este proyecto en la fecha seleccionada.";
  }

  if (message.includes("must be CLOSED")) {
    return "La bitácora del día hábil anterior debe estar cerrada antes de crear una nueva.";
  }

  if (message.includes("must exist")) {
    return "Debe existir y estar cerrada la bitácora del día hábil anterior antes de crear una nueva.";
  }

  return message || "No fue posible crear la bitácora por una regla del flujo.";
}
