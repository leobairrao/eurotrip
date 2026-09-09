-- ============================================================
-- 11 — "Compro antes" vs "pago lá", e o GASTO REAL  (09/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO, com a palavra dele: "tem passagem que vou comprar antes e tem
-- passagens que vou comprar apenas nas cidades". E a régua, que ele deu
-- depois: "transportes que preciso ver antes são voos interpaíses e trens
-- intercidades, os trens e metrôs dentro das cidades não precisa porque eu
-- compro o ticket no dia".
--
-- POR QUE ISTO NÃO SAI DO `kind`: dos 12 trechos, três são TER regional
-- (kind = 'trem', comprados no dia) e o Luxemburgo → Metz é ônibus
-- intercidades. Contar por tipo erraria 4 de 12 e não daria erro nenhum.
-- Intenção não é dedutível do tipo.
--
-- A CONFUSÃO QUE ESTE ARQUIVO PRECISA IMPEDIR, e ela é de uma letra:
--
--   `buy_ahead` é INTENÇÃO — "vou comprar antes de viajar".
--   `bought`    é ESTADO   — "já comprei".
--
--   As duas moram na MESMA linha de `leg`. O par que enche a lista do "o
--   que ainda está aberto" é `buy_ahead = true` com `bought = false`: o voo
--   que ele precisa comprar e ainda não comprou. E `buy_ahead = false` com
--   `bought = true` é o metrô que ele comprou adiantado por acaso — é
--   possível, e não é erro.
--
--   Ler uma no lugar da outra compila limpo e dá um número plausível.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Transporte: a intenção, ao lado do estado que já existia.
-- ------------------------------------------------------------
alter table leg
  add column if not exists buy_ahead boolean not null default false;

-- ------------------------------------------------------------
-- 2. Atração: a intenção, e o PRAZO.
--
-- `ahead_days` é quanto tempo antes, em DIAS. Ele pediu "a tag 'Comprar
-- com antecedência', e o tempo que precisa". Em dias, e não em texto,
-- porque é isso que deixa a lista do Painel ordenar por urgência: "faltam
-- 12 dias para o limite do Coliseu" só existe se houver número.
--
-- `null` = marcou a tag e ainda não sabe o prazo. Diferente de 0, que
-- seria "no dia" e é justamente o que a tag desligada já diz.
-- ------------------------------------------------------------
alter table attraction
  add column if not exists buy_ahead  boolean not null default false,
  add column if not exists ahead_days int;

-- ------------------------------------------------------------
-- 3. Comida: o dinheiro que ela NUNCA teve.
--
-- Este é o achado de 09/09: a tabela `food` não tinha campo de valor
-- nenhum, então uma comida não somava em lugar algum do app, e o "Total
-- estimado" que ele pediu ("o que vou gastar lá: passeios que não comprar
-- antes, comidas, transportes") não tinha de onde tirar a parte da comida.
--
-- MESMO NOME que o de `attraction`, de propósito: é a mesma coisa — um
-- valor em euro naquela linha. Dois nomes para a mesma coisa é como nasce
-- a divergência.
--
-- É ESTIMATIVA POR LUGAR, escolha dele: "um valor estimado por lugar".
-- Vale para `restaurante` e `cafe`. `prato` é lista de desejo, não tem dia
-- (regra 5.8) e não entra em conta nenhuma — a tela não mostra o campo
-- nele, e a coluna existir não muda isso.
-- ------------------------------------------------------------
alter table food
  add column if not exists price_eur numeric(10,2) not null default 0;

-- ------------------------------------------------------------
-- 4. O GASTO REAL, que é planejado vs. o que saiu do bolso.
--
-- Pedido dele em 09/09, no meio da conversa: "deve ter um campo para eu
-- colocar exatamente o quanto paguei/gastei naquele dia. Exemplo: das
-- atrações do dia 11 estava planejado gastar 22E em um passeio e 25E na
-- alimentação, o passeio foi 22E (dou um check e ele entra para os gastos)
-- mas a alimentação foi 30E (devo colocar o novo valor, dar um check e
-- entra para os gastos também). Quero isso porque no final da viagem
-- quero saber qual foi o total de todas as coisas."
--
-- O NOME SEGUE O CAMPO QUE ELE CORRIGE, e isso é a regra:
--   `price_eur` (atração, comida) -> `spent_eur`
--   `amount`    (trecho, item do dia) -> `spent`
-- Assim nenhuma tabela fica com dois nomes para a mesma ideia, e o campo
-- real de cada linha sai na mesma moeda do planejado dela: atração e
-- comida são euro por definição; trecho e item do dia carregam a própria
-- `currency`.
--
-- `null` = ainda não gastei / não conferi. E é isso que faz o número do
-- fim da viagem ser honesto: uma linha sem valor real não é uma linha de
-- R$ 0, é uma linha que ainda não aconteceu. Por isso `null` e não
-- `default 0` — um zero mentiria de graça em 34 dias de viagem.
-- ------------------------------------------------------------
alter table attraction add column if not exists spent_eur numeric(10,2);
alter table food       add column if not exists spent_eur numeric(10,2);
alter table leg        add column if not exists spent     numeric(10,2);
alter table day_item   add column if not exists spent     numeric(10,2);

-- ------------------------------------------------------------
-- CONFERÊNCIA. Escreve nas três tabelas, confere que o banco ACEITOU o
-- valor (e não que a coluna existe), e desfaz — tudo dentro de um bloco
-- `do`, senão o update e a volta não veriam a mesma linha.
--
-- Usa a PRIMEIRA linha de cada tabela e devolve o valor original. Se
-- alguma tabela estiver vazia, ele diz isso em vez de falhar.
-- ------------------------------------------------------------
do $$
declare
  alvo    uuid;
  antes_b boolean;
  antes_d int;
  antes_p numeric(10,2);
  leu_b   boolean;
  leu_d   int;
  leu_p   numeric(10,2);
begin
  -- leg.buy_ahead
  select id, buy_ahead into alvo, antes_b from leg limit 1;
  if alvo is null then
    raise notice 'leg está vazia: coluna criada, sem linha para conferir';
  else
    update leg set buy_ahead = true where id = alvo;
    select buy_ahead into leu_b from leg where id = alvo;
    update leg set buy_ahead = antes_b where id = alvo;
    if leu_b is not true then
      raise exception 'leg.buy_ahead NAO guardou true; veio %', leu_b;
    end if;
    raise notice 'ok: leg.buy_ahead guarda e volta';
  end if;

  -- attraction.buy_ahead + ahead_days
  select id, buy_ahead, ahead_days into alvo, antes_b, antes_d from attraction limit 1;
  if alvo is null then
    raise notice 'attraction está vazia: colunas criadas, sem linha para conferir';
  else
    update attraction set buy_ahead = true, ahead_days = 30 where id = alvo;
    select buy_ahead, ahead_days into leu_b, leu_d from attraction where id = alvo;
    update attraction set buy_ahead = antes_b, ahead_days = antes_d where id = alvo;
    if leu_b is not true or leu_d is distinct from 30 then
      raise exception 'attraction NAO guardou a tag e o prazo; veio % e %', leu_b, leu_d;
    end if;
    raise notice 'ok: attraction.buy_ahead e ahead_days guardam e voltam';
  end if;

  -- food.price_eur. 12,50 e nao 12: prova que os CENTAVOS sobrevivem —
  -- numeric(10,0) por engano truncaria e ninguem veria.
  select id, price_eur into alvo, antes_p from food limit 1;
  if alvo is null then
    raise notice 'food está vazia: coluna criada, sem linha para conferir';
  else
    update food set price_eur = 12.50 where id = alvo;
    select price_eur into leu_p from food where id = alvo;
    update food set price_eur = antes_p where id = alvo;
    if leu_p is distinct from 12.50 then
      raise exception 'food.price_eur NAO guardou 12,50; veio %', leu_p;
    end if;
    raise notice 'ok: food.price_eur guarda os centavos e volta';
  end if;

  -- O gasto real, e o que importa provar aqui e que o NULL volta a ser
  -- null. Uma coluna com `default 0` por engano passaria pelo teste de
  -- "guarda 30" e transformaria as 34 linhas nao gastas em zeros — que
  -- somam igual e mentem no total do fim da viagem.
  select id into alvo from attraction limit 1;
  if alvo is not null then
    update attraction set spent_eur = 30.00 where id = alvo;
    select spent_eur into leu_p from attraction where id = alvo;
    update attraction set spent_eur = null where id = alvo;
    if leu_p is distinct from 30.00 then
      raise exception 'attraction.spent_eur NAO guardou 30; veio %', leu_p;
    end if;
    select spent_eur into leu_p from attraction where id = alvo;
    if leu_p is not null then
      raise exception 'attraction.spent_eur NAO volta a null; veio %', leu_p;
    end if;
    raise notice 'ok: attraction.spent_eur guarda 30 e volta a null';
  end if;
end $$;

-- O resultado que aparece na tela do Supabase: uma linha com
-- `colunas_novas = 4`, `comida_com_centavos = true`, `nada_mudou = true`.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and (table_name, column_name) in
          (('leg','buy_ahead'),
           ('attraction','buy_ahead'),
           ('attraction','ahead_days'),
           ('food','price_eur'),
           ('attraction','spent_eur'),
           ('food','spent_eur'),
           ('leg','spent'),
           ('day_item','spent')))                        as colunas_novas,
  (select numeric_scale = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'food'
      and column_name = 'price_eur')                     as comida_com_centavos,
  -- A conferência tinha que ter devolvido tudo ao que era. Se algum
  -- número aqui não for zero, ela deixou lixo — e é para saber AGORA,
  -- não em dezembro.
  ((select count(*) from leg where buy_ahead or spent is not null) = 0
   and (select count(*) from attraction
         where buy_ahead or ahead_days is not null or spent_eur is not null) = 0
   and (select count(*) from food where price_eur <> 0 or spent_eur is not null) = 0
   and (select count(*) from day_item where spent is not null) = 0) as nada_mudou;

-- `colunas_novas` tem que ser 8.
-- `nada_mudou` tem que ser true HOJE, 09/09: nada está marcado ainda.
--   Depois que você marcar o primeiro trecho, ele passa a ser false — e aí
--   é o certo. Rodando este arquivo de novo mais tarde, ignore essa coluna.

-- ------------------------------------------------------------
-- DESFAZER
--   alter table leg        drop column if exists buy_ahead,
--                          drop column if exists spent;
--   alter table attraction drop column if exists buy_ahead,
--                          drop column if exists ahead_days,
--                          drop column if exists spent_eur;
--   alter table food       drop column if exists price_eur,
--                          drop column if exists spent_eur;
--   alter table day_item   drop column if exists spent;
-- ------------------------------------------------------------
