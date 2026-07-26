import type { ClientStatus } from "@workspace/api-client-react";

/**
 * Apresentação do status de recall — rótulo e cor.
 *
 * Ponto único do app: Dashboard, Clientes e Campanhas leem daqui em vez de
 * repetir o `switch`. A skill `client-recall-logic` exige que todas as telas
 * usem a mesma fonte de verdade do status; o cálculo em si vive no servidor
 * (`api-server/src/lib/recall.ts`) e o app apenas exibe o que vem da API.
 *
 * As cores espelham as do CRM web (`pages/clients/index.tsx`) para que as duas
 * superfícies não divirjam.
 */
export const RECALL_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Ativo",
  awaiting_return: "Aguardando Retorno",
  at_risk: "Em Risco",
};

/** Cor do texto/borda do selo, em hex — RN não resolve classes dinâmicas. */
export const RECALL_STATUS_COLOR: Record<ClientStatus, string> = {
  active: "#10B981",
  awaiting_return: "#F59E0B",
  at_risk: "#EF4444",
};

/** Opções do filtro "Todos os Status" da tela de Clientes. */
export const RECALL_FILTER_OPTIONS: { value: ClientStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "awaiting_return", label: "Aguardando" },
  { value: "at_risk", label: "Em Risco" },
];
