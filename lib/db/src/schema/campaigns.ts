import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";
import { couponsTable } from "./coupons";

/**
 * Gatilho padrão de uma campanha, em dias. Espelha o `diasRetorno` padrão da
 * barbearia (ver `barbershop.ts`) de propósito: os disparos de retorno usam
 * `max(barbershop.diasRetorno, campaign.dias)`, então um default menor que o
 * da barbearia seria sempre engolido pelo recall e nunca teria efeito.
 */
export const DIAS_CAMPANHA_PADRAO = 30;

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("return"), // return | birthday | loyalty | custom
  dias: integer("dias").notNull().default(DIAS_CAMPANHA_PADRAO),
  mensagem: text("mensagem").notNull(),
  cupomId: integer("cupom_id").references(() => couponsTable.id, { onDelete: "set null" }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
