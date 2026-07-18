import type { Response } from "express";
import { env } from "../config/env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ACCESS_COOKIE = "itrack_access";
export const REFRESH_COOKIE = "itrack_refresh";
export const OAUTH_STATE_COOKIE = "itrack_google_state";
export const OAUTH_PKCE_COOKIE = "itrack_google_pkce";

function cookieOptions(maxAge: number) {
  return [
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(env.nodeEnv === "production" ? ["Secure"] : []),
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
  appendCookie(res, `${ACCESS_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(ACCESS_TOKEN_TTL_SECONDS)}`);
  appendCookie(res, `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; ${cookieOptions(REFRESH_TOKEN_TTL_SECONDS)}`);
  res.setHeader("Cache-Control", "no-store");
}

export function clearSessionCookies(res: Response) {
  appendCookie(res, `${ACCESS_COOKIE}=; ${cookieOptions(0)}`);
  appendCookie(res, `${REFRESH_COOKIE}=; ${cookieOptions(0)}`);
  res.setHeader("Cache-Control", "no-store");
}

function appendCookie(res: Response, value: string) {
  const current = res.getHeader("Set-Cookie");
  const cookies = Array.isArray(current) ? current.map(String) : current ? [String(current)] : [];
  res.setHeader("Set-Cookie", [...cookies, value]);
}

export function setOAuthStateCookie(res: Response, state: string) {
  appendCookie(res, `${OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieOptions(10 * 60)}`);
}

export function setOAuthPkceCookie(res: Response, verifier: string) {
  appendCookie(res, `${OAUTH_PKCE_COOKIE}=${encodeURIComponent(verifier)}; ${cookieOptions(10 * 60)}`);
}

export function clearOAuthStateCookie(res: Response) {
  appendCookie(res, `${OAUTH_STATE_COOKIE}=; ${cookieOptions(0)}`);
}

export function clearOAuthPkceCookie(res: Response) {
  appendCookie(res, `${OAUTH_PKCE_COOKIE}=; ${cookieOptions(0)}`);
}
