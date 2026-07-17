import type { Response } from "express";

export const ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ACCESS_COOKIE = "itrack_access";
export const REFRESH_COOKIE = "itrack_refresh";

function cookieOptions(maxAge: number) {
  return [
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function readCookie(requestCookie: string | undefined, name: string) {
  if (!requestCookie) return undefined;
  const value = requestCookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!value) return undefined;
  try {
    return decodeURIComponent(value.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

export function setSessionCookies(res: Response, token: string, refreshToken: string) {
  res.setHeader("Set-Cookie", [
    `${ACCESS_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(ACCESS_TOKEN_TTL_SECONDS)}`,
    `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; ${cookieOptions(REFRESH_TOKEN_TTL_SECONDS)}`,
  ]);
  res.setHeader("Cache-Control", "no-store");
}

export function clearSessionCookies(res: Response) {
  res.setHeader("Set-Cookie", [
    `${ACCESS_COOKIE}=; ${cookieOptions(0)}`,
    `${REFRESH_COOKIE}=; ${cookieOptions(0)}`,
  ]);
  res.setHeader("Cache-Control", "no-store");
}
