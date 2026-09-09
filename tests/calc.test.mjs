// ============================================================
// Prova as formulas da secao 11 contra os numeros que o usuario
// espera ver — rodando o codigo de producao (src/lib/calc.ts).
//
// A BASE DESTE ARQUIVO E HISTORICA, e isso importa (decidido em 05/09).
// `dados/estado-atual-do-leo.json` e um RETRATO de 04/09, nao o banco.
// Enquanto ninguem tinha dito isso em voz alta, os dois portoes de
// aceite discordavam em silencio: `npm test` verde e `npm run check`
// vermelho com 5 falhas, e "os testes passam" nao provava nada sobre
// producao.
//
// Divisao a partir de agora:
//   `npm test`      -> as FORMULAS, sobre uma fixture congelada. Se
//                      quebrar, foi o codigo. Nao siga o banco.
//   `npm run check` -> o BANCO DE VERDADE. E o unico que fala de
//                      producao. Os numeros dele mudam quando o Leo usa
//                      o app, e sao atualizados la, nao aqui.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as C from '@/lib/calc.ts';
import { num, brl, eur, saveMonths, dtLabel, isData, hojeLocal, plMes, plMesAte, norm, stripTags, inputNum, parseNum } from '@/lib/fmt.ts';
import { ISOS, STAYS, VOO, ESTIM_EUR, CO, CT, FOOD, akEmoji } from '@/content/index.ts';

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
    // A `stay` ficou aposentada na Fase 6; quem manda e esta lista.
    stayOptions: [],
    // so as cidades que ELE criou; as 11 fixas continuam no arquivo
    cities: [],
    extras: [],
    settings: { id: 1, eur_rate: num(S.rate), flight_paid_brl: VOO },
    killed: Object.keys(S.killed ?? {}),
    adopted: Object.keys(S.adopted ?? {}),
    savings: {
      leo: { who: 'leo', goal: null, currency: 'brl' },
      lu:  { who: 'lu',  goal: null, currency: 'eur' },
    },
    contributions: [],
    avisos: [],
    dayItems: [],
    me: { id: 'x', email: 'leo@x', who: 'leo' },
    hoje: '2026-09-04',
  };
}

const S = snapshotDoLeo();

// ---------------- os tres numeros de aceite (secao 12.3) ----------------
test('12.3 — as 8 marcadas na fixture sao de Lisboa, e NENHUMA conta mais', () => {
  // A coluna `status` continua existindo e continua com estes valores; o
  // que mudou e que ela nao decide mais dinheiro nem etiqueta (5.2 revista).
  const esc = S.attractions.filter((a) => a.status === 'escolhida');
  assert.equal(esc.length, 8);
  assert.deepEqual([...new Set(esc.map((a) => a.city))], ['lisboa']);
  assert.equal(C.attrCount(S, 'roteiro'), 0, 'nenhuma esta num dia');
  assert.equal(C.attrEurAll(S, 'roteiro'), 0, 'entao nenhuma entra no custo');
});

test('12.3 — total ja pago = R$ 5.337 (voo + passaporte)', () => {
  assert.equal(brl(C.pagoBrl(S, CIDADES_STAY)), 'R$ 5.337');
  assert.equal(Math.round(C.pagoBrl(S, CIDADES_STAY) * 100) / 100, 5337.02);
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

/**
 * `noitesEm` — a dica embaixo de "quantas noites" na Hospedagem.
 *
 * Ela devolve UMA ENTRADA POR PASSAGEM, e este teste existe por causa de
 * Madrid. Somar as duas estadas dava "4 noites aqui", e ele fecharia um Airbnb
 * de 4 noites para uma estada que nunca existiu: sao 3 no comeco da viagem e
 * 1 no fim, com um mes no meio. Numero certo, conselho errado.
 *
 * As tres coisas que este teste tranca:
 *   1. Madrid devolve DUAS entradas, [3, 1], e nao a soma;
 *   2. a ULTIMA base ja vem com a noite a menos de `baseList` (voo 23h35) —
 *      e por isso a segunda passagem por Madrid vale 1, e nao 2;
 *   3. as 7 bases de STAYS tem dica; cidade sem dia devolve lista vazia, e a
 *      tela nao desenha nada.
 */
/**
 * O TEMA LIVRE da atracao (06/09/2026).
 *
 * Ele pediu: "eu devo poder escolher logo no registro se e passeio ou tour ou
 * outro tema que pode ser escrita livre". O menu de tema sai de
 * `temasDeAtracao`, e ele tem duas obrigacoes que erram em silencio:
 *
 *   1. os dois PADRAO vem sempre na frente, mesmo que nenhuma atracao os use
 *      — senao o menu que ele conhece muda de ordem sozinho;
 *   2. tema que ele escreveu aparece UMA vez, para a segunda atracao com o
 *      mesmo tema ser um clique e nao uma redigitacao. Sem isto, "mercado de
 *      natal" escrito duas vezes vira dois temas se cair um maiusculo.
 */
test('tema da atracao: o menu tem os dois padrao na frente e os dele sem repetir', () => {
  const base = C.temasDeAtracao(S);
  assert.deepEqual(base, ['passeio', 'tour'], 'sem tema dele, o menu e so o padrao');

  const s2 = structuredClone(S);
  const [a, b, c] = s2.attractions;
  a.kind = 'mercado de natal';
  b.kind = 'mercado de natal';   // repetido: nao pode aparecer duas vezes
  c.kind = 'mirante';
  const com = C.temasDeAtracao(s2);
  assert.deepEqual(com, ['passeio', 'tour', 'mercado de natal', 'mirante']);
  assert.equal(new Set(com).size, com.length, 'nenhum tema repetido no menu');

  // tema so de espacos nao vira item de menu, e tema vazio tampouco
  const s3 = structuredClone(S);
  s3.attractions[0].kind = '   ';
  s3.attractions[1].kind = '';
  assert.deepEqual(C.temasDeAtracao(s3), ['passeio', 'tour']);
});

/**
 * O emoji do tema. `AKE['museu']` e `undefined`, e `{undefined} {nome}` no JSX
 * nao quebra: desenha um espaco solto antes do nome, em quatro lugares do
 * Roteiro, e ninguem descobre. Por isso a tela usa `akEmoji`, nunca `AKE` cru.
 */
test('tema da atracao: akEmoji nunca devolve undefined', () => {
  assert.equal(akEmoji('passeio'), '🚶');
  assert.equal(akEmoji('tour'), '🏛️');
  for (const t of ['mercado de natal', 'museu', '', 'tour ', 'TOUR']) {
    const e = akEmoji(t);
    assert.equal(typeof e, 'string');
    assert.ok(e.length > 0, `tema ${JSON.stringify(t)} ficou sem emoji`);
  }
});

test('11.2 — noitesEm devolve uma entrada por passagem, nao a soma', () => {
  assert.deepEqual(C.noitesEm(S, 'madrid'), [3, 1], '3 noites no comeco, 1 no fim');
  assert.deepEqual(C.noitesEm(S, 'lisboa'), [4]);
  assert.deepEqual(C.noitesEm(S, 'caceres'), [1]);
  assert.deepEqual(C.noitesEm(S, 'metz'), [7]);
  assert.deepEqual(C.noitesEm(S, 'reims'), [3]);
  assert.deepEqual(C.noitesEm(S, 'amsterda'), [4], 'a base do dia diz "Amsterda"');
  assert.deepEqual(C.noitesEm(S, 'roma'), [8]);

  // nenhuma das 7 bases pode ficar sem dica — seria a unica sem, e ninguem veria
  for (const c of CIDADES_STAY) {
    assert.ok(C.noitesEm(S, c).length > 0, `${c} ficou sem dica de noites`);
  }
  // e o total tem que fechar com as 31 noites da viagem (Paris nao tem base)
  const soma = CIDADES_STAY.reduce((a, c) => a + C.noitesEm(S, c).reduce((x, y) => x + y, 0), 0);
  assert.equal(soma, C.nightsAll(S));

  assert.deepEqual(C.noitesEm(S, 'paris'), [], 'Paris virou bate-volta: nenhuma noite');
  assert.deepEqual(C.noitesEm(S, ''), [], 'cidade vazia nao explode');
  assert.deepEqual(C.noitesEm(S, 'cidade-que-nao-existe'), []);
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

// ---------------- cidade que ele cria (05/09) ----------------
const cidade = (k, n, co, position = 0) => ({ id: `c-${k}`, k, n, co, position });

test('cidade nova entra na lista do pais, depois das fixas', () => {
  const s = structuredClone(S);
  const fixas = C.cidadesDe(s, 'es');
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  const agora = C.cidadesDe(s, 'es');
  assert.deepEqual(agora.slice(0, fixas.length), fixas, 'as fixas nao se mexem');
  assert.equal(agora[agora.length - 1], 'sevilha', 'a dele entra no fim');
});

test('cidade dele NAO aparece no pais errado', () => {
  const s = structuredClone(S);
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  assert.ok(!C.cidadesDe(s, 'pt').includes('sevilha'));
});

test('chave repetida nao pode contar o dinheiro duas vezes', () => {
  // A trava de verdade e o `unique` do banco mais a recusa na tela; isto
  // prova que, se uma repetida escapasse, a lista NAO a duplica.
  const s = structuredClone(S);
  s.cities = [cidade('madrid', 'Madrid de novo', 'es')];
  const l = C.cidadesDe(s, 'es');
  assert.equal(new Set(l).size, l.length, 'sem chave repetida na lista');
});

test('o nome sai da cidade dele quando nao e fixa', () => {
  const s = structuredClone(S);
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  assert.equal(C.nomeCidade(s, 'sevilha'), 'Sevilha');
  assert.equal(C.nomeCidade(s, 'lisboa'), 'Lisboa', 'a fixa continua vindo do arquivo');
  assert.equal(C.nomeCidade(s, 'naoexiste'), 'naoexiste', 'nunca devolve vazio');
  assert.equal(C.paisDaCidade(s, 'sevilha'), 'es');
});

test('o dinheiro de uma atracao na cidade nova entra no total do pais', () => {
  const s = structuredClone(S);
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  const antes = C.attrEurCountry(s, 'es', 'roteiro');
  s.attractions.push({
    id: 'a-sev', city: 'sevilha', name: 'Alcázar', price_eur: 14, note: '',
    status: 'backlog', kind: 'tour', day_iso: '2026-12-17', paid: false, seed_id: null,
  });
  assert.equal(C.attrEurCountry(s, 'es', 'roteiro'), antes + 14);
});

test('cityOfBase casa a cidade dele, e as fixas continuam ganhando', () => {
  const s = structuredClone(S);
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  assert.equal(C.cityOfBase(s, 'Sevilha'), 'sevilha');
  assert.equal(C.cityOfBase(s, 'sevilha'), 'sevilha');
  // a terceira passada casa por pedaco de nome e fica mais larga a cada
  // cidade criada; as 11 vem primeiro justamente para nao mudarem
  assert.equal(C.cityOfBase(s, 'Lisboa'), 'lisboa');
  assert.equal(C.cityOfBase(s, 'Amsterdã'), 'amsterda');
});

test('cidadeDele so acha as que ele criou', () => {
  const s = structuredClone(S);
  s.cities = [cidade('sevilha', 'Sevilha', 'es')];
  assert.ok(C.cidadeDele(s, 'sevilha'), 'a dele tem x');
  assert.equal(C.cidadeDele(s, 'madrid'), undefined, 'a fixa nao se apaga');
});

// ---------------- 11.4 atracoes ----------------
// REGRA REVISTA EM 05/09. A 5.2 dizia "so o que esta marcado como
// escolhida entra no custo" e a 5.3 dizia "tirar do dia NAO desfaz".
// O Leo revogou as duas: agora `day_iso` e a unica verdade, para a
// etiqueta e para o dinheiro. `status` passou a significar ORIGEM —
// 'sugerida' e a camada de pesquisa, o resto e a lista dele.
test('11.4 — 104 atracoes: 35 dele, 69 da pesquisa', () => {
  assert.equal(C.attrCount(S), 104);
  assert.equal(C.attrCount(S, 'pesquisa'), 69);
  assert.equal(C.attrCount(S, 'roteiro') + C.attrCount(S, 'fora'), 35, 'as dele');
  assert.equal(C.attrCount(S, 'roteiro'), 0, 'a fixture nao tem nenhuma num dia');
});

test('as tres familias sao exclusivas e cobrem tudo', () => {
  const n = C.attrCount(S, 'roteiro') + C.attrCount(S, 'fora') + C.attrCount(S, 'pesquisa');
  assert.equal(n, C.attrCount(S), 'ninguem fica de fora e ninguem conta duas vezes');
});

test('5.2 REVISTA — so entra no custo o que esta num dia do roteiro', () => {
  const s2 = structuredClone(S);
  const antes = C.totalBrl(s2, CIDADES_STAY);
  const a = s2.attractions.find((x) => x.status === 'backlog');

  a.price_eur = 20;
  assert.equal(C.totalBrl(s2, CIDADES_STAY), antes, 'sem dia, nao entra no total');

  // Marcar como "escolhida" NAO basta mais — era exatamente o que fazia
  // 14 passeios "que nao estao em lugar nenhum" somarem R$ 793,60.
  a.status = 'escolhida';
  assert.equal(C.totalBrl(s2, CIDADES_STAY), antes, 'a etiqueta velha nao move dinheiro');

  a.day_iso = '2026-12-12';
  assert.equal(Math.round(C.totalBrl(s2, CIDADES_STAY) - antes), 124, '€ 20 x 6,20 = R$ 124');

  // 5.3 REVISTA: tirar do dia agora DIMINUI o total na hora.
  a.day_iso = null;
  assert.equal(C.totalBrl(s2, CIDADES_STAY), antes, 'tirou do dia, saiu da conta');
});

test('a linha que impede o zero: fora do roteiro e a lista DELE sem dia', () => {
  const s2 = structuredClone(S);
  const dele = s2.attractions.find((x) => x.status === 'backlog');
  const pesq = s2.attractions.find((x) => x.status === 'sugerida');
  dele.price_eur = 30;
  pesq.price_eur = 500;

  const fora = C.attrEurAll(s2, 'fora');
  assert.ok(fora >= 30, 'a dele sem dia entra na linha');
  assert.ok(fora < 500, 'a da PESQUISA nao entra: nunca foi dele (regra 5.13)');
  assert.equal(C.attrEurAll(s2, 'pesquisa') >= 500, true, 'a pesquisa tem total proprio');
});

test('quem tem dia sai de "fora do roteiro" e entra no custo, sem contar duas vezes', () => {
  const s2 = structuredClone(S);
  const a = s2.attractions.find((x) => x.status === 'backlog');
  a.price_eur = 40;
  const foraAntes = C.attrEurAll(s2, 'fora');
  a.day_iso = '2026-12-12';
  assert.equal(C.attrEurAll(s2, 'fora'), foraAntes - 40, 'saiu da linha de fora');
  assert.equal(C.attrEurAll(s2, 'roteiro'), 40, 'e entrou no custo');
});

test('11.4 — a lista dele nao traz a camada de pesquisa junto', () => {
  const dele = C.attrsDele(S, 'lisboa');
  const pesq = C.attrsPesquisa(S, 'lisboa');
  assert.ok(dele.length > 0 && pesq.length > 0, 'Lisboa tem das duas');
  assert.ok(dele.every((a) => a.status !== 'sugerida'), 'nenhuma pesquisa na lista dele');
  assert.ok(pesq.every((a) => a.status === 'sugerida'), 'so pesquisa no painel de sugestoes');
  assert.equal(dele.length + pesq.length, C.attrsOf(S, 'lisboa').length);
});

test('a lista dele poe o que esta no roteiro primeiro, e desempata por nome', () => {
  const s2 = structuredClone(S);
  const l = s2.attractions.filter((a) => a.city === 'lisboa' && a.status !== 'sugerida');
  l[3].day_iso = '2026-12-12';
  const ord = C.attrsDele(s2, 'lisboa');
  assert.equal(ord[0].id, l[3].id, 'quem esta num dia sobe');
  const resto = ord.slice(1).map((a) => a.name);
  assert.deepEqual(resto, [...resto].sort((a, b) => a.localeCompare(b, 'pt')), 'o resto por nome');
});

test('11.4 — ordenacao velha (mantida so para o dia do roteiro)', () => {
  const ord = C.attrsSorted(S, 'lisboa').map((a) => a.status);
  assert.deepEqual(ord.slice(0, 8), Array(8).fill('escolhida'));
  const idx = { escolhida: 0, backlog: 1, sugerida: 2 };
  for (let i = 1; i < ord.length; i++) assert.ok(idx[ord[i]] >= idx[ord[i - 1]]);
});

// ---------------- 11.5 hospedagem ----------------
const opcao = (city, extra = {}) => ({
  id: `o-${city}-${extra.name ?? '1'}`, city, name: extra.name ?? 'opção', note: '',
  nightly_eur: null, nights: null, total_eur: null,
  address: '', check_in: '', check_out: '', link: '',
  chosen: false, paid: false, position: 0, seed_id: null, ...extra,
});

test('11.5 — total lancado ignora diaria x noites (regra 5.7)', () => {
  const s = structuredClone(S);
  s.stayOptions = [opcao('lisboa', { chosen: true, nightly_eur: 68, nights: 4 })];
  assert.equal(C.stayTotal(s, 'lisboa'), 272);
  s.stayOptions[0].total_eur = 250;
  assert.equal(C.stayTotal(s, 'lisboa'), 250, 'total preenchido manda');
  s.stayOptions[0].total_eur = 0;
  assert.equal(C.stayTotal(s, 'lisboa'), 272, 'total zero volta para a diaria');
  assert.equal(C.stayCount(s, CIDADES_STAY), 0, 'conta endereco, nao valor');
  s.stayOptions[0].address = 'Rua X, 1';
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

test('Fase 6 — SO a opcao marcada entra no custo', () => {
  // O risco real desta fase: a versao antiga somava TODAS as linhas de
  // hospedagem sem olhar situacao. Com tres opcoes em Madrid com diaria
  // lancada, as tres entrariam no total e ele veria um numero errado sem
  // nada na tela indicando erro.
  const s = structuredClone(S);
  s.stayOptions = [
    opcao('madrid', { name: 'Chamberí', chosen: true, total_eur: 300 }),
    opcao('madrid', { name: 'Argüelles', total_eur: 400 }),
    opcao('madrid', { name: 'Tetuán', total_eur: 500 }),
  ];
  assert.equal(C.stayTotal(s, 'madrid'), 300, 'so a marcada');
  assert.equal(C.stayTotalAll(s, CIDADES_STAY), 300, 'as outras duas ficam de fora');
  assert.equal(C.staysOf(s, 'madrid').length, 3, 'mas as tres continuam na tela');
});

test('Fase 5 — a caixinha "ja paguei" so vale para o que esta no roteiro', () => {
  const s = structuredClone(S);
  const a = s.attractions.find((x) => x.status === 'backlog');
  a.price_eur = 20;
  a.paid = true;
  const base = C.pagoBrl(s, CIDADES_STAY);

  // marcada como paga mas FORA do roteiro: nao entra, porque tambem nao
  // entra no total. Pago maior que esperado seria incoerente.
  a.day_iso = null;
  assert.equal(C.pagoBrl(s, CIDADES_STAY), base);

  a.day_iso = '2026-12-12';
  assert.equal(Math.round(C.pagoBrl(s, CIDADES_STAY) - base), 124, '€ 20 x 6,20');
  assert.equal(C.aindaPorGastar(s, CIDADES_STAY), C.aindaPorGastar(S, CIDADES_STAY),
    'pagar nao muda o quanto falta: so muda de lado');
});

test('Fase 5 — hospedagem marcada como paga entra no ja pago', () => {
  const s = structuredClone(S);
  s.stayOptions = [opcao('lisboa', { chosen: true, total_eur: 100 })];
  const antes = C.pagoBrl(s, CIDADES_STAY);
  s.stayOptions[0].paid = true;
  assert.equal(Math.round(C.pagoBrl(s, CIDADES_STAY) - antes), 620, '€ 100 x 6,20');
});

test('5.10 — a caixinha comprado so move o dinheiro de lado', () => {
  const s = structuredClone(S);
  s.legs[0].amount = 120;                    // € 120
  const total = C.totalBrl(s, CIDADES_STAY);
  const pagoAntes = C.pagoBrl(s, CIDADES_STAY);
  assert.equal(Math.round(C.legBrl(s, 'falta')), Math.round(120 * 6.2), 'entra em previsto');
  assert.equal(C.legBrl(s, 'pago'), 0);

  s.legs[0].bought = true;
  assert.equal(C.totalBrl(s, CIDADES_STAY), total, 'o total real NAO muda');
  assert.equal(Math.round(C.legBrl(s, 'pago')), Math.round(120 * 6.2), 'move para ja pago');
  assert.equal(C.legBrl(s, 'falta'), 0);
  assert.ok(C.pagoBrl(s, CIDADES_STAY) > pagoAntes);

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
    Math.round(C.totalBrl(s, CIDADES_STAY) - C.pagoBrl(s, CIDADES_STAY)),
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
  assert.equal(C.cityOfBase(S, 'Lisboa'), 'lisboa');
  assert.equal(C.cityOfBase(S, 'Amsterdã'), 'amsterda');
  assert.equal(C.cityOfBase(S, 'Cáceres'), 'caceres');
  assert.equal(C.cityOfBase(S, 'em trânsito'), '');
  assert.equal(C.cityOfBase(S, ''), '');
  assert.equal(norm('Amsterdã'), 'amsterda');
});

test('10.2 — a cidade da base vem primeiro nos chips', () => {
  const cs = C.pickCities(S, 'roma');
  assert.equal(cs[0], 'roma');
  assert.equal(cs.length, Object.keys(CT).length, 'todas as 11, sem repetir');
  assert.equal(new Set(cs).size, cs.length);
  const fr = C.pickCities(S, 'metz');
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

/**
 * O ERRO DE MIL VEZES, e o teste que o tranca (06/09/2026).
 *
 * `parseNum` era `parseFloat(t.replace(',', '.'))`. Num app em portugues,
 * sobre dinheiro, "1.250,00" virava **1,25** — e nada na tela dizia nada. O
 * numero errado ia para o banco, somava no Painel e na Caixa, e so apareceria
 * como "por que o total esta tao baixo?" semanas depois.
 *
 * O simbolo da moeda era pior: "€ 90" dava `null`, e o campo simplesmente
 * nao guardava nada. O placeholder do formulario de hospedagem convida a
 * digitar "€ por noite".
 *
 * Este teste vale para o app INTEIRO: `parseNum` serve Hospedagem, Transporte,
 * Reservas, Custos, Atracoes e a Caixa.
 */
test('10.0 — parseNum entende dinheiro escrito como brasileiro escreve', () => {
  // o que ja funcionava tem que continuar identico
  assert.equal(parseNum('90'), 90);
  assert.equal(parseNum('90,50'), 90.5);
  assert.equal(parseNum('90.50'), 90.5);
  assert.equal(parseNum('1.5'), 1.5);
  assert.equal(parseNum('0,5'), 0.5);
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('abc'), null);

  // o ponto de MILHAR, que virava decimal e dividia por mil
  assert.equal(parseNum('2.400'), 2400, '"2.400" e dois mil e quatrocentos');
  assert.equal(parseNum('1.250,00'), 1250);
  assert.equal(parseNum('1.250.000'), 1250000);

  // o simbolo da moeda, que anulava o campo inteiro
  assert.equal(parseNum('€ 90'), 90);
  assert.equal(parseNum('90 €'), 90);
  assert.equal(parseNum('R$ 1.250,00'), 1250);

  // o formato que o anuncio em ingles mostra
  assert.equal(parseNum('2,400.50'), 2400.5);
  assert.equal(parseNum('12.99'), 12.99);

  // pontas
  assert.equal(parseNum('-45,5'), -45.5);
  assert.equal(parseNum('.5'), 0.5);
  assert.equal(parseNum('90,'), 90);
  assert.equal(parseNum('R$'), null, 'simbolo sem numero nao vira zero');
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

/** Um aporte de mentira, com id e created_at estaveis para o teste. */
/**
 * Um aporte da fixture. A `currency` entrou em 06/09 e e OBRIGATORIA:
 * desde entao cada aporte guarda a moeda em que foi feito, e somar sem
 * ela mistura euro com real. O padrao aqui e a moeda de quem lancou —
 * que e o que a tela grava —, e quem quiser testar moeda cruzada passa
 * a sexta posicao.
 */
const ap = (who, on_date, amount, label = '', i = 0, currency = null) => ({
  id: `${who}-${on_date}-${i}`, who, on_date, label, amount,
  currency: currency ?? (who === 'lu' ? 'eur' : 'brl'),
  created_at: `2026-01-0${i + 1}`,
});

test('11.8 — a falta se divide pelos meses que faltam ate dezembro', () => {
  const hoje = new Date(2026, 8, 4);            // setembro de 2026 -> 4 meses
  const s = structuredClone(S);
  s.savings.leo = { who: 'leo', goal: 4000, currency: 'brl' };
  assert.equal(C.mesesAte(hoje), 4);
  assert.equal(C.cxMes(s, 'leo', hoje), 1000);

  // um aporte de R$ 1.000 muda o que falta, nao o numero de meses
  s.contributions = [ap('leo', '2026-09-12', 1000, '13o salario')];
  assert.equal(C.cxTotal(s, 'leo'), 1000);
  assert.equal(C.cxFalta(s, 'leo'), 3000);
  assert.equal(C.mesesAte(hoje), 4, 'o mes corrente continua contando');
  assert.equal(C.cxMes(s, 'leo', hoje), 750);

  // ja em dezembro, sobra um mes so
  assert.equal(C.mesesAte(new Date(2026, 11, 20)), 1);
  assert.equal(C.cxMes(s, 'leo', new Date(2026, 11, 20)), 3000);
  // e em janeiro de 2027 nao divide por zero
  assert.equal(C.mesesAte(new Date(2027, 0, 5)), 1);

  assert.equal(plMes(3), 'nos 3 meses que sobram');
  assert.equal(plMes(1), 'no mês que sobra');
  assert.equal(plMesAte(1), 'pelo mês que falta até dezembro');
  assert.equal(plMesAte(4), 'pelos 4 meses até dezembro');
});

/**
 * O DEFEITO DE 06/09: trocar o seletor de moeda multiplicava o passado.
 *
 * A tabela `contribution` nao tinha coluna de moeda. A moeda de um aporte
 * era lida do seletor da PESSOA na hora de mostrar — nao era um fato
 * guardado. Entao lancar R$ 20.000 e depois trocar o seletor para euro
 * fazia os mesmos R$ 20.000 virarem EUR 20.000, que o Painel mostra como
 * R$ 124.000, sem nada na tela indicando que o numero mudou de sentido.
 *
 * O aporte agora carrega a propria moeda. Trocar o seletor passa a fazer
 * o que ele espera: mostrar o MESMO dinheiro na outra moeda.
 */
test('11.8 — trocar a moeda da pessoa NAO multiplica o que ela ja tem', () => {
  const s = structuredClone(S);
  s.settings.eur_rate = 6.2;
  s.savings.leo = { who: 'leo', goal: null, currency: 'brl' };
  s.contributions = [ap('leo', '2026-09-01', 20000, 'o que eu tinha', 0, 'brl')];

  assert.equal(C.cxTotal(s, 'leo'), 20000, 'em real, sao 20 mil');
  assert.equal(C.cxTotalBrl(s), 20000, 'e o geral tambem');

  // ele troca o seletor para euro. O dinheiro e o MESMO.
  s.savings.leo = { who: 'leo', goal: null, currency: 'eur' };
  assert.equal(Math.round(C.cxTotal(s, 'leo')), 3226, 'R$ 20.000 / 6,2 = EUR 3.226');
  assert.equal(Math.round(C.cxTotalBrl(s)), 20000, 'em reais continua 20 mil');

  // e o que NAO pode acontecer nunca mais:
  assert.notEqual(Math.round(C.cxTotalBrl(s)), 124000, 'nao pode multiplicar por 6,2');
});

test('11.8 — aportes em moedas diferentes somam certo', () => {
  const s = structuredClone(S);
  s.settings.eur_rate = 6.2;
  s.savings.leo = { who: 'leo', goal: null, currency: 'brl' };
  s.contributions = [
    ap('leo', '2026-09-01', 1000, 'salario', 0, 'brl'),
    ap('leo', '2026-09-02', 100, 'sobra da viagem', 1, 'eur'),
  ];
  // 1000 + (100 x 6,2) = 1620
  assert.equal(C.cxTotal(s, 'leo'), 1620);
  assert.equal(C.cxBrlDe(s, s.contributions[1]), 620, 'o aporte em euro vale 620 reais');
});

test('11.8 — varios aportes somam, e a lista vem em ordem de dia', () => {
  const s = structuredClone(S);
  s.contributions = [
    ap('leo', '2026-09-12', 1500, '13o salario', 1),
    ap('leo', '2026-08-28', 2200, 'notebook', 0),
    ap('lu',  '2026-09-03', 300,  'sobra do mes', 2),
    ap('leo', '2026-09-03', 400,  'sobra do mes', 3),
  ];
  assert.equal(C.cxTotal(s, 'leo'), 4100);
  assert.equal(C.cxTotal(s, 'lu'), 300);
  assert.equal(C.cxConta(s, 'leo'), 3);
  assert.equal(C.cxConta(s, null), 4);

  // do mais velho para o mais novo
  assert.deepEqual(C.cxLista(s, 'leo').map((c) => c.on_date),
    ['2026-08-28', '2026-09-03', '2026-09-12']);
  assert.equal(C.cxUltimo(s, 'leo').label, '13o salario');
  assert.equal(C.cxUltimo(s, 'lu').amount, 300);
  assert.equal(C.cxUltimo(structuredClone(S), 'leo'), null, 'sem aporte, sem ultimo');

  // aporte sem valor nao quebra a soma (regra 10.0: vazio e vazio)
  s.contributions.push(ap('leo', '2026-10-01', null, 'ainda vou lancar', 4));
  assert.equal(C.cxTotal(s, 'leo'), 4100);
});

test('11.8 — dois aportes no MESMO dia tem ordem estavel', () => {
  const s = structuredClone(S);
  s.contributions = [
    { id: 'b', who: 'leo', on_date: '2026-09-03', label: 'segundo', amount: 100, created_at: '2026-09-03T12:00:00Z' },
    { id: 'a', who: 'leo', on_date: '2026-09-03', label: 'primeiro', amount: 50, created_at: '2026-09-03T09:00:00Z' },
  ];
  assert.deepEqual(C.cxLista(s, 'leo').map((c) => c.label), ['primeiro', 'segundo']);
  // sem created_at, desempata pelo id — mas nunca fica ambiguo
  s.contributions = [
    { id: 'b', who: 'leo', on_date: '2026-09-03', label: 'b', amount: 100 },
    { id: 'a', who: 'leo', on_date: '2026-09-03', label: 'a', amount: 50 },
  ];
  assert.deepEqual(C.cxLista(s, 'leo').map((c) => c.label), ['a', 'b']);
});

test('11.8 — quem pensa em euro converte pelo cambio', () => {
  const s = structuredClone(S);
  s.savings.lu = { who: 'lu', goal: 500, currency: 'eur' };
  s.contributions = [ap('lu', '2026-09-01', 100, 'o que eu ja tinha', 0),
                     ap('lu', '2026-09-20', 50, 'sobra', 1)];
  assert.equal(C.cxCur(s, 'lu'), 'eur');
  assert.equal(C.cxCur(s, 'leo'), 'brl');
  assert.equal(C.cxTotal(s, 'lu'), 150);
  assert.equal(C.cxBrl(s, 150, 'lu'), 930);         // 150 x 6,20
  assert.equal(C.cxBrlDe(s, s.contributions[1]), 310);  // 50 x 6,20
  assert.equal(C.cxMoney(s, 150, 'lu'), '€ 150');
  assert.equal(C.cxMoney(s, 150, 'leo'), 'R$ 150');
  assert.equal(C.estimNaMoeda(s, 'lu'), ESTIM_EUR);
  assert.equal(C.estimNaMoeda(s, 'leo'), Math.round(ESTIM_EUR * 6.2));
});

test('11.8 — o geral soma os dois, cada um na sua moeda', () => {
  const hoje = new Date(2026, 8, 4);
  const s = structuredClone(S);
  s.savings.leo = { who: 'leo', goal: 16770, currency: 'brl' };
  s.savings.lu  = { who: 'lu',  goal: 2795,  currency: 'eur' };
  s.contributions = [
    ap('leo', '2026-09-01', 1000, 'o que eu ja tinha', 0),
    ap('leo', '2026-09-12', 1000, '13o salario', 1),
    ap('lu',  '2026-09-12', 100,  'sobra', 2),
  ];

  assert.equal(C.cxTotal(s, 'leo'), 2000);
  assert.equal(C.cxTotal(s, 'lu'), 100);
  // 2000 + 100 x 6,20
  assert.equal(C.cxTotalBrl(s), 2000 + 620);
  assert.equal(C.cxMetaBrl(s), 16770 + 2795 * 6.2);
  assert.equal(C.cxFaltaBrl(s), C.cxMetaBrl(s) - C.cxTotalBrl(s));
  assert.equal(C.cxMes(s, null, hoje), C.cxFaltaBrl(s) / 4);
  assert.ok(C.cxPct(s) > 0 && C.cxPct(s) < 100);

  // a lista do geral traz os dois, misturados por dia
  assert.equal(C.cxLista(s, null).length, 3);
  assert.equal(C.cxUltimo(s, null).on_date, '2026-09-12');
});

test('11.8 — sem meta, a falta e zero e a porcentagem tambem', () => {
  const s = structuredClone(S);
  s.contributions = [ap('leo', '2026-09-12', 500)];
  assert.equal(C.cxMetaBrl(s), 0);
  assert.equal(C.cxFaltaBrl(s), 0);
  assert.equal(C.cxPct(s), 0);
  assert.equal(C.cxFalta(s, 'leo'), 0, 'sem meta nao falta nada');
});

test('11.8 — created_at do Realtime e do PostgREST desempatam igual', () => {
  // A MESMA linha chega em dois formatos conforme o caminho:
  //   PostgREST '2026-09-04T09:00:00.123+00:00'   (espaco nenhum, com 'T')
  //   Realtime  '2026-09-04 15:00:00.123+00'      (com espaco)
  // Comparando como TEXTO, ' ' < 'T' e a das 15h viria antes da das 9h.
  const s = structuredClone(S);
  s.contributions = [
    { id: 'b', who: 'leo', on_date: '2026-09-04', label: '15h pelo Realtime',
      amount: 100, created_at: '2026-09-04 15:00:00.123+00' },
    { id: 'a', who: 'leo', on_date: '2026-09-04', label: '9h pelo PostgREST',
      amount: 50, created_at: '2026-09-04T09:00:00.123+00:00' },
  ];
  assert.deepEqual(C.cxLista(s, 'leo').map((c) => c.label),
    ['9h pelo PostgREST', '15h pelo Realtime'], 'a hora manda, nao o formato');

  // e o acumulado sai na ordem certa
  const l = C.cxLista(s, 'leo');
  assert.equal(l[0].amount, 50);
  assert.equal(l[0].amount + l[1].amount, 150);
});

test('11.8 — created_at ilegivel nao quebra a ordem', () => {
  const s = structuredClone(S);
  s.contributions = [
    { id: 'b', who: 'leo', on_date: '2026-09-04', label: 'b', amount: 1, created_at: 'lixo' },
    { id: 'a', who: 'leo', on_date: '2026-09-04', label: 'a', amount: 1 },
  ];
  // os dois viram 0 e o id desempata — o que importa e nunca ficar ambiguo
  assert.deepEqual(C.cxLista(s, 'leo').map((c) => c.label), ['a', 'b']);
});

test('10.0 — data so entra se existir de verdade, com ano plausivel', () => {
  assert.equal(isData('2026-09-12'), true);
  assert.equal(isData('2026-02-28'), true);
  assert.equal(isData('2026-02-29'), false, '2026 nao e bissexto');
  assert.equal(isData('2028-02-29'), true, '2028 e bissexto');
  assert.equal(isData(''), false);
  assert.equal(isData('2026-09'), false);
  // os anos parciais que o <input type="date"> produz enquanto se digita
  assert.equal(isData('0002-09-12'), false, 'ano 2');
  assert.equal(isData('0020-09-12'), false);
  assert.equal(isData('0202-09-12'), false);
  assert.equal(isData('2026-13-01'), false, 'mes 13');
  assert.equal(isData('2026-00-01'), false);
  assert.equal(isData('2026-09-31'), false, '31 de setembro nao existe');
  assert.equal(isData('2026-02-31'), false);
  assert.equal(isData('3000-01-01'), false, 'ano fora da faixa');
});

test('10.0 — hojeLocal e do fuso de quem olha, no formato do banco', () => {
  const h = hojeLocal();
  assert.match(h, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isData(h), true);
  const d = new Date();
  assert.equal(h.slice(0, 4), String(d.getFullYear()), 'usa o fuso local, nao UTC');
  assert.equal(+h.slice(8, 10), d.getDate());
});

test('11.8 — o dia do aporte vira rotulo sem passar por Date', () => {
  assert.equal(dtLabel('2026-09-12'), '12 set 26');
  assert.equal(dtLabel('2026-01-01'), '1 jan 26');
  assert.equal(dtLabel('2026-12-31'), '31 dez 26');
  assert.equal(dtLabel(''), '', 'vazio nao inventa data');
  assert.equal(dtLabel('2026-09'), '2026-09', 'so devolve o que nao entende');
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

/**
 * A TABELA DO CUSTOS TEM QUE FECHAR COM ELA MESMA.
 *
 * O rodape da tabela imprime `totalBrl`, e o corpo dela imprime uma linha por
 * categoria. Ate 07/09 as duas coisas batiam por acaso, nao por regra: nada
 * obrigava. Quando o item livre do dia entrou no `totalBrl` e nao virou linha,
 * o rodape passou a ser maior que a soma do corpo, sem nada explicando — e so
 * nao apareceu porque ainda nao existe nenhum item livre.
 *
 * Este teste escreve a soma do CORPO com os mesmos helpers que a tela usa, e
 * exige que de o rodape. Quem somar dinheiro novo no `totalBrl` e esquecer o
 * Custos quebra aqui, em vez de descobrir quando os numeros na tela
 * discordarem.
 */
test('11.9 — a soma das linhas do Custos da o total do rodape', () => {
  const s2 = structuredClone(S);
  s2.dayItems = [
    { id: 'd1', day_iso: '2026-12-16', name: 'Presente', note: '',
      amount: 40, currency: 'eur', day_pos: 0, done: false },
    { id: 'd2', day_iso: '2026-12-16', name: 'Lavanderia', note: '',
      amount: 35, currency: 'brl', day_pos: 1, done: false },
  ];
  const rt = C.rate(s2);

  // as colunas em EURO do corpo, na ordem em que a tela as desenha
  const somaEur = C.stayTotalAll(s2, CIDADES_STAY)
    + C.attrEurAll(s2, 'roteiro')
    + C.extraEur(s2)
    + C.legSum(s2, '').eur
    + C.bookingSum(s2, '').eur
    + C.dayItemEur(s2);

  // as colunas em REAL do corpo: o que ja nasce em real, e o voo
  const somaBrl = VOO
    + C.extraBrl(s2)
    + C.legSum(s2, '').brl
    + C.bookingBrl(s2, '')
    + C.dayItemBrl(s2);

  assert.equal(
    Math.round(somaEur * rt + somaBrl),
    Math.round(C.totalBrl(s2, CIDADES_STAY)),
    'o corpo da tabela tem que somar o rodape — se nao soma, falta uma linha',
  );

  // e o helper que a linha nova usa converte igual ao `legBrl`
  assert.equal(
    Math.round(C.dayItemTudoBrl(s2)),
    Math.round(40 * rt + 35),
    'dayItemTudoBrl = euro x cambio + real, igual ao legBrl',
  );
});

// ---------------- o numerozinho embaixo da bandeira (08/09/2026) ----------------
//
// Ele pediu: "em comida aparece quantas coisas registrei em cada pais. Quero
// que voce deixe esse numerozinho embaixo tambem na aba atracoes e hospedagem".
//
// O espaco NAO estava livre: as duas fitas ja mostravam DINHEIRO ali, e
// mostravam nada so porque o dinheiro dele ainda e zero nas duas. Trocar um
// numero por outro no mesmo lugar e barato de errar e caro de perceber, entao
// cada um dos dois significados fica preso aqui.

test('a fita de Atracoes conta as atracoes DELE, e o pais soma as cidades', () => {
  const soma = (k) => C.cidadesDe(S, k).reduce((a, c) => a + C.attrsDele(S, c).length, 0);

  assert.ok(soma('pt') > 0, 'a fixture tem atracoes dele em Portugal');
  assert.equal(C.attrCountCountry(S, 'pt', 'dele'), soma('pt'));
  assert.equal(C.attrCountCountry(S, 'es', 'dele'), soma('es'));

  // 'dele' e 'pesquisa' PARTEM o total: nenhuma atracao fica de fora dos dois,
  // e nenhuma e contada duas vezes. E o que garante que a fita nao minta.
  for (const k of ['pt', 'es', 'fr']) {
    assert.equal(
      C.attrCountCountry(S, k, 'dele') + C.attrCountCountry(S, k, 'pesquisa'),
      C.attrCountCountry(S, k),
      `${k}: dele + pesquisa tem que dar o total`,
    );
  }

  // A aba Atracoes e SO dele (regra de 06/09). Minha pesquisa nao pode
  // inflar o numero da bandeira — ela tem contagem propria em Sugestoes.
  assert.ok(C.attrCountCountry(S, 'pt', 'pesquisa') > 0, 'ha pesquisa minha em Portugal');
  assert.notEqual(C.attrCountCountry(S, 'pt', 'dele'), C.attrCountCountry(S, 'pt'));
});

test('a fita de Atracoes enxerga cidade que ELE criou, nao so as 11 fixas', () => {
  // `CT[cidade]` cru so conhece as 11: a cidade nova ficaria meio dentro
  // meio fora, com cartao numa tela e nada na bandeira. Ja mordeu antes.
  const s = structuredClone(S);
  s.cities = [{ id: 'c1', k: 'evora', n: 'Évora', co: 'pt', position: 0 }];
  const antes = C.attrCountCountry(s, 'pt', 'dele');
  s.attractions.push({
    id: 'a-evora', city: 'evora', name: 'Templo de Diana', price_eur: 0,
    note: '', status: 'backlog', kind: 'passeio', day_iso: null, seed_id: null,
  });
  assert.equal(C.attrCountCountry(s, 'pt', 'dele'), antes + 1);
});

test('a fita de Hospedagem conta OPCOES — stayCount conta BASES FECHADAS', () => {
  // Os dois numeros sao pequenos, ficam a dois cliques um do outro e dizem
  // coisas diferentes. Este teste existe para nunca trocarem de lugar.
  const s = structuredClone(S);
  s.stayOptions = [
    opcao('madrid', { name: 'Chamberí', chosen: true, address: 'Rua X, 1' }),
    opcao('madrid', { name: 'Argüelles' }),
    opcao('madrid', { name: 'Tetuán' }),
    opcao('lisboa', { name: 'Alfama' }),
  ];

  assert.equal(C.opcoesCount(s, ['madrid']), 3, 'as tres de Madrid, marcada ou nao');
  assert.equal(C.opcoesCount(s, ['lisboa']), 1);
  assert.equal(C.opcoesCount(s, CIDADES_STAY), 4, 'o pais soma as bases dele');
  assert.equal(C.opcoesCount(s, []), 0, 'pais sem base nenhuma');

  // e o numero que a fita NAO usa:
  assert.equal(C.stayCount(s, CIDADES_STAY), 1, 'so Madrid tem endereco na marcada');
  assert.notEqual(C.opcoesCount(s, CIDADES_STAY), C.stayCount(s, CIDADES_STAY));

  // opcao sem endereco e sem valor CONTA: o numero e "quantas eu registrei",
  // nao "quantas estao prontas".
  assert.equal(C.opcoesCount(s, ['lisboa']), 1);
  assert.equal(C.stayTotal(s, 'lisboa'), 0);
});

test('"dele" NAO e "fora do roteiro" — por num dia nao tira da lista dele', () => {
  // Sem este caso o teste de cima e VAZIO: na fixture nenhuma atracao esta
  // num dia, entao `!ehPesquisa` e `foraDoRoteiro` dao o mesmo numero e
  // trocar um pelo outro passa despercebido. Descoberto sabotando, 08/09.
  const s = structuredClone(S);
  const antes = C.attrCountCountry(s, 'pt', 'dele');

  const dele = s.attractions.find((x) => x.city === 'lisboa' && x.status !== 'sugerida');
  dele.day_iso = '2026-12-12';
  assert.equal(C.attrCountCountry(s, 'pt', 'dele'), antes, 'por num dia nao tira da lista dele');
  assert.equal(C.attrCountCountry(s, 'pt', 'fora'), antes - 1, 'mas sai do "ainda sem dia"');

  // A regra 5.13 ao contrario: pesquisa minha que ele poe num dia deixa de
  // ser pesquisa e passa a ser dele — e a bandeira tem que subir.
  const pesq = s.attractions.find((x) => x.city === 'lisboa' && x.status === 'sugerida');
  const pAntes = C.attrCountCountry(s, 'pt', 'pesquisa');
  pesq.day_iso = '2026-12-13';
  assert.equal(C.attrCountCountry(s, 'pt', 'dele'), antes + 1, 'adotada num dia vira dele');
  assert.equal(C.attrCountCountry(s, 'pt', 'pesquisa'), pAntes - 1, 'e sai da pesquisa');
});

// ============================================================
// "Cidades visitadas" — o terceiro numero do topo do Painel (09/09/2026).
//
// Ele pediu: "vai dando check conforme vou dando check no roteiro", e
// depois apontou o furo da primeira ideia: "em roteiro so tem as cidades
// que vou dormir, por exemplo, metz vou dormir mas de la vou pra
// estrasburgo, luxemburgo e colonia" — "vou dormir em 7 mas passar por
// umas 15".
//
// Por isso a conta NAO sai da base do dia. Sai da ATRACAO, que e a unica
// coisa no banco que carrega cidade e dia ao mesmo tempo: comida guarda
// pais, transporte nao guarda lugar nenhum. Uma atracao de Trier num dia
// com base em Metz e o que diz "neste dia eu estive em Trier".
//
// A regra dele, em duas linhas:
//   visitada  = metade ou mais das atracoes DAQUELA CIDADE que estao num
//               dia do roteiro marcadas como feitas;
//   o total   = as cidades que tem atracao num dia, ou seja as que ele se
//               propos a visitar. Nao as 11 fixas, nao as 7 bases.
// ============================================================

/** Uma atracao pronta para a conta, sem repetir os dez campos toda vez. */
function atr(city, extra = {}) {
  return {
    id: `x-${city}-${Math.random().toString(36).slice(2)}`,
    city, name: 'algo', price_eur: 0, note: '',
    status: 'escolhida', kind: 'passeio', day_iso: null,
    paid: false, seed_id: null, day_pos: 0, done: false,
    ...extra,
  };
}

test('cidades visitadas: metade das atracoes DO DIA feitas, e a cidade conta', () => {
  const s = structuredClone(S);
  s.attractions = [
    // Metz: 2 no roteiro, 1 feita -> metade, visitada.
    atr('metz', { day_iso: '2026-12-19', done: true }),
    atr('metz', { day_iso: '2026-12-20' }),
    // Estrasburgo: 3 no roteiro, 1 feita -> falta uma, ainda nao visitada.
    atr('estrasburgo', { day_iso: '2026-12-20', done: true }),
    atr('estrasburgo', { day_iso: '2026-12-20' }),
    atr('estrasburgo', { day_iso: '2026-12-20' }),
    // Trier: 1 no roteiro, nenhuma feita -> entra no total, nao no feito.
    atr('trier', { day_iso: '2026-12-21' }),
  ];

  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 1, total: 3 });

  // A segunda de Estrasburgo fecha a metade de 3.
  s.attractions[3].done = true;
  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 2, total: 3 });
});

test('cidades visitadas: TRIER conta igual a METZ, e e o ponto do numero', () => {
  // Trier e Estrasburgo nunca sao base de dia nenhum — sao bate-volta de
  // Metz. Se a conta saisse de `s.days[iso].base`, as duas seriam invisiveis
  // e o numero prometeria 7 cidades numa viagem de umas 15. Este teste falha
  // no minuto em que alguem trocar a atracao pela base.
  const s = structuredClone(S);
  s.attractions = [atr('trier', { day_iso: '2026-12-21', done: true })];

  const bases = new Set(Object.values(s.days).map((d) => (d.base ?? '').toLowerCase()));
  assert.ok(!bases.has('trier'), 'Trier nao e base de nenhum dia, e e de proposito');
  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 1, total: 1 });
});

test('cidades visitadas: o backlog nao entra, nem no total', () => {
  // A decisao dele: "so as que estao num dia de roteiro, afinal sao as que
  // vou me propor a visitar". Sem isto, registrar 10 atracoes em Madrid e
  // por 4 no roteiro deixaria Madrid presa em 40% para sempre.
  const s = structuredClone(S);
  s.attractions = [
    atr('madrid', { day_iso: '2026-12-16', done: true }),
    atr('madrid', { day_iso: '2026-12-17', done: true }),
    atr('madrid'),
    atr('madrid'),
    atr('madrid'),
    // Lisboa so tem backlog: nao e cidade que ele se propos a visitar ainda.
    atr('lisboa'),
    // ... nem quando a linha do backlog esta marcada como feita.
    atr('lisboa', { done: true }),
  ];

  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 1, total: 1 });
});

test('cidades visitadas: a fixture inteira da zero, porque nada tem dia', () => {
  assert.deepEqual(C.cidadesVisitadas(S), { feitas: 0, total: 0 });
});

test('cidades visitadas: FEITO nao e PAGO — comprar o ingresso nao visita a cidade', () => {
  // Os tres campos moram na mesma linha e querem dizer coisas diferentes:
  // `done` = "eu fiz", `paid`/`bought` = "eu paguei". Trocar um pelo outro
  // aqui faria Roma contar como visitada em outubro, quando ele comprar o
  // ingresso do Coliseu de casa. Descoberto sabotando, 09/09.
  const s = structuredClone(S);
  s.attractions = [atr('roma', { day_iso: '2027-01-02', paid: true })];
  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 0, total: 1 });

  s.attractions[0].done = true;
  assert.deepEqual(C.cidadesVisitadas(s), { feitas: 1, total: 1 });
});

// ============================================================
// Os TRES numeros do topo de Atracoes (09/09/2026), da lista de 08/09.
//
// Eram quatro: "Espanha, no roteiro", "no roteiro, na viagem", "em reais",
// "fora do roteiro somaria". Ele pediu tres: o custo real do pais (EUR
// grande, R$ embaixo), a % desse custo, e o custo do que ficou de fora.
//
// Duas decisoes dele na conversa de 09/09, e as duas mudam a formula:
//   - a % e sobre o TOTAL DAS ATRACOES da viagem, nao sobre o custo da
//     viagem inteira ("so o total das atracoes");
//   - os TRES seguem a bandeira clicada ("os tres seguem o pais"), e nao
//     so o primeiro como era antes.
// ============================================================

test('a % de Atracoes e a fatia do pais no custo de atracoes da viagem', () => {
  const s = structuredClone(S);
  s.attractions = [
    atr('madrid', { day_iso: '2026-12-16', price_eur: 30 }),   // es: 30
    atr('caceres', { day_iso: '2026-12-11', price_eur: 10 }),  // es: 10
    atr('lisboa', { day_iso: '2026-12-12', price_eur: 60 }),   // pt: 60
    atr('madrid', { price_eur: 500 }),                          // backlog: nao conta
  ];
  // 40 de 100 -> Espanha e 40% das atracoes da viagem.
  assert.equal(C.attrPctPais(s, 'es'), 40);
  assert.equal(C.attrPctPais(s, 'pt'), 60);
  assert.equal(C.attrPctPais(s, 'fr'), 0, 'pais sem atracao no roteiro nao tem fatia');

  // As fatias de todos os paises somam 100 — se nao somarem, o denominador
  // esta errado (e o erro que passa desapercebido: usar o custo da viagem
  // toda no lugar do custo das atracoes).
  const soma = ['es', 'pt', 'fr', 'lu', 'de', 'nl', 'it']
    .reduce((a, k) => a + C.attrPctPais(s, k), 0);
  assert.equal(Math.round(soma), 100);
});

test('a % nao explode quando nada esta no roteiro ainda', () => {
  // O caso de hoje: 35 atracoes dele, nenhuma num dia. 0/0 em JS e NaN, e
  // "NaN%" no topo da aba dele. E o que a tela mostraria neste minuto.
  const s = structuredClone(S);
  s.attractions = s.attractions.map((a) => ({ ...a, day_iso: null }));
  assert.equal(C.attrPctPais(s, 'es'), 0);
  assert.ok(Number.isFinite(C.attrPctPais(s, 'es')), 'a % tem que ser numero, nunca NaN');
});

test('a % conta a cidade que ELE criou no pais dela', () => {
  // `cidadesDe` ja resolve isso, e este teste existe para a % nao passar a
  // usar `CT` cru um dia — Sevilha (criada por ele em 09/09) e espanhola.
  const s = structuredClone(S);
  s.cities = [{ id: 'c1', k: 'sevilha', n: 'Sevilha', co: 'es', position: 0 }];
  s.attractions = [
    atr('sevilha', { day_iso: '2026-12-16', price_eur: 25 }),
    atr('lisboa', { day_iso: '2026-12-12', price_eur: 75 }),
  ];
  assert.equal(C.attrPctPais(s, 'es'), 25);
});
