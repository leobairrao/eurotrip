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
              check (kind in ('trem','aviao','onibus','carro','metro')),
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

-- ============================================================
-- 06 — Cidades que o Leo cria  (05/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO: "nessa parte eu quero poder adicionar uma nova cidade também"
-- — clicando na Espanha, cadastrar Sevilha na aba Atrações. E, na palavra
-- dele: "em hospedagem não precisa mesmo, vou dormir só naquelas cidades
-- que definimos". Então cidade nova é lugar de VISITAR: ganha cartão em
-- Atrações e em Dicas, e entra no Roteiro para ser posta num dia. As 7
-- bases de hospedagem continuam as 7.
--
-- POR QUE SÓ AS DELE AQUI, E AS 11 CONTINUAM NO ARQUIVO.
-- Pôr as 11 no banco junto seria o caminho que quebra feio quando falha:
-- `coOf` é `CO.find(...) ?? CO[0]`, e se a lista de países viesse vazia
-- (RLS colada errada, tabela ainda não criada — o PostgREST devolve lista
-- vazia SEM erro), `CO[0]` seria indefinido e a tela ficaria em branco.
-- Do jeito que está, a mesma falha entrega exatamente o app de hoje.
-- ============================================================

create table if not exists city (
  id          uuid primary key default gen_random_uuid(),

  -- a chave, como o resto do app já escreve cidade: 'sevilha'.
  -- UNIQUE não é zelo: chave repetida faz a soma de dinheiro do país
  -- contar aquela cidade DUAS VEZES, porque a conta é uma varredura da
  -- lista de cidades. Número errado sem nada na tela indicando erro.
  k           text not null unique,

  -- o nome como aparece na tela: 'Sevilha'
  n           text not null,

  -- um dos 7 países da fita. Ele escolheu não poder criar país novo.
  co          text not null check (co in ('es','pt','fr','lu','de','nl','it')),

  -- `default 0` não é detalhe: o app manda exatamente o objeto que a tela
  -- montar, e sem default o banco devolve 4xx — e o `insert` não tem fila
  -- de repetição, então o item sumiria sem uma palavra.
  position    int not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);

-- SEM `seed_id`, de propósito: nada semeia cidade, ela é sempre dele.
-- (Mesmo caso da tabela `extra`, que também não tem.)
--
-- E SEM chave estrangeira de `attraction.city` para cá, também de
-- propósito: é isso que garante que, com esta tabela ausente, o app
-- continua sendo o de hoje em vez de recusar escrita em atração.

create index if not exists city_co_idx on city (co, position);

-- ------------------------------------------------------------
-- As três listas do banco. Esquecer a terceira faz a cidade apagada
-- continuar na tela da outra pessoa até ela dar F5.
-- ------------------------------------------------------------
alter table city enable row level security;
drop policy if exists "so os dois" on city;
create policy "so os dois" on city
  for all using (is_member()) with check (is_member());

do $$
begin
  alter publication supabase_realtime add table city;
exception when duplicate_object then null;
end $$;

alter table city replica identity full;

-- ------------------------------------------------------------
-- CONFERIR
-- ------------------------------------------------------------
-- select count(*) from city;                                    -- 0, nasce vazia
-- select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and tablename = 'city';  -- 1 linha
-- select relreplident from pg_class where relname = 'city';      -- 'f'

-- ============================================================
-- DESFAZER
-- ============================================================
-- drop table if exists city;
--
-- As 11 cidades de sempre não estão aqui: elas continuam no arquivo
-- `dados/paises-cidades.json`, que este arquivo não toca. Desfazer isto
-- devolve o app ao estado de antes, e só perde as cidades que ele criou.
