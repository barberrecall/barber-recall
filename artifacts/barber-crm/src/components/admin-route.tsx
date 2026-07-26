import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";

/**
 * Guard for admin-only routes.
 * - Not authenticated as admin → redirect to /admin/login
 * - Admin → render children
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) return <Redirect to="/admin/login" />;

  return <>{children}</>;
}
