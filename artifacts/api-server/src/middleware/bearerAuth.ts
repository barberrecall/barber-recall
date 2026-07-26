import { Request, Response, NextFunction } from "express";
import type { Session, SessionData } from "express-session";
import { verifyAuthToken } from "../lib/authToken";

/**
 * Authenticate native clients (Expo app) via `Authorization: Bearer <token>`.
 *
 * Must be mounted BEFORE the `express-session` middleware. When a valid token
 * is present this populates `req.session` with the same `userId` /
 * `barbershopId` fields the cookie session provides, so every existing route
 * keeps reading `req.session.barbershopId` unchanged — no route had to be
 * touched to support native clients.
 *
 * `req.tokenAuth` signals to app.ts that the cookie session middleware should
 * be skipped entirely for this request. Skipping matters: the session store is
 * Postgres, and letting express-session see a mutated session would persist a
 * throwaway row on every single API call from the app.
 *
 * An invalid or expired token is treated as "no token" rather than a hard 401,
 * so the request falls through to the cookie path and `requireAuth` produces
 * the single, consistent 401 for all unauthenticated callers.
 */
export function bearerAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const payload = verifyAuthToken(header.slice("Bearer ".length).trim());

  if (!payload) {
    next();
    return;
  }

  // A stand-in for the express-session object. The store methods are no-ops
  // because there is no server-side session behind a stateless token; they
  // exist so any route that calls them (e.g. logout's `destroy`) still works
  // instead of throwing.
  const tokenSession = {
    id: `token:${payload.uid}`,
    userId: payload.uid,
    barbershopId: payload.bid,
    cookie: {},
    regenerate(callback: (err?: unknown) => void) {
      callback();
      return this;
    },
    destroy(callback: (err?: unknown) => void) {
      callback();
      return this;
    },
    reload(callback: (err?: unknown) => void) {
      callback();
      return this;
    },
    save(callback?: (err?: unknown) => void) {
      callback?.();
      return this;
    },
    touch() {
      return this;
    },
    resetMaxAge() {
      return this;
    },
  };

  req.session = tokenSession as unknown as Session & Partial<SessionData>;
  req.tokenAuth = true;

  next();
}
