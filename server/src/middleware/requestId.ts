import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get("x-request-id");
  const id = incoming && /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
