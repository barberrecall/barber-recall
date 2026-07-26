import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetClient,
  useUpdateClient,
  getListClientsQueryKey,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import {
  ClientForm,
  fromIsoDate,
  toIsoDate,
  type ClientFormValues,
} from "@/components/client-form";
import { FormHeader,
  INK,
} from "@/components/form";
import { Card } from "@/components/ui";

export default function EditClientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);

  const { data: client, isLoading, isError } = useGetClient(clientId);
  const updateClient = useUpdateClient();

  const handleSubmit = async (values: ClientFormValues) => {
    await updateClient.mutateAsync({
      id: clientId,
      data: {
        nome: values.nome.trim(),
        telefone: values.telefone.trim(),
        // Strings vazias são enviadas para limpar um campo que tinha valor —
        // aqui, ao contrário do cadastro, omitir significaria "não mexer".
        email: values.email.trim(),
        dataNascimento: toIsoDate(values.dataNascimento) ?? "",
        observacoes: values.observacoes.trim(),
      },
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) }),
    ]);

    router.back();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-canvas">
        <FormHeader title="Editar cliente" />
        <View className="items-center py-12">
          <ActivityIndicator size="large" color={INK} />
        </View>
      </View>
    );
  }

  if (isError || !client) {
    return (
      <View className="flex-1 bg-canvas">
        <FormHeader title="Editar cliente" />
        <View className="p-4">
          <Card>
            <Text className="text-sm text-ink">
              Não foi possível carregar o cliente.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <ClientForm
      title="Editar cliente"
      initialValues={{
        nome: client.nome,
        telefone: client.telefone,
        email: client.email ?? "",
        dataNascimento: fromIsoDate(client.dataNascimento),
        observacoes: client.observacoes ?? "",
      }}
      submitLabel="Salvar alterações"
      submitting={updateClient.isPending}
      onSubmit={handleSubmit}
    />
  );
}
