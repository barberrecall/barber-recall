-- Renomeia os valores de `clients.status` para a escada de recall da skill
-- `client-recall-logic`: active / awaiting_return / at_risk.
--
-- Mapeamento:
--   at_risk (antigo "Em Risco", 1º estágio de atraso) -> awaiting_return
--   lost    (antigo "Perdido")                        -> at_risk
--
-- A ordem importa: renomear `lost` primeiro colidiria com o `at_risk` antigo.
-- Não há mudança de schema (a coluna é `text`), então `drizzle-kit push` não
-- cobre isso — rode este script uma vez, manualmente:
--   psql "$DATABASE_URL" -f lib/db/sql/rename-recall-status.sql
--
-- Os status exibidos são derivados de `ultimo_atendimento` em tempo de leitura
-- (artifacts/api-server/src/lib/recall.ts); esta coluna é só cache, então o
-- script é seguro de rodar mesmo com a aplicação no ar.

begin;

update clients set status = 'awaiting_return' where status = 'at_risk';
update clients set status = 'at_risk'         where status = 'lost';

commit;
