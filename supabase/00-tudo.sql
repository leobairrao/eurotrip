-- ============================================================
-- Eurotrip 2026 — TUDO NUM ARQUIVO SO.
-- Cole isto inteiro no SQL Editor do Supabase e rode uma vez.
-- E seguro rodar de novo: nada aqui apaga dado.
-- ============================================================

-- ============================================================
-- Eurotrip 2026 — esquema (ESPECIFICACAO.md secao 6.2)
-- Rode este arquivo primeiro, no SQL Editor do Supabase.
-- ============================================================

-- ---------- quem pode entrar ----------
-- So estes e-mails. Populado em 03-usuarios.sql antes do primeiro deploy.
create table if not exists app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  -- 'leo' | 'lu'. Define de quem e a coluna na Caixa.
  who         text not null check (who in ('leo','lu')),
  created_at  timestamptz not null default now()
);

-- ---------- 1. os 34 dias ----------
create table if not exists day (
  iso         date primary key,              -- 2026-12-10 .. 2027-01-12
  base        text not null default '',      -- a cidade onde dorme. Vem semeada
  plan        text not null default '',      -- o texto DELE. Comeca vazio (regra 5.5)
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);

-- ---------- 2. atracoes ----------
-- Lista unica. A situacao (status) e o que separa dele / backlog / sugestao.
create table if not exists attraction (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,                 -- chave de cidade: 'lisboa', 'madrid'...
  name        text not null,
  price_eur   numeric(10,2) not null default 0,
  note        text not null default '',      -- pode conter <b> e <i>. Ver secao 10.0
  status      text not null default 'backlog'
              check (status in ('escolhida','backlog','sugerida')),
  kind        text not null default 'passeio'
              check (kind in ('passeio','tour')),
  day_iso     date references day(iso) on delete set null,   -- null = sem dia
  seed_id     text unique,                   -- 'm:lisboa:0' | 's:roma:4'. Null se ele criou
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);
create index if not exists attraction_city_idx    on attraction (city);
create index if not exists attraction_day_iso_idx on attraction (day_iso);

-- ---------- 3. comidas ----------
create table if not exists food (
  id          uuid primary key default gen_random_uuid(),
  country     text not null,                 -- 'pt','es','fr','lu','de','nl','it'
  name        text not null,
  note        text not null default '',
  kind        text not null default 'prato'
              check (kind in ('prato','restaurante','cafe')),
  day_iso     date references day(iso) on delete set null,   -- sempre null se kind='prato'
  seed_id     text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);
create index if not exists food_country_idx on food (country);
-- regra 5.8 no banco: prato tipico nao vai para dia
do $$ begin
  alter table food add constraint prato_sem_dia
    check (kind <> 'prato' or day_iso is null);
exception when duplicate_object then null; end $$;

-- ---------- 4. transporte ----------
create table if not exists leg (
  id          uuid primary key default gen_random_uuid(),
  position    int not null,                  -- ordem do roteiro. NAO ordene por nome
  name        text not null,                 -- 'Madrid -> Caceres'
  note        text not null default '',
  kind        text not null default 'trem'
              check (kind in ('trem','aviao','onibus','carro')),
  amount      numeric(10,2),                 -- null = ainda nao lancou
  currency    text not null default 'eur' check (currency in ('eur','brl')),
  bought      boolean not null default false, -- a caixinha "comprado" (regra 5.10)
  day_iso     date references day(iso) on delete set null,
  seed_id     text unique,                   -- 't:0' .. 't:11'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);
create index if not exists leg_position_idx on leg (position);

-- ---------- 5. burocracia ----------
create table if not exists booking (
  id          uuid primary key default gen_random_uuid(),
  position    int not null,
  name        text not null,
  note        text not null default '',
  amount      numeric(10,2),
  currency    text not null default 'brl' check (currency in ('eur','brl')),  -- regra 5.11
  done        boolean not null default false,
  seed_id     text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);
create index if not exists booking_position_idx on booking (position);

-- ---------- 6. hospedagem ----------
-- Uma linha por base. As 7 linhas vem semeadas e nao se cria nem apaga base aqui.
create table if not exists stay (
  city        text primary key,
  address     text not null default '',
  check_in    text not null default '',      -- texto livre: 'dia 12 - 15h'
  check_out   text not null default '',
  nightly_eur numeric(10,2),                 -- a diaria CHEIA do anuncio (regra 5.7)
  nights      int,
  total_eur   numeric(10,2),                 -- se preenchido, IGNORA nightly x nights
  link        text not null default '',
  notes       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);

-- ---------- 7. linhas livres de custo ----------
create table if not exists extra (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  amount      numeric(10,2),
  currency    text not null default 'eur' check (currency in ('eur','brl')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);

-- ---------- 8. Caixa: quanto cada um guardou ----------
-- Uma linha por pessoa. 'currency' e a moeda em que ELA pensa.
-- Nao ha mais 'opening': o que ja estava guardado e o primeiro aporte.
create table if not exists savings (
  who         text primary key check (who in ('leo','lu')),
  goal        numeric(10,2),                 -- a meta dela
  currency    text not null default 'brl' check (currency in ('eur','brl')),
  updated_at  timestamptz not null default now()
);
-- Um aporte por ENTRADA de dinheiro, nao por mes (mudanca de 04/09/2026).
-- 'R$ 1.500 do 13o salario, em 12 de setembro' e uma linha daqui.
-- Quem ja tem um banco da versao por mes: rode 03-caixa-aportes.sql.
create table if not exists contribution (
  id          uuid primary key default gen_random_uuid(),
  who         text not null check (who in ('leo','lu')),
  on_date     date not null,                 -- o dia em que o dinheiro entrou
  label       text not null default '',      -- de onde veio. Pode ficar vazio
  amount      numeric(10,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Os indices SO depois de a coluna existir.
--
-- Num banco anterior a 04/09 o `create table if not exists` acima e no-op:
-- a tabela velha continua com (who, month) e NAO tem on_date. Um
-- `create index ... (on_date)` solto estouraria "column does not exist" e
-- derrubaria a colada inteira — justo no banco que precisa da migracao 03,
-- que assim nunca chegaria a rodar. O `if not exists` do CREATE INDEX so
-- olha o NOME do indice; nao protege disto.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contribution' and column_name = 'on_date'
  ) then
    create index if not exists contribution_who_idx  on contribution (who);
    create index if not exists contribution_date_idx on contribution (on_date);
  else
    raise notice 'contribution ainda esta no formato mes a mes — rode supabase/03-caixa-aportes.sql.';
  end if;
end $$;

-- ---------- 9. configuracao ----------
create table if not exists settings (
  id              int primary key default 1 check (id = 1),
  eur_rate        numeric(6,2) not null default 6.00,   -- R$ por euro. Ele ja pos 6,20
  flight_paid_brl numeric(10,2) not null default 5079.77,
  updated_at      timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- 9b. avisos ----------
-- Eram meus e moravam em arquivo (regra 5.6). Desde 05/09/2026 sao dele:
-- editaveis e apagaveis. O corpo e TEXTO PURO — negrito se escreve *assim*.
create table if not exists aviso (
  id          uuid primary key default gen_random_uuid(),
  spot        text not null,                 -- 'atracoes:lisboa', 'comidas:pt', 'transporte'...
  tone        text not null default 'warn'
              check (tone in ('free','warn','alert')),
  title       text not null default '',
  body        text not null default '',
  position    int not null default 0,
  seed_id     text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists aviso_spot_idx on aviso (spot);

-- ---------- 10. sementes apagadas ----------
-- Regra 5.14: seed_id que o usuario apagou nunca volta.
create table if not exists killed_seed (
  seed_id     text primary key,
  killed_at   timestamptz not null default now()
);

-- ---------- 11. sugestoes minhas que ele ja puxou com o + ----------
-- A camada de pesquisa (comidas-sugeridas, reservas-sugeridas) vive no codigo.
-- Esta tabela guarda so QUAIS ele ja adotou, para o + virar "na sua lista".
create table if not exists adopted (
  seed_id     text primary key,              -- 'Fpt|3' | 'R|7'
  adopted_at  timestamptz not null default now()
);


-- ============================================================
-- Eurotrip 2026 — RLS, Realtime e a Caixa privada
-- (ESPECIFICACAO.md secoes 7 e 8). Rode DEPOIS de 01-schema.sql.
-- ============================================================

-- ------------------------------------------------------------
-- is_member(): "o usuario logado e um dos dois?"
-- E `security definer` de proposito: se a politica de app_user
-- consultasse app_user diretamente, a RLS chamaria a si mesma
-- e o Postgres estouraria em recursao infinita.
-- ------------------------------------------------------------
create or replace function is_member() returns boolean
  language sql security definer stable set search_path = public
as $$ select exists (select 1 from app_user where id = auth.uid()) $$;

-- quem sou eu ('leo' | 'lu')
create or replace function meu_who() returns text
  language sql security definer stable set search_path = public
as $$ select who from app_user where id = auth.uid() $$;

grant execute on function is_member() to authenticated;
grant execute on function meu_who()  to authenticated;

-- ------------------------------------------------------------
-- allowlist: o e-mail pode pedir link magico?
-- Chamavel por anon, devolve so true/false — nunca diz se a
-- conta existe (secao 9.2).
-- ------------------------------------------------------------
create or replace function email_permitido(e text) returns boolean
  language sql security definer stable set search_path = public
as $$ select exists (select 1 from app_user where lower(email) = lower(trim(e))) $$;

grant execute on function email_permitido(text) to anon, authenticated;

-- ------------------------------------------------------------
-- Liga a RLS em tudo
-- ------------------------------------------------------------
alter table app_user     enable row level security;
alter table day          enable row level security;
alter table attraction   enable row level security;
alter table food         enable row level security;
alter table leg          enable row level security;
alter table booking      enable row level security;
alter table stay         enable row level security;
alter table extra        enable row level security;
alter table settings     enable row level security;
alter table killed_seed  enable row level security;
alter table adopted      enable row level security;
alter table aviso        enable row level security;
alter table savings      enable row level security;
alter table contribution enable row level security;

-- ------------------------------------------------------------
-- app_user: os dois leem (para saber quem e quem). Ninguem escreve pelo app.
-- ------------------------------------------------------------
drop policy if exists "app_user ler" on app_user;
create policy "app_user ler" on app_user for select using (is_member());

-- ------------------------------------------------------------
-- Tabelas compartilhadas: os dois leem, os dois escrevem
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['day','attraction','food','leg','booking','stay','extra','settings','killed_seed','adopted','aviso']
  loop
    execute format('drop policy if exists %I on %I', 'so os dois', t);
    execute format(
      'create policy %I on %I for all using (is_member()) with check (is_member())',
      'so os dois', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- A Caixa.
--
-- A secao 7 propunha deixar a Caixa privada — cada um lendo so a
-- propria linha — e mandava PERGUNTAR antes de abrir, porque os dois
-- estao poupando para a mesma viagem. Perguntado em 04/09/2026: o Leo
-- escolheu ABRIR, igual ao artefato de hoje. Os dois leem e escrevem
-- as duas linhas, e o geral mostra a coluna de cada um.
--
-- Para fechar de novo, troque as duas politicas abaixo por:
--   create policy "so a propria" on savings for all
--     using (who = meu_who()) with check (who = meu_who());
--   (idem em contribution)
-- e volte o commit que abriu, que traz a funcao caixa_geral() e o
-- gatilho de pulso — sem eles o geral de um nao sobe quando o outro
-- lanca, porque a RLS filtra o Realtime.
-- ------------------------------------------------------------
drop policy if exists "so a propria" on savings;
drop policy if exists "so os dois" on savings;
create policy "so os dois" on savings for all
  using (is_member()) with check (is_member());

drop policy if exists "so a propria" on contribution;
drop policy if exists "so os dois" on contribution;
create policy "so os dois" on contribution for all
  using (is_member()) with check (is_member());

-- ------------------------------------------------------------
-- Realtime (secao 8): todas as compartilhadas, a Caixa incluida.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['day','attraction','food','leg','booking','stay',
                           'extra','settings','killed_seed','adopted',
                           'savings','contribution','aviso']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Realtime precisa da linha inteira no DELETE para o cliente saber o que sair da tela
alter table attraction   replica identity full;
alter table food         replica identity full;
alter table leg          replica identity full;
alter table booking      replica identity full;
alter table extra        replica identity full;
alter table killed_seed  replica identity full;
alter table adopted      replica identity full;
alter table contribution replica identity full;
alter table aviso        replica identity full;

-- ------------------------------------------------------------
-- Limpeza: se este banco ja tinha a versao privada, tire o que
-- sobrou dela. Sem isto, o gatilho continuaria batendo um pulso
-- que ninguem mais escuta.
-- ------------------------------------------------------------
drop trigger  if exists pulso_savings      on savings;
drop trigger  if exists pulso_contribution on contribution;
drop function if exists bater_pulso_caixa();
drop function if exists caixa_geral();
drop table    if exists caixa_pulse;
