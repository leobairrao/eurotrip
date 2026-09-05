-- ============================================================
-- 05 — Hospedagem por país, e "já paguei" em atração  (05/09/2026)
--
-- Uma colada só, para as Fases 5 e 6 do lote dos sete ajustes. Cole isto
-- inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem estragar
-- nada: tudo aqui é `if not exists` ou `drop ... if exists` antes.
--
-- O QUE ELE PEDIU:
--   Fase 5 — "então terei o valor pago e o valor esperado"
--   Fase 6 — "na parte de hospedagem, vamos fazer opções por país"
--
-- O DESFAZER está escrito no fim do arquivo.
-- ============================================================

-- ------------------------------------------------------------
-- FASE 5 — a caixinha "já paguei" em atração
--
-- Até aqui existiam DOIS marcadores de pago no app inteiro, e os dois
-- booleanos: `leg.bought` e `booking.done`. Atração não tinha como ser
-- marcada — então mesmo depois de ele pagar o Palácio da Pena, ele nunca
-- entrava no "já pago". Sem isto o "valor pago × valor esperado" que ele
-- pediu não existe de verdade.
--
-- Boolean e não campo de valor, para ser igual ao resto do app:
-- *esperado* = tudo que conta; *pago* = o que está com a caixinha marcada.
-- ------------------------------------------------------------
alter table attraction add column if not exists paid boolean not null default false;

-- ------------------------------------------------------------
-- FASE 6 — a hospedagem vira lista de opções por cidade
--
-- A tabela `stay` tem `city` como CHAVE PRIMÁRIA: o banco só aceita UMA
-- hospedagem por cidade, e duas opções em Madrid é impossível. Em vez de
-- trocar a chave primária dela — o que arrastaria `Snapshot.stays` de
-- dicionário para lista, e daí load.ts, calc.ts, Painel, Custos, Caixa,
-- check.mjs e dois testes — nasce uma tabela ao lado.
--
-- A `stay` fica APOSENTADA: continua no banco, ninguém a apaga, e o
-- código para de lê-la. É reversível. E não há dado para migrar: as 7
-- linhas dela estão todas vazias (conferido coluna por coluna em 05/09 —
-- o `updated_at` das 7 é idêntico, o carimbo da semeadura).
--
-- SEM COLUNA DE PAÍS, de propósito: o país sai da cidade, como em
-- Atrações (`CT[city].co`). Guardar `country` aqui duplicaria a verdade e
-- deixaria as duas divergirem.
-- ------------------------------------------------------------
create table if not exists stay_option (
  id           uuid primary key default gen_random_uuid(),
  city         text not null,
  name         text not null,
  note         text not null default '',

  nightly_eur  numeric(10,2),          -- a diária CHEIA do anúncio (regra 5.7)
  nights       int,
  total_eur    numeric(10,2),          -- se > 0, ignora diária × noites

  address      text not null default '',
  check_in     text not null default '',
  check_out    text not null default '',
  link         text not null default '',

  -- "é essa". SÓ a marcada entra no custo da viagem — sem isto, três
  -- opções em Madrid com diária lançada entrariam as três no total, e ele
  -- veria um número errado sem nada indicando erro.
  chosen       boolean not null default false,
  paid         boolean not null default false,

  -- `default 0` não é detalhe: o `insert` do app manda exatamente o objeto
  -- que a tela montar, e sem default um formulário que esquecesse o campo
  -- receberia 4xx do PostgREST — e o item sumiria da tela sem uma palavra,
  -- porque o insert não tem fila de repetição. A renumeração 0..n-1 fica
  -- com as setas de ordem, como já é em transporte.
  position     int not null default 0,

  -- sem isto o `x` não tem o que gravar em killed_seed, e a opção apagada
  -- volta na próxima semeadura (regra 5.14)
  seed_id      text unique,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references app_user(id)
);

create index if not exists stay_option_city_idx on stay_option (city, position);

-- ------------------------------------------------------------
-- As quatro listas que ninguém lembra na hora, e que falham em silêncio.
--
-- A tabela `aviso` ficou de fora do array do canal na primeira escrita,
-- em 05/09, e NADA de aviso sincronizava — com o SQL todo correto do
-- outro lado. As três daqui são as do banco; a quarta é o array
-- `tabelas` em `src/lib/store.tsx`, e as outras três estão em
-- `src/lib/merge.ts` e `src/lib/load.ts`.
-- ------------------------------------------------------------

-- 1. RLS
alter table stay_option enable row level security;
drop policy if exists "so os dois" on stay_option;
create policy "so os dois" on stay_option
  for all using (is_member()) with check (is_member());

-- 2. Realtime
do $$
begin
  alter publication supabase_realtime add table stay_option;
exception when duplicate_object then null;
end $$;

-- 3. A linha inteira no DELETE — sem isto o evento chega sem a linha, o
--    cliente não acha a chave, e a opção que ele apagou continua na tela
--    da Lu até ela dar F5.
alter table stay_option replica identity full;

-- `stay` nunca precisou disto porque ninguém apagava hospedagem. Agora que
-- a tela vai ler `stay_option`, deixo a `stay` como está — aposentada.

-- ------------------------------------------------------------
-- CONFERIR (o retorno esperado está no comentário de cada linha)
-- ------------------------------------------------------------
-- select count(*) from stay_option;                         -- 0 antes do seed
-- select column_name from information_schema.columns
--   where table_name = 'attraction' and column_name = 'paid';  -- 1 linha
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename = 'stay_option';  -- 1 linha
-- select relreplident from pg_class where relname = 'stay_option';      -- 'f'

-- ============================================================
-- DESFAZER (se algo der errado, cole só isto)
-- ============================================================
-- drop table if exists stay_option;
-- alter table attraction drop column if exists paid;
--
-- Nada mais precisa ser desfeito: a `stay` não foi tocada, e nenhuma
-- linha existente foi apagada nem alterada por este arquivo.
