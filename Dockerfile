# Build da API para hospedagem.
#
# Existe porque o Nixpacks (o construtor padrão do Railway) não dá conta deste
# projeto: ele fixa `corepack@0.24.1`, que é anterior ao pnpm 11 e falha com
# ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING ao tentar carregá-lo. E o pnpm 11 é
# necessário porque os `overrides` deste workspace vivem em pnpm-workspace.yaml,
# seção que só o pnpm 10+ lê.
#
# Aqui o pnpm vem por `npm install -g`, contornando o corepack inteiro. Uma
# imagem só, sem multi-estágio: fica maior, mas não corre o risco de deixar para
# trás um arquivo de runtime — o bundle do esbuild acompanha workers separados
# do pino (pino-worker.mjs, thread-stream-worker.mjs) que precisam existir ao lado
# do índice.
FROM node:24-slim

WORKDIR /app

# A versão precisa ser a mesma que escreveu o pnpm-lock.yaml, senão a instalação
# congelada é recusada.
RUN npm install -g pnpm@11.17.0

# O contexto respeita o .gitignore/.dockerignore, então node_modules não entra.
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

# O Railway injeta PORT; o servidor lança erro claro se ela faltar.
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
