// ============================================================
// Conteudo fixo (ESPECIFICACAO.md secao 6.3).
// Nao e editavel, nao conta em soma nenhuma, nao vai para o banco.
// Os JSONs sao importados crus de proposito: retranscrever texto
// a mao e como se perde conteudo.
// ============================================================
import paisesCidades from './paises-cidades.json';
import avisosCidadeJson from './avisos-cidade.json';
import avisosDiaJson from './avisos-dia.json';
import comidasSugeridasJson from './comidas-sugeridas.json';
import reservasSugeridasJson from './reservas-sugeridas.json';
import hospedagemJson from './hospedagem.json';
import hospSugeridasJson from './hospedagens-sugeridas.json';
// Os dois abaixo entraram em 06/09, quando a pesquisa saiu das tabelas dele
// e passou a viver so em arquivo. Antes disso eram lidos SO pelo seed, do
// gemeo em `dados/` — o navegador nunca alcancou nenhum dos dois.
import atracoesSugeridasJson from './atracoes-sugeridas.json';
import transportesJson from './transportes.json';

export type CountryKey = 'es' | 'pt' | 'fr' | 'lu' | 'de' | 'nl' | 'it';
export type NoteKind = 'free' | 'warn' | 'alert';

export interface Country {
  k: CountryKey;
  n: string;
  cc: string;
}
export interface City {
  n: string;
  co: CountryKey;
}

/** Os 7 paises, na ordem da viagem. */
export const CO = paisesCidades.paises as Country[];
/** As 11 cidades FIXAS, por chave. As dele vivem na tabela `city`. */
export const CT = paisesCidades.cidades as Record<string, City>;

export const CITY_KEYS = Object.keys(CT);

/**
 * As cidades fixas de cada pais, na ordem da viagem.
 *
 * Isto era o campo `cities` de `Country`, e foi TIRADO de la de proposito
 * na mudanca de 05/09 que deixou o Leo criar cidade: enquanto ele
 * existisse, qualquer laco continuaria lendo so as 11 e a cidade nova
 * ficaria meio dentro meio fora — cartao em Atracoes, nada em Dicas. Sem
 * o campo, o `tsc` aponta sozinho todo lugar que precisa passar a somar
 * as dele. Quem quiser a lista COMPLETA usa `C.cidadesDe(s, pais)`.
 */
export const CIDADES_FIXAS: Record<string, string[]> = Object.fromEntries(
  (paisesCidades.paises as { k: string; cities: string[] }[]).map((c) => [c.k, c.cities]),
);

export function coOf(k: string): Country {
  return CO.find((c) => c.k === k) ?? CO[0];
}
/** A variavel CSS de cor da cidade, pelo pais dela. */
export function ccOf(city: string): string {
  const c = CT[city];
  if (!c) return '--pine';
  return CO.find((x) => x.k === c.co)?.cc ?? '--pine';
}

// ---------- avisos: meus, nao dele (regra 5.6) ----------
/** [tipo, titulo, corpo] — nao editavel, nao apagavel, nao soma. */
export type Aviso = [NoteKind, string, string];

export const CITYNOTE = avisosCidadeJson as unknown as Record<string, Aviso>;
export const DAYNOTE = avisosDiaJson as unknown as Record<string, Aviso>;

// ---------- hospedagem: o texto do bairro (nao e dado dele) ----------
export interface StaySpec {
  c: string;
  area: string;
  res: string;
  warn?: string;
  free?: number;
}
export const STAYS = hospedagemJson as StaySpec[];

/**
 * As opcoes de hospedagem por cidade (Fase 6, 05/09).
 *
 * Ate aqui nao existia lista nenhuma no repositorio, so PROSA: Madrid
 * escondia tres bairros dentro de uma frase de `res`. Isto e a mesma
 * pesquisa, virada em itens. `[nome, diaria em euro ou null, nota]` — a
 * diaria e null onde a pesquisa nao trazia numero, porque preco de hotel
 * nao se inventa.
 */
export type HospSugg = [string, number | null, string];
/**
 * O `_` NAO entra: e a chave de comentario que explica o arquivo, e o valor
 * dela e uma FRASE, nao uma lista. Sem este filtro, todo laco que varre as
 * cidades tropeca num `.map` de string — foi exatamente assim que a aba
 * Sugestoes caiu na primeira vez que a abri, em 06/09. `atracoes-sugeridas`
 * nao tem `_`; este tem. Ver o teste em tests/telas.test.mjs.
 */
export const HOSP_SUG = Object.fromEntries(
  Object.entries(hospSugeridasJson as Record<string, unknown>).filter(([k]) => k !== '_'),
) as unknown as Record<string, HospSugg[]>;

// ---------- camada de pesquisa: o + copia para a tabela dele (regra 5.13) ----------
export interface FoodSugg {
  pais: CountryKey;
  cc: string;
  n: string;
  reg: [string, string][];
  av?: [string, string][];
  warn?: [string, string];
}
/**
 * comidas-sugeridas.json tem 9 entradas, mas so 7 valem: 'be' e 'pl' sao
 * resquicio de Bruxelas e Cracovia, que foram cortadas (secao 4 e 6.3).
 */
export const FOOD: FoodSugg[] = (comidasSugeridasJson as unknown as FoodSugg[]).filter((f) =>
  CO.some((c) => c.k === f.pais),
);

export const SUGGRES = reservasSugeridasJson as unknown as [string, string][];

// ---------- o que so existe no artefato ----------
/** "O que sai daqui de bate-volta", na tabela do Painel. Chave = base em minusculo. */
export const BASEOUT: Record<string, string> = {
  'cáceres': 'a cidade velha murada, e só',
  'lisboa': 'Sintra e Cascais',
  'madrid': 'Toledo, Segovia ou Ávila, se couber',
  'metz': 'Luxemburgo, Estrasburgo, Trier, Nancy ou Colmar',
  'reims': 'Paris, e Épernay',
  'amsterdã': 'Utrecht, Zaanse Schans, Haarlem',
  'roma': 'Ostia Antica, Tivoli, Nápoles e Pompeia, Florença',
};

// A constante DECISOES vivia aqui: os cinco conselhos meus do cartao ocre
// do Painel. Ele a apagou na lista de 08/09 — "Deixa de existir, isso eu que
// mando" — e o cartao saiu do Painel em 09/09. O texto esta no git, se um dia
// alguem quiser ler o que eu tinha sugerido.

// ---------- rotulos e emojis (secao 13.5) ----------
export const ST = { escolhida: 'escolhida', backlog: 'backlog', sugerida: 'sugerida' } as const;
export const STORD: Record<string, number> = { escolhida: 0, backlog: 1, sugerida: 2 };
/** A classe CSS curta que o estilo-atual.css espera: st-esc / st-bac / st-sug */
export const STCLS: Record<string, string> = { escolhida: 'esc', backlog: 'bac', sugerida: 'sug' };

export const AK = { passeio: 'passeio', tour: 'tour' } as const;
export const AKE: Record<string, string> = { passeio: '🚶', tour: '🏛️' };
/**
 * O emoji do tema, COM saida para tema inventado.
 *
 * Desde 06/09 o tema e texto livre, entao `AKE[kind]` e `undefined` para
 * tudo que nao seja passeio ou tour — e `{undefined} {nome}` no JSX nao
 * quebra nada: so desenha um espaco solto antes do nome, em quatro lugares
 * do Roteiro, e ninguem descobre. Use SEMPRE esta funcao.
 */
export const akEmoji = (kind: string): string => AKE[kind] ?? '📍';
/** O emoji do transporte, com saida. Irma de `akEmoji` — mesma razao. */
export const tkEmoji = (kind: string): string => TKE[kind] ?? '🚉';
/** O emoji da comida, com saida. */
export const fkEmoji = (kind: string): string => FKE[kind] ?? '🍴';
/**
 * O item que ELE escreve direto no dia. 📌 le como "coisa presa neste dia",
 * e nao colide com nenhum dos outros tres tipos.
 */
export const DI_EMOJI = '📌';

export const FK = { prato: 'prato', restaurante: 'restaurante', cafe: 'café' } as const;
export const FKE: Record<string, string> = { prato: '🍲', restaurante: '🍽️', cafe: '☕' };
export const FKPL: Record<string, string> = { prato: 'pratos', restaurante: 'restaurantes', cafe: 'cafés' };
export const FKORD: Record<string, number> = { prato: 0, restaurante: 1, cafe: 2 };
/** classe CSS curta: fk-pr / fk-rest / fk-cafe */
export const FKCLS: Record<string, string> = { prato: 'pr', restaurante: 'rest', cafe: 'cafe' };

export const TK = { trem: 'trem', aviao: 'avião', onibus: 'ônibus', carro: 'carro', metro: 'metrô' } as const;
export const TKPL: Record<string, string> = { trem: 'trens', aviao: 'aviões', onibus: 'ônibus', carro: 'carros', metro: 'metrôs' };
export const TKE: Record<string, string> = { trem: '🚆', aviao: '✈️', onibus: '🚌', carro: '🚗', metro: '🚇' };
/** O metro entra no FIM (4), nao ao lado do trem: mudar a ordem dos quatro
 *  existentes reembaralharia os 12 trechos que ele ja tem na aba Transporte. */
export const TKORD: Record<string, number> = { trem: 0, aviao: 1, onibus: 2, carro: 3, metro: 4 };

// ---------- as constantes de referencia (secao 11.9) ----------
/** R$ 5.079,77 — o voo internacional, ja pago. */
export const VOO = 5079.77;
/** € 2.795 — a minha estimativa da parte DELE. Nao entra em soma nenhuma. */
export const ESTIM_EUR = 2795;
/** R$ 19.920 — o que sobra depois do voo. */
export const TETO = 19920;
export const PRIMEIRO_DIA = '2026-12-10';
export const ULTIMO_DIA = '2027-01-12';
export const TOTAL_DIAS = 34;

/** Os 34 dias, em ISO. Gerado, nao escrito a mao. */
export const ISOS: string[] = (() => {
  const out: string[] = [];
  const d = new Date(2026, 11, 10);
  const end = new Date(2027, 0, 12);
  while (d <= end) {
    out.push(
      d.getFullYear() +
        '-' +
        String(d.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(d.getDate()).padStart(2, '0'),
    );
    d.setDate(d.getDate() + 1);
  }
  return out;
})();

/**
 * Um emoji por pais, para a fita de circulos (Fase 7).
 *
 * Bandeira, e nao monumento: sete circulos lado a lado tem que ser
 * reconheciveis num relance e sem repetir. Monumento repetiria — Trier e
 * Roma sao os dois ruina romana.
 */
export const COEMOJI: Record<string, string> = {
  es: '🇪🇸', pt: '🇵🇹', fr: '🇫🇷', lu: '🇱🇺', de: '🇩🇪', nl: '🇳🇱', it: '🇮🇹',
};

export const TABS = [
  ['painel', 'Painel'],
  ['roteiro', 'Roteiro'],
  ['atracoes', 'Atrações'],
  ['comidas', 'Comidas'],
  ['transporte', 'Transporte'],
  ['stay', 'Hospedagem'],
  ['reservas', 'Reservas'],
  // Dicas nasceu na Fase 4 (05/09): as dicas sairam dos dias do Roteiro e
  // vieram para ca, por cidade. Fica ao lado de Reservas porque as duas
  // sao "coisas para lembrar", nao dinheiro.
  ['dicas', 'Dicas'],
  // Sugestoes nasceu em 06/09: TUDO que eu pesquisei mora aqui, e so vira
  // linha dele pelo +. Fica ao lado de Dicas porque as duas sao as unicas
  // que nao sao lista dele nem dinheiro.
  ['sugestoes', 'Sugestões'],
  ['caixa', 'Caixa'],
  ['custos', 'Custos'],
] as const;

export type TabKey = (typeof TABS)[number][0];

// ============================================================
// A PESQUISA MINHA, a partir de 06/09/2026.
//
// A regra que ele deu: "tudo que for sugerido por voce, absolutamente
// tudo. As minhas abas devem ficar apenas com os meus dados".
//
// Antes disso eu semeava a pesquisa DENTRO das tabelas dele. Parecia
// dado dele, e o x mandava o seed_id para `killed_seed` — de onde nem
// `npm run seed` traz de volta. Ele perdeu 17 opcoes de hospedagem e 35
// atracoes assim, em dois dias.
//
// Agora sugestao minha e ARQUIVO, e so vira linha dele pelo +. Apagar
// deixou de ser definitivo: o + esta la para puxar de novo.
// ============================================================

/** Uma atracao que eu pesquisei: [nome, preco em euro, nota]. */
export type AtracaoSugerida = [string, number, string];
/** Por cidade, na ordem em que eu pesquisei. O indice e a identidade (`s:<cidade>:<i>`). */
export const ATR_SUG = Object.fromEntries(
  Object.entries(atracoesSugeridasJson as Record<string, unknown>)
    .filter(([k]) => k !== '_'),
) as Record<string, AtracaoSugerida[]>;

/** Um trecho que eu pesquisei. O indice no array e a identidade (`t:<i>`). */
/**
 * `ba` = "compro antes", a SUGESTAO de 09/09. A regua e dele: "voos
 * interpaises e trens intercidades" sim; "trens e metros dentro das
 * cidades" nao — os tres TER regionais ficam `false`.
 *
 * E sugestao, e nao dado dele: so vira linha pelo `+`, e um clique na
 * etiqueta muda. (A regra de 06/09.)
 */
export interface TrechoSugerido { n: string; w: string; k: string; ba?: boolean }
export const TRANSP_SUG = transportesJson as TrechoSugerido[];

/** As seis sub-abas de Sugestoes, na ordem em que ele as usa. */
export const SUGTABS = [
  ['atracoes', 'Atrações'],
  ['comidas', 'Comidas'],
  ['reservas', 'Reservas'],
  ['stay', 'Hospedagem'],
  ['transporte', 'Transporte'],
  ['dicas', 'Dicas'],
] as const;
export type SugKey = (typeof SUGTABS)[number][0];
