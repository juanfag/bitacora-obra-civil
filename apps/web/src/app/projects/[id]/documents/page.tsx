"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import {
  ApiClientError,
  ControlledDocument,
  DocumentCategory,
  DocumentStatus,
  DocumentType,
  DocumentVersion,
  DocumentVisibility,
  ProjectSummary,
  createDocument,
  deleteDocument,
  downloadDocument,
  downloadDocumentVersion,
  getDocument,
  getDocumentCategories,
  getDocumentVersions,
  getDocuments,
  getProject,
  updateDocument,
  uploadDocument,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";
import { useCurrentPermissions } from "@/lib/use-current-permissions";

const documentStatuses: Array<{ value: DocumentStatus; label: string }> = [
  { value: "DRAFT", label: "Borrador" },
  { value: "ACTIVE", label: "Activo" },
  { value: "IN_REVIEW", label: "En revision" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "REJECTED", label: "Rechazado" },
  { value: "ARCHIVED", label: "Archivado" },
  { value: "SUPERSEDED", label: "Reemplazado" },
  { value: "DELETED", label: "Eliminado" },
];

const documentVisibilities: Array<{
  value: DocumentVisibility;
  label: string;
}> = [
  { value: "PRIVATE", label: "Privado" },
  { value: "PROJECT", label: "Proyecto" },
  { value: "ORGANIZATION", label: "Organizacion" },
  { value: "PUBLIC_VERIFICATION", label: "Verificacion publica" },
  { value: "RESTRICTED", label: "Restringido" },
];

const allowedUploadMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxUploadSizeBytes = 10 * 1024 * 1024;

type DocumentFormState = {
  title: string;
  code: string;
  categoryId: string;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  description: string;
};

type EditState = DocumentFormState & {
  id: string;
};

const emptyFormState: DocumentFormState = {
  title: "",
  code: "",
  categoryId: "",
  status: "ACTIVE",
  visibility: "PROJECT",
  description: "",
};

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const permissions = useCurrentPermissions();
  const canCreateDocument = permissions.can("documents:create");
  const canUpdateDocument = permissions.can("documents:update");
  const canDeleteDocument = permissions.can("documents:delete");
  const canDownloadDocument = permissions.can("documents:download");

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<ControlledDocument[]>([]);
  const [versionsByDocumentId, setVersionsByDocumentId] = useState<
    Record<string, DocumentVersion[]>
  >({});
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "">("ACTIVE");
  const [visibilityFilter, setVisibilityFilter] = useState<DocumentVisibility | "">(
    "",
  );
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState<DocumentFormState>(emptyFormState);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [uploadDocumentId, setUploadDocumentId] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeVersionDownloadId, setActiveVersionDownloadId] = useState<
    string | null
  >(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const projectTitle = useMemo(() => {
    if (project?.code && project.name) {
      return `${project.code} - ${project.name}`;
    }

    return project?.name ?? "Proyecto";
  }, [project]);

  const visibleCategories = useMemo(() => {
    return categories.filter(
      (category) => !category.projectId || category.projectId === projectId,
    );
  }, [categories, projectId]);

  useEffect(() => {
    void loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, categoryFilter, statusFilter, visibilityFilter, search]);

  async function loadLibrary() {
    if (!projectId) {
      setError("Proyecto no disponible.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActionError(null);

    try {
      const [projectResponse, categoriesResponse, documentsResponse] =
        await Promise.all([
          getProject(projectId),
          getDocumentCategories(),
          getDocuments({
            projectId,
            categoryId: categoryFilter,
            status: statusFilter,
            visibility: visibilityFilter,
            search,
            limit: 100,
          }),
        ]);

      setProject(projectResponse);
      setCategories(categoriesResponse);
      setDocuments(documentsResponse.items);

      const versionEntries = await Promise.all(
        documentsResponse.items.map(async (document) => {
          try {
            return [document.id, await getDocumentVersions(document.id)] as const;
          } catch {
            return [document.id, []] as const;
          }
        }),
      );

      setVersionsByDocumentId(Object.fromEntries(versionEntries));
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible cargar la biblioteca documental.",
        setMessage: setError,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!projectId) {
      setFormError("Proyecto no disponible.");
      return;
    }

    if (!formState.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      await createDocument({
        projectId,
        categoryId: formState.categoryId || undefined,
        code: formState.code.trim() || undefined,
        type: getDocumentTypeForCategory(formState.categoryId, visibleCategories),
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        status: formState.status,
        visibility: formState.visibility,
      });
      setFormState(emptyFormState);
      setSuccess("Documento creado correctamente.");
      await loadLibrary();
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible crear el documento.",
        setMessage: setFormError,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function startEdit(document: ControlledDocument) {
    setActionError(null);
    setFormError(null);

    try {
      const detail = await getDocument(document.id);
      setEditState({
        id: detail.id,
        title: detail.title,
        code: detail.code ?? "",
        categoryId: detail.categoryId ?? "",
        status: detail.status,
        visibility: detail.visibility,
        description: detail.description ?? "",
      });
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible cargar el documento.",
        setMessage: setActionError,
      });
    }
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editState) {
      return;
    }

    if (!editState.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    setIsSavingEdit(true);
    setFormError(null);
    setSuccess(null);

    try {
      await updateDocument(editState.id, {
        categoryId: editState.categoryId || null,
        code: editState.code.trim() || null,
        type: getDocumentTypeForCategory(editState.categoryId, visibleCategories),
        title: editState.title.trim(),
        description: editState.description.trim() || null,
        status: editState.status,
        visibility: editState.visibility,
      });
      setEditState(null);
      setSuccess("Documento actualizado correctamente.");
      await loadLibrary();
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible actualizar el documento.",
        setMessage: setFormError,
      });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(document: ControlledDocument) {
    const confirmed = window.confirm(
      `Seguro que deseas eliminar el documento "${document.title}"?`,
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
      await loadLibrary();
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible eliminar el documento.",
        setMessage: setActionError,
      });
    } finally {
      setActiveDeleteId(null);
    }
  }

  async function handleDownloadCurrent(document: ControlledDocument) {
    const currentVersion = getCurrentVersion(versionsByDocumentId[document.id] ?? []);

    setActiveDownloadId(document.id);
    setActionError(null);

    try {
      const response = currentVersion
        ? await downloadDocumentVersion(currentVersion.id)
        : await downloadDocument(document.id);
      const url = URL.createObjectURL(response.blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download =
        response.fileName ??
        currentVersion?.originalFileName ??
        currentVersion?.fileName ??
        document.fileName ??
        "documento";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible descargar la version actual.",
        setMessage: setActionError,
      });
    } finally {
      setActiveDownloadId(null);
    }
  }

  async function handleDownloadVersion(version: DocumentVersion) {
    setActiveVersionDownloadId(version.id);
    setActionError(null);

    try {
      const response = await downloadDocumentVersion(version.id);
      const url = URL.createObjectURL(response.blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download =
        response.fileName ??
        version.originalFileName ??
        version.fileName ??
        `documento-v${version.versionNumber}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible descargar la version.",
        setMessage: setActionError,
      });
    } finally {
      setActiveVersionDownloadId(null);
    }
  }

  function startUpload(document: ControlledDocument) {
    setUploadDocumentId((current) => (current === document.id ? null : document.id));
    setSelectedUploadFile(null);
    setUploadError(null);
    setActionError(null);
  }

  function handleUploadFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadError(null);

    if (!file) {
      setSelectedUploadFile(null);
      return;
    }

    const validationError = validateUploadFile(file);

    if (validationError) {
      setSelectedUploadFile(null);
      setUploadError(validationError);
      event.target.value = "";
      return;
    }

    setSelectedUploadFile(file);
  }

  async function handleUploadSubmit(
    event: FormEvent<HTMLFormElement>,
    document: ControlledDocument,
  ) {
    event.preventDefault();

    if (!selectedUploadFile) {
      setUploadError("Selecciona un archivo PDF, JPG o PNG para cargar.");
      return;
    }

    const validationError = validateUploadFile(selectedUploadFile);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const body = new FormData();
    const categoryId = document.categoryId ?? "";

    body.append("file", selectedUploadFile);
    body.append("documentId", document.id);
    body.append("projectId", document.projectId);
    body.append("type", getDocumentTypeForCategory(categoryId, visibleCategories));
    body.append("title", document.title);

    if (document.description) {
      body.append("description", document.description);
    }

    body.append(
      "metadata",
      JSON.stringify({
        source: "document_library_frontend",
        organizationId: document.organizationId,
        categoryId: document.categoryId,
        code: document.code,
      }),
    );

    setActiveUploadId(document.id);
    setUploadError(null);
    setSuccess(null);

    try {
      await uploadDocument(body);
      setUploadDocumentId(null);
      setSelectedUploadFile(null);
      setSuccess("Archivo cargado correctamente. La version actual fue actualizada.");
      await loadLibrary();
      setExpandedVersionId(document.id);
    } catch (caughtError) {
      handleApiError(caughtError, {
        fallback: "No fue posible cargar el archivo.",
        setMessage: setUploadError,
      });
    } finally {
      setActiveUploadId(null);
    }
  }

  function toggleVersions(documentId: string) {
    setExpandedVersionId((current) => (current === documentId ? null : documentId));
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
      options.setMessage("No tienes permisos para realizar esta accion.");
      return;
    }

    if (caughtError instanceof ApiClientError && caughtError.status === 400) {
      options.setMessage(caughtError.message || "La solicitud no es valida.");
      return;
    }

    if (caughtError instanceof ApiClientError && caughtError.status === 404) {
      options.setMessage("Proyecto o documento no encontrado.");
      return;
    }

    if (caughtError instanceof ApiClientError && caughtError.status >= 500) {
      options.setMessage("Error del servidor. Intenta nuevamente mas tarde.");
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
            <h1>Biblioteca documental</h1>
            <p className="muted">{projectTitle}</p>
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
            <p className="muted">Cargando biblioteca documental...</p>
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
                    Busca por titulo, codigo, categoria, estado o visibilidad.
                  </p>
                </div>
              </div>
              <div className="documents-filters documents-filters-wide">
                <label>
                  Busqueda
                  <input
                    placeholder="Titulo, codigo o descripcion"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  Categoria
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">Todas las categorias</option>
                    {visibleCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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
                <label>
                  Visibilidad
                  <select
                    value={visibilityFilter}
                    onChange={(event) =>
                      setVisibilityFilter(
                        event.target.value as DocumentVisibility | "",
                      )
                    }
                  >
                    <option value="">Todas</option>
                    {documentVisibilities.map((visibility) => (
                      <option key={visibility.value} value={visibility.value}>
                        {visibility.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("");
                    setStatusFilter("ACTIVE");
                    setVisibilityFilter("");
                  }}
                  type="button"
                >
                  Limpiar
                </button>
              </div>
            </section>

            {canCreateDocument ? (
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Crear documento</h2>
                    <p className="muted">
                      Registro metadata-only. La carga de archivos queda para la
                      siguiente etapa documental.
                    </p>
                  </div>
                </div>
                <DocumentMetadataForm
                  categories={visibleCategories}
                  error={formError}
                  isSaving={isSaving}
                  onChange={setFormState}
                  onSubmit={handleCreate}
                  state={formState}
                  submitLabel="Crear documento"
                />
              </section>
            ) : null}

            <section className="panel documents-list-panel">
              <div className="section-heading">
                <div>
                  <h2>Documentos</h2>
                  <p className="muted">
                    {documents.length} registros visibles para este proyecto.
                  </p>
                </div>
              </div>

              {success ? <p className="form-success">{success}</p> : null}
              {actionError ? <p className="form-error">{actionError}</p> : null}

              {documents.length === 0 ? (
                <div className="empty-state">
                  <h3>Sin documentos</h3>
                  <p className="muted">
                    Crea registros documentales para iniciar la biblioteca del
                    proyecto.
                  </p>
                </div>
              ) : (
                <div className="documents-table" role="table">
                  <div className="documents-table-row documents-table-head" role="row">
                    <span role="columnheader">Documento</span>
                    <span role="columnheader">Categoria</span>
                    <span role="columnheader">Estado</span>
                    <span role="columnheader">Visibilidad</span>
                    <span role="columnheader">Version</span>
                    <span role="columnheader">Actualizacion</span>
                    <span role="columnheader">Acciones</span>
                  </div>
                  {documents.map((document) => {
                    const versions = versionsByDocumentId[document.id] ?? [];
                    const currentVersion = getCurrentVersion(versions);

                    return (
                      <article
                        className="documents-table-group"
                        key={document.id}
                      >
                        {editState?.id === document.id ? (
                          <div className="documents-edit-row">
                            <DocumentMetadataForm
                              categories={visibleCategories}
                              error={formError}
                              isSaving={isSavingEdit}
                              onCancel={() => setEditState(null)}
                              onChange={(nextState) =>
                                setEditState((current) =>
                                  current ? { ...current, ...nextState } : current,
                                )
                              }
                              onSubmit={handleSaveEdit}
                              state={editState}
                              submitLabel="Guardar cambios"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="documents-table-row" role="row">
                              <span className="document-title-cell" role="cell">
                                <strong>{document.title}</strong>
                                <small>{document.code || "Sin codigo"}</small>
                              </span>
                              <span role="cell">
                                {document.category?.name ?? "Sin categoria"}
                              </span>
                              <span role="cell">
                                <span className="badge">
                                  {formatDocumentStatus(document.status)}
                                </span>
                              </span>
                              <span role="cell">
                                {formatDocumentVisibility(document.visibility)}
                              </span>
                              <span role="cell">
                                <span className="document-version-cell">
                                  <span className="badge">
                                    {currentVersion
                                      ? `V${currentVersion.versionNumber}`
                                      : "Sin archivo"}
                                  </span>
                                  {currentVersion ? (
                                    <small>
                                      {[
                                        currentVersion.originalFileName ??
                                          currentVersion.fileName,
                                        currentVersion.mimeType,
                                        formatFileSize(currentVersion.sizeBytes),
                                        currentVersion.checksumSha256
                                          ? `SHA256 ${currentVersion.checksumSha256.slice(
                                              0,
                                              12,
                                            )}...`
                                          : null,
                                        formatDateTime(currentVersion.createdAt),
                                      ]
                                        .filter(Boolean)
                                        .join(" | ")}
                                    </small>
                                  ) : null}
                                </span>
                              </span>
                              <span role="cell">
                                {formatDateTime(document.updatedAt)}
                              </span>
                              <span className="documents-actions" role="cell">
                                <button
                                  className="button secondary"
                                  onClick={() => toggleVersions(document.id)}
                                  type="button"
                                >
                                  Ver versiones
                                </button>
                                {canCreateDocument ? (
                                  <button
                                    className="button secondary"
                                    disabled={activeUploadId === document.id}
                                    onClick={() => startUpload(document)}
                                    type="button"
                                  >
                                    Cargar archivo
                                  </button>
                                ) : null}
                                {canDownloadDocument ? (
                                  <button
                                    className="button secondary"
                                    disabled={
                                      activeDownloadId === document.id ||
                                      (!currentVersion && !document.mimeType)
                                    }
                                    onClick={() => handleDownloadCurrent(document)}
                                    type="button"
                                  >
                                    {activeDownloadId === document.id
                                      ? "Descargando..."
                                      : "Descargar version actual"}
                                  </button>
                                ) : null}
                                {canUpdateDocument ? (
                                  <button
                                    className="button secondary"
                                    onClick={() => startEdit(document)}
                                    type="button"
                                  >
                                    Editar
                                  </button>
                                ) : null}
                                {canDeleteDocument &&
                                document.status !== "DELETED" ? (
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
                              </span>
                            </div>
                            {expandedVersionId === document.id ? (
                              <VersionPanel
                                activeDownloadId={activeVersionDownloadId}
                                canDownload={canDownloadDocument}
                                currentVersionId={currentVersion?.id ?? null}
                                onDownload={handleDownloadVersion}
                                versions={versions}
                              />
                            ) : null}
                            {uploadDocumentId === document.id ? (
                              <UploadPanel
                                currentVersion={currentVersion}
                                error={uploadError}
                                file={selectedUploadFile}
                                isUploading={activeUploadId === document.id}
                                onCancel={() => {
                                  setUploadDocumentId(null);
                                  setSelectedUploadFile(null);
                                  setUploadError(null);
                                }}
                                onFileChange={handleUploadFileChange}
                                onSubmit={(event) =>
                                  handleUploadSubmit(event, document)
                                }
                              />
                            ) : null}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function DocumentMetadataForm({
  categories,
  error,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
  state,
  submitLabel,
}: {
  categories: DocumentCategory[];
  error: string | null;
  isSaving: boolean;
  onCancel?: () => void;
  onChange: (state: DocumentFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  state: DocumentFormState;
  submitLabel: string;
}) {
  return (
    <form className="form documents-form" onSubmit={onSubmit}>
      <div className="documents-form-grid">
        <div className="field">
          <label htmlFor="document-title">Titulo</label>
          <input
            id="document-title"
            maxLength={250}
            value={state.title}
            onChange={(event) => onChange({ ...state, title: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="document-code">Codigo</label>
          <input
            id="document-code"
            maxLength={80}
            value={state.code}
            onChange={(event) => onChange({ ...state, code: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="document-category">Categoria</label>
          <select
            id="document-category"
            value={state.categoryId}
            onChange={(event) =>
              onChange({ ...state, categoryId: event.target.value })
            }
          >
            <option value="">Sin categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="document-status">Estado</label>
          <select
            id="document-status"
            value={state.status}
            onChange={(event) =>
              onChange({
                ...state,
                status: event.target.value as DocumentStatus,
              })
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
          <label htmlFor="document-visibility">Visibilidad</label>
          <select
            id="document-visibility"
            value={state.visibility}
            onChange={(event) =>
              onChange({
                ...state,
                visibility: event.target.value as DocumentVisibility,
              })
            }
          >
            {documentVisibilities.map((visibility) => (
              <option key={visibility.value} value={visibility.value}>
                {visibility.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field documents-description-field">
          <label htmlFor="document-description">Descripcion</label>
          <textarea
            id="document-description"
            rows={3}
            value={state.description}
            onChange={(event) =>
              onChange({ ...state, description: event.target.value })
            }
          />
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="toolbar">
        <button className="button" disabled={isSaving} type="submit">
          {isSaving ? "Guardando..." : submitLabel}
        </button>
        {onCancel ? (
          <button className="button secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

function UploadPanel({
  currentVersion,
  error,
  file,
  isUploading,
  onCancel,
  onFileChange,
  onSubmit,
}: {
  currentVersion: DocumentVersion | null;
  error: string | null;
  file: File | null;
  isUploading: boolean;
  onCancel: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="documents-upload-panel">
      <form className="form documents-upload-form" onSubmit={onSubmit}>
        <div>
          <h3>Cargar archivo</h3>
          <p className="muted">
            {currentVersion
              ? `Se creara una nueva version posterior a V${currentVersion.versionNumber}.`
              : "Se creara la primera version del documento."}
          </p>
        </div>
        <div className="field">
          <label htmlFor="document-upload-file">Archivo PDF, JPG o PNG</label>
          <input
            accept={allowedUploadMimeTypes.join(",")}
            disabled={isUploading}
            id="document-upload-file"
            onChange={onFileChange}
            type="file"
          />
        </div>
        {file ? (
          <p className="muted">
            {[file.name, file.type, formatFileSize(file.size)].filter(Boolean).join(" | ")}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="toolbar">
          <button className="button" disabled={isUploading} type="submit">
            {isUploading ? "Cargando..." : "Guardar archivo"}
          </button>
          <button
            className="button secondary"
            disabled={isUploading}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function VersionPanel({
  activeDownloadId,
  canDownload,
  currentVersionId,
  onDownload,
  versions,
}: {
  activeDownloadId: string | null;
  canDownload: boolean;
  currentVersionId: string | null;
  onDownload: (version: DocumentVersion) => void;
  versions: DocumentVersion[];
}) {
  if (versions.length === 0) {
    return (
      <div className="documents-version-panel">
        <p className="muted">Este documento aun no tiene versiones con archivo.</p>
      </div>
    );
  }

  return (
    <div className="documents-version-panel">
      {versions.map((version) => (
        <div className="documents-version-row" key={version.id}>
          <div>
            <strong>V{version.versionNumber}</strong>
            <p className="muted">
              {[
                version.originalFileName ?? version.fileName,
                version.mimeType,
                formatFileSize(version.sizeBytes),
                version.checksumSha256
                  ? `SHA256 ${version.checksumSha256.slice(0, 16)}...`
                  : null,
                formatDateTime(version.createdAt),
              ]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>
          <div className="documents-version-actions">
            {version.id === currentVersionId || version.isCurrentVersion ? (
              <span className="badge">Actual</span>
            ) : null}
            {canDownload ? (
              <button
                className="button secondary"
                disabled={activeDownloadId === version.id}
                onClick={() => onDownload(version)}
                type="button"
              >
                {activeDownloadId === version.id ? "Descargando..." : "Descargar"}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function validateUploadFile(file: File) {
  if (!allowedUploadMimeTypes.includes(file.type)) {
    return "Tipo de archivo no permitido. Usa PDF, JPG o PNG.";
  }

  if (file.size > maxUploadSizeBytes) {
    return "El archivo supera el limite permitido de 10 MB.";
  }

  if (file.size <= 0) {
    return "El archivo esta vacio.";
  }

  return null;
}

function getCurrentVersion(versions: DocumentVersion[]) {
  const current = versions.find((version) => version.isCurrentVersion);

  if (current) {
    return current;
  }

  return versions.reduce<DocumentVersion | null>((latest, version) => {
    if (!latest || version.versionNumber > latest.versionNumber) {
      return version;
    }

    return latest;
  }, null);
}

function getDocumentTypeForCategory(
  categoryId: string,
  categories: DocumentCategory[],
): DocumentType {
  const code = categories.find((category) => category.id === categoryId)?.code;

  switch (code) {
    case "PLANOS":
      return "PLANO";
    case "SOLICITUDES_SUSPENSION":
      return "SOLICITUD_SUSPENSION";
    case "DENUNCIAS":
      return "DENUNCIA";
    case "DEMANDAS":
      return "DEMANDA";
    case "ACTAS":
      return "ACTA";
    case "EVIDENCIAS_FOTOGRAFICAS":
      return "SOPORTE_FOTOGRAFICO";
    case "CONTRATOS":
      return "CONTRATO";
    default:
      return "OTRO";
  }
}

function formatDocumentStatus(status: DocumentStatus) {
  return documentStatuses.find((item) => item.value === status)?.label ?? status;
}

function formatDocumentVisibility(visibility: DocumentVisibility) {
  return (
    documentVisibilities.find((item) => item.value === visibility)?.label ??
    visibility
  );
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
