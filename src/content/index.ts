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

export type CountryKey = 'es' | 'pt' | 'fr' | 'lu' | 'de' | 'nl' | 'it';
export type NoteKind = 'free' | 'warn' | 'alert';

export interface Country {
  k: CountryKey;
  n: string;
  cc: string;
  cities: string[];
}
export interface City {
  n: string;
  co: CountryKey;
}

/** Os 7 paises, na ordem da viagem. */
export const CO = paisesCidades.paises as Country[];
/** As 11 cidades, por chave. */
export const CT = paisesCidades.cidades as Record<string, City>;

export const CITY_KEYS = Object.keys(CT);

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

export const CITYNOTE = avisosCidadeJson as Record<string, Aviso>;
export const DAYNOTE = avisosDiaJson as Record<string, Aviso>;

// ---------- hospedagem: o texto do bairro (nao e dado dele) ----------
export interface StaySpec {
  c: string;
  area: string;
  res: string;
  warn?: string;
  free?: number;
}
export const STAYS = hospedagemJson as StaySpec[];

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
export const FOOD: FoodSugg[] = (comidasSugeridasJson as FoodSugg[]).filter((f) =>
  CO.some((c) => c.k === f.pais),
);

export const SUGGRES = reservasSugeridasJson as [string, string][];

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

/** Os 5 itens do cartao ocre do Painel. Texto fixo — manter. */
export const DECISOES: string[] = [
  '<b>O carro de Cáceres.</b> Se o irmão do CK não precisar dele de volta no dia 16, Lisboa → Madrid vira voo de 1h20 e você ganha quase um dia inteiro em Madrid — que hoje só tem 2 dias cheios.',
  '<b>Toledo, Segovia e Ávila</b> não cabem nos 2 dias de Madrid. Ou você resolve o dia 16, ou corta as três.',
  '<b>O dia 21 em Metz.</b> Deixei como segundo dia na Alsácia. Colmar ou Nancy provavelmente rendem mais que repetir Estrasburgo.',
  '<b>O dia 28 em Reims.</b> Segundo bate-volta a Paris, ou o dia de Reims com a cave de champanhe. Não cabem os dois.',
  '<b>Roma tem 8 noites</b> e a cidade são 4 dias. Os outros são bate-volta: Ostia Antica, Tivoli, Nápoles e Pompeia, Florença. Escolha dois.',
];

// ---------- rotulos e emojis (secao 13.5) ----------
export const ST = { escolhida: 'escolhida', backlog: 'backlog', sugerida: 'sugerida' } as const;
export const STORD: Record<string, number> = { escolhida: 0, backlog: 1, sugerida: 2 };
/** A classe CSS curta que o estilo-atual.css espera: st-esc / st-bac / st-sug */
export const STCLS: Record<string, string> = { escolhida: 'esc', backlog: 'bac', sugerida: 'sug' };

export const AK = { passeio: 'passeio', tour: 'tour' } as const;
export const AKE: Record<string, string> = { passeio: '🚶', tour: '🏛️' };

export const FK = { prato: 'prato', restaurante: 'restaurante', cafe: 'café' } as const;
export const FKE: Record<string, string> = { prato: '🍲', restaurante: '🍽️', cafe: '☕' };
export const FKPL: Record<string, string> = { prato: 'pratos', restaurante: 'restaurantes', cafe: 'cafés' };
export const FKORD: Record<string, number> = { prato: 0, restaurante: 1, cafe: 2 };
/** classe CSS curta: fk-pr / fk-rest / fk-cafe */
export const FKCLS: Record<string, string> = { prato: 'pr', restaurante: 'rest', cafe: 'cafe' };

export const TK = { trem: 'trem', aviao: 'avião', onibus: 'ônibus', carro: 'carro' } as const;
export const TKPL: Record<string, string> = { trem: 'trens', aviao: 'aviões', onibus: 'ônibus', carro: 'carros' };
export const TKE: Record<string, string> = { trem: '🚆', aviao: '✈️', onibus: '🚌', carro: '🚗' };
export const TKORD: Record<string, number> = { trem: 0, aviao: 1, onibus: 2, carro: 3 };

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

export const TABS = [
  ['painel', 'Painel'],
  ['roteiro', 'Roteiro'],
  ['atracoes', 'Atrações'],
  ['comidas', 'Comidas'],
  ['transporte', 'Transporte'],
  ['stay', 'Hospedagem'],
  ['reservas', 'Reservas'],
  ['caixa', 'Caixa'],
  ['custos', 'Custos'],
] as const;

export type TabKey = (typeof TABS)[number][0];
