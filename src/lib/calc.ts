// ============================================================
// As formulas, exatas (ESPECIFICACAO.md secao 11).
// Copiadas do app atual, nao reinventadas: cada uma ja foi
// conferida contra o numero que o usuario espera ver.
// ============================================================
import {
  BASEOUT, CO, CT, ESTIM_EUR, ISOS, STORD, TKORD, FKORD, VOO, coOf,
} from '@/content';
import { brl, eur, norm, num, saveMonths } from './fmt';
import type { Contribution, Snapshot, Status, Who } from './types';

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
export const attrsOf = (s: Snapshot, city: string) => s.attractions.filter((a) => a.city === city);

/** Ordenadas escolhida -> backlog -> sugerida (secao 10.3). */
export function attrsSorted(s: Snapshot, city: string) {
  return attrsOf(s, city).slice().sort((a, b) => STORD[a.status] - STORD[b.status]);
}

/** Soma de price_eur dos itens com aquele status. O custo real usa 'escolhida'. */
export function attrEur(s: Snapshot, city: string, st?: Status): number {
  return attrsOf(s, city).reduce((a, x) => (!st || x.status === st ? a + num(x.price_eur) : a), 0);
}
export function attrEurCountry(s: Snapshot, k: string, st?: Status): number {
  return coOf(k).cities.reduce((a, c) => a + attrEur(s, c, st), 0);
}
export function attrEurAll(s: Snapshot, st?: Status): number {
  return s.attractions.reduce((a, x) => (!st || x.status === st ? a + num(x.price_eur) : a), 0);
}
export function attrCount(s: Snapshot, st?: Status): number {
  return s.attractions.filter((x) => !st || x.status === st).length;
}
export function attrCountCity(s: Snapshot, city: string, st?: Status): number {
  return attrsOf(s, city).filter((x) => !st || x.status === st).length;
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
/** total_eur se preenchido e > 0, SENAO nightly_eur x nights. */
export function stayTotal(s: Snapshot, city: string): number {
  const st = s.stays[city];
  if (!st) return 0;
  const t = num(st.total_eur);
  if (t) return t;
  return num(st.nightly_eur) * num(st.nights);
}
export function stayTotalAll(s: Snapshot, cities: string[]): number {
  return cities.reduce((a, c) => a + stayTotal(s, c), 0);
}
export function stayCount(s: Snapshot, cities: string[]): number {
  return cities.filter((c) => (s.stays[c]?.address ?? '').trim()).length;
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
export const legsOfKind = (s: Snapshot, k: string) => s.legs.filter((t) => t.kind === k);
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

/** Ja saiu do bolso: o voo, mais a burocracia marcada, mais o trecho comprado. */
export function pagoBrl(s: Snapshot): number {
  return VOO + bookingBrl(s, 'pago') + legBrl(s, 'pago');
}

/**
 * Transporte e burocracia entram no total INTEIROS, comprados ou nao.
 * A caixinha so move o dinheiro entre "ja pago" e "previsto" (regra 5.10).
 */
export function totalBrl(s: Snapshot, cities: string[]): number {
  const x = legSum(s, '');
  return (
    VOO +
    (attrEurAll(s, 'escolhida') + stayTotalAll(s, cities) + extraEur(s) + x.eur) * rate(s) +
    extraBrl(s) +
    x.brl +
    bookingBrl(s, '')
  );
}

/** totalReal - jaPago (secao 11.7). */
export function aindaPorGastar(s: Snapshot, cities: string[]): number {
  return totalBrl(s, cities) - pagoBrl(s);
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
