// ============================================================
// As formulas, exatas (ESPECIFICACAO.md secao 11).
// Copiadas do app atual, nao reinventadas: cada uma ja foi
// conferida contra o numero que o usuario espera ver.
// ============================================================
import {
  BASEOUT, CO, CT, DIAS_DE_VOO, ESTIM_EUR, ISOS, STORD, TKORD, FKORD, VOO, coOf, CIDADES_FIXAS,
} from '@/content';
import { brl, eur, isData, norm, num, saveMonths } from './fmt';
import { AK_PADRAO } from './types';
import type { Attraction, Aviso, Contribution, DayItem, Food, Leg, Snapshot, Status, Who } from './types';

// ============================================================
// 11.2 — ESTADIA (fato) vs PLANO (dele), noites e dias  (09/09/2026)
//
// Ele olhou a tela e viu o app AFIRMANDO onde ele dorme numa cidade que
// ele nao escolheu: "aqui voce ja esta colocando onde vou dormir, sendo que
// nem escolhi o airbnb". Aquele "Cáceres" era SEMENTE MINHA dentro da
// tabela dele — `day.base` dos 34 dias, escrito pelo seed a partir do meu
// arquivo de planejamento.
//
// A decisao dele partiu a coisa em DUAS, com nomes diferentes:
//
//   ESTADIA (fato)  — a opcao de hospedagem MARCADA, com check-in e
//                     check-out. Manda no bloco do Roteiro, na cama do dia,
//                     nas noites e na tabela do Painel.
//   PLANO (dele)    — `day.base`, agora campo livre "so para eu escrever e
//                     me localizar como um plano base". NAO manda em nada.
//
// UMA POR FAIXA DE DATAS, e nao uma por cidade: ele dorme em Madrid DUAS
// vezes (3 dias no comeco, 1 no fim). A regra antiga desmarcava a primeira
// ao marcar a segunda, e o dinheiro de uma das duas saia do total sem nada
// na tela dizendo. Quem recusa sobreposicao e `opcoesQueBatem`.
// ============================================================
export interface Block { base: string; from: string; to: string; n: number }

/**
 * A base que NAO e uma cama: os dois dias de voo, cujo `day.base` de
 * semente e o texto "em trânsito".
 *
 * Continua existindo para o PLANO: se ele escrever "em trânsito" num dia,
 * aquilo nao e cama nem noite. Ver `planoBlocos` e a linha da cama nas
 * telas do Roteiro.
 */
export const ehTransito = (base: string) => /tr[âa]nsito|no ar|voando/i.test(base ?? '');

/**
 * OS BLOCOS DO PLANO — dias consecutivos com o mesmo texto em `day.base`.
 *
 * Isto e o PLANO dele, e o unico lugar que o usa e a dica da aba Hospedagem
 * ("seu plano tem 4 noites aqui") mais a linha discreta de plano no
 * Roteiro. NAO alimenta noite, base, custo nem a tabela do Painel — se
 * voltar a alimentar, o app volta a afirmar cama que ele nao reservou, que
 * foi exatamente a queixa de 09/09.
 */
export function planoBlocos(s: Snapshot): Block[] {
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

export interface Estadia {
  id: string;
  city: string;
  /** O nome do anuncio: "Chamberí". O bloco do Roteiro e "Chamberí · Madrid". */
  nome: string;
  from: string;
  to: string;
  /** Noites, que aqui e a mesma coisa que dias cobertos. */
  n: number;
}

/**
 * AS ESTADIAS RESERVADAS, em ordem de data.
 *
 * So a opcao MARCADA e com check-in/check-out de verdade. Opcao sem data
 * nao vira estadia: era texto livre antes de 09/09, e "dia 12 - 15h" nao e
 * uma faixa de dias.
 *
 * A ORDEM E POR DATA, e nao por cidade: o Roteiro le isto de cima para
 * baixo, e Madrid aparece duas vezes em lugares diferentes da viagem.
 */
export function estadias(s: Snapshot): Estadia[] {
  return s.stayOptions
    .filter((o) => o.chosen)
    .map((o) => ({ o, dias: diasDaOpcao(o) }))
    .filter((x) => x.dias.length > 0)
    .map(({ o, dias }) => ({
      id: o.id,
      city: o.city,
      nome: o.name,
      from: dias[0],
      to: dias[dias.length - 1],
      n: dias.length,
    }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** O dia esta coberto por alguma estadia reservada? */
export const temCama = (s: Snapshot, iso: string) => !!hospedagemDoDia(s, iso);

/**
 * OS DIAS SEM HOSPEDAGEM DEFINIDA. Hoje sao os 34, e e o esperado: ele
 * ainda nao marcou nenhum airbnb. E a lista que o Roteiro mostra em
 * vermelho, uma vez por CARTAO e nao 34 vezes.
 */
export const diasSemHospedagem = (s: Snapshot) => ISOS.filter((iso) => !temCama(s, iso));

export type TrechoRoteiro =
  | { tipo: 'estadia'; estadia: Estadia; dias: string[] }
  | { tipo: 'sem'; dias: string[] };

/**
 * O ROTEIRO DE CIMA PARA BAIXO: estadias reservadas e dias sem hospedagem,
 * INTERCALADOS em ordem de data.
 *
 * Sem isto o Roteiro mostraria os blocos reservados primeiro e um bolo de
 * dias soltos no fim — e a cronologia quebraria exatamente no estado em que
 * ele vai passar as proximas semanas: umas reservadas, outras nao.
 *
 * Todo dia aparece uma vez e nenhum se perde; ha teste dos dois.
 */
export function roteiroEmOrdem(s: Snapshot): TrechoRoteiro[] {
  const dono = new Map<string, Estadia>();
  for (const e of estadias(s)) for (const iso of diasEntre(e.from, e.to)) dono.set(iso, e);

  const out: TrechoRoteiro[] = [];
  for (const iso of ISOS) {
    const e = dono.get(iso);
    const ult = out[out.length - 1];
    if (e) {
      if (ult && ult.tipo === 'estadia' && ult.estadia.id === e.id) ult.dias.push(iso);
      else out.push({ tipo: 'estadia', estadia: e, dias: [iso] });
    } else {
      if (ult && ult.tipo === 'sem') ult.dias.push(iso);
      else out.push({ tipo: 'sem', dias: [iso] });
    }
  }
  return out;
}

/** Os ISOS de `de` a `ate`, inclusive nos dois lados. */
const diasEntre = (de: string, ate: string) => ISOS.filter((i) => i >= de && i <= ate);

/**
 * O PLANO DE ROTEIRO QUE ELE ESCREVE (SQL 12), na ordem que ele arrumou.
 *
 * NAO ENTRA EM CONTA NENHUMA, e nao e por esquecimento: quem manda em
 * noite, bloco e custo e a hospedagem marcada. Isto e a nota que ele le
 * enquanto monta a viagem, e foi o pedido dele — "so para eu ter uma
 * nocao". Se um dia isto alimentar numero, o app volta a afirmar coisa que
 * ele nao reservou.
 */
export const planRows = (s: Snapshot) => s.planRows.slice().sort(porPosicao);

export interface Base { base: string; d: number; nt: number }

/**
 * AS BASES RESERVADAS — o que a tabela do roteiro no Painel mostra.
 *
 * Sai das ESTADIAS, e por isso hoje devolve lista vazia. Antes de 09/09
 * saia dos blocos de `day.base`, ou seja, da minha semente: dizia "31
 * noites em 8 bases" sem ele ter fechado uma reserva.
 *
 * O nome e a CIDADE (o que ele reconhece na tabela), nao o do anuncio.
 *
 * A REGRA DO `nt = d - 1` NA ULTIMA BASE MORREU AQUI, e nao foi descuido:
 * ela existia porque as bases vinham de dias de calendario, e a ultima
 * noite ele dorme no aviao. Com check-in e check-out de verdade, a propria
 * reserva ja diz quantas noites sao — inventar um -1 tiraria uma noite que
 * ele pagou.
 */
export function baseList(s: Snapshot): Base[] {
  return estadias(s).map((e) => ({ base: nomeCidade(s, e.city), d: e.n, nt: e.n }));
}

/** As noites RESERVADAS. Zero enquanto ele nao marcar nenhum airbnb. */
export const nightsAll = (s: Snapshot) => baseList(s).reduce((a, b) => a + b.nt, 0);

/**
 * DIAS EM TERRA E DIAS DE VOO — fato do calendario, e nao de reserva.
 *
 * Eram deduzidos das bases (`34 - groundDays`), o que significa que os dois
 * dias de voo existiam porque a minha semente tinha escrito "em trânsito"
 * em `day.base`. Com as bases vindo da reserva, zero reservas daria "os 34
 * dias sao de voo" e o rodape "32 + 2 = 34" pararia de fechar sem ninguem
 * mexer em conta nenhuma.
 *
 * As duas datas moram em `src/content` (`DIAS_DE_VOO`): o voo esta comprado
 * e pago, com ida e volta. E moldura da viagem, nao plano.
 */
export const flyDays = (_s?: Snapshot) => DIAS_DE_VOO.filter((d) => ISOS.includes(d)).length;
export const groundDays = (s?: Snapshot) => ISOS.length - flyDays(s);

/**
 * "O que sai daqui de bate-volta", na tabela do Painel.
 *
 * PERDEU O CASO DO ULTIMO DIA em 09/09, e nao foi descuido: ele dependia de
 * `nt < d`, a regra do -1 que morreu quando as noites passaram a sair do
 * check-in/check-out da reserva. O texto do voo de volta continua na tela,
 * mas como fato do calendario e nao como efeito de uma base.
 */
export function baseOut(base: string): string {
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

// ---------------- cidades ----------------
//
// Ate 05/09 as cidades eram 11, fixas, e viviam no campo `cities` de cada
// pais. O Leo pediu para poder criar uma — "se eu clicar na espanha, devo
// conseguir cadastrar uma nova cidade (nas atracoes)". Entao existem duas
// camadas, e TODO laco de cidade tem que ler as duas:
//
//   as 11 fixas   CIDADES_FIXAS, do arquivo. Nao se cria nem se apaga.
//   as dele       s.cities, a tabela `city`. Nasce vazia.
//
// O campo `cities` foi TIRADO de `Country` de proposito: enquanto ele
// existisse, um laco esquecido continuaria lendo so as 11 e a cidade nova
// ficaria meio dentro meio fora. Sem ele, o `tsc` aponta os lugares.

/** As cidades de um pais: as fixas primeiro, as dele depois. */
export function cidadesDe(s: Snapshot, co: string): string[] {
  const fixas = CIDADES_FIXAS[co] ?? [];
  const dele = s.cities
    .filter((c) => c.co === co)
    .sort(porPosicao)
    .map((c) => c.k)
    .filter((k) => !fixas.includes(k));
  return [...fixas, ...dele];
}

/** Todas as cidades da viagem, na ordem dos paises. */
export const todasCidades = (s: Snapshot) => CO.flatMap((c) => cidadesDe(s, c.k));

/** O nome de exibicao de uma cidade, fixa ou dele. */
export function nomeCidade(s: Snapshot, k: string): string {
  return CT[k]?.n ?? s.cities.find((c) => c.k === k)?.n ?? k;
}

/** O pais de uma cidade, fixa ou dele. '' se nao existe. */
export function paisDaCidade(s: Snapshot, k: string): string {
  return CT[k]?.co ?? s.cities.find((c) => c.k === k)?.co ?? '';
}

/**
 * A cidade EXISTE? Fixa ou criada por ele.
 *
 * Quem pergunta so a `CT` — a lista das 11 fixas — responde "nao" para
 * toda cidade que ele criar. Isso derrubou o app duas vezes em 05/09: uma
 * cidade chamada "teste" e a tela inteira virava "Application error",
 * porque `CT[cidade].n` num nome que a `CT` nao tem e TypeError, e o Next
 * nao tinha rede nenhuma embaixo. Use ISTO, nunca `CT[k]` cru.
 */
export const temCidade = (s: Snapshot, k: string): boolean =>
  !!k && (!!CT[k] || s.cities.some((c) => c.k === k));

/** A variavel CSS de cor de uma cidade, pelo pais dela — fixa ou dele. */
export function ccCidade(s: Snapshot, k: string): string {
  const co = paisDaCidade(s, k);
  return CO.find((x) => x.k === co)?.cc ?? '--pine';
}

/** So as que ele criou, para o x saber quem pode apagar. */
export const cidadeDele = (s: Snapshot, k: string) => s.cities.find((c) => c.k === k);

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

// ============================================================
// O VALOR DE UMA LINHA — o real quando existe, o planejado quando nao.
//
// A regra que entrou em 09/09 com o "gasto real", e a que faz nenhum numero
// de hoje mudar: as colunas novas nascem `null`, e `null ?? planejado` da o
// planejado. O app continua contando igual ate ele conferir o primeiro.
//
// `??` E NAO `||`, e a diferenca aparece uma vez so — quando o valor real e
// ZERO. O passeio que ele achava que custava EUR 20 e no fim era de graca
// vale 0, e nao 20. Com `||` o zero cairia no planejado e a correcao dele
// seria ignorada em silencio.
//
// O nome de cada campo real segue o planejado que ele corrige: `price_eur`
// -> `spent_eur` (atracao, comida), `amount` -> `spent` (trecho, item do
// dia). Nenhuma tabela com dois nomes para a mesma ideia.
// ============================================================
export const atrValor = (a: Attraction) => num(a.spent_eur ?? a.price_eur);
export const comidaValor = (f: Food) => num(f.spent_eur ?? f.price_eur);
export const legValor = (l: Leg) => num(l.spent ?? l.amount);
export const diValor = (i: DayItem) => num(i.spent ?? i.amount);

/** Esta num dia do roteiro. A unica coisa que move dinheiro agora. */
export const noRoteiro = (a: Attraction) => !!a.day_iso;
/** Da camada de pesquisa: nunca foi dele (regra 5.13). */
export const ehPesquisa = (a: Attraction) => a.status === 'sugerida' && !a.day_iso;
/** Dele, mas ainda sem dia. E o "backlog" de verdade. */
export const foraDoRoteiro = (a: Attraction) => !a.day_iso && a.status !== 'sugerida';

export type AttrFiltro = '' | 'roteiro' | 'fora' | 'pesquisa' | 'dele';

const CASA: Record<Exclude<AttrFiltro, ''>, (a: Attraction) => boolean> = {
  roteiro: noRoteiro,
  fora: foraDoRoteiro,
  pesquisa: ehPesquisa,
  // O AVESSO EXATO de `pesquisa`, e nao "backlog": os dois PARTEM a lista,
  // entao `dele + pesquisa` sempre da o total. `fora` nao serve aqui — ele
  // tira o que esta num dia, e o que esta num dia continua sendo dele.
  dele: (a) => !ehPesquisa(a),
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
/**
 * Os temas que EXISTEM na viagem: os dois de sempre, mais tudo que ele ja
 * escreveu, sem repetir.
 *
 * E o que alimenta o menu de tema. Sem isto, um tema inventado so existiria
 * na atracao onde ele foi digitado: para usar "mercado de natal" na segunda
 * atracao ele teria que escrever de novo, com risco de sair "Mercado de
 * Natal" e virar um tema diferente do primeiro.
 *
 * Os dois padrao vem SEMPRE na frente e nesta ordem, mesmo que nenhuma
 * atracao os use — sao o menu que ele ja conhece. O resto sai em ordem
 * alfabetica para o menu nao dancar a cada atracao nova.
 */
export function temasDeAtracao(s: Snapshot): string[] {
  const vistos = new Set(AK_PADRAO);
  const dele: string[] = [];
  for (const a of s.attractions) {
    const t = (a.kind ?? '').trim();
    if (!t || vistos.has(t)) continue;
    vistos.add(t);
    dele.push(t);
  }
  return [...AK_PADRAO, ...dele.sort((x, y) => x.localeCompare(y, 'pt-BR'))];
}

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
  return attrsOf(s, city).reduce((a, x) => (passa(x, f) ? a + atrValor(x) : a), 0);
}
export function attrEurCountry(s: Snapshot, k: string, f?: AttrFiltro): number {
  return cidadesDe(s, k).reduce((a, c) => a + attrEur(s, c, f), 0);
}
export function attrEurAll(s: Snapshot, f?: AttrFiltro): number {
  return s.attractions.reduce((a, x) => (passa(x, f) ? a + atrValor(x) : a), 0);
}
export function attrCount(s: Snapshot, f?: AttrFiltro): number {
  return s.attractions.filter((x) => passa(x, f)).length;
}
export function attrCountCity(s: Snapshot, city: string, f?: AttrFiltro): number {
  return attrsOf(s, city).filter((x) => passa(x, f)).length;
}
/**
 * Quantas atracoes o PAIS tem — o numerozinho embaixo da bandeira em
 * Atracoes (08/09/2026).
 *
 * A fita chama com `'dele'`: a aba Atracoes e so dele desde 06/09, e a
 * minha pesquisa tem contagem propria na aba Sugestoes. Contar tudo aqui
 * faria a bandeira prometer uma lista que a tela nao mostra.
 *
 * Passa por `cidadesDe`, entao cidade que ELE criou conta igual as fixas.
 */
export function attrCountCountry(s: Snapshot, k: string, f?: AttrFiltro): number {
  return cidadesDe(s, k).reduce((a, c) => a + attrCountCity(s, c, f), 0);
}

/**
 * A FATIA DO PAIS no custo de atracoes da viagem — o segundo numero do topo
 * de Atracoes (09/09/2026), em %.
 *
 * O denominador e o custo das ATRACOES da viagem, e nao o custo da viagem
 * inteira: perguntado, ele escolheu *"so o total das atracoes"*. Com o
 * total da viagem no lugar, o numero responderia outra pergunta ("quanto da
 * minha viagem e passeio") e seria sempre pequeno perto de voo e
 * hospedagem. Como esta, as fatias dos sete paises somam 100 — ha teste.
 *
 * Numerador e denominador usam os DOIS o filtro 'roteiro': e custo real
 * contra custo real. O backlog tem numero proprio, o terceiro da linha.
 *
 * Devolve 0 quando nada esta num dia, que e o estado de hoje: `0/0` em JS
 * e `NaN`, e a aba dele mostraria "NaN%".
 */
export function attrPctPais(s: Snapshot, k: string): number {
  const todo = attrEurAll(s, 'roteiro');
  if (!todo) return 0;
  return (attrEurCountry(s, k, 'roteiro') / todo) * 100;
}

/** As atracoes de um dia, ordenadas por situacao. */
export function attrsOfDay(s: Snapshot, iso: string) {
  return s.attractions
    .filter((a) => a.day_iso === iso)
    .sort((a, b) => STORD[a.status] - STORD[b.status]);
}
export const dayAttrTotal = (s: Snapshot, iso: string) =>
  attrsOfDay(s, iso).reduce((a, x) => a + atrValor(x), 0);
export const attrPlaced = (s: Snapshot) => s.attractions.filter((a) => a.day_iso).length;

/**
 * "Cidades visitadas" — o terceiro numero do topo do Painel (09/09/2026).
 *
 * A regra e dele: *"eu assinalar que visitei 50% dos itens da lista da
 * cidade"*, e o `50%` e lido como METADE OU MAIS.
 *
 * A CONTA NAO SAI DA BASE DO DIA, e essa e a coisa a nao esquecer. Ele
 * apontou o furo: *"em roteiro so tem as cidades que vou dormir, por
 * exemplo, metz vou dormir mas de la vou pra estrasburgo, luxemburgo e
 * colonia"* — *"vou dormir em 7 mas passar por umas 15"*. Sai da ATRACAO,
 * que e a unica linha do banco com cidade e dia ao mesmo tempo: comida
 * guarda pais, transporte nao guarda lugar nenhum. Uma atracao de Trier
 * num dia com base em Metz e o que diz "neste dia eu estive em Trier".
 *
 * So o que esta num DIA entra — decisao dele: *"so as que estao num dia de
 * roteiro, afinal sao as que vou me propor a visitar"*. Com o backlog
 * dentro, registrar 10 atracoes em Madrid e por 4 no roteiro deixaria
 * Madrid presa em 40% para sempre. De graca, isso tambem exclui a minha
 * pesquisa: `ehPesquisa` exige nao ter dia.
 *
 * O `total` sao as cidades que TEM atracao num dia, nao as 11 fixas nem as
 * 7 bases: cidade onde ele nao planejou nada nao aparece de nenhum lado.
 */
export function cidadesVisitadas(s: Snapshot): { feitas: number; total: number } {
  const porCidade = new Map<string, { n: number; feitas: number }>();
  for (const a of s.attractions) {
    if (!noRoteiro(a)) continue;
    const c = porCidade.get(a.city) ?? { n: 0, feitas: 0 };
    c.n += 1;
    if (a.done) c.feitas += 1;
    porCidade.set(a.city, c);
  }
  let feitas = 0;
  for (const c of porCidade.values()) if (c.feitas >= Math.ceil(c.n / 2)) feitas += 1;
  return { feitas, total: porCidade.size };
}

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

/**
 * As MARCADAS de uma cidade. Desde 09/09 pode haver mais de uma: ele dorme
 * em Madrid duas vezes (3 dias no comeco, 1 no fim), e a regra passou a ser
 * uma por FAIXA DE DATAS, nao uma por cidade.
 */
export const stayChosenAll = (s: Snapshot, city: string) =>
  staysOf(s, city).filter((o) => o.chosen);

/**
 * A PRIMEIRA marcada da cidade. Cuidado: numa cidade onde ele dorme duas
 * vezes isto devolve so uma. Para dinheiro e contagem use
 * `stayChosenAll` — foi assim que o total de Madrid perdeu uma estadia
 * inteira ate 09/09.
 */
export const stayChosen = (s: Snapshot, city: string) =>
  s.stayOptions.find((o) => o.city === city && o.chosen);

// ============================================================
// A CAMA VEM DA HOSPEDAGEM  (09/09/2026)
//
// Ideia dele, e ela inverte de onde vem a base do dia: "pegar a hospedagem
// que esta paga para aquele dia (na aba hospedagem) e atribuir
// automaticamente como a base daquele dia... quando eu selecionar um (com
// uma checkbox de escolhido na aba hospedagens) ele vai pegar a data e
// automaticamente vai incluir no roteiro".
//
// PARA ISSO AS DATAS TIVERAM QUE VIRAR DATAS. Ate hoje `check_in` e
// `check_out` eram TEXTO LIVRE ("ex. dia 12 - 15h"), e nao ha faixa de dias
// que se tire disso.
// ============================================================

/**
 * Os dias que uma opcao de hospedagem COBRE: do check-in ate a VESPERA do
 * check-out, e so os que existem nos 34 dias da viagem.
 *
 * A VESPERA E A CONTA QUE SE ERRA. Na manha do check-out ele ja nao dorme
 * la: entrar no dia 19 e sair no 26 sao SETE noites (19 a 25), nao oito.
 * Errar isto rouba ou da uma noite em cada uma das 7 bases, e o rodape
 * "32 dias em terra + 2 de voo = 34" para de fechar.
 *
 * Data que nao e data devolve lista vazia — e o caso de todo dado escrito
 * antes de 09/09, quando o campo era texto livre.
 */
export function diasDaOpcao(o: { check_in: string; check_out: string }): string[] {
  const de = String(o.check_in ?? '');
  const ate = String(o.check_out ?? '');
  // `ate <= de` e REDUNDANTE com o filtro abaixo (`iso >= de && iso < ate`
  // ja devolve vazio quando a saida vem antes da entrada, e quando as duas
  // sao o mesmo dia). Fica como declaracao de intencao, e a sabotagem de
  // 09/09 mostrou que nenhum teste a distingue — ninguem depois de mim
  // deve achar que ela e o que segura o caso.
  if (!isData(de) || !isData(ate) || ate <= de) return [];
  // Comparacao de STRING, e nao de Date: 'YYYY-MM-DD' ordena igual em
  // texto, e `new Date('2026-12-19')` traz fuso para dentro de uma conta
  // que nao tem hora nenhuma.
  return ISOS.filter((iso) => iso >= de && iso < ate);
}

/** Quantas noites a opcao vale. Sai das DATAS, e nao do campo digitado. */
export const noitesDaOpcao = (o: { check_in: string; check_out: string }) =>
  diasDaOpcao(o).length;

/**
 * As opcoes JA MARCADAS que pisam nos mesmos dias de `nova`.
 *
 * Decisao dele: "O app recusa e avisa". Sem isto, um erro de digitacao na
 * data mudaria a base de dias de outra cidade sem ele notar.
 *
 * ENCOSTAR NAO E SOBREPOR: sair de Madrid no dia 19 e dormir em Metz no dia
 * 19 e o caso normal de trocar de cidade, e recusar isso travaria a viagem
 * inteira. E por isso que `diasDaOpcao` para na vespera — a comparacao aqui
 * e de conjuntos de dias, nao de datas de entrada e saida.
 */
export function opcoesQueBatem(
  s: Snapshot,
  nova: { id: string; check_in: string; check_out: string },
) {
  const dias = new Set(diasDaOpcao(nova));
  if (!dias.size) return [];
  return s.stayOptions.filter(
    (o) => o.chosen && o.id !== nova.id && diasDaOpcao(o).some((d) => dias.has(d)),
  );
}

/**
 * A hospedagem MARCADA que cobre um dia — ou `null`.
 *
 * E o que o cartao do dia usa para avisar de onde vem a base: sem isso, ele
 * editaria o campo a mao num dia que a hospedagem manda, e os dois
 * discordariam em silencio ate alguem remarcar a opcao.
 */
export function hospedagemDoDia(s: Snapshot, iso: string) {
  return s.stayOptions.find((o) => o.chosen && diasDaOpcao(o).includes(iso)) ?? null;
}

/**
 * AS CIDADES QUE ELE PASSA num dia, sem a base. A inversao que ele pediu em
 * 09/09: "nela aparece as cidades que vou passar e as cidades que vou
 * dormir vao aparecer no fim da lista".
 *
 * Sai da ATRACAO, a unica linha do banco com cidade e dia — comida guarda
 * pais, transporte nao guarda lugar. E a mesma fonte de `cidadesVisitadas`,
 * entao os dois numeros nunca podem discordar.
 *
 * A BASE SAI POR NOME NORMALIZADO. `day.base` e texto livre que ELE
 * escreve ("Metz", "metz", "Amsterdã"); a atracao guarda a CHAVE
 * ("amsterda"). Comparar cru faria a base aparecer como cidade de passagem
 * justamente nos dias em que ele faz algo na propria base — e ninguem
 * olharia o dia 22 de Metz desconfiando disso.
 */
export function cidadesDoDia(s: Snapshot, iso: string): string[] {
  const base = norm((s.days[iso]?.base ?? '').trim());
  const vistas = new Set<string>();
  for (const a of s.attractions) {
    if (a.day_iso !== iso) continue;
    const nome = nomeCidade(s, a.city);
    if (norm(nome) === base || norm(a.city) === base) continue;
    vistas.add(nome);
  }
  return [...vistas].sort((x, y) => x.localeCompare(y, 'pt-BR'));
}

/** As cidades que um BLOCO passa: a uniao dos dias dele. */
export function cidadesDoBloco(s: Snapshot, b: { from: string; to: string }): string[] {
  const de = ISOS.indexOf(b.from);
  const ate = ISOS.indexOf(b.to);
  const vistas = new Set<string>();
  for (let i = de; i <= ate && i >= 0; i++)
    for (const c of cidadesDoDia(s, ISOS[i])) vistas.add(c);
  return [...vistas].sort((x, y) => x.localeCompare(y, 'pt-BR'));
}

/** total_eur se preenchido e > 0, SENAO nightly_eur x nights (regra 5.7). */

export function stayValor(o: {
  total_eur: number | null; nightly_eur: number | null; nights: number | null;
  check_in?: string; check_out?: string;
}): number {
  const t = num(o.total_eur);
  if (t) return t;
  // AS NOITES SAEM DAS DATAS desde 09/09, e nao mais do campo `nights`.
  // Decisao dele. A opcao que ele tinha gravado dizia "3 noites" com as
  // duas datas iguais — impossivel, e ninguem via. Sem datas validas nao
  // ha noite, e a diaria sozinha nao vira total: um numero de diaria sem
  // saber quantas noites nao e um custo, e chutar 1 esconderia o resto.
  return num(o.nightly_eur) * noitesDaOpcao({
    check_in: o.check_in ?? '', check_out: o.check_out ?? '',
  });
}

/**
 * O que a cidade custa: TODAS as marcadas dela.
 *
 * Era `stayChosen` (uma so), e com Madrid duas vezes o custo da segunda
 * estadia simplesmente nao entrava no total da viagem — sem erro nenhum na
 * tela. Achado em 09/09, ao trocar a regra de "uma por cidade" para "uma
 * por faixa de datas".
 */
export function stayTotal(s: Snapshot, city: string): number {
  return stayChosenAll(s, city).reduce((a, o) => a + stayValor(o), 0);
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
  // Conta CIDADES fechadas, e nao estadias: Madrid com dois airbnbs
  // marcados continua sendo uma cidade fechada, e o denominador sao as 7
  // cidades de hospedagem.
  return cities.filter((c) => stayChosenAll(s, c).some((o) => (o.address ?? '').trim())).length;
}
/**
 * Quantas OPCOES ele registrou nestas cidades — o numerozinho embaixo da
 * bandeira em Hospedagem (08/09/2026).
 *
 * NAO e o `stayCount` logo acima, e a diferenca importa: aquele conta
 * BASES FECHADAS (a marcada, com endereco) e vive no bloco de numeros
 * grandes da mesma tela, a dois cliques deste. Sao dois numeros pequenos e
 * parecidos dizendo coisas diferentes — por isso este nao se chama
 * `staysCount`, que ficaria a uma letra do outro, e por isso os dois estao
 * presos por teste.
 *
 * Conta opcao sem endereco e sem valor: a pergunta e "quantas eu
 * registrei", nao "quantas estao prontas".
 */
export function opcoesCount(s: Snapshot, cities: string[]): number {
  return s.stayOptions.filter((o) => cities.includes(o.city)).length;
}
/**
 * As noites que o ROTEIRO tem nesta cidade, UMA POR PASSAGEM.
 *
 * Devolve lista, e nao soma, por causa de MADRID: ele dorme la 3 noites no
 * comeco e mais 1 no fim, com um mes de viagem no meio. A primeira versao
 * desta funcao somava e a dica dizia "o roteiro tem 4 noites aqui" — e ele
 * fecharia UM Airbnb de 4 noites para uma estada que nunca existiu. Numero
 * certo, conselho errado; achado na revisao adversarial de 06/09.
 *
 * Sai de `baseList`, entao ja carrega as duas regras de la: dia "em transito"
 * nao conta, e a ULTIMA base perde uma noite porque o voo de volta sai 23h35
 * e ele dorme no aviao (regra 5.1). E por isso que a segunda passagem por
 * Madrid vale 1 noite, e nao 2.
 *
 * A base de um dia e texto livre — "Haarlem (Amsterda)" e uma delas — entao o
 * casamento com a cidade passa por `cityOfBase`, nunca por string crua.
 * Cidade sem dia nenhum devolve lista vazia, e a tela nao desenha dica.
 */
export function noitesEm(s: Snapshot, city: string): number[] {
  if (!city) return [];
  // O PLANO, e nao a reserva (09/09). Esta dica existe para ele COMPARAR o
  // anuncio com o que planejou ("seu plano tem 4 noites aqui"); lendo a
  // reserva ela diria de volta o que ele acabou de reservar, e nao serviria
  // para nada.
  return planoBlocos(s)
    .filter((b) => !ehTransito(b.base) && cityOfBase(s, b.base) === city)
    .map((b) => b.n);
}

/** Ja pago em hospedagem: so a marcada, e so se a caixinha estiver marcada. */
export function stayPagoEur(s: Snapshot, cities: string[]): number {
  // Todas as marcadas e pagas, e nao a primeira: ver `stayTotal`.
  return cities.reduce(
    (a, c) => a + stayChosenAll(s, c).filter((o) => o.paid).reduce((b, o) => b + stayValor(o), 0),
    0,
  );
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
    if (t.currency === 'brl') b += legValor(t); else e += legValor(t);
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

/**
 * O item que ele escreve dentro de um dia (`day_item`), somado.
 *
 * ENTRA no total da viagem e NAO entra na aba Custos — decisao registrada
 * na spec: aparecer nos dois lugares seria dois lugares para mexer no mesmo
 * dinheiro, e na primeira vez que discordassem ninguem saberia qual esta
 * certo. O item se edita so dentro do dia.
 *
 * A moeda padrao e EURO, como em transporte (regra 5.11).
 */
export const dayItemEur = (s: Snapshot) =>
  s.dayItems.reduce((a, x) => (x.currency !== 'brl' ? a + diValor(x) : a), 0);
export const dayItemBrl = (s: Snapshot) =>
  s.dayItems.reduce((a, x) => (x.currency === 'brl' ? a + diValor(x) : a), 0);
/**
 * Os dois lados juntos, em real — o molde do `legBrl` (11.6).
 *
 * Existe para a LINHA do Custos, que tem uma coluna so em real. Podia ser
 * `dayItemEur(s) * rate(s) + dayItemBrl(s)` escrito la na tela, e nao e de
 * proposito: formula de dinheiro fora do calc.ts foi o defeito que a etapa 1
 * achou TRES vezes (no check.mjs, na ESPECIFICACAO, e no proprio Custos).
 * Uma copia a menos e uma copia que nao tem como atrasar.
 */
export const dayItemTudoBrl = (s: Snapshot) =>
  dayItemEur(s) * rate(s) + dayItemBrl(s);

// ---------------- 11.7 os dois totais do dinheiro ----------------
export const rate = (s: Snapshot) => num(s.settings.eur_rate);

/** So o que esta no roteiro E com a caixinha marcada (Fase 5, 05/09). */
export const attrEurPago = (s: Snapshot) =>
  s.attractions.reduce((a, x) => (noRoteiro(x) && x.paid ? a + atrValor(x) : a), 0);

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
    (attrEurAll(s, 'roteiro') + stayTotalAll(s, cities) + extraEur(s)
      + dayItemEur(s) + x.eur) * rate(s) +
    extraBrl(s) + dayItemBrl(s) +
    x.brl +
    bookingBrl(s, '')
  );
}

// ============================================================
// 11.7b — OS TRES NUMEROS QUE NAO SAO O MESMO  (09/09/2026)
//
// Ele definiu os dois primeiros com as proprias palavras, e vale ler antes
// de mexer em qualquer formula daqui:
//
//   TOTAL PAGO      "o que eu ja paguei (a maioria das coisas com
//                    antecedencia: hospedagem, aviao, documentos, seguros,
//                    voos NA europa, trens entre paises da europa, atracoes
//                    que sao com antecedencia)"   -> `pagoBrl`, que ja existia
//
//   TOTAL ESTIMADO  "e para eu me preparar para o quanto vou ter que levar
//                    em dinheiro para viver la esse periodo"  -> `estimadoBrl`
//
//   GASTO REAL      "no final da viagem quero saber qual foi o total de
//                    todas as coisas"             -> `gastoSides`
//
// SOMAR OS TRES DA NUMERO ERRADO, e de proposito: comida entra no estimado
// e no gasto mas nao no custo da viagem (decisao dele), e o acumulado da
// aba Caixa e dinheiro guardado, nao gasto. Sao tres perguntas.
// ============================================================

/**
 * DINHEIRO NA MAO: o que ele desembolsa LA, nos 34 dias.
 *
 * Nao e "o resto do custo da viagem" — e o que vai no bolso. Por isso sai
 * de fora tudo que ele compra antes (`buy_ahead`) e tudo que ja saiu
 * (`paid` / `bought` / `done`).
 *
 * Comida ENTRA, e tem que entrar: e o gasto diario que ele mais precisa
 * prever. Atracao e comida so contam se estao NUM DIA — a regra de 05/09
 * do app inteiro. O backlog nao e dinheiro: ele nem decidiu fazer.
 */
export function estimadoSides(s: Snapshot): Sides {
  let e = 0, b = 0;
  for (const a of s.attractions)
    if (noRoteiro(a) && !a.buy_ahead && !a.paid) e += atrValor(a);
  for (const f of s.foods)
    if (f.day_iso && !f.done) e += comidaValor(f);
  for (const l of s.legs)
    if (!l.buy_ahead && !l.bought) { if (l.currency === 'brl') b += legValor(l); else e += legValor(l); }
  for (const i of s.dayItems)
    if (!i.done) { if (i.currency === 'brl') b += diValor(i); else e += diValor(i); }
  return { eur: e, brl: b };
}
export const estimadoBrl = (s: Snapshot) => {
  const x = estimadoSides(s);
  return x.eur * rate(s) + x.brl;
};

/**
 * O QUE SAIU DO BOLSO DE VERDADE — as linhas que ele CONFERIU, no valor
 * real. "dou um check e ele entra para os gastos".
 *
 * O check e a caixinha que ja existia em cada aba: `paid` na atracao,
 * `bought` no trecho, `done` na comida e no item do dia. Nao nasceu uma
 * segunda caixinha de dinheiro — a licao de 08/09 e dele e e literal
 * ("nao entendi porque tem dois campos de dinheiro").
 *
 * Sao as QUATRO LINHAS DO DIA e mais nada: hospedagem, burocracia e o voo
 * entram em `gastoTotalBrl`, que e o numero da viagem inteira. Assim
 * `gastoSidesDoDia` pode reusar exatamente esta conta.
 *
 * A linha conferida SEM valor real vale o planejado (`atrValor` e companhia
 * resolvem isso): marcar por outro caminho — o eco do tempo real, um F5 no
 * meio do clique — nao pode fazer a linha valer zero.
 */
export function gastoSides(s: Snapshot, iso?: string): Sides {
  const doDia = (d: string | null) => (iso === undefined ? true : d === iso);
  let e = 0, b = 0;
  for (const a of s.attractions)
    if (noRoteiro(a) && a.paid && doDia(a.day_iso)) e += atrValor(a);
  for (const f of s.foods)
    if (f.day_iso && f.done && doDia(f.day_iso)) e += comidaValor(f);
  for (const l of s.legs)
    if (l.bought && doDia(l.day_iso)) { if (l.currency === 'brl') b += legValor(l); else e += legValor(l); }
  for (const i of s.dayItems)
    if (i.done && doDia(i.day_iso)) { if (i.currency === 'brl') b += diValor(i); else e += diValor(i); }
  return { eur: e, brl: b };
}
/** O gasto real de UM dia — o "planejado 47, gasto 52" do exemplo dele. */
export const gastoSidesDoDia = (s: Snapshot, iso: string) => gastoSides(s, iso);

/**
 * O gasto real da VIAGEM INTEIRA, em real: as linhas conferidas mais o que
 * nunca foi linha de dia nenhum — hospedagem paga, burocracia resolvida e o
 * voo, que estava pago antes de o app existir.
 */
export function gastoTotalBrl(s: Snapshot, cities: string[]): number {
  const x = gastoSides(s);
  return (
    VOO +
    bookingBrl(s, 'pago') +
    x.brl +
    (x.eur + stayPagoEur(s, cities)) * rate(s)
  );
}

/**
 * Os trechos QUE ELE COMPRA ANTES: quantos ja comprou, de quantos.
 *
 * `total` conta so `buy_ahead` — a regua e dele: "voos interpaises e trens
 * intercidades". O metro do dia a dia nao entra em nenhum dos dois numeros,
 * porque ele nunca vai "estar pendente".
 *
 * LER `bought` NO LUGAR DE `buy_ahead` AQUI da dois numeros plausiveis e
 * errados, e compila limpo. Ha teste com os cinco casos.
 */
export function legAhead(s: Snapshot): { pegos: number; total: number } {
  const antes = s.legs.filter((l) => l.buy_ahead);
  return { pegos: antes.filter((l) => l.bought).length, total: antes.length };
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
/**
 * O valor de UM aporte em R$, pela moeda DO APORTE (06/09).
 *
 * Antes lia a moeda da PESSOA (`cxBrl(..., c.who)`): o mesmo defeito do
 * `cxTotal`, uma linha acima. Um aporte lancado em real continuava real
 * mesmo que ela trocasse o seletor depois.
 */
export const cxBrlDe = (s: Snapshot, c: Contribution) =>
  c.currency === 'eur' ? num(c.amount) * rate(s) : num(c.amount);

/** UM aporte na moeda que a pessoa usa HOJE. E o tijolo do `cxTotal`. */
export function cxNaMoeda(s: Snapshot, c: Contribution): number {
  const cur = cxCur(s, c.who);
  const v = num(c.amount);
  if (c.currency === cur) return v;
  const r = rate(s);
  return cur === 'brl' ? v * r : (r ? v / r : 0);
}

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

/**
 * O que a pessoa tem, na moeda dela — somando CADA APORTE PELA MOEDA DELE.
 *
 * Ate 06/09 isto somava os valores crus e a conversao acontecia depois,
 * uma vez so, pela moeda do SELETOR. Enquanto todos os aportes fossem da
 * mesma moeda dava certo por acidente. Trocar o seletor depois de lancar
 * reescrevia o passado: R$ 20.000 viravam EUR 20.000 = R$ 124.000 no
 * Painel, sem nada na tela indicando que o numero mudou de significado.
 *
 * Agora o aporte carrega a propria moeda (coluna `currency`, migracao
 * 08). Trocar o seletor passa a fazer o que ele espera: mostrar o MESMO
 * dinheiro na outra moeda.
 */
export function cxTotal(s: Snapshot, w: Who): number {
  const cur = cxCur(s, w);
  const r = rate(s);
  return s.contributions.reduce((a, c) => {
    if (c.who !== w) return a;
    const v = num(c.amount);
    if (c.currency === cur) return a + v;
    return a + (cur === 'brl' ? v * r : (r ? v / r : 0));
  }, 0);
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

/**
 * O aviso de um dia. Desde 05/09 ele vem do BANCO, nao do arquivo: e
 * dele, edita e apaga. O calendario e o cartao do dia mostram so o
 * primeiro, que e o que cabe; a tela do dia mostra todos.
 */
export const avisoDoDia = (s: Snapshot, iso: string) => avisosDe(s, `roteiro:${iso}`)[0];
/**
 * O que aparece no calendario e na linha do bloco SEM ele clicar no dia
 * (Fase 4, 05/09). Eram os dois unicos lugares assim, e o Leo pediu o dia
 * limpo — mas so os `alert` podem arruinar um dia se ele nao os vir NAQUELE
 * dia: o transporte de Luxemburgo parando as 20h no 24, a perna mais cara
 * no 29, a Epifania no 6. Dia limpo e dia sem triangulo e sem etiqueta de
 * dica; nao e dia sem alerta. O resto virou a aba Dicas.
 */
export const alertaDoDia = (s: Snapshot, iso: string) => {
  const av = avisoDoDia(s, iso);
  return av && av.tone === 'alert' ? av : undefined;
};

// ---------------- a base do dia acha a cidade (secao 10.2) ----------------
/**
 * Casa o texto livre da base de um dia com uma cidade.
 *
 * As FIXAS vem primeiro em toda passada, de proposito: a terceira passada
 * casa por pedaco de nome nos dois sentidos, e ela fica mais larga a cada
 * cidade que ele criar. Uma cidade chamada "Nice" faria a base "Venice"
 * resolver para ela, calado. Com as 11 na frente, elas continuam se
 * comportando exatamente como hoje, e so o que sobra chega nas dele.
 */
export function cityOfBase(s: Snapshot, b: string): string {
  const n = norm(b);
  if (!n) return '';
  const nomes: [string, string][] = [
    ...Object.keys(CT).map((k) => [k, CT[k].n] as [string, string]),
    ...s.cities.map((c) => [c.k, c.n] as [string, string]),
  ];
  if (CT[n]) return n;
  if (s.cities.some((c) => c.k === n)) return n;
  for (const [k, nome] of nomes) if (norm(nome) === n) return k;
  for (const [k, nome] of nomes) {
    const c = norm(nome);
    if (c.length > 3 && (n.indexOf(c) >= 0 || c.indexOf(n) >= 0)) return k;
  }
  return '';
}

/** A base do dia primeiro, depois o resto do pais, depois todas (secao 10.2). */
export function pickCities(s: Snapshot, baseKey: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (c: string) => {
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  };
  if (baseKey) push(baseKey);
  const coBase = paisDaCidade(s, baseKey);
  if (coBase) for (const c of cidadesDe(s, coBase)) push(c);
  for (const co of CO) for (const c of cidadesDe(s, co.k)) push(c);
  return out;
}

/** Quantas atracoes da cidade ainda estao sem dia. */
export function freeCount(s: Snapshot, city: string): number {
  return attrsOf(s, city).filter((a) => !a.day_iso).length;
}
