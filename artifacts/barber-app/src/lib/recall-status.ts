import type { ClientStatus } from "@workspace/api-client-react";

/**
 * Apresentação do status de recall, sem cor.
 *
 * Ponto único do app: Dashboard, Clientes e Campanhas leem daqui em vez de
 * repetir o `switch`. A skill `client-recall-logic` exige que todas as telas
 * usem a mesma fonte de verdade; o cálculo vive no servidor
 * (`api-server/src/lib/recall.ts`) e o app apenas exibe.
 *
 * O sistema visual do app é monocromático, então status é codificado por
 * **valor**, não por matiz. E a ordem é o inverso do instinto: num campo claro,
 * ênfase é escuridão, logo o status que exige ação é o mais escuro.
 *
 *   Em Risco             preto sólido    precisa de contato agora
 *   Aguardando Retorno   cinza médio     atenção
 *   Ativo                cinza claro     nada a fazer
 *
 * Assim a lista se lê em direção aos problemas. Com âmbar, tudo gritava igual.
 *
 * O `weight` acompanha o valor porque cor sozinha nunca deve carregar
 * significado: o rótulo em negrito reforça a urgência para quem não distingue
 * tons de cinza próximos.
 */
export const RECALL_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Ativo",
  awaiting_return: "Aguardando",
  at_risk: "Em Risco",
};

/** Rótulo longo, para telas de detalhe onde há espaço. */
export const RECALL_STATUS_LABEL_LONG: Record<ClientStatus, string> = {
  active: "Ativo",
  awaiting_return: "Aguardando Retorno",
  at_risk: "Em Risco",
};

export const RECALL_STATUS_MARK: Record<
  ClientStatus,
  { color: string; bold: boolean }
> = {
  at_risk: { color: "#141416", bold: true },
  awaiting_return: { color: "#8A8A8F", bold: false },
  active: { color: "#C6C6CC", bold: false },
};

/** Opções do filtro da tela de Clientes. */
export const RECALL_FILTER_OPTIONS: { value: ClientStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "at_risk", label: "Em Risco" },
  { value: "awaiting_return", label: "Aguardando" },
  { value: "active", label: "Ativos" },
];
