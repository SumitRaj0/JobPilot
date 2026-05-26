import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

/**
 * Auth-ready placeholder — validates optional Bearer token when JWT auth is added.
 * Currently passes through in development.
 */
export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    req.user = { id: "anonymous", token: header.slice(7) };
  } else {
    req.user = { id: "dev-user" };
  }
  next();
}

/** Strict auth for protected routes (Step 9+). */
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (env.NODE_ENV === "development" && !header) {
    req.user = { id: "dev-user" };
    next();
    return;
  }

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = { id: "anonymous", token: header.slice(7) };
  next();
}
