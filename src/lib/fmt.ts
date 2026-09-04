// ============================================================
// Formatacao e conversao (secoes 10.0 e 11.1).
// Copiadas do app atual, nao reinventadas.
// ============================================================

/** num(v): troca "," por "." -> parseFloat -> se NaN, zero. (secao 11.1) */
export function num(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** R$ 1.234 — sem centavos, arredondado. */
export function brl(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

/** € 12,5 — ate 2 casas, ponto de milhar brasileiro. */
export function eur(v: number): string {
  return '€ ' + (Math.round(v * 100) / 100).toLocaleString('pt-BR');
}

/**
 * O que vai DENTRO de um campo de valor. Vazio e vazio, nao zero (secao 10.0):
 * um trecho sem valor mostra o placeholder "a lancar", nao "0".
 * Usa virgula porque e nisso que ele digita.
 */
export function inputNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v).replace('.', ',');
}

/** O mesmo para inteiros (noites). */
export function inputInt(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : String(v);
}

/** Texto de campo de valor -> numero ou null. Vazio vira null, nao 0. */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function parseInt10(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return isNaN(n) ? null : n;
}

// ---------- datas ----------
export const MN = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
export const WD = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
export const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function dObj(iso: string): Date {
  const p = iso.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
/** 12 dez · 2 jan */
export function shortDt(iso: string): string {
  const d = dObj(iso);
  return d.getDate() + ' ' + (d.getMonth() === 11 ? 'dez' : 'jan');
}
/** 12 de dezembro */
export function longDt(iso: string): string {
  const d = dObj(iso);
  return d.getDate() + ' de ' + MN[d.getMonth()];
}
/** dia da semana, minusculo */
export function wdOf(iso: string): string {
  return WD[dObj(iso).getDay()];
}
/** hoje pode ser 'aaaa-mm-dd' (o do Snapshot) ou um Date. */
export function daysTo(iso: string, hoje?: string | Date): number {
  const t =
    typeof hoje === 'string' ? dObj(hoje) : hoje ? new Date(hoje) : new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((dObj(iso).getTime() - t.getTime()) / 86400000);
}
/** '2026-09' -> 'set 26' */
export function mesLabel(ym: string): string {
  const p = ym.split('-');
  return MES[parseInt(p[1], 10) - 1] + ' ' + p[0].slice(2);
}

/**
 * norm(): minusculo, sem acento, sem pontuacao. E como a base do dia,
 * que e texto livre, acha a cidade (secao 10.2).
 */
export function norm(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * O que o usuario digita e TEXTO PURO e tem que ser escapado (secao 10.0).
 * So a nota semeada e renderizada como HTML. Esta funcao arranca as tags
 * antes de salvar, igual ao `strip()` do app atual.
 */
export function stripTags(s: string): string {
  return String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Plural que ja apareceu errado uma vez (secao 10.8). */
export function plMes(n: number): string {
  return n === 1 ? 'no mês que sobra' : 'nos ' + n + ' meses que sobram';
}
export function plMesV(n: number): string {
  return n === 1 ? 'pelo único mês ainda vazio' : 'pelos ' + n + ' meses ainda vazios';
}

/**
 * Os meses que ainda da para guardar: do mes de hoje ate dezembro de 2026.
 * Calculado na hora, nunca fixado (secao 10.8).
 */
export function saveMonths(hoje?: string | Date): string[] {
  const t = typeof hoje === 'string' ? dObj(hoje) : (hoje ?? new Date());
  const y = t.getFullYear();
  let m = t.getMonth();
  if (y > 2026) return ['2026-12'];
  if (y < 2026) m = 0;
  const out: string[] = [];
  for (; m <= 11; m++) out.push('2026-' + String(m + 1).padStart(2, '0'));
  return out;
}
