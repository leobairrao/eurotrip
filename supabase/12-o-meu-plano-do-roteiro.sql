-- ============================================================
-- 12 — O MEU PLANO DO ROTEIRO, na mão dele  (09/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO, com a palavra dele, olhando a tabela do Painel vazia:
--
--   "aqui em painel coloque o roteiro que tínhamos antes (cáceres 1 dia,
--    lisboa 3 dias...) só para eu ter uma noção, mas coloque nos meus dados
--    (você provavelmente vai ter que colocar no banco isso, né?)"
--
--   "aqui são 3 campos: cidade, dias e um campo escrito, da mesma forma que
--    tínhamos antes"
--
-- POR QUE UMA TABELA, e não um texto livre: ele pediu TRÊS CAMPOS. Com um
-- campo de texto só, "Lisboa 4 dias" é uma frase; com três colunas, os dias
-- são um número que soma e a linha se reordena. A tentativa anterior usou o
-- `aviso` (título + texto + cor) e ele apontou na hora que os campos eram
-- os errados.
--
-- A LINHA É DELE, e isto é o oposto do que aconteceu com `day.base`:
--
--   `day.base` foi SEMENTE MINHA numa coluna dele — o app afirmava "durmo
--   em Cáceres" numa cidade que ele não havia escolhido, e ele mandou
--   acabar com isso (a regra de 06/09, "as minhas abas devem ficar apenas
--   com os meus dados").
--
--   Estas 8 linhas ele PEDIU: "coloque nos meus dados". Nascem sem
--   `seed_id`, então o `x` apaga de verdade e nada ressuscita — não há
--   `killed_seed` para consultar, e é assim que tem que ser.
--
-- E ELA NÃO MANDA EM NADA: não vira noite, não vira bloco no Roteiro, não
-- entra em custo nenhum. É a nota que ele lê enquanto monta a viagem. Quem
-- manda no roteiro é a hospedagem marcada (SQL 11).
-- ============================================================

create table if not exists plan_row (
  id         uuid primary key default gen_random_uuid(),
  -- TEXTO LIVRE, e não chave de cidade. As outras tabelas guardam a chave
  -- normalizada ('amsterda') em colunas chamadas `city`; aqui ele escreve
  -- o que quiser ("Metz", "Alsácia", "decidir depois"), e por isso a coluna
  -- se chama `place`. Uma coluna `city` aqui convidaria alguém a cruzar com
  -- `CT[...]` e derrubar a tela numa palavra que não é cidade.
  place      text not null default '',
  -- quantos dias ele pensa em ficar. Nulo = ainda não sabe, e é diferente
  -- de zero (regra 10.0: campo vazio é vazio, não zero).
  days       int,
  -- o campo escrito: era "o que sai daqui de bate-volta" na tabela antiga.
  note       text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references app_user(id)
);
create index if not exists plan_row_pos_idx on plan_row (position);

-- ------------------------------------------------------------
-- AS TRÊS LISTAS DO BANCO QUE NINGUÉM LEMBRA NA HORA.
-- Sem elas a tabela existe e não serve: ninguém lê, a outra pessoa não vê
-- o que você escreve, e o que você apaga continua na tela dela. A `aviso`
-- ficou fora do realtime em 05/09 e nada de aviso sincronizava, com o SQL
-- todo correto do outro lado.
-- ------------------------------------------------------------
alter table plan_row enable row level security;
drop policy if exists "so os dois" on plan_row;
create policy "so os dois" on plan_row
  for all using (is_member()) with check (is_member());

do $$
begin
  alter publication supabase_realtime add table plan_row;
exception when duplicate_object then null;
end $$;

alter table plan_row replica identity full;

-- ------------------------------------------------------------
-- O PLANO QUE ELE PEDIU, uma vez só.
--
-- São as 8 bases do roteiro que eu montei, com os dias e o bate-volta que
-- estavam na tabela do Painel antes de ela passar a mostrar reserva.
--
-- `where not exists` NÃO É DECORAÇÃO: sem isso, rodar o arquivo de novo
-- duplicaria as 8 linhas, e ele teria "Lisboa 4 dias" duas vezes sem
-- entender por quê. E se ele APAGAR uma linha, ela não volta — a condição
-- olha a tabela inteira, não linha por linha. É a regra de 06/09: o que ele
-- apaga fica apagado.
-- ------------------------------------------------------------
insert into plan_row (place, days, note, position)
select * from (values
  ('Cáceres',   1, 'a cidade velha murada, e só',                          0),
  ('Lisboa',    4, 'Sintra e Cascais',                                     1),
  ('Madrid',    3, 'Toledo, Segovia ou Ávila, se couber',                  2),
  ('Metz',      7, 'Luxemburgo, Estrasburgo, Trier, Nancy ou Colmar',      3),
  ('Reims',     3, 'Paris, e Épernay',                                     4),
  ('Amsterdã',  4, 'Utrecht, Zaanse Schans, Haarlem',                      5),
  ('Roma',      8, 'Ostia Antica, Tivoli, Nápoles e Pompeia, Florença',    6),
  ('Madrid',    2, 'último dia — o voo de volta é 23h35',                  7)
) as v(place, days, note, position)
where not exists (select 1 from plan_row);

-- ------------------------------------------------------------
-- CONFERÊNCIA. Escreve uma linha de mentira, confere que o banco ACEITOU
-- (e não que a coluna existe), e apaga — dentro de um bloco `do`, senão o
-- delete não veria a linha que o insert acabou de criar.
-- ------------------------------------------------------------
do $$
declare gravado text; dias_lidos int;
begin
  insert into plan_row (place, days, note, position)
  values ('__teste do plano__', 3, 'nota de teste', 99)
  returning place, days into gravado, dias_lidos;

  delete from plan_row where place = '__teste do plano__';

  if gravado is distinct from '__teste do plano__' or dias_lidos is distinct from 3 then
    raise exception 'plan_row NAO aceitou a linha; veio % e %', gravado, dias_lidos;
  end if;
  raise notice 'ok: plan_row grava e apaga';
end $$;

-- O resultado que aparece na tela do Supabase: uma linha com
-- `colunas = 8`, `linhas_do_plano = 8`, `realtime_ligado = true`,
-- `linha_inteira_no_delete = true`, `rls_ligada = true`, `sobrou_lixo = 0`.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'plan_row')   as colunas,
  (select count(*) from plan_row)                                as linhas_do_plano,
  (select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'plan_row') = 1                            as realtime_ligado,
  (select relreplident from pg_class
    where oid = 'plan_row'::regclass) = 'f'                      as linha_inteira_no_delete,
  -- NAO conta pg_policies: uma tabela pode ter policy e estar com
  -- `relrowsecurity = false` — a policy fica inerte e a tabela aberta.
  (select relrowsecurity from pg_class
    where oid = 'plan_row'::regclass)                            as rls_ligada,
  (select count(*) from plan_row
    where place = '__teste do plano__')                          as sobrou_lixo;

-- `colunas` tem que ser 8 · `linhas_do_plano` tem que ser 8 (as 8 bases) ·
-- `sobrou_lixo` tem que ser 0.
--
-- Se você já tinha mexido nas linhas antes de rodar de novo,
-- `linhas_do_plano` vai ser o número que VOCÊ deixou — e está certo.

-- ------------------------------------------------------------
-- DESFAZER
--   drop table if exists plan_row;
-- ------------------------------------------------------------
