// ============================================================
// A promessa central do projeto (secao 8 e checklist da secao 15):
// dois editando ao mesmo tempo, campo a campo, ninguem apaga ninguem.
// Testa src/lib/merge.ts, o codigo de producao.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarRemoto, chave, mesclar, removerLocal, inserirLocal } from '@/lib/merge.ts';
import { VOO } from '@/content/index.ts';

const base = () => ({
  days: { '2026-12-12': { iso: '2026-12-12', base: 'Lisboa', plan: '' } },
  attractions: [
    { id: 'a1', city: 'lisboa', name: 'Torre de Belém', price_eur: 0, note: '',
      status: 'escolhida', kind: 'passeio', day_iso: null, seed_id: 'm:lisboa:7' },
  ],
  foods: [],
  legs: [
    { id: 't1', position: 0, name: 'Madrid → Cáceres', note: '', kind: 'trem',
      amount: null, currency: 'eur', bought: false, day_iso: null, seed_id: 't:0' },
  ],
  bookings: [],
  stays: { lisboa: { city: 'lisboa', address: '', check_in: '', check_out: '',
    nightly_eur: null, nights: null, total_eur: null, link: '', notes: '' } },
  extras: [],
  dayItems: [],
  settings: { id: 1, eur_rate: 6.2, flight_paid_brl: VOO },
  killed: [],
  adopted: [],
  savings: {
    leo: { who: 'leo', goal: null, currency: 'brl' },
    lu:  { who: 'lu',  goal: null, currency: 'eur' },
  },
  contributions: [],
  avisos: [],
  me: { id: 'u1', email: 'leo@x', who: 'leo' },
  hoje: '2026-09-04',
});

const upd = (row) => ({ eventType: 'UPDATE', new: row, old: {} });

test('o campo com escrita local pendente NAO e sobrescrito', () => {
  // O Leo lancou € 120 no valor do trecho e ainda esta na fila.
  const pend = new Map([[chave('leg', 't1', 'amount'), 120]]);
  let s = base();
  s = mesclar(s, 'leg', 't1', { amount: 120 });

  // Ao mesmo tempo a Lu renomeou o MESMO trecho. A linha dela ainda
  // tem amount null, porque ela nao viu o lancamento dele.
  s = aplicarRemoto(s, 'leg', upd({
    id: 't1', position: 0, name: 'Madrid → Cáceres (3h07)', note: '', kind: 'trem',
    amount: null, currency: 'eur', bought: false, day_iso: null, seed_id: 't:0',
  }), pend);

  assert.equal(s.legs[0].name, 'Madrid → Cáceres (3h07)', 'o nome dela entra');
  assert.equal(s.legs[0].amount, 120, 'o valor dele NAO e apagado');
});

test('sem escrita pendente, o ultimo a escrever ganha', () => {
  let s = base();
  s = aplicarRemoto(s, 'leg', upd({
    id: 't1', position: 0, name: 'Madrid → Cáceres', note: '', kind: 'aviao',
    amount: 88, currency: 'eur', bought: true, day_iso: null, seed_id: 't:0',
  }), new Map());
  assert.equal(s.legs[0].amount, 88);
  assert.equal(s.legs[0].bought, true);
  assert.equal(s.legs[0].kind, 'aviao');
});

test('duas colunas diferentes da mesma linha convivem', () => {
  // O Leo mexe no preco; a Lu, no nome. Cada um com a sua fila.
  const pendLeo = new Map([[chave('attraction', 'a1', 'price_eur'), 15]]);
  let leo = base();
  leo = mesclar(leo, 'attraction', 'a1', { price_eur: 15 });
  leo = aplicarRemoto(leo, 'attraction', upd({
    ...base().attractions[0], name: 'Torre de Belém (por fora)',
  }), pendLeo);
  assert.equal(leo.attractions[0].price_eur, 15);
  assert.equal(leo.attractions[0].name, 'Torre de Belém (por fora)');

  const pendLu = new Map([[chave('attraction', 'a1', 'name'), 'Torre de Belém (por fora)']]);
  let lu = base();
  lu = mesclar(lu, 'attraction', 'a1', { name: 'Torre de Belém (por fora)' });
  lu = aplicarRemoto(lu, 'attraction', upd({ ...base().attractions[0], price_eur: 15 }), pendLu);
  assert.equal(lu.attractions[0].price_eur, 15);
  assert.equal(lu.attractions[0].name, 'Torre de Belém (por fora)');
  // os dois chegam ao mesmo lugar
  assert.deepEqual(leo.attractions[0], lu.attractions[0]);
});

test('atracao marcada num dia pelo outro aparece sem recarregar', () => {
  let s = base();
  assert.equal(s.attractions[0].day_iso, null);
  s = aplicarRemoto(s, 'attraction', upd({
    ...base().attractions[0], day_iso: '2026-12-12', status: 'escolhida',
  }), new Map());
  assert.equal(s.attractions[0].day_iso, '2026-12-12');
});

test('linha nova do outro entra na lista', () => {
  let s = base();
  s = aplicarRemoto(s, 'attraction', {
    eventType: 'INSERT',
    new: { id: 'a2', city: 'roma', name: 'Panteão', price_eur: 7, note: '',
           status: 'backlog', kind: 'tour', day_iso: null, seed_id: null },
    old: {},
  }, new Map());
  assert.equal(s.attractions.length, 2);
  assert.equal(s.attractions[1].name, 'Panteão');
});

test('linha apagada pelo outro sai da tela', () => {
  let s = base();
  s = aplicarRemoto(s, 'attraction', {
    eventType: 'DELETE', new: {}, old: { id: 'a1' },
  }, new Map());
  assert.equal(s.attractions.length, 0);
});

test('killed_seed e adopted acompanham em tempo real', () => {
  let s = base();
  s = aplicarRemoto(s, 'killed_seed',
    { eventType: 'INSERT', new: { seed_id: 'm:lisboa:7' }, old: {} }, new Map());
  assert.deepEqual(s.killed, ['m:lisboa:7']);
  // nao duplica
  s = aplicarRemoto(s, 'killed_seed',
    { eventType: 'INSERT', new: { seed_id: 'm:lisboa:7' }, old: {} }, new Map());
  assert.deepEqual(s.killed, ['m:lisboa:7']);

  s = aplicarRemoto(s, 'adopted',
    { eventType: 'INSERT', new: { seed_id: 'R|3' }, old: {} }, new Map());
  assert.deepEqual(s.adopted, ['R|3']);
});

test('o cambio mudado pelo outro chega, e recalcula tudo', () => {
  let s = base();
  s = aplicarRemoto(s, 'settings',
    upd({ id: 1, eur_rate: 6.5, flight_paid_brl: VOO }), new Map());
  assert.equal(s.settings.eur_rate, 6.5);
});

test('a base e o texto do dia sao colunas independentes', () => {
  const pend = new Map([[chave('day', '2026-12-12', 'plan'), 'andar pela Baixa']]);
  let s = base();
  s = mesclar(s, 'day', '2026-12-12', { plan: 'andar pela Baixa' });
  // a Lu trocou a base do mesmo dia
  s = aplicarRemoto(s, 'day',
    upd({ iso: '2026-12-12', base: 'Sintra', plan: '' }), pend);
  assert.equal(s.days['2026-12-12'].base, 'Sintra', 'a base dela entra');
  assert.equal(s.days['2026-12-12'].plan, 'andar pela Baixa', 'o texto dele fica');
});

test('a hospedagem mescla por coluna', () => {
  const pend = new Map([[chave('stay', 'lisboa', 'nightly_eur'), 68]]);
  let s = base();
  s = mesclar(s, 'stay', 'lisboa', { nightly_eur: 68 });
  s = aplicarRemoto(s, 'stay', upd({
    city: 'lisboa', address: 'Rua Augusta, 1', check_in: '', check_out: '',
    nightly_eur: null, nights: 4, total_eur: null, link: '', notes: '',
  }), pend);
  assert.equal(s.stays.lisboa.address, 'Rua Augusta, 1');
  assert.equal(s.stays.lisboa.nights, 4);
  assert.equal(s.stays.lisboa.nightly_eur, 68, 'a diaria dele fica');
});

test('a Caixa: a linha de cada um chega na sua chave', () => {
  let s = base();
  s = aplicarRemoto(s, 'savings',
    upd({ who: 'lu', goal: 2795, currency: 'eur' }), new Map());
  assert.equal(s.savings.lu.goal, 2795);
  assert.equal(s.savings.leo.goal, null, 'a linha do outro nao e tocada');
});

test('o aporte da Lu chega, e o geral do Leo sobe sem recarregar', () => {
  let s = base();
  assert.equal(s.contributions.length, 0);
  s = aplicarRemoto(s, 'contribution', {
    eventType: 'INSERT',
    new: { id: 'c1', who: 'lu', on_date: '2026-09-03', label: 'sobra', amount: 100 },
    old: {},
  }, new Map());
  assert.equal(s.contributions.length, 1);
  assert.equal(s.contributions[0].amount, 100);

  // e o dele, do mesmo dia, convive na mesma lista
  s = aplicarRemoto(s, 'contribution', {
    eventType: 'INSERT',
    new: { id: 'c2', who: 'leo', on_date: '2026-09-03', label: '13o', amount: 1000 },
    old: {},
  }, new Map());
  assert.equal(s.contributions.length, 2);
  assert.equal(s.contributions.find((c) => c.id === 'c1').amount, 100, 'o dela fica');
});

test('o aporte que ainda esta na fila local nao e sobrescrito', () => {
  const pend = new Map([[chave('contribution', 'c1', 'amount'), 1500]]);
  let s = base();
  s = inserirLocal(s, 'contribution',
    { id: 'c1', who: 'leo', on_date: '2026-09-12', label: '13o', amount: 1000 });
  s = mesclar(s, 'contribution', 'c1', { amount: 1500 });
  assert.equal(s.contributions[0].amount, 1500);

  // chega o eco antigo do banco, com o valor de antes e um nome novo dela
  s = aplicarRemoto(s, 'contribution', {
    eventType: 'UPDATE',
    new: { id: 'c1', who: 'leo', on_date: '2026-09-12', label: '13o salário', amount: 1000 },
    old: {},
  }, pend);
  assert.equal(s.contributions[0].amount, 1500, 'o que ele digitou fica');
  assert.equal(s.contributions[0].label, '13o salário', 'o nome dela entra');
});

test('o aporte tirado pelo outro sai da tela', () => {
  let s = base();
  s = inserirLocal(s, 'contribution',
    { id: 'c1', who: 'lu', on_date: '2026-09-03', label: 'sobra', amount: 100 });
  s = aplicarRemoto(s, 'contribution', {
    eventType: 'DELETE', new: {},
    old: { id: 'c1', who: 'lu', on_date: '2026-09-03', label: 'sobra', amount: 100 },
  }, new Map());
  assert.equal(s.contributions.length, 0);
});

test('o aviso que o outro escreveu aparece, e o que ele apagou some', () => {
  let s = base();
  assert.equal(s.avisos.length, 0);
  s = aplicarRemoto(s, 'aviso', {
    eventType: 'INSERT',
    new: { id: 'a1', spot: 'atracoes:lisboa', tone: 'warn', title: 'fila',
           body: 'vá cedo', position: 0, seed_id: null },
    old: {},
  }, new Map());
  assert.equal(s.avisos.length, 1);
  assert.equal(s.avisos[0].title, 'fila');

  // ele estava digitando o corpo quando chegou o eco antigo
  const pend = new Map([[chave('aviso', 'a1', 'body'), 'vá muito cedo']]);
  s = mesclar(s, 'aviso', 'a1', { body: 'vá muito cedo' });
  s = aplicarRemoto(s, 'aviso', {
    eventType: 'UPDATE',
    new: { id: 'a1', spot: 'atracoes:lisboa', tone: 'alert', title: 'fila enorme',
           body: 'vá cedo', position: 0, seed_id: null },
    old: {},
  }, pend);
  assert.equal(s.avisos[0].body, 'vá muito cedo', 'o que ele digitou fica');
  assert.equal(s.avisos[0].title, 'fila enorme', 'o titulo dela entra');
  assert.equal(s.avisos[0].tone, 'alert', 'a cor dela entra');

  s = aplicarRemoto(s, 'aviso', {
    eventType: 'DELETE', new: {},
    old: { id: 'a1', spot: 'atracoes:lisboa' },
  }, new Map());
  assert.equal(s.avisos.length, 0);
});

test('mesclar e imutavel: nao mexe no objeto antigo', () => {
  const s = base();
  const copia = structuredClone(s);
  const novo = mesclar(s, 'attraction', 'a1', { price_eur: 99 });
  assert.deepEqual(s, copia, 'o Snapshot antigo fica intacto');
  assert.equal(novo.attractions[0].price_eur, 99);
  assert.notEqual(novo.attractions, s.attractions);
});

test('inserir e remover local', () => {
  let s = base();
  s = inserirLocal(s, 'extra', { id: 'x1', name: 'comida em Madrid', amount: 40, currency: 'eur' });
  assert.equal(s.extras.length, 1);
  s = removerLocal(s, 'extra', 'x1');
  assert.equal(s.extras.length, 0);
});

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

  // base() nao tem comida nenhuma: chega como INSERT, igual ao caso de
  // atracao nova (teste 'linha nova do outro entra na lista').
  s = aplicarRemoto(s, 'food', {
    eventType: 'INSERT',
    new: { id: 'f1', country: 'pt', name: 'Pastel de nata', note: '',
           kind: 'prato', day_iso: '2026-12-12', seed_id: null,
           day_pos: 2, done: true },
    old: {},
  }, new Map());
  assert.equal(s.foods[0].day_pos, 2);
  assert.equal(s.foods[0].done, true);
});

// ---------------- a corrida entre o insert e o eco do tempo real ----------------

test('inserirLocal NAO duplica a linha que ja esta na lista', () => {
  // O DEFEITO, achado na tela em 08/09 ao registrar uma atracao dentro do dia:
  // a mesma atracao apareceu DUAS vezes na lista e sumiu uma no F5.
  //
  // A causa e uma corrida. Quem escreve chama `insert`, que faz duas coisas:
  // manda para o banco e, quando a promessa volta, poe a linha na lista. Mas o
  // ECO do tempo real da MESMA escrita chega por outro caminho — e se ele
  // chegar primeiro, `aplicarRemoto` ja poe a linha (ele desempata direito), e
  // depois `insert` poe de novo. Duas linhas iguais, com o mesmo id.
  //
  // Por que isso e pior do que parece: ele ve duas e apaga uma. Como as duas
  // TEM O MESMO ID, apagar "uma" apaga a linha de verdade — e a que fica na
  // tela e um fantasma que some no proximo F5. Ele acha que perdeu o trabalho.
  //
  // Vale para TODO formulario do app: atracao, comida, trecho, aviso, cidade,
  // opcao de hospedagem, aporte e item livre. Nao e do Roteiro.
  const linha = {
    id: 'a2', city: 'lisboa', name: 'Mosteiro dos Jerónimos', price_eur: 12,
    note: '', status: 'backlog', kind: 'passeio', day_iso: null, seed_id: null,
  };

  let s = base();
  s = inserirLocal(s, 'attraction', linha);
  assert.equal(s.attractions.length, 2, 'a primeira vez entra');

  s = inserirLocal(s, 'attraction', linha);
  assert.equal(s.attractions.length, 2, 'a segunda vez NAO pode duplicar');
  assert.deepEqual(s.attractions.map((a) => a.id), ['a1', 'a2']);
});

test('inserirLocal de novo ATUALIZA a linha, e nao ignora', () => {
  // O eco do tempo real traz a linha como o BANCO a gravou — com os defaults
  // preenchidos e os gatilhos aplicados. Se `inserirLocal` so ignorasse a
  // repetida, a tela ficaria com a versao otimista, sem esses campos.
  let s = base();
  s = inserirLocal(s, 'attraction', { id: 'a2', city: 'lisboa', name: 'rascunho', price_eur: 0 });
  s = inserirLocal(s, 'attraction', { id: 'a2', city: 'lisboa', name: 'rascunho', price_eur: 12, day_pos: 3 });
  assert.equal(s.attractions.length, 2);
  const a2 = s.attractions.find((a) => a.id === 'a2');
  assert.equal(a2.price_eur, 12, 'o valor do banco manda');
  assert.equal(a2.day_pos, 3, 'e os campos que so o banco sabe entram');
});

test('a corrida completa: o eco chega ANTES da promessa do insert', () => {
  // O caminho exato do defeito de 08/09, ponta a ponta.
  const doBanco = {
    id: 'd9', day_iso: '2026-12-12', name: 'lavanderia', note: '',
    amount: 12, currency: 'eur', day_pos: 0, done: false,
  };
  let s = base();

  // 1. o eco do tempo real chega primeiro
  s = aplicarRemoto(s, 'day_item', { eventType: 'INSERT', new: doBanco, old: {} }, new Map());
  assert.equal(s.dayItems.length, 1);

  // 2. e SO ENTAO a promessa do insert volta, com a mesma linha
  s = inserirLocal(s, 'day_item', doBanco);
  assert.equal(s.dayItems.length, 1, 'continua uma so — era isto que duplicava');
});
