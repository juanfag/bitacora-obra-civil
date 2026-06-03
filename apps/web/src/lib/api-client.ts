import { Attachment } from "@/types/attachment";
import { EventType } from "@/types/event-type";

export type ApiClientOptions = {
  token?: string;
  headers?: HeadersInit;
  skipAuth?: boolean;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const defaultBaseUrl = "http://localhost:3001/api/v1";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl;

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiClientOptions = {},
): Promise<T> {
  const token =
    options.token ??
    (!options.skipAuth && typeof window !== "undefined"
      ? window.localStorage.getItem("bitacora.accessToken")
      : null);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
      ...init.headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiClientError(
      getApiErrorMessage(body, response.status),
      response.status,
      body,
    );
  }

  return body as T;
}

export function getEventTypes() {
  return apiRequest<EventType[]>("/event-types?status=ACTIVE");
}

export function getDailyLogEventAttachments(dailyLogEventId: string) {
  return apiRequest<Attachment[]>(
    `/daily-log-events/${encodeURIComponent(dailyLogEventId)}/attachments`,
  );
}

export function uploadDailyLogEventAttachment(
  dailyLogEventId: string,
  file: File,
) {
  const body = new FormData();
  body.append("dailyLogEventId", dailyLogEventId);
  body.append("file", file);

  return apiRequest<Attachment>("/attachments/upload", {
    method: "POST",
    body,
  });
}

export type UserSignature = {
  hasSignature: boolean;
  documentId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
  previewDataUrl: string | null;
};

export type UserOrganization = {
  id: string;
  name: string;
};

export type UserProject = {
  id: string;
  code: string;
  name: string;
  status: string;
  organization: UserOrganization;
};

export type UserRole = {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectName: string;
};

export type UserRead = {
  id: string;
  name: string;
  fullName: string;
  email: string;
  status: string;
  isActive: boolean;
  tokenVersion: number;
  roles: UserRole[];
  organization: UserOrganization | null;
  organizations: UserOrganization[];
  projects: UserProject[];
  createdAt: string;
  updatedAt: string;
};

export type EffectivePermission = {
  code: string;
  name: string;
  description: string | null;
  sourceRoles: Array<{
    id: string;
    code: string;
    name: string;
    projectId: string;
  }>;
};

export type MyPermissionsResponse = {
  permissionCodes: string[];
  permissions: EffectivePermission[];
};

export type ProjectSummary = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string | null;
  location?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UsersReadResponse = {
  items: UserRead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type UserRoleAssignmentInput = {
  projectId: string;
  roleId: string;
};

export type AssignableRolePermission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type AssignableRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  scope: string;
  permissions: AssignableRolePermission[];
};

export type DailyLogSignatureType = "RESPONSIBLE" | "APPROVER" | "INSPECTOR";

export type DailyLogSignature = {
  id: string;
  dailyLogId: string;
  signerUserId: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signatureType: DailyLogSignatureType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  signedAt: string;
  previewDataUrl: string | null;
};

export type DailyLogAuditItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  actorNameSnapshot?: string | null;
  actorEmailSnapshot?: string | null;
  createdAt: string;
  oldValue: unknown;
  newValue: unknown;
};

export type DailyLogAuditResponse = {
  dailyLogId: string;
  total: number;
  order: string;
  items: DailyLogAuditItem[];
};

export type DashboardMetrics = {
  activeProjects: number;
  openDailyLogs: number;
  pendingApprovalDailyLogs: number;
  closedDailyLogs: number;
  totalEvents: number;
  totalActiveUsers: number;
};

export type DashboardRecentActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  projectId: string | null;
  projectName: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

export type DashboardRecentActivity = {
  limit: number;
  items: DashboardRecentActivityItem[];
};

export type DocumentType =
  | "PLANO"
  | "SOLICITUD_SUSPENSION"
  | "DENUNCIA"
  | "DEMANDA"
  | "ACTA"
  | "SOPORTE_FOTOGRAFICO"
  | "CONTRATO"
  | "OTRO";

export type DocumentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "SUPERSEDED"
  | "DELETED";

export type DocumentVisibility =
  | "PRIVATE"
  | "PROJECT"
  | "ORGANIZATION"
  | "PUBLIC_VERIFICATION"
  | "RESTRICTED";

export type DocumentCategory = {
  id: string;
  organizationId: string;
  projectId: string | null;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
};

export type ControlledDocument = {
  id: string;
  organizationId: string;
  projectId: string;
  dailyLogId: string | null;
  eventId: string | null;
  categoryId: string | null;
  code: string | null;
  type: DocumentType;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  visibility: DocumentVisibility;
  metadata: Record<string, unknown> | null;
  uploadedById: string;
  uploadedBy: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  category: {
    id: string;
    code: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DocumentsResponse = {
  items: ControlledDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DocumentFilters = {
  organizationId?: string;
  projectId?: string;
  dailyLogId?: string;
  eventId?: string;
  categoryId?: string;
  type?: DocumentType | "";
  status?: DocumentStatus | "";
  visibility?: DocumentVisibility | "";
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateDocumentInput = {
  projectId: string;
  dailyLogId?: string;
  eventId?: string;
  categoryId?: string;
  code?: string;
  type: DocumentType;
  title: string;
  description?: string | null;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  metadata?: Record<string, unknown>;
};

export type UpdateDocumentInput = {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  code?: string | null;
  type?: DocumentType;
  status?: DocumentStatus;
  visibility?: DocumentVisibility;
  metadata?: Record<string, unknown> | null;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  originalFileName: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  storageProvider: string;
  isCurrentVersion: boolean;
  uploadedById: string;
  changeReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DocumentRelationType = "DAILY_LOG" | "DAILY_LOG_EVENT" | "PROJECT";

export type DocumentRelation = {
  id: string;
  documentId: string;
  relationType: DocumentRelationType;
  organizationId: string | null;
  projectId: string | null;
  dailyLogId: string | null;
  dailyLogEventId: string | null;
  metadata: Record<string, unknown> | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type RelatedDocument = {
  relation: DocumentRelation;
  document: ControlledDocument & {
    currentVersion: DocumentVersion | null;
  };
};

export function getDashboardMetrics() {
  return apiRequest<DashboardMetrics>("/dashboard/metrics");
}

export function getDashboardRecentActivity(limit = 20) {
  return apiRequest<DashboardRecentActivity>(
    `/dashboard/recent-activity?limit=${encodeURIComponent(limit)}`,
  );
}

export function getUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const query = searchParams.toString();

  return apiRequest<UsersReadResponse>(`/users${query ? `?${query}` : ""}`);
}

export function getUser(userId: string) {
  return apiRequest<UserRead>(`/users/${encodeURIComponent(userId)}`);
}

export function getMyPermissions() {
  return apiRequest<MyPermissionsResponse>("/users/me/permissions");
}

export function getProjects(params: { status?: string } = {}) {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();

  return apiRequest<ProjectSummary[]>(
    `/projects${query ? `?${query}` : ""}`,
  );
}

export function getProject(projectId: string) {
  return apiRequest<ProjectSummary>(`/projects/${encodeURIComponent(projectId)}`);
}

export function getDocuments(filters: DocumentFilters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.organizationId) {
    searchParams.set("organizationId", filters.organizationId);
  }

  if (filters.projectId) {
    searchParams.set("projectId", filters.projectId);
  }

  if (filters.dailyLogId) {
    searchParams.set("dailyLogId", filters.dailyLogId);
  }

  if (filters.eventId) {
    searchParams.set("eventId", filters.eventId);
  }

  if (filters.categoryId) {
    searchParams.set("categoryId", filters.categoryId);
  }

  if (filters.type) {
    searchParams.set("type", filters.type);
  }

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  if (filters.visibility) {
    searchParams.set("visibility", filters.visibility);
  }

  if (filters.search?.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  if (filters.page) {
    searchParams.set("page", String(filters.page));
  }

  if (filters.limit) {
    searchParams.set("limit", String(filters.limit));
  }

  const query = searchParams.toString();

  return apiRequest<DocumentsResponse>(
    `/documents${query ? `?${query}` : ""}`,
  );
}

export function getDocumentCategories() {
  return apiRequest<DocumentCategory[]>("/documents/categories");
}

export function getDocument(id: string) {
  return apiRequest<ControlledDocument>(`/documents/${encodeURIComponent(id)}`);
}

export function createDocument(payload: CreateDocumentInput) {
  return apiRequest<ControlledDocument>("/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadDocument(body: FormData) {
  return apiRequest<ControlledDocument>("/documents/upload", {
    method: "POST",
    body,
  });
}

export function updateDocument(id: string, payload: UpdateDocumentInput) {
  return apiRequest<ControlledDocument>(`/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDocument(id: string) {
  return apiRequest<ControlledDocument>(`/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getDocumentVersions(id: string) {
  return apiRequest<DocumentVersion[]>(
    `/documents/${encodeURIComponent(id)}/versions`,
  );
}

export function createDocumentRelation(
  documentId: string,
  payload: {
    relationType: DocumentRelationType;
    dailyLogId?: string;
    dailyLogEventId?: string;
    projectId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return apiRequest<DocumentRelation>(
    `/documents/${encodeURIComponent(documentId)}/relations`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteDocumentRelation(documentId: string, relationId: string) {
  return apiRequest<DocumentRelation>(
    `/documents/${encodeURIComponent(documentId)}/relations/${encodeURIComponent(
      relationId,
    )}`,
    {
      method: "DELETE",
    },
  );
}

export function getDailyLogDocuments(dailyLogId: string) {
  return apiRequest<RelatedDocument[]>(
    `/daily-logs/${encodeURIComponent(dailyLogId)}/documents`,
  );
}

export function getDailyLogEventDocuments(eventId: string) {
  return apiRequest<RelatedDocument[]>(
    `/daily-log-events/${encodeURIComponent(eventId)}/documents`,
  );
}

export async function downloadDocument(id: string) {
  return downloadDocumentBlob(`/documents/${encodeURIComponent(id)}/download`);
}

export async function downloadDocumentVersion(id: string) {
  return downloadDocumentBlob(
    `/document-versions/${encodeURIComponent(id)}/download`,
  );
}

async function downloadDocumentBlob(path: string) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bitacora.accessToken")
      : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    const body = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    throw new ApiClientError(
      getApiErrorMessage(body, response.status),
      response.status,
      body,
    );
  }

  return {
    blob: await response.blob(),
    fileName: getFileNameFromContentDisposition(
      response.headers.get("content-disposition"),
    ),
  };
}

export function updateUserRoles(
  userId: string,
  assignments: UserRoleAssignmentInput[],
) {
  return apiRequest<UserRead>(`/users/${encodeURIComponent(userId)}/roles`, {
    method: "PATCH",
    body: JSON.stringify({ assignments }),
  });
}

export function invalidateUserSessions(userId: string) {
  return apiRequest<UserRead>(
    `/users/${encodeURIComponent(userId)}/invalidate-sessions`,
    {
      method: "POST",
    },
  );
}

export function getAssignableRoles() {
  return apiRequest<AssignableRole[]>("/roles/assignable");
}

export function getMySignature() {
  return apiRequest<UserSignature>("/users/me/signature");
}

export function uploadMySignature(file: File) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<UserSignature>("/users/me/signature", {
    method: "POST",
    body,
  });
}

export function deleteMySignature() {
  return apiRequest<UserSignature>("/users/me/signature", {
    method: "DELETE",
  });
}

export function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiRequest<{ ok: boolean; sessionsInvalidated: boolean }>(
    "/users/me/password",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function resetUserPassword(
  userId: string,
  payload: {
    newPassword: string;
    confirmPassword: string;
  },
) {
  return apiRequest<UserRead>(`/users/${encodeURIComponent(userId)}/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getDailyLogSignatures(dailyLogId: string) {
  return apiRequest<DailyLogSignature[]>(
    `/daily-logs/${encodeURIComponent(dailyLogId)}/signatures`,
  );
}

export function applyDailyLogSignature(
  dailyLogId: string,
  signatureType: DailyLogSignatureType,
) {
  return apiRequest<DailyLogSignature>(
    `/daily-logs/${encodeURIComponent(dailyLogId)}/signatures`,
    {
      method: "POST",
      body: JSON.stringify({ signatureType }),
    },
  );
}

export function getDailyLogAudit(dailyLogId: string) {
  return apiRequest<DailyLogAuditResponse>(
    `/daily-logs/${encodeURIComponent(dailyLogId)}/audit`,
  );
}

export async function downloadDailyLogPdf(dailyLogId: string) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bitacora.accessToken")
      : null;
  const response = await fetch(
    `${apiBaseUrl}/daily-logs/${encodeURIComponent(dailyLogId)}/pdf`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    const body = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    throw new ApiClientError(
      getApiErrorMessage(body, response.status),
      response.status,
      body,
    );
  }

  return response.blob();
}

export async function downloadAttachmentFile(
  attachmentId: string,
  disposition: "inline" | "attachment",
) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bitacora.accessToken")
      : null;
  const response = await fetch(
    `${apiBaseUrl}/attachments/${encodeURIComponent(
      attachmentId,
    )}/download?disposition=${encodeURIComponent(disposition)}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    const body = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    throw new ApiClientError(
      getApiErrorMessage(body, response.status),
      response.status,
      body,
    );
  }

  return {
    blob: await response.blob(),
    fileName: getFileNameFromContentDisposition(
      response.headers.get("content-disposition"),
    ),
  };
}

function getApiErrorMessage(body: unknown, status: number) {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = body.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      const messages = message.filter((item) => typeof item === "string");

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  return `La solicitud al API falló con estado ${status}`;
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const fallbackMatch = value.match(/filename="([^"]+)"/i);

  return fallbackMatch?.[1] ?? null;
}
