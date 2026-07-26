import { View, Text, Pressable } from "react-native";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { INK, INK_MUTED, INK_INVERSE } from "./ui";

export { Input as Field } from "./ui";

/**
 * Cabeçalho de formulário: voltar + título, no mesmo padrão tipográfico das
 * telas de lista mas sem o sobrenome, porque um formulário não é uma seção.
 */
export function FormHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="h-11 w-11 items-center justify-center rounded-pill active:opacity-60"
        >
          <ChevronLeft size={24} color={INK} />
        </Pressable>
        {right}
      </View>

      <Text className="px-5 pb-4 text-title font-extrabold text-ink">{title}</Text>
    </View>
  );
}

/** Opção em pílula, para escolhas curtas em linha. */
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
      className={`h-10 items-center justify-center rounded-pill px-4 active:opacity-70 ${
        selected ? "bg-hero" : "bg-field"
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          selected ? "text-ink-inverse" : "text-ink-muted"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-eyebrow font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

export { INK, INK_MUTED, INK_INVERSE };
