import { ReactNode, useState } from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/contexts/auth-context"
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  MessageSquare, 
  Ticket, 
  BarChart3, 
  Lightbulb, 
  Settings, 
  LogOut,
  Scissors,
  MoreHorizontal,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTrialStatus } from "@/hooks/use-trial-status"
import { TrialBanner } from "@/components/trial-banner"
import { ProBanner } from "@/components/pro-banner"
import { PaywallOverlay } from "@/components/paywall-overlay"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/appointments", label: "Atendimentos", icon: CalendarDays },
  { href: "/campaigns", label: "Campanhas", icon: MessageSquare },
  { href: "/coupons", label: "Cupons", icon: Ticket },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/insights", label: "Insights IA", icon: Lightbulb },
  { href: "/settings", label: "Configurações", icon: Settings },
];

// First 4 items in bottom bar; the rest go into "Mais"
const bottomPrimary = navItems.slice(0, 4);
const bottomMore = navItems.slice(4);

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const trial = useTrialStatus();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout().then(() => { window.location.href = "/login"; }).catch(() => { window.location.href = "/login"; });
  };

  const isActive = (href: string) =>
    location === href || location.startsWith(`${href}/`);

  const moreIsActive = bottomMore.some((item) => isActive(item.href));

  const showTrialBanner =
    !trial.loading && trial.plan === "free" && !trial.trialExpired && trial.trialStartsAt !== null;
  const showProBanner =
    !trial.loading &&
    trial.plan === "pro" &&
    trial.planExpiresAt !== null &&
    trial.daysRemaining !== null;
  const showPaywall = !trial.loading && (trial.trialExpired || showPaymentModal);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full">
      {/* ── Sidebar (Desktop only) ── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 text-foreground font-bold text-lg">
            <Scissors className="h-5 w-5" />
            <span>Barber Recall</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors font-medium text-sm",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-secondary w-full">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="md:hidden h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-20">
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground font-bold">
          <Scissors className="h-5 w-5" />
          <span>Barber Recall</span>
        </Link>
        <button onClick={handleLogout} className="text-muted-foreground p-1.5">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card z-20 safe-area-inset-bottom">
        <div className="flex justify-around items-stretch h-16">
          {bottomPrimary.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span className={cn("text-[10px] leading-none", active ? "font-bold" : "font-medium")}>{item.label}</span>
              </Link>
            );
          })}

          {/* "Mais" button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-colors",
              moreIsActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={moreIsActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>

      {/* ── "Mais" Sheet (Mobile) ── */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left text-base">Mais opções</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {bottomMore.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl border font-medium text-sm transition-colors",
                    active
                      ? "bg-primary border-transparent text-primary-foreground"
                      : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {/* Logout in sheet */}
          <div className="border-t border-border pt-4 pb-2 flex items-center justify-between">
            <button
              onClick={() => { setMoreOpen(false); handleLogout(); }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 md:h-[100dvh]">
        {showTrialBanner && (
          <TrialBanner
            trialStartsAt={trial.trialStartsAt!}
            onSubscribe={() => setShowPaymentModal(true)}
          />
        )}
        {showProBanner && (
          <ProBanner
            planExpiresAt={trial.planExpiresAt!}
            daysRemaining={trial.daysRemaining!}
            onRenew={() => setShowPaymentModal(true)}
          />
        )}
        {children}
      </main>

      {/* ── Paywall / Payment Modal ── */}
      {showPaywall && (
        <PaywallOverlay
          onSubscribed={() => { setShowPaymentModal(false); trial.refresh(); }}
          onDismiss={showPaymentModal && !trial.trialExpired ? () => setShowPaymentModal(false) : undefined}
        />
      )}
    </div>
  );
}
