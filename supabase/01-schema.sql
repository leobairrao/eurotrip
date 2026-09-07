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
  -- TEMA LIVRE desde 06/09 (supabase/09-tema-da-atracao.sql). A trava nao
  -- olha o conteudo, so o tamanho: era `kind in ('passeio','tour')` e ele
  -- pediu para poder escrever o proprio tema no registro da atracao.
  kind        text not null default 'passeio'
              check (length(btrim(kind)) between 1 and 24),
  day_iso     date references day(iso) on delete set null,   -- null = sem dia
  seed_id     text unique,                   -- 'm:lisboa:0' | 's:roma:4'. Null se ele criou
  -- a ordem DENTRO do dia (nao confundir com `position`, que em `leg` e a
  -- sequencia da viagem inteira). Ver supabase/10-o-dia-em-ordem.sql
  day_pos     int not null default 0,
  -- "eu fiz". `paid`/`bought` sao "eu paguei" — coisas diferentes.
  done        boolean not null default false,
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
  -- a ordem DENTRO do dia (nao confundir com `position`, que em `leg` e a
  -- sequencia da viagem inteira). Ver supabase/10-o-dia-em-ordem.sql
  day_pos     int not null default 0,
  -- "eu fiz". `paid`/`bought` sao "eu paguei" — coisas diferentes.
  done        boolean not null default false,
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
              check (kind in ('trem','aviao','onibus','carro','metro')),
  amount      numeric(10,2),                 -- null = ainda nao lancou
  currency    text not null default 'eur' check (currency in ('eur','brl')),
  bought      boolean not null default false, -- a caixinha "comprado" (regra 5.10)
  day_iso     date references day(iso) on delete set null,
  seed_id     text unique,                   -- 't:0' .. 't:11'
  -- a ordem DENTRO do dia (nao confundir com `position`, que em `leg` e a
  -- sequencia da viagem inteira). Ver supabase/10-o-dia-em-ordem.sql
  day_pos     int not null default 0,
  -- "eu fiz". `paid`/`bought` sao "eu paguei" — coisas diferentes.
  done        boolean not null default false,
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
  -- A moeda EM QUE O APORTE FOI FEITO (06/09). Sem ela, a moeda vinha do
  -- seletor da pessoa na hora de mostrar, e trocar o seletor reescrevia o
  -- passado: R$ 20.000 viravam EUR 20.000 = R$ 124.000 no Painel.
  currency    text not null default 'brl' check (currency in ('eur','brl')),
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

-- ---------- 12. o dia em ordem (supabase/10-o-dia-em-ordem.sql) ----------
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
