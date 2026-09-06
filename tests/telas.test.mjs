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
