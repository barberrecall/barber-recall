import { View, Text, TextInput, Pressable, type TextInputProps } from "react-native";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Campo de texto com rótulo e erro, usado pelos formulários do app. */
export function Field({
  label,
  error,
  required = false,
  ...props
}: TextInputProps & { label: string; error?: string; required?: boolean }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">
        {label}
        {required ? <Text className="text-destructive"> *</Text> : null}
      </Text>

      <TextInput
        placeholderTextColor="#8A94A6"
        className={`min-h-12 rounded-lg border bg-card px-3 py-2.5 text-base text-foreground ${
          error ? "border-destructive" : "border-input"
        }`}
        {...props}
      />

      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}

/** Cabeçalho com botão voltar, comum a todas as telas de formulário. */
export function FormHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-2 border-b border-border px-2 py-3"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        className="h-10 w-10 items-center justify-center rounded-lg active:opacity-70"
      >
        <ChevronLeft size={22} color="#8A94A6" />
      </Pressable>
      <Text className="text-lg font-bold text-foreground">{title}</Text>
    </View>
  );
}

/** Opção selecionável em lista horizontal (barbeiro, serviço, etc.). */
export function ChipOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3 py-2 active:opacity-70 ${
        selected ? "border-primary bg-primary" : "border-border bg-transparent"
      }`}
    >
      <Text
        className={`text-xs font-medium ${
          selected ? "text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-medium uppercase text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}
