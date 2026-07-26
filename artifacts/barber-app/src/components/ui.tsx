import {
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  type TextInputProps,
} from "react-native";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react-native";

/**
 * Primitivos do sistema visual do app.
 *
 * Três padrões carregam a identidade e se repetem em toda tela:
 *
 *   ScreenHeader  sobrenome pequeno e apagado + título grande e muito pesado
 *   HeroBlock     bloco quase preto com o número principal
 *   GroupedList   container branco com linhas separadas por fio
 *
 * Sem cor de acento: ênfase é peso e contraste. Onde um app colorido usaria
 * âmbar, aqui usa-se preto.
 */

// Cores repetidas em props que não aceitam classe (ícones, placeholders).
export const INK = "#0A0A0B";
export const INK_MUTED = "#8A8A8F";
export const INK_INVERSE = "#FFFFFF";

/** Cabeçalho de tela: o padrão de duas linhas que abre toda tela do app. */
export function ScreenHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-start justify-between px-5 pb-4 pt-2">
      <View className="flex-1">
        <Text className="text-eyebrow text-ink-muted">{eyebrow}</Text>
        <Text className="text-title font-extrabold text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ? <View className="ml-3 pt-1">{right}</View> : null}
    </View>
  );
}

/**
 * O bloco escuro de assinatura.
 *
 * `footer` sai para fora da borda inferior de propósito — no app de referência
 * uma pílula sobreposta a essa aresta é o detalhe que impede o card de parecer
 * uma caixa fechada.
 */
export function HeroBlock({
  label,
  value,
  caption,
  right,
  footer,
  children,
}: {
  label: string;
  value: string;
  caption?: string;
  right?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View className={footer ? "mb-5" : ""}>
      <View className="rounded-hero bg-hero px-5 pb-6 pt-5">
        <View className="flex-row items-start justify-between">
          <Text className="text-eyebrow uppercase tracking-wider text-ink-inverse-muted">
            {label}
          </Text>
          {right}
        </View>

        <Text className="mt-2 text-hero font-extrabold text-ink-inverse">{value}</Text>

        {caption ? (
          <Text className="mt-1 text-sm text-ink-inverse-muted">{caption}</Text>
        ) : null}

        {children}
      </View>

      {footer ? (
        <View className="-mt-4 items-center">{footer}</View>
      ) : null}
    </View>
  );
}

/** Pílula. A forma padrão de tudo que é acionável. */
export function Pill({
  label,
  onPress,
  icon: Icon,
  tone = "surface",
  disabled = false,
  loading = false,
  full = false,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  tone?: "surface" | "ink" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const inactive = disabled || loading;

  const tones = {
    surface: "bg-surface",
    ink: "bg-hero",
    ghost: "bg-transparent border border-hairline",
  } as const;

  const textTone = tone === "ink" ? "text-ink-inverse" : "text-ink";
  const iconColor = tone === "ink" ? INK_INVERSE : INK;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-pill px-5 active:opacity-70 ${
        tones[tone]
      } ${full ? "w-full" : ""} ${inactive ? "opacity-40" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {Icon ? <Icon size={17} color={iconColor} /> : null}
          <Text className={`text-base font-semibold ${textTone}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Pílula pequena, para seletores e contadores no cabeçalho. */
export function Chip({
  label,
  onPress,
  selected = false,
  icon: Icon,
}: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  icon?: LucideIcon;
}) {
  const body = (
    <View
      className={`h-9 flex-row items-center gap-1.5 rounded-pill px-3.5 ${
        selected ? "bg-hero" : "bg-surface"
      }`}
    >
      {Icon ? (
        <Icon size={14} color={selected ? INK_INVERSE : INK_MUTED} />
      ) : null}
      <Text
        className={`text-sm font-semibold ${
          selected ? "text-ink-inverse" : "text-ink"
        }`}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="active:opacity-70"
    >
      {body}
    </Pressable>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-card bg-surface p-5 ${className}`}>{children}</View>
  );
}

/** Container de lista agrupada. As linhas se separam por fio, não por espaço. */
export function GroupedList({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={className}>
      {title ? (
        <Text className="mb-2 px-1 text-eyebrow font-semibold uppercase tracking-wider text-ink-muted">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-card bg-surface">{children}</View>
    </View>
  );
}

/** Linha de lista agrupada. `last` remove o fio para o traço não sobrar solto. */
export function GroupedRow({
  label,
  value,
  onPress,
  icon: Icon,
  last = false,
  accessory,
  subtitle,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: LucideIcon;
  last?: boolean;
  accessory?: ReactNode;
  subtitle?: string;
}) {
  const body = (
    <View
      className={`flex-row items-center gap-3 px-5 py-4 ${
        last ? "" : "border-b border-hairline"
      }`}
    >
      {Icon ? <Icon size={18} color={INK_MUTED} /> : null}

      <View className="flex-1">
        <Text className="text-base text-ink">{label}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-ink-muted">{subtitle}</Text>
        ) : null}
      </View>

      {value ? <Text className="text-base text-ink-muted">{value}</Text> : null}
      {accessory}
      {onPress && !accessory ? (
        <ChevronRight size={18} color={INK_MUTED} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:bg-field">
      {body}
    </Pressable>
  );
}

/** Campo de texto. Preenchido em cinza, sem borda — a borda vinha do genérico. */
export function Input({
  label,
  error,
  required = false,
  ...props
}: TextInputProps & { label?: string; error?: string; required?: boolean }) {
  return (
    <View className="gap-2">
      {label ? (
        <Text className="text-sm font-medium text-ink">
          {label}
          {required ? <Text className="text-ink-muted"> *</Text> : null}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={INK_MUTED}
        className={`min-h-[52px] rounded-field bg-field px-4 py-3.5 text-base text-ink ${
          error ? "border border-ink" : ""
        }`}
        {...props}
      />

      {error ? <Text className="text-sm text-ink">{error}</Text> : null}
    </View>
  );
}

/** Avatar: quadrado arredondado escuro com iniciais, não círculo colorido. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      className="items-center justify-center bg-hero"
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <Text
        className="font-bold text-ink-inverse"
        style={{ fontSize: size * 0.34 }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-8 py-14">
      <Icon size={34} color={INK_MUTED} strokeWidth={1.5} />
      <Text className="mt-4 text-lg font-bold text-ink">{title}</Text>
      <Text className="mt-1 text-center text-base text-ink-muted">
        {description}
      </Text>
      {action ? <View className="mt-6 w-full">{action}</View> : null}
    </View>
  );
}

/**
 * Etiqueta. Sem cor: o contorno separa do fundo e `strong` usa preenchimento
 * escuro para o caso que merece destaque, em vez de trocar a matiz.
 */
export function Badge({
  label,
  strong = false,
}: {
  label: string;
  strong?: boolean;
}) {
  return (
    <View
      className={`self-start rounded-pill px-2.5 py-1 ${
        strong ? "bg-hero" : "bg-field"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          strong ? "text-ink-inverse" : "text-ink-muted"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

/** Rótulo de seção entre blocos, fora de container. */
export function SectionTitle({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between px-1">
      <Text className="text-lg font-bold text-ink">{title}</Text>
      {right}
    </View>
  );
}
