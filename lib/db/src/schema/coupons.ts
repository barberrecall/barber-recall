import { pgTable, serial, text, boolean, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  codigo: text("codigo").notNull(),
  tipo: text("tipo").notNull().default("percent"), // percent | fixed
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  validade: date("validade", { mode: "string" }),
  ativo: boolean("ativo").notNull().default(true),
  usoMaximo: integer("uso_maximo"),
  usoAtual: integer("uso_atual").notNull().default(0),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true, usoAtual: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
