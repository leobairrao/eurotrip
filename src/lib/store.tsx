'use client';
// ============================================================
// O motivo de existir deste projeto (secao 8).
//
// Tres promessas, e o codigo abaixo existe para cumprir as tres:
//   1. escrita POR CAMPO — um update de uma coluna, nunca da linha
//      inteira, para dois updates simultaneos em colunas diferentes
//      nao se apagarem;
//   2. quando chega mudanca do outro, atualiza SO o que mudou, e
//      nunca a coluna que tem escrita local pendente;
//   3. o que ele digitou nunca e descartado em silencio: se a rede
//      cair, enfileira e tenta de novo.
// ============================================================
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabaseBrowser } from './supabase/client';
import type {
  AppUser, Attraction, Booking, CaixaGeral, Contribution, Extra, Food, Leg,
  Savings, Settings, Snapshot, Stay,
} from './types';

// ---------- que coluna e a chave de cada tabela ----------
const PK: Record<string, string> = {
  day: 'iso',
  attraction: 'id',
  food: 'id',
  leg: 'id',
  booking: 'id',
  stay: 'city',
  extra: 'id',
  settings: 'id',
  savings: 'who',
};

export type Tabela = keyof typeof PK | 'contribution';

type Estado = 'ok' | 'salvando' | 'erro';

interface Ctx {
  s: Snapshot;
  me: AppUser | null;
  /** Escrita por campo, com debounce de ~400 ms (secao 8). */
  patch: (t: Tabela, pk: string, col: string, v: unknown) => void;
  /** Escrita imediata: select, caixinha, botao. */
  now: (t: Tabela, pk: string, col: string, v: unknown) => void;
  /** Varias colunas de uma linha ao mesmo tempo (ex.: por num dia = escolher). */
  nowMany: (t: Tabela, pk: string, cols: Record<string, unknown>) => void;
  insert: (t: Tabela, row: Record<string, unknown>) => Promise<void>;
  /** O x. Se o item tem seed_id, grava em killed_seed antes (regra 5.14). */
  remove: (t: Tabela, pk: string, seedId?: string | null) => Promise<void>;
  /** Meu aporte de um mes. */
  setAporte: (month: string, v: number | null) => void;
  estado: Estado;
  pendentes: number;
  online: string[];
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(C);
  if (!v) throw new Error('useApp fora do Provider');
  return v;
};

// ============================================================
// Foco: a regra que nao se negocia (regra 5.15 e secao 8).
// Um campo com o cursso dentro NUNCA e sobrescrito por mudanca
// que chega da outra pessoa.
// ============================================================
const focado = { atual: '' as string };
export const marcarFoco = (k: string) => { focado.atual = k; };
export const limparFoco = (k: string) => { if (focado.atual === k) focado.atual = ''; };
export const estaFocado = (k: string) => focado.atual === k;

export function Provider({
  inicial, me, children,
}: {
  inicial: Snapshot;
  me: AppUser | null;
  children: React.ReactNode;
}) {
  const [s, setS] = useState<Snapshot>(inicial);
  const [estado, setEstado] = useState<Estado>('ok');
  const [pendentes, setPendentes] = useState(0);
  const [online, setOnline] = useState<string[]>([]);
  const db = useMemo<SupabaseClient>(() => supabaseBrowser(), []);

  /**
   * As escritas que ainda nao voltaram do banco. Enquanto uma coluna
   * esta aqui, mudanca remota NAO a sobrescreve — e assim que a
   * escrita fica de verdade por campo.
   */
  const pend = useRef(new Map<string, unknown>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chan = useRef<RealtimeChannel | null>(null);

  const chave = (t: string, pk: string, col: string) => `${t}|${pk}|${col}`;

  // ---------------- aplicar no estado local ----------------
  const aplicar = useCallback((t: Tabela, pk: string, cols: Record<string, unknown>) => {
    setS((v) => mesclar(v, t, pk, cols));
  }, []);

  // ---------------- mandar para o banco ----------------
  const enviar = useCallback(
    async (t: Tabela, pk: string, cols: Record<string, unknown>, tentativa = 0): Promise<void> => {
      const chaves = Object.keys(cols).map((c) => chave(t, pk, c));
      setEstado('salvando');
      setPendentes(pend.current.size);

      // Toda tabela tem updated_at; so as compartilhadas tem updated_by.
      const COM_AUTOR = ['day','attraction','food','leg','booking','stay','extra'];
      const payload: Record<string, unknown> = {
        ...cols,
        updated_at: new Date().toISOString(),
      };
      if (me && COM_AUTOR.includes(t as string)) payload.updated_by = me.id;

      let erro: string | null = null;
      try {
        if (t === 'contribution') {
          const [who, month] = pk.split('|');
          const r = await db
            .from('contribution')
            .upsert({ who, month, ...payload }, { onConflict: 'who,month' });
          erro = r.error?.message ?? null;
        } else {
          const r = await db.from(t as string).update(payload).eq(PK[t as string], pk);
          erro = r.error?.message ?? null;
        }
      } catch (e) {
        erro = e instanceof Error ? e.message : String(e);
      }

      if (!erro) {
        for (const k of chaves) pend.current.delete(k);
        setPendentes(pend.current.size);
        setEstado(pend.current.size ? 'salvando' : 'ok');
        return;
      }

      // Nunca descarta o que ele digitou. Enfileira e tenta de novo (secao 8).
      setEstado('erro');
      const espera = Math.min(30000, 800 * Math.pow(2, tentativa));
      setTimeout(() => void enviar(t, pk, cols, tentativa + 1), espera);
    },
    [db, me],
  );

  // ---------------- escrita por campo, com debounce ----------------
  const patch = useCallback(
    (t: Tabela, pk: string, col: string, v: unknown) => {
      const k = chave(t, pk, col);
      pend.current.set(k, v);
      aplicar(t, pk, { [col]: v });           // otimista: a tela nao espera a rede
      setPendentes(pend.current.size);
      const antigo = timers.current.get(k);
      if (antigo) clearTimeout(antigo);
      timers.current.set(
        k,
        setTimeout(() => {
          timers.current.delete(k);
          void enviar(t, pk, { [col]: v });
        }, 400),
      );
    },
    [aplicar, enviar],
  );

  const now = useCallback(
    (t: Tabela, pk: string, col: string, v: unknown) => {
      const k = chave(t, pk, col);
      pend.current.set(k, v);
      aplicar(t, pk, { [col]: v });
      void enviar(t, pk, { [col]: v });
    },
    [aplicar, enviar],
  );

  const nowMany = useCallback(
    (t: Tabela, pk: string, cols: Record<string, unknown>) => {
      for (const c of Object.keys(cols)) pend.current.set(chave(t, pk, c), cols[c]);
      aplicar(t, pk, cols);
      void enviar(t, pk, cols);
    },
    [aplicar, enviar],
  );

  const setAporte = useCallback(
    (month: string, v: number | null) => {
      if (!me) return;
      const pk = `${me.who}|${month}`;
      const k = chave('contribution', pk, 'amount');
      pend.current.set(k, v);
      setS((old) => ({ ...old, myContributions: { ...old.myContributions, [month]: v } }));
      const antigo = timers.current.get(k);
      if (antigo) clearTimeout(antigo);
      timers.current.set(
        k,
        setTimeout(() => {
          timers.current.delete(k);
          void enviar('contribution', pk, { amount: v });
        }, 400),
      );
    },
    [enviar, me],
  );

  const insert = useCallback(
    async (t: Tabela, row: Record<string, unknown>) => {
      const { data, error } = await db.from(t as string).insert(row).select().single();
      if (error) { setEstado('erro'); return; }
      if (data) setS((v) => inserirLocal(v, t, data));
    },
    [db],
  );

  const remove = useCallback(
    async (t: Tabela, pk: string, seedId?: string | null) => {
      // O item apagado nao ressuscita na proxima semeadura (regra 5.14)
      if (seedId) await db.from('killed_seed').upsert({ seed_id: seedId }, { onConflict: 'seed_id' });
      setS((v) => removerLocal(v, t, pk));
      const { error } = await db.from(t as string).delete().eq(PK[t as string], pk);
      if (error) setEstado('erro');
    },
    [db],
  );

  // ---------------- Realtime (secao 8) ----------------
  const recarregarGeral = useCallback(async () => {
    const { data } = await db.rpc('caixa_geral');
    if (data) setS((v) => ({ ...v, geral: data as CaixaGeral }));
  }, [db]);

  useEffect(() => {
    if (!me) return;
    const ch = db.channel('eurotrip', { config: { presence: { key: me.who } } });

    const tabelas = ['day','attraction','food','leg','booking','stay','extra','settings','killed_seed','adopted'];
    for (const t of tabelas) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => {
        setS((v) => aplicarRemoto(v, t as Tabela, p, pend.current));
      });
    }
    // A linha da Lu a RLS nao entrega. O pulso avisa que mudou; o valor
    // dela nunca trafega, e o geral do Leo sobe (secao 7 e 15).
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_pulse' }, () => {
      void recarregarGeral();
    });

    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState();
      setOnline(Object.keys(st));
    });

    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') void ch.track({ who: me.who, em: Date.now() });
    });
    chan.current = ch;
    return () => { void db.removeChannel(ch); chan.current = null; };
  }, [db, me, recarregarGeral]);

  // Se a aba voltou do sono, o Realtime pode ter perdido evento: recarrega.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') void recarregarGeral(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [recarregarGeral]);

  const valor = useMemo<Ctx>(
    () => ({ s, me, patch, now, nowMany, insert, remove, setAporte, estado, pendentes, online }),
    [s, me, patch, now, nowMany, insert, remove, setAporte, estado, pendentes, online],
  );
  return <C.Provider value={valor}>{children}</C.Provider>;
}

// ============================================================
// mesclagem local
// ============================================================
type Lista = 'attractions' | 'foods' | 'legs' | 'bookings' | 'extras';
const LISTA: Record<string, Lista> = {
  attraction: 'attractions', food: 'foods', leg: 'legs', booking: 'bookings', extra: 'extras',
};

function mesclar(v: Snapshot, t: Tabela, pk: string, cols: Record<string, unknown>): Snapshot {
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
    if (!v.mySavings || v.mySavings.who !== pk) return v;
    return { ...v, mySavings: { ...v.mySavings, ...cols } as Savings };
  }
  const l = LISTA[t as string];
  if (!l) return v;
  const arr = (v[l] as { id: string }[]).map((x) => (x.id === pk ? { ...x, ...cols } : x));
  return { ...v, [l]: arr } as Snapshot;
}

function inserirLocal(v: Snapshot, t: Tabela, row: Record<string, unknown>): Snapshot {
  const l = LISTA[t as string];
  if (!l) return v;
  const arr = [...(v[l] as unknown[]), row];
  return { ...v, [l]: arr } as Snapshot;
}

function removerLocal(v: Snapshot, t: Tabela, pk: string): Snapshot {
  const l = LISTA[t as string];
  if (!l) return v;
  const arr = (v[l] as { id: string }[]).filter((x) => x.id !== pk);
  return { ...v, [l]: arr } as Snapshot;
}

/**
 * Mudanca que chegou do outro navegador.
 * Colunas com escrita local pendente sao preservadas: e o que impede
 * "salvar um campo e apagar dez".
 */
function aplicarRemoto(
  v: Snapshot,
  t: Tabela,
  p: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
  pend: Map<string, unknown>,
): Snapshot {
  const pkCol = PK[t as string];

  if (t === 'killed_seed') {
    const sid = (p.new?.seed_id ?? p.old?.seed_id) as string | undefined;
    if (!sid) return v;
    if (p.eventType === 'DELETE') return { ...v, killed: v.killed.filter((x) => x !== sid) };
    return v.killed.includes(sid) ? v : { ...v, killed: [...v.killed, sid] };
  }
  if (t === 'adopted') {
    const sid = (p.new?.seed_id ?? p.old?.seed_id) as string | undefined;
    if (!sid) return v;
    if (p.eventType === 'DELETE') return { ...v, adopted: v.adopted.filter((x) => x !== sid) };
    return v.adopted.includes(sid) ? v : { ...v, adopted: [...v.adopted, sid] };
  }

  if (p.eventType === 'DELETE') {
    const pk = String(p.old?.[pkCol] ?? '');
    return pk ? removerLocal(v, t, pk) : v;
  }

  const row = p.new;
  const pk = String(row?.[pkCol] ?? '');
  if (!pk) return v;

  // preserva o que ainda esta na fila local
  const limpo: Record<string, unknown> = { ...row };
  for (const [k, val] of pend) {
    const [tt, ppk, col] = k.split('|');
    if (tt === t && ppk === pk && col in limpo) limpo[col] = val;
  }

  if (t === 'day' || t === 'stay' || t === 'settings' || t === 'savings') {
    return mesclar(v, t, pk, limpo);
  }
  const l = LISTA[t as string];
  if (!l) return v;
  const arr = v[l] as { id: string }[];
  if (arr.some((x) => x.id === pk)) return mesclar(v, t, pk, limpo);
  return inserirLocal(v, t, limpo);
}
