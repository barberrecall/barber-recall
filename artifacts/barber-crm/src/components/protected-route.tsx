import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Scissors } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Scissors className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
