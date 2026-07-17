const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "itrack_token";
const REFRESH_TOKEN_KEY = "itrack_refresh_token";

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function saveSession(session: { token: string; refreshToken: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.token);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

function isPublicAuthPath(path: string) {
  const normalized = path.split("?", 1)[0];
  return /^\/auth\/(login|register|refresh|logout|forgot-password|reset-password|accept-invite)$/.test(normalized);
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "include",
      });
      if (!response.ok) return false;
      const session = await response.json().catch(() => null);
      if (!session?.token || !session?.refreshToken) return false;
      saveSession(session);
      return true;
    })()
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const canRefresh = Boolean(getRefreshToken()) && !isPublicAuthPath(path);
  const request = () => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  };

  let response = await request();
  if (response.status === 401 && canRefresh && await refreshSession()) {
    response = await request();
  }
  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !isPublicAuthPath(path) && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }
  return response;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.message || body.error?.message || `Request failed (${response.status})`,
      response.status,
      body,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function login(email: string, password: string) {
  const session = await api<any>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveSession(session);
  return session;
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    await api("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } finally {
    clearSession();
  }
}
