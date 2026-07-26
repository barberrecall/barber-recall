import { View, Text } from "react-native";
import type { ClientStatus } from "@workspace/api-client-react";
import { RECALL_STATUS_LABEL, RECALL_STATUS_MARK } from "@/lib/recall-status";

/**
 * Status de recall como ponto + rótulo.
 *
 * O ponto sozinho não carrega o significado: em monocromático, tons vizinhos de
 * cinza são difíceis de distinguir isolados, então o rótulo está sempre
 * presente e o peso da fonte acompanha a urgência.
 */
export function StatusMark({
  status,
  showLabel = true,
}: {
  status: ClientStatus;
  showLabel?: boolean;
}) {
  const mark = RECALL_STATUS_MARK[status];

  return (
    <View className="flex-row items-center gap-1.5">
      <View
        className="h-2 w-2 rounded-pill"
        style={{ backgroundColor: mark.color }}
      />
      {showLabel ? (
        <Text
          className={`text-sm ${mark.bold ? "font-semibold text-ink" : "text-ink-muted"}`}
        >
          {RECALL_STATUS_LABEL[status]}
        </Text>
      ) : null}
    </View>
  );
}
