import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { barbershopTable } from "./barbershop";

/**
 * Notificações de pagamento já processadas.
 *
 * Existe para que a mesma notificação nunca conceda tempo de plano duas vezes.
 * O webhook empilha 30 dias sobre o prazo restante de propósito — assim quem
 * renova cedo não é punido —, mas essa mesma regra fazia com que reenviar a
 * notificação de um pagamento aprovado rendesse 30 dias a cada reenvio. Uma
 * cobrança de R$ 69,90 podia virar anos de acesso.
 *
 * A validação de assinatura fecha a porta da frente; esta tabela fecha a de
 * trás. As duas juntas porque uma retentativa legítima do próprio Mercado Pago
 * — que acontece quando nossa resposta demora — vem com assinatura válida e
 * também não pode conceder tempo de novo.
 *
 * `tipo` + `externalId` é único: o id vem numerado por recurso no Mercado Pago,
 * então um pagamento e uma assinatura podem coincidir de número sem serem a
 * mesma coisa.
 */
export const paymentNotificationsTable = pgTable(
  "payment_notifications",
  {
    id: serial("id").primaryKey(),
    // "payment" | "subscription_preapproval" — o campo `type` do webhook.
    tipo: text("tipo").notNull(),
    // Id do recurso no Mercado Pago. Texto porque o MP não promete que caiba
    // num inteiro, e comparar como texto evita depender disso.
    externalId: text("external_id").notNull(),
    // Sem cascade: se a barbearia for apagada, o registro de que aquele
    // pagamento já foi processado continua valendo. Perdê-lo reabriria a
    // brecha para o mesmo id ser reprocessado.
    barbershopId: integer("barbershop_id").references(() => barbershopTable.id, {
      onDelete: "set null",
    }),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_notifications_tipo_external_id_idx").on(
      table.tipo,
      table.externalId,
    ),
  ],
);

export type PaymentNotification = typeof paymentNotificationsTable.$inferSelect;
