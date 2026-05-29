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

export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type ControlledDocument = {
  id: string;
  organizationId: string;
  projectId: string;
  dailyLogId: string | null;
  eventId: string | null;
  type: DocumentType;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  metadata: Record<string, unknown> | null;
  uploadedById: string;
  uploadedBy: {
    id: string;
    fullName: string;
    email: string;
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
  projectId?: string;
  dailyLogId?: string;
  eventId?: string;
  type?: DocumentType | "";
  status?: DocumentStatus | "";
  page?: number;
  limit?: number;
};

export type UpdateDocumentInput = {
  title?: string;
  description?: string | null;
  type?: DocumentType;
  status?: DocumentStatus;
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

  if (filters.projectId) {
    searchParams.set("projectId", filters.projectId);
  }

  if (filters.dailyLogId) {
    searchParams.set("dailyLogId", filters.dailyLogId);
  }

  if (filters.eventId) {
    searchParams.set("eventId", filters.eventId);
  }

  if (filters.type) {
    searchParams.set("type", filters.type);
  }

  if (filters.status) {
    searchParams.set("status", filters.status);
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

export async function downloadDocument(id: string) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("bitacora.accessToken")
      : null;
  const response = await fetch(
    `${apiBaseUrl}/documents/${encodeURIComponent(id)}/download`,
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
