-- ============================================================
-- 07 — Metrô como tipo de transporte  (06/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO, na palavra dele: "adicione a opção de metro".
--
-- POR QUE ISTO PRECISA DE SQL, E O RESTO DA LISTA NÃO.
-- A coluna `kind` da tabela `leg` não guarda texto livre: ela tem uma
-- trava que lista os tipos aceitos. Enquanto 'metro' não estiver nessa
-- lista, o banco RECUSA a linha. E a recusa aparece do pior jeito: a tela
-- mostra o metrô no menu (o código já sabe dele), ele escolhe, e o banco
-- devolve erro — o rodapé avisa "não consegui salvar", mas o trecho
-- simplesmente não existe. Código sem este SQL = menu que mente.
--
-- POR QUE `drop constraint if exists` ANTES.
-- A trava nasceu junto com a tabela, sem nome escolhido por mim: o
-- Postgres chamou de `leg_kind_check`. Não dá para "acrescentar um valor"
-- a uma trava dessas — troca-se a trava inteira. O `if exists` é o que
-- faz este arquivo poder rodar duas vezes.
-- ============================================================

alter table leg drop constraint if exists leg_kind_check;

alter table leg add constraint leg_kind_check
  check (kind in ('trem', 'aviao', 'onibus', 'carro', 'metro'));

-- ------------------------------------------------------------
-- CONFERÊNCIA. Rode junto: tem que devolver UMA linha, com a
-- definição da trava já contendo 'metro'.
-- ------------------------------------------------------------
select conname as trava, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'leg'::regclass and conname = 'leg_kind_check';

-- ------------------------------------------------------------
-- O DESFAZER (só se precisar voltar atrás).
-- Apaga antes os trechos de metrô, senão a trava antiga é recusada por
-- causa das linhas que já existem — e o erro do Postgres não diz isso
-- com todas as letras.
--
--   delete from leg where kind = 'metro';
--   alter table leg drop constraint if exists leg_kind_check;
--   alter table leg add constraint leg_kind_check
--     check (kind in ('trem', 'aviao', 'onibus', 'carro'));
-- ------------------------------------------------------------
