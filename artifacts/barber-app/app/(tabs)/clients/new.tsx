import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import {
  ClientForm,
  EMPTY_CLIENT,
  toIsoDate,
  type ClientFormValues,
} from "@/components/client-form";

export default function NewClientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createClient = useCreateClient();

  const handleSubmit = async (values: ClientFormValues) => {
    const created = await createClient.mutateAsync({
      data: {
        nome: values.nome.trim(),
        telefone: values.telefone.trim(),
        // Campos vazios saem do payload em vez de virarem string vazia, que o
        // backend gravaria como um valor legítimo.
        ...(values.email.trim() ? { email: values.email.trim() } : {}),
        ...(toIsoDate(values.dataNascimento)
          ? { dataNascimento: toIsoDate(values.dataNascimento) }
          : {}),
        ...(values.observacoes.trim() ? { observacoes: values.observacoes.trim() } : {}),
      },
    });

    await queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });

    // Substitui em vez de empilhar: voltar do detalhe deve levar à lista, não
    // ao formulário que acabou de ser enviado.
    router.replace(`/clients/${created.id}`);
  };

  return (
    <ClientForm
      title="Novo cliente"
      initialValues={EMPTY_CLIENT}
      submitLabel="Cadastrar"
      submitting={createClient.isPending}
      onSubmit={handleSubmit}
    />
  );
}
