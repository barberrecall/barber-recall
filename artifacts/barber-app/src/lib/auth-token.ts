import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "barber_recall_auth_token";

/**
 * The token is mirrored in memory because `customFetch`'s auth getter runs on
 * every request — reading the encrypted keystore that often would add needless
 * latency to each API call. SecureStore stays the source of truth across app
 * restarts; memory is just the hot path.
 */
let cachedToken: string | null = null;

/** Load the persisted token into memory. Call once during app startup. */
export async function loadStoredToken(): Promise<string | null> {
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A read failure (e.g. keystore unavailable) is treated as "logged out"
    // rather than a crash — the user can simply sign in again.
    cachedToken = null;
  }

  return cachedToken;
}

export function getToken(): string | null {
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
