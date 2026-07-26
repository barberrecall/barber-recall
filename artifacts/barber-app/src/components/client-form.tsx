import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field, FormHeader } from "@/components/form";
import { Pill } from "@/components/ui";

export interface ClientFormValues {
  nome: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  observacoes: string;
}

export const EMPTY_CLIENT: ClientFormValues = {
  nome: "",
  telefone: "",
  email: "",
  dataNascimento: "",
  observacoes: "",
};

type Errors = Partial<Record<keyof ClientFormValues, string>>;

/** `dd/MM/yyyy` (como o usuário digita) para `yyyy-MM-dd` (como a API espera). */
export function toIsoDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

/** Inverso de `toIsoDate`, para preencher o formulário na edição. */
export function fromIsoDate(value: string | null | undefined): string {
  if (!value) return "";

  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const [, ano, mes, dia] = match;
  return `${dia}/${mes}/${ano}`;
}

function validate(values: ClientFormValues): Errors {
  const errors: Errors = {};

  if (!values.nome.trim()) errors.nome = "Informe o nome.";

  // O telefone é o canal das campanhas — sem ele o cliente nunca recebe
  // recall, então é obrigatório mesmo sendo "só" um contato.
  const digits = values.telefone.replace(/\D/g, "");
  if (!digits) errors.telefone = "Informe o WhatsApp.";
  else if (digits.length < 10) errors.telefone = "Número incompleto (DDD + número).";

  if (values.email.trim() && !values.email.includes("@")) {
    errors.email = "E-mail inválido.";
  }

  if (values.dataNascimento.trim() && !toIsoDate(values.dataNascimento)) {
    errors.dataNascimento = "Use o formato dd/mm/aaaa.";
  }

  return errors;
}

export function ClientForm({
  title,
  initialValues,
  submitLabel,
  submitting,
  onSubmit,
}: {
  title: string;
  initialValues: ClientFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ClientFormValues) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});

  const set = (key: keyof ClientFormValues) => (text: string) =>
    setValues((current) => ({ ...current, [key]: text }));

  const handleSubmit = async () => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      await onSubmit(values);
    } catch (error) {
      Alert.alert(
        "Não foi possível salvar",
        error instanceof Error ? error.message : "Erro desconhecido.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FormHeader title={title} />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Nome completo"
          required
          value={values.nome}
          onChangeText={set("nome")}
          error={errors.nome}
          placeholder="Ex: João Silva"
          autoCapitalize="words"
          editable={!submitting}
        />

        <Field
          label="WhatsApp"
          required
          value={values.telefone}
          onChangeText={set("telefone")}
          error={errors.telefone}
          placeholder="11999998888"
          keyboardType="phone-pad"
          editable={!submitting}
        />

        <Field
          label="E-mail"
          value={values.email}
          onChangeText={set("email")}
          error={errors.email}
          placeholder="opcional"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!submitting}
        />

        <Field
          label="Data de nascimento"
          value={values.dataNascimento}
          onChangeText={set("dataNascimento")}
          error={errors.dataNascimento}
          placeholder="dd/mm/aaaa"
          keyboardType="numbers-and-punctuation"
          editable={!submitting}
        />

        <Field
          label="Observações"
          value={values.observacoes}
          onChangeText={set("observacoes")}
          placeholder="Preferências, alergias, etc."
          multiline
          numberOfLines={4}
          style={{ textAlignVertical: "top", minHeight: 96 }}
          editable={!submitting}
        />

        <Pill label={submitLabel} onPress={handleSubmit} loading={submitting} />

        <Text className="text-center text-xs text-ink-muted">
          O WhatsApp é usado nas campanhas de retorno.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
