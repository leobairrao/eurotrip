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

/**
 * Texto de campo de valor -> numero ou null. Vazio vira null, nao 0.
 *
 * REESCRITA EM 06/09, e a razao e um erro de MIL VEZES que acontecia calado.
 *
 * A versao antiga era `parseFloat(t.replace(',', '.'))`. Num app em portugues,
 * sobre dinheiro, isso quer dizer:
 *
 *   "1.250,00"  ->  1.25     (o total de uma hospedagem virava um euro e vinte)
 *   "2.400"     ->  2.4
 *   "€ 90"      ->  null     (some inteiro, sem uma palavra na tela)
 *   "2,400.50"  ->  2.4      (o formato que o anuncio em ingles mostra)
 *
 * Nada disso dava erro. O numero errado entrava no banco, somava no Painel e
 * na Caixa, e so apareceria como "por que o total esta tao baixo?" semanas
 * depois. Achado pela revisao adversarial de 06/09, ao montar o formulario de
 * hospedagem — que e justamente onde ele COLA valor de anuncio.
 *
 * As regras, nesta ordem:
 *  1. tudo que nao e digito, ponto, virgula ou menos sai fora — o simbolo da
 *     moeda deixa de anular o numero;
 *  2. ponto E virgula juntos: o ULTIMO dos dois e o decimal, o outro e milhar.
 *     Cobre "1.250,00" (pt) e "2,400.50" (en) sem precisar saber qual e qual;
 *  3. so virgula: decimal, sempre. E portugues;
 *  4. so ponto: e milhar quando ha mais de um ("1.250.000"), ou quando o unico
 *     vem seguido de EXATAMENTE tres digitos ("2.400" = 2400). Fora disso e
 *     decimal, que e como "90.50" e "1.5" chegam de teclado numerico.
 *
 * O que ja funcionava continua igual: "90", "90,50", "90.50", "" e "abc" dao
 * exatamente o mesmo de antes. So mudou o que estava errado.
 */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;

  const negativo = /^\s*-/.test(t);
  let n = t.replace(/[^\d.,]/g, '');
  if (!/\d/.test(n)) return null;

  const ptDot = n.lastIndexOf('.');
  const ptCom = n.lastIndexOf(',');
  const semSeparador = (x: string) => x.replace(/[.,]/g, '');

  if (ptDot >= 0 && ptCom >= 0) {
    const dec = Math.max(ptDot, ptCom);
    n = `${semSeparador(n.slice(0, dec))}.${semSeparador(n.slice(dec + 1))}`;
  } else if (ptCom >= 0) {
    n = `${semSeparador(n.slice(0, ptCom))}.${semSeparador(n.slice(ptCom + 1))}`;
  } else if (ptDot >= 0) {
    const depois = n.slice(ptDot + 1);
    const milhar = n.indexOf('.') !== ptDot || /^\d{3}$/.test(depois);
    n = milhar ? semSeparador(n) : `${semSeparador(n.slice(0, ptDot))}.${semSeparador(depois)}`;
  }

  const v = parseFloat(n);
  if (isNaN(v)) return null;
  return negativo ? -v : v;
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
 * '2026-09-12' -> '12 set 26'. O dia de um aporte.
 * Le a string direto, sem montar Date: um `new Date('2026-09-12')`
 * volta um dia atras em quem esta a oeste de Greenwich.
 */
export function dtLabel(iso: string): string {
  const p = String(iso ?? '').split('-');
  if (p.length !== 3) return String(iso ?? '');
  const m = MES[parseInt(p[1], 10) - 1];
  if (!m) return String(iso);
  return parseInt(p[2], 10) + ' ' + m + ' ' + p[0].slice(2);
}

/**
 * Aceita so 'aaaa-mm-dd' de uma data que existe, com ano plausivel.
 *
 * A FORMA sozinha nao basta. Digitando o ano num <input type="date">, o
 * navegador passa por '0002-09-12', '0020-...', '0202-...' antes de chegar
 * em '2026-...' — os quatro tem a forma certa. Foi assim que um aporte quase
 * foi parar no ano 2 (achado da revisao de 04/09). Por isso o ano tambem e
 * conferido: 2000 a 2100 cobre com folga uma viagem em 2026.
 */
export function isData(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
  if (!m) return false;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  // 31 de fevereiro tem a forma certa e nao existe
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/**
 * O 'aaaa-mm-dd' de hoje no fuso de QUEM ESTA OLHANDO.
 *
 * Nao confunda com s.hoje, que e fixado no servidor de proposito, para o
 * servidor e o cliente pintarem "dias ate embarcar" igual (senao o React
 * reclama de hidratacao). Isso serve para CONTAR; nao serve como data de um
 * lancamento: na Vercel o servidor roda em UTC, entao as 22h no Brasil ele
 * ja acha que e amanha. Use so depois de montar, nunca no primeiro render.
 */
export function hojeLocal(): string {
  const d = new Date();
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
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
/**
 * Escapa para caber DENTRO de uma string que vai virar HTML.
 *
 * `stripTags` nao serve para isso: a regex dele e /<[^>]*>/g, entao ela so
 * come um `<` que TENHA um `>` depois. Uma nota como
 *   "confirmar <ver e-mail da CP"
 * atravessa inteira, e ai o innerHTML le `<ver` como tag aberta e engole
 * tudo dali ate o fim — o texto some sem erro nenhum (achado da revisao de
 * 04/09). Onde a nota do usuario precisa entrar numa string de HTML, ela
 * passa por aqui.
 */
export function escHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Texto puro -> HTML seguro, com *negrito* entre asteriscos.
 *
 * Escapa TUDO primeiro, e so depois deixa o asterisco virar <b>. Assim o
 * unico HTML que sai daqui e o que esta funcao mesmo pos — o que ele
 * digitar nunca vira tag, nem engole a frase (foi o bug de 04/09).
 *
 * O asterisco e a convencao do WhatsApp, que e onde ele ja escreve
 * assim. Conferido: nenhum dos 45 avisos semeados tinha asterisco, entao
 * a troca de <b> por * nao colide com nada.
 */
export function marcado(s: unknown): string {
  return escHtml(s).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
}

/**
 * O caminho inverso, SO para a semeadura: '<b>x</b>' vira '*x*'.
 * O <i> nao tem par no asterisco — vira texto comum (so um aviso usava).
 */
export function deHtml(s: unknown): string {
  return stripTags(
    String(s ?? '')
      .replace(/<\/?b>/g, '*')
      .replace(/<\/?i>/g, ''),
  );
}

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
export function plMesAte(n: number): string {
  return n === 1 ? 'pelo mês que falta até dezembro' : 'pelos ' + n + ' meses até dezembro';
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
