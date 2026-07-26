import { Request, Response, NextFunction } from "express";

/**
 * Middleware that allows access only to the admin session.
 * Admin authenticates via POST /api/admin/login (email + password),
 * which sets req.session.adminAuthenticated = true.
 * No user account is required.
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.adminAuthenticated) {
    res.status(401).json({ error: "Acesso negado." });
    return;
  }
  next();
}
