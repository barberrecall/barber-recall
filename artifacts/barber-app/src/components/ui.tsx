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

/**
 * Selo colorido. A cor chega como hex em vez de classe Tailwind porque o
 * NativeWind resolve classes em tempo de build — uma classe montada
 * dinamicamente (`text-${cor}-500`) não existiria no CSS gerado.
 */
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View
      className="self-start rounded-full border px-2 py-0.5"
      style={{ borderColor: `${color}33`, backgroundColor: `${color}1A` }}
    >
      <Text className="text-xs font-medium" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const AVATAR_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#06B6D4",
  "#F97316",
  "#EC4899",
];

/** Mesma regra do web: cor estável derivada do nome. */
export function avatarColor(name: string): string {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function Avatar({ name }: { name: string }) {
  const color = avatarColor(name);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}33` }}
    >
      <Text className="text-sm font-semibold" style={{ color }}>
        {initials}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <View className="items-center px-6 py-16">
      <Icon size={40} color="#8A94A6" />
      <Text className="mt-4 text-base font-semibold text-foreground">{title}</Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        {description}
      </Text>
    </View>
  );
}
