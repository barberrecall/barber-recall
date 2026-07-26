import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbershopTable } from "./barbershop";
import { clientsTable } from "./clients";
import { campaignsTable } from "./campaigns";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  barbershopId: integer("barbershop_id").notNull().references(() => barbershopTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | sent | failed
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  /**
   * Quem abriu o WhatsApp para este disparo (skill `campanhas-whatsapp`).
   *
   * Nulável por dois motivos: disparos pendentes ainda não foram enviados por
   * ninguém, e os registros criados antes desta coluna existir não têm autoria.
   * `set null` na exclusão preserva o histórico de envio mesmo se a conta sair.
   *
   * Hoje cada barbearia tem um usuário só, então o valor é sempre o mesmo. O
   * campo existe para que o histórico já esteja completo quando houver logins
   * de equipe — criar a coluna depois deixaria um vão nos dados anteriores.
   */
  sentBy: integer("sent_by").references(() => usersTable.id, { onDelete: "set null" }),
  opened: boolean("opened").notNull().default(false),
  clicked: boolean("clicked").notNull().default(false),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
