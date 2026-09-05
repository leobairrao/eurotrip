'use client';
// ============================================================
// Dicas (Fase 4, 05/09/2026). A aba nova.
//
// O Leo pediu "tirar todos os disclaimers dos dias do roteiro e deixar em
// algum lugar todas as dicas que voce tiver separado por cidade".
//
// Reaproveita o mesmo mecanismo de aviso das outras quatro telas: sao
// linhas da tabela `aviso`, roteadas por `spot`. Escopos novos:
// `dicas:<cidade>`, `dicas:voos` e `dicas:pernas`. Zero mudanca de
// esquema — `spot` e um texto numa coluna que ja existia.
//
// Os DOIS cartoes que nao sao cidade existem porque a leitura dos 18
// avisos mostrou que a fórmula "manda pela base do dia" nao funciona:
// dois dias tem base "em transito" (e guardam os numeros dos voos) e em
// seis a base e o DESTINO enquanto o aviso e da PARTIDA. Ver
// `src/lib/dicas-destino.ts`.
// ============================================================
import { CO, CT, coOf } from '@/content';
import Avisos from '@/components/Avisos';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { CARTOES_EXTRA } from '@/lib/dicas-destino';

export default function Dicas() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const co = coOf(selCO);

  return (
    <>
      <div className="panelhead">
        <h2>Dicas</h2>
        <p>
          O que eu achei pesquisando, junto por lugar em vez de espalhado pelos dias. Tudo
          aqui é seu: dá para editar, apagar e acrescentar. <b>Nada disto entra em conta
          nenhuma</b> — é recado, não dinheiro.
        </p>
      </div>

      {/* as sub-abas por pais sao as mesmas de Atracoes e Comidas, de proposito */}
      <div className="subtabs">
        {CO.map((c) => {
          const n = c.cities.reduce((a, city) => a + C.avisosDe(s, `dicas:${city}`).length, 0);
          return (
            <button
              key={c.k}
              className="chip"
              aria-pressed={selCO === c.k}
              style={{ ['--cc' as string]: `var(${c.cc})` }}
              onClick={() => setSelCO(c.k)}
            >
              {c.n}<span className="cn">{n || '—'}</span>
            </button>
          );
        })}
      </div>

      {co.cities.map((city) => (
        <div key={city} className="card" style={{ ['--cc' as string]: `var(${co.cc})` }}>
          <div className="h">
            <h3>{CT[city].n}</h3>
          </div>
          <div className="b">
            <Avisos spot={`dicas:${city}`} rotulo="dica" />
          </div>
        </div>
      ))}

      {/* Fora da lista de cidades: o que nao TEM cidade. */}
      {CARTOES_EXTRA.map(([spot, titulo, sub]) => (
        <div key={spot} className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
          <div className="h">
            <h3>{titulo}</h3>
            <div className="m">{sub}</div>
          </div>
          <div className="b">
            <Avisos spot={spot} rotulo="dica" />
          </div>
        </div>
      ))}

      <p className="mono foot">
        Os três avisos vermelhos continuam no dia em que importam, no Roteiro: o transporte
        de Luxemburgo parando às 20h no dia 24, a perna mais cara no dia 29 e a Epifania no
        dia 6. Perder um deles no dia custa caro.
      </p>
    </>
  );
}
