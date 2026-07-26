import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

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

interface AuthContextValue extends AuthState {
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  senha: string;
  nomeDono: string;
  nomeBarbearia: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, barbershopId: null, loading: true });

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser; barbershopId: number };
        setState({ user: data.user, barbershopId: data.barbershopId, loading: false });
      } else {
        setState({ user: null, barbershopId: null, loading: false });
      }
    } catch {
      setState({ user: null, barbershopId: null, loading: false });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, senha: string, rememberMe = false) => {
    const res = await fetch(`${BASE_URL}api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, senha, rememberMe }),
    });
    const data = await res.json() as { user?: AuthUser; barbershopId?: number; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao entrar.");
    setState({ user: data.user!, barbershopId: data.barbershopId!, loading: false });
  };

  const register = async (payload: RegisterData) => {
    const res = await fetch(`${BASE_URL}api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { user?: AuthUser; barbershopId?: number; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Erro ao criar conta.");
    setState({ user: data.user!, barbershopId: data.barbershopId!, loading: false });
  };

  const logout = async () => {
    await fetch(`${BASE_URL}api/auth/logout`, { method: "POST", credentials: "include" });
    setState({ user: null, barbershopId: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
