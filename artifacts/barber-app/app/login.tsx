import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "@/contexts/auth-context";

/**
 * Login: a única tela escura do app.
 *
 * A inversão é deliberada — o app é claro, e abrir no escuro dá peso ao primeiro
 * contato em vez de entregar direto o mesmo cinza de todas as telas.
 *
 * A marca aqui é o quadrado escuro com o monograma, não um ícone de tesoura: o
 * sistema é monocromático e tipográfico, então a identidade vem da letra.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !senha) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(email.trim(), senha);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-night"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-12 items-center">
          <View className="h-[86px] w-[86px] items-center justify-center rounded-[26px] bg-night-field">
            <Text className="text-5xl font-extrabold text-white">b</Text>
          </View>

          <Text className="mt-4 text-eyebrow uppercase tracking-[3px] text-night-muted">
            Barber Recall
          </Text>

          <Text className="mt-8 text-title font-extrabold text-white">
            Bem-vindo
          </Text>
          <Text className="mt-1 text-base text-night-muted">
            Entre para gerenciar sua barbearia.
          </Text>
        </View>

        <View className="gap-3">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#8A8A8F"
            className="min-h-[56px] rounded-field bg-night-field px-5 text-base text-white"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!submitting}
          />

          <View className="flex-row gap-2">
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor="#8A8A8F"
              className="min-h-[56px] flex-1 rounded-field bg-night-field px-5 text-base text-white"
              secureTextEntry={!revealed}
              autoCapitalize="none"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <Pressable
              onPress={() => setRevealed((current) => !current)}
              accessibilityRole="button"
              accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
              className="w-[56px] items-center justify-center rounded-field bg-night-field active:opacity-70"
            >
              {revealed ? (
                <EyeOff size={20} color="#8A8A8F" />
              ) : (
                <Eye size={20} color="#8A8A8F" />
              )}
            </Pressable>
          </View>

          {error ? <Text className="px-1 text-sm text-white">{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityState={{ busy: submitting }}
            className={`mt-3 h-[56px] flex-row items-center justify-center gap-2 rounded-pill bg-white active:opacity-80 ${
              submitting ? "opacity-50" : ""
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#0A0A0B" />
            ) : (
              <>
                <Text className="text-base font-bold text-ink">Entrar</Text>
                <ArrowRight size={18} color="#0A0A0B" />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
