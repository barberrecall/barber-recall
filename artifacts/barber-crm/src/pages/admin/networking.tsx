import { useEffect, useState } from "react";
import { MessageCircle, MapPin, Crown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface AdminUser {
  barbershopId: number;
  nomeBarbearia: string;
  nomeDono: string | null;
  whatsapp: string | null;
  cidade: string;
  plan: "free" | "pro";
  planExpiresAt: string | null;
}

function avatarColor(name: string): string {
  const palette = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function whatsappLink(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}

export default function AdminNetworking() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${BASE_URL}api/admin/users`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: AdminUser[]) => setUsers(data.filter((u) => u.plan === "pro")))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.nomeBarbearia.toLowerCase().includes(q) ||
      (u.nomeDono ?? "").toLowerCase().includes(q) ||
      u.cidade.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold">Grupo de Networking</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {users.length} cliente{users.length !== 1 ? "s" : ""} no plano Pro
          {users.length === 0 && " — nenhum cliente Pro ainda."}
        </p>
      </div>

      {users.length > 0 && (
        <div className="relative mb-5 w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-xl h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((user) => {
            const initials = (user.nomeBarbearia ?? "?")
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            const color = avatarColor(user.nomeBarbearia);

            return (
              <div
                key={user.barbershopId}
                className="bg-card border border-border rounded-xl p-4 flex items-start gap-4"
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${color}`}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{user.nomeBarbearia}</p>
                  {user.nomeDono && (
                    <p className="text-xs text-muted-foreground truncate">{user.nomeDono}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                    {user.cidade && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {user.cidade}
                      </span>
                    )}
                    {user.whatsapp ? (
                      <a
                        href={whatsappLink(user.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-500 font-medium transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {user.whatsapp}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem WhatsApp</span>
                    )}
                  </div>
                  {user.planExpiresAt && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pro até {new Date(user.planExpiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
