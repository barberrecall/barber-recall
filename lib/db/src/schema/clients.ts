import { pgTable, serial, text, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  dataNascimento: date("data_nascimento", { mode: "string" }),
  observacoes: text("observacoes"),
  // Cache do status de recall (active | awaiting_return | at_risk). A fonte de
  // verdade é o cálculo em artifacts/api-server/src/lib/recall.ts — as leituras
  // derivam o status de `ultimoAtendimento` + `barbershop.diasRetorno`.
  status: text("status").notNull().default("active"),
  ativo: boolean("ativo").notNull().default(true),
  totalVisitas: integer("total_visitas").notNull().default(0),
  ultimoAtendimento: timestamp("ultimo_atendimento", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
