import { pgTable, serial, text, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  duracao: integer("duracao").notNull().default(30), // minutes
  ativo: boolean("ativo").notNull().default(true),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof servicesTable.$inferSelect;
