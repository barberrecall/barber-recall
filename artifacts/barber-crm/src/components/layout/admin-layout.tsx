import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Scissors, LogOut, LayoutDashboard, Users, Network, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Clientes", icon: Users },
  { href: "/admin/trial-expiring", label: "Trial expirando", icon: Bell },
  { href: "/admin/networking", label: "Networking", icon: Network },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAdminAuth();

  const handleLogout = () => { logout(); };

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card flex-shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-border gap-2">
          <Scissors className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm text-primary">Barber Recall</span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
          {adminNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative overflow-hidden",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="md:hidden h-12 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm text-primary">Barber Recall</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground p-1">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-10">
        <div className="flex justify-around h-14">
          {adminNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
