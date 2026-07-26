import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.barbershopId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  next();
}
