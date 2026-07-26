import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Crown, Clock, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface AdminStats {
  total: number;
  pro: number;
  trialActive: number;
  trialExpired: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={cn("bg-card border rounded-xl p-5 flex items-center gap-4", `border-l-4 ${color}`)}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", `${color.replace("border-l-", "bg-").replace(/\-\d+$/, "")}/15`)}>
        <Icon className={cn("h-5 w-5", color.replace("border-l-", "text-"))} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}api/admin/stats`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da plataforma Barber Recall.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total de clientes" value={stats.total} icon={Users} color="border-l-blue-500" />
          <StatCard label="Plano Pro" value={stats.pro} icon={Crown} color="border-l-amber-500" />
          <StatCard label="Em trial" value={stats.trialActive} icon={Clock} color="border-l-green-500" />
          <StatCard label="Trial expirado" value={stats.trialExpired} icon={XCircle} color="border-l-red-500" />
        </div>
      ) : (
        <p className="text-muted-foreground">Erro ao carregar estatísticas.</p>
      )}

      <div className="mt-8 grid gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Acesso rápido</h2>
        {[
          { href: "/admin/users", label: "Gerenciar assinaturas", sub: "Ver e alterar o plano de cada cliente" },
          { href: "/admin/trial-expiring", label: "Trial expirando", sub: "Notificar clientes com trial expirando em ≤2 dias" },
          { href: "/admin/networking", label: "Grupo de networking", sub: "Contatos dos clientes do plano Pro" },
        ].map(({ href, label, sub }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 hover:bg-secondary/40 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
