"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";

type Organization = {
  id: string;
  name: string;
  nit?: string | null;
};

type Project = {
  id: string;
  name: string;
};

const projectStatuses = ["PLANNED", "ACTIVE", "SUSPENDED", "CLOSED"] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<(typeof projectStatuses)[number]>("PLANNED");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setIsLoadingOrganizations(true);
      setCatalogError(null);

      try {
        const response = await apiRequest<Organization[]>(
          "/organizations?status=ACTIVE",
        );

        if (!isMounted) {
          return;
        }

        setOrganizations(response);
        setOrganizationId((currentValue) => currentValue || response[0]?.id || "");
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        setOrganizations([]);
        setCatalogError(
          "No fue posible cargar organizaciones. Ingresa el ID de organización manualmente.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingOrganizations(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId.trim()) {
      setError("Selecciona o ingresa la organización del proyecto.");
      return;
    }

    if (!code.trim()) {
      setError("Ingresa el código del proyecto.");
      return;
    }

    if (!name.trim()) {
      setError("Ingresa el nombre del proyecto.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const project = await apiRequest<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          organizationId: organizationId.trim(),
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          status,
        }),
      });

      router.replace(`/daily-logs?projectId=${project.id}`);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        if (caughtError.status === 409) {
          setError("Ya existe un proyecto con ese código en la organización.");
          return;
        }

        setError(caughtError.message || "No fue posible crear el proyecto.");
        return;
      }

      setError("No fue posible crear el proyecto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Nuevo proyecto</p>
            <h1>Crear proyecto</h1>
            <p className="muted">
              Registra un proyecto para empezar a gestionar sus bitácoras.
            </p>
          </div>
          <Link className="button secondary" href="/projects">
            Volver
          </Link>
        </div>

        <div className="panel">
          <form className="form" onSubmit={handleSubmit}>
            {error ? <p className="form-error">{error}</p> : null}
            {catalogError ? <p className="form-error">{catalogError}</p> : null}

            <div className="field">
              <label htmlFor="organizationId">Organización</label>
              {organizations.length > 0 ? (
                <select
                  disabled={isSubmitting || isLoadingOrganizations}
                  id="organizationId"
                  name="organizationId"
                  onChange={(event) => setOrganizationId(event.target.value)}
                  required
                  value={organizationId}
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.nit
                        ? `${organization.name} (${organization.nit})`
                        : organization.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  disabled={isSubmitting}
                  id="organizationId"
                  name="organizationId"
                  onChange={(event) => setOrganizationId(event.target.value)}
                  placeholder="ID de organización"
                  required
                  value={organizationId}
                />
              )}
            </div>

            <div className="field">
              <label htmlFor="code">Código</label>
              <input
                disabled={isSubmitting}
                id="code"
                name="code"
                onChange={(event) => setCode(event.target.value)}
                placeholder="PROY-001"
                required
                value={code}
              />
            </div>

            <div className="field">
              <label htmlFor="name">Nombre del proyecto</label>
              <input
                disabled={isSubmitting}
                id="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </div>

            <div className="field">
              <label htmlFor="description">Descripción</label>
              <textarea
                disabled={isSubmitting}
                id="description"
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descripción opcional"
                rows={4}
                value={description}
              />
            </div>

            <div className="field">
              <label htmlFor="location">Ubicación</label>
              <input
                disabled={isSubmitting}
                id="location"
                name="location"
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ciudad, país"
                value={location}
              />
            </div>

            <div className="field">
              <label htmlFor="status">Estado</label>
              <select
                disabled={isSubmitting}
                id="status"
                name="status"
                onChange={(event) =>
                  setStatus(event.target.value as (typeof projectStatuses)[number])
                }
                value={status}
              >
                <option value="PLANNED">Planeado</option>
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>

            <button disabled={isSubmitting || isLoadingOrganizations} type="submit">
              {isSubmitting ? "Creando..." : "Crear proyecto"}
            </button>
          </form>
        </div>
      </section>
    </AuthGuard>
  );
}
