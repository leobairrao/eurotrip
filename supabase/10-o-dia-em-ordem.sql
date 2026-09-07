-- ============================================================
-- 10 — O dia em ordem, e o item que ele escreve  (06/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO: "quero ver o itinerario do dia mais detalhado", com ordem, com
-- o que ele já fez marcado, e com uma linha para escrever o que não é
-- atração nem transporte nem comida (check-in, lavanderia).
--
-- DUAS CONFUSÕES QUE ESTE ARQUIVO PRECISA IMPEDIR:
--
--  1. `day_pos` é a ordem DENTRO DO DIA. A tabela `leg` já tem `position`,
--     que é a sequência da VIAGEM INTEIRA e é o que a aba Transporte usa.
--     As duas passam a viver lado a lado na mesma tabela, e trocar uma
--     pela outra embaralha o roteiro sem dar erro nenhum.
--
--  2. `done` é "EU FIZ". `attraction.paid` e `leg.bought` são "EU PAGUEI".
--     Um passeio de graça pode estar `done` e nunca `paid`; um trem pode
--     estar `bought` em outubro e só ficar `done` em dezembro.
-- ============================================================

create table if not exists day_item (
  id         uuid primary key default gen_random_uuid(),
  -- os 34 dias são fixos e ninguém apaga um `day`. O cascade existe para
  -- não deixar item órfão apontando para um dia que não existe mais.
  day_iso    date not null references day(iso) on delete cascade,
  name       text not null,
  note       text not null default '',
  amount     numeric(10,2),
  -- regra 5.11: item sem moeda cai no lado pré-selecionado. Euro, igual a
  -- transporte. Foi assim que R$ 257 virou R$ 1.595 uma vez.
  currency   text not null default 'eur' check (currency in ('eur','brl')),
  day_pos    int  not null default 0,   -- a ordem DENTRO do dia
  done       boolean not null default false,  -- "eu fiz", não "eu paguei"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references app_user(id)
);
create index if not exists day_item_day_idx on day_item (day_iso, day_pos);

alter table attraction
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;
alter table food
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;
alter table leg
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;

-- ------------------------------------------------------------
-- AS TRÊS LISTAS DO BANCO QUE NINGUÉM LEMBRA NA HORA.
-- Sem elas a tabela existe e não serve: ninguém lê, a outra pessoa não vê
-- o que você escreve, e o que você apaga continua na tela dela.
-- ------------------------------------------------------------
alter table day_item enable row level security;
drop policy if exists "so os dois" on day_item;
create policy "so os dois" on day_item
  for all using (is_member()) with check (is_member());

do $$
begin
  alter publication supabase_realtime add table day_item;
exception when duplicate_object then null;
end $$;

alter table day_item replica identity full;

-- ------------------------------------------------------------
-- CONFERÊNCIA. Grava um item de mentira num dia de verdade, confere e
-- apaga, DENTRO de um bloco `do` — num comando único o `delete` não veria
-- a linha que o `insert` acabou de criar, e a linha de teste ficaria no
-- banco para sempre.
-- ------------------------------------------------------------
do $$
declare gravado text;
begin
  insert into day_item (day_iso, name, day_pos)
  values ((select iso from day order by iso limit 1), '__teste do dia__', 7)
  returning name into gravado;

  delete from day_item where name = '__teste do dia__';

  if gravado is distinct from '__teste do dia__' then
    raise exception 'day_item NAO aceitou a linha; veio %', gravado;
  end if;
  raise notice 'ok: day_item grava e apaga';
end $$;

-- O resultado que aparece na tela do Supabase: uma linha com
-- `colunas_da_tabela_nova = 11`, `colunas_novas_nas_tres = 6`,
-- `realtime_ligado = true`, `linha_inteira_no_delete = true`,
-- `rls_ligada = true` e `sobrou_lixo = 0`.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'day_item')                     as colunas_da_tabela_nova,
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name in ('attraction','food','leg')
      and column_name in ('day_pos','done'))           as colunas_novas_nas_tres,
  (select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'day_item') = 1                  as realtime_ligado,
  (select relreplident from pg_class
    where oid = 'day_item'::regclass) = 'f'            as linha_inteira_no_delete,
  -- NAO conta pg_policies: uma tabela pode ter policy e estar com
  -- `relrowsecurity = false` — a policy fica inerte e a tabela aberta,
  -- e contar policy diria `true` mesmo assim. Isto le se o RLS esta
  -- LIGADO de fato.
  (select relrowsecurity from pg_class
    where oid = 'day_item'::regclass)                  as rls_ligada,
  (select count(*) from day_item
    where name = '__teste do dia__')                   as sobrou_lixo;

-- `colunas_da_tabela_nova` tem que ser 11 (as colunas de day_item).
-- `colunas_novas_nas_tres` tem que ser 6: day_pos e done em attraction,
-- food e leg.

-- ------------------------------------------------------------
-- DESFAZER
--   drop table if exists day_item;
--   alter table attraction drop column if exists day_pos,
--                          drop column if exists done;
--   alter table food       drop column if exists day_pos,
--                          drop column if exists done;
--   alter table leg        drop column if exists day_pos,
--                          drop column if exists done;
-- ------------------------------------------------------------
