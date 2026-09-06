# Roteiro — a visualização do dia (etapa 1) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicar num dia do Roteiro passa a mostrar o itinerário do dia em modo de leitura — com nota inteira, caixinha de "feito" e o total do dia — e a edição fica atrás de um botão.

**Architecture:** Uma tabela nova (`day_item`) e duas colunas (`day_pos`, `done`) em `attraction`/`food`/`leg`. Um módulo puro `src/lib/dia.ts` junta as quatro origens numa lista ordenada e determinística. `Roteiro.tsx` se parte em três arquivos; o editor de hoje sai inteiro para `roteiro/Editor.tsx` **sem mudar de comportamento**, e nasce `roteiro/Vista.tsx`.

**Tech Stack:** Next.js 15 · React 19 · TypeScript · Supabase (Postgres + Realtime) · `node --test` com loader próprio (`tests/reg.mjs`)

**Spec:** `docs/superpowers/specs/2026-09-06-roteiro-vista-e-edicao-design.md`

## Global Constraints

Valores copiados da spec e do `COMO-MEXER.md`. Valem para **todas** as tarefas.

- **Português do Brasil na tela.** Comentários de código sem acento (o resto do projeto é assim); textos de tela **com** acento.
- **Coluna nova é campo OBRIGATÓRIO no tipo**, nunca `campo?: tipo`. `load.ts` normaliza por lista branca: campo opcional que o normalizador esquece funciona na tela, sincroniza, **e some no primeiro F5**. Obrigatório faz o `tsc` cobrar.
- **Nada de `CT[cidade]` cru numa tela.** Use `C.nomeCidade(s,k)`, `C.paisDaCidade(s,k)`, `C.ccCidade(s,k)`, `C.temCidade(s,k)`. Há teste em `tests/telas.test.mjs`.
- **Nada de `AKE[kind]`, `TKE[kind]` ou `FKE[kind]` cru numa tela.** Tema é texto livre; use `akEmoji(kind)` e as funções irmãs criadas na Tarefa 5. Há teste para `AKE`.
- **Toda `.addrow.<sigla>` nova precisa do par dentro de `@media (max-width: 700px)`.** Há teste.
- **`identidade.css` carrega DEPOIS de `extras.css`** (`src/app/layout.tsx`). Regra nova em `extras.css` que dispute com uma de lá precisa de especificidade MAIOR.
- **Campo dentro de `.mrow` precisa de fundo e cor explícitos; dentro de `.fld`/`.form`, não.** `select` e `textarea` não herdam.
- **Regra 5.11 — moeda:** item sem moeda cai no `<option>` pré-selecionado. `day_item` tem padrão **euro**, igual a `leg`.
- **Regra 5.15 — foco:** campo remoto é não-controlado e nunca é sobrescrito enquanto tem foco. Use os componentes de `src/components/Field.tsx`.
- **Promessa 3 da seção 8:** campo local só limpa **depois** de o banco confirmar o insert.
- **A regra de 06/09:** nada que a Claude sugere nasce dentro das tabelas dele. `day_item` nunca tem `seed_id` — ela não existe na tabela.
- Rodar `npx tsc --noEmit`, `npm test` e `npm run build` antes de cada commit. **Nunca rodar `npm run build` com o `npm run dev` no ar** — corrompe `.next` e a tela fica em branco.

---

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `supabase/10-o-dia-em-ordem.sql` | a migração que ELE roda | 1 |
| `supabase/00-tudo.sql`, `01-schema.sql` | as duas cópias do esquema, que têm que bater | 1 |
| `src/lib/types.ts` | `DayItem`, `day_pos`/`done` nos três tipos, `Snapshot.dayItems` | 2, 3 |
| `src/lib/merge.ts` | `PK`, `LISTA`, tipos `Tabela`/`Lista` | 2 |
| `src/lib/store.tsx` | o array `tabelas` do Realtime | 2 |
| `src/lib/load.ts` | select, `normDayItem`, `vazio()`, os três normalizadores | 2, 3 |
| `src/lib/dia.ts` | **juntar, ordenar, somar, contar** — puro, sem React | 5 |
| `src/content/index.ts` | `tkEmoji`, `fkEmoji`, `DI_EMOJI` | 4 |
| `src/screens/roteiro/Editor.tsx` | os quatro cartões de hoje, movidos sem mudança | 6 |
| `src/screens/roteiro/Vista.tsx` | a visualização do dia | 7 |
| `src/screens/Roteiro.tsx` | calendário, blocos, navegação, o par vista/editor | 6, 7, 9 |
| `src/lib/calc.ts` | `day_item` nas contas do dia e da viagem | 8 |
| `src/app/extras.css` | o CSS da vista | 7 |
| `scripts/check.mjs` | o aceite novo | 8 |
| `tests/dia.test.mjs` | os testes do módulo puro | 5 |

---

# Tarefa 1 — o SQL, e as duas cópias do esquema

**Files:**
- Create: `supabase/10-o-dia-em-ordem.sql`
- Modify: `supabase/00-tudo.sql`, `supabase/01-schema.sql`
- Test: `tests/telas.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces: a tabela `day_item` e as colunas `day_pos`/`done` em `attraction`, `food`, `leg` — usadas por todas as tarefas seguintes.

- [ ] **Passo 1: escrever o teste que falha**

Acrescentar ao fim de `tests/telas.test.mjs`:

```js
/**
 * `dados/` e `src/content/` sao copias que precisam bater, e as DUAS copias
 * do esquema tambem: `00-tudo.sql` e a colada unica, `01-schema.sql` e a
 * fatiada. Quem mexe numa e esquece a outra cria um banco novo diferente do
 * banco de producao, e a diferenca so aparece quando alguem roda o seed do
 * zero — meses depois.
 */
test('as duas copias do esquema conhecem o dia em ordem', () => {
  const copias = ['supabase/00-tudo.sql', 'supabase/01-schema.sql']
    .map((f) => [f, readFileSync(join(RAIZ, f), 'utf8')]);

  const faltando = [];
  for (const [nome, sql] of copias) {
    if (!/create table if not exists day_item/.test(sql)) {
      faltando.push(`${nome}: sem a tabela day_item`);
    }
    for (const t of ['attraction', 'food', 'leg']) {
      // a coluna tem que estar DENTRO do create table daquela tabela
      const bloco = sql.split(`create table if not exists ${t} (`)[1];
      if (!bloco) { faltando.push(`${nome}: sem a tabela ${t}`); continue; }
      const corpo = bloco.split('\n);')[0];
      if (!/day_pos/.test(corpo)) faltando.push(`${nome}: ${t} sem day_pos`);
      if (!/\bdone\b/.test(corpo)) faltando.push(`${nome}: ${t} sem done`);
    }
  }
  assert.deepEqual(faltando, [], `Esquema pela metade:\n${faltando.join('\n')}`);
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -A6 "dia em ordem"`
Expected: FAIL, listando `00-tudo.sql: sem a tabela day_item` e as seis colunas faltando.

- [ ] **Passo 3: escrever a migração**

Criar `supabase/10-o-dia-em-ordem.sql`:

```sql
-- ============================================================
-- 10 — O dia em ordem, e o item que ele escreve  (06/09/2026)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. Roda duas vezes sem
-- estragar nada. O DESFAZER está no fim.
--
-- O PEDIDO: "quero ver o itinerario do dia mais detalhado", com ordem, com
-- o que ele já fez marcado, e com uma linha para escrever o que não é
-- atração nem transporte nem comida (check-in, lavanderia).
--
-- DUAS CONFUSÕES QUE ESTE ARQUIVO PRECISA IMPEDIR:
--
--  1. `day_pos` é a ordem DENTRO DO DIA. A tabela `leg` já tem `position`,
--     que é a sequência da VIAGEM INTEIRA e é o que a aba Transporte usa.
--     As duas passam a viver lado a lado na mesma tabela, e trocar uma
--     pela outra embaralha o roteiro sem dar erro nenhum.
--
--  2. `done` é "EU FIZ". `attraction.paid` e `leg.bought` são "EU PAGUEI".
--     Um passeio de graça pode estar `done` e nunca `paid`; um trem pode
--     estar `bought` em outubro e só ficar `done` em dezembro.
-- ============================================================

create table if not exists day_item (
  id         uuid primary key default gen_random_uuid(),
  -- os 34 dias são fixos e ninguém apaga um `day`. O cascade existe para
  -- não deixar item órfão apontando para um dia que não existe mais.
  day_iso    date not null references day(iso) on delete cascade,
  name       text not null,
  note       text not null default '',
  amount     numeric(10,2),
  -- regra 5.11: item sem moeda cai no lado pré-selecionado. Euro, igual a
  -- transporte. Foi assim que R$ 257 virou R$ 1.595 uma vez.
  currency   text not null default 'eur' check (currency in ('eur','brl')),
  day_pos    int  not null default 0,   -- a ordem DENTRO do dia
  done       boolean not null default false,  -- "eu fiz", não "eu paguei"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references app_user(id)
);
create index if not exists day_item_day_idx on day_item (day_iso, day_pos);

alter table attraction
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;
alter table food
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;
alter table leg
  add column if not exists day_pos int     not null default 0,
  add column if not exists done    boolean not null default false;

-- ------------------------------------------------------------
-- AS TRÊS LISTAS DO BANCO QUE NINGUÉM LEMBRA NA HORA.
-- Sem elas a tabela existe e não serve: ninguém lê, a outra pessoa não vê
-- o que você escreve, e o que você apaga continua na tela dela.
-- ------------------------------------------------------------
alter table day_item enable row level security;
drop policy if exists "so os dois" on day_item;
create policy "so os dois" on day_item
  for all using (is_member()) with check (is_member());

do $$
begin
  alter publication supabase_realtime add table day_item;
exception when duplicate_object then null;
end $$;

alter table day_item replica identity full;

-- ------------------------------------------------------------
-- CONFERÊNCIA. Grava um item de mentira num dia de verdade, confere e
-- apaga, DENTRO de um bloco `do` — num comando único o `delete` não veria
-- a linha que o `insert` acabou de criar, e a linha de teste ficaria no
-- banco para sempre.
-- ------------------------------------------------------------
do $$
declare gravado text;
begin
  insert into day_item (day_iso, name, day_pos)
  values ((select iso from day order by iso limit 1), '__teste do dia__', 7)
  returning name into gravado;

  delete from day_item where name = '__teste do dia__';

  if gravado is distinct from '__teste do dia__' then
    raise exception 'day_item NAO aceitou a linha; veio %', gravado;
  end if;
  raise notice 'ok: day_item grava e apaga';
end $$;

-- O resultado que aparece na tela do Supabase: uma linha, tudo `true` e
-- `sobrou_lixo = 0`.
select
  (select count(*) from information_schema.columns
    where table_name = 'day_item')                     as colunas_da_tabela_nova,
  (select count(*) from information_schema.columns
    where table_name in ('attraction','food','leg')
      and column_name in ('day_pos','done'))           as colunas_novas_nas_tres,
  (select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'day_item') = 1                  as realtime_ligado,
  (select relreplident from pg_class
    where oid = 'day_item'::regclass) = 'f'            as linha_inteira_no_delete,
  (select count(*) from pg_policies
    where tablename = 'day_item') >= 1                 as rls_com_politica,
  (select count(*) from day_item
    where name = '__teste do dia__')                   as sobrou_lixo;

-- `colunas_novas_nas_tres` tem que ser 6: day_pos e done em attraction,
-- food e leg.

-- ------------------------------------------------------------
-- DESFAZER
--   drop table if exists day_item;
--   alter table attraction drop column if exists day_pos,
--                          drop column if exists done;
--   alter table food       drop column if exists day_pos,
--                          drop column if exists done;
--   alter table leg        drop column if exists day_pos,
--                          drop column if exists done;
-- ------------------------------------------------------------
```

- [ ] **Passo 4: pôr a mesma coisa nas duas cópias do esquema**

Em `supabase/00-tudo.sql` **e** `supabase/01-schema.sql`, dentro do `create table` de cada uma das três tabelas, acrescentar as duas colunas com o comentário curto:

```sql
  -- a ordem DENTRO do dia (nao confundir com `position`, que em `leg` e a
  -- sequencia da viagem inteira). Ver supabase/10-o-dia-em-ordem.sql
  day_pos     int not null default 0,
  -- "eu fiz". `paid`/`bought` sao "eu paguei" — coisas diferentes.
  done        boolean not null default false,
```

E acrescentar o bloco `create table if not exists day_item (...)` inteiro (o mesmo do Passo 3, sem os blocos de conferência), mais a policy, a publicação e o `replica identity full`, na mesma seção onde `stay_option` já faz isso em `00-tudo.sql`.

- [ ] **Passo 5: rodar o teste e ver passar**

Run: `npm test 2>&1 | grep -E "dia em ordem|pass |fail "`
Expected: PASS, e `fail 0`.

- [ ] **Passo 6: commit**

```bash
git add supabase/ tests/telas.test.mjs
git commit -m "O dia em ordem: o SQL, e o teste que obriga as duas copias do esquema a baterem"
```

- [ ] **Passo 7: ele roda o SQL**

Abrir `https://supabase.com/dashboard/project/qwwmjibqlgysjembhbxs/sql/new` no Chrome, colar o arquivo inteiro no editor Monaco (`window.monaco.editor.getEditors()[0].setValue(sql)`) e **deixar o clique em `Run` para ele**. Conferir na resposta: `colunas_novas_nas_tres = 6`, `realtime_ligado = true`, `linha_inteira_no_delete = true`, `rls_com_politica = true`, `sobrou_lixo = 0`.

**Não seguir para a Tarefa 2 antes de ele rodar.** Sem a migração, tudo que vem depois grava contra colunas que não existem e o PostgREST devolve 4xx.

---

# Tarefa 2 — `day_item` entra no app (os dez lugares)

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/merge.ts`, `src/lib/store.tsx`, `src/lib/load.ts`
- Test: `tests/merge.test.mjs`

**Interfaces:**
- Consumes: a tabela `day_item` da Tarefa 1.
- Produces:
  - `interface DayItem { id: string; day_iso: string; name: string; note: string; amount: number | null; currency: Currency; day_pos: number; done: boolean }`
  - `Snapshot.dayItems: DayItem[]`
  - `Tabela` passa a incluir `'day_item'`; `LISTA.day_item === 'dayItems'`; `PK.day_item === 'id'`.

- [ ] **Passo 1: escrever o teste que falha**

Em `tests/merge.test.mjs`, acrescentar `dayItems: []` ao objeto `base()` (logo depois de `extras: []`) e acrescentar ao fim do arquivo:

```js
/**
 * A tabela nova no tempo real. `inserirLocal` faz spread sobre a lista do
 * Snapshot: se a chave `dayItems` nao existir em `vazio()` e em `LISTA`, o
 * PRIMEIRO insert remoto e um TypeError e a tela inteira cai — nao e falha
 * silenciosa, e queda. Este teste prova os dois lados.
 */
test('day_item: insert, update e delete remotos chegam na lista', () => {
  let s = base();

  s = aplicarRemoto(s, 'day_item', {
    eventType: 'INSERT',
    new: { id: 'd1', day_iso: '2026-12-12', name: 'Check-in no Airbnb', note: '',
           amount: null, currency: 'eur', day_pos: 0, done: false },
    old: {},
  }, new Map());
  assert.equal(s.dayItems.length, 1);
  assert.equal(s.dayItems[0].name, 'Check-in no Airbnb');

  s = aplicarRemoto(s, 'day_item', upd({
    id: 'd1', day_iso: '2026-12-12', name: 'Check-in no Airbnb', note: '',
    amount: null, currency: 'eur', day_pos: 0, done: true,
  }), new Map());
  assert.equal(s.dayItems[0].done, true, 'a Lu marcou feito e ele ve');

  s = aplicarRemoto(s, 'day_item', {
    eventType: 'DELETE', new: {}, old: { id: 'd1' },
  }, new Map());
  assert.equal(s.dayItems.length, 0);
});

test('day_item: escrita local pendente nao e sobrescrita pelo remoto', () => {
  let s = base();
  s = aplicarRemoto(s, 'day_item', {
    eventType: 'INSERT',
    new: { id: 'd1', day_iso: '2026-12-12', name: 'Lavanderia', note: '',
           amount: null, currency: 'eur', day_pos: 0, done: false },
    old: {},
  }, new Map());

  // ele acabou de digitar o valor e ainda esta na fila
  const pend = new Map([[chave('day_item', 'd1', 'amount'), 35]]);
  s = mesclar(s, 'day_item', 'd1', { amount: 35 });
  s = aplicarRemoto(s, 'day_item', upd({
    id: 'd1', day_iso: '2026-12-12', name: 'Lavanderia', note: '',
    amount: null, currency: 'eur', day_pos: 0, done: false,
  }), pend);
  assert.equal(s.dayItems[0].amount, 35, 'o que ele digitou sobrevive');
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -A6 "day_item: insert"`
Expected: FAIL — `TypeError` ou `s.dayItems` indefinido.

- [ ] **Passo 3: os dez lugares**

**1. `src/lib/types.ts`** — depois de `interface Booking`:

```ts
/**
 * O item que ELE escreve direto no dia: check-in, lavanderia, comprar
 * presente. E o unico dos quatro tipos do dia que so existe dentro do dia
 * — por isso o `x` dele APAGA, enquanto o das atracoes so tira do dia.
 *
 * Nao tem `seed_id` de proposito: pesquisa minha nunca nasce dentro das
 * tabelas dele (a regra de 06/09), e isto aqui e so dele.
 */
export interface DayItem {
  id: string;
  day_iso: string;
  name: string;
  note: string;
  amount: number | null;
  currency: Currency;
  /** A ordem DENTRO do dia. Ver o comentario em supabase/10-o-dia-em-ordem.sql. */
  day_pos: number;
  /** "eu fiz" — nao e "eu paguei". */
  done: boolean;
}
```

E no `interface Snapshot`, ao lado de `extras`:

```ts
  /**
   * A chave TEM que existir aqui e em `vazio()`: `inserirLocal` faz spread
   * sobre ela no primeiro INSERT remoto, e spread sobre `undefined` derruba
   * a tela inteira.
   */
  dayItems: DayItem[];
```

**2. `src/lib/merge.ts`** — três lugares:

```ts
export const PK: Record<string, string> = {
  day: 'iso',
  attraction: 'id',
  // ...
  day_item: 'id',
};

export type Tabela =
  | 'day' | 'attraction' | 'food' | 'leg' | 'booking' | 'stay' | 'stay_option'
  | 'city' | 'extra' | 'settings' | 'savings' | 'contribution' | 'killed_seed'
  | 'adopted' | 'aviso' | 'day_item';

type Lista = 'attractions' | 'foods' | 'legs' | 'bookings' | 'stayOptions'
  | 'cities' | 'extras' | 'contributions' | 'avisos' | 'dayItems';

export const LISTA: Record<string, Lista> = {
  // ...
  day_item: 'dayItems',
};
```

**3. `src/lib/store.tsx:341`** — acrescentar `'day_item'` ao array:

```ts
    const tabelas = ['day','attraction','food','leg','booking','stay','stay_option',
                     'city','extra','settings','killed_seed','adopted','savings',
                     'contribution','aviso','day_item'];
```

**4. `src/lib/load.ts`** — quatro lugares:

```ts
// (a) em vazio(), ao lado de extras:
  dayItems: [],

// (b) no destructuring e no Promise.all:
    killed, adopted, savings, contribution, aviso, dayItem,
  ] = await Promise.all([
    // ...
    db.from('aviso').select('*').order('position'),
    db.from('day_item').select('*').order('day_pos'),
  ]);

// (c) o normalizador, ao lado dos outros:
const normDayItem = (r: Record<string, unknown>): DayItem => ({
  id: String(r.id), day_iso: String(r.day_iso), name: String(r.name),
  note: String(r.note ?? ''),
  amount: n(r.amount), currency: r.currency as DayItem['currency'],
  day_pos: Number(r.day_pos ?? 0), done: !!r.done,
});

// (d) o uso, junto dos outros:
  s.dayItems = (dayItem.data ?? []).map(normDayItem);
```

Acrescentar `DayItem` ao `import type` de `load.ts`.

- [ ] **Passo 4: rodar e ver passar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "day_item|pass |fail "`
Expected: typecheck limpo, os dois testes novos passando, `fail 0`.

- [ ] **Passo 5: commit**

```bash
git add src/lib/ tests/merge.test.mjs
git commit -m "day_item entra no app: os dez lugares, e o teste que prova o tempo real"
```

---

# Tarefa 3 — `day_pos` e `done` nos três tipos que já existem

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/load.ts`
- Test: `tests/merge.test.mjs`

**Interfaces:**
- Consumes: a Tarefa 1 (as colunas no banco).
- Produces: `Attraction`, `Food` e `Leg` ganham `day_pos: number` e `done: boolean`, **obrigatórios**.

- [ ] **Passo 1: escrever o teste que falha**

Acrescentar ao fim de `tests/merge.test.mjs`:

```js
/**
 * Coluna nova que o normalizador de `load.ts` nao conhece funciona na tela,
 * sincroniza para a outra pessoa, E SOME NO PRIMEIRO F5. E a armadilha do
 * COMO-MEXER, e ela nao da erro de build. O jeito de o `tsc` pegar e o
 * campo ser OBRIGATORIO no tipo — este teste prova o outro lado, que o
 * valor atravessa o tempo real.
 */
test('day_pos e done atravessam o tempo real nas tres tabelas', () => {
  let s = base();

  s = aplicarRemoto(s, 'attraction', upd({
    id: 'a1', city: 'lisboa', name: 'Torre de Belém', price_eur: 0, note: '',
    status: 'escolhida', kind: 'passeio', day_iso: '2026-12-12', paid: false,
    seed_id: 'm:lisboa:7', day_pos: 3, done: true,
  }), new Map());
  assert.equal(s.attractions[0].day_pos, 3);
  assert.equal(s.attractions[0].done, true);

  s = aplicarRemoto(s, 'leg', upd({
    id: 't1', position: 0, name: 'Madrid → Cáceres', note: '', kind: 'trem',
    amount: null, currency: 'eur', bought: false, day_iso: '2026-12-12',
    seed_id: 't:0', day_pos: 1, done: true,
  }), new Map());
  assert.equal(s.legs[0].day_pos, 1, 'day_pos e a ordem no DIA');
  assert.equal(s.legs[0].position, 0, 'position continua sendo a ordem da VIAGEM');
  assert.equal(s.legs[0].done, true);
  assert.equal(s.legs[0].bought, false, 'done nao e bought');
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -A4 "atravessam o tempo real"`
Expected: FAIL — `undefined !== 3`.

- [ ] **Passo 3: os tipos e os normalizadores**

Em `src/lib/types.ts`, acrescentar a `Attraction`, `Food` e `Leg` (nos três):

```ts
  /**
   * A ordem DENTRO do dia. NAO e o `position` de `leg`, que e a sequencia
   * da viagem inteira. Obrigatorio de proposito: opcional, o normalizador
   * de load.ts pode esquecer e o valor some no primeiro F5.
   */
  day_pos: number;
  /** "eu fiz". Nao e `paid` nem `bought`, que sao "eu paguei". */
  done: boolean;
```

Em `src/lib/load.ts`, acrescentar aos três normalizadores:

```ts
  day_pos: Number(r.day_pos ?? 0), done: !!r.done,
```

O `tsc` vai apontar **todos** os outros lugares que constroem um `Attraction`/`Food`/`Leg` (o caminho de demonstração em `load.ts`, e os testes). Corrigir cada um com `day_pos: 0, done: false`.

- [ ] **Passo 4: rodar e ver passar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "atravessam|pass |fail "`
Expected: typecheck limpo, PASS, `fail 0`.

- [ ] **Passo 5: commit**

```bash
git add src/lib/ tests/
git commit -m "day_pos e done nas tres tabelas do dia, obrigatorios para o tsc cobrar"
```

---

# Tarefa 4 — os emojis com saída, e `DI_EMOJI`

**Files:**
- Modify: `src/content/index.ts`, `tests/telas.test.mjs`

**Interfaces:**
- Produces: `tkEmoji(kind: string): string`, `fkEmoji(kind: string): string`, `DI_EMOJI: string`.

- [ ] **Passo 1: escrever o teste que falha**

Em `tests/telas.test.mjs`, trocar o teste do `AKE` cru por um que cobre os três dicionários:

```js
/**
 * Nenhuma tela pode ler `AKE[...]`, `TKE[...]` ou `FKE[...]` direto.
 *
 * O tema da atracao e TEXTO LIVRE desde 06/09, entao `AKE['museu']` e
 * `undefined` — e `{undefined} {nome}` no JSX nao quebra nada: desenha um
 * espaco solto e segue. Transporte e comida ainda tem lista fechada, mas o
 * dado vem do BANCO, e banco com valor fora da lista e questao de tempo.
 *
 * As funcoes com `??` sao `akEmoji`, `tkEmoji` e `fkEmoji`, em @/content.
 * `AKE.passeio` / `TKE.trem` continuam permitidos: sao chaves literais, e a
 * legenda do Roteiro as escreve na mao.
 */
const EMOJI_CRU = /\b(AKE|TKE|FKE)\[[^\]]+\]/;

test('nenhuma tela le AKE/TKE/FKE[...] direto — o dado vem do banco', () => {
  const achados = [];
  for (const rel of arquivosDeTela()) {
    const linhas = readFileSync(join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return;
      if (EMOJI_CRU.test(l)) achados.push(`${rel}:${i + 1}  ${l.trim()}`);
    });
  }
  assert.deepEqual(
    achados,
    [],
    `Tela lendo o dicionario de emoji direto. Troque por akEmoji/tkEmoji/fkEmoji, de @/content:\n${achados.join('\n')}`,
  );
});
```

`arquivosDeTela()` varre `src/screens` e `src/components`. Acrescentar `src/screens/roteiro` à lista de pastas dentro dela, senão os arquivos das Tarefas 6 e 7 escapam do teste:

```js
function arquivosDeTela() {
  const out = [];
  for (const pasta of ['src/screens', 'src/screens/roteiro', 'src/components']) {
    if (!existsSync(join(RAIZ, pasta))) continue;   // a pasta nasce na Tarefa 6
    for (const f of readdirSync(join(RAIZ, pasta))) {
      if (f.endsWith('.tsx')) out.push(join(pasta, f));
    }
  }
  return out;
}
```

Acrescentar `existsSync` ao import de `node:fs`.

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -A6 "direto — o dado vem do banco"`
Expected: FAIL, listando os `TKE[t.kind]` e `FKE[it.kind]` de `Roteiro.tsx`.

- [ ] **Passo 3: as funções e a troca**

Em `src/content/index.ts`, ao lado de `akEmoji`:

```ts
/** O emoji do transporte, com saida. Irma de `akEmoji` — mesma razao. */
export const tkEmoji = (kind: string): string => TKE[kind] ?? '🚉';
/** O emoji da comida, com saida. */
export const fkEmoji = (kind: string): string => FKE[kind] ?? '🍴';
/**
 * O item que ELE escreve direto no dia. 📌 le como "coisa presa neste dia",
 * e nao colide com nenhum dos outros tres tipos.
 */
export const DI_EMOJI = '📌';
```

Em `src/screens/Roteiro.tsx`, trocar todo `TKE[...]` por `tkEmoji(...)` e todo `FKE[...]` por `fkEmoji(...)`, e acrescentar os dois ao import de `@/content`. As linhas literais da legenda (`TKE.trem`, `FKE.cafe`, `AKE.passeio`) **ficam como estão**.

- [ ] **Passo 4: rodar e ver passar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "vem do banco|pass |fail "`
Expected: PASS, `fail 0`.

- [ ] **Passo 5: commit**

```bash
git add src/content/index.ts src/screens/Roteiro.tsx tests/telas.test.mjs
git commit -m "tkEmoji, fkEmoji e o 📌 do item livre — e o teste passa a cobrir os tres dicionarios"
```

---

# Tarefa 5 — `src/lib/dia.ts`, o módulo puro

**Files:**
- Create: `src/lib/dia.ts`, `tests/dia.test.mjs`
- Modify: `package.json` (acrescentar o arquivo à linha `test`)

**Interfaces:**
- Consumes: `Snapshot` com `dayItems` e `day_pos`/`done` nos três (Tarefas 2 e 3); `akEmoji`, `tkEmoji`, `fkEmoji` e `DI_EMOJI` (Tarefa 4).
- Produces:
  - `type Origem = 'leg' | 'attraction' | 'day_item' | 'food'`
  - `interface ItemDoDia { id: string; tabela: Origem; position: number; nome: string; nota: string; emoji: string; eur: number; brl: number; feito: boolean; sub: string }`
  - `itensDoDia(s: Snapshot, iso: string): ItemDoDia[]`
  - `proximaPos(s: Snapshot, iso: string): number`
  - `totalDoDia(s: Snapshot, iso: string): { eur: number; brl: number }`
  - `feitasDoDia(s: Snapshot, iso: string): { feitas: number; total: number }`

- [ ] **Passo 1: escrever o teste que falha**

Criar `tests/dia.test.mjs`:

```js
// ============================================================
// O modulo que junta as quatro origens de um dia.
//
// Por que ele existe separado da tela: a juncao e a ORDEM sao onde este
// desenho pode errar em silencio. Quatro tabelas dividem um unico espaco de
// numeracao (`day_pos`), e duas linhas empatadas tem que sair NA MESMA
// ORDEM nos dois navegadores — senao a lista da Lu e diferente da dele e
// nenhum dos dois entende por que.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '@/lib/dia.ts';
import { VOO } from '@/content/index.ts';

const ISO = '2026-12-16';

/** Um Snapshot minimo, so com o que `dia.ts` le. */
const snap = (over = {}) => ({
  days: { [ISO]: { iso: ISO, base: 'Madrid', plan: '' } },
  attractions: [], foods: [], legs: [], dayItems: [],
  bookings: [], stays: {}, cities: [], extras: [],
  settings: { id: 1, eur_rate: 6.2, flight_paid_brl: VOO },
  killed: [], adopted: [],
  savings: { leo: { who: 'leo', goal: null, currency: 'brl' },
             lu: { who: 'lu', goal: null, currency: 'eur' } },
  contributions: [], avisos: [], me: null, hoje: '2026-09-06',
  ...over,
});

const attr = (id, pos, o = {}) => ({
  id, city: 'madrid', name: `atr ${id}`, price_eur: 0, note: '',
  status: 'backlog', kind: 'passeio', day_iso: ISO, paid: false,
  seed_id: null, day_pos: pos, done: false, ...o,
});
const leg = (id, pos, o = {}) => ({
  id, position: 99, name: `trecho ${id}`, note: '', kind: 'trem',
  amount: null, currency: 'eur', bought: false, day_iso: ISO,
  seed_id: null, day_pos: pos, done: false, ...o,
});
const food = (id, pos, o = {}) => ({
  id, country: 'es', name: `comida ${id}`, note: '', kind: 'restaurante',
  day_iso: ISO, seed_id: null, day_pos: pos, done: false, ...o,
});
const item = (id, pos, o = {}) => ({
  id, day_iso: ISO, name: `livre ${id}`, note: '', amount: null,
  currency: 'eur', day_pos: pos, done: false, ...o,
});

test('junta as quatro origens do dia, e so as do dia', () => {
  const s = snap({
    attractions: [attr('a1', 1), attr('a2', 9, { day_iso: '2026-12-17' })],
    legs: [leg('t1', 0)],
    foods: [food('f1', 2)],
    dayItems: [item('d1', 3), item('d2', 9, { day_iso: '2026-12-17' })],
  });
  const l = D.itensDoDia(s, ISO);
  assert.deepEqual(l.map((x) => x.id), ['t1', 'a1', 'f1', 'd1']);
  assert.deepEqual(l.map((x) => x.tabela),
    ['leg', 'attraction', 'food', 'day_item']);
});

test('ordena por day_pos', () => {
  const s = snap({
    attractions: [attr('a1', 3)],
    legs: [leg('t1', 1)],
    dayItems: [item('d1', 2)],
  });
  assert.deepEqual(D.itensDoDia(s, ISO).map((x) => x.id), ['t1', 'd1', 'a1']);
});

/**
 * O TESTE QUE MAIS IMPORTA. Todo item nasce com day_pos = 0, entao empate e
 * o caso NORMAL ate a etapa 2, nao a excecao. A mesma entrada em qualquer
 * ordem de chegada tem que dar a mesma saida, ou os dois navegadores
 * mostram listas diferentes.
 */
test('empate desempata igual, venha na ordem que vier', () => {
  const a = snap({
    attractions: [attr('a1', 0), attr('a2', 0)],
    legs: [leg('t1', 0)],
    foods: [food('f1', 0)],
    dayItems: [item('d1', 0)],
  });
  const b = snap({
    attractions: [attr('a2', 0), attr('a1', 0)],
    legs: [leg('t1', 0)],
    foods: [food('f1', 0)],
    dayItems: [item('d1', 0)],
  });
  const esperado = ['t1', 'a1', 'a2', 'd1', 'f1'];
  assert.deepEqual(D.itensDoDia(a, ISO).map((x) => x.id), esperado);
  assert.deepEqual(D.itensDoDia(b, ISO).map((x) => x.id), esperado,
    'a ordem de chegada nao pode mudar a lista');
});

test('proximaPos olha as QUATRO origens', () => {
  const s = snap({
    attractions: [attr('a1', 2)],
    legs: [leg('t1', 0)],
    foods: [food('f1', 5)],     // a maior esta na comida
    dayItems: [item('d1', 1)],
  });
  assert.equal(D.proximaPos(s, ISO), 6);
  assert.equal(D.proximaPos(snap(), ISO), 0, 'dia vazio comeca em 0');
});

test('o total do dia soma os dois lados, de todas as origens', () => {
  const s = snap({
    attractions: [attr('a1', 0, { price_eur: 20 })],
    legs: [leg('t1', 1, { amount: 800, currency: 'brl' }),
           leg('t2', 2, { amount: 22, currency: 'eur' })],
    dayItems: [item('d1', 3, { amount: 40, currency: 'eur' }),
               item('d2', 4, { amount: 35, currency: 'brl' })],
  });
  assert.deepEqual(D.totalDoDia(s, ISO), { eur: 82, brl: 835 });
  assert.deepEqual(D.totalDoDia(snap(), ISO), { eur: 0, brl: 0 });
});

test('feitasDoDia conta o que esta marcado', () => {
  const s = snap({
    attractions: [attr('a1', 0, { done: true }), attr('a2', 1)],
    dayItems: [item('d1', 2, { done: true })],
  });
  assert.deepEqual(D.feitasDoDia(s, ISO), { feitas: 2, total: 3 });
  assert.deepEqual(D.feitasDoDia(snap(), ISO), { feitas: 0, total: 0 });
});

test('emoji nunca vem vazio, nem com tema inventado', () => {
  const s = snap({
    attractions: [attr('a1', 0, { kind: 'mercado de natal' })],
    legs: [leg('t1', 1, { kind: 'metro' })],
    foods: [food('f1', 2, { kind: 'cafe' })],
    dayItems: [item('d1', 3)],
  });
  for (const x of D.itensDoDia(s, ISO)) {
    assert.ok(x.emoji && x.emoji.length > 0, `${x.id} ficou sem emoji`);
  }
});
```

Acrescentar `tests/dia.test.mjs` à linha `test` do `package.json`, no fim da lista.

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '@/lib/dia.ts'`.

- [ ] **Passo 3: escrever `src/lib/dia.ts`**

```ts
// ============================================================
// O DIA, juntando as quatro origens (06/09/2026).
//
// Ate aqui um dia eram TRES listas soltas — atracao, trecho e comida —
// desenhadas como parede de etiqueta, sem ordem entre si. Ele pediu
// "o itinerario do dia mais detalhado" e escolheu ordem sem hora.
//
// Este modulo e PURO de proposito: nao importa React, nao le contexto, e
// e testado em tests/dia.test.mjs. A juncao e a ordem sao onde este
// desenho erra em silencio, e funcao pura e o que da para trancar.
// ============================================================
import { akEmoji, fkEmoji, tkEmoji, DI_EMOJI, FK, TK } from '@/content';
import * as C from './calc';
import { num } from './fmt';
import type { Snapshot } from './types';

export type Origem = 'leg' | 'attraction' | 'day_item' | 'food';

/**
 * A ORDEM DE DESEMPATE, e ela nao e arbitraria: e a ordem em que as coisas
 * acontecem num dia. Primeiro voce chega (trecho), depois anda (atracao),
 * o que voce escreveu fica no meio, e comer fecha.
 *
 * Ela existe porque todo item nasce com `day_pos = 0`: empate e o caso
 * NORMAL, nao a excecao. Sem desempate fixo, a lista sairia numa ordem no
 * navegador dele e noutra no da Lu, e nenhum dos dois entenderia.
 */
const ORD: Record<Origem, number> = { leg: 0, attraction: 1, day_item: 2, food: 3 };

export interface ItemDoDia {
  id: string;
  tabela: Origem;
  /** O `day_pos`. O nome casa com `ComPos` de ordem.ts, que as setas usam. */
  position: number;
  nome: string;
  nota: string;
  emoji: string;
  /** 0 quando nao ha valor — nunca null, para quem soma nao precisar checar. */
  eur: number;
  brl: number;
  feito: boolean;
  /** A linha miuda: a cidade da atracao, o tipo do trecho, o tipo da comida. */
  sub: string;
}

/** As quatro origens do dia, juntas e em ordem estavel. */
export function itensDoDia(s: Snapshot, iso: string): ItemDoDia[] {
  const out: ItemDoDia[] = [];

  for (const t of C.legsOfDay(s, iso)) {
    const v = num(t.amount);
    out.push({
      id: t.id, tabela: 'leg', position: t.day_pos,
      nome: t.name, nota: t.note, emoji: tkEmoji(t.kind),
      eur: t.currency === 'brl' ? 0 : v,
      brl: t.currency === 'brl' ? v : 0,
      feito: t.done,
      sub: (TK as Record<string, string>)[t.kind] ?? t.kind,
    });
  }
  for (const a of C.attrsOfDay(s, iso)) {
    out.push({
      id: a.id, tabela: 'attraction', position: a.day_pos,
      nome: a.name, nota: a.note, emoji: akEmoji(a.kind),
      eur: num(a.price_eur), brl: 0,
      feito: a.done,
      sub: C.nomeCidade(s, a.city),
    });
  }
  for (const d of s.dayItems) {
    if (d.day_iso !== iso) continue;
    const v = num(d.amount);
    out.push({
      id: d.id, tabela: 'day_item', position: d.day_pos,
      nome: d.name, nota: d.note, emoji: DI_EMOJI,
      eur: d.currency === 'brl' ? 0 : v,
      brl: d.currency === 'brl' ? v : 0,
      feito: d.done,
      sub: 'seu',
    });
  }
  for (const f of C.foodsOfDay(s, iso)) {
    out.push({
      id: f.id, tabela: 'food', position: f.day_pos,
      nome: f.name, nota: f.note, emoji: fkEmoji(f.kind),
      eur: 0, brl: 0,
      feito: f.done,
      sub: (FK as Record<string, string>)[f.kind] ?? f.kind,
    });
  }

  return out.sort((x, y) =>
    x.position - y.position
    || ORD[x.tabela] - ORD[y.tabela]
    || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * A proxima posicao, olhando as QUATRO origens.
 *
 * Se olhasse so uma, todo item novo nasceria empatado com um existente — e
 * a lista so se consertaria na primeira seta.
 */
export function proximaPos(s: Snapshot, iso: string): number {
  const l = itensDoDia(s, iso);
  return l.length ? Math.max(...l.map((x) => x.position)) + 1 : 0;
}

export function totalDoDia(s: Snapshot, iso: string): { eur: number; brl: number } {
  return itensDoDia(s, iso).reduce(
    (a, x) => ({ eur: a.eur + x.eur, brl: a.brl + x.brl }),
    { eur: 0, brl: 0 },
  );
}

export function feitasDoDia(s: Snapshot, iso: string): { feitas: number; total: number } {
  const l = itensDoDia(s, iso);
  return { feitas: l.filter((x) => x.feito).length, total: l.length };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "junta as quatro|empate|proximaPos|pass |fail "`
Expected: os sete testes de `dia.test.mjs` passando, `fail 0`.

- [ ] **Passo 5: commit**

```bash
git add src/lib/dia.ts tests/dia.test.mjs package.json
git commit -m "dia.ts: as quatro origens do dia numa lista so, com desempate deterministico"
```

---

# Tarefa 6 — o editor sai para o próprio arquivo, sem mudar nada

Mudança **mecânica**: nenhum comportamento muda. É o que torna a Tarefa 7 possível de revisar.

**Files:**
- Create: `src/screens/roteiro/Editor.tsx`
- Modify: `src/screens/Roteiro.tsx`

**Interfaces:**
- Produces: `export default function Editor({ iso }: { iso: string })` em `src/screens/roteiro/Editor.tsx` — o mesmo componente de hoje, com os quatro cartões.

- [ ] **Passo 1: mover**

Recortar de `src/screens/Roteiro.tsx` e colar em `src/screens/roteiro/Editor.tsx`, sem editar o corpo: `Editor`, `CartaoDia`, `CartaoTransporte`, `CartaoAtracoes`, `CartaoComidas`, e os auxiliares que **só eles** usam (`TKROT`, `FKROT`, `TKS`, `ORIGEM`, `ORIGCLS`, `avisoDe`).

O arquivo novo começa com `'use client';` e leva um cabeçalho:

```tsx
'use client';
// ============================================================
// O EDITOR DE UM DIA — os quatro cartoes.
//
// Saiu de Roteiro.tsx em 06/09 sem uma linha de mudanca: o arquivo tinha
// 809 linhas e a visualizacao nova dobraria isso. Aqui nao mudou nada de
// comportamento, so de endereco.
//
// A REESCRITA DELE E A ETAPA 2 (ver a spec): a lista do dia sai dos quatro
// cartoes e vira uma lista so, ordenavel; os cartoes viram so os seletores
// de onde puxar. Nao da para ordenar entre tipos enquanto cada tipo tiver
// a propria lista.
// ============================================================
```

`Roteiro.tsx` passa a importar: `import Editor from './roteiro/Editor';` e perde tudo que foi movido, inclusive os imports que ficaram sem uso — o `tsc` aponta.

`avisoDe` é usado nos dois arquivos (o calendário mostra o aviso do dia). Copiar a função para `Editor.tsx` **não**: exportá-la de `Roteiro.tsx` criaria import circular. Mover `avisoDe` e `alertaDe` para `src/lib/calc.ts` como `avisoDoDia(s, iso)` e `alertaDoDia(s, iso)`, e os dois arquivos importam de lá.

- [ ] **Passo 2: provar que nada mudou**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "pass |fail " && npm run build 2>&1 | grep -E "Compiled successfully"`
Expected: typecheck limpo, todos os testes passando, build limpo.

- [ ] **Passo 3: provar na tela**

Subir `npm run dev` (com o `.next` limpo), abrir o Roteiro, clicar num dia, e conferir que os quatro cartões aparecem e funcionam exatamente como antes: escrever a base, marcar uma atração, ligar a chave do transporte.

- [ ] **Passo 4: commit**

```bash
git add src/screens/ src/lib/calc.ts
git commit -m "Roteiro: o editor sai para roteiro/Editor.tsx, sem mudar comportamento"
```

---

# Tarefa 7 — `Vista.tsx`, a visualização do dia

**Files:**
- Create: `src/screens/roteiro/Vista.tsx`
- Modify: `src/screens/Roteiro.tsx`, `src/app/extras.css`

**Interfaces:**
- Consumes: `itensDoDia`, `totalDoDia`, `feitasDoDia` de `@/lib/dia`; `Editor` da Tarefa 6.
- Produces: `export default function Vista({ iso, onEditar }: { iso: string; onEditar: () => void })`.

- [ ] **Passo 1: o componente**

Criar `src/screens/roteiro/Vista.tsx`:

```tsx
'use client';
// ============================================================
// A VISUALIZACAO DE UM DIA (06/09/2026).
//
// O pedido dele: "quando eu clicar em um dia nao devo aparecer em editar,
// quero ver o itinerario do dia mais detalhado". Ate aqui clicar num dia
// era SEMPRE editar — quatro cartoes de formulario.
//
// TRES REGRAS QUE ESTA TELA NAO PODE QUEBRAR:
//
//  1. A CAIXINHA E O [editar] SAO AS UNICAS COISAS CLICAVEIS. Nenhum campo
//     de texto, nenhum `x`, nenhum seletor. Ele vai usar isto com o celular
//     na mao, no frio, no metro — qualquer coisa que se apague por encosto
//     e um defeito.
//  2. A NOTA VEM INTEIRA, nunca cortada. Foi escolha dele entre tres
//     opcoes, e existe porque a informacao que salva o dia mora ali:
//     "GRATIS seg-qui 16h-18h", "fila de ~40 min". Hoje essa nota nao
//     aparece em lugar nenhum do Roteiro.
//  3. FEITO RISCA NO LUGAR — a lista nunca se reordena sozinha. Ele
//     escolheu isso sabendo que continua rolando para achar a proxima; a
//     troca foi "a lista nao danca debaixo do meu dedo".
//
// A ORDEM AINDA NAO E DELE. Todo item nasce com `day_pos = 0`, e as setas
// so chegam na etapa 2. Ate la a lista sai pelo desempate de dia.ts, que e
// estavel mas nao foi escolhida por ninguem — por isso ela NAO NUMERA, e o
// rodape diz que a ordem chega em seguida. Numerar seria a tela afirmando
// uma sequencia que ele nao montou.
// ============================================================
import Avisos from '@/components/Avisos';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, longDt, marcado, wdOf } from '@/lib/fmt';
import { ISOS } from '@/content';
import { Inline } from '@/components/Field';

export default function Vista({ iso, onEditar }: { iso: string; onEditar: () => void }) {
  const { s, now } = useApp();
  const itens = D.itensDoDia(s, iso);
  const { eur: te, brl: tb } = D.totalDoDia(s, iso);
  const { feitas, total } = D.feitasDoDia(s, iso);
  const d = s.days[iso];
  const base = (d?.base ?? '').trim();
  const plano = (d?.plan ?? '').trim();

  return (
    <div className="card dvista" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>{longDt(iso)}</h3>
        <div className="m">
          {wdOf(iso)} · dia {ISOS.indexOf(iso) + 1} de {ISOS.length}
          {base ? ` · ${base}` : ''}
          {total ? ` · ${feitas} de ${total} feitas` : ''}
        </div>
        <button type="button" className="chip" onClick={onEditar}>editar</button>
      </div>

      <div className="b">
        {/* leitura: o Avisos desenha o cartao dele, e o "mexer" fica la dentro */}
        <Avisos spot={`roteiro:${iso}`} rotulo="aviso do dia" />

        {plano ? <Inline html={marcado(plano)} className="dvplano" /> : null}

        {!itens.length ? (
          <div className="empty">
            Nada marcado neste dia ainda. Clique em <b>editar</b> para escrever o que
            fazer, ou puxar uma atração, um trecho ou um lugar de comer.
          </div>
        ) : (
          <div className="dvlista">
            {itens.map((x) => (
              <div key={`${x.tabela}:${x.id}`} className={`dvit${x.feito ? ' ok' : ''}`}>
                <input
                  className="ck"
                  type="checkbox"
                  checked={x.feito}
                  aria-label={`já fiz: ${x.nome}`}
                  onChange={(e) => now(x.tabela, x.id, 'done', e.currentTarget.checked)}
                />
                <div className="dvnm">
                  {x.emoji} {x.nome}
                </div>
                <div className="dvvl">
                  {x.eur ? eur(x.eur) : ''}
                  {x.eur && x.brl ? ' + ' : ''}
                  {x.brl ? brl(x.brl) : ''}
                </div>
                {x.nota ? <Inline html={marcado(x.nota)} className="dvnota" /> : null}
                <div className="dvsub">{x.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div className="atsum">
          {te || tb ? (
            <>
              <b>{te ? eur(te) : ''}{te && tb ? ' + ' : ''}{tb ? brl(tb) : ''}</b> no dia
            </>
          ) : 'nada a pagar neste dia'}
          {itens.length ? ' · a ordem do dia chega em seguida' : ''}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Passo 2: ligar em `Roteiro.tsx`**

Trocar o `{selDay ? <Editor iso={selDay} /> : ...}` por um par vista/editor com estado local:

```tsx
// no topo do componente Roteiro:
const [editando, setEditando] = useState<string | null>(null);

// e no lugar do `<Editor iso={selDay} />`:
{selDay ? (
  editando === selDay
    ? (
      <>
        <div className="chips" style={{ marginBottom: 12 }}>
          <button className="chip" onClick={() => setEditando(null)}>← pronto</button>
        </div>
        <Editor iso={selDay} />
      </>
    )
    : <Vista iso={selDay} onEditar={() => setEditando(selDay)} />
) : ...}
```

**`editando` guarda o ISO, não um booleano.** Com booleano, ir para o dia seguinte pelas setas manteria o editor aberto no dia novo — e ele pediu justamente o contrário: clicar num dia mostra, não edita. Comparando com `selDay`, trocar de dia volta sozinho para a visualização.

- [ ] **Passo 3: o CSS**

Acrescentar ao fim de `src/app/extras.css`:

```css
/* ---------------------------------------------------------------
   A VISUALIZACAO DE UM DIA (06/09/2026).

   Nao usa `.mrow`: ali a nota seria uma coluna espremida numa grade em px
   com aritmetica justa, e a nota INTEIRA e o ponto desta tela. Grade
   propria, de tres colunas, com a nota ocupando a linha de baixo.
   --------------------------------------------------------------- */
.dvista .h { display: grid; grid-template-columns: 1fr auto; align-items: start; }
.dvista .h .m { grid-column: 1; }
.dvista .h .chip { grid-column: 2; grid-row: 1 / 3; align-self: center; }

.dvplano {
  display: block; font-size: 15.5px; color: var(--ink-2); line-height: 1.5;
  padding: var(--e3) 0; border-bottom: 1px solid var(--hairline);
}

.dvlista { display: grid; gap: var(--e3); margin-top: var(--e3); }
.dvit {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  grid-template-areas: "ck nm vl" ".  nt nt" ".  sb sb";
  gap: 4px var(--e2);
  align-items: start;
  padding: var(--e3) 0;
}
.dvit + .dvit { border-top: 1px solid var(--hairline); }
.dvit .ck  { grid-area: ck; width: 22px; height: 22px; margin: 2px 0 0; }
.dvnm      { grid-area: nm; font-size: 16px; font-weight: 600; line-height: 1.3; }
.dvvl      { grid-area: vl; font-family: var(--mono); font-size: 13px;
             color: var(--ink-2); font-variant-numeric: tabular-nums;
             white-space: nowrap; }
.dvnota    { grid-area: nt; font-size: 14.5px; color: var(--ink-2); line-height: 1.5; }
.dvsub     { grid-area: sb; font-family: var(--mono); font-size: 10.5px;
             letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }

/* feito RISCA E FICA NO LUGAR (decisao dele): a lista nao se reordena */
.dvit.ok .dvnm  { text-decoration: line-through; color: var(--muted); }
.dvit.ok .dvvl,
.dvit.ok .dvnota { opacity: .55; }

@media (max-width: 700px) {
  /* a caixinha sobe para 24px: WCAG 2.2 pede 24, e esta e a UNICA coisa
     clicavel da tela inteira — errar o toque aqui e errar tudo */
  .dvit .ck { width: 24px; height: 24px; }
  .dvit { grid-template-columns: 28px 1fr; grid-template-areas: "ck nm" ". vl" ". nt" ". sb"; }
  .dvvl { text-align: left; }
}
```

- [ ] **Passo 4: provar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "pass |fail " && npm run build 2>&1 | grep -E "Compiled successfully"`

Depois, com `npm run dev` e o `.next` limpo:
1. clicar num dia → aparece a **visualização**, não o editor;
2. clicar em `editar` → os quatro cartões, com `← pronto` em cima;
3. `← pronto` → volta para a visualização;
4. estando no editor, usar a seta `→` do topo → o dia seguinte abre na **visualização**;
5. marcar uma caixinha → o nome risca e fica no lugar;
6. F5 → a caixinha continua marcada (prova que `done` foi ao banco e voltou pelo normalizador);
7. dois navegadores: marcar num e ver riscar no outro sem F5;
8. num iframe de 360px: sem rolagem horizontal, e a caixinha com 24px.

- [ ] **Passo 5: commit**

```bash
git add src/screens/ src/app/extras.css
git commit -m "Roteiro: clicar num dia mostra o itinerario, e editar fica atras de um botao"
```

---

# Tarefa 8 — o dinheiro do `day_item` nas contas

**Files:**
- Modify: `src/lib/calc.ts`, `scripts/check.mjs`
- Test: `tests/calc.test.mjs`

**Interfaces:**
- Consumes: `Snapshot.dayItems`.
- Produces: `dayItemEur(s): number`, `dayItemBrl(s): number` em `calc.ts`, somados em `totalBrl`.

- [ ] **Passo 1: escrever o teste que falha**

Em `tests/calc.test.mjs`, acrescentar `dayItems: []` ao `snapshotDoLeo()` e ao fim do arquivo:

```js
/**
 * O item livre entra no total da viagem.
 *
 * Ele escolheu que o item que escreve no dia tem valor e moeda. A hora de
 * ligar isso na conta e AGORA, quando ainda nao existe nenhum: se ficar
 * para a etapa 2, o formulario nasce guardando dinheiro que nao soma em
 * lugar nenhum, e a diferenca so aparece quando o total nao bater com o que
 * ele lembra ter lancado.
 */
test('11.7 — o item livre do dia entra no total da viagem', () => {
  const antes = C.totalBrl(S, CIDADES_STAY);

  const s2 = structuredClone(S);
  s2.dayItems = [
    { id: 'd1', day_iso: '2026-12-16', name: 'Presente', note: '',
      amount: 40, currency: 'eur', day_pos: 0, done: false },
    { id: 'd2', day_iso: '2026-12-16', name: 'Lavanderia', note: '',
      amount: 35, currency: 'brl', day_pos: 1, done: false },
  ];
  assert.equal(C.dayItemEur(s2), 40);
  assert.equal(C.dayItemBrl(s2), 35);
  assert.equal(
    Math.round(C.totalBrl(s2, CIDADES_STAY)),
    Math.round(antes + 40 * C.rate(s2) + 35),
    'euro vira real pelo cambio; real entra direto',
  );
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test 2>&1 | grep -A5 "item livre do dia"`
Expected: FAIL — `C.dayItemEur is not a function`.

- [ ] **Passo 3: ligar na conta**

Em `src/lib/calc.ts`, ao lado de `extraEur`/`extraBrl`:

```ts
/**
 * O item que ele escreve dentro de um dia (`day_item`), somado.
 *
 * ENTRA no total da viagem e NAO entra na aba Custos — decisao registrada
 * na spec: aparecer nos dois lugares seria dois lugares para mexer no mesmo
 * dinheiro, e na primeira vez que discordassem ninguem saberia qual esta
 * certo. O item se edita so dentro do dia.
 *
 * A moeda padrao e EURO, como em transporte (regra 5.11).
 */
export const dayItemEur = (s: Snapshot) =>
  s.dayItems.reduce((a, x) => (x.currency !== 'brl' ? a + num(x.amount) : a), 0);
export const dayItemBrl = (s: Snapshot) =>
  s.dayItems.reduce((a, x) => (x.currency === 'brl' ? a + num(x.amount) : a), 0);
```

E dentro de `totalBrl`, acrescentar `dayItemEur(s)` ao parêntese que multiplica pelo câmbio, e `dayItemBrl(s)` fora dele:

```ts
export function totalBrl(s: Snapshot, cities: string[]): number {
  const x = legSum(s, '');
  return (
    VOO +
    (attrEurAll(s, 'roteiro') + stayTotalAll(s, cities) + extraEur(s)
      + dayItemEur(s) + x.eur) * rate(s) +
    extraBrl(s) + dayItemBrl(s) +
    x.brl +
    bookingBrl(s, '')
  );
}
```

**`pagoBrl` NÃO muda.** `day_item` não tem marcador de pago — `done` é "eu fiz", não "eu paguei". Item livre entra como previsto, igual a transporte não comprado.

- [ ] **Passo 4: o aceite novo**

Em `scripts/check.mjs`, depois de `const extra = await g('extra');`:

```js
// Fase 7: o item que ele escreve dentro de um dia. Entra no total da viagem
// e nao aparece na aba Custos.
const dayItem = await g('day_item').catch(() => []);
```

E junto das outras linhas de aceite:

```js
const diEur = dayItem.filter((r) => r.currency !== 'brl').reduce((a, r) => a + num(r.amount), 0);
const diBrl = dayItem.filter((r) => r.currency === 'brl').reduce((a, r) => a + num(r.amount), 0);
linha(true, 'itens escritos no dia', '(retrato)', `${dayItem.length} · ${eur(diEur)} + ${brl(diBrl)}`);
```

`linha(true, ...)` porque é **retrato**, não número fixo: ele vai criar itens e o número muda. O que o aceite prova é que o `check` **lê** a tabela — se ela sumir do select, o total do check e o da tela divergem em silêncio, que é a "segunda cópia da fórmula" que já mordeu na Fase 3.

O `.catch(() => [])` é de propósito: antes de ele rodar a migração a tabela não existe, e o `check` não pode quebrar por isso.

- [ ] **Passo 5: rodar e ver passar**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "item livre|pass |fail " && npm run check 2>&1 | tail -4`
Expected: PASS, `fail 0`, e `todos os numeros de aceite bateram`.

- [ ] **Passo 6: commit**

```bash
git add src/lib/calc.ts scripts/check.mjs tests/calc.test.mjs
git commit -m "O item livre do dia entra no total da viagem, e o check passa a ler a tabela"
```

---

# Tarefa 9 — o chip `hoje` e o "N de M feitas" na lista de blocos

**Files:**
- Modify: `src/screens/Roteiro.tsx`
- Test: `tests/calc.test.mjs`

**Interfaces:**
- Consumes: `feitasDoDia` de `@/lib/dia` (`import * as D from '@/lib/dia';` no topo de `Roteiro.tsx`, que ainda nao o tem); `s.hoje` do Snapshot.
- Produces: nada que outra tarefa use.

- [ ] **Passo 1: escrever o teste que falha**

Em `tests/calc.test.mjs`:

```js
/**
 * O chip `hoje` so pode aparecer durante a viagem. Fora dela ele apontaria
 * para um dia que nao existe na lista, e clicar nao faria nada — um botao
 * morto na tela principal.
 */
test('o chip hoje so existe se hoje cair dentro dos 34 dias', () => {
  assert.equal(ISOS.includes('2026-09-06'), false, 'hoje, na vida real, e antes da viagem');
  assert.equal(ISOS.includes('2026-12-16'), true);
  assert.equal(ISOS.includes('2027-02-01'), false, 'depois da viagem tambem nao');
});
```

- [ ] **Passo 2: rodar e ver passar (este confirma a premissa, não a implementação)**

Run: `npm test 2>&1 | grep -E "chip hoje|pass |fail "`
Expected: PASS. Este teste tranca a **regra**; a tela é conferida no Passo 4.

- [ ] **Passo 3: a tela**

Em `src/screens/Roteiro.tsx`, na `div.chips` que já tem `← dia anterior | ver o roteiro inteiro | próximo dia →`, acrescentar **antes** do "ver o roteiro inteiro":

```tsx
{/* So durante a viagem: fora dela, `s.hoje` nao esta nos 34 dias e o
    botao apontaria para lugar nenhum. Nao troca o dia sozinho — se ele
    fechou o app planejando o dia 20, reabrir no dia 20 e o certo. */}
{ISOS.includes(s.hoje) ? (
  <button
    className="chip"
    aria-pressed={selDay === s.hoje ? true : undefined}
    onClick={() => irParaDia(s.hoje)}
  >
    hoje
  </button>
) : null}
```

E em `DiaLinha`, depois do `<DiaTags iso={iso} />`:

```tsx
{(() => {
  const { feitas, total } = D.feitasDoDia(s, iso);
  return total ? <div className="dfeitas">{feitas} de {total} feitas</div> : null;
})()}
```

Acrescentar ao fim de `src/app/extras.css`:

```css
.dfeitas { font-family: var(--mono); font-size: 10.5px; color: var(--muted);
  letter-spacing: .08em; margin-top: 4px; }
```

- [ ] **Passo 4: provar na tela**

Run: `npx tsc --noEmit && npm test 2>&1 | grep -E "pass |fail " && npm run build 2>&1 | grep "Compiled successfully"`

Com `npm run dev`: o chip `hoje` **não** aparece (a viagem é em dezembro). Para provar que ele funciona, trocar temporariamente `s.hoje` por `'2026-12-16'` no console (`window.__s`) ou conferir a condição lendo o código — e **desfazer**. Marcar uma caixinha num dia e conferir que a lista de blocos passa a dizer "1 de 3 feitas".

- [ ] **Passo 5: commit**

```bash
git add src/screens/Roteiro.tsx src/app/extras.css tests/calc.test.mjs
git commit -m "Roteiro: o chip hoje, e o quanto do dia ja foi feito na lista de blocos"
```

---

# Tarefa 10 — a documentação, e publicar

**Files:**
- Modify: `COMO-MEXER.md`, `ESPECIFICACAO.md`, `docs/2026-09-06-lista-do-leo.md`

- [ ] **Passo 1: a seção 0 do `COMO-MEXER`**

Acrescentar o item 11 à tabela de mudanças; acrescentar `10-o-dia-em-ordem` à lista de SQL que ele rodou; atualizar o mapa de arquivos (`Roteiro.tsx` encolhe, nascem `roteiro/Vista.tsx`, `roteiro/Editor.tsx` e `lib/dia.ts`); e acrescentar às armadilhas:

> - **Quatro tabelas dividindo um espaço de numeração empatam por padrão.** Todo item do dia nasce com `day_pos = 0`. Sem desempate fixo (`day_pos`, depois a origem, depois o id), a lista sai numa ordem no navegador dele e noutra no da Lu. `src/lib/dia.ts` faz isso e `tests/dia.test.mjs` prova com a mesma entrada embaralhada.
> - **Tela que não pode ser editada precisa ser tela sem campo.** A visualização do dia tem exatamente dois elementos clicáveis: a caixinha e o `editar`. Qualquer campo de texto que entre ali vira um toque acidental no metrô.

- [ ] **Passo 2: a `ESPECIFICACAO`, seção 10.2**

Reescrever a descrição do Roteiro: as três partes viram quatro (calendário, blocos, **visualização do dia**, editor do dia), com a regra de que clicar mostra e o botão edita, e a nota da ordem que só chega na etapa 2.

- [ ] **Passo 3: `docs/2026-09-06-lista-do-leo.md`**

Acrescentar o item 11 com a fala dele e o que foi decidido, apontando para a spec.

- [ ] **Passo 4: a prova final**

Run: `npx tsc --noEmit && npm test && npm run check && npm run build`
Expected: tudo verde.

- [ ] **Passo 5: commit e publicar**

```bash
git add -A
git commit -m "COMO-MEXER, ESPECIFICACAO e a lista: o Roteiro com visualizacao do dia"
git push origin main
```

Depois do push, conferir **no site publicado** (não no local): clicar num dia mostra a visualização, marcar uma caixinha, dar F5 e ver que continuou marcada.

---

## O que este plano NÃO faz

É a **etapa 1**. Fora daqui, por decisão registrada na spec:

- **as setas de ordem** e a lista junta ordenável — etapa 2;
- **o formulário do item livre** (escrever, valor, moeda) — etapa 2. A tabela existe e as contas já somam, mas não há tela para criar um;
- **os quatro cartões virarem só seletores** — etapa 2;
- **hora nos itens**, modo global ver/editar, arrastar para ordenar, item livre na aba Custos — fora de escopo por escolha dele.
