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
    attractions: [attr('a1', 1, { note: 'ver com antecedencia' }),
                  attr('a2', 9, { day_iso: '2026-12-17' })],
    legs: [leg('t1', 0, { note: 'comprar bilhete' })],
    foods: [food('f1', 2, { note: 'reservar mesa' })],
    dayItems: [item('d1', 3, { note: 'lembrar de anotar' }),
               item('d2', 9, { day_iso: '2026-12-17' })],
  });
  const l = D.itensDoDia(s, ISO);
  assert.deepEqual(l.map((x) => x.id), ['t1', 'a1', 'f1', 'd1']);
  assert.deepEqual(l.map((x) => x.tabela),
    ['leg', 'attraction', 'food', 'day_item']);

  // O mapeamento coluna->campo, preso por origem: `nome`, `nota` e `sub` nao
  // tem nenhuma asserção em outro lugar do arquivo. Sem isto, `nome: t.note`
  // no lugar de `nome: t.name` compila limpo (os dois lados sao string) e
  // passa em todos os outros testes — igual ao defeito que load.ts:121-123
  // ja fechou para os normalizadores.
  assert.deepEqual(l.map((x) => x.nome),
    ['trecho t1', 'atr a1', 'comida f1', 'livre d1']);
  assert.deepEqual(l.map((x) => x.nota),
    ['comprar bilhete', 'ver com antecedencia', 'reservar mesa',
     'lembrar de anotar']);
  assert.deepEqual(l.map((x) => x.sub), ['trem', 'Madrid', 'restaurante', 'seu']);
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
    // comida nao tem campo de valor: ela entra na soma com 0 dos dois
    // lados, sempre. Sem este fixture o `totalDoDia` nunca roda com uma
    // comida presente e "food contribui 0" fica sem prova nenhuma.
    foods: [food('f1', 5)],
  });
  assert.deepEqual(D.totalDoDia(s, ISO), { eur: 82, brl: 835 });
  assert.deepEqual(D.totalDoDia(snap(), ISO), { eur: 0, brl: 0 });
});

test('feitasDoDia conta o que esta marcado', () => {
  const s = snap({
    attractions: [attr('a1', 0, { done: true }), attr('a2', 1)],
    dayItems: [item('d1', 2, { done: true })],
    // as duas origens que faltavam: sem elas, um `done` de leg ou de food
    // que a funcao esquecesse de contar passaria por aqui sem ser notado.
    legs: [leg('t1', 3, { done: true }), leg('t2', 4)],
    foods: [food('f1', 5, { done: true }), food('f2', 6)],
  });
  assert.deepEqual(D.feitasDoDia(s, ISO), { feitas: 4, total: 7 });
  assert.deepEqual(D.feitasDoDia(snap(), ISO), { feitas: 0, total: 0 });
});

test('eur e brl sao 0, nunca null, quando o amount e null', () => {
  // src/lib/dia.ts:38 promete 0 quando nao ha valor, nunca null, para quem
  // soma nao precisar checar. leg e day_item nascem com amount: null nos
  // fixtures deste arquivo — o caso normal antes de qualquer preenchimento.
  const s = snap({
    legs: [leg('t1', 0)],
    dayItems: [item('d1', 1)],
  });
  for (const x of D.itensDoDia(s, ISO)) {
    assert.equal(x.eur, 0);
    assert.equal(x.brl, 0);
    assert.equal(typeof x.eur, 'number');
    assert.equal(typeof x.brl, 'number');
  }
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

/**
 * A CLASSE CSS DE CADA ETIQUETA SAI DAQUI, E NAO DA TELA.
 *
 * A tira de etiquetas da lista de blocos (`DiaTags`, em Roteiro.tsx) montava e
 * ordenava as quatro origens por conta propria, e discordava deste modulo em
 * duas coisas: comida e item livre trocados, e a ordem dentro do tipo. Em
 * 07/09 ela passou a consumir o `itensDoDia`.
 *
 * Para isso o item precisa carregar a classe de cor, que antes a tela
 * resolvia — do mesmo jeito que ja carrega `emoji` e `sub`, que tambem sao
 * escolha de exibicao por tipo. Se a classe voltar para a tela, a divergencia
 * volta junto.
 *
 * O `pgo` do trecho comprado tem caso proprio: e a unica classe que depende
 * de um estado, e nao so do tipo.
 */
test('cada item traz a classe de cor da etiqueta, por origem', () => {
  const s = snap({
    legs: [leg('t1', 0, { kind: 'trem' }), leg('t2', 1, { kind: 'aviao', bought: true })],
    attractions: [attr('a1', 2)],
    dayItems: [item('d1', 3)],
    foods: [food('f1', 4, { kind: 'restaurante' })],
  });

  const porId = Object.fromEntries(D.itensDoDia(s, ISO).map((x) => [x.id, x.classe]));

  assert.equal(porId.t1, 'tk-trem', 'o trecho leva o tipo na classe');
  assert.equal(porId.t2, 'tk-aviao pgo', 'comprado ganha o pgo, e so o comprado');
  assert.equal(porId.a1, 'st-esc', 'dentro do dia toda atracao esta no roteiro');
  assert.equal(porId.d1, 'di', 'o item livre tem classe propria');
  assert.equal(porId.f1, 'fk-rest', 'a comida usa a sigla do FKCLS, nao o kind cru');
});
