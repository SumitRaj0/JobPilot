import type { NextFunction, Request, Response, RequestHandler } from "express";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/** Forwards async errors to Express errorHandler (prevents process crash). */
export function asyncHandler(fn: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
