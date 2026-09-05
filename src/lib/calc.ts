// ============================================================
// As formulas, exatas (ESPECIFICACAO.md secao 11).
// Copiadas do app atual, nao reinventadas: cada uma ja foi
// conferida contra o numero que o usuario espera ver.
// ============================================================
import {
  BASEOUT, CO, CT, ESTIM_EUR, ISOS, STORD, TKORD, FKORD, VOO, coOf,
} from '@/content';
import { brl, eur, norm, num, saveMonths } from './fmt';
import type { Attraction, Aviso, Contribution, Snapshot, Status, Who } from './types';

// ---------------- 11.2 blocos, noites e dias ----------------
export interface Block { base: string; from: string; to: string; n: number }

/** Dias consecutivos com a MESMA base (comparacao sem diferenciar maiuscula). */
export function blocks(s: Snapshot): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;
  for (const iso of ISOS) {
    const b = (s.days[iso]?.base ?? '').trim();
    if (!b) { cur = null; continue; }
    if (cur && cur.base.toLowerCase() === b.toLowerCase()) { cur.to = iso; cur.n++; }
    else { cur = { base: b, from: iso, to: iso, n: 1 }; out.push(cur); }
  }
  return out;
}

export interface Base { base: string; d: number; nt: number }

/**
 * Os blocos, TIRANDO os que casam com /transito|no ar|voando/i.
 * A ULTIMA base tem nt = d - 1 (so quando ha mais de uma base): ele
 * dorme no aviao na ultima noite, porque o voo de volta sai 23h35.
 * Regra 5.1 — nunca escreva "31 + 2 = 34".
 */
export function baseList(s: Snapshot): Base[] {
  const out: Base[] = [];
  for (const b of blocks(s)) {
    if (/tr[âa]nsito|no ar|voando/i.test(b.base)) continue;
    out.push({ base: b.base, d: b.n, nt: b.n });
  }
  if (out.length > 1) out[out.length - 1].nt = Math.max(0, out[out.length - 1].d - 1);
  return out;
}

export const nightsAll  = (s: Snapshot) => baseList(s).reduce((a, b) => a + b.nt, 0);  // 31
export const groundDays = (s: Snapshot) => baseList(s).reduce((a, b) => a + b.d, 0);   // 32
export const flyDays    = (s: Snapshot) => Math.max(0, ISOS.length - groundDays(s));   // 2

/** "O que sai daqui de bate-volta", na tabela do Painel. */
export function baseOut(base: string, last: boolean, b: Base): string {
  if (last && b.nt < b.d) return 'último dia — o voo de volta é 23h35';
  return BASEOUT[base.toLowerCase()] ?? '—';
}

// ---------------- 11.3 progresso do roteiro ----------------
/**
 * A base do dia sozinha NAO e plano (regra 5.4). Plano e texto dele
 * OU pelo menos uma atracao marcada. Comida e transporte nao contam.
 */
export function hasPlan(s: Snapshot, iso: string): boolean {
  const d = s.days[iso];
  return !!(d?.plan?.trim() || attrsOfDay(s, iso).length);
}
export const filledDays = (s: Snapshot) => ISOS.filter((i) => hasPlan(s, i)).length;

// ---------------- 11.4 atracoes ----------------
//
// REGRAS 5.2 E 5.3, REVISTAS EM 05/09/2026 A PEDIDO DO LEO.
//
// A 5.2 dizia "so o que esta marcado como escolhida entra no custo" e a
// 5.3 dizia "por num dia E escolher; tirar do dia NAO desfaz". O codigo
// obedecia. O resultado, no banco dele: 15 atracoes marcadas "escolhida"
// e 14 delas em dia nenhum, somando R$ 793,60 no total real. Ele disse:
// "esta contando passeios que nao estao em lugar nenhum, deve contar
// apenas o que foi adicionado, se foi retirado o valor deve diminuir".
//
// Entao `day_iso` passou a ser a UNICA verdade, para a etiqueta e para o
// dinheiro, e `status` deixou de ser escolha para significar ORIGEM.
//
// As tres familias sao exclusivas e cobrem todas as linhas:
//
//   roteiro   tem dia            -> ENTRA no custo, etiqueta "no roteiro"
//   fora      dele, sem dia      -> nao entra, etiqueta "backlog".
//                                   E a linha "fora do roteiro somaria
//                                   mais EUR X", que impede o total de
//                                   virar zero sem explicacao.
//   pesquisa  'sugerida', sem dia -> a camada que eu pesquisei. Nunca e
//                                   dele ate ele clicar no + (regra 5.13,
//                                   que continua valendo). Total proprio.
//
// `status` NAO mudou de forma no banco: mesma coluna, mesmo check, mesmos
// tres valores. Mudou quem le e quem escreve.

/** Esta num dia do roteiro. A unica coisa que move dinheiro agora. */
export const noRoteiro = (a: Attraction) => !!a.day_iso;
/** Da camada de pesquisa: nunca foi dele (regra 5.13). */
export const ehPesquisa = (a: Attraction) => a.status === 'sugerida' && !a.day_iso;
/** Dele, mas ainda sem dia. E o "backlog" de verdade. */
export const foraDoRoteiro = (a: Attraction) => !a.day_iso && a.status !== 'sugerida';

export type AttrFiltro = '' | 'roteiro' | 'fora' | 'pesquisa';

const CASA: Record<Exclude<AttrFiltro, ''>, (a: Attraction) => boolean> = {
  roteiro: noRoteiro,
  fora: foraDoRoteiro,
  pesquisa: ehPesquisa,
};
const passa = (a: Attraction, f?: AttrFiltro) => (!f ? true : CASA[f](a));

export const attrsOf = (s: Snapshot, city: string) => s.attractions.filter((a) => a.city === city);

/**
 * A lista DELE de uma cidade: o que esta no roteiro primeiro, e o resto
 * por nome. Nao traz a camada de pesquisa junto — ela tem painel proprio.
 *
 * O desempate por nome importa: `load.ts` passou a pedir `.order('name')`
 * na Fase 0, porque sem ordem a lista dancava entre um F5 e outro.
 */
export function attrsDele(s: Snapshot, city: string) {
  return attrsOf(s, city)
    .filter((a) => !ehPesquisa(a))
    .sort((a, b) =>
      (noRoteiro(b) ? 1 : 0) - (noRoteiro(a) ? 1 : 0) || a.name.localeCompare(b.name, 'pt'));
}

/** O painel "sugestoes que eu pesquisei", por cidade. */
export function attrsPesquisa(s: Snapshot, city: string) {
  return attrsOf(s, city).filter(ehPesquisa).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

/**
 * Ordenada por situacao. So sobrou para a lista de um DIA do roteiro,
 * onde toda linha tem dia e a origem ainda ordena de forma util.
 */
export function attrsSorted(s: Snapshot, city: string) {
  return attrsOf(s, city).slice().sort((a, b) => STORD[a.status] - STORD[b.status]);
}

/** Soma de price_eur. O custo real usa 'roteiro'. */
export function attrEur(s: Snapshot, city: string, f?: AttrFiltro): number {
  return attrsOf(s, city).reduce((a, x) => (passa(x, f) ? a + num(x.price_eur) : a), 0);
}
export function attrEurCountry(s: Snapshot, k: string, f?: AttrFiltro): number {
  return coOf(k).cities.reduce((a, c) => a + attrEur(s, c, f), 0);
}
export function attrEurAll(s: Snapshot, f?: AttrFiltro): number {
  return s.attractions.reduce((a, x) => (passa(x, f) ? a + num(x.price_eur) : a), 0);
}
export function attrCount(s: Snapshot, f?: AttrFiltro): number {
  return s.attractions.filter((x) => passa(x, f)).length;
}
export function attrCountCity(s: Snapshot, city: string, f?: AttrFiltro): number {
  return attrsOf(s, city).filter((x) => passa(x, f)).length;
}

/** As atracoes de um dia, ordenadas por situacao. */
export function attrsOfDay(s: Snapshot, iso: string) {
  return s.attractions
    .filter((a) => a.day_iso === iso)
    .sort((a, b) => STORD[a.status] - STORD[b.status]);
}
export const dayAttrTotal = (s: Snapshot, iso: string) =>
  attrsOfDay(s, iso).reduce((a, x) => a + num(x.price_eur), 0);
export const attrPlaced = (s: Snapshot) => s.attractions.filter((a) => a.day_iso).length;

// ---------------- comidas ----------------
export const foodsOf = (s: Snapshot, co: string) => s.foods.filter((f) => f.country === co);
export const foodsKind = (s: Snapshot, co: string, k: string) =>
  foodsOf(s, co).filter((f) => f.kind === k);
/** So restaurante e cafe vao para dia. Prato nunca (regra 5.8). */
export const foodPickable = (kind: string) => kind !== 'prato';
export function foodsOfDay(s: Snapshot, iso: string) {
  return s.foods.filter((f) => f.day_iso === iso).sort((a, b) => FKORD[a.kind] - FKORD[b.kind]);
}
export const foodPlaced = (s: Snapshot) => s.foods.filter((f) => f.day_iso).length;

// ---------------- 11.5 hospedagem ----------------
//
// REESCRITA EM 05/09 (Fase 6). A hospedagem deixou de ser 7 cartoes fixos
// e virou lista de opcoes por cidade, e o Leo marca a que fechou.
//
// O RISCO QUE ISSO ABRE, e o motivo de `chosen` existir: a versao antiga
// somava TODAS as linhas de `stay` sem olhar situacao nenhuma. No dia em
// que existirem tres opcoes em Madrid com diaria lancada, as tres
// entrariam no total da viagem — e ele veria um numero errado sem nada
// na tela indicando erro. So a MARCADA conta.

/** As opcoes de uma cidade, na ordem que ele arrumou. */
export const staysOf = (s: Snapshot, city: string) =>
  s.stayOptions.filter((o) => o.city === city).sort(porPosicao);

/** A que ele marcou como "e essa". Nao existe duas na mesma cidade. */
export const stayChosen = (s: Snapshot, city: string) =>
  s.stayOptions.find((o) => o.city === city && o.chosen);

/** total_eur se preenchido e > 0, SENAO nightly_eur x nights (regra 5.7). */
export function stayValor(o: { total_eur: number | null; nightly_eur: number | null; nights: number | null }): number {
  const t = num(o.total_eur);
  if (t) return t;
  return num(o.nightly_eur) * num(o.nights);
}

/** O que a cidade custa: SO a opcao marcada. */
export function stayTotal(s: Snapshot, city: string): number {
  const o = stayChosen(s, city);
  return o ? stayValor(o) : 0;
}
export function stayTotalAll(s: Snapshot, cities: string[]): number {
  return cities.reduce((a, c) => a + stayTotal(s, c), 0);
}
/**
 * Quantas BASES estao fechadas — nao quantas opcoes tem endereco.
 *
 * O denominador continua sendo as 7 bases. Se isto passasse a contar
 * opcoes, o Painel diria coisas como "18 de 21 hospedagens sem reserva":
 * tecnicamente derivado, e completamente sem sentido para quem le.
 */
export function stayCount(s: Snapshot, cities: string[]): number {
  return cities.filter((c) => (stayChosen(s, c)?.address ?? '').trim()).length;
}
/** Ja pago em hospedagem: so a marcada, e so se a caixinha estiver marcada. */
export function stayPagoEur(s: Snapshot, cities: string[]): number {
  return cities.reduce((a, c) => {
    const o = stayChosen(s, c);
    return o && o.paid ? a + stayValor(o) : a;
  }, 0);
}

// ---------------- 11.6 transporte e burocracia ----------------
export type Mode = '' | 'pago' | 'falta';
export interface Sides { eur: number; brl: number }

/**
 * ATENCAO a moeda padrao (regra 5.11): item sem moeda cai no lado do
 * <option> pre-selecionado. Transporte -> EURO. Foi assim que
 * R$ 257 virou R$ 1.595 uma vez.
 */
export function legSum(s: Snapshot, mode: Mode = ''): Sides {
  let e = 0, b = 0;
  for (const t of s.legs) {
    if (mode === 'pago' && !t.bought) continue;
    if (mode === 'falta' && t.bought) continue;
    if (t.currency === 'brl') b += num(t.amount); else e += num(t.amount);
  }
  return { eur: e, brl: b };
}
export function legBrl(s: Snapshot, mode: Mode = ''): number {
  const x = legSum(s, mode);
  return x.eur * rate(s) + x.brl;
}
export const legDone   = (s: Snapshot) => s.legs.filter((t) => t.bought).length;
export const legWithVal = (s: Snapshot) => s.legs.filter((t) => num(t.amount) > 0).length;
export const legPlaced = (s: Snapshot) => s.legs.filter((t) => t.day_iso).length;
/**
 * A ordem de qualquer lista ordenada por `position`.
 *
 * O desempate pelo id NAO e decoracao. Desde que as setas existem, duas
 * pessoas movendo no mesmo instante podem deixar duas linhas com o MESMO
 * numero (sao escritas por campo, sem transacao). Sem desempate, cada
 * navegador ordenaria as empatadas do seu jeito e os dois passariam a ler
 * sequencias de viagem diferentes — e a regra 10.5 diz que a ordem E a
 * sequencia. Empatado e feio; divergente e mentira.
 */
export function porPosicao<T extends { id: string; position: number }>(a: T, b: T): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Os trechos de um tipo, NA ORDEM DO ROTEIRO (o filtro sozinho nao ordena). */
export const legsOfKind = (s: Snapshot, k: string) =>
  s.legs.filter((t) => t.kind === k).sort(porPosicao);
export function legsOfDay(s: Snapshot, iso: string) {
  return s.legs.filter((t) => t.day_iso === iso).sort((a, b) => TKORD[a.kind] - TKORD[b.kind]);
}
export const dayLegEur = (s: Snapshot, iso: string) =>
  legsOfDay(s, iso).reduce((a, t) => (t.currency !== 'brl' ? a + num(t.amount) : a), 0);
export const dayLegBrl = (s: Snapshot, iso: string) =>
  legsOfDay(s, iso).reduce((a, t) => (t.currency === 'brl' ? a + num(t.amount) : a), 0);

/**
 * A mesma mecanica, com `done` em vez de `bought`.
 * Burocracia -> a moeda padrao e o REAL (regra 5.11).
 */
export function bookingSum(s: Snapshot, mode: Mode = ''): Sides {
  let e = 0, b = 0;
  for (const r of s.bookings) {
    if (mode === 'pago' && !r.done) continue;
    if (mode === 'falta' && r.done) continue;
    if (r.currency === 'eur') e += num(r.amount); else b += num(r.amount);
  }
  return { eur: e, brl: b };
}
export function bookingBrl(s: Snapshot, mode: Mode = ''): number {
  const x = bookingSum(s, mode);
  return x.eur * rate(s) + x.brl;
}
export const bookingDone = (s: Snapshot) => s.bookings.filter((r) => r.done).length;
export function bookingCount(s: Snapshot, mode: Mode = ''): number {
  return s.bookings.filter((r) => {
    if (mode === 'pago' && !r.done) return false;
    if (mode === 'falta' && r.done) return false;
    return num(r.amount) > 0;
  }).length;
}

// ---------------- linhas livres ----------------
export const extraEur = (s: Snapshot) =>
  s.extras.reduce((a, x) => (x.currency !== 'brl' ? a + num(x.amount) : a), 0);
export const extraBrl = (s: Snapshot) =>
  s.extras.reduce((a, x) => (x.currency === 'brl' ? a + num(x.amount) : a), 0);

// ---------------- 11.7 os dois totais do dinheiro ----------------
export const rate = (s: Snapshot) => num(s.settings.eur_rate);

/** So o que esta no roteiro E com a caixinha marcada (Fase 5, 05/09). */
export const attrEurPago = (s: Snapshot) =>
  s.attractions.reduce((a, x) => (noRoteiro(x) && x.paid ? a + num(x.price_eur) : a), 0);

/**
 * Ja saiu do bolso: o voo, a burocracia marcada, o trecho comprado — e,
 * desde 05/09, a atracao e a hospedagem marcadas.
 *
 * Ate a Fase 5 so existiam DOIS marcadores de pago no app inteiro
 * (`leg.bought` e `booking.done`), entao mesmo depois de ele pagar o
 * Palacio da Pena ele nunca entrava aqui — e o "valor pago x valor
 * esperado" que ele pediu nao existia de verdade.
 */
export function pagoBrl(s: Snapshot, cities: string[]): number {
  return (
    VOO +
    bookingBrl(s, 'pago') +
    legBrl(s, 'pago') +
    (attrEurPago(s) + stayPagoEur(s, cities)) * rate(s)
  );
}

/**
 * Transporte e burocracia entram no total INTEIROS, comprados ou nao.
 * A caixinha so move o dinheiro entre "ja pago" e "previsto" (regra 5.10).
 *
 * ATRACAO segue o roteiro desde 05/09 (5.2 revista): so entra a que tem
 * dia. Transporte, hospedagem e burocracia NAO seguem, de proposito —
 * dois dos doze trechos sao agrupamentos que por decisao dele nunca vao
 * ter dia (ESPECIFICACAO.md:669-671), hospedagem e por cidade e nao tem
 * data, e passaporte e seguro tambem nao. Faze-los seguir o roteiro
 * esconderia dinheiro que ele vai pagar de verdade.
 */
export function totalBrl(s: Snapshot, cities: string[]): number {
  const x = legSum(s, '');
  return (
    VOO +
    (attrEurAll(s, 'roteiro') + stayTotalAll(s, cities) + extraEur(s) + x.eur) * rate(s) +
    extraBrl(s) +
    x.brl +
    bookingBrl(s, '')
  );
}

/** totalReal - jaPago (secao 11.7). */
export function aindaPorGastar(s: Snapshot, cities: string[]): number {
  return totalBrl(s, cities) - pagoBrl(s, cities);
}

// ---------------- 11.8 Caixa ----------------
// Cada um pensa na sua moeda: o Leo em R$, a Lu em EUR. O geral converte
// tudo a R$ pelo cambio da aba Custos.
//
// O aporte NAO e mais "o que entrou em setembro": e um bolo de dinheiro
// com dia e nome ("R$ 1.500 do 13o salario, em 12 de setembro"). Por isso
// nao existe mais "mes vazio" — o que falta se divide pelos meses de
// calendario que ainda cabem, e ponto.
export const cxCur = (s: Snapshot, w: Who): 'eur' | 'brl' =>
  s.savings[w]?.currency === 'eur' ? 'eur' : 'brl';
export const cxMeta = (s: Snapshot, w: Who) => num(s.savings[w]?.goal);

/** Formata na moeda de quem pensa nela. */
export const cxMoney = (s: Snapshot, v: number, w: Who) =>
  cxCur(s, w) === 'eur' ? eur(v) : brl(v);
/** Converte para R$ o valor de quem pensa em euro. */
export const cxBrl = (s: Snapshot, v: number, w: Who) =>
  cxCur(s, w) === 'eur' ? v * rate(s) : v;
/** O valor de UM aporte em R$, pela moeda de quem o lancou. */
export const cxBrlDe = (s: Snapshot, c: Contribution) => cxBrl(s, num(c.amount), c.who);

/**
 * created_at vira NUMERO antes de comparar. Comparar como texto parece
 * funcionar e nao funciona: a mesma linha chega em dois formatos conforme
 * o caminho (achado da revisao de 04/09).
 *
 *   pelo PostgREST (carregar/insert):  '2026-09-04T15:00:00.123+00:00'
 *   pelo Realtime  (o eco do outro):   '2026-09-04 15:00:00.123+00'
 *
 * Um tem 'T', o outro tem espaco — e ' ' < 'T'. Comparando texto, TODA
 * linha vinda do Realtime cairia antes de TODA linha vinda do carregamento
 * no mesmo dia, e a ordem do extrato do Leo ficaria diferente da da Lu ate
 * alguem apertar F5.
 */
function ts(v?: string): number {
  if (!v) return 0;
  const s = String(v)
    .trim()
    .replace(' ', 'T')            // o espaco do Realtime vira 'T'
    .replace(/([+-]\d{2})$/, '$1:00');  // e o fuso '+00' vira '+00:00'
  // Sem o segundo replace, Date.parse('...+00') devolve NaN — e ai TODA
  // linha vinda do Realtime empataria em 0 e cairia no comeco do dia.
  const n = Date.parse(s);
  return isNaN(n) ? 0 : n;
}

/**
 * A ordem do extrato: dia, depois quem chegou antes, depois o id.
 * Precisa ser total e estavel, senao o acumulado dança a cada render.
 */
function ordAporte(a: Contribution, b: Contribution): number {
  if (a.on_date !== b.on_date) return a.on_date < b.on_date ? -1 : 1;
  const ca = ts(a.created_at), cb = ts(b.created_at);
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Os aportes, do mais VELHO para o mais novo. `null` traz os dois. */
export function cxLista(s: Snapshot, w: Who | null): Contribution[] {
  const l = w ? s.contributions.filter((c) => c.who === w) : s.contributions.slice();
  return l.sort(ordAporte);
}
export const cxConta = (s: Snapshot, w: Who | null) => cxLista(s, w).length;
/** O ultimo aporte que entrou, ou null. */
export function cxUltimo(s: Snapshot, w: Who | null): Contribution | null {
  const l = cxLista(s, w);
  return l.length ? l[l.length - 1] : null;
}

/** O que a pessoa tem, na moeda dela: a soma dos aportes dela. */
export function cxTotal(s: Snapshot, w: Who): number {
  return s.contributions.reduce((a, c) => (c.who === w ? a + num(c.amount) : a), 0);
}
export const cxFalta = (s: Snapshot, w: Who) => Math.max(0, cxMeta(s, w) - cxTotal(s, w));

// --- os dois somados, em R$ ---
export const cxTotalBrl = (s: Snapshot) =>
  cxBrl(s, cxTotal(s, 'leo'), 'leo') + cxBrl(s, cxTotal(s, 'lu'), 'lu');
export const cxMetaBrl = (s: Snapshot) =>
  cxBrl(s, cxMeta(s, 'leo'), 'leo') + cxBrl(s, cxMeta(s, 'lu'), 'lu');
export const cxFaltaBrl = (s: Snapshot) => Math.max(0, cxMetaBrl(s) - cxTotalBrl(s));
export function cxPct(s: Snapshot): number {
  const m = cxMetaBrl(s);
  return m > 0 ? Math.min(100, (cxTotalBrl(s) / m) * 100) : 0;
}

/**
 * Quantos meses ainda cabem, do mes de hoje ate dezembro de 2026.
 * Minimo 1, para nao dividir por zero em janeiro de 2027.
 */
export const mesesAte = (hoje?: string | Date) => saveMonths(hoje).length || 1;

/** Quanto falta por mes: o que falta dividido pelos meses que sobram. */
export function cxMes(s: Snapshot, w: Who | null, hoje?: string | Date): number {
  return (w ? cxFalta(s, w) : cxFaltaBrl(s)) / mesesAte(hoje);
}

/** A estimativa convertida, para os botoes que so PREENCHEM o campo da meta. */
export const estimNaMoeda = (s: Snapshot, w: Who) =>
  Math.round(cxCur(s, w) === 'eur' ? ESTIM_EUR : ESTIM_EUR * rate(s));

// ---------------- avisos (nao somam em nada; ver 5.6, revista em 05/09) ----------------
/** Os avisos de um lugar, na ordem. `spot` e a chave: 'atracoes:lisboa'. */
export function avisosDe(s: Snapshot, spot: string): Aviso[] {
  return s.avisos.filter((a) => a.spot === spot).sort(porPosicao);
}
/** A proxima posicao livre naquele lugar, para o aviso novo entrar no fim. */
export function proxAviso(s: Snapshot, spot: string): number {
  return avisosDe(s, spot).reduce((a, x) => Math.max(a, x.position), -1) + 1;
}

// ---------------- a base do dia acha a cidade (secao 10.2) ----------------
export function cityOfBase(b: string): string {
  const n = norm(b);
  if (!n) return '';
  if (CT[n]) return n;
  for (const k of Object.keys(CT)) if (norm(CT[k].n) === n) return k;
  for (const k of Object.keys(CT)) {
    const c = norm(CT[k].n);
    if (c.length > 3 && (n.indexOf(c) >= 0 || c.indexOf(n) >= 0)) return k;
  }
  return '';
}

/** A base do dia primeiro, depois o resto do pais, depois todas (secao 10.2). */
export function pickCities(baseKey: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (c: string) => {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  };
  if (baseKey) push(baseKey);
  if (baseKey && CT[baseKey]) for (const c of coOf(CT[baseKey].co).cities) push(c);
  for (const co of CO) for (const c of co.cities) push(c);
  return out;
}

/** Quantas atracoes da cidade ainda estao sem dia. */
export function freeCount(s: Snapshot, city: string): number {
  return attrsOf(s, city).filter((a) => !a.day_iso).length;
}
