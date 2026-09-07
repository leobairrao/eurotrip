// ============================================================
// A higiene das TELAS, lida no proprio codigo-fonte.
//
// Por que um teste que le texto em vez de rodar funcao: o defeito que
// derrubou o app em 05/09 nao estava em formula nenhuma. `calc.ts` ja
// tratava a cidade criada pelo Leo do jeito certo, e ate havia teste
// verde provando isso — mas TRES telas perguntavam direto a `CT`, a
// lista das 11 cidades fixas, e `CT['teste'].n` num nome que ela nao
// tem e TypeError. Tela nao se testa com `node --test` neste projeto
// (nao ha React aqui dentro), entao o que da para provar e a REGRA:
// nenhuma tela indexa `CT` sem rede.
//
// Ele criou uma cidade chamada "teste" e o app foi ao chao duas vezes
// em cinco minutos, com "Application error" em ingles e nada mais.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { TK, TKPL, TKE, TKORD, ATR_SUG, HOSP_SUG, TRANSP_SUG, SUGGRES, FOOD } from '@/content/index.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Todo .tsx de tela e de componente — onde o JSX mora. */
function arquivosDeTela() {
  const out = [];
  for (const pasta of ['src/screens', 'src/components']) {
    for (const f of readdirSync(join(RAIZ, pasta))) {
      if (f.endsWith('.tsx')) out.push(join(pasta, f));
    }
  }
  return out;
}

/**
 * `CT[...]` seguido de `.` — o jeito que estoura.
 *
 * `CT[k] ?? ...` e `CT[k]?.n` continuam permitidos: os dois tem rede.
 * Quem quiser o nome ou o pais de uma cidade numa tela usa
 * `C.nomeCidade(s, k)` / `C.paisDaCidade(s, k)`, que olham tambem as
 * cidades que ele criou.
 */
const CRU = /\bCT\[[^\]]+\]\s*\./;

test('nenhuma tela indexa CT[...] cru — foi assim que uma cidade nova derrubou o app', () => {
  const achados = [];
  for (const rel of arquivosDeTela()) {
    const linhas = readFileSync(join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return;
      if (CRU.test(l)) achados.push(`${rel}:${i + 1}  ${l.trim()}`);
    });
  }
  assert.deepEqual(
    achados,
    [],
    `Tela indexando CT direto. Troque por C.nomeCidade(s, k) / C.paisDaCidade(s, k) / C.ccCidade(s, k):\n${achados.join('\n')}`,
  );
});

test('a rede embaixo do app existe — error.tsx e global-error.tsx', () => {
  // Sem eles, qualquer tropeco de tela vira "Application error: a
  // client-side exception has occurred", em ingles, sem botao e sem
  // pista. Foi o que ele viu duas vezes.
  for (const f of ['src/app/error.tsx', 'src/app/global-error.tsx']) {
    const src = readFileSync(join(RAIZ, f), 'utf8');
    assert.ok(src.startsWith("'use client'"), `${f} tem que ser client component`);
    assert.ok(/export default function/.test(src), `${f} precisa exportar o componente`);
    assert.ok(/reset/.test(src), `${f} precisa oferecer o "tentar de novo"`);
  }
});

/**
 * Toda grade de formulario de acrescentar tem que virar coluna unica no celular.
 *
 * As `.addrow.<sigla>` sao grades em px com aritmetica justa. Cada uma delas
 * PRECISA de um par dentro de um `@media (max-width: ...)` que a devolva para
 * `1fr`; sem isso, a linha nao cabe num aparelho de 360 e o app anda para o
 * lado. Hoje todas tem — mas so porque quem escreveu lembrou. Em 06/09, ao
 * criar a `.fo3` de Comidas, eu lembrei; nada me obrigava.
 *
 * Este teste faz a obrigacao existir.
 */
function grades(css) {
  const fora = new Map();   // sigla -> linha, definidas FORA de @media
  const dentro = new Set(); // siglas citadas DENTRO de um @media (max-width)
  let profundidadeMedia = 0;
  let dentroDeMedia = false;
  css.split('\n').forEach((l, i) => {
    if (/@media[^{]*max-width/.test(l)) { dentroDeMedia = true; profundidadeMedia = 0; }
    for (const ch of l) {
      if (ch === '{') profundidadeMedia++;
      if (ch === '}') { profundidadeMedia--; if (dentroDeMedia && profundidadeMedia <= 0) dentroDeMedia = false; }
    }
    for (const m of l.matchAll(/\.addrow\.([a-z0-9]+)/g)) {
      const sigla = m[1];
      if (dentroDeMedia) dentro.add(sigla);
      else if (/grid-template-columns/.test(l) && !fora.has(sigla)) fora.set(sigla, i + 1);
    }
  });
  return { fora, dentro };
}

test('toda grade .addrow tem o par que vira coluna unica no celular', () => {
  const arquivos = ['src/app/estilo-atual.css', 'src/app/extras.css'];
  const fora = new Map();
  const dentro = new Set();
  for (const f of arquivos) {
    const g = grades(readFileSync(join(RAIZ, f), 'utf8'));
    for (const [k, linha] of g.fora) if (!fora.has(k)) fora.set(k, `${f}:${linha}`);
    for (const k of g.dentro) dentro.add(k);
  }
  const orfas = [...fora].filter(([sigla]) => !dentro.has(sigla)).map(([s, onde]) => `${s} (${onde})`);
  assert.deepEqual(
    orfas,
    [],
    `Grade de formulario sem colapso no celular. Ponha a sigla na lista do @media (max-width: 700px):\n${orfas.join('\n')}`,
  );
});

/**
 * Nenhuma tela pode ler `AKE[...]` direto.
 *
 * Desde 06/09 o tema da atracao e TEXTO LIVRE, entao `AKE['museu']` e
 * `undefined` — e `{undefined} {nome}` no JSX nao quebra nada: desenha um
 * espaco solto antes do nome e segue. Eram QUATRO lugares (tres no Roteiro,
 * um em Atracoes), e nenhum deles daria erro de build, de teste ou de tela.
 *
 * `akEmoji(kind)` tem a saida `?? '📍'`. Este teste faz usar ela ser
 * obrigatorio, do mesmo jeito que o teste do `CT[...]` cru.
 *
 * `AKE.passeio` e `AKE.tour` continuam permitidos: sao as duas chaves que
 * existem de verdade, e a legenda do Roteiro as escreve na mao.
 */
const AKE_CRU = /\bAKE\[[^\]]+\]/;

test('nenhuma tela le AKE[...] direto — tema livre nao tem emoji proprio', () => {
  const achados = [];
  for (const rel of arquivosDeTela()) {
    const linhas = readFileSync(join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return;
      if (AKE_CRU.test(l)) achados.push(`${rel}:${i + 1}  ${l.trim()}`);
    });
  }
  assert.deepEqual(
    achados,
    [],
    `Tela lendo AKE direto. Troque por akEmoji(kind), de @/content:\n${achados.join('\n')}`,
  );
});

/**
 * Um tipo de transporte novo precisa de OITO lugares, nao de um.
 *
 * Descoberto ao por o metro em 06/09: o tipo (`types.ts`), tres dicionarios
 * (`TK`, `TKPL`, `TKE`), a ordem (`TKORD`), a trava do banco (`leg_kind_check`)
 * e tres regras de CSS (a barra da linha, a etiqueta do dia, a cor do texto).
 * Faltar qualquer uma NAO da erro de build: da um transporte sem emoji, ou sem
 * cor, ou que a tela oferece e o banco recusa.
 *
 * O nono lugar deixou de existir: `identidade.css` listava os quatro tipos para
 * apagar a barra antiga, e agora usa `[class*="tk-"]`. Lista em CSS e lista para
 * esquecer.
 */
test('todo tipo de transporte tem os oito lugares preenchidos', () => {
  const css = ['src/app/estilo-atual.css', 'src/app/extras.css']
    .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n');
  const schema = ['supabase/01-schema.sql', 'supabase/00-tudo.sql']
    .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n');
  const tipoTs = readFileSync(join(RAIZ, 'src/lib/types.ts'), 'utf8');
  const linhaDaTrava = schema.split('\n').filter((l) => /kind in \('trem'/.test(l));

  const faltando = [];
  for (const k of Object.keys(TK)) {
    if (!TKPL[k]) faltando.push(`${k}: sem plural em TKPL (content/index.ts)`);
    if (!TKE[k]) faltando.push(`${k}: sem emoji em TKE (content/index.ts)`);
    if (TKORD[k] === undefined) faltando.push(`${k}: sem ordem em TKORD (content/index.ts)`);
    if (!new RegExp(`LegKind[^;]*'${k}'`, 's').test(tipoTs)) faltando.push(`${k}: fora do tipo LegKind (lib/types.ts)`);
    if (!css.includes(`.mrow.tr5.tk-${k}`)) faltando.push(`${k}: sem a barra da linha (.mrow.tr5.tk-${k})`);
    if (!css.includes(`.dtg.tk-${k}`)) faltando.push(`${k}: sem a cor da etiqueta do dia (.dtg.tk-${k})`);
    if (!css.includes(`.stg.tkc-${k}`)) faltando.push(`${k}: sem a cor do texto (.stg.tkc-${k})`);
    // a trava do banco: as duas copias do esquema tem que aceitar o tipo
    const emTodas = linhaDaTrava.length > 0 && linhaDaTrava.every((l) => l.includes(`'${k}'`));
    if (!emTodas) faltando.push(`${k}: o banco RECUSA — falta em leg_kind_check (supabase/01-schema.sql e 00-tudo.sql)`);
  }
  assert.deepEqual(faltando, [], `Tipo de transporte pela metade:\n${faltando.join('\n')}`);
});

/**
 * Nenhuma lista de sugestao pode ter chave que nao seja lista.
 *
 * Os JSONs de pesquisa carregam uma chave `_` no topo, com a PROSA que
 * explica o arquivo. `hospedagens-sugeridas.json` tem; `atracoes-sugeridas`
 * nao. Quem varre as cidades e faz `.map` na chave `_` recebe uma string e
 * quebra a tela inteira — aconteceu em 06/09, no primeiro minuto da aba
 * Sugestoes, e a rede do error.tsx foi quem segurou.
 */
test('as listas de sugestao nao escondem chave de comentario', () => {
  const ruins = [];
  for (const [nome, mapa] of [['ATR_SUG', ATR_SUG], ['HOSP_SUG', HOSP_SUG]]) {
    for (const [k, v] of Object.entries(mapa)) {
      if (!Array.isArray(v)) ruins.push(`${nome}['${k}'] nao e lista, e ${typeof v}`);
    }
  }
  for (const [nome, lista] of [['TRANSP_SUG', TRANSP_SUG], ['SUGGRES', SUGGRES], ['FOOD', FOOD]]) {
    if (!Array.isArray(lista)) ruins.push(`${nome} devia ser lista`);
  }
  assert.deepEqual(ruins, [], `Sugestao com chave que nao e lista:\n${ruins.join('\n')}`);
});

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
