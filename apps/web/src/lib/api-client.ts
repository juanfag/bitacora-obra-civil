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
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `La solicitud al API falló con estado ${response.status}`;

    throw new ApiClientError(message, response.status, body);
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
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `La solicitud al API falló con estado ${response.status}`;

    throw new ApiClientError(message, response.status, body);
  }

  return response.blob();
}
