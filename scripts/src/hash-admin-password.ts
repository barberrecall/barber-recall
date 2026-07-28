/**
 * Gera o hash bcrypt para a variável ADMIN_PASSWORD.
 *
 * `routes/adminAuth.ts` aceita a variável em texto puro ou como hash bcrypt, e
 * decide pelo prefixo `$2`. Texto puro funciona, mas deixa a senha do super
 * admin legível para qualquer pessoa com acesso ao painel da hospedagem — e o
 * super admin enxerga todas as barbearias. O hash remove esse problema sem
 * custo nenhum.
 *
 * Lê a senha de STDIN, não de argumento de linha de comando: argumento fica no
 * histórico do shell e aparece na lista de processos da máquina.
 *
 * Uso:
 *   pnpm --filter @workspace/scripts run hash:admin
 *   (digite a senha, tecle Enter)
 *
 * Depois cole SÓ o hash em ADMIN_PASSWORD. A senha em si não precisa existir em
 * lugar nenhum além da sua cabeça ou do seu gerenciador de senhas.
 */
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";

const CUSTO = 12;

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });

  const senha = (await rl.question("Senha do admin (não será exibida em log): ")).trim();
  rl.close();

  if (senha.length < 12) {
    console.error(
      `\nSenha de ${senha.length} caracteres é curta demais para uma credencial que ` +
        `dá acesso a todas as barbearias. Use 12 ou mais.\n`,
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, CUSTO);

  // Só o hash no stdout, para permitir redirecionar sem arrastar instrução junto.
  console.log(hash);
  console.error("\nCole o valor acima em ADMIN_PASSWORD. Não guarde a senha em arquivo.\n");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
