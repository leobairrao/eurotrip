# Os sete ajustes do Leo — desenho

**Data:** 05/09/2026 · **Estado:** aprovado pelo Leo, revisado contra o código e o banco de
produção, aguardando plano de execução

Este documento é o desenho das sete mudanças que o Leo pediu em 05/09/2026, mais a
higiene que precisa vir antes delas. Ele manda sobre o código, e a
[`ESPECIFICACAO.md`](../../../ESPECIFICACAO.md) tem que ser reescrita para bater com ele
— várias regras dela estão sendo revogadas de propósito, e estão nomeadas na seção 12.

O pedido original, na palavra dele:

> total real até agora não faz sentido, está contando passeios que não estão em lugar
> nenhum, deve contar apenas o que foi adicionado, se foi retirado, o valor deve diminuir
> (acompanhar o roteiro) então terei o valor pago e o valor esperado; ajustar a id visual,
> está feio; tirar todos os disclaimers dos dias do roteiro e deixar em algum lugar todas
> as dicas que você tiver separado por cidade; em atrações não faz sentido mais as tags de
> backlog, selecionado e escolhido, isso deve ser apenas a tag de backlog e no roteiro que
> são atribuidas de forma automatica quando a atração, transporte ou restaurante estão no
> roteiro (não vão ser editáveis); na aba transporte, o campo a lançar não entendi muito
> bem o que é e nem se faz sentido poder editar; na parte de hospedagem, vamos colocar
> assim como em atrações e restaurantes, vamos fazer opções por país; em reservas deve ser
> possível adicionar novos itens

---

## 0. O que está acontecendo hoje, com número

Levantado em 05/09/2026 lendo o **banco de produção**, não os arquivos de exemplo, e
conferido duas vezes.

| tabela | estado real |
|---|---|
| `attraction` | **106** linhas — 15 `escolhida` · 22 `backlog` · 69 `sugerida`. **Só 1 linha do app inteiro tem `day_iso`** |
| `leg` | 12, todos com `amount` vazio, `bought=false`, `day_iso` vazio |
| `booking` | 5. Só Passaporte com valor (R$ 257,25, marcado como resolvido) |
| `stay` | 7 linhas, **todas vazias** — nenhuma tocada por gente (o `updated_at` das 7 é idêntico, o carimbo da semeadura) |
| `aviso` | 45 (7 `atracoes:` · 18 `roteiro:` · 19 `comidas:` · 1 `transporte`) |
| `killed_seed` | **0** · `extra` 0 · `contribution` 0 · `savings` sem meta |
| `day` | 1 com texto: `2026-12-21 = "luxr"` |
| `settings` | câmbio 6,2 |

A conta de hoje fecha assim:

```
total real até agora  R$ 6.130,62
total já pago         R$ 5.337,02   (voo 5.079,77 + passaporte 257,25)
ainda por gastar      R$   793,60
```

**Os R$ 793,60 que o Leo estranhou são € 128 em 14 atrações marcadas como `escolhida`
que não estão em dia nenhum.** Delas:

- **€ 50 — a linha `teste`, em Luxemburgo.** Sobra do teste de tempo real de 04/09.
  Sozinha, R$ 310 dos R$ 793,60.
- **€ 78 — os cinco de Sintra:** Palácio da Pena 20, trem e ônibus 19, Quinta da
  Regaleira 15, Castelo dos Mouros 12, Palácio de Monserrate 12. São bate-volta de
  Lisboa de verdade, e nunca ganharam dia.
- as outras 8 são de Lisboa e todas grátis. **Lisboa tem 13 escolhidas, não 8** — o
  número 8 vem da fixture de 04/09, não do banco.

A causa exata está em `src/lib/calc.ts:82-84`: `attrEurAll` filtra por `status` e **nunca
olha `day_iso`**. (A função é `(!st || x.status === st)`; o literal `'escolhida'` vem dos
chamadores — `calc.ts:228`, `Custos.tsx:21`, `Painel.tsx:81`, `Atracoes.tsx:51`.)
`day_iso` não aparece em nenhuma soma de dinheiro do app — só no total de cada dia dentro
da aba Roteiro (`calc.ts:98-99`, `:175-178`).

Isso não é bug de implementação. É a **regra 5.2** (`ESPECIFICACAO.md:126-128`, *"só o
que está marcado como escolhida entra no custo"*) e a **regra 5.3** (`:130-133`, *"pôr
uma atração num dia É escolhê-la; tirar do dia NÃO desfaz"*) funcionando como escritas.
O pedido do Leo inverte as duas, e ele pode — mas tem que ficar registrado, senão a
próxima rodada desfaz achando que achou um bug. Já aconteceu.

### A armadilha do pedido, ao pé da letra

Se o total passar a contar só o que tem dia, **hoje** ele fica:

```
total real até agora  R$ 5.337,02   (só voo + passaporte)
total já pago         R$ 5.337,02
ainda por gastar      R$     0,00
```

O "ainda por gastar" tem um render só (`Custos.tsx:48`), mas **o zero se espalha por
quatro telas**: `Painel.tsx:81-84` (€ 0 · atrações · 0 no roteiro — a primeira tela que
ele abre), `Custos.tsx:44,48,76-77,121`, e `Atracoes.tsx:68,77` (as 7 abas de país viram
"—") mais `:103-117,139,149-151`.

Porque nenhum trecho de transporte e nenhuma hospedagem tem valor preenchido ainda.
Zero não é um número honesto aqui; é um app que parece quebrado. Por isso a
**linha "fora do roteiro somaria mais € X" é parte inegociável da Fase 3** — o número
sai do total, mas não sai da vista dele. O padrão já existe pronto em `Custos.tsx:78-81`.

---

## 1. As quatro decisões que o Leo tomou

Perguntadas e respondidas em 05/09/2026.

| # | Pergunta | Resposta dele |
|---|---|---|
| 1 | Até onde vai o visual? | **Mudar a identidade de vez** — revoga *"nada de canto arredondado, nada de sombra"* |
| 2 | As 69 sugestões viram pilha única com as dele? | **Não: painel separado com "+"** |
| 3 | Hospedagem por país é para escolher ou consultar? | **Para escolher** — lista de opções, ele marca a que fechou, só a marcada conta |
| 4 | Os avisos de data no roteiro? | **Dia limpo, menos os 3 vermelhos** |

### O que foi decidido sem perguntar, e por quê

1. **Transporte, hospedagem e burocracia continuam contando sempre**, com ou sem dia.
   A especificação nomeia **dois** dos doze trechos como agrupamentos que
   **por decisão dele simplesmente ficam sem dia** — "Bate-voltas de Metz no TER" e
   "Reims ⇄ Paris no TER" (`ESPECIFICACAO.md:669-671`). Lendo `dados/transportes.json`,
   um terceiro tem a mesma cara sem estar nomeado lá: "Metz ⇄ Luxemburgo, **24 e 25**".
   Hospedagem é por cidade e não tem data; passaporte e seguro não têm dia.

   Isto é a **regra 5.10 dele** para **transporte e burocracia** (`:181` e `:183`, *"o
   valor conta sempre; a caixinha só decide de que lado"*), e ela fica de pé.
   **Hospedagem não está na 5.10** — o alcance dela é decisão nova desta rodada, pelo
   mesmo motivo, e por isso a 5.10 **ganha uma terceira frase** dizendo hospedagem, em
   vez de ser citada como se já dissesse.
2. **A coluna `status` não morre.** O pedido é sobre a etiqueta na tela, não sobre a
   coluna. `status` passa a significar **origem** — `sugerida` é a camada de pesquisa,
   qualquer outro valor é a lista dele. Isso é o que sustenta a decisão 2 dele, e custa
   zero mudança de esquema e zero perda de dado.
3. **"Já paguei" vira caixinha, não campo de valor.** Igual a `leg.bought` e
   `booking.done`, que é como o app inteiro já funciona. *Esperado* = tudo que conta;
   *pago* = o que está com a caixinha marcada.
4. **Comida e transporte não ganham etiqueta nenhuma.** Já funcionam do jeito que ele
   quer: estar no roteiro é ter dia. E prato típico **nunca** vai para um dia — é a
   **regra 5.8** (`ESPECIFICACAO.md:172`), gravada como `check` no banco
   (`01-schema.sql:62-65`). Uma etiqueta binária carimbaria todo prato como "backlog"
   para sempre, sem saída.
5. **As três sobras do teste de 04/09 são apagadas** — ver 0.6. Pelo app, não por SQL.

---

## 2. Fase 0 — Higiene

Nada disto foi pedido. Os cinco primeiros são pré-requisito de segurança para o resto.

**Esta fase não é "nada novo na tela": ela derruba o total em R$ 310** (o lixo de teste
saindo). A conta anda duas vezes, não uma — ver 11.

### 0.1 Um `<` digitado apaga o resto da frase — perda de dado ativa

`stripTags` (`src/lib/fmt.ts:206-211`) é `/<[^>]*>/g`: **apaga, não escapa**. O projeto
tratou isso como resolvido em 05/09 — `Field.tsx:37-48` e `tests/avisos.test.mjs:110-118`
dizem com todas as letras que *"ele não pode mais tocar na entrada"*. Mas ele toca, em
dois lugares que ninguém revisou:

- `src/screens/Custos.tsx:277` — `insert('extra', { name: stripTags(n), … })`
- `src/screens/Caixa.tsx:317` — `label: stripTags(nome.get())`

O próprio teste prova o estrago (`tests/avisos.test.mjs:116`):
`stripTags('metrô custa < 2 euros e > 1 zona')` → `'metrô custa  1 zona'`.

Uma linha livre chamada `comida < 20 euros/dia` grava truncada **no banco**, sem erro e
sem aviso. Um aporte `13o <bônus>` grava `13o`.

**Conserto:** tirar as duas chamadas. E tirar os dois imports mortos de `stripTags` em
`Transporte.tsx:13` e `Atracoes.tsx:15`, que convidam o próximo a "reaplicar por
simetria".

### 0.2 Teto de tentativas na fila de escrita

`store.tsx:162-166` reenvia para sempre, sem teto. Enquanto a chave está em `pend`,
`merge.ts:118-121` **preserva aquela coluna contra toda mudança remota**. Então um erro
*permanente* — um `check` violado, uma coluna que não existe, RLS negando — produz três
coisas juntas: reenvio a cada 30 s para sempre; app preso em `erro`; e **aquela coluna
daquela linha nunca mais aceita o que a Lu escrever**, até dar F5.

É o modo de falha exato de uma migração malfeita. **Entra antes das migrações das Fases 5
e 6, não depois.** Conserto: distinguir erro de rede (repete) de erro 4xx do PostgREST
(para e avisa).

### 0.3 O `remove()` grava `killed_seed` antes do DELETE

`src/lib/store.tsx:223-232`: `removerLocal` some da tela em `:225`, o `upsert` em
`killed_seed` acontece em `:228`, e o DELETE só em `:229`. **Se o DELETE falha** (RLS,
rede, `replica identity` faltando), o item some da tela, **continua no banco**, e o
`seed_id` fica **para sempre** em `killed_seed` — a regra 5.14 envenenada, sem desfazer
pelo app.

Isso importa porque a Fase 4 se apoia em *"`killed_seed` está vazio hoje"* e o critério
de aceite dela é *"`killed_seed` continuando vazio"*.

**Conserto de uma linha: inverter a ordem.** DELETE primeiro; `killed_seed` só se o
DELETE voltar sem erro.

### 0.4 Ordem instável em Atrações e Comidas

`load.ts:62-63` faz `select('*')` **sem `.order()`** — diferente de `leg`, `booking`,
`contribution` e `aviso`, que ordenam. `attrsSorted` (`calc.ts:70-73`) só desempata por
status, então entre itens do mesmo status a ordem é a que o Postgres devolveu — e o
Postgres reordena o heap depois de um UPDATE. **Já dança hoje** entre um F5 e outro e
entre os dois navegadores. A Fase 3 transformaria isso em bagunça permanente.

**Conserto:** `.order('name')` nos dois selects.

### 0.5 As duas redes de segurança discordam entre si

`npm test` está **85/85 verde**; `npm run check` está **vermelho, com 5 falhas**, hoje,
antes de qualquer mudança:

```
X  atracoes escolhidas       esperado 8       achado 15
X    ... todas de Lisboa      esperado lisboa  achado lisboa,luxemburgo
X  atracoes no total          esperado 104     achado 106
X    ... no backlog           esperado 27      achado 22
X  texto dos dias comeca vazio  esperado todos vazios  achado 1 com texto
```

A causa: `tests/calc.test.mjs:19-21` roda sobre `dados/estado-atual-do-leo.json`, um
retrato congelado de 04/09; `scripts/check.mjs:15-25` lê o banco de verdade. Os dois são
citados no `COMO-MEXER.md:308-313` como portão de aceite. **Enquanto isso não for
reconciliado, "os testes passam" não é evidência de nada.**

**Decisão:** `estado-atual-do-leo.json` passa a ser declarado **histórico** — é a fixture
sintética dos testes de unidade, e para de ser confundida com o banco. `npm run check`
é a única verdade sobre produção.

**Os 18 números de aceite do `check` são atualizados NESTA fase, não na Fase 3:**
`escolhidas` 8→13, `todas de Lisboa` volta a valer, `atracoes no total` volta a 104,
`backlog` 27→22, `dias com texto` volta a zero. (E o `COMO-MEXER.md:309` diz "82 testes"
quando são 85 — corrigir na mesma passada.)

### 0.6 Limpar as sobras do teste — são três, não duas

Todas de 04/09 entre 19h13 e 19h17, todas em Luxemburgo, nenhuma com `seed_id`, mesma
sessão e mesmo `updated_by`:

- a atração `teste` (€ 50, sem dia);
- a atração `natal` (€ 0, `day_iso = 2026-12-21`) — **a única linha do banco inteiro com
  dia preenchido**. Deixá-la faz o Painel dizer "1 no roteiro" onde a 5.6 promete 0, e faz
  a etiqueta derivada da Fase 3 marcar um lixo de teste como o **único item do roteiro da
  viagem inteira**;
- o plano `"luxr"` do dia 21/12.

Apagadas pelo app, não por SQL. Feito **antes** da Fase 3, para não atribuir à mudança de
fórmula um efeito que era lixo.

### 0.7 O ritual do README destrói o trabalho dele

`README.md:126-127` manda rodar `npm run import` como passo 3 do ritual de banco. Hoje
isso:

- `import.mjs:43` — `update day set base, plan` nos **34 dias**: apaga qualquer texto que
  ele escreveu;
- `import.mjs:66-75` — reescreve `status`, `price_eur`, `name`, `note` e **`day_iso`** das
  atrações casadas por `seed_id`.

Pior, `import.mjs` **grava** `killed_seed` (`:19-29`, a partir do JSON) mas **nunca a
consulta antes de recriar**, e casa burocracia **por nome** (`:127`, busca em `:140`,
insere em `:145`). Consequências: **item de burocracia apagado ressuscita**; e
**renomear** "Passaporte" duplica a linha, com R$ 257,25 duplicados no "já pago" e no
total. A Fase 1 é justamente sobre a aba onde ele vai mexer.

*(Atração apagada **não** ressuscita: `seed_id` órfão cai em `orfas`, `import.mjs:77-79`.
Quem for "consertar" a atração vai consertar o que não está quebrado.)*

Além disso, `estado-atual-do-leo.json` tem uma **6ª burocracia chamada `"teste"`** que não
existe no banco: rodar o import cria um cartão de pendência no Painel do nada.

**Conserto:** aviso em caixa alta no `README.md` de que **`npm run import` é de primeira
carga, não de manutenção**. Consertar o import em si fica fora deste lote.

---

## 3. Fase 1 — Reservas: acrescentar item

**Achado: já funciona.** O formulário existe (`Reservas.tsx:161`, definido em `:209-283`),
tem os quatro campos certos, e `acrescentar` (`:216-232`) chama
`insert('booking', {position, name, note, amount, currency, done:false})`. A política do
Supabase permite INSERT, o botão não tem `disabled`, e as duas colunas obrigatórias
(`position`, `name`) são preenchidas. Não há defeito que o impeça de funcionar.

**O problema é achar.** Em Reservas a ordem visual é: lista → parágrafo de rodapé em
fonte mono → **cartão de acrescentar** → as 13 sugestões. Em Transporte
(`Transporte.tsx:82-83`), Atrações (`Atracoes.tsx:302`) e Comidas (`Comidas.tsx:109`) a
linha de acrescentar fica colada embaixo da lista, dentro do mesmo cartão.

**Mudança:**
1. Subir o `<Acrescentar/>` para antes do parágrafo de rodapé, colado na lista.
2. Dar retorno ao botão. Hoje, se o `insert` falha, `store.tsx:217` só faz
   `setEstado('erro')` e volta: **o item some sem uma palavra**, e a única pista é
   "sem conexão" no cabeçalho. Diferente do `patch`, o `insert` **não tem fila de
   repetição** — item novo que falha está perdido. Vale para todas as telas.

**Registrar:** isto contraria `ESPECIFICACAO.md:697` e `referencia/artefato-v28.html:2037-2052`,
que põem o formulário depois do rodapé. Sem registro, a próxima comparação lado a lado
(seção 15) acusa divergência e alguém "conserta" de volta.

**Cuidado:** a moeda padrão é **real** em burocracia e **euro** em transporte
(regra 5.11). Já houve uma vez em que R$ 257 virou € 257 → **R$ 1.595**
(`calc.ts:133-137`, `ESPECIFICACAO.md:188`).

---

## 4. Fase 2 — "A lançar"

**O que é:** o campo de preço do trecho, vazio. O texto cinza é o marcador de vazio, não
um campo estranho. Duas coisas o fazem parecer texto fixo em vez de campo:

- **A palavra.** São **três dialetos em oito lugares** para o mesmo estado:
  - "a lançar" — `Transporte.tsx:157`, `Roteiro.tsx:406`
  - "valor" — `Transporte.tsx:293`, `Reservas.tsx:102`, `Custos.tsx:296`, `Caixa.tsx:253`, `Caixa.tsx:346`
  - "ignora a diária" — `Hospedagem.tsx:168`

  A própria aba Transporte fala dois: a linha diz "a lançar", o formulário de acrescentar
  diz "valor".
- **A borda.** `estilo-atual.css:318-320` deixa o campo sem borda até o mouse passar.

**Mudança:** padronizar a palavra para **"quanto custa"** nos **sete campos de verdade**,
e dar borda visível ao campo vazio.

**`Roteiro.tsx:406` fica de fora.** É `<div className="vl">{v ? … : 'a lançar'}` — texto
só-leitura dentro do cartão do dia, sem `input`; a regra da borda
(`.mrow .pv:placeholder-shown`) nem se aplica ali. Pôr "quanto custa" é fazer uma pergunta
onde não há caixa para responder. Ali o marcador vira algo que não pareça editável, tipo
**"sem valor"**.

**Nota de ordem:** `Hospedagem.tsx:168` é apagado inteiro pela Fase 6. Padronizar essa
palavra agora é trabalho que a Fase 6 joga fora — desperdício aceito conscientemente, para
não deixar uma tela falando outra língua durante quatro fases.

**Continua editável.** `Transporte.tsx:155` e `:253` são as **únicas** escritas de
`leg.amount` no app inteiro, e `dados/transportes.json` não traz valor nenhum (só `n`,
`w`, `k`). Torná-lo somente-leitura congela o custo de transporte em zero para sempre — e
mata a Fase 5 para transporte.

---

## 5. Fase 3 — O dinheiro segue o roteiro

Os pedidos 1 e 4 são a mesma frase dita de dois lados, e **são um commit conceitual só**.
Fazer só o primeiro deixa a tela dizendo "escolhida" para um item que não entra no total
(mentira visível); fazer só o segundo deixa o rótulo dizendo "backlog" para um item que
ainda soma (mentira invisível, pior).

### 5.1 A regra nova

> **`day_iso` é a única verdade sobre uma atração — para a etiqueta e para o dinheiro.
> `status` deixa de ser escolha e passa a significar origem.**

| conceito | antes | agora |
|---|---|---|
| entra no custo | `status === 'escolhida'` | `day_iso` preenchido |
| etiqueta na lista | select de 3 valores, editável | derivada, não clicável: **no roteiro** / **backlog** |
| `status` | escolha do Leo | origem: `sugerida` = pesquisa · resto = lista dele |
| tirar do dia | não desfaz nada | **tira do total na hora** |

`status` **não muda de forma no banco**: mesma coluna, mesmo `check`, mesmos três
valores. Zero mudança de esquema nesta fase. O que muda é quem lê e quem escreve.

### 5.2 O que muda no código

- **`src/lib/calc.ts`** — `totalBrl:224-233` troca `attrEurAll(s,'escolhida')` por uma
  função nova que soma as atrações com dia. As **cinco** funções que hoje recebem
  `st?: Status` (`calc.ts:76,79,82,85,88`) passam a distinguir três coisas — *no roteiro*,
  *na lista dele*, *pesquisa* — em vez de filtrar por status.
- **`src/screens/Custos.tsx:29`** — o `somaEur` é montado **à mão dentro da tela**, fora
  do `calc.ts`. Se ficar para depois, a coluna € e a coluna R$ **da mesma tabela** contam
  histórias diferentes (`:121` vs `:122`).
- **`src/screens/Painel.tsx` — quatro pontos, e é a primeira tela que ele abre.** `:55`
  (`attrCount(s,'escolhida')`, o KPI "atrações escolhidas"), `:58` (backlog + sugeridas),
  `:81` (`attrEurAll(s,'escolhida')`, a linha de dinheiro) e `:83`. Sem isto o Painel
  imprime "€ 128 · atrações" no mesmo bloco em que `:94` já mostra o total **sem** esses
  € 128 — duas mentiras coladas.
- **`src/screens/Atracoes.tsx`** — some o `<select className="sv">` (`:195-204`); mais
  `:59-61` (o parágrafo que ensina a regra velha com todas as letras: *"Só as escolhidas
  entram no custo"*), `:23-28` e `:84-95` (os chips), `:39-49` e `:51-52` (as contagens),
  `:68` (o € de cada sub-aba de país), `:103-117` (os quatro números do rodapé), `:139` e
  `:149-150` (o resumo de cada uma das 11 cidades). A linha vira **nome | tipo | preço | ×**.
- **`src/screens/Roteiro.tsx:541` e `:589` — a palavra "escolhida" continua impressa.**
  `:589` rotula os candidatos da lista "pôr neste dia", que é **por definição** só de itens
  **sem** dia — hoje isso escreveria "escolhida" em 14 atrações exatamente enquanto a fase
  as declara fora do roteiro. `:541` faz o mesmo dentro de "Atrações deste dia", onde todo
  item **tem** dia. Os dois usam `STROT` (`= ST`, `src/content/index.ts:103`).
- **A cor por status.** `Atracoes.tsx:187` e `Roteiro.tsx:285` pintam a linha com
  `st-${STCLS[status]}` — só a classe, não o texto. `estilo-atual.css:291` dá **fundo
  verde** a `.mrow.st-esc`, `:293` barra ocre a `.st-bac`, `:295` fundo cinza a `.st-sug`,
  `:546` borda verde ao select de tipo. As 14 escolhidas-sem-dia ficariam **verdes de
  "escolhida"** com a etiqueta derivada dizendo "backlog". **A cor segue a etiqueta nova,
  ou sai.**
- **`Roteiro.tsx:596-600`** — o `+` hoje grava `{day_iso, status:'escolhida'}` junto.
  Continua gravando os dois: pôr num dia também **adota** a sugestão. Ver 5.5.
- **`Roteiro.tsx:531-538`** — o `×` grava só `day_iso:null`, deixando o status intacto
  (de propósito, `ESPECIFICACAO.md:130-133`). Continua igual — mas agora **isso tira
  dinheiro do total**, que é o pedido.
- **`scripts/check.mjs:44-55`** — **a segunda cópia da fórmula**, escrita à mão. Sem isso,
  a tela diz R$ 5.337 e o `npm run check` diz outro número. As afirmações de contagem
  estão em `:73-77` e `:88-98` (`:127-128` são `console.log` de valores em €, não
  afirmações).
- **`tests/calc.test.mjs` — são três testes que travam a regra velha, não um:**
  `:146-151` ("104 atracoes: 27 backlog, 8 escolhidas, 69 sugeridas"), `:153-163` (o de
  5.2) e `:165-170` ("ordenacao escolhida → backlog → sugerida").

### 5.3 O painel de sugestões

Decisão 2 do Leo. A lista dele fica em cima; embaixo, um bloco **"sugestões que eu
pesquisei"**, cada uma com `+`.

**O molde de Comidas não serve como está.** Em Comidas a pesquisa é **arquivo** (`FOOD`,
`src/content/index.ts:75`) e o `+` faz `insert('food', …)` **mais**
`insert('adopted', {seed_id})` (`Comidas.tsx:252-262`). Em Atrações as 69 sugeridas **já
são linhas da tabela** (semeadas em `seed.mjs:73`): o `+` ali tem de ser um **UPDATE de
`status`**, mecanismo diferente. Copiar o de Comidas cria linha duplicada.

**E não existe teste nenhum do fluxo do `+`.** `package.json:12` roda calc, merge, ordem,
entrar e avisos; nenhum toca `Comidas.tsx`. A Fase 3 é a primeira ocasião de cobrir isso.

**O 4º chip e a contagem "tudo".** `Lista` monta de `attrsSorted(s,city)`
(`Atracoes.tsx:161`), que inclui as 69. Tirando-as para o painel separado, o chip
"sugeridas" (`:27`) passa a filtrar uma lista que já não as tem — "Nada sugerido aqui" nas
11 cidades — e `conta['']` (`:45`) continua somando `nE+nB+nS`. **Decisão: o chip
"sugeridas" sai** (a camada de pesquisa tem painel próprio) **e `conta['']` passa a ser
`nE+nB`.**

**O Roteiro também separa.** `Roteiro.tsx:503` monta a lista "pôr neste dia" com
`C.attrsSorted(s, pk)`, sem separar as 69 pesquisadas da lista dele. Separar só em
Atrações deixaria misturado justamente na tela que esta fase promove a "onde o dinheiro
nasce". A separação vale para as duas.

Sem isso, as 69 pesquisadas viram itens dele **sem ele ter clicado em nada** — o que a
**regra 5.13** proíbe (`ESPECIFICACAO.md:195-198`). **Oito das 11 cidades são hoje 100%
pesquisa**: Roma, Metz, Amsterdã, Reims, Cáceres, Estrasburgo, Paris e Trier. Só Lisboa,
Madrid e Luxemburgo têm lista dele.

**Nota sobre a ordenação.** `attrsSorted` (`calc.ts:70-73`) e `attrsOfDay` (`:93-97`)
ordenam por `STORD` (escolhida 0, backlog 1, sugerida 2). Com `status` significando
origem, isso continua querendo dizer "a lista dele primeiro, a pesquisa por último" — que
é o que se quer, e por isso não muda. **Mas:** entre "dele com dia" e "dele sem dia" a
ordem não distingue nada, e uma atração **no roteiro** com `status='backlog'` apareceria
**abaixo** de uma legada `escolhida` sem dia nenhum. A ordenação secundária vira `day_iso`
primeiro, depois `name` (que é o `.order('name')` de 0.4).

### 5.4 A linha que impede o zero

Onde hoje `Custos.tsx:78-81` diz *"8 escolhidas · backlog somaria mais € X"*, passa a
dizer:

> **N no roteiro · fora do roteiro somaria mais € X**

**Definição, e ela importa: "fora do roteiro" = a lista dele sem dia** (`status <>
'sugerida'` **e** `day_iso is null`). Não é "tudo sem dia": as 69 da camada de pesquisa
nunca foram dele, e incluí-las faria a linha saltar de € 238 para € 706 sem que ele
tivesse escolhido nada — e a regra 5.13 diz que pesquisa não é dele. A camada de pesquisa
tem o próprio total, no painel de sugestões de 5.3.

Números de hoje, para conferência: escolhidas-sem-dia € 128 · backlog € 110 · **a soma das
duas, que é o que a linha mostra, € 238**. Depois de 0.6 apagar as sobras do teste (€ 50),
**€ 188**.

Isto protege contra o erro **inverso**: os € 78 de Sintra são bate-volta real, e a
**regra 5.12** (decisão dele, `ESPECIFICACAO.md:190-194`) diz que o trem deles já está no
preço da atração justamente para não contar duas vezes. Se nunca ganharem dia, o total
passa a **subestimar** a viagem em R$ 483,60 — e sem essa linha ele não tem como notar.

### 5.5 Armadilhas achadas

**Comida:** `Comidas.tsx:150-152` — trocar o tipo de uma comida para `prato` grava
`{kind:'prato', day_iso:null}`, **limpando o dia**. Hoje é invisível (comida não tem
etiqueta nem preço). Com a etiqueta derivada de `day_iso`, mexer num `<select>` de tipo
passa a **tirar o item do roteiro sem aviso nenhum**. Precisa avisar antes.

**Atração, pelo lado inverso:** `Roteiro.tsx:598` grava `{day_iso, status:'escolhida'}` e
`:535` tira o dia deixando o status. Com o uso, **tudo que passar por um dia vira
`escolhida`**, e o corte atual 15 dele / 22 backlog deixa de ser recuperável. É
consequência **deliberada** da decisão de 5.2 ("pôr num dia também adota"), e está escrita
aqui como consequência para não ser descoberta depois.

### 5.6 A grade da linha de atração fica com um buraco

Tirar o `<select className="sv">` deixa **104px mortos no desktop e 78px no celular**:
`.mrow.at5` é `grid-template-columns:1fr 104px 116px 84px 34px` /
`grid-template-areas:"nm st ak pr x"` (`estilo-atual.css:542-543`) e, no celular,
`78px 104px 1fr 32px` / `"nm nm nm x" "st ak pr pr"` (`:577-578`). Sem o elemento, a área
`st` continua na grade.

**A grade nova (`.mrow.at4`) vai em `extras.css`**, que é o arquivo editável
(`COMO-MEXER.md:137-138`), com a mesma especificidade e depois na ordem — sem tocar em
`estilo-atual.css` e sem esperar a Fase 7. Deixar para a Fase 7 significa **quatro fases
com a aba Atrações furada**.

### 5.7 O que acontece no dia em que subir

Partindo do estado **depois da Fase 0.6** (as sobras do teste já apagadas), que é a ordem
escrita:

- Total real: R$ 5.820,62 → **R$ 5.337,02**
- "Ainda por gastar": R$ 483,60 → **R$ 0,00**, com a linha "fora do roteiro somaria mais
  € 188" logo abaixo
- Painel, "atrações escolhidas": **15** hoje (`Painel.tsx:55` lê o banco) → **0 no roteiro**
- Painel, linha de dinheiro "atrações" (`:81`): € 128 → **€ 0**
- As 15 `escolhida` de hoje continuam existindo no banco. Nenhuma é apagada, nenhuma
  ganha dia inventado.
- **Lisboa tem 13 escolhidas, não 8.** Oito são grátis; as outras cinco são Sintra,
  € 78 = R$ 483,60 — é esse o dinheiro que se move, e é o mesmo que 5.4 protege.

Os números "8 escolhidas / 104 atrações / 27 backlog" vêm de
`dados/estado-atual-do-leo.json`, que 0.5 declarou histórico. Não são o que a tela mostra.

---

## 6. Fase 4 — Dicas por cidade

### 6.1 O mecanismo

A tabela `aviso` já existe e roteia por `spot`, um texto:
`atracoes:<cidade>` · `roteiro:<iso>` · `comidas:<pais>` · `comidas:<pais>:naovale` ·
`transporte`. **Escopos novos: `dicas:<cidade>`, `dicas:voos` e `dicas:pernas`. Zero
mudança de esquema** — é uma linha de texto numa coluna que já existe.

Aba nova **Dicas** (`src/content/index.ts:152-162`), um cartão por cidade, as **11
cidades**, cada um com `<Avisos spot={'dicas:'+cidade}/>`. Editável e apagável, como as
outras quatro telas.

**A aba é a 10ª, e a tipagem ajuda:** `TabKey` sai das abas por `as const`, e
`AppShell.tsx:22-32` é `Record<TabKey, …>` — **esquecer de registrar `dicas` quebra o
`npm run typecheck`**. É a única parte deste lote que a tipagem pega sozinha. A aba salva
de quem já usa o app não quebra (`AppShell.tsx:54` faz `TELAS[tab] ?? Painel`), e no
celular a barra rola sem forçar rolagem da página (`.tabs` é `display:flex;overflow-x:auto`,
`estilo-atual.css:65`).

### 6.2 Como os 18 avisos de dia se movem

**Por `UPDATE` de `spot` e `position`, nunca pelo `×`.** O `×` grava o `seed_id` em
`killed_seed` (`store.tsx:223-232`) e `seed.mjs:176-178` usa essa lista para nunca mais
trazer aquilo de volta (regra 5.14). Seria **irreversível pelo app**. Re-etiquetar
preserva a linha e o `seed_id`, e `seed.mjs:170-176` pula por `seed_id` — então mover
**não** faz o aviso ressuscitar como duplicata. **O `seed_id` não muda** — continua
`av:dia:<iso>`; mudá-lo duplicaria os 18 na próxima semeadura.

`killed_seed` está **vazio hoje** (0 linhas). Ainda dá tempo de fazer certo.

**O `position` vai junto, obrigatoriamente.** `avisos-semente.ts:41` dá `position: 0` aos
18, e o banco confirma: os 18 têm `position = 0`. **Cinco caem em Madrid** (16, 17 e
18/12; 10 e 11/01). Movendo só o `spot`, os cinco chegam empatados; `avisosDe`
(`calc.ts:343-345`) ordena por `porPosicao` (`:164-167`), que desempata por **uuid** —
determinístico e igual nos dois navegadores, mas arbitrário e sem sentido editorial. E
**aviso não tem setas de ordem**: `mover` (`src/lib/ordem.ts`) só é usado em
`Transporte.tsx:12` e `Reservas.tsx:13`. **O Leo não teria como consertar a ordem pela
tela.** O UPDATE escreve `position` 0…n-1 dentro de cada cidade.

**Quem faz o UPDATE: um script, `scripts/mover-avisos.mjs`.** Não existe hoje quem faça
isso — `Avisos.tsx` edita só `title` (`:84`), `body` (`:92`) e `tone` (`:100`); o `spot` é
fixado por quem monta o componente (`:181` grava verbatim). E `seed.mjs:176-178` **só
insere** o que ainda não existe: editar o arquivo semente não muda uma linha já semeada.
**"Zero SQL" significa "sem mudança de esquema", não "sem escrita no banco".** O script
faz os 18 UPDATEs a partir de uma tabela de destino escrita à mão, é idempotente (casa por
`seed_id`) e imprime o antes/depois.

**E `src/lib/avisos-semente.ts:37-43` é editado junto**, ou a demonstração e o próximo
banco nascem errados. O cabeçalho do próprio arquivo (`:5-9`) diz que ele e o `seed.mjs`
têm que concordar. Sem editar: `carregarDemo` reconstrói os avisos dessa função
(`load.ts:252-253`), então **no modo demonstração a aba Dicas nasce vazia e os 18 voltam
para os dias**; e um banco novo pelo ritual do README nasce com o layout velho.

### 6.3 O que fica no dia, o que vai para Dicas

Decisão 4 do Leo: **dia limpo, menos os 3 vermelhos.**

**Os dois indicadores ficam, condicionados a `tone === 'alert'`.** `Roteiro.tsx:206` (o
triângulo do calendário) e `:250-252` (a etiqueta na linha do bloco) são os **únicos dois
lugares onde um aviso de dia aparece sem clicar no dia** — os dois saem de `avisoDe`
(`:37`); `:329` já exige o clique. Apagando os dois sem ressalva, o alerta de 24/12 — o
único aviso do roteiro que pode arruinar um dia — só existiria para quem abrisse o dia 24.
**Dia limpo é dia sem triângulo ocre e sem etiqueta de dica, não dia sem alerta.**

**Ficam no dia (tom `alert`):** 24/12 (todo o transporte de Luxemburgo para às 20h),
29/12 (a perna mais cara), 06/01 (Epifania, feriado italiano).

**Onde os outros vão é redação item a item, não fórmula.** Duas armadilhas:

1. **Dois não têm cidade nenhuma.** `2026-12-10` e `2027-01-12` têm base `"em trânsito"`,
   e `cityOfBase('em trânsito')` devolve string vazia (`calc.ts:352-362`). São justamente
   os que guardam os **números dos voos**: `FLN 20h15 (LA4519) → GRU 21h40 … GRU 23h35
   (LA8066)` e `MAD 23h35 (LA705) → SCL 8h55 … SCL 16h40 (LA726)`. Vão para o cartão
   **"Voos"** (`dicas:voos`), fora da lista de cidades.
2. **Em seis dias de viagem a base é o DESTINO e o aviso é da PARTIDA.** Mandar pela
   fórmula joga o aviso na cidade errada:

   | ISO | base (destino) | do que o aviso fala |
   |---|---|---|
   | 2026-12-16 | Madrid | **sair de Lisboa** de carro, passando por Cáceres |
   | 2026-12-19 | Metz | o **voo Madrid → Luxemburgo** e o ônibus 16 no aeroporto |
   | 2026-12-25 | Metz | **Luxemburgo fechando** e o Winterlights |
   | 2026-12-26 | Reims | **Metz → Reims** e o feriado na Moselle |
   | 2027-01-02 | Roma | a **saída de Amsterdã** e o trem da Lu |
   | 2027-01-10 | Madrid | o **voo Roma → Madrid** |

   Esses vão para o cartão **"Voos e pernas"** (`dicas:pernas`), não para a cidade de
   chegada.

**E os que têm data no meio do texto** ("hoje é quinta — sua primeira das duas chances",
17/12; "é segunda: a janela grátis vale", 11/01) têm o texto reescrito ao mover: cinco
ISOs caem em Madrid, e juntos num cartão de cidade "hoje é quinta" e "é segunda" viram
contradição.

### 6.4 Cuidado herdado

`dados/avisos-cidade.json` e `dados/avisos-dia.json` **ainda têm `<b>` cru** — são a
semente, e `deHtml()` converte na semeadura. Se a aba Dicas ler esses JSONs direto para a
tela, o `<b>` volta cru e reabre o buraco de 04/09, em que um `<` sem `>` engolia o resto
da frase. **Todo texto passa por `marcado()` ou `deHtml()`.** O negrito se escreve
`*assim*` — decisão dele, `COMO-MEXER.md:456-466`.

E `src/lib/avisos-semente.ts:55-60` gera `seed_id` **posicional**
(`av:naovale:<pais>:<i>`, o índice dentro de `comidas-sugeridas.json`). Reorganizar esse
arquivo enquanto se mexe nos avisos duplica os 15 "não vale" na próxima semeadura.

---

## 7. Fase 5 — Valor pago × valor esperado · **precisa de SQL**

Hoje existem **dois** marcadores de pago no app inteiro, e são booleanos: `leg.bought` e
`booking.done`. `pagoBrl` (`calc.ts:216-218`) = voo + burocracia marcada + trecho
comprado. **Atração e hospedagem não têm como ser marcadas como pagas** — então mesmo
depois de ele pagar o Palácio da Pena, ele nunca entra no "já pago".

**Mudança:** coluna `paid boolean not null default false` em `attraction` e em
`stay_option` (Fase 6). Caixinha na linha, como em Transporte e Reservas.

**Boolean e não campo de valor**, para ser igual ao resto do app: *esperado* = tudo que
conta; *pago* = o que está com a caixinha marcada.

### 7.1 A coluna morre no normalizador se estes três não forem mexidos

`load.ts:103-109` (`normAttr`) monta o objeto **campo a campo — é lista branca**. Uma
coluna `paid` nova simplesmente não é copiada. O modo de falha *parece* funcionar, que é o
pior tipo:

- clicar a caixinha → `now()` grava no banco e `mesclar` (`merge.ts:63`) faz
  `{...x, ...cols}` — **a tela mostra marcado**;
- o outro navegador recebe pelo Realtime e `aplicarRemoto` (`merge.ts:117-130`) copia
  `p.new` inteiro — **também marcado**;
- **no primeiro F5**, `carregar` → `normAttr` descarta `paid` → **tudo desmarcado**, e o
  "já pago" cai.

**A lista da Fase 5 inclui obrigatoriamente:**
1. `src/lib/types.ts:18-28` — `paid: boolean`, **obrigatório, não opcional**. É o que faz o
   `tsc` acusar os outros dois sozinho; com `paid?: boolean` nada é acusado e o dado some
   em silêncio.
2. `src/lib/load.ts:103-109` — `normAttr`.
3. `src/lib/load.ts:185-192` — `carregarDemo`, que monta `Attraction` à mão.

### 7.2 As duas cópias da fórmula do "já pago"

Sem alterar as duas, a caixinha nova é decorativa:

- `src/lib/calc.ts:216-218` — `return VOO + bookingBrl(s,'pago') + legBrl(s,'pago');`
- `scripts/check.mjs:53` — `const jaPago = VOO + emBrl(bookS('pago')) + emBrl(legS('pago'));`

É a mesma "segunda cópia da fórmula" apontada em 5.2.

### 7.3 Onde a caixinha entra na grade

A Fase 3 **tira** uma coluna da linha de atração; esta **põe outra de volta**. A linha
final é **nome | tipo | preço | ✓pago | ×**, com a caixinha em `grid-area: ok`,
reaproveitando `.mrow .ck` (`estilo-atual.css:552-553`, 18×18 — que a Fase 7 sobe para
24). A grade nova, desktop **e** celular, é escrita junto com a coluna, em `extras.css`.
`ESPECIFICACAO.md:1024-1025` registra o caso vivido de coluna de select em `1fr` no
celular.

Vai na **mesma colada de SQL** da Fase 6.

---

## 8. Fase 6 — Hospedagem por país · **precisa de SQL** · a mais cara

### 8.1 O que existe hoje

Hospedagem não é lista: são **7 cartões fixos**, um por base, e dentro dele o Leo preenche
endereço e diária. A tabela `stay` tem **`city` como chave primária**
(`01-schema.sql:105`) — o banco só aceita **uma** hospedagem por cidade. Duas opções em
Madrid é impossível hoje. E os bairros pesquisados estão **em prosa**: Madrid tem três
(Chamberí, Argüelles, Tetuán) empacotados numa frase (`dados/hospedagem.json:17`).

**As 7 linhas estão vazias.** Conferido coluna por coluna no banco: `address`, `check_in`,
`check_out`, `link` e `notes` em branco; `nightly_eur`, `nights`, `total_eur` e
`updated_by` nulos; `updated_at` idêntico nas 7 (o carimbo da semeadura). **Nenhuma foi
tocada por gente, e o Leo não vai redigitar nada.**

### 8.2 Dois bloqueios antes do SQL

1. **Uma hospedagem nova não apareceria na tela, nem local.** `merge.ts:68-69` faz
   `const l = LISTA[t]; if (!l) return v;` — e `LISTA` não conhece `stay`
   (`merge.ts:28-38`). O insert vai ao banco e a linha não pinta.
2. **Um INSERT remoto de cidade nova é descartado em silêncio.** `mesclar` para `stay` é
   `const st = v.stays[pk]; if (!st) return v;` (`merge.ts:51-52`). *Precisão do
   mecanismo:* `vazio()` (`load.ts:31`) **pré-preenche as 7 cidades de `STAYS`**, então um
   INSERT remoto de uma das 7 na verdade **mescla**. O descarte vale para cidade **fora**
   de `STAYS` — que é exatamente o caso de qualquer opção nova.

Isto é diferente do problema de `replica identity full` (que é do DELETE, e `stay` também
não está na lista, `02-politicas.sql:119-127`). **Os três são pré-requisito.**

### 8.3 O modelo escolhido: tabela nova ao lado

**Tabela nova `stay_option`**, não reforma da `stay`.

```
id           uuid primary key default gen_random_uuid()
city         text not null
name         text not null          -- "Chamberí", "Argüelles"
note         text not null default ''
nightly_eur  numeric(10,2)
nights       int
total_eur    numeric(10,2)
address      text not null default ''
check_in     text not null default ''
check_out    text not null default ''
link         text not null default ''
chosen       boolean not null default false   -- "é essa"
paid         boolean not null default false   -- a Fase 5
position     int not null default 0
seed_id      text unique
created_at / updated_at / updated_by
```

**`position` com `default 0`, e isso não é detalhe.** Sem default, um formulário que
esqueça o campo faz o PostgREST devolver 4xx, o que cai em `store.tsx:217` —
`setEstado('erro')` e **o item some sem uma palavra**, porque o `insert` não tem fila de
repetição (ver 14). É o pior modo de falha do app; a tabela nova não precisa herdá-lo. A
renumeração 0…n-1 fica com o `mover`, como já é em transporte.

**Por quê tabela nova e não reformar a `stay`:** trocar a chave primária arrastaria
`Snapshot.stays` de dicionário (`types.ts:134`) para lista, e daí `load.ts`, `calc.ts`,
Painel, Custos, Caixa, `check.mjs` e dois testes. **E não há dado para migrar** (8.1).

`stay` fica no banco, **aposentada**: o código para de lê-la, ninguém a apaga. Reversível.

*Nota de honestidade:* não se pode argumentar que a `stay` fica intocada "porque é o
exemplo do teste que prova a promessa central" (`tests/merge.test.mjs:153-162`) — esta
mesma seção a aposenta, e depois disso o teste fica verde testando uma tabela que nenhuma
tela lê. O mecanismo continua coberto por `day`, `settings` e `savings`
(`merge.ts:45-59`), então não há buraco de cobertura. A justificativa válida é a de cima.

**Sem coluna de país.** O país sai da cidade, como em Atrações: `CT[city].co` e `ccOf()`
(`src/content/index.ts:39-43`), com a agregação em `calc.ts:79-81`. Guardar `country` na
linha duplicaria a verdade.

### 8.4 As fórmulas e os quatro consumidores de `stayCount`

`stayTotalAll` (`calc.ts:122-124`) hoje soma **todas** as linhas, sem olhar situação, e
entra em `totalBrl` (`:228`). Passa a somar **só a `chosen`** — como
`attrEurAll(s,'escolhida')` faz na mesma linha. Sem isso, três opções em Madrid com diária
lançada entram as três no total.

**`stayCount` tem quatro consumidores, não um:** `Painel.tsx:62` (KPI "hospedagens
fechadas", `{comEndereco}/{STAYS.length}`), `Painel.tsx:78` ("N de 7 bases lançadas"),
`Painel.tsx:224-228` ("N de 7 hospedagens sem reserva") e `Hospedagem.tsx:35`. **"Com
endereço salvo" tem de virar "bases cuja opção *marcada* tem endereço"** — senão três
opções em Madrid com endereço contam três e o KPI vira "9/7". O denominador continua sendo
**as 7 bases**.

### 8.5 `scripts/check.mjs` — a rede de segurança que a Fase 6 cegaria

0.5 elegeu o `npm run check` como **a única verdade sobre produção**. Ele lê `stay` em
`:23`, soma em `:46-49`, joga no `totalReal` em `:53-55`, afirma `stay.length === 7` em
`:100` e imprime em `:129` e `:132`. Com a `stay` aposentada e vazia, ele passaria a dizer
hospedagem € 0 e um total que não bate com a tela — exatamente o defeito que 5.2
diagnosticou para a Fase 3, repetido três fases depois. **Entra na lista de mudanças da
Fase 6.**

**Lista completa dos consumidores de `s.stays`, para o plano de execução:**
`calc.ts:115-127` e `:228` · `load.ts:31,66,85` · `types.ts:134` · `merge.ts:24,50-54,123` ·
`Hospedagem.tsx:63` + as 8 escritas `patch('stay',…)` de `:113` a `:191` ·
`Painel.tsx:25,62,78,224` · `Custos.tsx:20,70,71` · `Caixa.tsx:116,140` (via `totalBrl`) ·
`check.mjs:23,46-49,53-55,100,129,132` · `import.mjs:186` · `seed.mjs:137,142` ·
`tests/calc.test.mjs:67,175-184` · `tests/merge.test.mjs:153-162`.

**`import.mjs:186` e `seed.mjs:134-144` continuam escrevendo na tabela morta.** Nada
quebra, mas o ritual do README passa a gravar hospedagem num lugar que a tela não lê —
e 0.7 registra que ele roda esse ritual. Ganham um comentário dizendo que a tabela está
aposentada.

### 8.6 As sub-abas, e os países sem base

A viagem tem 7 países e 11 cidades, mas só **7 bases**. Ficam sem base: Estrasburgo,
Paris, Luxemburgo e Trier — o que deixa **dois países inteiros sem base nenhuma**
(Luxemburgo e Alemanha). Copiar `CO.map` de `Atracoes.tsx:66-81` sem pensar entrega duas
abas que nunca mostram nada.

**Decisão:** as 7 abas aparecem; Luxemburgo e Alemanha mostram **"aqui é bate-volta de
Metz"** em vez de lista vazia. Aba vazia parece bug, e não é — o próprio rodapé da tela
(`Hospedagem.tsx:52-55`) explica que Paris saiu de propósito.

**O `selCO` é compartilhado, e persiste em disco.** `ui.tsx:11,38,56` é compartilhado de
propósito entre Atrações e Comidas (`ui.tsx:2-3`), e `setSelCO` grava em `localStorage`
(`:56`). **Decisão: a Hospedagem entra no mesmo `selCO`** — é o comportamento que as
outras duas já têm entre si. **Consequência a registrar:** escolher Luxemburgo na
Hospedagem, que é a aba onde só se lê "aqui é bate-volta de Metz", deixa **Atrações e
Comidas abrindo em Luxemburgo no próximo F5**. Aceitável, mas escrito — senão vira "bug"
na próxima rodada.

### 8.7 Os dados semente

**Não existe nenhuma lista de hospedagem no repositório hoje**, só prosa. Arquivo novo
`dados/hospedagens-sugeridas.json`, no formato de `atracoes-sugeridas.json`, **mais a
cópia idêntica em `src/content/`** — o seed lê `dados/`, a tela lê `src/content/`
(`seed.mjs:13-19` vs `index.ts:7-12`), e criar só num dos dois dá uma tela que mostra
opções que o banco nunca vai ter. **Nada no build reclama disso.**

O conteúdo sai do que **já está escrito em prosa** em `dados/hospedagem.json` (bairros e
faixas de preço pesquisados), transformado em itens. Não se inventa preço de hotel.

Bloco novo em `scripts/seed.mjs` no molde do bloco 2 (`:54-76`), respeitando
`killed_seed`. Prefixo de `seed_id`: `h:<cidade>:<índice>`, seguindo
`ESPECIFICACAO.md:889-896`.

### 8.8 As sete listas que ninguém lembra

Tabela nova tem que entrar em **todas**:

1. RLS — `02-politicas.sql:38-51` e `:62-72`
2. publicação `supabase_realtime` — `:104-116`
3. `replica identity full` — `:119-127` (sem isso o DELETE não chega com a linha, e a
   opção apagada pelo Leo continua na tela da Lu)
4. o array `tabelas` do canal — `store.tsx:240-241` (**a `aviso` ficou de fora na primeira
   escrita e nada sincronizava, com o SQL todo certo do outro lado**)
5. `Tabela`, `PK` e `LISTA` em `merge.ts:9-38`
6. **`src/lib/load.ts:56-74`** — `carregar()` tem **13 selects fixos** num `Promise.all`.
   Sem um 14º, a tabela nunca é lida.
7. **`src/lib/load.ts:25-44` (`vazio()`) e `src/lib/types.ts:128-138` (`Snapshot`)** — a
   lista nova precisa existir no estado inicial. E **`store.tsx:140`**, o array
   `COM_AUTOR`, ou `updated_by` nunca é gravado apesar de estar no esquema.

**O item 7 não é falha silenciosa, é crash.** Pondo `stay_option` em `LISTA` sem a chave
existir no Snapshot: `merge.ts:70` faz `[...(v[l] as unknown[]), row]` sobre `undefined` →
TypeError no primeiro INSERT remoto; `merge.ts:63` faz `.map` sobre `undefined` →
TypeError no primeiro UPDATE remoto. **A tela inteira cai.**

**E tudo repetido em `supabase/00-tudo.sql`**, que é concatenação **manual** de 01+02 e é
o arquivo que o README manda colar. Editar um e esquecer o outro faz o próximo banco
nascer diferente, em silêncio.

### 8.9 O `warn` de cada base

Hoje é texto fixo (`Hospedagem.tsx:83-88`). Em Atrações e Comidas o equivalente já virou
aviso editável em 05/09. Vira `<Avisos spot={'stay:'+city}/>`, semeado por
`src/lib/avisos-semente.ts`.

---

## 9. Fase 7 — A identidade visual

Por último porque as Fases 3, 4, 5 e 6 mudam o que existe para estilizar. (A exceção é a
grade da linha de atração, que sai na própria Fase 3 — ver 5.6 — para não deixar a aba
Atrações furada por quatro fases.)

### 9.1 O diagnóstico

**O CSS portado não divergiu do artefato.** Comparados linha a linha, ignorando
indentação, `src/app/estilo-atual.css` e `referencia/estilo-atual.css` só diferem no
comentário de cabeçalho e nas tags `<style id="css">`/`</style>` da referência: **nenhuma
regra foi mexida.** "Está feio" não é bug de porte — é o desenho original, visto num
contexto que ninguém conferiu.

**Mas o app carrega dois CSS** (`layout.tsx:2-3`): `estilo-atual.css` e
`src/app/extras.css` — este último **nosso, sem contraparte na referência**. Todos os
números abaixo são dos **dois somados**, que é o que o navegador vê.

**(A) Os dois pares estruturais falham nos DOIS temas.** Esta é a correção mais
importante do diagnóstico, e ela derruba a hipótese fácil de que bastava consertar o tema
claro. Contrastes WCAG medidos:

| par | claro | escuro |
|---|---|---|
| cartão sobre a página (`--surface`/`--ground`) | **1,07:1** | **1,09:1** |
| fio sobre o cartão (`--hairline`/`--surface`) | **1,39:1** | **1,33:1** |
| `--muted` / `--surface-2` | 4,06:1 ✗ | 5,17:1 ✔ |
| `--muted` / `--ground` | 4,39:1 ✗ | 6,21:1 ✔ |
| `--ochre` / `--ochre-wash` | 4,05:1 ✗ | 7,65:1 ✔ |

No escuro os três pares de **texto** passam. **Os dois estruturais — os que fazem o cartão
existir — falham nos dois, e no escuro o fio está pior.** O mínimo para elemento de UI é
3:1. `COMO-MEXER.md:683-684` confessa que o tema claro nunca foi olhado; o que ninguém
tinha medido é que o escuro também não separa cartão de fundo.

**(B) Não há escala tipográfica.** 121 declarações de `font-size` para **25 valores
distintos**, com passos de meio pixel (9, 9.5, 10, 10.5 … 16.5, 17, 20, 22, 24, 26, 27,
30, mais `clamp(26px,5vw,38px)` e `inherit`). **53 declarações em ≤11,5px**, sendo 50 em
≤11px e 12 em 9-9,5px. Mais 19 valores de `letter-spacing` e **7** de `line-height`.

**(C) Não há grade de espaçamento.** **29 valores distintos** de padding/margin/gap,
incluindo os ímpares 3, 5, 7, 9, 11, 13, 17. Nada encosta num ritmo de 4 ou 8px — é por
isso que nenhuma linha alinha com a de baixo. Os **10** `style={{margin…}}` inline nos
`.tsx` são sintoma disso.

**(D) Os estados estão pela metade.** `:active` **não existe em lugar nenhum**. `.chip` e
`.fchip` **não têm `:hover`** — e são `<button>` de verdade em 8 lugares de 5 telas.
**Uma única `transition` real** no app inteiro. E o anel de foco está morto:
`:focus-visible` (`estilo-atual.css:48`) é anulado por **11 regras `outline:none`** de
especificidade maior.

**(E) Três tratamentos para a mesma coisa.** `.kpi` (30px), `.bigsum` (27px) e
`.bigsum.b5` (24px) — e **o Painel empilha dois deles** (`Painel.tsx:39` e `:69`), na
primeira tela que ele abre.

**(F) Celular.** Ele usa: viewport declarado, 20 media queries, e `COMO-MEXER.md:670-671`
registra o teste de 9 abas × 360/390/768. Mas: só **2 breakpoints**, ambos `max-width`
(700 e 560 — o tablet de 768px que a spec manda testar cai no lado desktop); e os alvos de
toque estão abaixo do mínimo — checkbox de atração **17×17**, de transporte 18×18, de
reserva 19×19 (WCAG 2.2 pede 24; para dedo, 44).

**O achado estrutural:** existem tokens só para **cor** e **família de fonte**. Não existe
token de espaçamento, tamanho, raio nem sombra. **Metade do design system não é sistema —
é valor solto, regra a regra.**

### 9.2 O que o Leo escolheu

**Mudar a identidade de vez**, o que revoga explicitamente `ESPECIFICACAO.md:1006-1007`:
*"Nada de cantos arredondados. Nada de sombra… É um visual editorial, de papel."* Hoje há
**zero** cantos arredondados em caixa (só duas bolinhas: `.savedot`, `.presenca i`) e
**zero** sombras de elevação (as 9 `box-shadow` são todas `inset 3px 0 0`).

### 9.3 Como isso vai ser feito

**Arquivo novo, `src/app/identidade.css`**, importado depois dos dois atuais em
`layout.tsx:2-3`. `estilo-atual.css` fica **intocado** — é o que permite provar o que é
original e o que é nosso (`COMO-MEXER.md:137-138`).

**Atenção à especificidade, e isto não é detalhe — é onde eu tinha errado.** Os tokens do
arquivo antigo estão em **três** blocos, não num `:root` só:

| bloco | linha | especificidade |
|---|---|---|
| `:root` | `estilo-atual.css:7` | (0,1,0) |
| `@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) }` | `:19-20` | **(0,2,0)** |
| `:root[data-theme="dark"]` | `:29-30` | **(0,2,0)** |

Um `:root` pelado no arquivo novo é (0,1,0) e **perde para os dois blocos escuros**: a
identidade nova apareceria no tema claro e **não** no escuro — sem erro nenhum, exatamente
o sintoma de `COMO-MEXER.md:624` ("mudei o CSS e nada aconteceu"). **Toda redefinição de
token existente repete os três seletores no arquivo novo.** Token que o arquivo antigo não
define (espaçamento, escala tipográfica, raio, elevação) não compete com nada e basta
declarar em `:root`.

E `src/app/extras.css` também vem antes: os 3 `outline:none` dele (`:107`, `:121`, `:164`)
continuam valendo. "O original fica intocado" garante o `estilo-atual.css`, não o
`extras.css` — este é editável por desenho.

**A identidade nova entrega, no mínimo:** os tokens que faltam (espaçamento, escala
tipográfica, raio, elevação); **os dois pares estruturais consertados nos dois temas**;
os pares de texto consertados no claro; os estados de interação (`:hover` em chip,
`:active`, anel de foco por `box-shadow` — não `outline`, para não brigar com as barras
`inset`; uma transição curta, respeitando o `prefers-reduced-motion` de
`estilo-atual.css:386`); o bloco de números grandes unificado; e alvos de toque de 24px+
no celular.

**Antes de codar: o Leo escolhe olhando.** Vai um link com **2 ou 3 direções visuais
aplicadas às telas de verdade dele, com os números dele**. "Cantos suaves e sombra leve"
não se aprova por escrito. Só depois da escolha é que o CSS é escrito.

### 9.4 As armadilhas do CSS

- **Renomear classe quebra em silêncio** — sem erro de build, sem erro de runtime. As
  piores são as grades `.mrow.at5/.tr5/.x3/.food/.ap`, que casam `grid-template-areas` com
  nomes de área (`nm`, `st`, `ak`, `pr`, `cu`, `ok`, `x`, `wh`, `dt`, `qu`, `ac`) que têm
  que existir dos dois lados.
- **`--ground` é cor de texto sobre fundo colorido** em `.bar > div`
  (`estilo-atual.css:254`) e `.chip[aria-pressed="true"]` (`:83`). Escurecer `--ground`
  para separar o cartão **piora** esses dois — hoje `--ground` sobre `--c-nl` já está em
  3,86:1. Os dois têm que ser conferidos na mesma mudança.
- **`.nv` tem `!important` em quatro propriedades** (`:321-322`). Toda regra nova para o
  campo de nome perde para ela, mesmo vindo depois.
- **`.card > .h` e `.card > .b` são filho direto** (`:89,92`), e `.n > b:first-child`
  (`:127`) depende de o primeiro filho ser um `<b>`. Envolver o conteúdo num wrapper — o
  reflexo natural de quem vai "organizar o layout" — apaga o cabeçalho dos 22 cartões sem
  erro nenhum.
- **Mexer no tamanho dentro das grades mobile derruba os selects.**
  `ESPECIFICACAO.md:1024-1025` registra o caso vivido: coluna de select em `1fr` no
  celular fez "🚶 passeio" virar "🚶 pa". As colunas estão em px por isso.
- **O escuro está duplicado em dois blocos idênticos.** Esquecer um faz o app mudar de
  cara quando o visitante troca o tema no dedo em vez de no sistema.
- **CSS morto que vale ressuscitar:** `.day--today` (`:115`, fundo verde no dia de hoje)
  tem **zero** ocorrências no JSX — e já era morta no próprio artefato. **Num app de
  viagem, o dia de hoje não acende em lugar nenhum.**

---

## 10. As migrações: uma colada só

**Fases 5 e 6 são as únicas que pedem mudança de esquema.** Fases 0 a 4 e 7 não pedem
— lembrando que a Fase 4 **escreve no banco** (o script que move os 18 avisos), o que não
é a mesma coisa que mudar o esquema.

Arquivo único `supabase/05-hospedagem-e-pago.sql`, com:

1. `create table stay_option` (8.3)
2. `alter table attraction add column paid boolean not null default false`
3. RLS, publicação e `replica identity full` para `stay_option`
4. **o desfazer escrito embaixo**, em comentário

E o mesmo aplicado a `supabase/00-tudo.sql`.

**Uma colada no painel do Supabase, não três.** É pedido manual ao Leo, num computador —
não dá do celular. Quando chegar a hora: abrir a página no Chrome com o SQL já colado, e
deixar o clique final para ele.

**As Fases 0.2 e 0.3 vêm antes desta colada, não depois.** Uma migração malfeita com a
fila sem teto congela o campo contra a Lu até dar F5.

---

## 11. Ordem de execução

```
Fase 0  higiene                     sem esquema  ← o total cai R$ 310 (lixo de teste saindo)
Fase 1  Reservas: acrescentar       sem esquema  ← independente, o mais barato
Fase 2  "a lançar"                  sem esquema  ← independente
Fase 3  o dinheiro segue o roteiro  sem esquema  ← pedidos 1 e 4, um commit conceitual
Fase 4  dicas por cidade            sem esquema  ← escreve no banco por script
Fase 5  pago × esperado             SQL ┐
Fase 6  hospedagem por país         SQL ┘        ← uma colada só
Fase 7  identidade visual           sem esquema  ← por último, depois da escolha visual
```

O total anda **duas vezes**, não uma:

```
hoje                    R$ 6.130,62    ainda por gastar  R$ 793,60
depois da Fase 0.6      R$ 5.820,62    ainda por gastar  R$ 483,60
depois da Fase 3        R$ 5.337,02    ainda por gastar  R$   0,00  (+ "fora do roteiro: € 188")
```

Por que esta ordem, nas arestas que importam:

- **3 antes de 4:** quando o total passa a seguir o roteiro, o Roteiro vira a tela mais
  importante do app. Mexer no que ele mostra é mais seguro depois que o novo papel dele
  estiver de pé.
- **3 antes de 6:** o padrão de sugestões da Fase 3 é o **molde** da Hospedagem.
- **5 e 6 juntas:** uma colada de SQL, não duas.
- **7 por último:** as fases 3 a 6 mudam o que existe para estilizar.
- **0.2 e 0.3 antes de 5 e 6:** pré-requisito de segurança de qualquer migração.

**Regressões entre fases:** entre a Fase 3 e a Fase 5 ele fica com o total novo sem a
caixinha de pago em atração — mas isso **não é perda**: `pagoBrl` (`calc.ts:216-218`)
nunca incluiu atração. Ele continua sem ganhar, não passa a perder. A ordem está certa.

---

## 12. As regras da especificação que mudam

Reescritas no formato **"Revista em 05/09/2026"**, como a 5.6 já foi. **Se isso não for
feito, a próxima rodada desfaz tudo achando que achou um bug** — a especificação é a fonte
declarada da verdade (`COMO-MEXER.md:7-8`).

| regra | onde | o que acontece |
|---|---|---|
| **5.2** | `ESPECIFICACAO.md:126-128` | revogada: o custo passa a seguir `day_iso`, não `status` |
| **5.3** | `:130-133` | revista: tirar do dia continua não mexendo no `status`, mas **agora tira do total** |
| **5.10** | `:181-183` | **estendida**: hoje cobre transporte e burocracia; ganha hospedagem, que hoje não está escrita nela |
| **5.12** | `:190-194` | fica de pé, e ganha a linha "fora do roteiro somaria mais € X" como proteção |
| **5.13** | `:195-198` | fica de pé — é ela que exige o painel separado com `+` |
| **10.6** | `:673-686` | reescrita: hospedagem deixa de ser "um cartão por base (7)" |
| **11.5** | `:787-793` | reescrita: deixa de ser "soma das 7", passa a ser "soma da escolhida" |
| **11.7** | `:811-832` | reescrita: a fórmula do total real, e a do "já pago" com as caixinhas novas |
| **13 (visual)** | `:1006-1007` | **revogada por decisão dele**: cantos arredondados e sombra passam a ser permitidos |
| **seção nova** | — | a aba **Dicas** e os escopos `dicas:<cidade>`, `dicas:voos`, `dicas:pernas` |

E no `COMO-MEXER.md`: a seção 0 ("onde eu parei"), a seção 5 (as decisões dele), o mapa de
arquivos (que ganha `identidade.css`, a aba Dicas e `stay_option`), o "82 testes" de
`:309` (são 85) e as "27 combinações" de `:670-671` (viram 60 — ver 13).

---

## 13. Como se prova que cada fase funcionou

- **Fase 0:** `npm run check` **verde** — é o portão que hoje está vermelho com 5 falhas.
  Um teste novo para `stripTags` provando que `comida < 20 euros/dia` chega inteiro ao
  banco. Um teste do teto de tentativas. Um teste de que `killed_seed` só é gravado se o
  DELETE voltar sem erro.
- **Fase 1:** acrescentar um item em Reservas e ele aparecer no outro navegador. E um item
  que falha mostrar mensagem, em vez de sumir.
- **Fase 2:** as **cinco** telas (Transporte, Reservas, Custos, Caixa e Hospedagem)
  dizendo a mesma palavra; `Roteiro.tsx:406` dizendo "sem valor" e não parecendo campo; o
  campo vazio com borda visível sem passar o mouse.
- **Fase 3:** os números de 5.7, batendo na tela **e** no `npm run check`. A tabela de
  Custos com a coluna € e a coluna R$ contando a **mesma** história. Nenhuma linha verde de
  "escolhida" com etiqueta dizendo "backlog". Os três testes de `calc.test.mjs` travando a
  regra nova. Um teste do `+` das sugeridas (que hoje não existe para tela nenhuma).
- **Fase 4:** os 45 avisos ainda 45 depois de mover (nada apagado); `killed_seed`
  continuando **vazio**; `npm run seed` de novo **não** duplicando; os 3 vermelhos ainda
  com triângulo e etiqueta no dia; os números dos 4 voos achaveis em Dicas; e o **modo
  demonstração** mostrando a aba Dicas cheia (que é o que prova que `avisos-semente.ts`
  foi editado junto).
- **Fase 5:** marcar a caixinha, **dar F5**, e continuar marcada (é o teste que pega o
  `normAttr`). O "já pago" subindo na tela **e** no `npm run check`.
- **Fase 6:** a colada rodada; `stay_option` na publicação e com `replica identity full`;
  a Lu criando uma opção e ela **aparecendo no Leo sem F5**; apagar uma opção sumindo dos
  dois; o total somando **só a marcada**; o KPI do Painel continuando sobre 7 bases; e o
  `npm run check` **verde** (é ele que 0.5 elegeu como a verdade).
- **Fase 7:** as **10 abas** × 360/390/768 com zero rolagem horizontal, **nos dois temas**
  — **60 combinações**. E os contrastes de 9.1 passando **nos dois temas**, inclusive os
  dois pares estruturais.

**O tempo real só se prova com duas pessoas.** Eu tenho uma sessão: o que eu consigo
provar é a mesclagem em memória (`tests/merge.test.mjs`) e a assinatura do canal, que não
é a mesma coisa. Quem confere é o Leo, com os dois navegadores — foi assim em 05/09.

---

## 14. O que fica fora deste lote

Achado e **não** consertado aqui, para não inchar o escopo. Registrado para não se perder:

- **`npm run import` casa burocracia por nome e nunca consulta `killed_seed`** (0.7).
  Ganha um aviso no README; o conserto de verdade fica para depois.
- **`settings.flight_paid_brl` existe no banco e nunca é usada** — o app carrega
  (`load.ts:86`) e todo cálculo usa a constante `VOO` de `src/content/index.ts:125`.
  Quem "consertar" isso muda o total sozinho.
- **A tabela `stay` aposentada** (8.3): fica no banco, sem ser lida. Apagar é decisão de
  outra rodada.
- **9 classes CSS mortas**, entre elas `.day--today`. Entra na Fase 7 se couber.
- **`insert` não tem fila de repetição** (`store.tsx:209-221`), diferente do `patch`. A
  Fase 1 dá mensagem de erro; a fila de verdade fica para depois. É por isso que
  `stay_option.position` ganha `default 0` (8.3).
