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

/**
 * Insere as barras enquanto a pessoa digita.
 *
 * Sem isto o campo exigia `dd/mm/aaaa` digitado por inteiro, barras incluídas —
 * num teclado numérico, onde a barra nem aparece. Quem digitava só os números
 * recebia "use o formato dd/mm/aaaa" sem entender o que faltava.
 *
 * Aceita apagar: o corte por comprimento é refeito a cada tecla a partir dos
 * dígitos, então o backspace não fica preso na barra.
 */
export function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 8);

  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * `dd/MM/yyyy` (como o usuário digita) para `yyyy-MM-dd` (como a API espera).
 *
 * Recusa data que não existe. A versão anterior só conferia o formato, então
 * `31/02/1990` virava `1990-02-31` e o Postgres derrubava a inserção — o
 * barbeiro via "erro no servidor" ao cadastrar um cliente, sem pista de que o
 * problema era o dia digitado.
 */
export function toIsoDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, dia, mes, ano] = match;
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(ano);

  // Ano mínimo arbitrário mas útil: pega dígito trocado (1090 em vez de 1990)
  // e ninguém vivo nasceu antes disso.
  if (a < 1900) return undefined;
  if (m < 1 || m > 12) return undefined;

  // O construtor normaliza 31/02 para 03/03; comparar de volta é o que revela
  // que o dia não existia naquele mês.
  const teste = new Date(Date.UTC(a, m - 1, d));
  if (teste.getUTCDate() !== d || teste.getUTCMonth() !== m - 1) return undefined;

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
    errors.dataNascimento = "Data inválida. Use dia/mês/ano, como 25/12/1990.";
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
          onChangeText={(t) => set("dataNascimento")(mascaraData(t))}
          error={errors.dataNascimento}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          // Teclado só de números: as barras entram sozinhas pela máscara, e o
          // teclado com pontuação obrigava a procurar a barra que nem precisa.
          keyboardType="number-pad"
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
