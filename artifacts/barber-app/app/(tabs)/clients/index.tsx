import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Search, Users, Plus, ChevronRight } from "lucide-react-native";
import {
  useListClients,
  type Client,
  type ClientStatus,
} from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { RECALL_FILTER_OPTIONS } from "@/lib/recall-status";
import {
  ScreenHeader,
  Card,
  Chip,
  Avatar,
  EmptyState,
  Pill,
  INK,
  INK_MUTED,
} from "@/components/ui";
import { StatusMark } from "@/components/status-mark";

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-60">
      <View className="mb-2 flex-row items-center gap-3.5 rounded-card bg-surface px-5 py-4">
        <Avatar name={client.nome} />

        <View className="flex-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {client.nome}
          </Text>
          <View className="mt-1">
            <StatusMark status={client.status} />
          </View>
        </View>

        <View className="items-end">
          <Text className="text-sm text-ink-muted">
            {client.totalVisitas} {client.totalVisitas === 1 ? "visita" : "visitas"}
          </Text>
          <ChevronRight size={16} color={INK_MUTED} />
        </View>
      </View>
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
  const filtrando = Boolean(debouncedSearch) || status !== "all";

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <ScreenHeader
        eyebrow="Carteira"
        title="Clientes"
        right={
          <Pressable
            onPress={() => router.push("/clients/new")}
            accessibilityRole="button"
            accessibilityLabel="Cadastrar cliente"
            className="h-11 w-11 items-center justify-center rounded-pill bg-hero active:opacity-80"
          >
            <Plus size={20} color="#FFFFFF" />
          </Pressable>
        }
      />

      <View className="gap-3 px-5 pb-3">
        <View className="flex-row items-center gap-2.5 rounded-pill bg-surface px-4">
          <Search size={17} color={INK_MUTED} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome"
            placeholderTextColor={INK_MUTED}
            className="h-12 flex-1 text-base text-ink"
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {RECALL_FILTER_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={status === option.value}
              onPress={() => setStatus(option.value)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={INK} />
        </View>
      ) : isError ? (
        <View className="px-5">
          <Card>
            <Text className="text-base font-semibold text-ink">
              Não foi possível carregar os clientes.
            </Text>
            <Text className="mt-1 text-sm text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 96,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={INK}
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
              title={filtrando ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              description={
                filtrando
                  ? "Tente outra busca ou remova o filtro."
                  : "Cadastre o primeiro para começar a acompanhar o retorno."
              }
              action={
                filtrando ? undefined : (
                  <Pill
                    tone="ink"
                    full
                    label="Novo cliente"
                    icon={Plus}
                    onPress={() => router.push("/clients/new")}
                  />
                )
              }
            />
          }
        />
      )}
    </View>
  );
}
