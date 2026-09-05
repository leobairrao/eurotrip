// Uma linha por coisa editavel (secao 6.1). Espelha o esquema do Postgres.
export type Currency = 'eur' | 'brl';
export type Status = 'escolhida' | 'backlog' | 'sugerida';
export type AttrKind = 'passeio' | 'tour';
export type FoodKind = 'prato' | 'restaurante' | 'cafe';
export type LegKind = 'trem' | 'aviao' | 'onibus' | 'carro';
export type Who = 'leo' | 'lu';
/** A cor da barra de um aviso: verde, ambar, vermelho. */
export type Tone = 'free' | 'warn' | 'alert';

export interface Day {
  iso: string;
  base: string;
  plan: string;
  updated_at?: string;
  updated_by?: string | null;
}
export interface Attraction {
  id: string;
  city: string;
  name: string;
  price_eur: number;
  note: string;
  status: Status;
  kind: AttrKind;
  day_iso: string | null;
  seed_id: string | null;
}
export interface Food {
  id: string;
  country: string;
  name: string;
  note: string;
  kind: FoodKind;
  day_iso: string | null;
  seed_id: string | null;
}
export interface Leg {
  id: string;
  position: number;
  name: string;
  note: string;
  kind: LegKind;
  amount: number | null;
  currency: Currency;
  bought: boolean;
  day_iso: string | null;
  seed_id: string | null;
}
export interface Booking {
  id: string;
  position: number;
  name: string;
  note: string;
  amount: number | null;
  currency: Currency;
  done: boolean;
  seed_id: string | null;
}
export interface Stay {
  city: string;
  address: string;
  check_in: string;
  check_out: string;
  nightly_eur: number | null;
  nights: number | null;
  total_eur: number | null;
  link: string;
  notes: string;
}
export interface Extra {
  id: string;
  name: string;
  amount: number | null;
  currency: Currency;
}
export interface Savings {
  who: Who;
  goal: number | null;
  currency: Currency;
}
/**
 * Um aporte: um bolo de dinheiro que entrou no caixa num dia.
 * Nao existe mais "o aporte de setembro" — existe "R$ 1.500 do 13o
 * salario, em 12 de setembro". Uma linha por aporte, com id proprio,
 * igual a `extra` e a `leg`.
 */
export interface Contribution {
  id: string;
  who: Who;
  /** 'aaaa-mm-dd': o dia em que o dinheiro entrou. */
  on_date: string;
  /** De onde veio. Pode ficar vazio. */
  label: string;
  amount: number | null;
  /** So para desempatar dois aportes do MESMO dia no acumulado. */
  created_at?: string;
}
/**
 * Um aviso: um cartao de recado numa tela.
 *
 * Ate 05/09/2026 eles eram meus e moravam em arquivo (regra 5.6). Agora
 * sao linhas, e ele edita e apaga. O `body` e TEXTO PURO: negrito se
 * escreve *assim*, e a tela converte com `marcado()`.
 */
export interface Aviso {
  id: string;
  /** onde aparece: 'atracoes:lisboa' | 'roteiro:2026-12-10' | 'comidas:pt' | 'comidas:pt:naovale' | 'transporte' */
  spot: string;
  tone: Tone;
  title: string;
  body: string;
  position: number;
  seed_id: string | null;
}
export interface Settings {
  id: number;
  eur_rate: number;
  flight_paid_brl: number;
}
export interface AppUser {
  id: string;
  email: string;
  who: Who;
}

/** Tudo o que o app tem em memoria. */
export interface Snapshot {
  days: Record<string, Day>;
  attractions: Attraction[];
  foods: Food[];
  legs: Leg[];
  bookings: Booking[];
  stays: Record<string, Stay>;
  extras: Extra[];
  settings: Settings;
  killed: string[];
  adopted: string[];
  /**
   * As DUAS linhas da Caixa (meta e moeda de cada um), e os aportes.
   *
   * A secao 7 propunha deixar isto privado (cada um so a propria linha) e
   * mandava perguntar antes de abrir. Perguntado em 04/09: o Leo escolheu
   * abrir, igual ao artefato de hoje. Os dois leem e escrevem os dois.
   * Para fechar de novo, veja a nota no fim de supabase/02-politicas.sql.
   */
  savings: Record<Who, Savings>;
  /** Todos os aportes dos dois, sem ordem garantida. Ordene com C.cxLista. */
  contributions: Contribution[];
  /** Os avisos de todas as telas. Filtre com C.avisosDe(s, spot). */
  avisos: Aviso[];
  me: AppUser | null;
  /**
   * A data de hoje, fixada UMA vez no servidor (ISO 'aaaa-mm-dd').
   * Serve para "dias ate embarcar" e para a lista de meses da Caixa
   * baterem no servidor e no cliente — senao o React reclama de
   * hidratacao quando os dois estao em fusos diferentes.
   */
  hoje: string;
}

export const EMPTY_STAY = (city: string): Stay => ({
  city,
  address: '',
  check_in: '',
  check_out: '',
  nightly_eur: null,
  nights: null,
  total_eur: null,
  link: '',
  notes: '',
});
