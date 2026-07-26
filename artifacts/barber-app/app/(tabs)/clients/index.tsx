import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Users, Phone, ChevronRight } from "lucide-react-native";
import {
  useListClients,
  type Client,
  type ClientStatus,
} from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  RECALL_STATUS_LABEL,
  RECALL_STATUS_COLOR,
  RECALL_FILTER_OPTIONS,
} from "@/lib/recall-status";
import { Card, Badge, Avatar, EmptyState } from "@/components/ui";

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className="mb-2 active:opacity-70">
        <View className="flex-row items-center gap-3">
          <Avatar name={client.nome} />

          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {client.nome}
            </Text>

            <View className="mt-0.5 flex-row items-center gap-1">
              <Phone size={12} color="#8A94A6" />
              <Text className="text-xs text-muted-foreground">{client.telefone}</Text>
            </View>

            <View className="mt-1.5">
              <Badge
                label={RECALL_STATUS_LABEL[client.status]}
                color={RECALL_STATUS_COLOR[client.status]}
              />
            </View>
          </View>

          <View className="items-end gap-1">
            <Text className="text-xs text-muted-foreground">
              {client.totalVisitas} {client.totalVisitas === 1 ? "visita" : "visitas"}
            </Text>
            <ChevronRight size={16} color="#8A94A6" />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function ClientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");

  // Sem debounce cada tecla dispararia uma chamada à API.
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError, error, refetch, isRefetching } = useListClients({
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(status !== "all" ? { status } : {}),
  });

  const clients = data ?? [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-3 border-b border-border px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-foreground">Clientes</Text>

        <View className="flex-row items-center gap-2 rounded-lg border border-input bg-card px-3">
          <Search size={16} color="#8A94A6" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome ou telefone"
            placeholderTextColor="#8A94A6"
            className="h-11 flex-1 text-base text-foreground"
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <View className="flex-row gap-2">
          {RECALL_FILTER_OPTIONS.map((option) => {
            const selected = status === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setStatus(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                  selected ? "border-primary bg-primary" : "border-border bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    selected ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : isError ? (
        <View className="p-4">
          <Card>
            <Text className="text-sm font-medium text-destructive">
              Não foi possível carregar os clientes.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={clients}
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
          renderItem={({ item }) => (
            <ClientRow
              client={item}
              onPress={() => router.push(`/clients/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              title={
                debouncedSearch || status !== "all"
                  ? "Nenhum cliente encontrado"
                  : "Nenhum cliente ainda"
              }
              description={
                debouncedSearch || status !== "all"
                  ? "Tente outra busca ou remova o filtro."
                  : "Os clientes aparecem aqui conforme forem cadastrados."
              }
            />
          }
        />
      )}
    </View>
  );
}
