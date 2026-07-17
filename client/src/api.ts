const API_BASE = "/api/v1";

export function getToken() {
  return localStorage.getItem("itrack_token");
}
export function clearSession() {
  localStorage.removeItem("itrack_token");
  localStorage.removeItem("itrack_refresh_token");
}
export function saveSession(session: { token: string; refreshToken: string }) {
  localStorage.setItem("itrack_token", session.token);
  localStorage.setItem("itrack_refresh_token", session.refreshToken);
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
  if (response.status === 401) clearSession();
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message ||
        body.error?.message ||
        `Request failed (${response.status})`,
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
