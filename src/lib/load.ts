// ============================================================
// Carrega tudo de uma vez, no servidor. Sao ~150 linhas no total,
// entao nao vale paginar nada: uma ida, primeira pintura pronta,
// e dai o cliente assume com o Realtime.
// ============================================================
import { STAYS, VOO } from '@/content';
import { EMPTY_STAY } from './types';
import type {
  AppUser, Attraction, Booking, CaixaGeral, Extra, Food, Leg,
  Savings, Settings, Snapshot, Stay,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SEM_SUPABASE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const vazio = (): Snapshot => ({
  days: {},
  attractions: [],
  foods: [],
  legs: [],
  bookings: [],
  stays: Object.fromEntries(STAYS.map((s) => [s.c, EMPTY_STAY(s.c)])),
  extras: [],
  settings: { id: 1, eur_rate: 6, flight_paid_brl: VOO },
  killed: [],
  adopted: [],
  mySavings: null,
  myContributions: {},
  geral: { opening_brl: 0, goal_brl: 0, contrib_brl: 0, months: {} },
  me: null,
  hoje: hojeIso(),
});

/** 'aaaa-mm-dd' no fuso de quem roda o servidor. */
function hojeIso(): string {
  const d = new Date();
  return (
    d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export async function carregar(db: SupabaseClient, me: AppUser | null): Promise<Snapshot> {
  const [
    day, attraction, food, leg, booking, stay, extra, settings,
    killed, adopted, savings, contribution, geral,
  ] = await Promise.all([
    db.from('day').select('*').order('iso'),
    db.from('attraction').select('*'),
    db.from('food').select('*'),
    db.from('leg').select('*').order('position'),
    db.from('booking').select('*').order('position'),
    db.from('stay').select('*'),
    db.from('extra').select('*').order('created_at'),
    db.from('settings').select('*').eq('id', 1).maybeSingle(),
    db.from('killed_seed').select('seed_id'),
    db.from('adopted').select('seed_id'),
    db.from('savings').select('*'),          // a RLS entrega so a minha linha
    db.from('contribution').select('*'),     // idem
    db.rpc('caixa_geral'),                   // os agregados dos dois
  ]);

  const s = vazio();
  s.me = me;

  for (const d of day.data ?? []) s.days[String(d.iso)] = { ...d, iso: String(d.iso) };
  s.attractions = (attraction.data ?? []).map(normAttr);
  s.foods = (food.data ?? []).map(normFood);
  s.legs = (leg.data ?? []).map(normLeg);
  s.bookings = (booking.data ?? []).map(normBooking);
  s.extras = (extra.data ?? []).map(normExtra);
  for (const st of stay.data ?? []) s.stays[st.city] = normStay(st);
  if (settings.data) s.settings = { ...settings.data, eur_rate: Number(settings.data.eur_rate) };
  s.killed = (killed.data ?? []).map((r: { seed_id: string }) => r.seed_id);
  s.adopted = (adopted.data ?? []).map((r: { seed_id: string }) => r.seed_id);

  const minha = (savings.data ?? []).find((r: Savings) => !me || r.who === me.who) ?? null;
  s.mySavings = minha ? { ...minha, goal: n(minha.goal), opening: n(minha.opening) } : null;
  for (const c of contribution.data ?? []) s.myContributions[c.month] = n(c.amount);

  if (geral.data) s.geral = geral.data as CaixaGeral;
  return s;
}

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const normAttr = (r: Record<string, unknown>): Attraction => ({
  id: String(r.id), city: String(r.city), name: String(r.name),
  price_eur: Number(r.price_eur ?? 0), note: String(r.note ?? ''),
  status: r.status as Attraction['status'], kind: r.kind as Attraction['kind'],
  day_iso: r.day_iso ? String(r.day_iso) : null,
  seed_id: r.seed_id ? String(r.seed_id) : null,
});
const normFood = (r: Record<string, unknown>): Food => ({
  id: String(r.id), country: String(r.country), name: String(r.name),
  note: String(r.note ?? ''), kind: r.kind as Food['kind'],
  day_iso: r.day_iso ? String(r.day_iso) : null,
  seed_id: r.seed_id ? String(r.seed_id) : null,
});
const normLeg = (r: Record<string, unknown>): Leg => ({
  id: String(r.id), position: Number(r.position ?? 0), name: String(r.name),
  note: String(r.note ?? ''), kind: r.kind as Leg['kind'],
  amount: n(r.amount), currency: r.currency as Leg['currency'],
  bought: !!r.bought,
  day_iso: r.day_iso ? String(r.day_iso) : null,
  seed_id: r.seed_id ? String(r.seed_id) : null,
});
const normBooking = (r: Record<string, unknown>): Booking => ({
  id: String(r.id), position: Number(r.position ?? 0), name: String(r.name),
  note: String(r.note ?? ''), amount: n(r.amount),
  currency: r.currency as Booking['currency'], done: !!r.done,
  seed_id: r.seed_id ? String(r.seed_id) : null,
});
const normExtra = (r: Record<string, unknown>): Extra => ({
  id: String(r.id), name: String(r.name), amount: n(r.amount),
  currency: r.currency as Extra['currency'],
});
const normStay = (r: Record<string, unknown>): Stay => ({
  city: String(r.city), address: String(r.address ?? ''),
  check_in: String(r.check_in ?? ''), check_out: String(r.check_out ?? ''),
  nightly_eur: n(r.nightly_eur), nights: n(r.nights), total_eur: n(r.total_eur),
  link: String(r.link ?? ''), notes: String(r.notes ?? ''),
});

// ============================================================
// Modo demonstracao: SO quando nao existe Supabase configurado.
// Serve para conferir as nove telas lado a lado com o artefato
// (secao 15, "Aparencia") antes de o banco existir. Nada salva.
// ============================================================
export async function carregarDemo(): Promise<Snapshot> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const bruto = JSON.parse(
    await readFile(join(process.cwd(), 'dados', 'estado-atual-do-leo.json'), 'utf8'),
  );
  const num = (v: unknown) => {
    const x = parseFloat(String(v ?? '').replace(',', '.'));
    return isNaN(x) ? 0 : x;
  };
  const val = (v: unknown) => (String(v ?? '').trim() ? num(v) : null);
  const ST: Record<string, Attraction['status']> = {
    esc: 'escolhida', bac: 'backlog', sug: 'sugerida',
  };
  const FKD: Record<string, Food['kind']> = {
    pr: 'prato', rest: 'restaurante', cafe: 'cafe',
  };

  const s = vazio();
  s.settings = { id: 1, eur_rate: num(bruto.rate), flight_paid_brl: VOO };
  for (const [iso, d] of Object.entries<{ c?: string; p?: string }>(bruto.days ?? {}))
    s.days[iso] = { iso, base: d.c ?? '', plan: d.p ?? '' };

  for (const [city, itens] of Object.entries<Record<string, unknown>[]>(bruto.mine ?? {}))
    for (const it of itens)
      s.attractions.push({
        id: String(it.id), city, name: String(it.n),
        price_eur: num(it.pr), note: String(it.w ?? ''),
        status: ST[String(it.st)] ?? 'backlog',
        kind: it.k === 'tour' ? 'tour' : 'passeio',
        day_iso: it.day && String(it.day).trim() ? String(it.day) : null,
        seed_id: it.sid ? String(it.sid) : null,
      });

  for (const [country, itens] of Object.entries<Record<string, unknown>[]>(bruto.foods ?? {}))
    itens.forEach((it, i) => {
      const kind = FKD[String(it.k)] ?? 'prato';
      s.foods.push({
        id: String(it.id), country, name: String(it.n), note: String(it.w ?? ''), kind,
        day_iso: kind !== 'prato' && it.day && String(it.day).trim() ? String(it.day) : null,
        seed_id: `f:${country}:${i}`,
      });
    });

  s.legs = (bruto.tr ?? []).map((t: Record<string, unknown>, i: number) => ({
    id: String(t.id), position: i, name: String(t.n), note: String(t.w ?? ''),
    kind: (t.k ?? 'trem') as Leg['kind'],
    amount: val(t.v), currency: t.m === 'brl' ? 'brl' : 'eur',
    bought: !!t.ok,
    day_iso: t.day && String(t.day).trim() ? String(t.day) : null,
    seed_id: t.sid ? String(t.sid) : null,
  }));

  s.bookings = (bruto.res ?? []).map((r: Record<string, unknown>, i: number) => ({
    id: String(r.id), position: i, name: String(r.n), note: String(r.w ?? ''),
    amount: val(r.v), currency: r.m === 'eur' ? 'eur' : 'brl',
    done: !!(bruto.resdone ?? {})[String(r.id)],
    seed_id: null,
  }));

  s.killed = Object.keys(bruto.killed ?? {});
  s.adopted = Object.keys(bruto.adopted ?? {});
  s.mySavings = { who: 'leo', goal: null, opening: null, currency: 'brl' };
  s.me = { id: 'demo', email: 'demonstração', who: 'leo' };
  return s;
}
