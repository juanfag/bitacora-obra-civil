export type ApiClientOptions = {
  token?: string;
  headers?: HeadersInit;
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

const defaultBaseUrl = "http://localhost:3000/api/v1";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBaseUrl;

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiClientOptions = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
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
        : `API request failed with status ${response.status}`;

    throw new ApiClientError(message, response.status, body);
  }

  return body as T;
}
