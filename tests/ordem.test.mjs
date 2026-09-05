// ============================================================
// Subir e descer trecho e item de burocracia. A ordem E a
// sequencia da viagem (secao 10.5), entao ela nao pode embaralhar
// nem empatar duas linhas no mesmo numero.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mover, podeMover } from '@/lib/ordem.ts';
import { porPosicao } from '@/lib/calc.ts';
import { escHtml, stripTags } from '@/lib/fmt.ts';

const lista = (...pos) => pos.map((p, i) => ({ id: 'abcdefgh'[i], position: p }));

/** Aplica o que `mover` mandou escrever e devolve a ordem final. */
function aplicar(l, escritas) {
  const m = new Map(escritas.map((e) => [e.id, e.position]));
  return [...l]
    .map((x) => ({ ...x, position: m.has(x.id) ? m.get(x.id) : x.position }))
    .sort((a, b) => a.position - b.position)
    .map((x) => x.id);
}

test('descer troca com o vizinho de baixo, e so escreve dois', () => {
  const l = lista(0, 1, 2, 3);
  const e = mover(l, 'b', 1);
  assert.equal(e.length, 2, 'so as duas linhas que trocaram');
  assert.deepEqual(aplicar(l, e), ['a', 'c', 'b', 'd']);
});

test('subir e o espelho', () => {
  const l = lista(0, 1, 2, 3);
  assert.deepEqual(aplicar(l, mover(l, 'c', -1)), ['a', 'c', 'b', 'd']);
});

test('a ponta nao se mexe, e a seta apaga', () => {
  const l = lista(0, 1, 2);
  assert.deepEqual(mover(l, 'a', -1), [], 'o primeiro nao sobe');
  assert.deepEqual(mover(l, 'c', 1), [], 'o ultimo nao desce');
  assert.equal(podeMover(l, 'a', -1), false);
  assert.equal(podeMover(l, 'a', 1), true);
  assert.equal(podeMover(l, 'c', 1), false);
  assert.equal(podeMover(l, 'b', -1), true);
});

test('id que nao existe nao escreve nada', () => {
  assert.deepEqual(mover(lista(0, 1), 'z', 1), []);
});

test('lista com buraco se conserta no primeiro movimento', () => {
  // apagar do meio deixa 0, 5, 9 — mover renumera para 0,1,2
  const l = lista(0, 5, 9);
  const e = mover(l, 'a', 1);
  assert.deepEqual(aplicar(l, e), ['b', 'a', 'c']);
  const fim = [...l].map((x) => {
    const m = e.find((y) => y.id === x.id);
    return m ? m.position : x.position;
  });
  assert.deepEqual([...fim].sort((x, y) => x - y), [0, 1, 2], 'numeracao volta a ser 0..n-1');
});

test('duas linhas empatadas se separam, em vez de travar para sempre', () => {
  // trocar so os dois numeros deixaria 3 e 3 empatados de novo
  const l = lista(3, 3, 7);
  const e = mover(l, l[1].id, 1);
  const fim = aplicar(l, e);
  assert.equal(new Set(fim).size, 3, 'ninguem some');
  const nums = [...l].map((x) => (e.find((y) => y.id === x.id) ?? x).position);
  assert.equal(new Set(nums).size, 3, 'nenhum numero repetido no fim');
});

test('mover nao mexe na lista que recebeu', () => {
  const l = lista(0, 1, 2);
  const copia = JSON.parse(JSON.stringify(l));
  mover(l, 'a', 1);
  assert.deepEqual(l, copia);
});

// ---------------- desempate: empatado e feio, divergente e mentira ----------------
test('duas linhas com a MESMA position saem na mesma ordem em qualquer tela', () => {
  // e o que sobra quando os dois clicam a seta no mesmo instante
  const a = { id: 'zzz', position: 2 };
  const b = { id: 'aaa', position: 2 };
  const c = { id: 'mmm', position: 0 };
  const ordem = (l) => [...l].sort(porPosicao).map((x) => x.id);
  // a mesma lista, embaralhada de tres jeitos, sai igual nos tres
  assert.deepEqual(ordem([a, b, c]), ['mmm', 'aaa', 'zzz']);
  assert.deepEqual(ordem([c, a, b]), ['mmm', 'aaa', 'zzz']);
  assert.deepEqual(ordem([b, c, a]), ['mmm', 'aaa', 'zzz']);
});

test('sem empate, porPosicao e so a position', () => {
  const l = [{ id: 'z', position: 1 }, { id: 'a', position: 0 }];
  assert.deepEqual([...l].sort(porPosicao).map((x) => x.id), ['a', 'z']);
});

// ---------------- a nota do usuario nao pode sumir ----------------
test("'<' sem '>' atravessa o stripTags — por isso a nota nao vai crua para HTML", () => {
  const nota = 'confirmar <ver e-mail da CP';
  // stripTags NAO limpa isso: a regex dele exige o '>' de fechamento
  assert.equal(stripTags(nota), nota, 'passa inteiro, e e por isso que o escape existe');
  // escapado, o texto sobrevive inteiro dentro de um innerHTML
  assert.equal(escHtml(nota), 'confirmar &lt;ver e-mail da CP');
});

test('escHtml cobre os quatro que importam, e nao mexe no resto', () => {
  assert.equal(escHtml('a & b'), 'a &amp; b');
  assert.equal(escHtml('<b>oi</b>'), '&lt;b&gt;oi&lt;/b&gt;');
  assert.equal(escHtml('diz "oi"'), 'diz &quot;oi&quot;');
  assert.equal(escHtml('menos de 1h30 — só 3 por dia'), 'menos de 1h30 — só 3 por dia');
  assert.equal(escHtml(''), '');
  assert.equal(escHtml(null), '', 'nota vazia nao vira "null" na tela');
  assert.equal(escHtml(undefined), '');
  // o & vai primeiro, senao o &lt; seria re-escapado para &amp;lt;
  assert.equal(escHtml('<'), '&lt;');
  assert.equal(escHtml('&lt;'), '&amp;lt;');
});
