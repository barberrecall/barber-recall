import { pgTable, serial, text, boolean, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";

export const barbersTable = pgTable("barbers", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  ativo: boolean("ativo").notNull().default(true),
  foto: text("foto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [index("barbers_barbershop_idx").on(table.barbershopId)],
);

export const insertBarberSchema = createInsertSchema(barbersTable).omit({ id: true, createdAt: true });
export type InsertBarber = z.infer<typeof insertBarberSchema>;
export type Barber = typeof barbersTable.$inferSelect;
