'use client';
// ============================================================
// 10.7 — Reservas e burocracia.
// E a fonte das pendencias de burocracia do Painel: marcar a
// caixinha aqui apaga a linha la e move o valor para "ja pago"
// (regra 5.10 — o valor conta sempre, a caixinha so decide o lado).
// ============================================================
import { useRef, useState } from 'react';
import { SUGGRES } from '@/content';
import { Nota, NumField, TextField, useLocal } from '@/components/Field';
import { useApp, useOrdemEstavel } from '@/lib/store';
import * as C from '@/lib/calc';
import { mover } from '@/lib/ordem';
import { brl, deHtml, parseNum } from '@/lib/fmt';

export default function Reservas() {
  const { s, patch, now, insert, remove } = useApp();

  const dn = C.bookingDone(s);
  const pg = C.bookingBrl(s, 'pago');
  const ft = C.bookingBrl(s, 'falta');
  const nPago = C.bookingCount(s, 'pago');

  // A posicao e a identidade da ordem (secao 12.2): o item novo vai para o fim.
  const proximaPos = () => s.bookings.reduce((a, r) => Math.max(a, r.position), 0) + 1;

  // mesma regra do Transporte: desempate estavel e rearranjo congelado
  // enquanto ele digita nesta lista
  const lista = useOrdemEstavel([...s.bookings].sort(C.porPosicao), 'booking|');

  /** Sobe ou desce um item. Escreve so as linhas que mudaram de lugar. */
  const irPara = (id: string, dir: -1 | 1) => {
    for (const m of mover(lista, id, dir)) now('booking', m.id, 'position', m.position);
  };

  return (
    <>
      <div className="panelhead">
        <h2>Reservas e burocracia</h2>
        <p>
          Marque a caixinha quando resolver — e ponha o valor que você pagou.{' '}
          <b>O que está marcado entra no &quot;total já pago&quot;</b> do painel e da aba Custos;
          o que ainda não está entra como previsto.
        </p>
      </div>

      {/* ---- os quatro numeros ---- */}
      <div className="bigsum b5">
        <div>
          <b>{dn}/{s.bookings.length}</b>
          <span>resolvidas</span>
          <i>{C.bookingCount(s, '')} com valor lançado</i>
        </div>
        <div>
          <b>{brl(pg)}</b>
          <span>já pago</span>
          <i>{`${nPago}${nPago === 1 ? ' item marcado' : ' itens marcados'}`}</i>
        </div>
        <div>
          <b>{brl(ft)}</b>
          <span>previsto, ainda não pago</span>
          <i>{C.bookingCount(s, 'falta')} com valor</i>
        </div>
        <div>
          <b>{brl(pg + ft)}</b>
          <span>burocracia inteira</span>
          <i>entra no custo real</i>
        </div>
      </div>

      {/* ---- a lista ---- */}
      <div className="bk">
        {!s.bookings.length ? (
          <div className="bkr">
            <div></div>
            <div></div>
            <div><p style={{ color: 'var(--muted)' }}>Nada aqui ainda.</p></div>
          </div>
        ) : null}
        {lista.map((r, ix) => (
          <div key={r.id} className={`bkr rr${r.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={r.done}
              onChange={(e) => now('booking', r.id, 'done', e.target.checked)}
              aria-label="resolvido"
            />
            <div className="rw">
              <TextField
                fk={`booking|${r.id}|name`}
                value={r.name}
                onCommit={(v) => patch('booking', r.id, 'name', v)}
                className="nv"
                aria-label="item"
              />
            </div>
            <NumField
              fk={`booking|${r.id}|amount`}
              value={r.amount}
              onCommit={(v) => patch('booking', r.id, 'amount', v)}
              className="pv rv"
              placeholder="valor"
              aria-label="quanto você pagou"
            />
            {/* regra 5.11: R$ e a primeira opcao, e e o lado em que o calculo cai */}
            <select
              className="rm"
              value={r.currency === 'eur' ? 'eur' : 'brl'}
              onChange={(e) => now('booking', r.id, 'currency', e.target.value)}
              aria-label="moeda"
            >
              <option value="brl">R$</option>
              <option value="eur">€</option>
            </select>
            <button
              className="xb"
              onClick={() => void remove('booking', r.id, r.seed_id)}
              aria-label="tirar"
            >
              ×
            </button>
            <div className="rb nt">
              <span className="ordb">
                <button
                  type="button"
                  onClick={() => irPara(r.id, -1)}
                  disabled={ix === 0}
                  title="subir um lugar"
                  aria-label="subir um lugar"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => irPara(r.id, 1)}
                  disabled={ix === lista.length - 1}
                  title="descer um lugar"
                  aria-label="descer um lugar"
                >
                  ↓
                </button>
              </span>
              <TextField
                fk={`booking|${r.id}|note`}
                value={r.note}
                onCommit={(v) => patch('booking', r.id, 'note', v)}
                className="wv"
                placeholder="prazo, preço, onde se faz"
                aria-label="detalhe"
              />
            </div>
          </div>
        ))}
      </div>

      {/* O formulario fica COLADO na lista, como em Transporte, Atracoes e
          Comidas. Ate 05/09 ele vinha depois do rodape em fonte mono, num
          cartao separado — era a ordem do artefato (secao 10.7), mas o Leo
          nao achava e pediu "poder adicionar novos itens" numa aba onde ja
          dava. Mudanca de ordem registrada de proposito. */}
      <Acrescentar proximaPos={proximaPos} />

      <p className="mono foot">
        A moeda começa em R$ porque passaporte, seguro e cartão são pagos aqui. Chip e coisas
        compradas lá, troque para €.
      </p>

      {/* ---- as 13 sugestoes: so entram na lista dele no + (regra 5.13) ---- */}
      <div className="sg">
        <div className="sgh">sugestões minhas</div>
        {SUGGRES.map((sg, j) => {
          const sid = `R|${j}`;
          // adotada = ja gravei em `adopted`, ou o item semeado ja esta na lista
          const tk = s.adopted.includes(sid) || s.bookings.some((r) => r.seed_id === sid);
          return (
            <div key={sid} className={`sgr${tk ? ' taken' : ''}`}>
              {/* o nome semeado pode trazer <b> (o CSS tem .sgr .nm b) — vai como HTML */}
              <Nota html={sg[0]} className="nm" />
              {tk ? (
                <div className="vl">na sua lista</div>
              ) : (
                <button
                  className="plus"
                  onClick={() => {
                    void insert('booking', {
                      position: proximaPos(),
                      name: deHtml(sg[0]),
                      // igual ao + de Comidas: linha dele nunca guarda tag (regra 10.0)
      note: deHtml(sg[1]),
                      amount: null,
                      currency: 'brl',
                      done: false,
                      seed_id: sid,
                    });
                    void insert('adopted', { seed_id: sid });
                  }}
                >
                  +
                </button>
              )}
              <Nota html={sg[1]} className="wh" />
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * O formulario de acrescentar. Os campos sao locais: nada vai para o
 * banco antes do botao. O detalhe fica LOGO ABAIXO do nome (secao 10.7).
 */
function Acrescentar({ proximaPos }: { proximaPos: () => number }) {
  const { insert } = useApp();
  const nome = useLocal();
  const detalhe = useLocal();
  const valor = useLocal();
  const moeda = useRef<HTMLSelectElement | null>(null);
  const [aviso, setAviso] = useState('');
  const [indo, setIndo] = useState(false);

  const acrescentar = async () => {
    const nm = nome.get();
    if (!nm) { setAviso('escreva o que é, primeiro'); return; }
    setAviso('');
    setIndo(true);
    const r = await insert('booking', {
      position: proximaPos(),
      name: nm,
      // NAO se arranca tag do que entra: `stripTags` APAGA o trecho entre
      // "<" e ">" e o texto sumia do banco. Quem escapa e a saida.
      note: detalhe.get(),
      amount: parseNum(valor.get()),
      currency: moeda.current?.value === 'eur' ? 'eur' : 'brl',
      done: false,
    });
    setIndo(false);
    // So limpa depois de o banco confirmar. Antes de 05/09 o campo era
    // limpo sempre, e um insert que falhava comia o que ele digitou.
    if (!r.ok) { setAviso('não consegui acrescentar. O que você escreveu está aqui — tente de novo.'); return; }
    nome.limpar();
    detalhe.limpar();
    valor.limpar();
    if (moeda.current) moeda.current.value = 'brl';
  };

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Acrescentar um item</h3>
        <div className="m">o que é, e o que você precisa lembrar sobre isso</div>
      </div>
      <div className="b">
        <div className="form">
          <div className="fld">
            <label>O que é</label>
            <input
              type="text"
              placeholder="ex. vacina de febre amarela"
              ref={(el) => { nome.ref.current = el; }}
            />
          </div>
          <div className="fld">
            <label>Detalhe — prazo, preço, onde se faz</label>
            <textarea
              placeholder="ex. tem que ser 10 dias antes de embarcar; de graça no posto, mas leve o cartão do SUS"
              ref={(el) => { detalhe.ref.current = el; }}
            />
          </div>
          <div className="frow">
            <div className="fld">
              <label>Valor, se já souber</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                ref={(el) => { valor.ref.current = el; }}
              />
            </div>
            <div className="fld">
              <label>Moeda</label>
              {/* regra 5.11: burocracia comeca em real */}
              <select ref={moeda} defaultValue="brl">
                <option value="brl">R$ reais</option>
                <option value="eur">€ euros</option>
              </select>
            </div>
          </div>
        </div>
        <div className="addrow one">
          <button onClick={() => void acrescentar()} disabled={indo}>
            {indo ? 'acrescentando…' : 'acrescentar à lista'}
          </button>
        </div>
        {aviso ? <p className="mono foot avisofalha">{aviso}</p> : null}
      </div>
    </div>
  );
}
