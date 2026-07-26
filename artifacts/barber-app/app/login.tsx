import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Scissors } from "lucide-react-native";
import { useAuth } from "@/contexts/auth-context";
import { Button, Input } from "@/components/ui";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10 items-center">
          <View className="mb-3 flex-row items-center gap-2">
            <Scissors size={28} color="#F59E0B" />
            <Text className="text-2xl font-bold text-primary">
              BARBER RECALL
            </Text>
          </View>
          <Text className="text-xl font-semibold text-foreground">
            Bem-vindo
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Entre para gerenciar sua barbearia.
          </Text>
        </View>

        <View className="gap-4">
          <Input
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!submitting}
          />

          <Input
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••"
            secureTextEntry
            autoCapitalize="none"
            editable={!submitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {error ? (
            <View className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <Text className="text-sm text-destructive">{error}</Text>
            </View>
          ) : null}

          <Button label="Entrar" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
