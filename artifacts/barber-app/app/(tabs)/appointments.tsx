import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays } from "lucide-react-native";
import { EmptyState } from "@/components/ui";

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-foreground">Atendimentos</Text>
      </View>

      <EmptyState
        icon={CalendarDays}
        title="Em construção"
        description="A agenda por data e barbeiro é a próxima tela a ser portada."
      />
    </View>
  );
}
