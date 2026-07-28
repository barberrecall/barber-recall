import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

/**
 * Geração e verificação do código de recuperação de senha.
 *
 * Separado das rotas para poder ser testado sem banco e sem servidor — é a
 * parte onde um engano não aparece em uso normal e só se manifesta como conta
 * invadida.
 */

/**
 * Uma hora.
 *
 * Curto o suficiente para um link vazado envelhecer rápido, longo o suficiente
 * para alguém que pediu a recuperação, saiu para atender um cliente e voltou
 * ainda conseguir usar. Quinze minutos gerariam pedidos repetidos; um dia
 * transformaria a caixa de e-mail antiga num vetor de invasão.
 */
export const VALIDADE_MS = 60 * 60 * 1000;

/**
 * 32 bytes de aleatoriedade criptográfica, em base64url.
 *
 * Não é código de seis dígitos de propósito: seis dígitos são um milhão de
 * possibilidades, adivinháveis por força bruta se o freio falhar ou se o
 * atacante distribuir as tentativas. Este código vai num link, então o
 * comprimento não incomoda ninguém.
 */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 do código, que é o que vai para o banco.
 *
 * Hash simples, não bcrypt: o código já tem entropia máxima, então não há
 * ataque de dicionário a impedir, e a verificação precisa ser barata. Bcrypt
 * aqui custaria tempo sem comprar segurança.
 */
export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Comparação em tempo constante, para o tempo de resposta não vazar acertos parciais. */
export function tokensConferem(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function estaVencido(expiresAt: Date, agora: Date = new Date()): boolean {
  return expiresAt.getTime() <= agora.getTime();
}

/**
 * Regras mínimas de senha.
 *
 * Só comprimento. Exigir maiúscula, número e símbolo produz senhas piores na
 * prática — as pessoas respondem com "Senha@123" e variações previsíveis — e
 * afasta quem está tentando recuperar o acesso ao próprio negócio.
 */
export const MIN_SENHA = 8;

export function senhaAceitavel(senha: unknown): { ok: true } | { ok: false; motivo: string } {
  if (typeof senha !== "string" || senha.length === 0) {
    return { ok: false, motivo: "Informe a nova senha." };
  }
  if (senha.length < MIN_SENHA) {
    return { ok: false, motivo: `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.` };
  }
  return { ok: true };
}
