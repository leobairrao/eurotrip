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
import { CO, coOf } from '@/content';
import { useState } from 'react';
import { useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { CARTOES_EXTRA } from '@/lib/dicas-destino';

/** O escopo de uma dica dele: a viagem inteira, ou um dos 7 paises. */
const GERAL = 'dicas:geral';

export default function Dicas() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const co = coOf(selCO);

  return (
    <>
      <div className="panelhead">
        <h2>Dicas</h2>
        <p>
          <b>As suas dicas</b>, escritas no campo aqui embaixo: escolha se ela vale para um
          país ou para <b>a viagem inteira</b>. As que eu pesquisei estão na aba
          <b> Sugestões</b>, e o + de lá traz a que interessar. <b>Nada disto entra em conta
          nenhuma</b> — é recado, não dinheiro.
        </p>
      </div>

      <Acrescentar />

      {/* GERAL fica FORA da fita, de proposito: uma dica da viagem inteira
          nao pertence a pais nenhum, e escondê-la atras de uma bandeira era
          a maneira certa de ele nunca mais achar o que escreveu. */}
      <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
        <div className="h">
          <h3>A viagem inteira</h3>
          <div className="m">o que vale para todo lugar, não só para um país</div>
        </div>
        <div className="b">
          <Avisos spot={GERAL} rotulo="dica" />
        </div>
      </div>

      {/* a mesma fita das outras tres telas */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => {
          const n = C.avisosDe(s, `dicas:${k}`).length
            + C.cidadesDe(s, k).reduce((a, city) => a + C.avisosDe(s, `dicas:${city}`).length, 0);
          return String(n);
        }}
      />

      {/* a dica do PAIS, antes das cidades dele */}
      <div className="card" style={{ ['--cc' as string]: `var(${co.cc})` }}>
        <div className="h">
          <h3>{co.n}, no geral</h3>
          <div className="m">o que vale para o país todo</div>
        </div>
        <div className="b">
          <Avisos spot={`dicas:${selCO}`} rotulo="dica" />
        </div>
      </div>

      {C.cidadesDe(s, selCO).map((city) => (
        <div key={city} className="card" style={{ ['--cc' as string]: `var(${co.cc})` }}>
          <div className="h">
            <h3>{C.nomeCidade(s, city)}</h3>
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
        Os três alertas vermelhos que eu tinha deixado presos aos dias — o transporte de
        Luxemburgo parando às 20h no 24, a perna mais cara no 29 e a Epifania no 6 — foram
        para a aba Sugestões em 06/09, com todo o resto que era meu. O + de lá devolve
        qualquer um deles ao dia a que pertence.
      </p>
    </>
  );
}

/**
 * O campo de escrever dica (item 7 da lista dele, 06/09/2026).
 *
 * Ele pediu: "vamos colocar um input onde eu coloco a dica, alguma
 * observacao e posso selecionar o pais ou geral, dai eu posso anotar
 * dicas gerais da viagem".
 *
 * Ate aqui so dava para escrever dentro do cartao de uma CIDADE, pelo
 * "+ dica" — nao havia como anotar algo da viagem inteira, nem do pais.
 *
 * O escopo vira o `spot` da linha: `dicas:geral` ou `dicas:<pais>`. Zero
 * mudanca de banco: `spot` e texto numa coluna que ja existia, e e assim
 * que as outras cinco telas ja roteiam aviso.
 *
 * O `tone` nasce `free` (verde): dica dele e recado, nao alerta. Se ele
 * quiser vermelho, o proprio cartao deixa trocar depois.
 */
function Acrescentar() {
  const { s, insert } = useApp();
  const titulo = useLocal();
  const corpo = useLocal();
  const [onde, setOnde] = useState<string>(GERAL);
  const [indo, setIndo] = useState(false);

  const por = async () => {
    const t = titulo.get().trim();
    if (!t || indo) return;
    setIndo(true);
    const r = await insert('aviso', {
      spot: onde,
      tone: 'free',
      title: t,
      body: corpo.get(),
      position: C.proxAviso(s, onde),
      seed_id: null,
    });
    setIndo(false);
    // So limpa depois de o banco confirmar (secao 8, promessa 3).
    if (!r.ok) return;
    titulo.limpar();
    corpo.limpar();
  };

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>Escrever uma dica</h3>
        <div className="m">a dica, uma observação, e onde ela vale</div>
      </div>
      <div className="b">
        <div className="addrow di4">
          <input
            type="text"
            ref={(el) => { titulo.ref.current = el; }}
            placeholder="a dica"
            aria-label="a dica"
          />
          <input
            type="text"
            ref={(el) => { corpo.ref.current = el; }}
            placeholder="uma observação (opcional)"
            aria-label="observação"
          />
          <select
            aria-label="onde vale"
            value={onde}
            onChange={(e) => setOnde(e.currentTarget.value)}
          >
            <option value={GERAL}>a viagem inteira</option>
            {CO.map((c) => (
              <option key={c.k} value={`dicas:${c.k}`}>{c.n}</option>
            ))}
          </select>
          <button onClick={() => void por()} disabled={indo}>
            {indo ? 'pondo…' : 'acrescentar'}
          </button>
        </div>
      </div>
    </div>
  );
}
