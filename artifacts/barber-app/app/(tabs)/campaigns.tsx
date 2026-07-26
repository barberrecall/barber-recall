import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageSquare } from "lucide-react-native";
import { EmptyState } from "@/components/ui";

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-foreground">Campanhas</Text>
      </View>

      <EmptyState
        icon={MessageSquare}
        title="Em construção"
        description="Os disparos de hoje e o envio em um clique vêm em seguida."
      />
    </View>
  );
}
