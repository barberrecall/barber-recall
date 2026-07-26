import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react-native";
import { INK_MUTED, INK_INVERSE } from "./ui";

/**
 * Barra de abas flutuante.
 *
 * Substitui a barra padrão colada na borda inferior — que é justamente um dos
 * traços que faziam o app parecer genérico. Aqui ela é uma pílula solta sobre o
 * conteúdo, e a aba ativa é uma pílula escura dentro dela.
 *
 * Ícone e rótulo ficam lado a lado, não empilhados: o rótulo só aparece na aba
 * ativa, então a barra não vira uma fileira de textos competindo entre si.
 */
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  appointments: CalendarDays,
  campaigns: MessageSquare,
  more: MoreHorizontal,
};

const LABELS: Record<string, string> = {
  dashboard: "Início",
  clients: "Clientes",
  appointments: "Agenda",
  campaigns: "Campanhas",
  more: "Mais",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-0 right-0 items-center"
      style={{ bottom: insets.bottom + 8 }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center gap-1 rounded-pill bg-surface p-1.5 shadow-sm">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = ICONS[route.name];
          if (!Icon) return null;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (!focused) navigation.navigate(route.name);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={LABELS[route.name]}
              className={`h-11 flex-row items-center gap-1.5 rounded-pill active:opacity-70 ${
                focused ? "bg-hero px-3.5" : "px-3"
              }`}
            >
              <Icon
                size={19}
                color={focused ? INK_INVERSE : INK_MUTED}
                strokeWidth={focused ? 2.2 : 1.9}
              />
              {focused ? (
                <Text className="text-sm font-semibold text-ink-inverse">
                  {LABELS[route.name]}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
