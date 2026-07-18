const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/+$/, "");

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
  return null;
}

export function getRefreshToken() {
  return null;
}

export function clearSession() {
  // Session cookies are cleared by the server's /auth/logout endpoint.
}

export function saveSession(_session: { token?: string; refreshToken?: string }) {
  // Kept as a compatibility no-op while older callers migrate to cookies.
}

export function googleLoginUrl() {
  return `${API_BASE}/auth/google`;
}

function isPublicAuthPath(path: string) {
  const normalized = path.split("?", 1)[0];
  return /^\/auth\/(login|register|verify-otp|resend-otp|refresh|logout|forgot-password|reset-password|accept-invite)$/.test(normalized);
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      return response.ok;
    })()
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const canRefresh = !isPublicAuthPath(path);
  const request = () => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
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
  return session;
}

export async function logout() {
  try {
    await api("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearSession();
  }
}

export async function hasSession() {
  const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  return response.ok;
}
