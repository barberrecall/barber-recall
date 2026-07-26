import {
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  type TextInputProps,
} from "react-native";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";

/**
 * Minimal RN equivalents of the shadcn/ui primitives the web app uses.
 *
 * Deliberately hand-written rather than pulled from a component library: only a
 * handful of primitives are needed, and they inherit the same Tailwind theme
 * tokens as the web build through NativeWind, so the two surfaces stay visually
 * consistent without a second design system.
 */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-xl border border-card-border bg-card p-4 ${className}`}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const isDisabled = disabled || loading;

  const base = "h-12 items-center justify-center rounded-lg px-4 active:opacity-80";
  const look =
    variant === "primary"
      ? "bg-primary"
      : "border border-border bg-transparent";
  const textLook =
    variant === "primary" ? "text-primary-foreground" : "text-foreground";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${base} ${look} ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0A0E1A" : "#F59E0B"} />
      ) : (
        <Text className={`text-base font-semibold ${textLook}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        placeholderTextColor="#8A94A6"
        className="h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground"
        {...props}
      />
    </View>
  );
}

export function StatCard({
  title,
  value,
  icon: Icon,
  tint,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <Card className="flex-1">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-xs font-medium text-muted-foreground"
          numberOfLines={2}
        >
          {title}
        </Text>
        <Icon size={16} color={tint} />
      </View>
      <Text className="mt-2 text-2xl font-bold text-foreground">{value}</Text>
    </Card>
  );
}
