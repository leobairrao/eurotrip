'use client';
// ============================================================
// 10.5 — Transporte. UMA lista so, na ordem do roteiro (position):
// os 12 trechos SAO a sequencia da viagem, quebrar por tipo
// embaralha isso. O tipo aparece na barra colorida e na etiqueta.
// ============================================================
import { TK, TKPL, tkEmoji } from '@/content';
import { NumField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import { useApp, useOrdemEstavel } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import * as C from '@/lib/calc';
import { mover } from '@/lib/ordem';
import { brl, parseNum, shortDt } from '@/lib/fmt';
import type { Currency, LegKind } from '@/lib/types';
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
            {tkEmoji(k)} {TKPL[k]}
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
            Os trechos entre as bases já estão aqui. Mude o nome ou o tipo se eu errei, lance o
            valor, escreva a sua nota, e marque a caixinha quando comprar. As setas{' '}
            <b>↑↓</b> arrumam a sequência da viagem.
          </p>
          <Linhas />
          <Acrescentar />
          {/* regra 5.12 — bate-volta com trem no preco da atracao nao entra aqui.
              O texto virou linha do banco em 05/09: ele edita e apaga. */}
          <Avisos spot="transporte" rotulo="aviso" />
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
  const { s, patch, now } = useApp();
  const apagar = useApagarLinha();
  if (!s.legs.length) {
    return <div className="empty">Nenhum trecho na lista. Escreva abaixo.</div>;
  }
  // porPosicao desempata pelo id: duas linhas empatadas nunca saem em
  // ordem diferente em cada tela. useOrdemEstavel segura o rearranjo
  // enquanto o dedo esta num campo desta lista (ver store.tsx).
  const lista = useOrdemEstavel([...s.legs].sort(C.porPosicao), 'leg|');

  /** Sobe ou desce um trecho. Escreve so as linhas que mudaram de lugar. */
  const irPara = (id: string, dir: -1 | 1) => {
    for (const m of mover(lista, id, dir)) now('leg', m.id, 'position', m.position);
  };

  return (
    <div className="mt">
      {lista.map((it, ix) => (
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
                {tkEmoji(k)} {TK[k]}
              </option>
            ))}
          </select>
          {/* vazio e vazio, nao zero: sem valor ele mostra "a lancar" (10.0) */}
          <NumField
            fk={`leg|${it.id}|amount`}
            value={it.amount}
            onCommit={(v) => patch('leg', it.id, 'amount', v)}
            className="pv"
            placeholder="quanto custa"
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
            onClick={() => void apagar('leg', it.id, it.seed_id)}
            title="tirar o trecho"
            aria-label="tirar"
          >
            ×
          </button>
          <div className="wh nt">
            {/* a ordem E a sequencia da viagem (10.5), entao ela se arruma aqui */}
            <span className="ordb">
              <button
                type="button"
                onClick={() => irPara(it.id, -1)}
                disabled={ix === 0}
                title="subir um lugar"
                aria-label="subir um lugar"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => irPara(it.id, 1)}
                disabled={ix === lista.length - 1}
                title="descer um lugar"
                aria-label="descer um lugar"
              >
                ↓
              </button>
            </span>
            <span className={`stg tkc-${it.kind}`}>{TK[it.kind]}</span>
            {it.bought ? (
              <span className="dtag">comprado</span>
            ) : (
              <span className="dtag off">a comprar</span>
            )}
            {/* A INTENCAO, ao lado do ESTADO (09/09). O par lido junto e a
                diferenca inteira: "compro antes / a comprar" e o voo que
                ele precisa resolver; "compro no dia / a comprar" e o metro,
                que nunca vai estar pendente.

                E ETIQUETA, NAO CAIXINHA, de proposito: uma segunda caixinha
                ao lado da de "comprado" seria indistinguivel dela, e a
                regua dele de 08/09 e "nao precisa ter tantos campos".

                A regua de QUANDO marcar e dele: "voos interpaises e trens
                intercidades" sim; "trens e metros dentro das cidades" nao. */}
            <button
              type="button"
              className={`dtag tgl${it.buy_ahead ? '' : ' off'}`}
              onClick={() => now('leg', it.id, 'buy_ahead', !it.buy_ahead)}
              title={it.buy_ahead
                ? 'preciso comprar antes de viajar — clique para mudar'
                : 'compro no dia, na cidade — clique para mudar'}
            >
              {it.buy_ahead ? 'compro antes' : 'compro no dia'}
            </button>
            {it.day_iso ? <span className="dtag">{shortDt(it.day_iso)}</span> : null}
            <TextField
              fk={`leg|${it.id}|note`}
              value={it.note}
              onCommit={(v) => patch('leg', it.id, 'note', v)}
              className="wv"
              placeholder="uma nota sua"
              aria-label="nota"
            />
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
  const nota = useLocal();
  const valor = useLocal();
  const tipo = useRef<HTMLSelectElement>(null);
  const moeda = useRef<HTMLSelectElement>(null);

  const juntar = async () => {
    // o que ele digita vai INTEIRO para o banco: `stripTags` APAGA o trecho
    // entre "<" e ">". Quem escapa e a saida, nao a entrada.
    const n = nome.get();
    if (!n) return;
    const kv = tipo.current?.value ?? 'trem';
    // regra 5.11 — o que nao for R$ cai no euro, do mesmo lado do calculo
    const moe: Currency = moeda.current?.value === 'brl' ? 'brl' : 'eur';
    // trecho novo entra no fim da sequencia do roteiro (10.5)
    const pos = s.legs.reduce((a, t) => Math.max(a, t.position), 0) + 1;
    const r = insert('leg', {
      position: pos,
      name: n,
      note: nota.get(),
      kind: TIPOS.find((x) => x === kv) ?? 'trem',
      amount: parseNum(valor.get()),
      currency: moe,
    });
    // So limpa depois de o banco confirmar (secao 8, promessa 3): antes de
    // 05/09 o campo era limpo sempre, e um insert que falhava comia o que
    // ele digitou. O rodape avisa; o texto fica na tela para ele tentar.
    if (!(await r).ok) return;
    nome.limpar();
    nota.limpar();
    valor.limpar();
    // o artefato re-renderiza a tela toda depois de acrescentar: o
    // formulario volta a trem e a euro. Os selects nao se re-montam, entao
    // aqui e na mao.
    if (tipo.current) tipo.current.value = 'trem';
    if (moeda.current) moeda.current.value = 'eur';
  };

  return (
    <div className="addrow tr5">
      {/* ref por callback: o useLocal aceita input ou textarea, e o JSX quer so o input */}
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="ex. metrô até Barajas"
        aria-label="trecho novo"
      />
      <input
        ref={(el) => { nota.ref.current = el; }}
        type="text"
        placeholder="uma nota (opcional)"
        aria-label="nota do trecho novo"
      />
      <select ref={tipo} defaultValue="trem" aria-label="tipo do trecho novo">
        {TIPOS.map((k) => (
          <option key={k} value={k}>
            {tkEmoji(k)} {TK[k]}
          </option>
        ))}
      </select>
      <input
        ref={(el) => { valor.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="quanto custa"
        aria-label="valor do trecho novo"
      />
      <select ref={moeda} defaultValue="eur" aria-label="moeda do trecho novo">
        <option value="eur">€</option>
        <option value="brl">R$</option>
      </select>
      <button onClick={() => void juntar()}>adicionar trecho</button>
    </div>
  );
}
