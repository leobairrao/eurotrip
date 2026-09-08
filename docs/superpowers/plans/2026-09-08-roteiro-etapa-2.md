# Roteiro, etapa 2: a ordem do dia, o item livre e as gavetas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao Leo uma ordem de verdade dentro de cada dia do Roteiro, um lugar para escrever o que não é atração/trecho/comida, e uma tela de dia que caiba no celular.

**Architecture:** o editor de um dia deixa de ser quatro cartões com quatro listas e passa a ser três cartões: *o dia* (igual a hoje), *a ordem do dia* (uma lista só, com os quatro tipos juntos e setas) e *acrescentar* (o formulário do item livre mais três gavetas com os seletores que hoje moram nos cartões). A ordem se escreve na coluna `day_pos`, que já existe nas quatro tabelas; as setas reusam `src/lib/ordem.ts` sem mudar uma linha, através de uma função nova e pura em `src/lib/dia.ts`.

**Tech Stack:** Next.js 15 (app router), React 19, TypeScript, Supabase (Postgres + Realtime), `node --test` com `tests/reg.mjs` resolvendo `@/`. Sem bibliotecas novas.

**Spec:** `docs/superpowers/specs/2026-09-06-roteiro-vista-e-edicao-design.md` — §3 (o editor), §5 (`dia.ts`), §8 (as duas etapas) e §12 (as três decisões dele, de 07–08/09).

## Global Constraints

Copiadas da spec, do `COMO-MEXER.md` e das armadilhas já pagas neste repo. Valem para **todas** as tarefas.

- **Nenhum SQL.** `day_item`, `day_pos` e `done` já estão no banco, na publicação `supabase_realtime`, no `merge.ts`, no `load.ts`, nos tipos e nos normalizadores. Se uma tarefa parecer precisar de migração, pare e releia — não precisa.
- **Antes de cada commit, os quatro portões:** `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run check`. Todos verdes.
- **Import morto não é pego pelo `tsc` normal.** Depois de mover código entre arquivos, rode `npx tsc --noEmit --noUnusedLocals --incremental false` e ignore só os dois órfãos antigos de `calc.ts` (`coOf`, `Status`).
- **`src/app/extras.css` TERMINA dentro de um `@media (max-width: 700px)`.** Nunca cole regra no fim do arquivo. Cole no nível de cima, depois da chave que fecha o media, e confira a indentação.
- **`identidade.css` carrega DEPOIS de `extras.css`.** Em empate de especificidade ganha o último. Regra nova em `extras.css` que dispute com uma de lá precisa de especificidade **maior** — há teste em `telas.test.mjs` que falha no empate.
- **Toda `.addrow.<sigla>` nova precisa do par dentro do `@media (max-width: 700px)`** que a joga para `grid-template-columns: 1fr`. Há teste.
- **Toda grade `.mrow` nova que tenha um `<select>` precisa da área `cu`.** `estilo-atual.css:311` manda **todo** `.mrow select` para `grid-area: cu`; sem a área, o select cai numa faixa implícita e a linha desmonta sem erro nenhum.
- **Nada de `CT[cidade]` cru** — use `C.nomeCidade`, `C.paisDaCidade`, `C.ccCidade`, `C.temCidade`. Há teste.
- **Nada de `AKE`/`TKE`/`FKE`[kind] cru** — use `akEmoji`, `tkEmoji`, `fkEmoji`. Há teste.
- **`insert` precisa de `await`, e o campo só se limpa se `r.ok`.** `void insert(...)` seguido de `limpar()` perde o que ele escreveu.
- **Campo cujo valor é lido por um botão vizinho comita a cada tecla** (`onInput`), não no `blur` — senão o clique no botão lê o estado anterior.
- **Texto de tela em português, sem jargão.** Ele não é desenvolvedor: "não há gaveta para isso" funciona, "precisa de migração" não.
- **Não crie linha de teste no banco dele.** O `npm run check` fala com produção.

---

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `src/lib/dia.ts` | **modificar** — ganha `moverNoDia`, a tradução entre `ordem.ts` e as quatro tabelas | 1 |
| `src/screens/roteiro/Ordem.tsx` | **criar** — a lista junta: setas, números, `×`, e (na tarefa 4) a linha editável do item livre | 2, 4 |
| `src/screens/roteiro/Acrescentar.tsx` | **criar** — o cartão "acrescentar": o formulário do item livre e as três gavetas com os seletores | 3, 4 |
| `src/screens/roteiro/Editor.tsx` | **modificar** — encolhe para o cartão "o dia" mais a montagem dos três | 2, 3 |
| `src/screens/roteiro/Vista.tsx` | **modificar** — perde a frase "a ordem do dia chega em seguida" | 5 |
| `src/app/extras.css` | **modificar** — `.mrow.do5`, `.addrow.il4`, `.dtg.di`, e os pares de celular | 2, 4, 5 |
| `tests/dia.test.mjs` | **modificar** — `moverNoDia`, o empate, e a dependência da ordem de entrada | 1 |
| `tests/telas.test.mjs` | **modificar** — os guards de tela | 2, 4, 5 |

`DiaLinha`, `DiaTags` e `Mes` continuam em `Roteiro.tsx`: são do calendário, não do dia.

---

### Task 1: `moverNoDia` — traduzir as setas para as quatro tabelas

**Files:**
- Modify: `src/lib/dia.ts`
- Test: `tests/dia.test.mjs`

**Interfaces:**
- Consumes: `mover` de `src/lib/ordem.ts` — `mover<T extends { id: string; position: number }>(lista: T[], id: string, dir: -1 | 1): { id: string; position: number }[]`. Ele renumera 0..n-1 em vez de trocar dois números, e **ordena internamente só por `position`**.
- Produces: `export interface EscritaDeOrdem { tabela: Origem; id: string; day_pos: number }` e `export function moverNoDia(lista: ItemDoDia[], id: string, dir: -1 | 1): EscritaDeOrdem[]`. A tarefa 2 chama isto e escreve cada item com `now(w.tabela, w.id, 'day_pos', w.day_pos)`.

- [ ] **Step 1: escrever os quatro testes que falham**

Cole no fim de `tests/dia.test.mjs`. Os helpers `snap`, `attr`, `leg`, `food`, `item` e a constante `ISO` já existem no topo do arquivo — não os redefina.

```js

// ---------------- as setas, sobre a lista junta (etapa 2) ----------------

test('moverNoDia devolve a tabela certa de cada linha que mudou de lugar', () => {
  const s = snap({
    legs: [leg('t1', 0)],
    attractions: [attr('a1', 1)],
    foods: [food('f1', 2)],
  });
  const l = D.itensDoDia(s, ISO);
  assert.deepEqual(l.map((x) => x.id), ['t1', 'a1', 'f1']);

  // subir a comida uma casa troca ela com a atracao, e SO essas duas
  assert.deepEqual(D.moverNoDia(l, 'f1', -1), [
    { tabela: 'food', id: 'f1', day_pos: 1 },
    { tabela: 'attraction', id: 'a1', day_pos: 2 },
  ]);
});

test('a primeira nao sobe e a ultima nao desce', () => {
  const s = snap({ legs: [leg('t1', 0)], attractions: [attr('a1', 1)] });
  const l = D.itensDoDia(s, ISO);
  assert.deepEqual(D.moverNoDia(l, 't1', -1), [], 'ja e a primeira');
  assert.deepEqual(D.moverNoDia(l, 'a1', 1), [], 'ja e a ultima');
});

test('o dia inteiro empatado em zero se renumera na primeira seta', () => {
  // O CASO NORMAL hoje, e nao a excecao: todo item nasce com day_pos = 0
  // porque a etapa 1 nao tinha como ordenar. A primeira seta que ele
  // aperta num dia tem que arrumar o dia INTEIRO, nao so duas linhas —
  // e e isso que `ordem.ts` faz ao renumerar 0..n-1.
  const s = snap({
    legs: [leg('t1', 0)],
    attractions: [attr('a1', 0)],
    dayItems: [item('d1', 0)],
    foods: [food('f1', 0)],
  });
  const l = D.itensDoDia(s, ISO);
  assert.deepEqual(l.map((x) => x.id), ['t1', 'a1', 'd1', 'f1'],
    'o desempate de dia.ts: leg, attraction, day_item, food');

  // subir o item livre: t1 fica em 0 e nao entra na escrita
  assert.deepEqual(D.moverNoDia(l, 'd1', -1), [
    { tabela: 'day_item', id: 'd1', day_pos: 1 },
    { tabela: 'attraction', id: 'a1', day_pos: 2 },
    { tabela: 'food', id: 'f1', day_pos: 3 },
  ]);
});

test('moverNoDia depende de a lista VIR na ordem de itensDoDia', () => {
  // A armadilha central desta etapa. `ordem.ts` ordena so por `position`;
  // `dia.ts` desempata por posicao, TIPO e id. Com tudo empatado em zero,
  // quem decide e a ordem de ENTRADA — o sort do JS e estavel, e e so
  // isso que segura. Lista crua move a linha errada, sem erro nenhum.
  const s = snap({
    legs: [leg('t1', 0)],
    attractions: [attr('a1', 0)],
    dayItems: [item('d1', 0)],
    foods: [food('f1', 0)],
  });
  const certo = D.itensDoDia(s, ISO);
  const embaralhado = [certo[3], certo[1], certo[0], certo[2]];

  assert.notDeepEqual(
    D.moverNoDia(embaralhado, 'd1', -1),
    D.moverNoDia(certo, 'd1', -1),
    'a tela TEM que passar itensDoDia — lista fora de ordem move outra linha',
  );
});
```

- [ ] **Step 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -E "^✖|fail [0-9]"`
Expected: os quatro caem com `TypeError: D.moverNoDia is not a function`.

- [ ] **Step 3: implementar**

Em `src/lib/dia.ts`, acrescente o import no topo (junto dos outros):

```ts
import { mover } from './ordem';
```

E no fim do arquivo, depois de `feitasDoDia`:

```ts
/** Uma casa nova para uma linha: qual tabela, qual id, qual `day_pos`. */
export interface EscritaDeOrdem { tabela: Origem; id: string; day_pos: number }

/**
 * Subir ou descer uma linha DENTRO do dia, atravessando as quatro tabelas.
 *
 * `ordem.ts` devolve `{ id, position }` e nao sabe de que tabela cada id e —
 * ele serve o transporte e a burocracia, onde a lista e de uma tabela so.
 * Aqui a lista tem quatro origens, e a escrita precisa voltar para a tabela
 * certa. E so isso que esta funcao faz.
 *
 * A LISTA TEM QUE VIR DE `itensDoDia`. `mover` ordena so por `position`, e
 * com tudo empatado em zero quem decide e a ordem de entrada (o sort do JS
 * e estavel). Lista crua move a linha errada e nada acusa — ha teste.
 */
export function moverNoDia(
  lista: ItemDoDia[], id: string, dir: -1 | 1,
): EscritaDeOrdem[] {
  const porId = new Map(lista.map((x) => [x.id, x]));
  return mover(lista, id, dir).flatMap((m) => {
    const it = porId.get(m.id);
    return it ? [{ tabela: it.tabela, id: m.id, day_pos: m.position }] : [];
  });
}
```

- [ ] **Step 4: rodar e ver passar**

Run: `npm test 2>&1 | grep -E "fail [0-9]|pass [0-9]"`
Expected: `fail 0`.

- [ ] **Step 5: sabotar, para provar que os testes pegam**

Este repo tem o hábito, e ele já pegou um teste vazio em 08/09. Faça `moverNoDia` ordenar a lista antes de passar para `mover`:

```ts
  return mover([...lista].sort((a, b) => a.position - b.position), id, dir).flatMap(...)
```

Run: `npm test 2>&1 | grep -E "^✖"`
Expected: nada cai — **e está certo**, porque esse sort é estável e não muda nada. Agora sabote de verdade, ordenando por id:

```ts
  return mover([...lista].sort((a, b) => (a.id < b.id ? -1 : 1)), id, dir).flatMap(...)
```

Expected: `✖ moverNoDia depende de a lista VIR na ordem de itensDoDia` **ou** `✖ o dia inteiro empatado em zero se renumera na primeira seta`. Se nenhum cair, o teste é vazio — conserte o teste antes de seguir. Depois desfaça a sabotagem.

- [ ] **Step 6: os quatro portões e o commit**

```bash
npx tsc --noEmit && npm test && npm run build && npm run check
git add src/lib/dia.ts tests/dia.test.mjs
git commit -m "As setas do dia sabem de que tabela e cada linha

moverNoDia traduz o {id, position} de ordem.ts para {tabela, id, day_pos},
que e o que a tela precisa para escrever de volta em quatro tabelas
diferentes.

A lista TEM que vir de itensDoDia: mover() ordena so por position, e com
tudo empatado em zero quem decide e a ordem de entrada. Ha teste que
falha se alguem passar lista crua."
```

---

### Task 2: a lista junta, com setas e `×` — e o `+` passando a escrever a posição

**Files:**
- Create: `src/screens/roteiro/Ordem.tsx`
- Modify: `src/screens/roteiro/Editor.tsx` (tira as três listas dos cartões; monta o `<Ordem>`; os três `+` escrevem `day_pos`)
- Modify: `src/app/extras.css`
- Test: `tests/telas.test.mjs`

**Interfaces:**
- Consumes: `D.itensDoDia`, `D.moverNoDia`, `D.proximaPos` de `src/lib/dia.ts`; `useOrdemEstavel` de `src/lib/store`; `useApagarLinha` de `src/lib/apagar`.
- Produces: `export default function Ordem({ iso }: { iso: string })`. A tarefa 4 volta neste arquivo para dar campos à linha do item livre.

**Deliverable:** o dia é ordenável, a lista existe **uma vez só**, e item novo entra no fim da fila.

- [ ] **Step 1: a grade da linha, em `src/app/extras.css`**

Cole **logo depois** do bloco `.mrow.at6` (por volta da linha 340), no nível de cima — **não** no fim do arquivo, que está dentro de um `@media`.

```css
/* ============================================================
   A ORDEM DO DIA (etapa 2, 08/09/2026) — a lista junta, no editor.

   `.mrow` de proposito, e nao grade nova: ela ja traz fundo, foco,
   hover, a borda entre linhas e os alvos de 44px do celular, todos
   provados. O que muda por sigla e so a grade.

   A AREA `cu` TEM QUE EXISTIR mesmo com tres das quatro linhas sem
   seletor: `estilo-atual.css:311` manda TODO `.mrow select` para
   `grid-area: cu`, e o item livre tem o seletor de moeda. Sem a area,
   ele cai numa faixa implicita e a linha desmonta calada.
   ============================================================ */
.mrow.do5 {
  grid-template-columns: 62px 20px 1fr 92px 56px 34px;
  grid-template-areas: "od n nm pr cu x" "wh wh wh wh wh wh";
}
.mrow.do5 .ordb { grid-area: od; }
.mrow.do5 .don {
  grid-area: n;
  font-family: var(--mono); font-size: 11px; color: var(--muted);
  text-align: right; font-variant-numeric: tabular-nums;
}
.mrow.do5 .donm {
  grid-area: nm; font-size: 15px; font-weight: 600; line-height: 1.35;
}
.mrow.do5 .dovl {
  grid-area: pr;
  font-family: var(--mono); font-size: 12.5px; color: var(--muted);
  text-align: right; font-variant-numeric: tabular-nums;
}
/* feito risca no lugar, igual a visualizacao — a lista nunca se reordena */
.mrow.do5.feito .donm { text-decoration: line-through; color: var(--muted); }
.mrow.do5.feito .dovl { opacity: .55; }

@media (max-width: 700px) {
  .mrow.do5 {
    grid-template-columns: 62px 18px 1fr 34px;
    grid-template-areas: "od n nm x" ".  .  pr cu" "wh wh wh wh";
  }
}
```

- [ ] **Step 2: criar `src/screens/roteiro/Ordem.tsx`**

```tsx
'use client';
// ============================================================
// A ORDEM DO DIA (etapa 2, 08/09/2026).
//
// Ate aqui o dia nao tinha ordem nenhuma: atracao, trecho, comida e item
// livre eram quatro listas soltas, cada uma dentro do proprio cartao. Nao
// dava para por um restaurante entre duas atracoes porque eles nem se
// viam. A visualizacao ate mostrava os quatro juntos, mas numa sequencia
// que EU escolhi — e dizia isso no rodape.
//
// DUAS COISAS QUE ESTA TELA NAO PODE QUEBRAR:
//
//  1. A LISTA QUE VAI PARA AS SETAS E A QUE ESTA NA TELA. `moverNoDia`
//     depende disso e o comentario dele explica por que. Aqui isso quer
//     dizer: passe `lista`, a mesma que o `map` desenha — nunca
//     `D.itensDoDia(...)` de novo, que ignoraria o `useOrdemEstavel`.
//
//  2. O `x` FAZ COISAS DIFERENTES POR ORIGEM. Atracao, trecho e comida
//     voltam para a aba delas (`day_iso = null`, regra 5.3): tirar do dia
//     nao desfaz a escolha. O item livre nao existe em lugar nenhum alem
//     deste dia — nele o `x` APAGA, e o rotulo tem que dizer isso.
// ============================================================
import { useApp, useOrdemEstavel } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { Inline } from '@/components/Field';
import * as D from '@/lib/dia';
import { brl, eur, marcado } from '@/lib/fmt';

export default function Ordem({ iso }: { iso: string }) {
  const { s, now } = useApp();
  const apagar = useApagarLinha();

  // `useOrdemEstavel` segura o rearranjo enquanto o dedo esta num campo do
  // item livre — a unica linha desta lista que tem campo (tarefa 4).
  const lista = useOrdemEstavel(D.itensDoDia(s, iso), 'day_item|');

  const irPara = (id: string, dir: -1 | 1) => {
    for (const w of D.moverNoDia(lista, id, dir)) {
      now(w.tabela, w.id, 'day_pos', w.day_pos);
    }
  };

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>A ordem do dia</h3>
        <div className="m">
          {lista.length
            ? <>{lista.length}{lista.length === 1 ? ' item' : ' itens'} · as setas arrumam a sequência</>
            : 'ainda não há nada neste dia'}
        </div>
      </div>
      <div className="b">
        {!lista.length ? (
          <div className="empty">
            Nada neste dia ainda. Escreva um item ou puxe da sua lista no cartão
            abaixo — a ordem aparece aqui.
          </div>
        ) : (
          <div className="mt">
            {lista.map((x, ix) => {
              const livre = x.tabela === 'day_item';
              return (
                <div
                  key={`${x.tabela}:${x.id}`}
                  className={`mrow do5${x.feito ? ' feito' : ''}`}
                >
                  <span className="ordb">
                    <button
                      type="button"
                      onClick={() => irPara(x.id, -1)}
                      disabled={ix === 0}
                      title="subir um lugar"
                      aria-label={`subir ${x.nome} um lugar`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => irPara(x.id, 1)}
                      disabled={ix === lista.length - 1}
                      title="descer um lugar"
                      aria-label={`descer ${x.nome} um lugar`}
                    >
                      ↓
                    </button>
                  </span>
                  <div className="don">{ix + 1}</div>

                  <div className="donm">{x.emoji} {x.nome}</div>

                  <div className="dovl">
                    {x.eur ? eur(x.eur) : ''}
                    {x.eur && x.brl ? ' + ' : ''}
                    {x.brl ? brl(x.brl) : ''}
                  </div>

                  {/* O x, e ele NAO e o mesmo botao nas quatro origens. */}
                  <button
                    className="xb"
                    title={livre ? 'apagar de vez' : 'tirar deste dia'}
                    aria-label={
                      livre
                        ? `apagar ${x.nome} de vez`
                        : `tirar ${x.nome} deste dia`
                    }
                    onClick={() =>
                      livre
                        ? void apagar('day_item', x.id)
                        : now(x.tabela, x.id, 'day_iso', null)
                    }
                  >
                    ×
                  </button>

                  <div className="wh nt">
                    <span className={`dtg ${x.classe}`}>{x.sub}</span>
                    {x.nota ? <Inline html={marcado(x.nota)} className="wv" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mono foot" style={{ margin: '12px 0 0' }}>
          O <b>×</b> de uma atração, de um trecho ou de um lugar de comer só{' '}
          <b>tira deste dia</b> — a linha volta para a aba dela. O <b>×</b> de um item
          escrito por você <b>apaga de vez</b>: ele não existe em lugar nenhum além
          deste dia.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: em `Editor.tsx`, tirar as três listas e montar o `<Ordem>`**

3a. No topo, acrescente aos imports existentes:

```tsx
import Ordem from './Ordem';
import * as D from '@/lib/dia';
```

3b. Troque o corpo de `Editor`:

```tsx
export default function Editor({ iso }: { iso: string }) {
  return (
    <>
      <CartaoDia iso={iso} />
      {/* A lista do dia mora AQUI agora, e uma so. Ate 07/09 cada cartao
          abaixo tinha a propria — e com quatro listas nao ha como por um
          restaurante entre duas atracoes. */}
      <Ordem iso={iso} />
      <CartaoTransporte key={iso} iso={iso} />
      <CartaoAtracoes iso={iso} />
      <CartaoComidas iso={iso} />
    </>
  );
}
```

3c. Em `CartaoTransporte`, **apague** o bloco que começa em `{!mine.length ? (` e termina no `)}` antes do `<button className="liga"`. Apague também a variável `mine` e as três linhas do cabeçalho que a usam, trocando o `<div className="m">` por:

```tsx
        <div className="m">o que você já pôs neste dia está na ordem, acima · {mt}</div>
```

3d. Em `CartaoAtracoes`, apague o mesmo bloco (`{!mine.length ? (` … `)}`) e a variável `mine`; troque o `<div className="m">` por:

```tsx
        <div className="m">
          o que você já marcou está na ordem, acima
          {tot ? ` · ${eur(tot)} · ${brl(tot * C.rate(s))}` : ' · nada a pagar'}
        </div>
```

3e. Em `CartaoComidas`, apague o mesmo bloco e a variável `mine`; troque o `<div className="m">` por:

```tsx
        <div className="m">
          o que você já marcou está na ordem, acima · prato típico fica só na aba Comidas
        </div>
```

- [ ] **Step 4: os três `+` passam a escrever `day_pos`**

Sem isto, ele arruma o dia na mão, puxa mais uma atração no dia seguinte e ela **nasce no topo** — a lista parece se desarrumar sozinha e nada explica.

Em `CartaoTransporte`, troque o `onClick` do botão `plus`:

```tsx
                      onClick={() =>
                        nowMany('leg', t.id, { day_iso: iso, day_pos: D.proximaPos(s, iso) })
                      }
```

E acrescente `nowMany` ao destructuring do topo da função: `const { s, now, nowMany } = useApp();`

Em `CartaoAtracoes`:

```tsx
                        onClick={() =>
                          nowMany('attraction', it.id, {
                            day_iso: iso, status: 'escolhida', day_pos: D.proximaPos(s, iso),
                          })
                        }
```

Em `CartaoComidas`:

```tsx
                    onClick={() =>
                      nowMany('food', it.id, { day_iso: iso, day_pos: D.proximaPos(s, iso) })
                    }
```

E acrescente `nowMany` ao destructuring: `const { s, now, nowMany } = useApp();`

- [ ] **Step 5: o guard, em `tests/telas.test.mjs`**

Cole no fim do arquivo:

```js

test('todo + do dia escreve day_pos junto com day_iso', () => {
  // Sem isto o item novo nasce em zero e vai para o TOPO de um dia que ele
  // ja arrumou. A lista parece se desarrumar sozinha e nada na tela explica.
  for (const rel of ['src/screens/roteiro/Editor.tsx',
                     'src/screens/roteiro/Acrescentar.tsx']) {
    if (!existsSync(join(RAIZ, rel))) continue;   // Acrescentar nasce na tarefa 3
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const chamadas = src.match(/now(?:Many)?\([\s\S]{0,300}?\)\s*[,;)\n]/g) ?? [];
    const poeNoDia = chamadas.filter((c) => /day_iso['"]?\s*[:,]\s*iso\b/.test(c));
    for (const c of poeNoDia) {
      assert.match(
        c, /day_pos/,
        `${rel}: um + poe no dia sem escrever day_pos — o item vai nascer no topo.`
        + ` Use D.proximaPos(s, iso). Chamada: ${c.slice(0, 120)}`,
      );
    }
  }
});

test('a ordem do dia sai do dia.ts, e a tela nao reordena por conta propria', () => {
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Ordem.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  assert.match(src, /D\.itensDoDia\s*\(/, 'a lista tem que vir de dia.ts');
  assert.match(src, /D\.moverNoDia\s*\(/, 'as setas tem que passar por dia.ts');
  assert.doesNotMatch(
    src, /\.sort\s*\(/,
    'Ordem.tsx nao pode ordenar sozinho: `mover` depende da ordem de itensDoDia,'
    + ' e um sort proprio aqui move a linha errada sem erro nenhum',
  );
  assert.doesNotMatch(
    src, /mover\s*\(/,
    'chame D.moverNoDia, nao o mover de ordem.ts — este nao sabe a tabela de cada id',
  );
});
```

- [ ] **Step 6: rodar, e conferir na tela**

```bash
npx tsc --noEmit --noUnusedLocals --incremental false
npm test && npm run build && npm run check
npm run dev
```

Na tela, num dia que já tenha duas coisas (ex. **16 de dezembro**): clique no dia → `editar`. Confira, com os olhos:

1. A lista aparece uma vez só. Os três cartões de baixo **não** repetem os itens.
2. Aperte ↑ numa linha do meio. A ordem muda, os números 1, 2, 3 acompanham, e ela **fica** depois de um F5.
3. A primeira linha tem ↑ apagado; a última tem ↓ apagado.
4. Puxe uma atração nova com o `+`. Ela entra **no fim**, não no topo.
5. Estreite a janela para 360px. A linha não estoura, e as setas continuam clicáveis.

- [ ] **Step 7: commit**

```bash
git add src/screens/roteiro/Ordem.tsx src/screens/roteiro/Editor.tsx src/app/extras.css tests/telas.test.mjs
git commit -m "O dia tem uma ordem, e ela e dele

A lista junta com setas sai dos quatro cartoes e vira um bloco so. Nao dava
para por um restaurante entre duas atracoes enquanto cada tipo tivesse a
propria lista — era essa a mudanca que a ordem obrigava.

O + passa a escrever day_pos. Sem isso ele arruma o dia, puxa mais uma
atracao no dia seguinte, e ela nasce no topo: a lista pareceria se
desarrumar sozinha e nada na tela explicaria.

O x continua fazendo coisas diferentes por origem, e agora a tela diz qual."
```

---

### Task 3: os três cartões viram três gavetas de um cartão só

**Files:**
- Create: `src/screens/roteiro/Acrescentar.tsx`
- Modify: `src/screens/roteiro/Editor.tsx` (fica só com `CartaoDia` e a montagem)
- Test: `tests/telas.test.mjs`

**Interfaces:**
- Consumes: nada novo — os três seletores mudam de endereço sem mudar de comportamento.
- Produces: `export default function Acrescentar({ iso }: { iso: string })`. A tarefa 4 volta aqui para pôr o formulário do item livre no topo do cartão.

**Deliverable:** a tela do dia cai de cinco cartões para três, e cada gaveta diz quantos itens tem antes de abrir.

- [ ] **Step 1: criar `src/screens/roteiro/Acrescentar.tsx`**

Mova para cá, **sem mudar comportamento**, os corpos de `CartaoTransporte`, `CartaoAtracoes` e `CartaoComidas` que sobraram da tarefa 2 — a partir do `<div className="sechead">pôr neste dia</div>` de cada um, mais os `const` que eles usam. Cada um vira um componente `Seletor*` que devolve só o conteúdo da gaveta, sem `<div className="card">`.

O esqueleto do arquivo:

```tsx
'use client';
// ============================================================
// ACRESCENTAR AO DIA (etapa 2, 08/09/2026).
//
// Os tres cartoes de seletor viraram tres GAVETAS de um cartao so. Ele
// escolheu assim vendo o desenho: a tela do dia cai de cinco cartoes para
// tres, e ele vai usar isto no celular, no frio, dentro do metro — hoje,
// para chegar no seletor de comida, rola a tela inteira.
//
// A GAVETA E A CHAVE QUE ELE JA PEDIU. Em 06/09: "deve ter um on/off
// assim: vou usar transporte esse dia? Se eu ativar, abre a selecao". Era
// uma chave, no transporte; agora sao tres, uma por gaveta, com a contagem
// do que ha disponivel na testa. Mesmo `.liga`, mesmo `role="switch"`.
//
// AS TRES NASCEM FECHADAS. Na etapa 1 a do transporte nascia ligada se o
// dia ja tivesse trecho, para nao esconder o unico jeito de marcar o
// segundo. Isso deixou de valer: o que ja esta no dia mora em `Ordem.tsx`,
// acima, e nao passa mais por aqui.
//
// O `key={iso}` continua no cartao inteiro, em `Editor.tsx`: "vou usar
// transporte neste dia?" e uma pergunta POR DIA, e a resposta nao pode
// vazar para o dia seguinte.
// ============================================================
import { useState } from 'react';
import { CO, TK, TKPL, akEmoji, coOf, fkEmoji, tkEmoji } from '@/content';
import { Inline } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, marcado, num } from '@/lib/fmt';
import type { Attraction, Food, Leg } from '@/lib/types';

const TKROT: Record<string, string> = TK;
const TKS = Object.keys(TK);
const ORIGEM = (a: Attraction) => (C.ehPesquisa(a) ? 'sugestão minha' : 'sua lista');
const ORIGCLS = (a: Attraction) => (C.ehPesquisa(a) ? 'sug' : 'bac');

/** Uma gaveta: a chave que ele já conhece, mais a contagem do que há dentro. */
function Gaveta({
  rotulo, n, children,
}: {
  rotulo: string; n: number; children: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button
        className="liga"
        role="switch"
        aria-checked={aberta}
        onClick={() => setAberta((v) => !v)}
      >
        <span className="lbl">
          {rotulo}<span className="cn">{n}</span>
        </span>
        <i className="sw" aria-hidden="true" />
      </button>
      {aberta ? <div className="gav">{children}</div> : null}
    </>
  );
}

export default function Acrescentar({ iso }: { iso: string }) {
  const { s } = useApp();
  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');

  const nTransporte = s.legs.filter((t) => !t.day_iso).length;
  const nAtracoes = bk
    ? C.attrsDele(s, bk).filter((a) => !a.day_iso).length
      + C.attrsPesquisa(s, bk).filter((a) => !a.day_iso).length
    : 0;
  const dco = C.paisDaCidade(s, bk);
  const nComidas = dco
    ? C.foodsOf(s, dco).filter((f) => C.foodPickable(f.kind) && !f.day_iso).length
    : 0;

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Acrescentar a este dia</h3>
        <div className="m">
          escreva um item seu, ou puxe da sua lista — tudo entra no fim da ordem
        </div>
      </div>
      <div className="b">
        {/* o formulario do item livre nasce aqui na tarefa 4 */}

        <Gaveta
          rotulo={bk ? `da lista de ${C.nomeCidade(s, bk)}` : 'da sua lista de atrações'}
          n={nAtracoes}
        >
          <SeletorAtracoes iso={iso} />
        </Gaveta>

        <Gaveta rotulo="um trecho de transporte" n={nTransporte}>
          <SeletorTransporte iso={iso} />
        </Gaveta>

        <Gaveta rotulo="um lugar de comer" n={nComidas}>
          <SeletorComidas iso={iso} />
        </Gaveta>
      </div>
    </div>
  );
}
```

Abaixo disso, os três `Seletor*` — cada um é o corpo que sobrou do cartão correspondente em `Editor.tsx`, sem o `<div className="card">`, sem o `<div className="h">` e, no caso do transporte, **sem** o `<button className="liga">` e o `useState` dele (a `Gaveta` faz isso agora). Copie o resto linha por linha: os `subtabs`, o `livres`, o `other`, os `+` (que já escrevem `day_pos` desde a tarefa 2) e os textos de lista vazia.

- [ ] **Step 2: o CSS da gaveta, em `src/app/extras.css`**

Cole logo depois do bloco `.liga` (por volta da linha 425), no nível de cima:

```css
/* o conteudo de uma gaveta aberta (etapa 2, 08/09/2026) */
.gav { padding: 4px 0 14px; }
/* a contagem na testa da chave: mesma pilula dos chips, tom mais quieto */
.liga .lbl .cn {
  margin-left: 8px; padding: 2px 7px;
  border-radius: var(--raio-3);
  background: var(--surface-2); color: var(--muted);
  font-family: var(--mono); font-size: 11px; font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: `Editor.tsx` encolhe**

O arquivo fica com `CartaoDia` e a montagem, e mais nada:

```tsx
export default function Editor({ iso }: { iso: string }) {
  return (
    <>
      <CartaoDia iso={iso} />
      <Ordem iso={iso} />
      {/* a chave por dia e de proposito: "vou usar transporte neste dia?" e
          uma pergunta por DIA, entao a resposta nao pode vazar para o
          dia seguinte */}
      <Acrescentar key={iso} iso={iso} />
    </>
  );
}
```

Apague `CartaoTransporte`, `CartaoAtracoes`, `CartaoComidas` e os imports que ficaram órfãos.

- [ ] **Step 4: caçar os imports mortos**

Run: `npx tsc --noEmit --noUnusedLocals --incremental false`
Expected: só os dois órfãos antigos de `calc.ts`. Qualquer outro é seu — apague.

- [ ] **Step 5: rodar e conferir na tela**

```bash
npm test && npm run build && npm run check && npm run dev
```

Na tela, no dia 16: 1) três cartões, não cinco. 2) As três gavetas nascem fechadas, cada uma com um número. 3) Abrir uma não fecha as outras. 4) Trocar de dia fecha todas (é o `key={iso}`). 5) A 360px, a chave inteira é clicável e tem pelo menos 44px de altura.

- [ ] **Step 6: commit**

```bash
git add src/screens/roteiro/Acrescentar.tsx src/screens/roteiro/Editor.tsx src/app/extras.css
git commit -m "A tela do dia cai de cinco cartoes para tres

Os tres cartoes de seletor viraram tres gavetas de um cartao so, cada uma
com a contagem do que ha dentro. Ele escolheu assim vendo o desenho: vai
usar isto no celular, e hoje para chegar no seletor de comida rola a tela
inteira.

A gaveta E a chave que ele pediu em 06/09, generalizada para os tres. As
tres nascem fechadas: o que ja esta no dia mora na ordem, acima."
```

---

### Task 4: o item livre — escrever, consertar e apagar

**Files:**
- Modify: `src/app/extras.css` (`.addrow.il4` e o par de celular)
- Modify: `src/screens/roteiro/Acrescentar.tsx` (o formulário, no topo do cartão)
- Modify: `src/screens/roteiro/Ordem.tsx` (a linha do 📌 ganha campos)
- Test: `tests/telas.test.mjs`

**Interfaces:**
- Consumes: `insert` de `useApp` — `insert(t: Tabela, row: Record<string, unknown>): Promise<{ ok: boolean }>`; `useLocal()` de `@/components/Field` — `{ id, ref, get(): string, limpar(): void }`; `D.proximaPos(s, iso): number`.
- Produces: nada que outra tarefa consuma. É a última funcionalidade.

**Deliverable:** ele escreve *check-in no Airbnb*, com valor e moeda; conserta na própria linha; apaga quando quiser.

- [ ] **Step 1: a grade do formulário, em `src/app/extras.css`**

`.addrow.di4` **já é das Dicas** (`Dicas.tsx:170`) — a sigla nova é `il4` (item livre, 4 colunas). Cole junto das outras `.addrow`, por volta da linha 186:

```css
/* o item livre do dia: nome, quanto custa, a moeda, e o botao (08/09/2026).
   `il4` e nao `di4`: aquela ja e das Dicas, e duas telas na mesma grade
   brigam na primeira vez que uma delas mudar. */
.addrow.il4 { grid-template-columns: 1fr 116px 74px auto; }
```

E acrescente `il4` à lista do `@media (max-width: 700px)` da linha 187, que fica assim:

```css
  .addrow.at3, .addrow.at4, .addrow.fo3, .addrow.di4, .addrow.il4,
  .addrow.tr5, .addrow.re4 { grid-template-columns: 1fr; }
```

- [ ] **Step 2: o formulário, no topo do cartão "acrescentar"**

Em `Acrescentar.tsx`, troque o comentário `{/* o formulario do item livre nasce aqui na tarefa 4 */}` por `<ItemLivre iso={iso} />`, acrescente `useLocal, NumField, TextField` ao import de `@/components/Field`, e escreva o componente no fim do arquivo:

```tsx
/**
 * O ITEM LIVRE — o que nao e atracao, nem trecho, nem lugar de comer.
 *
 * "check-in no Airbnb", "lavanderia", "comprar presente". Ate agora isso so
 * cabia como frase solta no texto do dia: sem caixinha de feito, fora da
 * ordem, e o que custava nao somava em lugar nenhum.
 *
 * A moeda fica SEMPRE VISIVEL ao lado do valor, nunca atras de um
 * "avancado" — e a regra 5.11, e foi ela que fez R$ 257 virar R$ 1.595 uma
 * vez. O padrao e euro, igual a transporte.
 *
 * `await insert` e so limpa se `r.ok` (secao 8, promessa 3): `insert` nao
 * tem fila de repeticao, entao item novo que falha esta perdido — e se a
 * tela limpasse antes, ele nao teria nem o texto de volta.
 */
function ItemLivre({ iso }: { iso: string }) {
  const { s, insert } = useApp();
  const nome = useLocal();
  const valor = useLocal();
  const [moeda, setMoeda] = useState('eur');
  const [aviso, setAviso] = useState('');
  const [indo, setIndo] = useState(false);

  const por = async () => {
    const n = nome.get();
    if (!n) { setAviso('escreva o que é, primeiro'); return; }

    setAviso('');
    setIndo(true);
    const r = await insert('day_item', {
      day_iso: iso,
      name: n,
      note: '',
      amount: parseNum(valor.get()),
      currency: moeda,
      // entra no fim da fila, como todo + deste dia
      day_pos: D.proximaPos(s, iso),
      done: false,
    });
    setIndo(false);
    if (!r.ok) { setAviso('não consegui guardar. O texto está aí — tente de novo.'); return; }
    nome.limpar();
    valor.limpar();
  };

  return (
    <>
      <div className="addrow il4">
        <input
          ref={nome.ref as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="escrever um item… ex. check-in no Airbnb"
          aria-label="o que é este item"
          onKeyDown={(e) => { if (e.key === 'Enter') void por(); }}
        />
        <input
          ref={valor.ref as React.RefObject<HTMLInputElement>}
          type="text"
          inputMode="decimal"
          className="pv"
          placeholder="quanto custa"
          aria-label="quanto custa"
          onKeyDown={(e) => { if (e.key === 'Enter') void por(); }}
        />
        {/* regra 5.11 — o € vem primeiro, e a moeda nunca se esconde */}
        <select
          value={moeda}
          onChange={(e) => setMoeda(e.currentTarget.value)}
          aria-label="moeda"
        >
          <option value="eur">€</option>
          <option value="brl">R$</option>
        </select>
        <button onClick={() => void por()} disabled={indo}>
          {indo ? 'guardando…' : '+'}
        </button>
      </div>
      {aviso ? <div className="n warn" style={{ maxWidth: 'none' }}>{aviso}</div> : null}
    </>
  );
}
```

Acrescente `parseNum` ao import de `@/lib/fmt`.

- [ ] **Step 3: a linha do 📌 ganha campos, em `Ordem.tsx`**

Ele escolheu isto entre três opções: atração, trecho e comida se editam na aba delas; o item livre não tem aba nenhuma, e se não der para editar aqui não dá em lugar nenhum.

Troque o `<div className="donm">` e o `<div className="dovl">` por um condicional, e acrescente o campo de nota na segunda linha:

```tsx
                  {livre ? (
                    <TextField
                      fk={`day_item|${x.id}|name`}
                      value={x.nome}
                      onCommit={(v) => patch('day_item', x.id, 'name', v)}
                      className="nv"
                      aria-label="o que é este item"
                    />
                  ) : (
                    <div className="donm">{x.emoji} {x.nome}</div>
                  )}

                  {livre ? (
                    <>
                      <NumField
                        fk={`day_item|${x.id}|amount`}
                        value={x.eur || x.brl || null}
                        onCommit={(v) => patch('day_item', x.id, 'amount', v)}
                        className="pv"
                        placeholder="quanto custa"
                        aria-label="quanto custa"
                      />
                      <select
                        value={x.brl ? 'brl' : 'eur'}
                        onChange={(e) => now('day_item', x.id, 'currency', e.currentTarget.value)}
                        aria-label="moeda"
                      >
                        <option value="eur">€</option>
                        <option value="brl">R$</option>
                      </select>
                    </>
                  ) : (
                    <div className="dovl">
                      {x.eur ? eur(x.eur) : ''}
                      {x.eur && x.brl ? ' + ' : ''}
                      {x.brl ? brl(x.brl) : ''}
                    </div>
                  )}
```

E na `<div className="wh nt">`, depois da etiqueta:

```tsx
                    {livre ? (
                      <TextField
                        fk={`day_item|${x.id}|note`}
                        value={x.nota}
                        onCommit={(v) => patch('day_item', x.id, 'note', v)}
                        className="wv"
                        placeholder="uma nota sua"
                        aria-label="nota"
                      />
                    ) : x.nota ? (
                      <Inline html={marcado(x.nota)} className="wv" />
                    ) : null}
```

Acrescente `patch` ao destructuring (`const { s, now, patch } = useApp();`) e `NumField, TextField` ao import de `@/components/Field`.

- [ ] **Step 4: o guard, em `tests/telas.test.mjs`**

```js

test('o x do item livre APAGA, e o das outras tres so tira do dia', () => {
  // Sao dois comportamentos no mesmo botao. Trocar um pelo outro nao da
  // erro: apagaria uma atracao que ele so queria tirar do dia (e ela some
  // do backlog junto), ou deixaria um item livre orfao, sem dia e sem tela.
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Ordem.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  assert.match(src, /apagar\s*\(\s*'day_item'/,
    'o item livre tem que passar por useApagarLinha');
  assert.match(src, /'day_iso'\s*,\s*null/,
    'as outras tres tem que voltar para a aba delas com day_iso = null');
  assert.doesNotMatch(src, /apagar\s*\(\s*x\.tabela/,
    'nao apague pela tabela da linha: as outras tres NAO se apagam daqui');
});
```

- [ ] **Step 5: rodar e conferir na tela**

```bash
npx tsc --noEmit --noUnusedLocals --incremental false
npm test && npm run build && npm run check && npm run dev
```

Na tela — e esta é a parte que só o olho pega:

1. **No tema escuro**, o seletor de moeda mostra `€`, não um retângulo preto. (`.addrow select` tem `color` explícito; o de dentro da `.mrow` herda de `.mrow select`. Se sumir, é isso.)
2. Escreva "lavanderia", 12, €, `+`. A linha aparece **no fim** da ordem, com 📌.
3. Conserte o nome na própria linha. Dê F5: a correção ficou.
4. Ponha uma nota e confira que `*negrito*` funciona na visualização.
5. O `×` dela diz **apagar de vez**; o de uma atração diz **tirar deste dia**.
6. O valor entra no rodapé do dia e no total da viagem (aba **Custos**, linha de leitura).
7. A 360px o formulário vira uma coluna só e o botão não vaza do cartão.

- [ ] **Step 6: commit**

```bash
git add src/screens/roteiro/Acrescentar.tsx src/screens/roteiro/Ordem.tsx src/app/extras.css tests/telas.test.mjs
git commit -m "O item livre existe: escrever, consertar e apagar

A tabela e o dinheiro estavam prontos desde a etapa 1 e invisiveis, porque
nenhuma tela criava um. Agora ha o formulario, e a linha do 202 e a unica
da ordem com campos — atracao, trecho e comida se editam na aba delas, e o
item livre nao tem aba nenhuma.

O x dele APAGA, e o rotulo diz isso: ele nao existe em lugar nenhum alem
deste dia.

Sigla il4 e nao di4: aquela ja e das Dicas."
```

---

### Task 5: acabamentos, e a prova no site

**Files:**
- Modify: `src/app/extras.css` (`.dtg.di`)
- Modify: `src/screens/roteiro/Vista.tsx`
- Modify: `COMO-MEXER.md`, `docs/2026-09-07-o-que-ficou-para-depois.md`
- Test: `tests/telas.test.mjs`

- [ ] **Step 1: a cor da etiqueta do item livre**

Ele escolheu tinta escura em 08/09. Cole junto de `.dtg.tk-metro`, por volta da linha 382 de `extras.css`, **no nível de cima**:

```css
/* A etiqueta do item livre (08/09/2026). Era a unica `.dtg` de tipo sem
   cor da paleta dele, e caia num cinza que lia como esquecimento.
   `--ink-2` porque nenhuma outra usa, e porque o item livre nao e uma
   categoria minha: e o que ELE escreveu. */
.dtg.di { border-left-color: var(--ink-2); }
```

- [ ] **Step 2: a Vista para de prometer**

Em `src/screens/roteiro/Vista.tsx`, no `.atsum`, apague a linha:

```tsx
          {itens.length ? ' · a ordem do dia chega em seguida' : ''}
```

E no comentário do cabeçalho do arquivo, troque o parágrafo que começa em `// A ORDEM AINDA NAO E DELE` por:

```tsx
// A ORDEM E DELE desde a etapa 2 (08/09/2026): ele a monta com as setas do
// editor. Esta tela continua NAO NUMERANDO — a caixinha de feito e o
// marcador da linha, e dois marcadores diriam a mesma coisa duas vezes. Os
// numeros aparecem so no editor, ao lado das setas, que e onde saber "esta
// e a terceira" importa para mover.
```

- [ ] **Step 3: o guard de que a promessa não volta**

```js

test('a visualizacao nao promete mais a ordem — ela chegou', () => {
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Vista.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /chega em seguida/,
    'a etapa 2 entregou a ordem; a tela nao pode continuar prometendo');
});
```

- [ ] **Step 4: os documentos**

Em `docs/2026-09-07-o-que-ficou-para-depois.md`, na seção **B. A cor da etiqueta do item livre**, troque o título por `### B. A cor da etiqueta do item livre — ✅ RESOLVIDA em 08/09` e escreva, em duas linhas, que ele escolheu `--ink-2` e por quê.

Em `COMO-MEXER.md`, seção 0, acrescente uma linha dizendo que a etapa 2 está no ar e apontando para a spec e para este plano. No mapa de arquivos, acrescente `src/screens/roteiro/Ordem.tsx` e `src/screens/roteiro/Acrescentar.tsx`, e corrija as contagens de linhas de `Editor.tsx`.

- [ ] **Step 5: os quatro portões, e a prova com dois navegadores**

```bash
npx tsc --noEmit --noUnusedLocals --incremental false
npm test && npm run build && npm run check
```

Depois, **duas janelas abertas no mesmo dia** — é a prova que só o olho dá, e é a que pegou os dois piores bugs desta série:

1. Aperte ↑ numa janela. A outra reordena, **na mesma ordem**.
2. Marque "feito" numa. Risca na outra.
3. Escreva um item livre numa. Aparece na outra em menos de 2s.
4. Apague-o numa. Some da outra.

- [ ] **Step 6: commit e publicar**

```bash
git add -A
git commit -m "A etapa 2 do Roteiro esta no ar

A cor do item livre (--ink-2, escolha dele), a Vista que para de prometer
uma ordem que agora existe, e os documentos.

Provado com duas janelas: mover, marcar feito, escrever e apagar chegam do
outro lado na mesma ordem."
git push
```

Depois do push, **confira no site**, não só local: `https://eurotrip-bice.vercel.app`. Recarregue forçando — o navegador serve cache, e uma tela sem novidade pode ser a versão velha, não a nova.

---

## Self-review

**Cobertura da spec.** §3 (a lista junta, o `×` por origem, as setas de `ordem.ts`) → tarefas 1, 2 e 4. §3 (os quatro cartões viram seletores) → tarefa 3. §5 (`dia.ts`) → tarefa 1. §6 (o dinheiro e a regra 5.11) → tarefa 4, passos 2 e 5. §10 (como se prova) → tarefas 1, 2, 4 e 5. §12 (as três decisões e o achado do `+`) → tarefas 2, 3 e 4. §11 (o que não está aqui) → nada no plano toca em hora, modo global, arrastar, item livre em Custos ou calendário.

**Sem lacunas conhecidas.** Todo passo de código traz o código; todo teste traz o teste; todo comando traz o comando e o que esperar dele.

**Consistência de nomes.** `moverNoDia` e `EscritaDeOrdem` (tarefa 1) são usados com esses nomes nas tarefas 2 e 4. `Ordem` e `Acrescentar` são default exports com a prop `{ iso }`. A sigla CSS é `do5` para a linha da ordem e `il4` para o formulário — nenhuma das duas existe hoje no projeto.

**Uma coisa que o executor vai querer mudar e não deve:** o `×` de atração, trecho e comida **não** passa por `useApagarLinha`. Parece inconsistente e não é — tirar do dia não desfaz a escolha (regra 5.3), e apagar ali custaria o backlog dele. Há teste.
