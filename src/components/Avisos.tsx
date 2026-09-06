'use client';
// ============================================================
// Os avisos, agora dele (05/09/2026).
//
// A regra 5.6 dizia "o aviso e meu, nao dele — nao edita, nao apaga".
// Caiu: ele pediu que tudo fosse editavel. O que sobra da regra e a
// ultima parte, que continua valendo — AVISO NAO SOMA EM CONTA NENHUMA.
//
// Um componente so serve as quatro telas. O `spot` diz onde ele mora, e
// e a unica coisa que muda entre elas:
//   atracoes:lisboa · roteiro:2026-12-10 · comidas:pt · transporte
//   comidas:pt:naovale  (esse desenha em lista, nao em cartao)
//
// O corpo e TEXTO PURO. Negrito se escreve *assim*, e `marcado()` e o
// unico lugar que produz HTML — o que ele digitar nunca vira tag.
// ============================================================
import { useRef, useState } from 'react';
import { AreaField, Inline, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import * as C from '@/lib/calc';
import { marcado } from '@/lib/fmt';
import type { Aviso, Tone } from '@/lib/types';

const TOM: ReadonlyArray<readonly [Tone, string]> = [
  ['free', 'verde'],
  ['warn', 'âmbar'],
  ['alert', 'vermelho'],
];

export default function Avisos({
  spot, lista = false, rotulo = 'aviso',
}: {
  spot: string;
  /** true: desenha em lista (o "o que eu acho que nao vale"), nao em cartao. */
  lista?: boolean;
  rotulo?: string;
}) {
  const { s } = useApp();
  const avisos = C.avisosDe(s, spot);

  if (lista) {
    return (
      <div className="sg">
        <div className="sgh">o que eu acho que não vale</div>
        {avisos.map((a) => <LinhaLista key={a.id} a={a} />)}
        {!avisos.length ? <div className="empty">Nada aqui.</div> : null}
        <Acrescentar key={spot} spot={spot} rotulo={rotulo} lista />
      </div>
    );
  }

  return (
    <>
      {avisos.map((a) => <Cartao key={a.id} a={a} />)}
      {/* key={spot}: trocar de pais/dia com o formulario aberto gravava o
          aviso no lugar errado, porque o React reaproveitava a instancia */}
      <Acrescentar key={spot} spot={spot} rotulo={rotulo} />
    </>
  );
}

/** O cartao colorido. Clicar em "mexer" troca o texto pelos campos. */
function Cartao({ a }: { a: Aviso }) {
  const { patch, now } = useApp();
  const apagar = useApagarLinha();
  const [abrindo, setAbrindo] = useState(false);

  if (!abrindo) {
    return (
      <div className={`n ${a.tone}`} style={{ maxWidth: 'none' }}>
        <b>{a.title}</b>
        <Inline html={marcado(a.body)} className="avcorpo" />
        <button type="button" className="mexer" onClick={() => setAbrindo(true)}>
          mexer
        </button>
      </div>
    );
  }

  return (
    <div className={`n ${a.tone} edit`} style={{ maxWidth: 'none' }}>
      <TextField
        fk={`aviso|${a.id}|title`}
        value={a.title}
        onCommit={(v) => patch('aviso', a.id, 'title', v)}
        className="avt"
        placeholder="o título do aviso"
        aria-label="título do aviso"
      />
      <AreaField
        fk={`aviso|${a.id}|body`}
        value={a.body}
        onCommit={(v) => patch('aviso', a.id, 'body', v)}
        className="avb"
        placeholder="o texto. negrito se escreve *assim*"
        aria-label="texto do aviso"
      />
      <div className="avrow">
        <select
          value={a.tone}
          onChange={(e) => now('aviso', a.id, 'tone', e.currentTarget.value)}
          aria-label="cor do aviso"
        >
          {TOM.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
        <span className="mono dica">negrito é *entre asteriscos*</span>
        <button type="button" onClick={() => setAbrindo(false)}>pronto</button>
        {/* regra 5.14: o seed_id vai junto, senao o aviso volta na proxima semeadura */}
        <button
          type="button"
          className="xb"
          aria-label="tirar o aviso"
          onClick={() => void apagar('aviso', a.id, a.seed_id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** A variante em lista, do "o que eu acho que nao vale". */
function LinhaLista({ a }: { a: Aviso }) {
  const { patch } = useApp();
  const apagar = useApagarLinha();
  return (
    <div className="sgr av">
      <TextField
        fk={`aviso|${a.id}|title`}
        value={a.title}
        onCommit={(v) => patch('aviso', a.id, 'title', v)}
        className="nm nv"
        placeholder="o que não vale"
        aria-label="o que não vale"
      />
      <button
        type="button"
        className="xb"
        aria-label="tirar"
        onClick={() => void apagar('aviso', a.id, a.seed_id)}
      >
        ×
      </button>
      <TextField
        fk={`aviso|${a.id}|body`}
        value={a.body}
        onCommit={(v) => patch('aviso', a.id, 'body', v)}
        className="wh nv"
        placeholder="por quê"
        aria-label="por quê"
      />
    </div>
  );
}

/**
 * O formulario, RECOLHIDO ate ele pedir.
 *
 * Aberto, ele apareceria embaixo de cada uma das 11 cidades e de cada um
 * dos 34 dias do Roteiro — dezenas de formularios vazios numa tela que
 * era limpa. Fechado, e um link de tres palavras.
 */
function Acrescentar({ spot, rotulo, lista }: { spot: string; rotulo: string; lista?: boolean }) {
  const { s, insert } = useApp();
  const [aberto, setAberto] = useState(false);
  const titulo = useLocal();
  const corpo = useLocal();
  const tom = useRef<HTMLSelectElement>(null);

  if (!aberto) {
    return (
      <button type="button" className="maisav" onClick={() => setAberto(true)}>
        + {rotulo}
      </button>
    );
  }

  const por = () => {
    const t = titulo.get();
    const b = corpo.get();
    if (!t && !b) return;
    void insert('aviso', {
      spot,
      tone: lista ? 'warn' : (tom.current?.value ?? 'warn'),
      title: t,
      body: b,
      position: C.proxAviso(s, spot),
      seed_id: null,
    });
    titulo.limpar();
    corpo.limpar();
    if (tom.current) tom.current.value = 'warn';
    setAberto(false);
  };

  return (
    <div className={'addrow ' + (lista ? 'av2' : 'av3')}>
      <input
        ref={(el) => { titulo.ref.current = el; }}
        type="text"
        placeholder={lista ? 'o que não vale' : `título do ${rotulo}`}
        aria-label="título"
      />
      <input
        ref={(el) => { corpo.ref.current = el; }}
        type="text"
        placeholder={lista ? 'por quê' : 'o texto — negrito *assim*'}
        aria-label="texto"
      />
      {lista ? null : (
        <select ref={tom} defaultValue="warn" aria-label="cor">
          {TOM.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      )}
      <button type="button" onClick={por}>acrescentar</button>
      <button type="button" className="cancelav" onClick={() => setAberto(false)}>
        deixa
      </button>
    </div>
  );
}
