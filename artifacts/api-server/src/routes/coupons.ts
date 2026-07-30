import { Router, type IRouter } from "express";
import { nullIfBlank, nullableInt, requiredNumber } from "../lib/coerce";
import { tipoValido } from "../lib/cupom";
import { eq, and } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";

const router: IRouter = Router();

function genCode(): string {
  const prefixes = ["BARBER", "VOLTA", "VIP", "CRM", "CORTE"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${prefix}${num}`;
}

const fmt = (c: typeof couponsTable.$inferSelect) => ({
  id: c.id,
  codigo: c.codigo,
  tipo: c.tipo,
  valor: parseFloat(c.valor),
  validade: c.validade ?? null,
  ativo: c.ativo,
  usoMaximo: c.usoMaximo ?? null,
  usoAtual: c.usoAtual,
});

router.get("/coupons", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(couponsTable).where(eq(couponsTable.barbershopId, barbershopId)).orderBy(couponsTable.id);
  res.json(rows.map(fmt));
});

router.post("/coupons", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { codigo, tipo, valor, validade, usoMaximo, ativo } = req.body;
  const errors: string[] = [];

  // Coerção antes de qualquer escrita, mesmo padrão de appointments.ts: um
  // valor não numérico chegando direto na coluna `numeric` derrubava a query
  // com erro genérico do Postgres em vez de dizer o que está errado.
  const valorNumerico = requiredNumber(valor, "valor", errors, { min: 0.01 });
  const tipoFinal = tipoValido(tipo, errors);
  const usoMaximoFinal = nullableInt(usoMaximo, "usoMaximo", errors);

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }

  const code = (codigo?.trim().toUpperCase() || genCode());
  try {
    const [c] = await db.insert(couponsTable).values({
      barbershopId,
      codigo: code,
      tipo: tipoFinal!,
      valor: String(valorNumerico),
      validade: validade || null,
      usoMaximo: usoMaximoFinal ?? null,
      // Nenhuma tela cria um cupom já desativado hoje — o fluxo do produto é
      // criar ativo e desativar depois, na listagem. O campo é aceito mesmo
      // assim porque o contrato (CouponInput) o declara, e um servidor que
      // ignora um campo que promete aceitar é o tipo de bug que só aparece
      // quando alguém integra por fora das telas.
      ...(ativo !== undefined ? { ativo: Boolean(ativo) } : {}),
    }).returning();
    res.status(201).json(fmt(c));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Já existe um cupom com este código." });
    } else {
      res.status(500).json({ error: "Erro ao criar cupom." });
    }
  }
});

router.patch("/coupons/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { codigo, tipo, valor, validade, ativo, usoMaximo } = req.body;
  const errors: string[] = [];

  // `validade` é coluna `date` e `uso_maximo` é integer: vazio precisa virar
  // null, senão o Postgres rejeita '' e a query inteira falha com 500.
  const orNull = nullIfBlank;

  const updates: Record<string, unknown> = {};
  if (codigo !== undefined) updates.codigo = codigo;
  // Mesma validação da criação: sem ela, "Percent" com maiúscula ou um erro
  // de digitação passava direto para a coluna, e o cálculo de desconto trata
  // qualquer coisa diferente de "percent" como fixo — um cupom de 20% virando
  // R$ 20,00 fixo, sem aviso nenhum.
  if (tipo !== undefined) {
    const t = tipoValido(tipo, errors);
    if (t !== undefined) updates.tipo = t;
  }
  if (valor !== undefined) {
    const v = requiredNumber(valor, "valor", errors, { min: 0.01 });
    if (v !== undefined) updates.valor = String(v);
  }
  if (validade !== undefined) updates.validade = orNull(validade);
  if (ativo !== undefined) updates.ativo = Boolean(ativo);
  if (usoMaximo !== undefined) {
    const u = nullableInt(usoMaximo, "usoMaximo", errors);
    // `undefined` aqui significa erro de validação (já registrado acima), não
    // "sem limite" — só escreve em `updates` quando o valor foi mesmo aceito.
    // O guard de `errors.length > 0` abaixo intercepta antes do update rodar,
    // mas deixar `updates` correto evita um estado intermediário confuso.
    if (u !== undefined) updates.usoMaximo = u;
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }

  const [c] = await db.update(couponsTable).set(updates).where(and(eq(couponsTable.id, id), eq(couponsTable.barbershopId, barbershopId))).returning();
  if (!c) { res.status(404).json({ error: "not found" }); return; }
  res.json(fmt(c));
});

router.delete("/coupons/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(couponsTable).where(and(eq(couponsTable.id, id), eq(couponsTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

export default router;
