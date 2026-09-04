// ============================================================
// Prova as formulas da secao 11 contra os numeros que o usuario
// espera ver — rodando o codigo de producao (src/lib/calc.ts),
// sobre o estado real de dados/estado-atual-do-leo.json.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as C from '@/lib/calc.ts';
import { num, brl, eur, saveMonths, plMes, plMesV, norm, stripTags, inputNum, parseNum } from '@/lib/fmt.ts';
import { ISOS, STAYS, VOO, ESTIM_EUR, CO, CT, FOOD } from '@/content/index.ts';

const ST = { esc: 'escolhida', bac: 'backlog', sug: 'sugerida' };
const FKD = { pr: 'prato', rest: 'restaurante', cafe: 'cafe' };
const CIDADES_STAY = STAYS.map((s) => s.c);

/** Monta o Snapshot a partir do estado real dele, do mesmo jeito que o import faz. */
function snapshotDoLeo() {
  const S = JSON.parse(readFileSync(new URL('../dados/estado-atual-do-leo.json', import.meta.url), 'utf8'));
  const days = {};
  for (const [iso, d] of Object.entries(S.days)) days[iso] = { iso, base: d.c ?? '', plan: d.p ?? '' };

  const attractions = [];
  for (const [city, itens] of Object.entries(S.mine))
    for (const it of itens)
      attractions.push({
        id: it.id, city, name: it.n,
        price_eur: num(it.pr), note: it.w ?? '',
        status: ST[it.st] ?? 'backlog',
        kind: it.k === 'tour' ? 'tour' : 'passeio',
        day_iso: it.day && it.day.trim() ? it.day : null,
        seed_id: it.sid ?? null,
      });

  const foods = [];
  for (const [country, itens] of Object.entries(S.foods))
    itens.forEach((it, i) => {
      const kind = FKD[it.k] ?? 'prato';
      foods.push({
        id: it.id, country, name: it.n, note: it.w ?? '', kind,
        day_iso: kind !== 'prato' && it.day && it.day.trim() ? it.day : null,
        seed_id: `f:${country}:${i}`,
      });
    });

  const legs = S.tr.map((t, i) => ({
    id: t.id, position: i, name: t.n, note: t.w ?? '',
    kind: t.k ?? 'trem',
    amount: t.v && String(t.v).trim() ? num(t.v) : null,
    currency: t.m === 'brl' ? 'brl' : 'eur',
    bought: !!t.ok,
    day_iso: t.day && t.day.trim() ? t.day : null,
    seed_id: t.sid ?? null,
  }));

  const bookings = S.res.map((r, i) => ({
    id: r.id, position: i, name: r.n, note: r.w ?? '',
    amount: r.v && String(r.v).trim() ? num(r.v) : null,
    currency: r.m === 'eur' ? 'eur' : 'brl',
    done: !!S.resdone[r.id],
    seed_id: null,
  }));

  const stays = {};
  for (const c of CIDADES_STAY)
    stays[c] = { city: c, address: '', check_in: '', check_out: '', nightly_eur: null, nights: null, total_eur: null, link: '', notes: '' };

  return {
    days, attractions, foods, legs, bookings, stays,
    extras: [],
    settings: { id: 1, eur_rate: num(S.rate), flight_paid_brl: VOO },
    killed: Object.keys(S.killed ?? {}),
    adopted: Object.keys(S.adopted ?? {}),
    mySavings: { who: 'leo', goal: null, opening: null, currency: 'brl' },
    myContributions: {},
    geral: { opening_brl: 0, goal_brl: 0, contrib_brl: 0, months: {} },
    me: { id: 'x', email: 'leo@x', who: 'leo' },
  };
}

const S = snapshotDoLeo();

// ---------------- os tres numeros de aceite (secao 12.3) ----------------
test('12.3 — 8 atracoes escolhidas, todas de Lisboa', () => {
  const esc = S.attractions.filter((a) => a.status === 'escolhida');
  assert.equal(esc.length, 8);
  assert.deepEqual([...new Set(esc.map((a) => a.city))], ['lisboa']);
  assert.equal(C.attrCount(S, 'escolhida'), 8);
});

test('12.3 — total ja pago = R$ 5.337 (voo + passaporte)', () => {
  assert.equal(brl(C.pagoBrl(S)), 'R$ 5.337');
  assert.equal(Math.round(C.pagoBrl(S) * 100) / 100, 5337.02);
});

test('12.3 — cambio 6,20', () => {
  assert.equal(C.rate(S), 6.2);
});

// ---------------- 11.2 noites nao sao dias (regra 5.1) ----------------
test('11.2 — 8 bases, 31 noites, 32 dias em terra + 2 de voo = 34', () => {
  const bases = C.baseList(S);
  assert.equal(bases.length, 8, '8 linhas na tabela do roteiro');
  assert.equal(C.nightsAll(S), 31);
  assert.equal(C.groundDays(S), 32);
  assert.equal(C.flyDays(S), 2);
  assert.equal(C.groundDays(S) + C.flyDays(S), 34);
  // a ULTIMA base perde uma noite: o voo de volta sai 23h35
  const ult = bases[bases.length - 1];
  assert.equal(ult.d, 2);
  assert.equal(ult.nt, 1);
});

test('11.2 — "em transito" nao e base', () => {
  assert.equal(C.blocks(S).length, 10);      // 8 bases + 2 blocos de transito
  assert.ok(!C.baseList(S).some((b) => /trânsito/i.test(b.base)));
});

test('ISOS tem os 34 dias, de 10/12/2026 a 12/01/2027', () => {
  assert.equal(ISOS.length, 34);
  assert.equal(ISOS[0], '2026-12-10');
  assert.equal(ISOS[33], '2027-01-12');
});

// ---------------- 11.3 progresso ----------------
test('11.3 — a base sozinha NAO e plano (regra 5.4)', () => {
  assert.equal(C.filledDays(S), 0, 'os 34 dias comecam sem plano, so com base');
  const s2 = structuredClone(S);
  s2.days['2026-12-12'].plan = 'andar pela Baixa';
  assert.equal(C.filledDays(s2), 1, 'texto dele conta');
  const s3 = structuredClone(S);
  s3.attractions.find((a) => a.city === 'lisboa').day_iso = '2026-12-12';
  assert.equal(C.filledDays(s3), 1, 'atracao marcada conta');
  const s4 = structuredClone(S);
  s4.foods.find((f) => f.kind === 'restaurante').day_iso = '2026-12-16';
  assert.equal(C.filledDays(s4), 0, 'comida NAO conta como plano');
});

// ---------------- 11.4 atracoes ----------------
test('11.4 — 104 atracoes: 27 backlog, 8 escolhidas, 69 sugeridas', () => {
  assert.equal(C.attrCount(S), 104);
  assert.equal(C.attrCount(S, 'backlog'), 27);
  assert.equal(C.attrCount(S, 'escolhida'), 8);
  assert.equal(C.attrCount(S, 'sugerida'), 69);
});

test('5.2 — so escolhida entra no custo', () => {
  assert.equal(C.attrEurAll(S, 'escolhida'), 0, 'as 8 de Lisboa sao todas gratis');
  assert.ok(C.attrEurAll(S, 'backlog') > 0, 'o backlog somaria mais');
  const s2 = structuredClone(S);
  const antes = C.totalBrl(s2, CIDADES_STAY);
  const bac = s2.attractions.find((a) => a.status === 'backlog');
  bac.price_eur = 20;
  assert.equal(C.totalBrl(s2, CIDADES_STAY), antes, 'atracao no backlog nao muda o total');
  bac.status = 'escolhida';
  assert.equal(Math.round(C.totalBrl(s2, CIDADES_STAY) - antes), 124, '€ 20 x 6,20 = R$ 124');
});

test('11.4 — ordenacao escolhida -> backlog -> sugerida', () => {
  const ord = C.attrsSorted(S, 'lisboa').map((a) => a.status);
  assert.deepEqual(ord.slice(0, 8), Array(8).fill('escolhida'));
  const idx = { escolhida: 0, backlog: 1, sugerida: 2 };
  for (let i = 1; i < ord.length; i++) assert.ok(idx[ord[i]] >= idx[ord[i - 1]]);
});

// ---------------- 11.5 hospedagem ----------------
test('11.5 — total lancado ignora diaria x noites (regra 5.7)', () => {
  const s = structuredClone(S);
  s.stays.lisboa.nightly_eur = 68;
  s.stays.lisboa.nights = 4;
  assert.equal(C.stayTotal(s, 'lisboa'), 272);
  s.stays.lisboa.total_eur = 250;
  assert.equal(C.stayTotal(s, 'lisboa'), 250, 'total preenchido manda');
  s.stays.lisboa.total_eur = 0;
  assert.equal(C.stayTotal(s, 'lisboa'), 272, 'total zero volta para a diaria');
  assert.equal(C.stayCount(s, CIDADES_STAY), 0, 'conta endereco, nao valor');
  s.stays.lisboa.address = 'Rua X, 1';
  assert.equal(C.stayCount(s, CIDADES_STAY), 1);
  assert.equal(CIDADES_STAY.length, 7);
});

// ---------------- 11.6 e 5.10/5.11 as moedas ----------------
test('5.11 — moeda padrao: transporte em EURO, burocracia em REAL', () => {
  // o passaporte, sem moeda no JSON dele, tem que cair no REAL:
  // R$ 257,25 e nao R$ 257,25 x 6,20 = R$ 1.595
  const p = S.bookings.find((b) => b.name === 'Passaporte');
  assert.equal(p.currency, 'brl');
  assert.equal(p.amount, 257.25);
  assert.equal(Math.round(C.bookingBrl(S, 'pago') * 100) / 100, 257.25);
  assert.notEqual(Math.round(C.bookingBrl(S, 'pago')), 1595);
  // e os trechos dele, com m:"eur", no euro
  assert.ok(S.legs.every((l) => l.currency === 'eur'));
});

test('5.10 — a caixinha comprado so move o dinheiro de lado', () => {
  const s = structuredClone(S);
  s.legs[0].amount = 120;                    // € 120
  const total = C.totalBrl(s, CIDADES_STAY);
  const pagoAntes = C.pagoBrl(s);
  assert.equal(Math.round(C.legBrl(s, 'falta')), Math.round(120 * 6.2), 'entra em previsto');
  assert.equal(C.legBrl(s, 'pago'), 0);

  s.legs[0].bought = true;
  assert.equal(C.totalBrl(s, CIDADES_STAY), total, 'o total real NAO muda');
  assert.equal(Math.round(C.legBrl(s, 'pago')), Math.round(120 * 6.2), 'move para ja pago');
  assert.equal(C.legBrl(s, 'falta'), 0);
  assert.ok(C.pagoBrl(s) > pagoAntes);

  s.legs[0].bought = false;                  // desmarcar devolve
  assert.equal(C.legBrl(s, 'pago'), 0);
  assert.equal(Math.round(C.legBrl(s, 'falta')), Math.round(120 * 6.2));
  assert.equal(C.totalBrl(s, CIDADES_STAY), total);
});

test('11.7 — ainda por gastar = total real - ja pago', () => {
  const s = structuredClone(S);
  s.legs[0].amount = 120;
  assert.equal(
    Math.round(C.aindaPorGastar(s, CIDADES_STAY)),
    Math.round(C.totalBrl(s, CIDADES_STAY) - C.pagoBrl(s)),
  );
});

// ---------------- 5.8 prato nao vai para dia ----------------
test('5.8 — prato tipico nunca tem dia', () => {
  assert.ok(S.foods.every((f) => f.kind !== 'prato' || !f.day_iso));
  assert.ok(!C.foodPickable('prato'));
  assert.ok(C.foodPickable('restaurante'));
  assert.ok(C.foodPickable('cafe'));
});

// ---------------- 6.3 comida so nos 7 paises ----------------
test('6.3 — sugestoes de comida so dos 7 paises: nada de be/pl', () => {
  assert.equal(FOOD.length, 7);
  const ks = FOOD.map((f) => f.pais);
  assert.ok(!ks.includes('be') && !ks.includes('pl'));
  assert.deepEqual([...ks].sort(), CO.map((c) => c.k).sort());
});

// ---------------- 10.2 a base do dia acha a cidade ----------------
test('10.2 — cityOfBase normaliza e casa', () => {
  assert.equal(C.cityOfBase('Lisboa'), 'lisboa');
  assert.equal(C.cityOfBase('Amsterdã'), 'amsterda');
  assert.equal(C.cityOfBase('Cáceres'), 'caceres');
  assert.equal(C.cityOfBase('em trânsito'), '');
  assert.equal(C.cityOfBase(''), '');
  assert.equal(norm('Amsterdã'), 'amsterda');
});

test('10.2 — a cidade da base vem primeiro nos chips', () => {
  const cs = C.pickCities('roma');
  assert.equal(cs[0], 'roma');
  assert.equal(cs.length, Object.keys(CT).length, 'todas as 11, sem repetir');
  assert.equal(new Set(cs).size, cs.length);
  const fr = C.pickCities('metz');
  assert.deepEqual(fr.slice(0, 4), ['metz', 'estrasburgo', 'reims', 'paris'], 'depois o resto do pais');
});

// ---------------- 11.1 e 10.0 numeros e moeda ----------------
test('11.1 — num() aceita virgula e NaN vale zero', () => {
  assert.equal(num('12,50'), 12.5);
  assert.equal(num('12.50'), 12.5);
  assert.equal(num('abc'), 0);
  assert.equal(num(''), 0);
  assert.equal(num(null), 0);
  assert.equal(num(undefined), 0);
});

test('10.0 — R$ sem centavos, € com ate 2 casas, ponto de milhar brasileiro', () => {
  assert.equal(brl(1234.4), 'R$ 1.234');
  assert.equal(brl(5079.77), 'R$ 5.080');
  assert.equal(eur(12.5), '€ 12,5');
  assert.equal(eur(2795), '€ 2.795');
  assert.equal(eur(12.567), '€ 12,57');
});

test('10.0 — campo de valor vazio e vazio, nao zero', () => {
  assert.equal(inputNum(null), '');
  assert.equal(inputNum(0), '0');
  assert.equal(inputNum(12.5), '12,5');
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('12,5'), 12.5);
  assert.equal(parseNum('abc'), null);
});

test('10.0 — o que o usuario digita e texto puro', () => {
  assert.equal(stripTags('<b>oi</b> <script>x</script>'), 'oi x');
  assert.equal(stripTags('sem tag'), 'sem tag');
});

// ---------------- 11.8 Caixa ----------------
test('11.8 — meses do mes corrente ate dezembro de 2026', () => {
  assert.deepEqual(saveMonths(new Date(2026, 8, 4)), ['2026-09', '2026-10', '2026-11', '2026-12']);
  assert.deepEqual(saveMonths(new Date(2026, 11, 20)), ['2026-12']);
  assert.deepEqual(saveMonths(new Date(2025, 5, 1)).length, 12, 'antes de 2026: o ano inteiro');
  assert.deepEqual(saveMonths(new Date(2027, 0, 5)), ['2026-12']);
});

test('11.8 — a falta se divide pelos meses AINDA VAZIOS', () => {
  const hoje = new Date(2026, 8, 4);            // setembro de 2026 -> 4 meses
  const s = structuredClone(S);
  s.mySavings = { who: 'leo', goal: 4000, opening: 0, currency: 'brl' };
  assert.equal(C.mesesVazios(s, true, hoje), 4);
  assert.equal(C.cxMes(s, true, hoje), 1000);

  s.myContributions = { '2026-09': 1000 };      // lancou setembro
  assert.equal(C.cxTotal(s, hoje), 1000);
  assert.equal(C.cxFalta(s, hoje), 3000);
  assert.equal(C.mesesVazios(s, true, hoje), 3, 'redistribui pelos que sobraram');
  assert.equal(C.cxMes(s, true, hoje), 1000);
  assert.equal(plMes(3), 'nos 3 meses que sobram');
  assert.equal(plMes(1), 'no mês que sobra');
  assert.equal(plMesV(1), 'pelo único mês ainda vazio');
});

test('11.8 — quem pensa em euro converte pelo cambio', () => {
  const s = structuredClone(S);
  s.mySavings = { who: 'lu', goal: 500, opening: 100, currency: 'eur' };
  s.myContributions = { '2026-09': 50 };
  const hoje = new Date(2026, 8, 4);
  assert.equal(C.cxCur(s), 'eur');
  assert.equal(C.cxTotal(s, hoje), 150);
  assert.equal(C.cxBrl(s, 150), 930);           // 150 x 6,20
  assert.equal(C.estimNaMoeda(s), ESTIM_EUR);
  s.mySavings.currency = 'brl';
  assert.equal(C.estimNaMoeda(s), Math.round(ESTIM_EUR * 6.2));
});

test('11.8 — o geral sai dos agregados, nunca das linhas', () => {
  const s = structuredClone(S);
  s.geral = { opening_brl: 1000, goal_brl: 20000, contrib_brl: 4000, months: { '2026-09': 4000 } };
  assert.equal(C.geralTotalBrl(s), 5000);
  assert.equal(C.geralFaltaBrl(s), 15000);
  assert.equal(Math.round(C.geralPct(s)), 25);
  const hoje = new Date(2026, 8, 4);
  assert.equal(C.mesesVazios(s, false, hoje), 3, 'setembro tem lancamento dos dois');
  assert.equal(C.cxMes(s, false, hoje), 5000);
  // a estrutura nao carrega valor por pessoa
  assert.ok(!('leo' in s.geral) && !('lu' in s.geral));
});

// ---------------- Painel: bate-volta por base ----------------
test('10.1 — a tabela do roteiro tem 8 linhas e nenhuma data', () => {
  const bases = C.baseList(S);
  assert.equal(bases.length, 8);
  const nomes = bases.map((b) => b.base);
  assert.deepEqual(nomes, ['Cáceres', 'Lisboa', 'Madrid', 'Metz', 'Reims', 'Amsterdã', 'Roma', 'Madrid']);
  // a ultima linha diz o motivo da noite que falta, nao um bate-volta
  assert.equal(C.baseOut('Madrid', true, bases[7]), 'último dia — o voo de volta é 23h35');
  assert.equal(C.baseOut('Lisboa', false, bases[1]), 'Sintra e Cascais');
  assert.equal(C.baseOut('Metz', false, bases[3]), 'Luxemburgo, Estrasburgo, Trier, Nancy ou Colmar');
});
