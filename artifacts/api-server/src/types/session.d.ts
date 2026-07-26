import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    barbershopId: number;
    /** Set to true when the admin has authenticated via /api/admin/login */
    adminAuthenticated: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by the `bearerAuth` middleware when the caller authenticated with
       * an `Authorization: Bearer` token instead of a session cookie (native
       * clients). Tells app.ts to skip the cookie session middleware.
       */
      tokenAuth?: boolean;
    }
  }
}
