import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const barbershopTable = pgTable("barbershop", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().default(""),
  email: text("email").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  logo: text("logo"),
  corPrimaria: text("cor_primaria").notNull().default("#000000"),
  corSecundaria: text("cor_secundaria"),
  whatsapp: text("whatsapp"),
  instagram: text("instagram"),
  mensagemPadrao: text("mensagem_padrao"),
  diasRetorno: integer("dias_retorno").notNull().default(30),
  plan: text("plan").notNull().default("free"),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  trialStartsAt: timestamp("trial_starts_at", { withTimezone: true }).notNull().defaultNow(),
  trialNotifiedAt: timestamp("trial_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    // O login resolve a barbearia a partir do usuário.
    index("barbershop_user_idx").on(table.userId),
  ],
);

export const insertBarbershopSchema = createInsertSchema(barbershopTable).omit({ id: true, createdAt: true });
export type InsertBarbershop = z.infer<typeof insertBarbershopSchema>;
export type Barbershop = typeof barbershopTable.$inferSelect;
