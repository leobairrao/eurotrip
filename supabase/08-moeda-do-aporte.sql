-- ============================================================
-- 08 — Cada aporte guarda a própria moeda  (06/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO, na palavra dele: "deixa para eu selecionar mesmo real ou
-- euro, mas quero ter certeza que será contabilizado nos valores
-- monetários (que sempre contarei em real)".
--
-- O QUE ESTAVA ERRADO, E É SÉRIO.
-- A tabela `contribution` nunca teve coluna de moeda. A moeda de um
-- aporte era lida do SELETOR DA PESSOA (`savings.currency`) na hora de
-- mostrar — ou seja, não era um fato guardado, era uma leitura do
-- presente. Consequência: lançar R$ 20.000 em aportes e depois trocar o
-- seletor para € fazia os mesmos R$ 20.000 virarem € 20.000, que o
-- Painel mostra como **R$ 124.000**. Sem aviso, sem erro, sem nada na
-- tela indicando que o número mudou de significado.
--
-- POR QUE AGORA É BARATO. A tabela está VAZIA (0 aportes em 06/09). Não
-- há um centavo para converter: a coluna nasce, e daqui pra frente cada
-- aporte grava a moeda em que foi feito. Se ele já tivesse lançado, esta
-- migração precisaria decidir a moeda de cada linha antiga — e não teria
-- como saber.
--
-- O `default 'brl'` não é chute: é a moeda em que ele disse que sempre
-- vai contar. E ela só vale para linha que chegar sem moeda; a tela
-- sempre manda a escolhida.
-- ============================================================

alter table contribution
  add column if not exists currency text not null default 'brl';

-- A trava, separada do `add column` de propósito: rodar duas vezes não
-- pode estourar, e `add constraint` não tem `if not exists`.
alter table contribution drop constraint if exists contribution_currency_check;
alter table contribution add constraint contribution_currency_check
  check (currency in ('eur', 'brl'));

-- ------------------------------------------------------------
-- CONFERÊNCIA. Rode junto: a primeira devolve a coluna com o default,
-- a segunda devolve a trava já com os dois valores.
-- ------------------------------------------------------------
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'contribution' and column_name = 'currency';

select conname as trava, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'contribution'::regclass and conname = 'contribution_currency_check';

-- ------------------------------------------------------------
-- O DESFAZER (só se precisar voltar atrás):
--
--   alter table contribution drop constraint if exists contribution_currency_check;
--   alter table contribution drop column if exists currency;
--
-- Atenção: desfazer depois de ele lançar aportes APAGA a informação de
-- qual moeda era cada um, e ela não volta.
-- ------------------------------------------------------------
