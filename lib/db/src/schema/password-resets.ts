import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Pedidos de recuperação de senha.
 *
 * Guarda o **hash** do código, nunca o código. Quem conseguir ler esta tabela —
 * um vazamento de backup, um `select` num banco de homologação restaurado de
 * produção — não consegue redefinir a senha de ninguém. Pela mesma razão que a
 * coluna de senha guarda hash: a tabela é um alvo, e o que ela contém deve ser
 * inútil fora do fluxo.
 *
 * `usedAt` existe para o código valer **uma vez**. Sem isso, um link de
 * recuperação encaminhado sem querer, ou lido numa caixa de e-mail comprometida
 * meses depois, continuaria abrindo a conta.
 *
 * As linhas não são apagadas ao usar: ficam como registro de que houve troca de
 * senha e quando. É o rastro que permite responder "alguém pediu recuperação da
 * minha conta?" — pergunta que só aparece quando algo deu errado.
 */
export const passwordResetsTable = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // SHA-256 do código enviado por e-mail. Hash simples e não bcrypt de
    // propósito: o código é aleatório e de alta entropia, então não há o que
    // proteger contra dicionário, e a verificação precisa ser rápida — bcrypt
    // aqui só tornaria o fluxo lento sem ganhar segurança.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // A validação entra pelo hash: é o único dado que o portador do código tem.
    index("password_resets_token_idx").on(table.tokenHash),
    // A limpeza de pedidos vencidos varre por data.
    index("password_resets_expires_idx").on(table.expiresAt),
  ],
);

export type PasswordReset = typeof passwordResetsTable.$inferSelect;
