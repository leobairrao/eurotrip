-- ============================================================
-- 09 — Tema livre na atração  (06/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO, na palavra dele: "quando eu for registrar um passeio eu devo
-- poder escolher logo no registro se é passeio ou tour ou outro tema que
-- pode ser escrita livre".
--
-- POR QUE ISTO PRECISA DE SQL.
-- A coluna `kind` da tabela `attraction` não guarda texto livre: ela tem
-- uma trava que lista exatamente dois valores, 'passeio' e 'tour'.
-- Enquanto ela existir, qualquer tema que ele escrever — "museu",
-- "mercado de natal", "mirante" — é RECUSADO pelo banco.
--
-- Medido no navegador antes de escrever isto: com a trava velha, guardar
-- "Mercado de Navidad da Plaza Mayor" com tema "mercado de natal" devolve
-- erro e a atração não existe. A tela agora diz isso por escrito, mas o
-- que resolve é este arquivo.
--
-- É a mesma história do metrô, no 07 — só que ao contrário: lá eu
-- acrescentei um valor à lista, aqui a lista inteira sai.
--
-- POR QUE NÃO FICA SEM TRAVA NENHUMA.
-- Sem limite, um tema de 5.000 caracteres entra, e a linha da atração
-- vira uma parede de texto no celular sem nada indicando erro. A trava
-- nova não olha o CONTEÚDO (é isso que "livre" quer dizer), só o
-- tamanho: de 1 a 24 caracteres depois de tirar os espaços das pontas.
-- A tela já impede passar disso; isto é a rede embaixo dela.
--
-- O `default 'passeio'` e o `not null` CONTINUAM. Atração que nasce sem
-- tema continua nascendo passeio, e as 35 dele não mudam de valor.
-- ============================================================

alter table attraction drop constraint if exists attraction_kind_check;

alter table attraction add constraint attraction_kind_check
  check (length(btrim(kind)) between 1 and 24);

-- ------------------------------------------------------------
-- CONFERÊNCIA 1 — a ida e volta de verdade.
--
-- Grava uma atração de mentira com um tema inventado, confere, e apaga.
-- Se a trava velha ainda estivesse aí, este bloco PARA com erro em
-- vermelho — que é exatamente o que eu quero que aconteça.
--
-- POR QUE UM BLOCO `do` E NÃO UM `with ... insert ... delete`.
-- Num único comando, todas as partes enxergam a MESMA foto do banco: o
-- `delete` não veria a linha que o `insert` acabou de criar, e a atração
-- de mentira ficaria no banco para sempre. Dentro do `do`, cada comando
-- roda de verdade um depois do outro. Foi o defeito da primeira versão
-- deste arquivo, pego antes de ele rodar.
-- ------------------------------------------------------------
do $$
declare gravado text;
begin
  insert into attraction (city, name, kind)
  values ('__teste_tema__', '__teste do tema livre__', 'mercado de natal')
  returning kind into gravado;

  delete from attraction where city = '__teste_tema__';

  if gravado is distinct from 'mercado de natal' then
    raise exception 'o tema livre NAO entrou; veio %', gravado;
  end if;
  raise notice 'ok: tema livre gravado e a linha de teste foi apagada';
end $$;

-- ------------------------------------------------------------
-- CONFERÊNCIA 2 — o que ficou valendo. É o resultado que aparece na tela
-- do Supabase. Tem que devolver UMA linha com `tema_livre_liberado = true`
-- e `sobrou_lixo_do_teste = 0`.
-- ------------------------------------------------------------
select
  pg_get_constraintdef(c.oid)                    as trava_agora,
  pg_get_constraintdef(c.oid) like '%btrim%'     as tema_livre_liberado,
  (select count(*) from attraction
    where city = '__teste_tema__')               as sobrou_lixo_do_teste,
  (select count(distinct kind) from attraction)  as temas_em_uso_hoje
from pg_constraint c
where c.conrelid = 'attraction'::regclass
  and c.conname  = 'attraction_kind_check';

-- ------------------------------------------------------------
-- DESFAZER, se algum dia quiser a lista fechada de volta.
-- ATENÇÃO: o `alter` falha enquanto existir atração com tema fora dos
-- dois. Confira antes com o primeiro select; se voltar alguma linha,
-- decida o que fazer com ela.
--
--   select distinct kind from attraction
--    where kind not in ('passeio','tour');
--
--   alter table attraction drop constraint if exists attraction_kind_check;
--   alter table attraction add constraint attraction_kind_check
--     check (kind in ('passeio','tour'));
-- ------------------------------------------------------------
