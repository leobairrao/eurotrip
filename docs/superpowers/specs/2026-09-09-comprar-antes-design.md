# "Compro antes" vs "pago lá" — o desenho

**09/09/2026.** O item mais pesado da lista de 08/09, e o único que o Leo mesmo
marcou como difícil:

> *"Isso tudo temos que pensar como colocar em todas as etapas (tem passagem que
> vou comprar antes e tem passagens que vou comprar apenas nas cidades, por
> exemplo) pode ter outras coisas também que seja algumas aqui e outras lá"*

Ele decidiu **"os quatro de uma vez"** — transporte, atração, comida e reserva.
Olhando o banco, **duas das quatro pedem outra coisa**, e ele escolheu:

| Tabela | O que ganha | Por quê |
|---|---|---|
| `leg` | `buy_ahead` | tem `amount`: a caixinha muda três números |
| `attraction` | `buy_ahead` + `ahead_days` | tem `price_eur`, e ele pediu *"o tempo que precisa"* |
| `food` | `price_eur` | **não tinha dinheiro nenhum**, e sem isso não entra no estimado |
| `booking` | **nada** | tudo lá é comprado antes por natureza, e o `done` já separa pago de previsto |

A frase dele que fecha o transporte, e é a régua:

> *"transportes que preciso ver antes são voos interpaíses e trens intercidades,
> os trens e metrôs dentro das cidades não precisa porque eu compro o ticket no
> dia"*

**E é por isso que o `kind` não serve.** Dos 12 trechos pesquisados, três são TER
regional (`kind = 'trem'`, comprados no dia) e o Luxemburgo → Metz é ônibus
intercidades. Contar por tipo erraria 4 de 12, sem dar erro nenhum. A intenção
não é dedutível do tipo: tem que ser um campo.

---

## 1. As colunas

```sql
alter table leg         add column if not exists buy_ahead  boolean not null default false;
alter table attraction  add column if not exists buy_ahead  boolean not null default false,
                        add column if not exists ahead_days int;
alter table food        add column if not exists price_eur  numeric(10,2) not null default 0;
```

**`buy_ahead` NÃO é `bought`, e as duas moram na mesma linha de `leg`.**
`buy_ahead` é **intenção** ("vou comprar antes de viajar"); `bought` é **estado**
("já comprei"). Um voo pode ser `buy_ahead = true, bought = false` em setembro —
é exatamente esse o par que enche a lista do "o que ainda está aberto". E
`buy_ahead = false, bought = true` é o metrô que ele comprou adiantado por acaso:
possível, e não é erro.

`ahead_days` é **quanto tempo antes**, em dias, e só em atração — foi só ali que
ele pediu (*"a tag 'Comprar com antecedência', e o tempo que precisa"*). `null` =
marcou a tag e ainda não sabe o prazo. Guardar em dias, e não em texto, é o que
deixa a lista do Painel ordenar por urgência depois.

`food.price_eur` tem o **mesmo nome** que o de `attraction` de propósito: é a
mesma coisa (um valor em euro naquela linha), e dois nomes para a mesma coisa é
como nasce a divergência. É **estimativa por lugar**, escolha dele: *"um valor
estimado por lugar"*.

**Obrigatórios no TypeScript, não opcionais.** `types.ts` já explica por quê, e o
custo de errar está escrito lá: uma coluna declarada `buy_ahead?: boolean` marca
na tela, grava no banco, aparece no outro navegador **e desaparece no primeiro
F5**, porque o normalizador de `load.ts` copia por lista branca e ninguém o
avisou. Sendo obrigatório, o `tsc` acusa cada lugar que esqueceu.

---

## 2. O que cada número passa a ser

### Tabela 2 do Painel — pago / estimado / acumulado

Hoje são cinco números por categoria. Passam a ser três, e **ele definiu os dois
primeiros com palavras próprias em 09/09** — vale ler antes de mexer na fórmula:

> **Total pago:** *"o que eu já paguei (a maioria das coisas com antecedência:
> hospedagem, avião, documentos, seguros, voos NA europa, trens entre países da
> europa, atrações que são com antecedência)"*
>
> **Total estimado:** *"é para eu me preparar para o quanto vou ter que levar em
> dinheiro para viver lá esse período"*

O "estimado" **não é** "o resto do custo da viagem". É **dinheiro na mão**: o que
ele vai desembolsar lá durante os 34 dias.

- **Total pago** — `pagoBrl`, que já existe, agora lido no **valor real** quando
  houver (ver *O gasto real*, abaixo). É quase tudo `buy_ahead`, e é o que ele
  listou na frase acima.
- **Total estimado** — o que se paga lá:
  - atrações **num dia**, com `buy_ahead = false` e `paid = false` → `price_eur`;
  - trechos com `buy_ahead = false` e `bought = false` → `amount` (nos dois lados);
  - comidas **num dia** → `price_eur`. **Comida entra aqui**, e tem que entrar:
    é dinheiro que ele leva no bolso.
- **Valor Acumulado** — `cxTotalBrl`, da aba Caixa. Já existe.

**"Estimado" exclui o que já foi pago**, senão ele deixa de responder à pergunta
e passa a ser um total de categoria.

**Só o que está num dia conta**, para atração e comida. É a regra de 05/09 do app
inteiro — *"o que entra no custo é o que está num dia do Roteiro"* — e usar outra
aqui criaria um segundo conceito de "conta ou não conta".

**PAGO + ESTIMADO NÃO DÁ O CUSTO TOTAL DA VIAGEM, e é de propósito.** Comida
entra no estimado mas **não** no `totalBrl` (decisão dele, abaixo), e o
acumulado é dinheiro guardado, não gasto. São três respostas para três
perguntas diferentes, não três parcelas de um bolo. Quem for somar os três para
"conferir" vai achar que há bug.

### O gasto real — planejado vs. o que saiu do bolso

Ele inventou isto no meio da conversa de 09/09, e é o que fecha a viagem:

> *"deve ter um campo para eu colocar exatamente o quanto paguei/gastei naquele
> dia. Exemplo: das atrações do dia 11 estava planejado gastar 22E em um passeio
> e 25E na alimentação, o passeio foi 22E (dou um check e ele entra para os
> gastos) mas a alimentação foi 30E (devo colocar o novo valor, dar um check e
> entra para os gastos também). Quero isso porque no final da viagem quero saber
> qual foi o total de todas as coisas."*

Quatro colunas, e **o nome segue o campo planejado que elas corrigem** —
`price_eur` → `spent_eur` (atração, comida), `amount` → `spent` (trecho, item do
dia). Nenhuma tabela fica com dois nomes para a mesma ideia, e o valor real sai
na moeda do planejado dela.

**`null` é "ainda não aconteceu", e não zero.** Um zero somaria igual e mentiria
de graça em 34 dias de viagem: o total do fim ficaria completo desde o começo.

**O check é a caixinha que já existe** — `paid` em atração, `bought` em trecho,
`done` em comida e item do dia. Não nasce uma segunda caixinha de dinheiro; a
lição de 08/09 é dele e é literal (*"não entendi porque tem dois campos de
dinheiro"*). Ao marcar, o app **preenche o real com o planejado**, que é o caso
comum do exemplo dele (o passeio de 22 que custou 22 — um clique, nada digitado);
se o número for outro, ele escreve por cima.

**Quem lê o valor de uma linha lê `real ?? planejado`.** Uma linha marcada sem
valor real vale o planejado, que é exatamente o que o app já faz hoje — então
nenhum número de hoje muda quando a coluna nascer vazia.

### Tabela 3 — a linha do transporte fica correta

`x de y comprados`, onde **y são os trechos com `buy_ahead = true`**, e o rótulo
passa a poder dizer o que ele pediu: *"só os que compro antes"*. Hoje conta todos,
e o rótulo é honesto sobre isso justamente porque a coluna não existe.

### Tabela 4 — "o que ainda está aberto"

Ganha o que ele pediu, e é a razão de `ahead_days` existir:

- transporte: `buy_ahead = true` e `bought = false`;
- atrações: `buy_ahead = true`, com o prazo ao lado (*"comprar 30 dias antes"*);
- hospedagem e reservas: como já é.

**Fica para depois desta etapa**, mas o campo já nasce servindo a ela.

### O custo total da viagem

`totalBrl` ganha o dinheiro de comida (as que estão num dia). Hoje comida não
soma em lugar nenhum — o custo de comer vive como linha solta na aba Custos. Com
o campo, a mesma comida poderia ser contada **duas vezes**: uma na linha de
Custos que ele já escreveu, outra na comida com valor.

**DECIDIDO por ele em 09/09: a comida com € NÃO soma no `totalBrl`.** O custo
total da viagem continua vindo da linha de Custos que ele já escreve, e o
`price_eur` da comida serve para o **estimado** (dinheiro na mão) e para o
planejado-vs-real. Nenhum número de hoje infla, e não há linha repetida para
caçar.

---

## 3. Onde aparece na tela

**Nenhum campo novo na primeira linha das grades.** A lição de 08/09 é dele e é
literal: *"não precisa ter tantos campos… não entendi porque tem dois campos de
dinheiro"*. As grades `.mrow` de Transporte (`tr5`) e Atrações (`at6`) ficam como
estão.

- **Transporte** — na **segunda** linha (`.wh nt`), onde já vivem as etiquetas,
  uma etiqueta que se clica: `compro antes` / `compro no dia`. Ela fica ao lado de
  `comprado` / `a comprar`, e o par lido junto é exatamente a diferença entre
  intenção e estado. **Não é uma segunda caixinha** — duas caixinhas lado a lado
  na mesma linha seriam indistinguíveis.
- **Atrações** — a mesma etiqueta na segunda linha, e **quando ligada** aparece um
  campo curto de dias ao lado (`30 dias antes`). Desligada, o campo não existe —
  é o que impede a linha de crescer para quem não usa a tag.
- **Comidas** — um campo de `€` na linha, no molde do de Atrações: vazio é vazio,
  não zero (regra 10.0). Só em `restaurante` e `cafe`: **prato típico não tem
  dia** (regra 5.8) e não entra em conta nenhuma.
- **Painel** — Tabela 2 vira os três números; a linha do transporte na Tabela 3
  passa a contar os de `buy_ahead`.

**A pesquisa em `src/content` carrega a sugestão.** Os 12 trechos de
`transportes.json` ganham `ba` (avião e trem de longa distância `true`; TER e
ônibus urbano `false`), e o `+` da aba Sugestões traz o valor junto. É pesquisa
minha sugerindo, e ele muda com um clique — nunca escrita na tabela dele sem o
`+` (a regra de 06/09).

---

## 4. As tarefas, na ordem

1. `supabase/11-comprar-antes.sql` — as quatro colunas, com conferência e
   desfazer. **Ele roda.**
2. `types.ts` — os quatro campos, obrigatórios, com o aviso `buy_ahead` × `bought`.
3. `load.ts` — os três normalizadores **e** o importador da fixture (as duas
   metades do arquivo; esquecer a segunda faz o teste passar e o app perder o dado).
4. `calc.ts` — `estimadoBrl`, `legAhead`, `foodEur`, e o `real ?? planejado` de
   toda leitura de valor. Com teste antes, e sabotagem depois.
5. Telas: Transporte, Atrações, Comidas, Painel.
6. `scripts/check.mjs` — os números novos espelhados, refeitos à mão.
7. Guards em `telas.test.mjs`: a etiqueta não vira caixinha; `buy_ahead` não é
   lido no lugar de `bought`; o campo de dias não aparece com a tag desligada;
   comida não entra no `totalBrl`; e `spent` nunca é lido como zero quando é
   `null`.

---

## 5. Os riscos, e o que custa cada um

1. ~~**Comida contada duas vezes.**~~ **Resolvido em 09/09:** a comida com € não
   entra no `totalBrl`. Ela vive no estimado e no gasto real. Se algum dia
   alguém a somar no total sem tirar a linha de Custos, o custo da viagem infla
   em silêncio — é o que o guard tem que impedir.
2. **`buy_ahead` lido no lugar de `bought`.** Compila limpo, e o número resultante
   é plausível. É o erro mais provável desta etapa inteira — daí o guard.
3. **`prato` com valor.** Um prato típico não tem dia e nunca entraria no
   estimado; deixar o campo aparecer nele promete uma conta que não existe.
4. **O default `false` em `buy_ahead`.** Nasce tudo como "pago lá", então o
   "estimado" nasce grande e o "compro antes" nasce vazio. Está certo — mas é bom
   ele saber, senão parece bug no primeiro dia.
