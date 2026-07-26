import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiBaseUrl } from "@/lib/env";
import { loadStoredToken, saveToken, clearToken, getToken } from "@/lib/auth-token";

/**
 * Port of the web app's auth-context (artifacts/barber-crm/src/contexts).
 *
 * The shape of the API is deliberately identical so ported screens read the
 * same. The one difference is the credential: the web relies on the browser
 * sending an httpOnly session cookie, while here the token is kept in
 * SecureStore and sent as a Bearer header — React Native has no dependable
 * persistent cookie jar.
 *
 * The /auth/* endpoints are not in the OpenAPI spec, so they use plain fetch
 * rather than the generated hooks, matching how the web app does it.
 */

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
}

interface AuthState {
  user: AuthUser | null;
  barbershopId: number | null;
  loading: boolean;
}

export interface RegisterData {
  email: string;
  senha: string;
  nomeDono: string;
  nomeBarbearia: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, senha: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthResponse {
  user?: AuthUser;
  barbershopId?: number;
  token?: string;
  error?: string;
}

async function postAuth(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `issueToken` tells the server this is a native client, so it mints a
    // Bearer token instead of relying on a session cookie.
    body: JSON.stringify({ ...(body as object), issueToken: true }),
  });

  const data = (await res.json()) as AuthResponse;

  if (!res.ok) throw new Error(data.error ?? "Erro ao autenticar.");
  if (!data.token) throw new Error("Servidor não retornou token de acesso.");

  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    barbershopId: null,
    loading: true,
  });

  const fetchMe = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setState({ user: null, barbershopId: null, loading: false });
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // The token is expired or invalid — drop it so the user is not stuck
        // retrying a credential that will never work.
        await clearToken();
        setState({ user: null, barbershopId: null, loading: false });
        return;
      }

      const data = (await res.json()) as { user: AuthUser; barbershopId: number };
      setState({ user: data.user, barbershopId: data.barbershopId, loading: false });
    } catch {
      // Network failure: keep the token (the server may just be unreachable)
      // but report as not-logged-in for this session.
      setState({ user: null, barbershopId: null, loading: false });
    }
  }, []);

  useEffect(() => {
    // The stored token must be in memory before the first API call, since the
    // client's auth getter reads it synchronously.
    void loadStoredToken().then(fetchMe);
  }, [fetchMe]);

  const login = useCallback(async (email: string, senha: string) => {
    const data = await postAuth("auth/login", { email, senha });
    await saveToken(data.token!);
    setState({ user: data.user!, barbershopId: data.barbershopId!, loading: false });
  }, []);

  const register = useCallback(async (payload: RegisterData) => {
    const data = await postAuth("auth/register", payload);
    await saveToken(data.token!);
    setState({ user: data.user!, barbershopId: data.barbershopId!, loading: false });
  }, []);

  const logout = useCallback(async () => {
    // Tokens are stateless, so discarding the client's copy IS the logout.
    // The server is told as a courtesy; failure there must not block it.
    const token = getToken();

    if (token) {
      try {
        await fetch(`${apiBaseUrl()}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignored on purpose — see above.
      }
    }

    await clearToken();
    setState({ user: null, barbershopId: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
