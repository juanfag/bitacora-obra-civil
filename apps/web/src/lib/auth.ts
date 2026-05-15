import { apiRequest } from "./api-client";

const accessTokenKey = "bitacora.accessToken";

export type LoginResponse = {
  accessToken: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
  };
};

export async function login(email: string, password: string) {
  const response = await apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    {
      skipAuth: true,
    },
  );

  if (typeof window !== "undefined") {
    window.localStorage.setItem(accessTokenKey, response.accessToken);
  }

  return response;
}

export function logout() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(accessTokenKey);
}

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(accessTokenKey);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
