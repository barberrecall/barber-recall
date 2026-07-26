/**
 * Coerção de valores vindos de formulário para colunas tipadas.
 *
 * Motivo de existir: um formulário representa "campo vazio" como string vazia, e
 * o Postgres rejeita `''` em qualquer coluna que não seja texto — `date`,
 * `integer`, `numeric`. Sem tratamento a query inteira falha com 500, e o
 * usuário vê "erro no servidor" ao tentar apagar uma data de nascimento.
 *
 * Já apareceu em /clients, /coupons, /campaigns e /appointments; daí o
 * utilitário compartilhado em vez de um remendo por rota.
 *
 * São dois comportamentos, e escolher o errado troca um bug por outro:
 *
 *   - Coluna NULÁVEL: vazio significa "limpar" -> null.
 *   - Coluna NOT NULL: vazio é entrada inválida -> 400 com mensagem. Mandar
 *     null aqui violaria a restrição e daria outro 500.
 */

const isBlank = (value: unknown): boolean =>
  value === "" || value === null || (typeof value === "string" && value.trim() === "");

/**
 * Para colunas nuláveis. Vazio vira `null` (limpar); ausente devolve
 * `undefined`, que o chamador usa para não incluir o campo no update.
 */
export function nullIfBlank<T>(value: T): T | null | undefined {
  if (value === undefined) return undefined;
  return isBlank(value) ? null : value;
}

/**
 * Inteiro para coluna nulável (ex: `barbeiro_id`). Vazio vira `null`; texto que
 * não é número acumula erro em vez de chegar ao banco.
 */
export function nullableInt(
  value: unknown,
  field: string,
  errors: string[],
): number | null | undefined {
  if (value === undefined) return undefined;
  if (isBlank(value)) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    errors.push(`${field} deve ser um número inteiro.`);
    return undefined;
  }

  return parsed;
}

/**
 * Número para coluna NOT NULL (ex: `valor`, `dias`, `duracao`). Vazio é erro de
 * validação, não ausência — quem não quer mudar o campo simplesmente não o envia.
 */
export function requiredNumber(
  value: unknown,
  field: string,
  errors: string[],
  options: { integer?: boolean; min?: number } = {},
): number | undefined {
  if (value === undefined) return undefined;

  if (isBlank(value)) {
    errors.push(`${field} não pode ficar vazio.`);
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${field} deve ser um número.`);
    return undefined;
  }
  if (options.integer && !Number.isInteger(parsed)) {
    errors.push(`${field} deve ser um número inteiro.`);
    return undefined;
  }
  if (options.min !== undefined && parsed < options.min) {
    errors.push(`${field} não pode ser menor que ${options.min}.`);
    return undefined;
  }

  return parsed;
}

/**
 * Data para coluna `timestamp` NOT NULL. Cobre também o caso silencioso de
 * `new Date("qualquer coisa")`, que devolve Invalid Date e só falha no banco.
 */
export function requiredDate(
  value: unknown,
  field: string,
  errors: string[],
): Date | undefined {
  if (value === undefined) return undefined;

  if (isBlank(value)) {
    errors.push(`${field} não pode ficar vazio.`);
    return undefined;
  }

  const parsed = new Date(value as string);

  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${field} não é uma data válida.`);
    return undefined;
  }

  return parsed;
}
