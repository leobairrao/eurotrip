'use client';
// ============================================================
// 10.4 — Comidas. Tres listas por pais, nesta ordem: pratos tipicos
// (lista de desejo, sem dia), restaurantes e cafes (esses aparecem no
// Roteiro para encaixar num dia).
//
// Comida NAO tem campo de valor — nenhum (regra 5.9). O que se come
// vive na estimativa e na Caixa, nunca no custo real.
// ============================================================
import { CO, FK, FKCLS, FKE, FKPL, FOOD, coOf } from '@/content';
import type { FoodSugg } from '@/content';
import { Inline, Nota, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { shortDt, stripTags } from '@/lib/fmt';
import type { Food, FoodKind } from '@/lib/types';

/** A ordem do select e a dos cartoes. E a mesma do artefato. */
const KINDS: FoodKind[] = ['prato', 'restaurante', 'cafe'];

const TITULO: Record<FoodKind, string> = {
  prato: 'Pratos típicos',
  restaurante: 'Restaurantes',
  cafe: 'Cafés e padarias',
};
const SUB: Record<FoodKind, string> = {
  prato: 'o que provar, sem dia marcado',
  restaurante: 'entram nos dias do Roteiro',
  cafe: 'entram nos dias do Roteiro',
};
const PLACEHOLDER: Record<FoodKind, string> = {
  prato: 'ex. bacalhau à Brás',
  restaurante: 'ex. Ramiro, na Almirante Reis',
  cafe: 'ex. Pastéis de Belém',
};

export default function Comidas() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();

  const co = coOf(selCO);
  const f = FOOD.find((x) => x.pais === selCO) ?? null;

  return (
    <>
      <div className="panelhead">
        <h2>Comidas</h2>
        <p>
          Três listas por país. <b>Pratos</b> é lista de desejo — coisa típica que você quer
          provar em algum momento, sem dia marcado. <b>Restaurantes</b> e <b>cafés</b> são
          lugares, e esses aparecem no Roteiro para você encaixar num dia.
        </p>
      </div>

      {/* ---- sub-abas por pais: a contagem e o total do pais ---- */}
      <div className="subtabs">
        {CO.map((c) => {
          const n = C.foodsOf(s, c.k).length;
          return (
            <button
              key={c.k}
              className="chip"
              aria-pressed={selCO === c.k}
              onClick={() => setSelCO(c.k)}
              style={{ ['--cc' as string]: `var(${c.cc})` }}
            >
              {c.n}<span className="cn">{n || '—'}</span>
            </button>
          );
        })}
      </div>

      {KINDS.map((k) => (
        <Cartao key={k} kind={k} cor={k === 'prato' ? co.cc : k === 'restaurante' ? '--c-nl' : '--ochre'} />
      ))}

      {f ? <Sugestoes f={f} /> : null}
    </>
  );
}

/** Um dos tres cartoes: lista + formulario de acrescentar. */
function Cartao({ kind, cor }: { kind: FoodKind; cor: string }) {
  const { s } = useApp();
  const { selCO } = useUi();
  const co = coOf(selCO);
  const itens = C.foodsKind(s, selCO, kind);
  const n = itens.length;

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cor})` }}>
      <div className="h">
        <h3>{FKE[kind]} {TITULO[kind]}</h3>
        <div className="m">
          {co.n} · {n} {n === 1 ? FK[kind] : FKPL[kind]} · {SUB[kind]}
        </div>
      </div>
      <div className="b">
        {n ? (
          <div className="mt">
            {itens.map((it) => <Linha key={it.id} it={it} />)}
          </div>
        ) : (
          <div className="empty"><Vazio kind={kind} /></div>
        )}
        <Acrescentar kind={kind} />
      </div>
    </div>
  );
}

function Vazio({ kind }: { kind: FoodKind }) {
  if (kind === 'prato') {
    return (
      <>Nada aqui ainda. As minhas sugestões estão embaixo — puxe com o <b>+</b> ou escreva o seu.</>
    );
  }
  if (kind === 'restaurante') {
    return (
      <>
        Nenhum restaurante anotado. Quando achar um que você quer ir, ponha aqui —{' '}
        <b>ele vira opção nos dias do Roteiro</b>.
      </>
    );
  }
  return <>Nenhum café anotado. Mesmo caso: <b>café entra nos dias do Roteiro</b>.</>;
}

/** nome | tipo | x — e nada mais: comida nao tem preco (regra 5.9). */
function Linha({ it }: { it: Food }) {
  const { patch, now, nowMany, remove } = useApp();

  return (
    <div className={`mrow fk-${FKCLS[it.kind]}`}>
      <TextField
        fk={`food|${it.id}|name`}
        value={it.name}
        onCommit={(v) => patch('food', it.id, 'name', v)}
        className="nv"
        aria-label="nome"
      />
      <select
        className="sv"
        aria-label="tipo"
        value={it.kind}
        onChange={(e) => {
          const k = e.currentTarget.value;
          // Regra 5.8: prato tipico nao vai para dia — virar prato limpa a data.
          if (k === 'prato') nowMany('food', it.id, { kind: 'prato', day_iso: null });
          else now('food', it.id, 'kind', k);
        }}
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>{FKE[k]} {FK[k]}</option>
        ))}
      </select>
      {/* o x grava o seed_id em killed_seed para o item nao ressuscitar (regra 5.14) */}
      <button
        className="xb"
        aria-label="tirar"
        onClick={() => void remove('food', it.id, it.seed_id)}
      >
        ×
      </button>
      {it.day_iso || it.note ? (
        <div className="wh">
          {it.day_iso ? <><span className="dtag">{shortDt(it.day_iso)}</span>{' '}</> : null}
          <Inline html={it.note} />
        </div>
      ) : null}
    </div>
  );
}

function Acrescentar({ kind }: { kind: FoodKind }) {
  const { insert } = useApp();
  const { selCO } = useUi();
  const campo = useLocal();

  const por = () => {
    const nome = stripTags(campo.get());
    if (!nome) return;
    void insert('food', {
      country: selCO,
      name: nome,
      note: '',
      kind,
      day_iso: null,
      seed_id: null,
    });
    campo.limpar();
  };

  return (
    <div className="addrow two">
      <input
        type="text"
        ref={(el) => { campo.ref.current = el; }}
        placeholder={PLACEHOLDER[kind]}
        aria-label="nome"
      />
      <button onClick={por}>pôr em {FKPL[kind]}</button>
    </div>
  );
}

/**
 * A camada de pesquisa. Nada daqui entra na lista dele sozinho:
 * so o + copia (regra 5.13). "o que eu acho que nao vale" nao tem +.
 */
function Sugestoes({ f }: { f: FoodSugg }) {
  const { s, insert } = useApp();
  const { selCO } = useUi();
  const co = coOf(selCO);

  const puxar = async (ix: number) => {
    const sid = `F${selCO}|${ix}`;
    // Copia como prato tipico, e marca a semente como adotada para o + virar "na sua lista".
    await insert('food', {
      country: selCO,
      name: stripTags(f.reg[ix][0]),
      note: f.reg[ix][1],
      kind: 'prato',
      day_iso: null,
      seed_id: null,
    });
    await insert('adopted', { seed_id: sid });
  };

  return (
    <div className="card">
      <div className="h">
        <h3>Minhas sugestões de {co.n}</h3>
        <div className="m">pratos típicos · o + põe na sua lista de pratos</div>
      </div>
      <div className="b">
        <div className="sg" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <div className="sgh">vale provar</div>
          {f.reg.map((r, ix) => {
            const sid = `F${selCO}|${ix}`;
            const tk = s.adopted.includes(sid);
            return (
              <div key={sid} className={tk ? 'sgr taken' : 'sgr'}>
                <Nota html={r[0]} className="nm" />
                {tk ? (
                  <div className="vl">na sua lista</div>
                ) : (
                  <button className="plus" aria-label="pôr na minha lista" onClick={() => void puxar(ix)}>+</button>
                )}
                <Nota html={r[1]} className="wh" />
              </div>
            );
          })}
        </div>

        {f.av && f.av.length ? (
          <div className="sg">
            <div className="sgh">o que eu acho que não vale</div>
            {f.av.map((a) => (
              <div key={a[0]} className="sgr">
                <Nota html={a[0]} className="nm" />
                <div className="vl">—</div>
                <Nota html={a[1]} className="wh" />
              </div>
            ))}
          </div>
        ) : null}

        {/* o aviso do pais e meu, nao dele: nao editavel, nao apagavel (regra 5.6) */}
        {f.warn ? (
          <div className="n warn" style={{ maxWidth: 'none' }}>
            <b><Inline html={f.warn[0]} /></b>
            <Inline html={f.warn[1]} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
