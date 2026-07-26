import { useEffect, useState } from "react";
import { Crown, Clock, XCircle, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface AdminUser {
  barbershopId: number;
  nomeBarbearia: string;
  nomeDono: string | null;
  userEmail: string | null;
  email: string;
  whatsapp: string | null;
  cidade: string;
  plan: "free" | "pro";
  planExpiresAt: string | null;
  trialStartsAt: string;
  trialExpired: boolean;
  daysRemaining: number | null;
  createdAt: string;
}

const PLAN_OPTIONS = [
  { label: "Free", plan: "free", months: undefined },
  { label: "Pro — 1 mês", plan: "pro", months: 1 },
  { label: "Pro — 3 meses", plan: "pro", months: 3 },
  { label: "Pro — 6 meses", plan: "pro", months: 6 },
  { label: "Pro — 1 ano", plan: "pro", months: 12 },
];

function PlanBadge({ user }: { user: AdminUser }) {
  if (user.plan === "pro") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 gap-1">
        <Crown className="h-3 w-3" /> Pro
      </Badge>
    );
  }
  if (!user.trialExpired) {
    return (
      <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
        <Clock className="h-3 w-3" /> Trial {user.daysRemaining}d
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
      <XCircle className="h-3 w-3" /> Expirado
    </Badge>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${BASE_URL}api/admin/users`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUsers(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handlePlanChange = async (barbershopId: number, plan: string, months?: number) => {
    setUpdating(barbershopId);
    try {
      const res = await fetch(`${BASE_URL}api/admin/users/${barbershopId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, months }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Plano atualizado com sucesso." });
      fetchUsers();
    } catch {
      toast({ title: "Erro ao atualizar plano.", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nomeBarbearia.toLowerCase().includes(q) ||
      (u.nomeDono ?? "").toLowerCase().includes(q) ||
      (u.userEmail ?? "").toLowerCase().includes(q) ||
      u.cidade.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} barbearia{users.length !== 1 ? "s" : ""} cadastrada{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="sm:ml-auto relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum cliente encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <div key={user.barbershopId} className="bg-card border border-border rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{user.nomeBarbearia}</span>
                    <PlanBadge user={user} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.nomeDono && <span>{user.nomeDono} · </span>}
                    {user.userEmail ?? user.email}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    {user.whatsapp && <span>📱 {user.whatsapp}</span>}
                    {user.cidade && <span>📍 {user.cidade}</span>}
                    <span>Cadastro: {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
                    {user.plan === "pro" && user.planExpiresAt && (
                      <span>Expira: {new Date(user.planExpiresAt).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>

                {/* Plan change */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating === user.barbershopId}
                      className="flex-shrink-0 text-xs gap-1.5"
                    >
                      {updating === user.barbershopId ? "Salvando..." : "Alterar plano"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {PLAN_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.label}
                        onClick={() => handlePlanChange(user.barbershopId, opt.plan, opt.months)}
                        className={cn(
                          user.plan === opt.plan && !opt.months && user.plan === "free" && "font-semibold",
                          "text-sm"
                        )}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
