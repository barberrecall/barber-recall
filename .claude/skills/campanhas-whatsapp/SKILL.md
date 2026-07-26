---
name: campanhas-whatsapp
description: Use this skill whenever building or editing the Campanhas screen — campaign creation, "Disparos de hoje" list, one-click WhatsApp send, or automatic trigger configuration in the Barber Recall CRM.
---

# Campanhas Automáticas via WhatsApp (Barber Recall CRM)

## Como funciona hoje (baseado nas telas existentes)
- "Nova Campanha" — cria uma campanha com uma mensagem template
- "Disparos de hoje" — lista de clientes que precisam de contato agora,
  calculada a partir do status de recall (ver skill `client-recall-logic`)
- Envio é feito com "um clique", via WhatsApp — ou seja, o sistema NÃO manda
  a mensagem sozinho automaticamente (não usa API oficial do WhatsApp
  Business enviando sem interação). Ele monta o link `wa.me/<numero>?text=<mensagem>`
  e abre o WhatsApp do próprio barbeiro pra ele confirmar e apertar enviar
- "Campanhas configuradas" — mostra os gatilhos automáticos definidos, ex:
  "toda vez que um cliente entrar em Em Risco, sugerir campanha X"

## Regra importante sobre "automático"
O termo "automática" aqui significa que o SISTEMA identifica sozinho quem
precisa ser contatado e prepara a mensagem — não que ele envia sem
intervenção humana. Isso é uma decisão de produto (evita problemas de
banimento de número no WhatsApp por envio em massa não solicitado, e mantém
compliance mais simples). Não implementar envio automático real (via API
oficial do WhatsApp Business ou serviços tipo Twilio) sem confirmação
explícita — é uma mudança de arquitetura e de custo (APIs de WhatsApp
Business cobram por mensagem).

## Dados de uma campanha (`campaigns`, ver `lib/db/src/schema/campaigns.ts`)
- `mensagem` — texto com variáveis `{nome}`, `{barbearia}`, `{dias}`,
  `{cupom_texto}`, resolvidas em `resolveMessage` (`routes/notifications.ts`)
- `tipo` — `return` | `birthday` | `loyalty` | `custom`
- `dias` — significado depende do `tipo`: dias após a última visita
  (`return`/`custom`), dias de antecedência (`birthday`), meta de visitas
  (`loyalty`, usado como `totalVisitas % dias = 0`)
- `cupomId` — cupom opcional anexado à campanha
- `ativo` — campanha desligada não gera disparo
- `barbershopId` — toda campanha pertence a UMA barbearia (ver skill
  `multi-tenant-isolation`)

Não existe coluna `trigger_status`: quem decide o status que dispara é o
recall, igual para todas as campanhas (abaixo).

## Quem entra nos "Disparos de hoje"
`POST /notifications/generate` gera os pendentes. Para `return`/`custom` o
filtro é o `needsRecallContactSql` de `artifacts/api-server/src/lib/recall.ts`
— nunca uma conta local sobre `ultimoAtendimento`. O recall é o **piso**
(`awaiting_return` ou `at_risk`) e o `campaign.dias` afina por cima, num `AND`:
o gatilho efetivo é `max(barbershop.diasRetorno, campaign.dias)`.

Consequência prática: baixar o `dias` de uma campanha abaixo do `diasRetorno`
da barbearia não faz ela disparar mais cedo — para antecipar, é o
`diasRetorno` em Configurações que precisa mudar, e isso move o recall inteiro
(Dashboard e Clientes junto). É de propósito: as duas telas nunca discordam
sobre quem está atrasado.

Divergências intencionais com os KPIs do Dashboard: os disparos exigem
`ultimoAtendimento is not null` (quem nunca foi atendido não recebe campanha de
retorno, apesar de contar como "Em Risco") e só olham clientes com
`ativo = true`.

## Registro de disparo
Quando o barbeiro clica pra enviar (abre o WhatsApp), `PATCH
/notifications/:id/sent` grava `status = sent`, `sent_at` e `sent_by`. O
`client_id` e o `campaign_id` já existem na linha desde a geração.

`sent_by` vem de `req.session.userId` — nunca do corpo da requisição, que
permitiria atribuir o envio a outra pessoa. É nulável: disparos pendentes não
foram enviados por ninguém, e as linhas criadas antes da coluna existir não têm
autoria (a API devolve `sentByNome: null` e a tela omite o "por ...").

Hoje cada barbearia tem um usuário só, então o valor é sempre o mesmo. O campo
existe para o histórico já estar completo quando houver logins de equipe.

Isso alimenta a métrica "Camp. Enviadas" e depois a "Taxa de Retorno"
(comparando quem recebeu campanha e voltou vs quem recebeu e não voltou).

## Cupons
A métrica "Cupons Usados" indica que campanhas podem incluir um código de
cupom de desconto. Se for implementar, cupom deve ter: código único,
validade, e vínculo com `barbershop_id` — nunca um cupom global entre
barbearias diferentes.
