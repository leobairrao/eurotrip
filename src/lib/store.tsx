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
import type { AppUser, Snapshot, Who } from './types';

import {
  PK, aplicarRemoto, chave, inserirLocal, mesclar, removerLocal, type Tabela,
} from './merge';

export type { Tabela };

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
  /** O aporte de um mes, de quem for. Os dois podem lancar (escolha de 04/09). */
  setAporte: (who: Who, month: string, v: number | null) => void;
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
    (who: Who, month: string, v: number | null) => {
      const pk = `${who}|${month}`;
      const k = chave('contribution', pk, 'amount');
      pend.current.set(k, v);
      setS((old) => ({
        ...old,
        contributions: { ...old.contributions, [month]: { ...old.contributions[month], [who]: v } },
      }));
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
    [enviar],
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
  useEffect(() => {
    if (!me) return;
    const ch = db.channel('eurotrip', { config: { presence: { key: me.who } } });

    const tabelas = ['day','attraction','food','leg','booking','stay','extra',
                     'settings','killed_seed','adopted','savings','contribution'];
    for (const t of tabelas) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => {
        setS((v) => aplicarRemoto(v, t as Tabela, p, pend.current));
      });
    }
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState();
      setOnline(Object.keys(st));
    });

    ch.subscribe((st) => {
      if (st === 'SUBSCRIBED') void ch.track({ who: me.who, em: Date.now() });
    });
    chan.current = ch;
    return () => { void db.removeChannel(ch); chan.current = null; };
  }, [db, me]);

  // Se a aba voltou do sono, o Realtime pode ter perdido evento.
  // Recarregar a pagina e o caminho honesto: nao ha estado local nao salvo.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && pend.current.size === 0) {
        void db.from('settings').select('eur_rate').eq('id', 1).maybeSingle().then(({ data }) => {
          if (data) setS((v) => ({ ...v, settings: { ...v.settings, eur_rate: Number(data.eur_rate) } }));
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [db]);

  const valor = useMemo<Ctx>(
    () => ({ s, me, patch, now, nowMany, insert, remove, setAporte, estado, pendentes, online }),
    [s, me, patch, now, nowMany, insert, remove, setAporte, estado, pendentes, online],
  );
  return <C.Provider value={valor}>{children}</C.Provider>;
}
