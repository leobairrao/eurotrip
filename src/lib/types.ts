// Uma linha por coisa editavel (secao 6.1). Espelha o esquema do Postgres.
export type Currency = 'eur' | 'brl';
export type Status = 'escolhida' | 'backlog' | 'sugerida';
export type AttrKind = 'passeio' | 'tour';
export type FoodKind = 'prato' | 'restaurante' | 'cafe';
export type LegKind = 'trem' | 'aviao' | 'onibus' | 'carro';
export type Who = 'leo' | 'lu';

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
  opening: number | null;
  currency: Currency;
}
export interface Contribution {
  who: Who;
  month: string;
  amount: number | null;
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

/** So agregados. Nunca as linhas — a Caixa e privada (secao 7). */
export interface CaixaGeral {
  opening_brl: number;
  goal_brl: number;
  contrib_brl: number;
  months: Record<string, number>;
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
  /** So a MINHA linha — a do outro a RLS nao entrega. */
  mySavings: Savings | null;
  /** So os MEUS aportes. */
  myContributions: Record<string, number | null>;
  /** Os agregados dos dois, via funcao security definer. */
  geral: CaixaGeral;
  me: AppUser | null;
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
