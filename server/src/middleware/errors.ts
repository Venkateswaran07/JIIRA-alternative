import type express from "express";

export function notFoundHandler(_req: express.Request, res: express.Response) {
  return res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found", requestId: res.locals.requestId } });
}

export function errorHandler(
  error: unknown,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  const requestId = res.locals.requestId;
  console.error("Unhandled request error", { requestId, method: req.method, path: req.originalUrl, error });
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unexpected server error", requestId } });
}
