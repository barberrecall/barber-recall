import type { CampaignTipo } from "@workspace/api-client-react";

/** Rótulos dos tipos de campanha, iguais aos do CRM web. */
export const CAMPAIGN_TIPO_LABEL: Record<CampaignTipo, string> = {
  return: "Retorno",
  birthday: "Aniversário",
  loyalty: "Fidelidade",
  custom: "Personalizada",
};

/**
 * O campo `dias` muda de significado conforme o tipo (ver skill
 * `campanhas-whatsapp`), então o texto explicativo tem que mudar junto — senão
 * "30 dias" numa campanha de fidelidade seria lido como prazo, quando na
 * verdade é meta de visitas.
 */
export function describeCampaignTrigger(tipo: CampaignTipo, dias: number): string {
  switch (tipo) {
    case "return":
    case "custom":
      return `${dias} dias sem visitar`;
    case "birthday":
      return dias === 0 ? "no dia do aniversário" : `${dias} dias antes do aniversário`;
    case "loyalty":
      return `a cada ${dias} visitas`;
  }
}
