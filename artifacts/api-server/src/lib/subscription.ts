/**
 * Identidade de um mês de assinatura.
 *
 * Autorizar uma assinatura dispara `subscription_preapproval`; a cobrança
 * daquele mesmo mês chega como `subscription_authorized_payment`. São duas
 * notificações com ids diferentes falando do mesmo mês pago — deduplicar pelo
 * id da notificação concederia 60 dias por 30 dias de dinheiro.
 *
 * Amarrando a chave à assinatura e ao mês, a segunda notificação vira repetição
 * e o mês seguinte gera chave nova. Isso também dispensa saber se o Mercado
 * Pago dispara `subscription_authorized_payment` já na primeira cobrança ou só
 * da segunda em diante — funciona nas duas hipóteses.
 *
 * Vive fora de `routes/payment.ts` para poder ser testada sem banco e sem
 * servidor: é a única linha do fluxo de cobrança onde um engano custa dinheiro
 * de forma silenciosa.
 */

/**
 * @param preapprovalId - id da assinatura no Mercado Pago.
 * @param quando - data da cobrança. Vem da `debit_date` da fatura, não de
 *   `now()`, para que notificação atrasada caia no mês que ela cobrou.
 */
export function chaveDoPeriodo(preapprovalId: string, quando: Date): string {
  return `${preapprovalId}:${quando.toISOString().slice(0, 7)}`;
}
