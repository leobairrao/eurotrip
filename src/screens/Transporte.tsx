'use client';
// ============================================================
// 10.5 — Transporte. UMA lista so, na ordem do roteiro (position):
// os 12 trechos SAO a sequencia da viagem, quebrar por tipo
// embaralha isso. O tipo aparece na barra colorida e na etiqueta.
// ============================================================
import { TK, TKE, TKPL } from '@/content';
import { Inline, NumField, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { brl, parseNum, shortDt } from '@/lib/fmt';
import type { LegKind } from '@/lib/types';
import { useRef } from 'react';

// Object.keys perde o tipo; a ordem do literal e a ordem de exibicao.
const TIPOS = Object.keys(TK) as LegKind[];

export default function Transporte() {
  const { s } = useApp();

  const pg = C.legBrl(s, 'pago');
  const ft = C.legBrl(s, 'falta');
  const total = s.legs.length;

  return (
    <>
      <div className="panelhead">
        <h2>Transporte</h2>
        <p>
          Os trens e os voos internos, cada um com o seu tipo.{' '}
          <b>Marque comprado quando pagar</b> — o valor sai de &quot;previsto&quot; e entra no
          total já pago. E todo trecho pode ir para um dia do Roteiro, do mesmo jeito que as
          atrações e os restaurantes.
        </p>
      </div>

      {/* ---- os quatro numeros ---- */}
      <div className="bigsum">
        <div>
          <b>{C.legDone(s)}/{total}</b>
          <span>já comprados</span>
        </div>
        <div>
          <b>{brl(pg)}</b>
          <span>já pago</span>
        </div>
        <div>
          <b>{brl(ft)}</b>
          <span>previsto, ainda não pago</span>
        </div>
        <div>
          <b>{C.legPlaced(s)}/{total}</b>
          <span>com dia marcado</span>
        </div>
      </div>

      {/* ---- contadores por tipo: span, nao botao. Nao filtram nada ---- */}
      <div className="filt">
        {TIPOS.map((k) => (
          <span key={k} className="fchip" aria-pressed="false">
            {TKE[k]} {TKPL[k]}
            <span className="cn">{C.legsOfKind(s, k).length}</span>
          </span>
        ))}
      </div>

      <div className="card" style={{ ['--cc' as string]: 'var(--c-fr)' }}>
        <div className="h">
          <h3>Trechos da viagem</h3>
          <div className="m">
            {total} trechos · {C.legWithVal(s)} com valor lançado · na ordem do roteiro
          </div>
        </div>
        <div className="b">
          <p>
            Os trechos entre as bases já estão aqui. Mude o tipo se eu errei, lance o valor, e
            marque a caixinha quando comprar.
          </p>
          <Linhas />
          <Acrescentar />
          {/* regra 5.12 — bate-volta com trem no preco da atracao nao entra aqui */}
          <div className="n warn">
            <b>não conte duas vezes</b>
            Bate-volta cujo trem já está no preço da atração —{' '}
            <b>Sintra, Cascais, Toledo, Segovia, Ávila, Utrecht, Ostia, Nápoles, Florença</b> —
            fica só na aba Atrações. Aqui é perna entre bases.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h">
          <h3>Onde isto aparece</h3>
          <div className="m">o sistema todo conversa</div>
        </div>
        <div className="b">
          <p>
            Um trecho marcado num dia aparece como etiqueta naquele dia no <b>Roteiro</b>, junto
            das atrações e dos lugares de comer. O valor entra na linha <b>Transportes</b> da aba
            Custos sempre; a caixinha de comprado é o que decide se ele conta como{' '}
            <b>já pago</b> ou como <b>previsto</b> no Painel.
          </p>
          <p className="mono">
            {C.legPlaced(s)} de {total} trechos com dia · {C.legDone(s)} comprados ·{' '}
            {brl(pg + ft)} no total
          </p>
        </div>
      </div>
    </>
  );
}

/** A lista. Uma so, ordenada por position (10.5) — nunca por tipo nem por nome. */
function Linhas() {
  const { s, patch, now, remove } = useApp();
  if (!s.legs.length) {
    return <div className="empty">Nenhum trecho na lista. Escreva abaixo.</div>;
  }
  const lista = [...s.legs].sort((a, b) => a.position - b.position);
  return (
    <div className="mt">
      {lista.map((it) => (
        <div key={it.id} className={`mrow tr5 tk-${it.kind}${it.bought ? ' pgo' : ''}`}>
          <TextField
            fk={`leg|${it.id}|name`}
            value={it.name}
            onCommit={(v) => patch('leg', it.id, 'name', v)}
            className="nv"
            aria-label="trecho"
          />
          <select
            className="sv kv"
            value={it.kind}
            onChange={(e) => now('leg', it.id, 'kind', e.currentTarget.value)}
            aria-label="tipo"
          >
            {TIPOS.map((k) => (
              <option key={k} value={k}>
                {TKE[k]} {TK[k]}
              </option>
            ))}
          </select>
          {/* vazio e vazio, nao zero: sem valor ele mostra "a lancar" (10.0) */}
          <NumField
            fk={`leg|${it.id}|amount`}
            value={it.amount}
            onCommit={(v) => patch('leg', it.id, 'amount', v)}
            className="pv"
            placeholder="a lançar"
            aria-label="valor"
          />
          {/* regra 5.11 — transporte comeca em euro, e o € vem primeiro */}
          <select
            value={it.currency}
            onChange={(e) => now('leg', it.id, 'currency', e.currentTarget.value)}
            aria-label="moeda"
          >
            <option value="eur">€</option>
            <option value="brl">R$</option>
          </select>
          {/* regra 5.10 — o valor conta sempre; a caixinha so decide de que lado */}
          <input
            type="checkbox"
            className="ck"
            checked={it.bought}
            onChange={(e) => now('leg', it.id, 'bought', e.currentTarget.checked)}
            title="já comprei este trecho"
            aria-label="comprado"
          />
          <button
            className="xb"
            onClick={() => void remove('leg', it.id, it.seed_id)}
            title="tirar o trecho"
            aria-label="tirar"
          >
            ×
          </button>
          <div className="wh">
            <span className={`stg tkc-${it.kind}`}>{TK[it.kind]}</span>{' '}
            {it.bought ? (
              <span className="dtag">comprado</span>
            ) : (
              <span className="dtag off">a comprar</span>
            )}
            {it.day_iso ? <> <span className="dtag">{shortDt(it.day_iso)}</span></> : null}
            {it.note ? <> <Inline html={it.note} /></> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** O formulario de acrescentar. Campo local: nada vai ao banco antes do clique. */
function Acrescentar() {
  const { s, insert } = useApp();
  const nome = useLocal();
  const valor = useLocal();
  const tipo = useRef<HTMLSelectElement>(null);
  const moeda = useRef<HTMLSelectElement>(null);

  const juntar = () => {
    const n = nome.get();
    if (!n) return;
    // trecho novo entra no fim da sequencia do roteiro (10.5)
    const pos = s.legs.reduce((a, t) => Math.max(a, t.position), 0) + 1;
    void insert('leg', {
      position: pos,
      name: n,
      kind: tipo.current?.value ?? 'trem',
      amount: parseNum(valor.get()),
      currency: moeda.current?.value ?? 'eur',
    });
    nome.limpar();
    valor.limpar();
  };

  return (
    <div className="addrow four">
      {/* ref por callback: o useLocal aceita input ou textarea, e o JSX quer so o input */}
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="ex. metrô até Barajas"
        aria-label="trecho novo"
      />
      <select ref={tipo} defaultValue="trem" aria-label="tipo do trecho novo">
        {TIPOS.map((k) => (
          <option key={k} value={k}>
            {TKE[k]} {TK[k]}
          </option>
        ))}
      </select>
      <input
        ref={(el) => { valor.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="valor"
        aria-label="valor do trecho novo"
      />
      <select ref={moeda} defaultValue="eur" aria-label="moeda do trecho novo">
        <option value="eur">€</option>
        <option value="brl">R$</option>
      </select>
      <button onClick={juntar}>adicionar trecho</button>
    </div>
  );
}
