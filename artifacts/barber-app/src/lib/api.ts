import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { apiBaseUrl } from "./env";
import { getToken } from "./auth-token";

/**
 * Point the shared API client at the server and teach it how to authenticate.
 *
 * This is the whole reason the generated hooks in @workspace/api-client-react
 * work unchanged in React Native: the client emits relative paths ("/api/...")
 * and `setBaseUrl` prefixes them, while `setAuthTokenGetter` attaches the
 * Bearer token the web build does not need (there, the browser sends a cookie).
 *
 * Call once, before rendering anything that queries the API.
 */
export function configureApiClient(): void {
  setBaseUrl(apiBaseUrl());
  setAuthTokenGetter(() => getToken());
}
