import type { NextFunction, Response } from "express";
import { env } from "../config/env.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, readCookie } from "../lib/authCookies.js";
import type { AuthRequest } from "./auth.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfOriginGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (safeMethods.has(req.method)) return next();
  const origin = req.get("origin");
  const hasCookieSession = Boolean(readCookie(req.headers.cookie, ACCESS_COOKIE) || readCookie(req.headers.cookie, REFRESH_COOKIE));
  if (origin && hasCookieSession && origin.replace(/\/+$/, "") !== env.clientOrigin) {
    return res.status(403).json({ error: { code: "CSRF_ORIGIN_REJECTED", message: "Request origin is not allowed" } });
  }
  return next();
}
