---
name: atendimentos-scheduling
description: Use this skill whenever building or editing the Atendimentos screen — appointment registration, filtering by Data/Barbeiro, or the Faturamento do Dia calculation in the Barber Recall CRM.
---

# Atendimentos (Barber Recall CRM)

## Modelo: registro, não agendamento

Um atendimento representa **um corte que aconteceu**, não um horário marcado.
Não existe coluna `status` (`agendado` / `concluído` / `cancelado`) — a decisão
foi manter o modelo simples, em que a barbearia lança o atendimento depois de
realizá-lo.

**A data é a fonte de verdade.** Todo lugar que pergunta "isso já aconteceu?"
compara `data <= now()`. Quem precisar de agendamento no futuro terá que
introduzir o campo `status` e revisar esta skill inteira junto.

## Telas existentes
- Lista de atendimentos filtrável por `Data` e `Barbeiro` (dropdown "Todos")
- Botão "Novo Agendamento" — cria um atendimento novo
- Card "Faturamento do Dia" — soma o valor dos atendimentos do dia filtrado
- Estado vazio: "Nenhum atendimento para esta data"

## Dados de um atendimento
- `clienteId` — vínculo com o cliente (ver skill `client-recall-logic`)
- `barbershopId` — isolamento por tenant (ver skill `multi-tenant-isolation`)
- `barbeiroId` — qual barbeiro atendeu (usado no filtro "Barbeiro")
- `servicoId` — serviço prestado
- `data` — quando o atendimento aconteceu (`timestamptz`)
- `valor`, `desconto`, `valorFinal` — `valorFinal` é o que conta no faturamento

## Regra importante: atendimento futuro não conta

Um atendimento com `data` no futuro **não é uma visita**. Ele não pode:
- Contar em `totalVisitas`
- Virar o `ultimoAtendimento` do cliente
- Marcar o cliente como `active` no recall

Caso contrário, marcar alguém para semana que vem tiraria o cliente de
"Em Risco" sem ele ter aparecido — justamente quem a campanha de recall
deveria buscar.

## Como manter o cache do cliente correto

`clients.ultimoAtendimento`, `clients.totalVisitas` e `clients.status` são
**cache derivado** dos atendimentos. Depois de criar, editar ou remover um
atendimento, chame:

```ts
import { syncClientRecallCache } from "../lib/recall";
await syncClientRecallCache(clienteId, barbershopId);
```

Ela **recalcula** a partir da tabela `appointments` (filtrando `data <= now()`)
em vez de incrementar contadores. Isso importa: a versão anterior incrementava
`totalVisitas` no POST e não fazia nada no PATCH nem no DELETE, então apagar um
atendimento deixava o cliente com uma visita fantasma. Recalcular é
autocorretivo — conserta dados já inconsistentes na primeira escrita.

Nunca escreva nesses três campos direto de uma rota.

## Faturamento do Dia

Soma de `valorFinal` dos atendimentos da data filtrada. É calculado **no
cliente**, com um `reduce` sobre a lista que a API já retornou — tanto no CRM
web (`pages/appointments/index.tsx`) quanto no app
(`app/(tabs)/appointments.tsx`). As duas telas devem usar o mesmo cálculo para
nunca mostrarem números diferentes para o mesmo indicador.

## Relação com o Dashboard
- `Atend. Hoje` = contagem de atendimentos com `data` = hoje
- `Faturamento` (Dashboard) = soma de `valorFinal` dos atendimentos de hoje —
  mesmo cálculo do "Faturamento do Dia"
- `Ticket Médio` = faturamento do período / número de atendimentos no período
