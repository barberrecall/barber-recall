import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless auth tokens for native clients (Expo app).
 *
 * The web frontend authenticates with the `express-session` cookie, which the
 * browser attaches automatically. React Native has no reliable persistent
 * cookie jar, so native clients send `Authorization: Bearer <token>` instead.
 *
 * Signed with HMAC-SHA256 using SESSION_SECRET — the same secret the cookie
 * session already uses, so rotating it invalidates both at once. Implemented
 * on `node:crypto` rather than a JWT library to avoid adding a dependency to
 * a workspace that deliberately guards its supply chain (see the
 * `minimumReleaseAge` note in pnpm-workspace.yaml).
 *
 * NOTE: these tokens are stateless, so they cannot be revoked server-side
 * before they expire — logging out only discards the client's copy. That is an
 * accepted tradeoff at this scale; moving to revocable tokens means storing
 * them in a table and checking on each request.
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matching the session cookie

export interface AuthTokenPayload {
  /** users.id */
  uid: number;
  /** barbershop.id */
  bid: number;
  /** Expiry as a Unix epoch in milliseconds */
  exp: number;
}

function secret(): string {
  return (
    process.env.SESSION_SECRET ??
    "dev-only-insecure-secret-do-not-use-in-production"
  );
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function createAuthToken(
  userId: number,
  barbershopId: number,
  ttlMs: number = TOKEN_TTL_MS,
): string {
  const payload: AuthTokenPayload = {
    uid: userId,
    bid: barbershopId,
    exp: Date.now() + ttlMs,
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));

  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verify a token's signature and expiry.
 *
 * Returns the payload when valid, or `null` for any malformed, tampered, or
 * expired token — callers should treat `null` as "not authenticated" without
 * distinguishing why, so the response never reveals which check failed.
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = sign(encodedPayload);

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  // timingSafeEqual throws when lengths differ, so gate on length first.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;

  const { uid, bid, exp } = payload as Record<string, unknown>;

  if (
    typeof uid !== "number" ||
    typeof bid !== "number" ||
    typeof exp !== "number" ||
    !Number.isInteger(uid) ||
    !Number.isInteger(bid)
  ) {
    return null;
  }

  if (Date.now() >= exp) return null;

  return { uid, bid, exp };
}
