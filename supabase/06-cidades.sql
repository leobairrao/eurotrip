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
