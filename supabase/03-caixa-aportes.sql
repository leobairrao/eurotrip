-- ============================================================
-- Eurotrip 2026 — a Caixa deixa de ser mes a mes (04/09/2026)
--
-- Antes: uma linha por pessoa por mes (chave who+month), mais um
-- campo 'opening' com o que a pessoa ja tinha guardado.
-- Agora: uma linha por APORTE, com dia, nome e valor — igual a um
-- extrato de corretora. "Aporte de outubro" nao existe mais.
--
-- Rode ESTE arquivo se o seu banco ja tinha a versao antiga.
-- Num banco novo nao precisa: 01-schema.sql ja cria o formato novo.
-- Rodar duas vezes nao faz mal: se ja migrou, nao acha o que migrar.
--
-- NADA e apagado sem antes ser convertido:
--   . cada aporte de mes vira um aporte no dia 1o daquele mes;
--   . o 'opening' de cada um vira um aporte com a data de hoje,
--     chamado "o que eu ja tinha".
-- ============================================================

-- Se ja e o formato novo, este arquivo nao tem nada a fazer.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contribution' and column_name = 'id'
  ) then
    raise notice 'contribution ja esta no formato de aportes — nada a fazer.';
    return;
  end if;

  -- ---------- 1. a tabela nova, ao lado da velha ----------
  create table contribution_nova (
    id          uuid primary key default gen_random_uuid(),
    who         text not null check (who in ('leo','lu')),
    on_date     date not null,
    label       text not null default '',
    amount      numeric(10,2),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
  );

  -- ---------- 2. os aportes de mes viram aportes com dia ----------
  -- '2026-10' -> 2026-10-01, com o mes no nome para nao perder de onde veio.
  -- Um 'month' fora do formato NAO e descartado: cai na data de hoje,
  -- porque perder um lancamento dele em silencio seria pior.
  execute $sql$
    insert into contribution_nova (who, on_date, label, amount)
    select who,
           case when month ~ '^\d{4}-\d{2}$'
                then to_date(month || '-01', 'YYYY-MM-DD')
                else current_date end,
           'aporte de ' || month,
           amount
      from contribution
     where amount is not null and amount <> 0
  $sql$;

  -- ---------- 3. o saldo de hoje vira o primeiro aporte ----------
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'savings' and column_name = 'opening'
  ) then
    execute $sql$
      insert into contribution_nova (who, on_date, label, amount)
      select who, current_date, 'o que eu já tinha', opening
        from savings
       where opening is not null and opening <> 0
    $sql$;
  end if;

  -- ---------- 4. troca ----------
  drop table contribution;
  alter table contribution_nova rename to contribution;

  raise notice 'contribution migrada para aportes.';
end $$;

create index if not exists contribution_who_idx  on contribution (who);
create index if not exists contribution_date_idx on contribution (on_date);

-- O 'opening' ja virou aporte la em cima; agora sai de vez.
alter table savings drop column if exists opening;

-- ------------------------------------------------------------
-- A RLS, o Realtime e o replica identity morreram junto com a
-- tabela velha. Repoe tudo, igual a 02-politicas.sql.
-- ------------------------------------------------------------
alter table contribution enable row level security;

drop policy if exists "so a propria" on contribution;
drop policy if exists "so os dois" on contribution;
create policy "so os dois" on contribution for all
  using (is_member()) with check (is_member());

do $$
begin
  alter publication supabase_realtime add table contribution;
exception when duplicate_object then null;
end $$;

-- o cliente precisa da linha inteira no DELETE para tirar o aporte da tela
alter table contribution replica identity full;
