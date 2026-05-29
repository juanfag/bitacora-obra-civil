"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  ApiClientError,
  ControlledDocument,
  DocumentStatus,
  DocumentType,
  ProjectSummary,
  deleteDocument,
  downloadDocument,
  getDocuments,
  getProject,
  updateDocument,
  uploadDocument,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: "PLANO", label: "Plano" },
  { value: "SOLICITUD_SUSPENSION", label: "Solicitud de suspension" },
  { value: "DENUNCIA", label: "Denuncia" },
  { value: "DEMANDA", label: "Demanda" },
  { value: "ACTA", label: "Acta" },
  { value: "SOPORTE_FOTOGRAFICO", label: "Soporte fotografico" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "OTRO", label: "Otro" },
];

const documentStatuses: Array<{ value: DocumentStatus; label: string }> = [
  { value: "ACTIVE", label: "Activo" },
  { value: "ARCHIVED", label: "Archivado" },
  { value: "DELETED", label: "Eliminado" },
];

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const maxFileSizeBytes = 10 * 1024 * 1024;

type FormState = {
  type: DocumentType;
  title: string;
  description: string;
  metadata: string;
  file: File | null;
};

type EditState = {
  id: string;
  title: string;
  description: string;
  type: DocumentType;
  status: DocumentStatus;
};

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [typeFilter, setTypeFilter] = useState<DocumentType | "">("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "">("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [canCreate, setCanCreate] = useState(true);
  const [canUpdate, setCanUpdate] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [formState, setFormState] = useState<FormState>({
    type: "OTRO",
    title: "",
    description: "",
    metadata: "",
    file: null,
  });

  const pageTitle = useMemo(() => {
    if (project?.code && project?.name) {
      return `${project.code} - ${project.name}`;
    }

    return project?.name ?? "Proyecto";
  }, [project]);

  useEffect(() => {
    void loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, typeFilter, statusFilter]);

  async function loadDocuments() {
    if (!projectId) {
      setError("Proyecto no disponible.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActionError(null);

    try {
      const [projectResponse, documentsResponse] = await Promise.all([
        getProject(projectId),
        getDocuments({
          projectId,
          type: typeFilter,
          status: statusFilter,
          limit: 100,
        }),
      ]);

      setProject(projectResponse);
      setDocuments(documentsResponse.items);
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible cargar los documentos.",
        setMessage: setError,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadError(null);

    if (!file) {
      setFormState((current) => ({ ...current, file: null }));
      return;
    }

    if (!allowedMimeTypes.includes(file.type)) {
      setUploadError("El tipo de archivo no esta permitido.");
      event.target.value = "";
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setUploadError("El archivo supera el limite de 10 MB.");
      event.target.value = "";
      return;
    }

    setFormState((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
    }));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectId || !formState.file) {
      setUploadError("Selecciona un archivo para cargar.");
      return;
    }

    if (!formState.title.trim()) {
      setUploadError("El titulo es obligatorio.");
      return;
    }

    if (formState.metadata.trim()) {
      try {
        JSON.parse(formState.metadata);
      } catch {
        setUploadError("La metadata debe ser JSON valido.");
        return;
      }
    }

    const body = new FormData();
    body.append("projectId", projectId);
    body.append("type", formState.type);
    body.append("title", formState.title.trim());
    body.append("file", formState.file);

    if (formState.description.trim()) {
      body.append("description", formState.description.trim());
    }

    if (formState.metadata.trim()) {
      body.append("metadata", formState.metadata.trim());
    }

    setIsUploading(true);
    setUploadError(null);
    setSuccess(null);

    try {
      await uploadDocument(body);
      setFormState({
        type: "OTRO",
        title: "",
        description: "",
        metadata: "",
        file: null,
      });
      setSuccess("Documento cargado correctamente.");
      await loadDocuments();
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setCanCreate(false);
        setUploadError("No tienes permisos para cargar documentos.");
        return;
      }

      handleApiError(caughtError, {
        fallback: "No fue posible cargar el documento.",
        setMessage: setUploadError,
      });
    } finally {
      setIsUploading(false);
    }
  }

  function startEdit(document: ControlledDocument) {
    setEditError(null);
    setEditState({
      id: document.id,
      title: document.title,
      description: document.description ?? "",
      type: document.type,
      status: document.status,
    });
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editState) {
      return;
    }

    if (!editState.title.trim()) {
      setEditError("El titulo es obligatorio.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    setSuccess(null);

    try {
      await updateDocument(editState.id, {
        title: editState.title.trim(),
        description: editState.description.trim() || null,
        type: editState.type,
        status: editState.status,
      });
      setEditState(null);
      setSuccess("Documento actualizado correctamente.");
      await loadDocuments();
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setCanUpdate(false);
        setEditError("No tienes permisos para editar documentos.");
        return;
      }

      handleApiError(caughtError, {
        fallback: "No fue posible actualizar el documento.",
        setMessage: setEditError,
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDownload(document: ControlledDocument) {
    setActiveDownloadId(document.id);
    setActionError(null);

    try {
      const response = await downloadDocument(document.id);
      const url = URL.createObjectURL(response.blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = response.fileName ?? document.fileName ?? "documento";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible descargar el documento.",
        setMessage: setActionError,
      });
    } finally {
      setActiveDownloadId(null);
    }
  }

  async function handleDelete(document: ControlledDocument) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el documento "${document.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActiveDeleteId(document.id);
    setActionError(null);
    setSuccess(null);

    try {
      await deleteDocument(document.id);
      setSuccess("Documento eliminado correctamente.");
      await loadDocuments();
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 403) {
        setCanDelete(false);
        setActionError("No tienes permisos para eliminar documentos.");
        return;
      }

      handleApiError(caughtError, {
        fallback: "No fue posible eliminar el documento.",
        setMessage: setActionError,
      });
    } finally {
      setActiveDeleteId(null);
    }
  }

  function handleApiError(
    caughtError: unknown,
    options: { fallback: string; setMessage: (message: string) => void },
  ) {
    if (caughtError instanceof ApiClientError && caughtError.status === 401) {
      logout();
      router.replace("/login");
      return;
    }

    if (caughtError instanceof ApiClientError && caughtError.status === 403) {
      options.setMessage("No tienes permisos para acceder a estos documentos.");
      return;
    }

    if (caughtError instanceof ApiClientError && caughtError.status === 404) {
      options.setMessage("Proyecto o documento no encontrado.");
      return;
    }

    options.setMessage(
      caughtError instanceof ApiClientError
        ? caughtError.message
        : options.fallback,
    );
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Control documental</p>
            <h1>Documentos del proyecto</h1>
            <p className="muted">{pageTitle}</p>
          </div>
          <div className="toolbar">
            <Link className="button secondary" href="/projects">
              Volver a proyectos
            </Link>
            <Link
              className="button secondary"
              href={`/daily-logs?projectId=${encodeURIComponent(projectId ?? "")}`}
            >
              Ver bitacoras
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="panel">
            <p className="muted">Cargando documentos...</p>
          </div>
        ) : null}

        {error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {!isLoading && !error ? (
          <div className="documents-layout">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Filtros</h2>
                  <p className="muted">
                    Consulta documentos por tipo y estado documental.
                  </p>
                </div>
              </div>
              <div className="documents-filters">
                <label>
                  Tipo
                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as DocumentType | "")
                    }
                  >
                    <option value="">Todos los tipos</option>
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as DocumentStatus | "")
                    }
                  >
                    <option value="">Todos los estados</option>
                    {documentStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTypeFilter("");
                    setStatusFilter("ACTIVE");
                  }}
                  type="button"
                >
                  Limpiar filtros
                </button>
              </div>
            </section>

            {canCreate ? (
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Cargar documento</h2>
                    <p className="muted">
                      PDF, imagen, Word o Excel hasta 10 MB.
                    </p>
                  </div>
                </div>
                <form className="form documents-form" onSubmit={handleUpload}>
                  <div className="field">
                    <label htmlFor="document-file">Archivo</label>
                    <input
                      accept={allowedMimeTypes.join(",")}
                      id="document-file"
                      onChange={handleFileChange}
                      type="file"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="document-type">Tipo</label>
                    <select
                      id="document-type"
                      value={formState.type}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          type: event.target.value as DocumentType,
                        }))
                      }
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="document-title">Titulo</label>
                    <input
                      id="document-title"
                      maxLength={250}
                      value={formState.title}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="document-description">Descripcion</label>
                    <textarea
                      id="document-description"
                      rows={3}
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="document-metadata">Metadata JSON opcional</label>
                    <textarea
                      id="document-metadata"
                      placeholder='{"revision":"A"}'
                      rows={3}
                      value={formState.metadata}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          metadata: event.target.value,
                        }))
                      }
                    />
                  </div>
                  {uploadError ? <p className="form-error">{uploadError}</p> : null}
                  <button className="button" disabled={isUploading} type="submit">
                    {isUploading ? "Cargando..." : "Subir documento"}
                  </button>
                </form>
              </section>
            ) : null}

            <section className="panel documents-list-panel">
              <div className="section-heading">
                <div>
                  <h2>Documentos</h2>
                  <p className="muted">
                    {documents.length} documentos visibles para este proyecto.
                  </p>
                </div>
              </div>

              {success ? <p className="form-success">{success}</p> : null}
              {actionError ? <p className="form-error">{actionError}</p> : null}
              {editError ? <p className="form-error">{editError}</p> : null}

              {documents.length === 0 ? (
                <div className="empty-state">
                  <h3>Sin documentos</h3>
                  <p className="muted">
                    Cuando se carguen documentos del proyecto apareceran aqui.
                  </p>
                </div>
              ) : (
                <div className="documents-list">
                  {documents.map((document) => (
                    <article className="card document-card" key={document.id}>
                      {editState?.id === document.id ? (
                        <form className="form documents-form" onSubmit={handleSaveEdit}>
                          <div className="field">
                            <label>Titulo</label>
                            <input
                              maxLength={250}
                              value={editState.title}
                              onChange={(event) =>
                                setEditState((current) =>
                                  current
                                    ? { ...current, title: event.target.value }
                                    : current,
                                )
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Tipo</label>
                            <select
                              value={editState.type}
                              onChange={(event) =>
                                setEditState((current) =>
                                  current
                                    ? {
                                        ...current,
                                        type: event.target.value as DocumentType,
                                      }
                                    : current,
                                )
                              }
                            >
                              {documentTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Estado</label>
                            <select
                              value={editState.status}
                              onChange={(event) =>
                                setEditState((current) =>
                                  current
                                    ? {
                                        ...current,
                                        status: event.target
                                          .value as DocumentStatus,
                                      }
                                    : current,
                                )
                              }
                            >
                              {documentStatuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>Descripcion</label>
                            <textarea
                              rows={3}
                              value={editState.description}
                              onChange={(event) =>
                                setEditState((current) =>
                                  current
                                    ? {
                                        ...current,
                                        description: event.target.value,
                                      }
                                    : current,
                                )
                              }
                            />
                          </div>
                          <div className="toolbar">
                            <button
                              className="button"
                              disabled={isSavingEdit}
                              type="submit"
                            >
                              {isSavingEdit ? "Guardando..." : "Guardar"}
                            </button>
                            <button
                              className="button secondary"
                              onClick={() => setEditState(null)}
                              type="button"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="document-card-header">
                            <div>
                              <div className="status-row">
                                <span className="badge">
                                  {formatDocumentType(document.type)}
                                </span>
                                <span className="badge">
                                  {formatDocumentStatus(document.status)}
                                </span>
                              </div>
                              <h3>{document.title}</h3>
                              <p className="muted">{document.fileName}</p>
                            </div>
                          </div>
                          {document.description ? <p>{document.description}</p> : null}
                          <p className="muted">
                            {[
                              document.mimeType,
                              formatFileSize(document.sizeBytes),
                              formatDateTime(document.createdAt),
                              document.uploadedBy?.fullName ??
                                document.uploadedBy?.email ??
                                "Usuario no disponible",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="toolbar">
                            <button
                              className="button secondary"
                              disabled={activeDownloadId === document.id}
                              onClick={() => handleDownload(document)}
                              type="button"
                            >
                              {activeDownloadId === document.id
                                ? "Descargando..."
                                : "Descargar"}
                            </button>
                            {canUpdate ? (
                              <button
                                className="button secondary"
                                onClick={() => startEdit(document)}
                                type="button"
                              >
                                Editar
                              </button>
                            ) : null}
                            {canDelete && document.status !== "DELETED" ? (
                              <button
                                className="button secondary"
                                disabled={activeDeleteId === document.id}
                                onClick={() => handleDelete(document)}
                                type="button"
                              >
                                {activeDeleteId === document.id
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </button>
                            ) : null}
                          </div>
                        </>
                      )}
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

function formatDocumentType(type: DocumentType) {
  return documentTypes.find((item) => item.value === type)?.label ?? type;
}

function formatDocumentStatus(status: DocumentStatus) {
  return documentStatuses.find((item) => item.value === status)?.label ?? status;
}

function formatFileSize(value: number | null) {
  if (typeof value !== "number") {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
