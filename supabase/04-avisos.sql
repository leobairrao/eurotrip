-- ============================================================
-- Eurotrip 2026 — os avisos deixam de ser meus (05/09/2026)
--
-- A regra 5.6 dizia: "o aviso e meu, nao dele — nao edita, nao apaga,
-- nao soma". Eles moravam em arquivo (src/content/*.json) e so eu
-- mexia. O Leo pediu que TUDO fosse editavel, e escolheu isso sabendo
-- que implicava tabela nova. A regra 5.6 cai; o que fica dela e so a
-- ultima parte: aviso NAO SOMA em conta nenhuma.
--
-- Rode este arquivo no SQL Editor do Supabase. Depois rode `npm run
-- seed` na sua maquina, que e quem enche a tabela a partir dos JSONs.
-- Rodar duas vezes nao faz mal.
--
-- Onde cada aviso aparece vai em `spot`:
--   atracoes:lisboa          o cartao de aviso da cidade, na aba Atracoes
--   roteiro:2026-12-10       o aviso de um dia, na aba Roteiro
--   comidas:pt               o aviso do pais, na aba Comidas
--   comidas:pt:naovale       um item de "o que eu acho que nao vale"
--   transporte               o "nao conte duas vezes"
-- ============================================================

create table if not exists aviso (
  id          uuid primary key default gen_random_uuid(),
  spot        text not null,                 -- onde aparece (ver acima)
  tone        text not null default 'warn'
              check (tone in ('free','warn','alert')),   -- a cor da barra
  title       text not null default '',
  -- Texto PURO. Negrito se escreve *assim* — e o que a tela converte, e
  -- o unico HTML que sai daqui. Guardar tag crua traria de volta o bug
  -- de 04/09, em que um "<" solto engolia o resto da frase.
  body        text not null default '',
  position    int not null default 0,        -- ordem dentro do mesmo spot
  seed_id     text unique,                   -- 'av:cidade:lisboa'. Null se ele criou
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists aviso_spot_idx on aviso (spot);

-- ---------- RLS, igual as outras tabelas compartilhadas ----------
alter table aviso enable row level security;

drop policy if exists "so os dois" on aviso;
create policy "so os dois" on aviso for all
  using (is_member()) with check (is_member());

-- ---------- Realtime ----------
do $$
begin
  alter publication supabase_realtime add table aviso;
exception when duplicate_object then null;
end $$;

-- o cliente precisa da linha inteira no DELETE para tirar o aviso da tela
alter table aviso replica identity full;


-- ------------------------------------------------------------
-- As notas antigas tambem viram texto puro com *asterisco*.
--
-- Ate hoje `note` guardava o <b> que eu semeei, e a tela podava o que
-- ele digitava. Desde 05/09 o banco guarda EXATAMENTE o que ele
-- escreveu, e o negrito e *entre asteriscos*. Estas quatro linhas
-- trazem o que ja estava la para a mesma lingua — senao a nota semeada
-- apareceria com "<b>" cru no campo.
--
-- Idempotente: rodar de novo nao acha mais <b> nenhum.
-- ------------------------------------------------------------
update attraction set note = replace(replace(note, '<b>', '*'), '</b>', '*') where note like '%<b>%';
update food        set note = replace(replace(note, '<b>', '*'), '</b>', '*') where note like '%<b>%';
update leg         set note = replace(replace(note, '<b>', '*'), '</b>', '*') where note like '%<b>%';
update booking     set note = replace(replace(note, '<b>', '*'), '</b>', '*') where note like '%<b>%';
-- o <i> nao tem par no asterisco: vira texto comum
update attraction set note = replace(replace(note, '<i>', ''), '</i>', '') where note like '%<i>%';
update food        set note = replace(replace(note, '<i>', ''), '</i>', '') where note like '%<i>%';
update leg         set note = replace(replace(note, '<i>', ''), '</i>', '') where note like '%<i>%';
update booking     set note = replace(replace(note, '<i>', ''), '</i>', '') where note like '%<i>%';
