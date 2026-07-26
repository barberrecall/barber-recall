import { View, Text, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, parseISO, isBefore } from "date-fns";
import { Ticket } from "lucide-react-native";
import { useListCoupons, type Coupon } from "@workspace/api-client-react";
import { FormHeader } from "@/components/form";
import { Card, Badge, EmptyState } from "@/components/ui";

/** Percentual mostra `%`, valor fixo mostra reais. */
const formatDiscount = (coupon: Coupon) =>
  coupon.tipo === "percent"
    ? `${coupon.valor}%`
    : `R$ ${coupon.valor.toFixed(2).replace(".", ",")}`;

function CouponRow({ coupon }: { coupon: Coupon }) {
  const expirado =
    coupon.validade != null && isBefore(parseISO(coupon.validade), new Date());

  // Um cupom pode estar inativo por três motivos diferentes, e o barbeiro
  // precisa distinguir: desligado, vencido, ou esgotado.
  const esgotado =
    coupon.usoMaximo != null && coupon.usoAtual >= coupon.usoMaximo;

  return (
    <Card className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{coupon.codigo}</Text>
          <Text className="text-xs text-muted-foreground">
            {formatDiscount(coupon)} de desconto
          </Text>

          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {!coupon.ativo ? <Badge label="Desligado" color="#8A94A6" /> : null}
            {expirado ? <Badge label="Vencido" color="#EF4444" /> : null}
            {esgotado ? <Badge label="Esgotado" color="#F97316" /> : null}
            {coupon.ativo && !expirado && !esgotado ? (
              <Badge label="Válido" color="#10B981" />
            ) : null}
          </View>
        </View>

        <View className="items-end">
          <Text className="text-sm font-semibold text-foreground">
            {coupon.usoAtual}
            {coupon.usoMaximo != null ? `/${coupon.usoMaximo}` : ""}
          </Text>
          <Text className="text-xs text-muted-foreground">usos</Text>
          {coupon.validade ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              até {format(parseISO(coupon.validade), "dd/MM/yy")}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useListCoupons();

  return (
    <View className="flex-1 bg-background">
      <FormHeader title="Cupons" />

      {isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : isError ? (
        <View className="p-4">
          <Card>
            <Text className="text-sm text-destructive">
              Não foi possível carregar os cupons.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#F59E0B"
            />
          }
          renderItem={({ item }) => <CouponRow coupon={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={Ticket}
              title="Nenhum cupom"
              description="Os cupons são criados no CRM web por enquanto."
            />
          }
        />
      )}
    </View>
  );
}
