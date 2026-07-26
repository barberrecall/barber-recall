import { useState } from "react";
import { Link } from "wouter";
import { 
  useListCoupons, 
  getListCouponsQueryKey,
  useDeleteCoupon
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Ticket, Trash2, CalendarX2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CouponsPage() {
  const { data: coupons, isLoading } = useListCoupons();
  const deleteCoupon = useDeleteCoupon();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cupom?")) {
      deleteCoupon.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Cupom excluído" });
          queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
        }
      });
    }
  };

  const isExpired = (dateString?: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const getCouponStatus = (coupon: NonNullable<typeof coupons>[0]) => {
    const expired = isExpired(coupon.validade);
    const fullyUsed = coupon.usoMaximo != null && coupon.usoAtual >= coupon.usoMaximo;
    const active = coupon.ativo && !expired && !fullyUsed;
    return { expired, fullyUsed, active };
  };

  const StatusBadge = ({ coupon }: { coupon: NonNullable<typeof coupons>[0] }) => {
    const { active, expired, fullyUsed } = getCouponStatus(coupon);
    if (!coupon.ativo) return <Badge variant="secondary">Inativo</Badge>;
    if (expired) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Expirado</Badge>;
    if (fullyUsed) return <Badge variant="secondary">Esgotado</Badge>;
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Ativo</Badge>;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Crie e gerencie cupons para suas campanhas.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/coupons/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cupom
          </Link>
        </Button>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden flex flex-col gap-3 flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : coupons?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Ticket className="h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">Nenhum cupom cadastrado</p>
            <Button variant="outline" asChild><Link href="/coupons/new">Criar Primeiro Cupom</Link></Button>
          </div>
        ) : (
          coupons?.map((coupon) => {
            const { active, expired } = getCouponStatus(coupon);
            return (
              <Card key={coupon.id} className={`border-border/60 ${!active ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-primary bg-primary/5 border-primary/20 text-sm">
                        {coupon.codigo}
                      </Badge>
                      <StatusBadge coupon={coupon} />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-bold">
                        {coupon.tipo === 'percent' ? `${coupon.valor}%` : `R$ ${coupon.valor.toFixed(2)}`}
                      </span>
                      <span className="text-muted-foreground">
                        {coupon.usoAtual} {coupon.usoMaximo ? `/ ${coupon.usoMaximo}` : 'usos'} usados
                      </span>
                    </div>
                    {coupon.validade && (
                      <p className={`text-xs flex items-center gap-1 ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                        {expired && <CalendarX2 className="h-3 w-3" />}
                        Válido até {format(new Date(coupon.validade), "dd/MM/yyyy")}
                      </p>
                    )}
                    {!coupon.validade && (
                      <p className="text-xs text-muted-foreground">Vitalício</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden md:flex flex-col flex-1 border-border/60 shadow-sm min-h-0">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border)/0.6)]">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-24 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : coupons?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Ticket className="h-10 w-10 mb-4 opacity-50" />
                      <p className="font-medium text-foreground">Nenhum cupom cadastrado</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link href="/coupons/new">Criar Primeiro Cupom</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                coupons?.map((coupon) => {
                  const { active, expired } = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id} className={!active ? "opacity-60" : ""}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-primary bg-primary/5 border-primary/20 text-sm">
                          {coupon.codigo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {coupon.tipo === 'percent' ? `${coupon.valor}%` : `R$ ${coupon.valor.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{coupon.usoAtual}</span>
                          <span className="text-xs text-muted-foreground">
                            {coupon.usoMaximo ? `/ ${coupon.usoMaximo}` : 'ilimitado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.validade ? (
                          <span className={`flex items-center gap-1.5 ${expired ? 'text-destructive' : ''}`}>
                            {expired && <CalendarX2 className="h-3 w-3" />}
                            {format(new Date(coupon.validade), "dd/MM/yyyy")}
                          </span>
                        ) : 'Vitalício'}
                      </TableCell>
                      <TableCell><StatusBadge coupon={coupon} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(coupon.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
