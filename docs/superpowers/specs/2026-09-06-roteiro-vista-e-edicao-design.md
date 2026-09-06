# Roteiro: a visualização do dia, e a edição separada dela

**06/09/2026.** Desenho aprovado por ele em conversa, antes de qualquer código.
Este arquivo é a fonte; o plano de implementação vem depois e obedece a ele.

---

## 0. O pedido, na palavra dele

> *"agora em roteiro eu quero melhorar a visualização, tanto para adicionar novos
> eventos quanto para quando eu visualizar no dia que estiver usando na viagem.
> Quero ter uma visualização em forma de view e uma em forma de edição. Quando eu
> clicar em um dia não devo aparecer em editar, quero ver o itinerario do dia mais
> detalhado."*

O que está errado hoje: **não existe visualização nenhuma.** Clicar num dia é
sempre editar — abre quatro cartões de formulário. E o dia não tem ordem: atração,
trecho e restaurante são três listas soltas penduradas na data, desenhadas como uma
parede de etiquetas (`DiaTags`).

Falta também um lugar para o que não é nenhum dos três: *check-in no Airbnb*,
*lavanderia*, *comprar presente*. Hoje isso só cabe como frase no texto livre do dia.

---

## 1. As seis decisões dele

Cada uma foi escolhida entre três opções desenhadas, com o custo de cada uma na mesa.

| # | pergunta | escolha dele | o que custa |
|---|---|---|---|
| 1 | como o dia se organiza | **por ordem, sem hora** — 1, 2, 3 | coluna `day_pos` |
| 2 | o que é um "evento" | **os três + linha livre** | tabela `day_item` |
| 3 | onde ficam os modos | **só botão no dia** — sem modo global | nada |
| 4 | quanto detalhe | **nota inteira, tudo aberto** | nada |
| 5 | marcar feito | **sim, riscado no lugar** (a lista não se mexe) | coluna `done` |
| 6 | item livre custa? | **sim, com valor e moeda** | toca as contas |

**Três coisas eu decidi, e ele pode vetar na leitura desta spec:**

- **📌 é o emoji do item livre.** Lê como "coisa presa neste dia", e não colide com
  🚶 🏛 (atração), 🚆 ✈️ 🚌 🚗 🚇 (transporte) nem 🍽️ ☕ (comida).
- **A visualização vem primeiro, o editor novo em seguida** (§8). A visualização se
  sustenta sozinha e é o que ele leva para a rua.
- **O item livre NÃO aparece na aba Custos.** Ele soma no total da viagem, mas se
  edita só dentro do dia. Aparecer nos dois lugares seria dois lugares para mexer no
  mesmo dinheiro, e a primeira vez que os dois discordassem ninguém saberia qual está
  certo.

---

## 2. A visualização — o que ele vê ao clicar num dia

```
┌──────────────────────────────────────────────┐
│ qua, 16 dez · Madrid · 2 de 5 feitas [editar]│
├──────────────────────────────────────────────┤
│ ⚠ Palacio Real grátis 16h–18h                │  os avisos do dia
├──────────────────────────────────────────────┤
│ "chegar cedo, deixar a mala e sair a pé"     │  o texto livre dele
├──────────────────────────────────────────────┤
│ ☑ 📌 C̶h̶e̶c̶k̶-̶i̶n̶ ̶n̶o̶ ̶A̶i̶r̶b̶n̶b̶                      │
│ ☑ 🚶 P̶u̶e̶r̶t̶a̶ ̶d̶e̶l̶ ̶S̶o̶l̶                          │
│                                              │
│ ☐ 🏛 Palacio Real                      € 0   │
│    GRÁTIS seg–qui 16h–18h de outubro a       │
│    março, só com o passaporte brasileiro.    │
│    Fora dessa janela, € 14                   │
│                                              │
│ ☐ 🍽 Mercado San Miguel                      │
│    entrar é grátis; comer ali é caro         │
├──────────────────────────────────────────────┤
│ € 0 no dia                                   │
└──────────────────────────────────────────────┘
```

**Regras da visualização:**

- **A caixinha de feito e o `[editar]` são as ÚNICAS coisas clicáveis.** Nenhum campo
  de texto, nenhum `×`, nenhum seletor. É leitura de verdade — ele vai usar isso com
  o celular na mão, no frio, dentro do metrô.
- **A nota vem inteira, nunca cortada.** É a decisão 4, e ela existe porque a
  informação que salva o dia mora ali: *"GRÁTIS seg–qui 16h–18h"*, *"fila de ~40 min"*.
  Hoje essa nota não aparece em lugar nenhum do Roteiro.
- **Feito risca no lugar; a lista nunca se reordena sozinha** (decisão 5). Ele
  escolheu isso sabendo que continua rolando para achar a próxima — a troca foi
  "a lista não dança debaixo do meu dedo".
- A nota sai por `marcado()`, como toda nota do app: o `*negrito*` funciona e nada
  que ele escreveu vira tag.
- Sem itens, a visualização diz o que fazer e oferece o `[editar]` — não fica só uma
  caixa vazia.
- **A caixinha ocupa o lugar do número.** No rascunho da decisão 1 a lista era
  `1 ▸ 2 ▸ 3`; quando entrou o feito (decisão 5), a caixinha virou o marcador da linha.
  `☐ 1 ▸ 🏛 Palacio Real` seria dois marcadores dizendo a mesma coisa. A sequência
  continua visível — ela é a própria ordem das linhas. **Os números aparecem só no
  editor**, ao lado das setas, que é onde saber "esta é a terceira" importa para mover.

---

## 3. O editor — a mudança que a ordem obriga

Hoje o editor são quatro cartões, e **cada um tem a própria lista do dia**
(`CartaoTransporte`, `CartaoAtracoes`, `CartaoComidas` — cada um monta um `.at` com
os itens daquele tipo e um `×`). Com a ordem cruzando os quatro tipos isso não
funciona: **não dá para pôr um restaurante entre duas atrações se eles moram em
cartões diferentes.**

O editor inverte:

```
┌─ o dia ───────────────────────┐  base + texto livre       (igual a hoje)
├─ a ordem do dia ──────────────┤  ← NOVO: a lista junta
│  ↑ ↓  📌 Check-in         ×   │     todos os tipos, com
│  ↑ ↓  🚶 Puerta del Sol   ×   │     setas e ×
│  ↑ ↓  🏛 Palacio Real     ×   │
├─ acrescentar ─────────────────┤  ← os 4 cartões viram
│  escrever um item…      [ + ] │     SÓ os seletores
│  da lista de Madrid        ▾  │
│  um trecho de transporte   ▾  │
│  um lugar de comer         ▾  │
└───────────────────────────────┘
```

O corte é limpo: cada cartão de hoje já é *lista + seletor*. A lista sai, o seletor
fica. A chave "vou usar transporte neste dia?" e a pré-seleção da cidade da base
continuam funcionando como hoje, dentro dos seletores.

**O `×` faz coisas diferentes por origem, e a tela precisa dizer qual:**

| origem | o que o `×` faz | por quê |
|---|---|---|
| atração | `day_iso = null` — volta pro backlog | regra 5.3: tirar do dia não desfaz a escolha |
| trecho | `day_iso = null` — volta pra aba Transporte | idem |
| comida | `day_iso = null` — volta pra aba Comidas | idem |
| **item livre** | **apaga a linha** | não existe em lugar nenhum além do dia |

O item livre é o único destrutivo. O rótulo do botão dele diz *apagar*, não *tirar do
dia* — e é o único que passa por `useApagarLinha`.

**As setas** reusam `src/lib/ordem.ts` sem mudar uma linha. Ele já renumera 0..n-1 em
vez de trocar dois números, que é o que conserta buraco e empate quando se tira algo
do meio. O tipo `ComPos` é `{ id, position }`, e o item juntado carrega `tabela`
junto — a escrita volta para a tabela certa pelo id.

---

## 4. O banco — um SQL só (`10-o-dia-em-ordem.sql`)

```sql
create table if not exists day_item (
  id         uuid primary key default gen_random_uuid(),
  day_iso    date not null references day(iso) on delete cascade,
  name       text not null,
  note       text not null default '',
  amount     numeric(10,2),
  currency   text not null default 'eur' check (currency in ('eur','brl')),
  day_pos    int  not null default 0,
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references app_user(id)
);

alter table attraction add column if not exists day_pos int     not null default 0,
                       add column if not exists done    boolean not null default false;
alter table food       add column if not exists day_pos int     not null default 0,
                       add column if not exists done    boolean not null default false;
alter table leg        add column if not exists day_pos int     not null default 0,
                       add column if not exists done    boolean not null default false;
```

**Duas confusões que o SQL precisa impedir por escrito, em comentário na coluna:**

- `day_pos` é a ordem **dentro do dia**. `leg` já tem `position`, que é a sequência da
  **viagem inteira** e é o que a aba Transporte usa. São coisas diferentes e ficam
  lado a lado na mesma tabela.
- `done` é *"eu fiz"*. `attraction.paid` e `leg.bought` são *"eu paguei"*. Um passeio
  grátis pode estar `done` e nunca `paid`; um trem pode estar `bought` em outubro e só
  ficar `done` em dezembro.

**`on delete cascade` no `day_iso`:** os 34 dias são fixos e ninguém apaga um `day`.
O cascade está lá para o caso de alguém apagar, e para não deixar item órfão apontando
para um dia que não existe.

### Os dez lugares que a tabela nova precisa entrar

Nove falham **em silêncio**. O item 9 é o único que o `tsc` pega.

| # | onde | o que quebra se faltar |
|---|---|---|
| 1 | RLS: `enable row level security` + policy `is_member()` | ninguém lê nem escreve |
| 2 | publicação `supabase_realtime` | a Lu não vê o que ele escreve |
| 3 | `replica identity full` | apagar não some da tela dela até o F5 |
| 4 | `tabelas[]` em `store.tsx:341` | idem 2 |
| 5 | `PK` em `merge.ts:9` | escrita remota não acha a linha |
| 6 | `LISTA` em `merge.ts:32` + tipos `Tabela` e `Lista` | **queda da tela** no 1º insert remoto (`inserirLocal` faz spread sobre `undefined`) |
| 7 | o `Promise.all` de selects em `load.ts:66` | não carrega no F5 |
| 8 | `vazio()` em `load.ts:26` | **queda da tela**, mesma causa do 6 |
| 9 | `Snapshot` em `types.ts` | o `tsc` reclama — o único barulhento |
| 10 | `normDayItem` em `load.ts` | a linha existe e some no primeiro F5 |

As colunas novas em `attraction`/`food`/`leg` precisam de **duas** coisas além do SQL:
entrar no tipo (`types.ts`) e nos normalizadores `normAttr`/`normFood`/`normLeg` de
`load.ts`. Coluna que o normalizador não conhece funciona na tela, sincroniza para a
outra pessoa, **e some no primeiro F5** — é a armadilha registrada no `COMO-MEXER.md`.
Declarar o campo **obrigatório** no tipo é o que faz o `tsc` cobrar o normalizador.

---

## 5. `src/lib/dia.ts` — o pedaço que mais importa

Módulo puro, sem React, testado com `node --test`.

```ts
export type Origem = 'attraction' | 'food' | 'leg' | 'day_item';

export interface ItemDoDia {
  id: string;
  tabela: Origem;
  position: number;    // o day_pos; o nome casa com `ComPos` de ordem.ts
  nome: string;
  nota: string;
  emoji: string;
  eur: number;         // 0 quando não tem valor
  brl: number;         // só `leg` e `day_item` podem ter
  feito: boolean;
  sub: string;         // a linha miúda: cidade da atração, tipo do transporte…
}

itensDoDia(s, iso): ItemDoDia[]        // as quatro origens, juntas e ordenadas
proximaPos(s, iso): number             // max(day_pos)+1 olhando as QUATRO
totalDoDia(s, iso): { eur, brl }
feitasDoDia(s, iso): { feitas, total }
```

**O empate é o risco real desta função.** Quatro origens compartilham um espaço de
numeração, e duas linhas com o mesmo `day_pos` têm que sair **na mesma ordem nos dois
navegadores** — senão a lista da Lu é diferente da dele e nenhum dos dois entende por
quê. Desempate determinístico: `day_pos`, depois `tabela` (ordem fixa: `leg`,
`attraction`, `day_item`, `food`), depois `id`. É a mesma lição de `porPosicao`, que
já desempata por id em `calc.ts`.

**`proximaPos` tem que olhar as quatro.** Se olhasse só uma, todo item novo nasceria
empatado com um existente — e a lista só se consertaria na primeira seta.

---

## 6. O dinheiro

`day_item.amount` + `day_item.currency` entram em:

- `totalDoDia` (o rodapé do dia)
- o total real da viagem e o "ainda por gastar" — `calc.ts`
- os números do Painel
- um caso novo em `scripts/check.mjs`

**Não** entram na aba Custos (decisão registrada no §1).

**A regra 5.11 é o que pode dar errado aqui.** *Item sem moeda cai no lado do `<option>`
pré-selecionado* — foi assim que R$ 257 virou R$ 1.595 uma vez. Nesta tela:

- o padrão é **euro**, igual a Transporte, e está no `default` da coluna;
- o seletor de moeda fica **sempre visível ao lado do valor**, nunca escondido atrás
  de um "avançado";
- o `<select>` precisa de `color: var(--ink)` explícito — `.addrow select` não herda
  cor, e sem isso ele nasce preto-sobre-preto no tema escuro. Já aconteceu em cinco
  telas em 06/09.

Hoje não existe nenhum `day_item`, então os números de aceite do `npm run check` **não
mudam agora**. O caso novo no `check.mjs` existe para que eles não passem a mentir
depois, quando existirem.

---

## 7. Os arquivos

`Roteiro.tsx` tem **809 linhas** e é o maior do app. O que entra aqui dobra isso.
(O mapa de arquivos do `COMO-MEXER.md` ainda diz 745 — está velho, e é corrigido junto.)

```
src/screens/Roteiro.tsx          calendário, blocos, navegação, chips   (encolhe)
src/screens/roteiro/Vista.tsx    a visualização do dia                  ← novo
src/screens/roteiro/Editor.tsx   ordem do dia + os quatro seletores     ← muda de lugar
src/lib/dia.ts                   juntar, ordenar, próxima posição       ← novo, puro
```

`DiaLinha`, `DiaTags` e `Mes` ficam em `Roteiro.tsx`: são do calendário e da lista de
blocos, não do dia.

**Na lista de blocos**, cada `DiaLinha` ganha *"N de M feitas"* quando o dia tem
itens. O resto continua igual — não é hora de mexer no calendário.

**Um chip `hoje`** ao lado de *"ver o roteiro inteiro"*, visível só quando `s.hoje`
cai dentro dos 34 dias. **Não troca o dia sozinho**: se ele fechou o app planejando o
dia 20, reabrir no dia 20 é o certo. O chip é um toque quando ele quiser.

---

## 8. As duas etapas

**Etapa 1 — a visualização.** O SQL, `dia.ts`, `Vista.tsx`, a caixinha de feito, o
chip `hoje`, o *"N de M feitas"* na lista. O editor continua exatamente como está
hoje, atrás do botão `[editar]`.

Ao fim da etapa 1 ele já tem o que leva para a viagem. A ordem existe no banco mas só
pode ser mexida na etapa 2.

**Cuidado com o que a etapa 1 promete.** Todo item nasce com `day_pos = 0`, então até
a etapa 2 a lista sai pelo desempate: transporte, depois atração, depois item livre,
depois comida — e por id dentro de cada um. **Isso não é a ordem do dia dele, é uma
ordem estável qualquer.** Numerar `1 ▸ 2 ▸ 3` em cima disso seria a tela afirmando uma
sequência que ninguém escolheu.

Isso não afeta a visualização, que não numera nunca (§2) — mas afeta o que ela
**afirma**. Na etapa 1 a lista sai agrupada por tipo, e o cabeçalho diz *"a ordem do
dia chega em seguida"*, para a tela não sugerir uma sequência que ninguém escolheu.

**Etapa 2 — o editor.** A lista junta com setas e `×`, os quatro cartões viram
seletores, e o formulário do item livre com valor e moeda.

A etapa 1 tem que ficar **utilizável e publicada** antes de a 2 começar.

---

## 9. O que pode dar errado em silêncio

Achados na leitura do código atual, antes de escrever qualquer linha:

- **Empate de `day_pos` entre origens diferentes** → lista em ordem diferente nos dois
  navegadores. Trancado pelo desempate determinístico do §5 e por teste.
- **`normAttr`/`normFood`/`normLeg` sem as colunas novas** → o feito e a ordem
  funcionam, sincronizam, e somem no F5. O `tsc` só cobra se o campo for obrigatório
  no tipo.
- **`AKE[kind]` / `TKE[kind]` / `FKE[kind]` crus no `Vista.tsx`** → tema livre não tem
  emoji e `{undefined}` no JSX não quebra, só desenha um espaço. `akEmoji()` existe e
  há teste; os outros dois precisam do mesmo cuidado.
- **`CT[cidade]` cru** → derruba o app inteiro numa cidade criada por ele. Há teste.
- **`<select>` de moeda sem `color`** → preto no preto no tema escuro.
- **`.addrow` nova sem o par no `@media (max-width: 700px)`** → a linha não cabe em
  360px. Há teste, e ele cobre só `.addrow` — o formulário do item livre precisa usar
  uma `.addrow.<sigla>` para ser coberto.
- **`day_item` fora do `killed_seed`/`adopted`** → não é problema: item livre não tem
  `seed_id` porque nunca nasce de pesquisa minha. A regra de 06/09 continua valendo —
  **nada que eu sugiro nasce dentro das tabelas dele.**

---

## 10. Como se prova

- **`tests/dia.test.mjs`, novo:** a junção das quatro origens; a ordem com empate; o
  desempate determinístico (a mesma entrada em ordem embaralhada dá a mesma saída);
  `proximaPos` olhando as quatro; o total com euro e real juntos; dia vazio.
- **`tests/telas.test.mjs`:** o teste de `.addrow` já existente passa a cobrir a sigla
  nova. Acrescentar o par de `TKE[...]`/`FKE[...]` ao teste que hoje só cobre `AKE[...]`.
- **`scripts/check.mjs`:** um número de aceite novo para o total de `day_item`.
- **Na tela, com dois navegadores abertos:** marcar feito num e ver no outro; a ordem
  igual nos dois. É a prova que só o olho dá, e é a que pegou os dois bugs de hoje.

---

## 11. O que NÃO está aqui

Fora de escopo por decisão, não por esquecimento:

- **Hora nos itens.** Ele escolheu ordem sem hora (decisão 1).
- **Modo global ver/editar.** Ele escolheu só o botão no dia (decisão 3).
- **Arrastar para ordenar.** As setas de `ordem.ts` já existem, funcionam no celular e
  não dependem de biblioteca.
- **Item livre na aba Custos.** §1.
- **Mexer no calendário ou nos blocos**, além do *"N de M feitas"*.
