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
  foreach t in array array['day','attraction','food','leg','booking','stay','extra','settings','killed_seed','adopted']
  loop
    execute format('drop policy if exists %I on %I', 'so os dois', t);
    execute format(
      'create policy %I on %I for all using (is_member()) with check (is_member())',
      'so os dois', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- A Caixa e a UNICA coisa privada, e e de proposito (secao 7).
-- Cada um le e escreve SO a propria linha.
-- ------------------------------------------------------------
drop policy if exists "so a propria" on savings;
create policy "so a propria" on savings for all
  using      (who = meu_who())
  with check (who = meu_who());

drop policy if exists "so a propria" on contribution;
create policy "so a propria" on contribution for all
  using      (who = meu_who())
  with check (who = meu_who());

-- ------------------------------------------------------------
-- O "geral" da Caixa: soma dois valores que nenhum dos dois
-- pode ler individualmente. Devolve SO agregados — nunca as linhas.
-- ------------------------------------------------------------
create or replace function caixa_geral() returns jsonb
  language plpgsql security definer stable set search_path = public
as $$
declare rate numeric; res jsonb;
begin
  if not is_member() then raise exception 'nao autorizado'; end if;
  select eur_rate into rate from settings where id = 1;
  rate := coalesce(rate, 6.00);

  select jsonb_build_object(
    -- "saldo de hoje" dos dois, convertido a R$
    'opening_brl', coalesce((
      select sum(case when s.currency = 'eur' then coalesce(s.opening,0) * rate
                      else coalesce(s.opening,0) end) from savings s), 0),
    -- meta dos dois, convertida a R$
    'goal_brl', coalesce((
      select sum(case when s.currency = 'eur' then coalesce(s.goal,0) * rate
                      else coalesce(s.goal,0) end) from savings s), 0),
    -- aportes dos dois, convertidos a R$
    'contrib_brl', coalesce((
      select sum(case when s.currency = 'eur' then coalesce(c.amount,0) * rate
                      else coalesce(c.amount,0) end)
      from contribution c join savings s on s.who = c.who), 0),
    -- por mes, os dois somados (nunca separados)
    'months', coalesce((
      select jsonb_object_agg(x.month, x.brl) from (
        select c.month as month,
               sum(case when s.currency = 'eur' then coalesce(c.amount,0) * rate
                        else coalesce(c.amount,0) end) as brl
        from contribution c join savings s on s.who = c.who
        group by c.month) x), '{}'::jsonb)
  ) into res;
  return res;
end $$;

grant execute on function caixa_geral() to authenticated;

-- ------------------------------------------------------------
-- O pulso da Caixa.
-- A RLS impede o Leo de receber por Realtime a linha da Lu — e sem
-- isso o "geral" dele nunca subiria quando ela lanca (secao 15).
-- Este gatilho bate num contador que os dois PODEM ler; o Realtime
-- avisa, e cada cliente chama caixa_geral() de novo. O numero dela
-- nunca trafega, so o aviso de que algo mudou.
-- ------------------------------------------------------------
create table if not exists caixa_pulse (
  id  int primary key default 1 check (id = 1),
  n   bigint not null default 0
);
insert into caixa_pulse (id, n) values (1, 0) on conflict do nothing;

alter table caixa_pulse enable row level security;
drop policy if exists "pulso: os dois leem" on caixa_pulse;
create policy "pulso: os dois leem" on caixa_pulse for select using (is_member());

create or replace function bater_pulso_caixa() returns trigger
  language plpgsql security definer set search_path = public
as $$ begin
  update caixa_pulse set n = n + 1 where id = 1;
  return null;
end $$;

drop trigger if exists pulso_savings      on savings;
drop trigger if exists pulso_contribution on contribution;
create trigger pulso_savings      after insert or update or delete on savings
  for each statement execute function bater_pulso_caixa();
create trigger pulso_contribution after insert or update or delete on contribution
  for each statement execute function bater_pulso_caixa();

-- ------------------------------------------------------------
-- Realtime (secao 8): as compartilhadas + o pulso da Caixa.
-- savings e contribution NAO entram: sao privadas, e o pulso
-- ja faz o trabalho sem vazar valor.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['day','attraction','food','leg','booking','stay',
                           'extra','settings','killed_seed','adopted','caixa_pulse']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Realtime precisa da linha inteira no DELETE para o cliente saber o que sair da tela
alter table attraction  replica identity full;
alter table food        replica identity full;
alter table leg         replica identity full;
alter table booking     replica identity full;
alter table extra       replica identity full;
alter table killed_seed replica identity full;
alter table adopted     replica identity full;
