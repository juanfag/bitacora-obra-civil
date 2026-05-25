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
