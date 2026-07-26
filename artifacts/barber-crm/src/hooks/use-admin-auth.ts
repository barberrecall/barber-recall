import { useCallback, useEffect, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface AdminAuthState {
  authenticated: boolean;
  loading: boolean;
}

export function useAdminAuth(): AdminAuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AdminAuthState>({ authenticated: false, loading: true });

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}api/admin/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { authenticated: boolean };
        setState({ authenticated: data.authenticated, loading: false });
      } else {
        setState({ authenticated: false, loading: false });
      }
    } catch {
      setState({ authenticated: false, loading: false });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const logout = async () => {
    await fetch(`${BASE_URL}api/admin/logout`, { method: "POST", credentials: "include" });
    setState({ authenticated: false, loading: false });
    window.location.href = "/admin/login";
  };

  return { ...state, logout };
}
