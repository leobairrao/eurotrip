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
//
// ESTE TESTE MUDOU DE FUNCAO EM 09/09, e nao de valor: as 8 bases e as 31
// noites continuam existindo — mas como PLANO (`planoBlocos`, que le o
// `day.base` do meu arquivo), e nao como reserva. `baseList` e `nightsAll`
// passaram a contar so airbnb marcado, porque foi o que ele pediu: "o lugar
// que vou dormir so aparece quando eu selecionar uma das opcoes".
//
// A regra do `nt = d - 1` na ultima base MORREU junto. Ela existia porque
// as noites saiam de dias de calendario; com check-in e check-out de
// verdade, a reserva ja diz quantas noites sao.
test('11.2 — o PLANO tem 8 bases e 31 dias; a RESERVA, zero', () => {
  const plano = C.planoBlocos(S).filter((b) => !C.ehTransito(b.base));
  assert.equal(plano.length, 8, 'as 8 bases que eu planejei continuam no arquivo');
  assert.equal(plano.reduce((a, b) => a + b.n, 0), 32, 'os 32 dias em terra do plano');

  assert.deepEqual(C.baseList(S), [], 'e nenhuma delas e reserva');
  assert.equal(C.nightsAll(S), 0, 'ele ainda nao marcou airbnb nenhum');

  // o rodape continua fechando, e agora sem depender de reserva nem semente
  assert.equal(C.groundDays(S), 32);
  assert.equal(C.flyDays(S), 2);
  assert.equal(C.groundDays(S) + C.flyDays(S), 34);
  const ult = plano[plano.length - 1];
  assert.equal(ult.n, 2, 'o plano termina com dois dias em Madrid');
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
 *   1. Madrid devolve DUAS entradas, [3, 2], e nao a soma;
 *   2. ela le o PLANO (`planoBlocos`) desde 09/09, e conta DIAS. Lia
 *      `baseList`, que agora e reserva — a dica diria de volta o que ele
 *      acabou de reservar. E a regra do `-1` na ultima base morreu com as
 *      noites saindo do check-in/check-out, e por isso a segunda passagem
 *      por Madrid vale 2 e nao 1;
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

// A dica da aba Hospedagem le o PLANO desde 09/09 (antes lia `baseList`,
// que agora e reserva — a dica diria de volta o que ele acabou de
// reservar). E o plano conta DIAS, nao noites: os `[3, 1]` de Madrid eram
// `[3, 2]` menos o -1 da ultima base, aquela regra que morreu. A tela
// tambem passou a dizer "dias".
test('11.2 — a dica de dias devolve uma entrada por passagem, nao a soma', () => {
  assert.deepEqual(C.noitesEm(S, 'madrid'), [3, 2], '3 dias no comeco, 2 no fim');
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
  // e o total tem que fechar com os 32 dias em terra (Paris nao tem base)
  const soma = CIDADES_STAY.reduce((a, c) => a + C.noitesEm(S, c).reduce((x, y) => x + y, 0), 0);
  assert.equal(soma, C.groundDays(S), 'a dica cobre os 32 dias em terra do plano');

  assert.deepEqual(C.noitesEm(S, 'paris'), [], 'Paris virou bate-volta: nenhuma noite');
  assert.deepEqual(C.noitesEm(S, ''), [], 'cidade vazia nao explode');
  assert.deepEqual(C.noitesEm(S, 'cidade-que-nao-existe'), []);
});

test('11.2 — "em transito" nao e base, nem no plano nem na reserva', () => {
  assert.equal(C.planoBlocos(S).length, 10);   // 8 bases + 2 blocos de transito
  assert.equal(C.planoBlocos(S).filter((b) => C.ehTransito(b.base)).length, 2);

  // Na RESERVA nem chega a existir: estadia sai de airbnb marcado, e nao ha
  // como marcar um airbnb "em trânsito".
  assert.ok(!C.baseList(S).some((b) => /trânsito/i.test(b.base)));
  assert.deepEqual(C.estadias(S), []);
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
  // AS DATAS SUBSTITUIRAM O CAMPO `nights` em 09/09, e e decisao dele
  // ("as noites saem das datas"). A regra 5.7 nao mudou — total lancado
  // continua ganhando da diaria x noites; o que mudou e DE ONDE vem o
  // numero de noites. Este teste dizia `nights: 4` sem data nenhuma, o que
  // hoje e uma opcao sem noite. As quatro noites agora sao 12, 13, 14 e 15
  // de dezembro: entra no 12, sai no 16.
  const s = structuredClone(S);
  s.stayOptions = [opcao('lisboa', {
    chosen: true, nightly_eur: 68,
    check_in: '2026-12-12', check_out: '2026-12-16',
  })];
  assert.equal(C.noitesDaOpcao(s.stayOptions[0]), 4, 'as datas dao quatro noites');
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
// A TABELA DO ROTEIRO PASSOU A SER "AS ESTADIAS QUE EU RESERVEI" (09/09),
// entao com a fixture ela e vazia. As 8 linhas do plano continuam provadas
// no teste 11.2, em `planoBlocos`. Aqui provamos o que a tabela mostra
// quando ele reserva — e que o bate-volta continua saindo pela cidade.
test('10.1 — a tabela do roteiro mostra as estadias reservadas', () => {
  assert.deepEqual(C.baseList(S), [], 'vazia enquanto ele nao marcar airbnb');

  const s = structuredClone(S);
  s.stayOptions = [
    opc('lisboa', { chosen: true, name: 'Alfama', check_in: '2026-12-12', check_out: '2026-12-16' }),
    opc('metz', { chosen: true, name: 'Catedral', check_in: '2026-12-19', check_out: '2026-12-26' }),
    // Madrid duas vezes: as duas viram linha, e e o caso que a regra
    // antiga de "uma marcada por cidade" tornava impossivel.
    opc('madrid', { chosen: true, name: 'Chamberí', check_in: '2026-12-16', check_out: '2026-12-19' }),
    opc('madrid', { chosen: true, name: 'Aeroporto', check_in: '2027-01-11', check_out: '2027-01-12' }),
  ];

  const bases = C.baseList(s);
  assert.deepEqual(bases.map((b) => b.base), ['Lisboa', 'Madrid', 'Metz', 'Madrid'],
    'em ordem de DATA, e Madrid aparece nas duas pontas');
  assert.deepEqual(bases.map((b) => b.nt), [4, 3, 7, 1]);
  assert.equal(C.nightsAll(s), 15, 'as noites sao a soma do que ele reservou');

  // o bate-volta continua saindo pela CIDADE, e sem o caso do ultimo dia
  // (ele vinha do -1 que morreu com a regra das noites)
  assert.equal(C.baseOut('Lisboa'), 'Sintra e Cascais');
  assert.equal(C.baseOut('Metz'), 'Luxemburgo, Estrasburgo, Trier, Nancy ou Colmar');
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

// ============================================================
// "COMPRO ANTES" vs "PAGO LA", e o GASTO REAL  (09/09/2026)
//
// O item mais pesado da lista de 08/09, e ele decidiu os quatro de uma vez.
// O desenho inteiro esta em
// docs/superpowers/specs/2026-09-09-comprar-antes-design.md.
//
// TRES NUMEROS QUE NAO SAO O MESMO, e e disto que este arquivo cuida:
//
//   pagoBrl      — o que comprei ANTES e ja paguei. A frase dele:
//                  "hospedagem, aviao, documentos, seguros, voos NA europa,
//                  trens entre paises, atracoes que sao com antecedencia".
//   estimadoBrl  — DINHEIRO NA MAO: "o quanto vou ter que levar em dinheiro
//                  para viver la esse periodo". Comida entra aqui.
//   gastoBrl     — TUDO que saiu do bolso, no valor real. E a resposta da
//                  frase dele: "no final da viagem quero saber qual foi o
//                  total de todas as coisas".
//
// Somar os tres para "conferir" da numero errado de proposito: sao tres
// perguntas diferentes, nao tres parcelas de um bolo.
// ============================================================

/** Um trecho pronto para a conta. */
function trecho(extra = {}) {
  return {
    id: `t-${Math.random().toString(36).slice(2)}`, position: 0,
    name: 'trecho', note: '', kind: 'trem', amount: 100, currency: 'eur',
    bought: false, buy_ahead: false, spent: null,
    day_iso: null, seed_id: null, day_pos: 0, done: false,
    ...extra,
  };
}
/** Uma comida pronta para a conta. */
function comida(extra = {}) {
  return {
    id: `f-${Math.random().toString(36).slice(2)}`, country: 'es',
    name: 'lugar', note: '', kind: 'restaurante',
    price_eur: 0, spent_eur: null,
    day_iso: null, seed_id: null, day_pos: 0, done: false,
    ...extra,
  };
}

test('o valor de uma linha e o REAL quando existe, e o planejado quando nao', () => {
  // A regra do app inteiro depois de 09/09, e a que faz nenhum numero de
  // hoje mudar: `spent ?? planejado`. O exemplo e dele — o passeio de 22
  // que custou 22 (um clique), e a alimentacao de 25 que custou 30.
  assert.equal(C.atrValor(atr('madrid', { price_eur: 22 })), 22);
  assert.equal(C.atrValor(atr('madrid', { price_eur: 22, spent_eur: 22 })), 22);
  assert.equal(C.atrValor(atr('madrid', { price_eur: 25, spent_eur: 30 })), 30);

  // ZERO REAL NAO E "SEM VALOR": o passeio que ele achou que custava 20 e
  // no fim era gratis vale 0, e nao 20. `?? ` respeita o zero; `||` nao —
  // e e por isso que a funcao usa `??`.
  assert.equal(C.atrValor(atr('madrid', { price_eur: 20, spent_eur: 0 })), 0);

  assert.equal(C.legValor(trecho({ amount: 100 })), 100);
  assert.equal(C.legValor(trecho({ amount: 100, spent: 137.5 })), 137.5);
  assert.equal(C.comidaValor(comida({ price_eur: 25, spent_eur: 30 })), 30);
});

test('estimado e DINHEIRO NA MAO: o que ele paga la, e nada mais', () => {
  const s = structuredClone(S);
  s.attractions = [
    // no roteiro, pago la -> entra
    atr('madrid', { day_iso: '2026-12-16', price_eur: 40 }),
    // no roteiro, mas comprado antes -> NAO entra: nao vai no bolso la
    atr('madrid', { day_iso: '2026-12-16', price_eur: 60, buy_ahead: true }),
    // no roteiro e JA PAGO -> NAO entra: ja saiu
    atr('madrid', { day_iso: '2026-12-17', price_eur: 15, paid: true }),
    // no backlog -> NAO entra: ele nem decidiu fazer
    atr('madrid', { price_eur: 900 }),
  ];
  s.foods = [
    comida({ day_iso: '2026-12-16', price_eur: 25 }),   // entra
    comida({ day_iso: '2026-12-17', price_eur: 30, done: true }), // ja comeu: saiu
    comida({ price_eur: 50 }),                          // sem dia: nao entra
  ];
  s.legs = [
    trecho({ amount: 8, buy_ahead: false }),            // metro: entra
    trecho({ amount: 200, buy_ahead: true }),           // voo: NAO entra
    trecho({ amount: 12, buy_ahead: false, bought: true }), // ja comprou: nao entra
    trecho({ amount: 33, currency: 'brl' }),            // entra, do lado de R$
  ];
  s.dayItems = [];

  const x = C.estimadoSides(s);
  assert.equal(x.eur, 40 + 25 + 8, 'atracao paga la + comida do dia + metro');
  assert.equal(x.brl, 33);
  assert.equal(C.estimadoBrl(s), (40 + 25 + 8) * C.rate(s) + 33);
});

test('gasto real e SO o que ele conferiu, e comida entra', () => {
  // "dou um check e ele entra para os gastos". O check e a caixinha que ja
  // existe: `paid` em atracao, `bought` em trecho, `done` em comida.
  const s = structuredClone(S);
  s.attractions = [
    atr('madrid', { day_iso: '2026-12-16', price_eur: 22, paid: true, spent_eur: 22 }),
    atr('madrid', { day_iso: '2026-12-16', price_eur: 40 }),  // nao conferido
  ];
  s.foods = [
    comida({ day_iso: '2026-12-16', price_eur: 25, done: true, spent_eur: 30 }),
    comida({ day_iso: '2026-12-17', price_eur: 25 }),         // nao comeu ainda
  ];
  s.legs = [trecho({ amount: 100, bought: true, spent: 137.5 })];
  s.dayItems = [];
  s.stayOptions = [];
  s.bookings = [];

  const x = C.gastoSides(s);
  assert.equal(x.eur, 22 + 30 + 137.5, 'o passeio, a alimentacao corrigida e o trem');
  assert.equal(x.brl, 0);

  // O exemplo dele por inteiro: planejado 22 + 25 = 47, gasto 22 + 30 = 52.
  const doDia = C.gastoSidesDoDia(s, '2026-12-16');
  assert.equal(doDia.eur, 52, 'o dia 16 gastou 52, e nao os 47 planejados');
});

test('gasto real: a linha conferida SEM valor real vale o planejado', () => {
  // A tela preenche o real com o planejado no clique, mas se alguem marcar
  // por outro caminho (o eco do tempo real, um F5 no meio) a linha nao pode
  // valer zero: ela vale o que estava planejado.
  const s = structuredClone(S);
  s.attractions = [atr('madrid', { day_iso: '2026-12-16', price_eur: 22, paid: true })];
  s.foods = [];
  s.legs = [];
  s.dayItems = [];
  s.stayOptions = [];
  s.bookings = [];
  assert.equal(C.gastoSides(s).eur, 22);
});

test('trechos que compro antes: o x de y da Tabela 3', () => {
  const s = structuredClone(S);
  s.legs = [
    trecho({ buy_ahead: true, bought: true }),
    trecho({ buy_ahead: true }),
    trecho({ buy_ahead: true }),
    trecho({ buy_ahead: false }),           // metro: nao conta em nenhum lado
    trecho({ buy_ahead: false, bought: true }),
  ];
  assert.deepEqual(C.legAhead(s), { pegos: 1, total: 3 });

  // A CONFUSAO DE UMA LETRA: `bought` no lugar de `buy_ahead` daria
  // { pegos: 2, total: 5 } — dois numeros plausiveis, e errados.
  assert.notDeepEqual(C.legAhead(s), { pegos: 2, total: 5 });
});

test('comida NAO entra no custo total da viagem, e e decisao dele', () => {
  // Ele ja lanca "comida em Madrid" como linha na aba Custos. Somar a
  // comida com valor aqui contaria o mesmo dinheiro duas vezes, e ele
  // escolheu a opcao 2: o custo total continua vindo da linha de Custos.
  const s = structuredClone(S);
  const antes = C.totalBrl(s, CIDADES_STAY);
  s.foods = [
    comida({ day_iso: '2026-12-16', price_eur: 25 }),
    comida({ day_iso: '2026-12-17', price_eur: 30, done: true, spent_eur: 40 }),
  ];
  assert.equal(C.totalBrl(s, CIDADES_STAY), antes, 'comida nao mexe no total da viagem');

  // Mas ela mexe nos dois numeros onde ELE quer que mexa.
  assert.ok(C.estimadoBrl(s) > 0, 'comida entra no dinheiro que ele leva');
  assert.equal(C.gastoSides(s).eur, 40, 'e a comida conferida entra no gasto real');
});

test('o total da viagem passa a ler o valor REAL de atracao e trecho', () => {
  const s = structuredClone(S);
  s.attractions = [atr('madrid', { day_iso: '2026-12-16', price_eur: 20 })];
  s.legs = [trecho({ amount: 100 })];
  s.dayItems = [];
  const planejado = C.totalBrl(s, CIDADES_STAY);

  // A atracao custou 30 em vez de 20: o total da viagem sobe 10, nao fica
  // preso no chute. E o trem que saiu por 90 desce 10.
  s.attractions[0].spent_eur = 30;
  s.legs[0].spent = 90;
  assert.equal(C.totalBrl(s, CIDADES_STAY), planejado + 10 * C.rate(s) - 10 * C.rate(s));
  assert.equal(C.attrEurAll(s, 'roteiro'), 30);
});

// ============================================================
// A BASE DO DIA JA VEM DO BANCO — e isto corrige o que eu escrevi em
// 08/09 no doc da lista dele (09/09/2026).
//
// Eu havia dito que "os dias de cada base vem de ARQUIVO (STAYS em
// src/content)" e que mexer nisso "muda a espinha do app". Errado:
//
//   `blocks()` e `baseList()` leem `s.days[iso].base`, que e coluna do
//   banco e campo de texto LIVRE no cartao "o dia" do Roteiro.
//
//   `STAYS` (hospedagem.json) e outra coisa: as 7 cidades de HOSPEDAGEM.
//   So a aba Hospedagem e o argumento `cities` das contas de dinheiro a
//   usam. Ela NAO e o calendario.
//
//   Do arquivo vem mesmo: os 34 dias (`ISOS`), as 7 de hospedagem
//   (`STAYS`) e os textos de bate-volta (`BASEOUT`).
//
// Consequencia pratica, e e ela que importa: "acrescentar cidade de
// dormir", "editar o nome" e "quantos dias fica em cada uma" NAO PRECISAM
// DE SQL. As datas dos 34 dias sao fixas; o que muda e a base de cada dia.
// ============================================================

// ESTES DOIS MUDARAM DE FUNCAO na mesma tarde em que nasceram: eles
// provavam que a base do dia vem do BANCO e nao do arquivo, o que continua
// verdade — mas a base virou o PLANO dele, e quem manda no bloco e na
// noite agora e o airbnb marcado. Por isso leem `planoBlocos`, e asseguram
// que o plano NAO vira noite.
test('cidade de dormir NOVA entra num bloco de PLANO, sem SQL e sem arquivo', () => {
  const s = structuredClone(S);
  const antes = C.planoBlocos(s).length;

  // Colonia, que ele citou na conversa de 09/09 e nao existe em lugar
  // nenhum do repositorio: nem em paises-cidades.json, nem em STAYS.
  s.days['2026-12-23'] = { iso: '2026-12-23', base: 'Colônia', plan: '' };

  const bl = C.planoBlocos(s);
  assert.ok(bl.some((b) => b.base === 'Colônia'), 'a base nova nao virou bloco de plano');
  assert.ok(bl.length > antes, 'ela partiu o bloco de Metz em dois');

  // MAS NAO VIRA NOITE: escrever no plano nao reserva nada.
  assert.equal(C.nightsAll(s), 0, 'o plano dele nao inventa noite reservada');
  assert.equal(C.groundDays(s) + C.flyDays(s), ISOS.length, 'o rodape continua fechando em 34');
  assert.equal(C.baseOut('Colônia'), '—',
    'base sem texto de bate-volta devolve o travessao, e nao estoura');
});

test('mudar a base de um dia MOVE o dia de bloco no plano', () => {
  // E isto que "arrastar os dias de uma cidade para outra" vai fazer por
  // baixo: reescrever `day.base` de uma FAIXA de dias. As datas dos 34
  // dias nao se movem — so a base de cada um.
  const s = structuredClone(S);
  const dias = (nome) => C.planoBlocos(s).filter((b) => b.base === nome).reduce((a, b) => a + b.n, 0);
  const metzAntes = dias('Metz');
  const reimsAntes = dias('Reims');

  // o ultimo dia de Metz passa a ser de Reims
  const dia = Object.keys(s.days).filter((i) => s.days[i].base === 'Metz').sort().pop();
  s.days[dia] = { ...s.days[dia], base: 'Reims' };

  assert.equal(dias('Metz'), metzAntes - 1, 'Metz perdeu um dia no plano');
  assert.equal(dias('Reims'), reimsAntes + 1, 'Reims ganhou um');
  assert.equal(C.groundDays(s) + C.flyDays(s), ISOS.length, 'e o total continua 34');
});

// ============================================================
// A CAMA VEM DA HOSPEDAGEM  (09/09/2026)
//
// Ideia dele, e ela inverte de onde vem a base do dia:
//
//   "a caixinha de onde durmo deve fazer a seguinte leitura: pegar a
//    hospedagem que esta paga para aquele dia (na aba hospedagem) e
//    atribuir automaticamente como a base daquele dia. Mas para isso eu vou
//    ter que primeiro fazer as pesquisas de possiveis airbnbs para as
//    cidades e quando eu selecionar um (com uma checkbox de escolhido na
//    aba hospedagens) ele vai pegar a data e automaticamente vai incluir no
//    roteiro"
//
// PARA ISSO AS DATAS TIVERAM QUE VIRAR DATAS. Ate 09/09 `check_in` e
// `check_out` eram TEXTO LIVRE, com placeholder "ex. dia 12 - 15h" — nao ha
// como tirar uma faixa de dias de "dia 12 - 15h". Ele tinha "12" nos dois
// campos e 3 noites, que e impossivel, e era dado de teste.
//
// A CONTA DA VESPERA: os dias da opcao vao do check-in ate a VESPERA do
// check-out. Na manha do check-out ele ja nao dorme la. Errar isto rouba ou
// da uma noite em cada uma das 7 bases.
// ============================================================

function opc(city, extra = {}) {
  return {
    id: `o-${Math.random().toString(36).slice(2)}`, city, name: 'um airbnb',
    note: '', nightly_eur: 100, nights: null, total_eur: null,
    address: 'Rua X, 1', check_in: '', check_out: '', link: '',
    chosen: false, paid: false, position: 0, seed_id: null,
    ...extra,
  };
}

test('os dias de uma opcao vao do check-in a VESPERA do check-out', () => {
  const o = opc('metz', { check_in: '2026-12-19', check_out: '2026-12-26' });
  const dias = C.diasDaOpcao(o);
  assert.equal(dias.length, 7, 'sete noites, do 19 ao 25');
  assert.equal(dias[0], '2026-12-19');
  assert.equal(dias.at(-1), '2026-12-25', 'o dia 26 e o check-out: ele ja nao dorme la');
  assert.equal(C.noitesDaOpcao(o), 7);
});

test('opcao sem data, ou com data fora da viagem, nao pega dia nenhum', () => {
  assert.deepEqual(C.diasDaOpcao(opc('metz')), [], 'sem datas, nenhum dia');
  assert.deepEqual(C.diasDaOpcao(opc('metz', { check_in: '12', check_out: '12' })), [],
    'o texto livre de antes de 09/09 nao vira faixa nenhuma');
  assert.deepEqual(C.diasDaOpcao(opc('metz', { check_in: '2026-11-01', check_out: '2026-11-05' })), [],
    'novembro nao esta nos 34 dias da viagem');

  // uma faixa que COMECA antes da viagem entra pela parte que cabe
  const meia = C.diasDaOpcao(opc('caceres', { check_in: '2026-12-08', check_out: '2026-12-12' }));
  assert.deepEqual(meia, ['2026-12-10', '2026-12-11'], 'so os dias que existem no calendario');
});

test('check-out antes do check-in nao inventa dia', () => {
  assert.deepEqual(C.diasDaOpcao(opc('metz', { check_in: '2026-12-25', check_out: '2026-12-19' })), []);
  assert.deepEqual(C.diasDaOpcao(opc('metz', { check_in: '2026-12-19', check_out: '2026-12-19' })), [],
    'entrar e sair no mesmo dia e zero noite');
});

test('sobreposicao: a opcao marcada em OUTRA cidade bloqueia a nova', () => {
  // Decisao dele: "O app recusa e avisa". Sem isso, um erro de digitacao na
  // data mudaria a base de dias de outra cidade sem ele notar.
  const s = structuredClone(S);
  s.stayOptions = [
    opc('lisboa', { chosen: true, check_in: '2026-12-12', check_out: '2026-12-16' }),
    opc('madrid', { chosen: true, check_in: '2026-12-16', check_out: '2026-12-19' }),
  ];
  const nova = opc('metz', { check_in: '2026-12-15', check_out: '2026-12-20' });

  const bate = C.opcoesQueBatem(s, nova);
  assert.equal(bate.length, 2, 'ela pisa em Lisboa e em Madrid');
  assert.deepEqual(bate.map((x) => x.city).sort(), ['lisboa', 'madrid']);

  // encostar NAO e sobrepor: check-out de uma no check-in da outra e o
  // caso normal de trocar de cidade, e nao pode ser recusado.
  const encosta = opc('metz', { check_in: '2026-12-19', check_out: '2026-12-26' });
  assert.deepEqual(C.opcoesQueBatem(s, encosta), [],
    'sair de Madrid no dia 19 e dormir em Metz no dia 19 e o certo');

  // e ela nao briga consigo mesma
  const ela = s.stayOptions[0];
  assert.deepEqual(C.opcoesQueBatem(s, ela), [], 'a propria opcao nao conta');

  // opcao NAO marcada nao bloqueia nada
  s.stayOptions[0].chosen = false;
  assert.deepEqual(C.opcoesQueBatem(s, nova).map((x) => x.city), ['madrid']);
});

test('as noites SAEM das datas, e o total nao pode mais discordar', () => {
  // Decisao dele de 09/09. O campo digitado nao existe mais: a opcao dele
  // tinha 3 noites com as duas datas iguais, que e impossivel, e ninguem
  // via. Com `total_eur` preenchido a regra 5.7 continua mandando.
  const o = opc('metz', { check_in: '2026-12-19', check_out: '2026-12-26', nightly_eur: 100, nights: 99 });
  assert.equal(C.noitesDaOpcao(o), 7, 'as datas mandam, e nao o 99 digitado');
  assert.equal(C.stayValor(o), 700, 'diaria x noites das datas');

  const comTotal = { ...o, total_eur: 640 };
  assert.equal(C.stayValor(comTotal), 640, 'total preenchido continua ganhando (regra 5.7)');

  const semData = opc('metz', { nightly_eur: 100, nights: 7 });
  assert.equal(C.noitesDaOpcao(semData), 0, 'sem datas nao ha noite');
  assert.equal(C.stayValor(semData), 0, 'e sem noite a diaria nao vira total sozinha');
});

test('a hospedagem do dia: qual opcao marcada cobre aquele dia', () => {
  const s = structuredClone(S);
  s.stayOptions = [
    opc('metz', { chosen: true, check_in: '2026-12-19', check_out: '2026-12-26' }),
    opc('reims', { chosen: false, check_in: '2026-12-26', check_out: '2026-12-29' }),
  ];
  assert.equal(C.hospedagemDoDia(s, '2026-12-20')?.city, 'metz');
  assert.equal(C.hospedagemDoDia(s, '2026-12-25')?.city, 'metz', 'a ultima noite ainda e dela');
  assert.equal(C.hospedagemDoDia(s, '2026-12-26'), null, 'o dia do check-out nao e mais dela');
  assert.equal(C.hospedagemDoDia(s, '2026-12-18'), null, 'antes do check-in tambem nao');
  assert.equal(C.hospedagemDoDia(s, '2026-12-27'), null, 'a de Reims nao esta marcada');
});

test('as cidades que ele PASSA num dia saem das atracoes, e tiram a base', () => {
  // A inversao que ele pediu: "nela aparece as cidades que vou passar e as
  // cidades que vou dormir vao aparecer no fim da lista". A cidade de
  // passagem sai da ATRACAO, a unica linha com cidade e dia.
  const s = structuredClone(S);
  s.days['2026-12-21'] = { iso: '2026-12-21', base: 'Metz', plan: '' };
  s.attractions = [
    atr('trier', { day_iso: '2026-12-21' }),
    atr('trier', { day_iso: '2026-12-21' }),
    atr('luxemburgo', { day_iso: '2026-12-21' }),
    atr('metz', { day_iso: '2026-12-21' }),      // a base: nao e "passar"
    atr('estrasburgo', { day_iso: '2026-12-20' }),
    // O BACKLOG NAO E PASSAGEM. Sem este caso o teste acima e VAZIO: com
    // todas as atracoes num dia, aceitar `day_iso === null` daria o mesmo
    // resultado e trocar um pelo outro passaria verde. Descoberto
    // sabotando, 09/09.
    atr('roma', {}),
  ];

  const c = C.cidadesDoDia(s, '2026-12-21');
  assert.deepEqual(c, ['Luxemburgo', 'Trier'], 'sem repetir, em ordem, e sem a base');
  assert.ok(!c.includes('Roma'), 'Roma esta no backlog, e backlog nao e passagem');
  assert.deepEqual(C.cidadesDoDia(s, '2026-12-20'), ['Estrasburgo']);
  assert.deepEqual(C.cidadesDoDia(s, '2026-12-22'), [], 'dia sem atracao nao passa por lugar nenhum');

  // A BASE SAI POR NOME NORMALIZADO, e nao por chave: `day.base` e texto
  // livre ("Metz", "metz", "Amsterdã"), e a atracao guarda a chave
  // ("amsterda"). Comparar cru deixaria a base aparecer como cidade de
  // passagem no dia em que ele faz algo na propria base.
  s.days['2026-12-21'].base = 'metz';
  assert.deepEqual(C.cidadesDoDia(s, '2026-12-21'), ['Luxemburgo', 'Trier']);
  s.days['2026-12-21'].base = 'MeTz';
  assert.deepEqual(C.cidadesDoDia(s, '2026-12-21'), ['Luxemburgo', 'Trier']);
});

test('as cidades que o BLOCO passa: as dos dias dele, sem a base', () => {
  const s = structuredClone(S);
  s.attractions = [
    atr('trier', { day_iso: '2026-12-21' }),
    atr('estrasburgo', { day_iso: '2026-12-20' }),
    atr('luxemburgo', { day_iso: '2026-12-24' }),
    atr('metz', { day_iso: '2026-12-22' }),
    atr('roma', { day_iso: '2027-01-02' }),      // outro bloco
  ];
  const metz = C.planoBlocos(s).find((b) => b.base === 'Metz');
  assert.ok(metz, 'o bloco de Metz existe no plano da fixture');
  assert.deepEqual(C.cidadesDoBloco(s, metz), ['Estrasburgo', 'Luxemburgo', 'Trier']);
});

test('a base de VOO nao le "durmo em em transito"', () => {
  // Achado na PRODUCAO, 09/09: a linha da cama saiu "durmo em em trânsito".
  // A base dos dois dias de voo e o texto "em trânsito", e o prefixo "durmo
  // em" duplica o "em". Pior que a repeticao: nesses dias ele dorme no
  // aviao, entao "durmo em" e falso, nao so feio.
  assert.equal(C.ehTransito('em trânsito'), true);
  assert.equal(C.ehTransito('em transito'), true, 'sem acento tambem');
  assert.equal(C.ehTransito('no ar'), true);
  assert.equal(C.ehTransito('voando'), true);
  assert.equal(C.ehTransito('Metz'), false);
  assert.equal(C.ehTransito(''), false);

  // A MESMA REGRA que `baseList` usa para nao contar noite nesses dias. Se
  // as duas divergirem, um dia vai aparecer como cama numa tela e como voo
  // na conta das noites — e a fixture tem exatamente estes dois dias.
  const s = structuredClone(S);
  const transito = Object.values(s.days).filter((d) => C.ehTransito(d.base));
  assert.equal(transito.length, 2, 'a viagem tem dois dias de voo');
  for (const d of transito)
    assert.ok(!C.baseList(s).some((b) => b.base === d.base),
      `${d.base} nao pode virar base na conta das noites`);
});

// ============================================================
// O ROTEIRO PASSA A VIR DA HOSPEDAGEM RESERVADA  (09/09/2026, tarde)
//
// Ele olhou a tela e viu o app AFIRMANDO onde ele dorme numa cidade que
// ele nao escolheu: "aqui voce ja esta colocando onde vou dormir, sendo
// que nem escolhi o airbnb". Aquele "Cáceres" era SEMENTE MINHA dentro da
// tabela dele — `day.base` dos 34 dias, escrito pelo seed a partir do meu
// arquivo de planejamento. A regra de 06/09 aplicada ao osso do app.
//
// A DECISAO DELE, em duas partes:
//
//   "o lugar que vou dormir (cidade) so aparece quando eu colocar no
//    airbnb opcoes e selecionar uma delas como a escolhida"
//
//   "pode ser o 1, cada airbnb junta em blocos, mas cada dia vai ser
//    referente a cidade de visita, mas o bloco pode ser sobre o airbnb em
//    x cidade"
//
// ENTAO SAO DUAS COISAS COM NOMES DIFERENTES, e nao uma:
//   ESTADIA (fato)  = a opcao marcada, com check-in e check-out. Manda no
//                     bloco, na cama, nas noites e na tabela do Painel.
//   PLANO (dele)    = `day.base`, campo livre "so para eu escrever e me
//                     localizar". Nao manda em nada.
//
// E O QUE NAO PODE QUEBRAR: "32 dias em terra + 2 de voo = 34". Esse "2 de
// voo" era DEDUZIDO da palavra "em trânsito" na minha semente — se a
// semente sair, o app acha que os 34 dias sao de voo. As duas datas de voo
// passam a ser constante de conteudo, que e o que elas sao: o voo esta
// comprado e pago.
// ============================================================

test('estadia: so a opcao MARCADA com datas de verdade vira bloco', () => {
  const s = structuredClone(S);
  s.stayOptions = [
    opc('metz', { chosen: true, name: 'Perto da catedral', check_in: '2026-12-19', check_out: '2026-12-26' }),
    opc('lisboa', { chosen: true, name: 'Alfama', check_in: '2026-12-12', check_out: '2026-12-16' }),
    opc('roma', { chosen: false, name: 'nao marcada', check_in: '2027-01-02', check_out: '2027-01-10' }),
    opc('paris', { chosen: true, name: 'sem datas' }),
  ];

  const e = C.estadias(s);
  assert.equal(e.length, 2, 'a nao marcada e a sem datas ficam fora');
  assert.equal(e[0].from, '2026-12-12', 'vem em ordem de data, e nao de cidade');
  assert.equal(e[0].nome, 'Alfama');
  assert.equal(e[0].city, 'lisboa');
  assert.equal(e[0].n, 4, 'do 12 ao 15');
  assert.equal(e[1].nome, 'Perto da catedral');
  assert.equal(e[1].n, 7);
});

test('estadia: MADRID DUAS VEZES, e as duas contam', () => {
  // Ele dorme em Madrid no comeco (3 dias) e no fim (1 dia). A regra
  // antiga era "nao existe duas marcadas na mesma cidade", e marcar o
  // segundo airbnb de Madrid DESMARCAVA o primeiro — o bloco de uma das
  // duas estadias desapareceria e o dinheiro dela sairia do total sem
  // nada na tela dizendo. Com o bloco vindo do airbnb, a regra passa a ser
  // uma por FAIXA DE DATAS.
  const s = structuredClone(S);
  s.stayOptions = [
    opc('madrid', { chosen: true, name: 'Chamberí', check_in: '2026-12-16', check_out: '2026-12-19', nightly_eur: 100 }),
    opc('madrid', { chosen: true, name: 'perto do aeroporto', check_in: '2027-01-11', check_out: '2027-01-12', nightly_eur: 80 }),
  ];

  const e = C.estadias(s);
  assert.equal(e.length, 2, 'as duas estadias de Madrid existem');
  assert.deepEqual(e.map((x) => x.n), [3, 1]);

  // e o DINHEIRO das duas soma
  assert.equal(C.stayTotal(s, 'madrid'), 3 * 100 + 1 * 80, 'as duas marcadas somam');
  assert.equal(C.stayCount(s, ['madrid']), 1, 'a contagem e de CIDADES fechadas, e Madrid e uma');
});

test('as noites e as bases passam a ser O QUE ELE RESERVOU', () => {
  const s = structuredClone(S);
  s.stayOptions = [];
  assert.equal(C.nightsAll(s), 0, 'sem airbnb marcado nao ha noite reservada');
  assert.deepEqual(C.baseList(s), [], 'nem base');

  s.stayOptions = [
    opc('metz', { chosen: true, name: 'X', check_in: '2026-12-19', check_out: '2026-12-26' }),
  ];
  assert.equal(C.nightsAll(s), 7);
  assert.deepEqual(C.baseList(s).map((b) => b.base), ['Metz'], 'o nome vem da CIDADE, nao do airbnb');

  // A SEMENTE NAO ENTRA MAIS NA CONTA, e e o ponto de toda esta etapa: os
  // 34 dias tem `day.base` escrito pelo meu seed, e nenhum deles vira
  // noite nem base.
  const comSemente = Object.values(s.days).filter((d) => (d.base ?? '').trim()).length;
  assert.ok(comSemente > 30, 'a fixture tem a semente nos 34 dias');
  assert.equal(C.nightsAll(s), 7, 'e mesmo assim as noites sao so as 7 reservadas');
});

test('"32 dias em terra + 2 de voo = 34" NAO depende de reserva nenhuma', () => {
  // Era deduzido da palavra "em trânsito" da minha semente. Agora as duas
  // datas de voo sao constante de conteudo — o voo esta comprado e pago,
  // e isso e fato do calendario, nao plano.
  const s = structuredClone(S);
  s.stayOptions = [];
  assert.equal(C.flyDays(s), 2, 'os dois voos existem com zero reservas');
  assert.equal(C.groundDays(s), 32);
  assert.equal(C.groundDays(s) + C.flyDays(s), ISOS.length);

  // e nao muda quando ele reserva
  s.stayOptions = [opc('metz', { chosen: true, check_in: '2026-12-19', check_out: '2026-12-26' })];
  assert.equal(C.flyDays(s), 2);
  assert.equal(C.groundDays(s), 32);
});

test('o PLANO dele continua existindo, e nao manda em nada', () => {
  // "deve ter um campo livre so para eu escrever e me localizar como um
  // plano base". E o `day.base`, que deixou de mandar em bloco e conta.
  const s = structuredClone(S);
  s.stayOptions = [];
  s.days['2026-12-23'] = { iso: '2026-12-23', base: 'Colônia', plan: '' };

  const p = C.planoBlocos(s);
  assert.ok(p.some((b) => b.base === 'Colônia'), 'o plano dele vira bloco de PLANO');
  assert.equal(C.nightsAll(s), 0, 'mas nao vira noite');
  assert.deepEqual(C.baseList(s), [], 'nem base reservada');

  // e a dica da aba Hospedagem continua comparando com o PLANO, que e
  // para o que ela serve: "seu plano tem 4 noites aqui".
  assert.deepEqual(C.noitesEm(s, 'lisboa'), [4]);
  assert.deepEqual(C.noitesEm(s, 'metz'), [4, 2], 'Colônia partiu o plano de Metz em dois');
});

test('os dias SEM hospedagem definida sao todos, hoje', () => {
  const s = structuredClone(S);
  s.stayOptions = [];
  assert.equal(C.diasSemHospedagem(s).length, ISOS.length, 'nenhum dia tem cama ainda');

  s.stayOptions = [
    opc('metz', { chosen: true, check_in: '2026-12-19', check_out: '2026-12-26' }),
  ];
  const soltos = C.diasSemHospedagem(s);
  assert.equal(soltos.length, ISOS.length - 7);
  assert.ok(!soltos.includes('2026-12-20'), 'dia coberto sai da lista');
  assert.ok(soltos.includes('2026-12-26'), 'o dia do check-out volta a ficar sem cama');
});

test('o Roteiro em ordem: estadia e dias soltos INTERCALADOS por data', () => {
  // Sem isto o Roteiro mostraria os blocos reservados primeiro e um bolo de
  // dias soltos no fim — e a cronologia da viagem quebraria justamente no
  // meio do caminho, quando ele tiver reservado umas e nao outras.
  const s = structuredClone(S);
  s.stayOptions = [
    opc('lisboa', { chosen: true, name: 'Alfama', check_in: '2026-12-12', check_out: '2026-12-16' }),
    opc('metz', { chosen: true, name: 'Catedral', check_in: '2026-12-19', check_out: '2026-12-26' }),
  ];

  const r = C.roteiroEmOrdem(s);
  const forma = r.map((t) => (t.tipo === 'estadia' ? `[${t.estadia.nome}:${t.dias.length}]` : `(sem:${t.dias.length})`));
  assert.deepEqual(forma, ['(sem:2)', '[Alfama:4]', '(sem:3)', '[Catedral:7]', '(sem:18)'],
    '10-11 soltos, Lisboa, 16-18 soltos, Metz, e o resto solto');

  // todo dia aparece UMA vez, e nenhum se perde
  const todos = r.flatMap((t) => t.dias);
  assert.equal(todos.length, ISOS.length);
  assert.equal(new Set(todos).size, ISOS.length, 'nenhum dia repetido');
  assert.deepEqual(todos, [...todos].sort(), 'e em ordem de data');
});

test('o Roteiro em ordem, com zero reservas, e um trecho solto de 34', () => {
  const s = structuredClone(S);
  s.stayOptions = [];
  const r = C.roteiroEmOrdem(s);
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo, 'sem');
  assert.equal(r[0].dias.length, ISOS.length);
});
