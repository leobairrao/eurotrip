'use client';
// ============================================================
// O esqueleto: cabecalho, as 10 abas, quem esta online, e o rodape.
// A barra de abas rola na horizontal no celular, e a aba ativa e
// trazida para a vista ao trocar — sem rolar a pagina (secao 10).
// ============================================================
import { useEffect, useRef } from 'react';
import { TABS, type TabKey } from '@/content';
import { UiProvider, useUi } from '@/lib/ui';
import { useApp } from '@/lib/store';

import Painel from '@/screens/Painel';
import Roteiro from '@/screens/Roteiro';
import Atracoes from '@/screens/Atracoes';
import Comidas from '@/screens/Comidas';
import Transporte from '@/screens/Transporte';
import Hospedagem from '@/screens/Hospedagem';
import Reservas from '@/screens/Reservas';
import Dicas from '@/screens/Dicas';
import Sugestoes from '@/screens/Sugestoes';
import Caixa from '@/screens/Caixa';
import Custos from '@/screens/Custos';

const TELAS: Record<TabKey, () => React.JSX.Element> = {
  painel: Painel,
  roteiro: Roteiro,
  atracoes: Atracoes,
  comidas: Comidas,
  transporte: Transporte,
  stay: Hospedagem,
  reservas: Reservas,
  dicas: Dicas,
  sugestoes: Sugestoes,
  caixa: Caixa,
  custos: Custos,
};

export default function AppShell({ demo = false }: { demo?: boolean }) {
  const { me } = useApp();
  return (
    <UiProvider quemSou={me?.who ?? 'geral'}>
      <Dentro demo={demo} />
    </UiProvider>
  );
}

function Dentro({ demo }: { demo: boolean }) {
  const { estado, pendentes, online, me } = useApp();
  const { tab, setTab } = useUi();
  const nav = useRef<HTMLElement>(null);

  // traz a aba ativa para a vista, sem rolar a pagina junto
  useEffect(() => {
    const b = nav.current?.querySelector('button[aria-selected="true"]');
    b?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [tab]);

  const Tela = TELAS[tab] ?? Painel;

  const dot = estado === 'ok' ? 'cloud' : estado === 'salvando' ? 'dirty' : '';
  // 'erro' e 'falhou' sao coisas diferentes e nao podem dizer a mesma frase:
  // em 'erro' eu ainda estou tentando; em 'falhou' eu ja desisti, e ele
  // precisa saber que o que esta na tela pode nao estar no banco.
  const txt =
    demo ? 'demonstração — nada salva'
    : estado === 'ok' ? 'salvo'
    : estado === 'salvando' ? (pendentes > 1 ? `salvando ${pendentes} campos` : 'salvando')
    : estado === 'erro' ? 'sem conexão — vou tentar de novo'
    : 'não consegui salvar — o que está na tela pode não estar no banco';

  const outro = online.filter((w) => w !== me?.who);

  return (
    <>
      {demo && (
        <div className="demofaixa">
          <div>
            MODO DEMONSTRAÇÃO · sem Supabase configurado. As nove telas com os dados reais
            do Leo, para conferir lado a lado com o artefato. Nada do que você digitar aqui é salvo.
          </div>
        </div>
      )}
      <header className="top">
        <div className="topin">
          <div className="brand">
            <h1>Eurotrip 2026</h1>
            <span className="sub">10 dez 2026 — 12 jan 2027</span>
            <span className="save">
              {outro.length > 0 && (
                <span className="presenca" title="está online agora">
                  <i /> {outro.map((w) => (w === 'leo' ? 'Leo' : 'Lu')).join(', ')}
                </span>
              )}
              <span className={'savedot ' + dot} />
              <span className="savetxt">{txt}</span>
              {!demo && me && (
                <form action="/auth/sair" method="post">
                  <button type="submit" className="sairbtn">sair</button>
                </form>
              )}
            </span>
          </div>
          <nav className="tabs" role="tablist" ref={nav}>
            {TABS.map(([k, rotulo]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => { setTab(k); window.scrollTo(0, 0); }}
              >
                {rotulo}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main">
        <Tela />
      </main>

      <footer>
        <span>o plano é seu — eu guardo, pesquiso e faço as contas</span>
        <span className="mono">{me ? (me.who === 'leo' ? 'Leo' : 'Lu') : 'demo'}</span>
      </footer>
    </>
  );
}
