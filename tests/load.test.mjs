// ============================================================
// O mapeamento coluna->campo dos normalizadores de src/lib/load.ts.
//
// `mesclar`/`aplicarRemoto` (tests/merge.test.mjs) fazem spread cru: um
// campo novo atravessa o tempo real sozinho, sem precisar de teste algum.
// O normalizador e o OUTRO caminho — ele monta o objeto campo a campo, e
// e o unico lugar onde grudar a coluna errada (ex.: `day_pos: Number(r.
// position ?? 0)`) compila limpo, porque os dois lados sao `number`, e
// nenhum outro teste pega. Estes testes conferem CADA campo, um por um,
// contra uma linha crua no formato que o PostgREST devolve.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normAttr, normFood, normLeg } from '@/lib/load.ts';

test('normAttr: cada campo vem da coluna certa', () => {
  const a = normAttr({
    id: 'a1', city: 'lisboa', name: 'Torre de Belém',
    price_eur: '15.50',           // numeric chega como string do PostgREST
    note: 'ver por fora', status: 'escolhida', kind: 'passeio',
    day_iso: '2026-12-12',
    paid: false, done: true,      // valores DIFERENTES de proposito
    seed_id: 'm:lisboa:7',
    day_pos: 3,
  });
  assert.equal(a.id, 'a1');
  assert.equal(a.city, 'lisboa');
  assert.equal(a.name, 'Torre de Belém');
  assert.equal(a.price_eur, 15.5);
  assert.equal(a.note, 'ver por fora');
  assert.equal(a.status, 'escolhida');
  assert.equal(a.kind, 'passeio');
  assert.equal(a.day_iso, '2026-12-12');
  assert.equal(a.seed_id, 'm:lisboa:7');
  assert.equal(a.day_pos, 3, 'day_pos e a ordem DENTRO do dia');
  // paid e done sao coisas diferentes ("eu paguei" x "eu fiz"): com valores
  // opostos, um teste que os trocasse ficaria evidente.
  assert.equal(a.paid, false, 'paid e "eu paguei"');
  assert.equal(a.done, true, 'done e "eu fiz", nao e paid');
});

test('normFood: cada campo vem da coluna certa (o Minor #1 da revisao: food tambem)', () => {
  const f = normFood({
    id: 'f1', country: 'pt', name: 'Pastel de nata',
    note: 'na Manteigaria', kind: 'prato',
    day_iso: '2026-12-12', seed_id: 'f:pt:0',
    day_pos: 2, done: true,
  });
  assert.equal(f.id, 'f1');
  assert.equal(f.country, 'pt');
  assert.equal(f.name, 'Pastel de nata');
  assert.equal(f.note, 'na Manteigaria');
  assert.equal(f.kind, 'prato');
  assert.equal(f.day_iso, '2026-12-12');
  assert.equal(f.seed_id, 'f:pt:0');
  assert.equal(f.day_pos, 2, 'day_pos e a ordem DENTRO do dia');
  assert.equal(f.done, true);
});

/**
 * O caso que mais importa. `leg` tem DUAS colunas de ordem: `position`
 * (a sequencia da VIAGEM INTEIRA, usada pela aba Transporte) e `day_pos`
 * (a ordem DENTRO do dia, nova). Os dois sao `number` — se o normalizador
 * ligar `day_pos` na coluna `position` (ou vice-versa), o `tsc` nao acusa
 * nada, porque os tipos batem.
 *
 * Por isso os dois valores do fixture sao DIFERENTES DE PROPOSITO (99 e
 * 3): com o mesmo valor nos dois, um normalizador com as colunas trocadas
 * passaria no teste do mesmo jeito. So com valores diferentes um `assert`
 * separado por campo denuncia a troca.
 */
test('normLeg: position (viagem) e day_pos (dia) nao se confundem', () => {
  const l = normLeg({
    id: 't1', position: 99, name: 'Madrid → Cáceres',
    note: '3h07', kind: 'trem',
    amount: '35.00',              // numeric chega como string do PostgREST
    currency: 'eur',
    bought: false, done: true,    // valores DIFERENTES de proposito
    day_iso: '2026-12-12', seed_id: 't:0',
    day_pos: 3,
  });
  assert.equal(l.id, 't1');
  assert.equal(l.position, 99, 'position e a ordem da VIAGEM');
  assert.equal(l.day_pos, 3, 'day_pos e a ordem DENTRO do dia');
  assert.equal(l.name, 'Madrid → Cáceres');
  assert.equal(l.note, '3h07');
  assert.equal(l.kind, 'trem');
  assert.equal(l.amount, 35);
  assert.equal(l.currency, 'eur');
  assert.equal(l.day_iso, '2026-12-12');
  assert.equal(l.seed_id, 't:0');
  // bought e done sao coisas diferentes ("eu paguei" x "eu fiz"): com
  // valores opostos, uma troca das duas colunas ficaria evidente.
  assert.equal(l.bought, false, 'bought e "eu paguei"');
  assert.equal(l.done, true, 'done e "eu fiz", nao e bought');
});
