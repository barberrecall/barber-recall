---
name: multi-tenant-isolation
description: Use this skill whenever creating, editing, or reviewing any query, endpoint, model, or UI screen in the Barber Recall CRM project. Ensures every piece of data is correctly scoped to a single barbershop (tenant), preventing one barbershop from ever seeing or modifying another's data.
---

# Isolamento Multi-tenant (Barber Recall CRM)

## Contexto
Este é um SaaS onde várias barbearias (tenants) usam o mesmo sistema.
Cada barbearia só pode ver e mexer nos próprios dados — clientes, cortes,
histórico, usuários da equipe, tudo.

## Regra de ouro
TODA tabela que armazena dado específico de uma barbearia precisa ter uma
coluna `barbershop_id` (ou `tenant_id`). TODA query de leitura/escrita
precisa filtrar por esse campo, sem exceção.

Nunca confiar em filtro feito só no frontend. O filtro por `barbershop_id`
tem que estar na camada de backend/banco (idealmente com Row Level Security
se o banco suportar, como Postgres/Supabase).

## Checklist ao criar uma nova funcionalidade
- [ ] A tabela nova tem `barbershop_id`?
- [ ] Toda query (SELECT/UPDATE/DELETE) filtra por `barbershop_id` vindo da
      sessão autenticada — nunca de um parâmetro que o usuário pode alterar
      na URL ou no body da requisição
- [ ] O `barbershop_id` usado nas queries vem do token/sessão do usuário
      logado, não de um campo enviado pelo frontend (isso evitaria que
      alguém manipule a requisição e acesse dados de outra barbearia)
- [ ] Endpoints de admin/relatório também respeitam o isolamento, a menos
      que seja explicitamente uma tela de "super admin" da plataforma

## Estrutura recomendada de autenticação
- Usuário pertence a UMA barbearia (via `barbershop_id` no registro do usuário)
- Ao logar, o sistema já sabe automaticamente qual barbearia filtrar —
  o usuário nunca escolhe/digita isso manualmente
- Se no futuro um usuário puder ter acesso a múltiplas barbearias (ex: dono
  de rede), aí sim criar uma tabela de vínculo `user_barbershop` com seleção
  de contexto ativo

## Teste mental antes de aprovar qualquer código
"Se eu logar como Barbearia A e trocar o ID na URL/request pra tentar ver
dado da Barbearia B, o sistema bloqueia?" Se a resposta não for um "sim"
óbvio olhando o código, a query está errada.
