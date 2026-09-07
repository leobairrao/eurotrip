-- ============================================================
-- Eurotrip 2026 — RLS, Realtime e a Caixa privada
-- (ESPECIFICACAO.md secoes 7 e 8).
--
-- APOSENTADO — NÃO USE ESTE ARQUIVO PARA MONTAR UM BANCO NOVO.
--
-- Este arquivo cobre só as tabelas que existiam quando ele foi escrito.
-- Ficou incompleto e parou de ser atualizado junto com `00-tudo.sql`:
-- não tem `stay_option`, não tem `city`, não tem `attraction.paid` e,
-- agora, não tem `day_item`. Rodar este arquivo depois de
-- `01-schema.sql` (que também está aposentado, ver o cabeçalho dele) num
-- banco novo deixa essas tabelas SEM `enable row level security`. No
-- Supabase o privilégio padrão dá `all` para o papel `anon`, então
-- qualquer pessoa com a anon key passa a ler e escrever nelas — no caso
-- de `day_item`, os itens do dia de qualquer um.
--
-- O arquivo correto e único testado para montar um banco novo é
-- `supabase/00-tudo.sql`, que já inclui RLS, realtime e replica identity
-- para todas as tabelas, `day_item` incluída.
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
