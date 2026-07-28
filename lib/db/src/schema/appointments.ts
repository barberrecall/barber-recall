import { pgTable, serial, integer, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";
import { clientsTable } from "./clients";
import { barbersTable } from "./barbers";
import { servicesTable } from "./services";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  clienteId: integer("cliente_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  barbeiroId: integer("barbeiro_id").references(() => barbersTable.id, { onDelete: "set null" }),
  servicoId: integer("servico_id").references(() => servicesTable.id, { onDelete: "set null" }),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull().default("0"),
  desconto: numeric("desconto", { precision: 10, scale: 2 }).notNull().default("0"),
  valorFinal: numeric("valor_final", { precision: 10, scale: 2 }).notNull().default("0"),
  data: timestamp("data", { withTimezone: true }).notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    // A agenda é sempre "desta barbearia, nesta data" — o par serve o filtro e a
    // ordenação numa varredura só.
    index("appointments_barbershop_data_idx").on(table.barbershopId, table.data),
    // Histórico de um cliente e recálculo de recall entram por aqui.
    index("appointments_cliente_idx").on(table.clienteId),
  ],
);

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
