'use client';
// Estado de navegacao. No artefato eram variaveis de modulo; aqui viram
// contexto para as telas dividirem (selCO e o mesmo em Atracoes e Comidas).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SugKey, TabKey } from '@/content';

const LS = 'eurotrip2026';

interface Ui {
  tab: TabKey;             setTab: (v: TabKey) => void;
  selCO: string;           setSelCO: (v: string) => void;
  selDay: string | null;   setSelDay: (v: string | null) => void;
  filt: string;            setFilt: (v: string) => void;
  selWho: string;          setSelWho: (v: string) => void;
  selPick: string | null;  setSelPick: (v: string | null) => void;
  selFPick: string | null; setSelFPick: (v: string | null) => void;
  selTPick: string | null; setSelTPick: (v: string | null) => void;
  /** Qual sub-aba de Sugestoes esta aberta. Guardada, como a aba de cima. */
  selSug: SugKey;          setSelSug: (v: SugKey) => void;
  irParaDia: (iso: string | null) => void;
}

const C = createContext<Ui | null>(null);
export const useUi = () => {
  const v = useContext(C);
  if (!v) throw new Error('useUi fora do Provider');
  return v;
};

const ler = (k: string, def: string) => {
  if (typeof window === 'undefined') return def;
  try { return localStorage.getItem(LS + '-' + k) || def; } catch { return def; }
};
const gravar = (k: string, v: string) => {
  try { localStorage.setItem(LS + '-' + k, v); } catch { /* modo privado */ }
};

export function UiProvider({ quemSou, children }: { quemSou: string; children: React.ReactNode }) {
  const [tab, setTabRaw] = useState<TabKey>('painel');
  const [selCO, setCORaw] = useState('es');
  const [selSug, setSugRaw] = useState<SugKey>('atracoes');
  const [selDay, setSelDay] = useState<string | null>(null);
  const [filt, setFilt] = useState('');
  // A Caixa abre na sub-aba do usuario logado (secao 10.8)
  const [selWho, setWhoRaw] = useState(quemSou);
  const [selPick, setSelPick] = useState<string | null>(null);
  const [selFPick, setSelFPick] = useState<string | null>(null);
  const [selTPick, setSelTPick] = useState<string | null>(null);

  // Le o que ficou salvo depois de montar, para o servidor e o cliente
  // pintarem a mesma coisa na primeira vez.
  useEffect(() => {
    setTabRaw((ler('tab', 'painel') as TabKey) || 'painel');
    setCORaw(ler('co', 'es'));
    setSugRaw((ler('sug', 'atracoes') as SugKey) || 'atracoes');
    setWhoRaw(ler('who', quemSou));
  }, [quemSou]);

  const setTab = useCallback((v: TabKey) => { setTabRaw(v); gravar('tab', v); }, []);
  const setSelCO = useCallback((v: string) => { setCORaw(v); gravar('co', v); }, []);
  const setSelSug = useCallback((v: SugKey) => { setSugRaw(v); gravar('sug', v); }, []);
  const setSelWho = useCallback((v: string) => { setWhoRaw(v); gravar('who', v); }, []);

  /** Trocar de dia zera os chips de escolha, igual ao artefato. */
  const irParaDia = useCallback((iso: string | null) => {
    setSelDay(iso);
    setSelPick(null);
    setSelFPick(null);
    setSelTPick(null);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, []);

  const valor = useMemo<Ui>(() => ({
    tab, setTab, selCO, setSelCO, selDay, setSelDay, filt, setFilt,
    selWho, setSelWho, selPick, setSelPick, selFPick, setSelFPick,
    selTPick, setSelTPick, selSug, setSelSug, irParaDia,
  }), [tab, setTab, selCO, setSelCO, selDay, filt, selWho, setSelWho,
       selPick, selFPick, selTPick, selSug, setSelSug, irParaDia]);

  return <C.Provider value={valor}>{children}</C.Provider>;
}
