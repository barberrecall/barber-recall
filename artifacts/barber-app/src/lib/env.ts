import Constants from "expo-constants";

const API_PORT = 8080;

/**
 * Resolve the API server's base URL.
 *
 * On a physical device `localhost` points at the phone itself, not at the dev
 * machine, so the LAN address has to be discovered. Metro already knows it —
 * `hostUri` is the host Expo is serving this bundle from (e.g.
 * "192.168.3.159:8081") — so the API host is derived from it and automatically
 * follows the dev machine's address without anyone editing a constant.
 *
 * `EXPO_PUBLIC_API_URL` overrides it, which is what production builds use.
 */
export function apiBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/+$/, "");

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];

  if (!host) {
    // Falls back to the Android emulator's alias for the host machine, which is
    // the only case where hostUri can legitimately be missing in development.
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://${host}:${API_PORT}`;
}

/**
 * Endereço do CRM web, para onde vai quem precisa assinar.
 *
 * Derivado de `apiBaseUrl` porque o front e a API são servidos pelo mesmo host
 * (ver artifacts/api-server/src/app.ts). Antes isto era uma constante escrita à
 * mão apontando para um domínio que ainda não existia — o botão de renovar
 * assinatura levava a lugar nenhum, e nada no código acusava.
 *
 * `EXPO_PUBLIC_WEB_URL` assume quando houver domínio próprio, sem exigir
 * mudança de código.
 */
export function webBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_WEB_URL;
  if (override) return override.replace(/\/+$/, "");

  return apiBaseUrl();
}
