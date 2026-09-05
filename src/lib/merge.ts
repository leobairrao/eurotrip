// ============================================================
// A mesclagem, separada do React de proposito: e a promessa central
// do projeto ("campo a campo, ninguem apaga ninguem") e por isso tem
// que ser funcao pura e testavel. Ver tests/merge.test.mjs.
// ============================================================
import type { Settings, Savings, Snapshot, Stay, Who } from './types';

/** Que coluna e a chave de cada tabela. */
export const PK: Record<string, string> = {
  day: 'iso',
  attraction: 'id',
  food: 'id',
  leg: 'id',
  booking: 'id',
  stay: 'city',
  stay_option: 'id',
  extra: 'id',
  settings: 'id',
  savings: 'who',
  contribution: 'id',
  aviso: 'id',
};

export type Tabela =
  | 'day' | 'attraction' | 'food' | 'leg' | 'booking' | 'stay' | 'stay_option'
  | 'extra' | 'settings' | 'savings' | 'contribution' | 'killed_seed'
  | 'adopted' | 'aviso';

type Lista = 'attractions' | 'foods' | 'legs' | 'bookings' | 'stayOptions'
  | 'extras' | 'contributions' | 'avisos';
export const LISTA: Record<string, Lista> = {
  attraction: 'attractions',
  food: 'foods',
  leg: 'legs',
  booking: 'bookings',
  // Esquecer esta linha NAO e falha silenciosa, e queda: `inserirLocal`
  // faz spread sobre `undefined` no primeiro INSERT remoto e a tela toda
  // cai. A chave TEM que existir no Snapshot tambem (load.ts `vazio()`).
  stay_option: 'stayOptions',
  extra: 'extras',
  // Desde que o aporte virou uma linha com id proprio, a Caixa nao tem
  // mais caso especial nenhum aqui: e uma lista igual as outras.
  contribution: 'contributions',
  aviso: 'avisos',
};

export const chave = (t: string, pk: string, col: string) => `${t}|${pk}|${col}`;

export function mesclar(
  v: Snapshot, t: Tabela, pk: string, cols: Record<string, unknown>,
): Snapshot {
  if (t === 'day') {
    const d = v.days[pk];
    if (!d) return v;
    return { ...v, days: { ...v.days, [pk]: { ...d, ...cols } } };
  }
  if (t === 'stay') {
    const st = v.stays[pk];
    if (!st) return v;
    return { ...v, stays: { ...v.stays, [pk]: { ...st, ...cols } as Stay } };
  }
  if (t === 'settings') return { ...v, settings: { ...v.settings, ...cols } as Settings };
  if (t === 'savings') {
    if (pk !== 'leo' && pk !== 'lu') return v;
    const w = pk as Who;
    return { ...v, savings: { ...v.savings, [w]: { ...v.savings[w], ...cols } as Savings } };
  }
  const l = LISTA[t];
  if (!l) return v;
  const arr = (v[l] as { id: string }[]).map((x) => (x.id === pk ? { ...x, ...cols } : x));
  return { ...v, [l]: arr } as Snapshot;
}

export function inserirLocal(v: Snapshot, t: Tabela, row: Record<string, unknown>): Snapshot {
  const l = LISTA[t];
  if (!l) return v;
  return { ...v, [l]: [...(v[l] as unknown[]), row] } as Snapshot;
}

export function removerLocal(v: Snapshot, t: Tabela, pk: string): Snapshot {
  const l = LISTA[t];
  if (!l) return v;
  const arr = (v[l] as { id: string }[]).filter((x) => x.id !== pk);
  return { ...v, [l]: arr } as Snapshot;
}

export interface Evento {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

/**
 * Mudanca que chegou do outro navegador.
 *
 * Colunas com escrita local pendente sao PRESERVADAS. E o que impede
 * o problema do app de hoje: "salvar um campo e apagar dez". Se o Leo
 * esta com R$ 120 na fila para o valor de um trecho e chega uma
 * mudanca da Lu que mexeu no nome do mesmo trecho, o nome dela entra
 * e o valor dele fica.
 */
export function aplicarRemoto(
  v: Snapshot, t: Tabela, p: Evento, pend: Map<string, unknown>,
): Snapshot {
  if (t === 'killed_seed' || t === 'adopted') {
    const campo = t === 'killed_seed' ? 'killed' : 'adopted';
    const sid = (p.new?.seed_id ?? p.old?.seed_id) as string | undefined;
    if (!sid) return v;
    const atual = v[campo] as string[];
    if (p.eventType === 'DELETE') return { ...v, [campo]: atual.filter((x) => x !== sid) };
    return atual.includes(sid) ? v : { ...v, [campo]: [...atual, sid] };
  }

  const pkCol = PK[t];

  if (p.eventType === 'DELETE') {
    const pk = String(p.old?.[pkCol] ?? '');
    return pk ? removerLocal(v, t, pk) : v;
  }

  const pk = String(p.new?.[pkCol] ?? '');
  if (!pk) return v;

  const limpo: Record<string, unknown> = { ...p.new };
  for (const [k, val] of pend) {
    const [tt, ppk, col] = k.split('|');
    if (tt === t && ppk === pk && col in limpo) limpo[col] = val;
  }

  if (t === 'day' || t === 'stay' || t === 'settings' || t === 'savings') {
    return mesclar(v, t, pk, limpo);
  }
  const l = LISTA[t];
  if (!l) return v;
  const arr = v[l] as { id: string }[];
  if (arr.some((x) => x.id === pk)) return mesclar(v, t, pk, limpo);
  return inserirLocal(v, t, limpo);
}
