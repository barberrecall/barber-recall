---
name: client-recall-logic
description: Use this skill whenever building or editing features related to client recall/status — calculating "Ativo", "Aguardando Retorno", "Em Risco", displaying recall status on Dashboard/Clientes, or the retorno médio / taxa de retorno metrics in the Barber Recall CRM.
---

# Lógica de Recall de Clientes (Barber Recall CRM)

## Objetivo
Classificar cada cliente num status de recall com base no histórico de
atendimentos, para alimentar o Dashboard (Clientes Ativos, Novos Hoje,
Aguard. Retorno, Em Risco) e a lista de Clientes (filtro "Todos os Status").

## Fonte de verdade
Todo o cálculo vive em `artifacts/api-server/src/lib/recall.ts`. Dashboard,
Clientes, Campanhas e Relatórios importam de lá — nenhuma tela, rota ou query
pode recalcular a regra por conta própria.

## Status (nomenclatura confirmada com o Gledson)
Três status, iguais nas três camadas (banco, API e UI):

| Valor (banco/API) | Rótulo na UI          | Significado                                       |
| ----------------- | --------------------- | ------------------------------------------------- |
| `active`          | Ativo                 | dentro do intervalo esperado de retorno            |
| `awaiting_return` | Aguardando Retorno    | passou do intervalo, dentro da margem de tolerância|
| `at_risk`         | Em Risco              | passou do intervalo + margem; risco real de perda  |

Não existe status `Novo` nem `Perdido`:
- **Novo** — o KPI "Novos Hoje" é contagem por `createdAt` (cadastros do dia),
  um conceito diferente de status de recall. Um cliente recém-cadastrado é
  `Ativo` até vencer a primeira janela.
- **Perdido** — o antigo valor `lost` virou `at_risk` ("Em Risco"). O antigo
  `at_risk` virou `awaiting_return`. Migração de dados:
  `lib/db/sql/rename-recall-status.sql`.

## Dados necessários por cliente
- `ultimoAtendimento` — data do último atendimento (atualizada ao registrar
  um Atendimento)
- `barbershop.diasRetorno` — intervalo esperado de retorno, configurável por
  barbearia (padrão 30 dias). É esse valor, não uma média, que define a janela.

## Cálculo do status
- Referência = `coalesce(ultimoAtendimento, createdAt)`. Quem nunca foi
  atendido é medido a partir do cadastro: cadastrado hoje é `Ativo`,
  cadastrado há meses e nunca atendido é `Em Risco`.
- `dias_desde_referencia <= diasRetorno` → `active`
- `diasRetorno < dias_desde_referencia <= diasRetorno + margem` → `awaiting_return`
- `dias_desde_referencia > diasRetorno + margem` → `at_risk`
- `margem` = `MARGEM_RETORNO_DIAS`, hoje **7 dias** (constante em `recall.ts`).

O status é **derivado em tempo de leitura**, nunca editado à mão — a tela de
edição de cliente mostra o status como somente leitura e a API não aceita
`status` no `PATCH /clients/:id`. A coluna `clients.status` continua existindo
apenas como cache (atualizada ao registrar atendimento) e não é lida para
decidir o status exibido.

## Métricas do Dashboard que dependem dessa lógica
- `Clientes Ativos` / `Aguard. Retorno` / `Em Risco` — contagem por status
  derivado (`countByRecallStatus`)
- `Novos Hoje` — cadastros do dia (`createdAt`), fora da escada de recall
- `Taxa de Retorno` — **janelas fechadas** (`getTaxaRetorno`): cada atendimento
  abre uma janela de `diasRetorno`; a janela entra no denominador só depois de
  fechar (o cliente voltou, ou o prazo venceu) e conta no numerador quando a
  volta aconteceu dentro do prazo. Quem ainda está dentro do prazo fica fora da
  conta. Visitas no mesmo dia contam como uma; agendamentos futuros são
  ignorados. Mesma função alimenta o Dashboard e `/reports/overview`.
- `Retorno Médio` — média de dias entre atendimentos consecutivos
  (`getRetornoMedio`), sobre a mesma base de janelas da Taxa de Retorno: só
  entram as janelas que já tiveram retorno, então apenas clientes recorrentes
  (dois ou mais dias de visita) pesam na média. Não depende de `diasRetorno` —
  mede o ritmo real dos clientes, não a aderência ao intervalo configurado.
  Visitas no mesmo dia contam como uma; agendamentos futuros são ignorados.
  Sai como `tempoMedioRetorno` em `/reports/overview`.

## Campanhas e recall (ver skill `campanhas-whatsapp`)
A tela de Campanhas usa esse mesmo status para montar a lista de
"Disparos de hoje". As duas skills usam exatamente a mesma fonte de verdade pro
status, nunca calculam separado.

`POST /notifications/generate` (`artifacts/api-server/src/routes/notifications.ts`)
seleciona os disparos de `return`/`custom` com `needsRecallContactSql` — o
recall é o **piso**: quem está `active` nunca entra num disparo de retorno,
por mais baixo que seja o `campaign.dias`. Por cima disso a campanha ainda
afina com o `campaign.dias` dela (é um `AND`, decisão de produto confirmada
com o Gledson), então o gatilho efetivo é
`max(diasRetorno, campaign.dias)`.

Duas divergências **intencionais** entre os disparos e os KPIs do Dashboard:
- Campanhas exigem `ultimoAtendimento is not null`; o recall usa
  `coalesce(ultimo_atendimento, created_at)`. Um cliente cadastrado há meses e
  nunca atendido conta como "Em Risco" no Dashboard mas não recebe campanha de
  retorno — a mensagem fala de uma visita que não existe.
- Campanhas só olham clientes com `ativo = true`; os KPIs contam todos.
