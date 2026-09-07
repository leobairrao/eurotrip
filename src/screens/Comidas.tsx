'use client';
// ============================================================
// 10.4 — Comidas. UM formulario de acrescentar (06/09) e tres listas
// por pais, nesta ordem: pratos tipicos (lista de desejo, sem dia),
// restaurantes e cafes (esses aparecem no Roteiro para encaixar num dia).
//
// A etiqueta escolhida no formulario decide em qual das tres a linha
// cai. Ate 05/09 eram tres formularios iguais, um dentro de cada cartao.
//
// Comida NAO tem campo de valor — nenhum (regra 5.9). O que se come
// vive na estimativa e na Caixa, nunca no custo real.
// ============================================================
import { CO, FK, FKCLS, FKPL, coOf, fkEmoji } from '@/content';
import { useState } from 'react';
import { TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { shortDt } from '@/lib/fmt';
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

  /**
   * A etiqueta mora AQUI, e nao dentro do formulario, por causa do
   * `key={selCO}` logo abaixo: a chave remonta o formulario a cada troca
   * de pais, e remontar zera todo estado de hook que estiver la dentro.
   * Com a etiqueta aqui em cima, trocar de pais limpa o que ele digitou
   * (que e o que a chave existe para fazer) sem desfazer a escolha dele.
   * Catalogando restaurantes pelos sete paises, ele escolhe uma vez.
   */
  const [kind, setKind] = useState<FoodKind>('prato');

  return (
    <>
      <div className="panelhead">
        <h2>Comidas</h2>
        <p>
          <b>Um campo só para acrescentar</b>, logo abaixo: escreva o nome e escolha a
          etiqueta. <b>Pratos</b> é lista de desejo — coisa típica que você quer provar em
          algum momento, sem dia marcado. <b>Restaurantes</b> e <b>cafés</b> são lugares, e
          esses aparecem no Roteiro para você encaixar num dia.
        </p>
      </div>

      {/* ---- sub-abas por pais: a contagem e o total do pais ---- */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => String(C.foodsOf(s, k).length || '')}
      />

      {/* UM formulario para os tres (06/09). A chave leva o pais: trocar de pais
          limpa o NOME e a NOTA, como o artefato fazia com os tres. A etiqueta
          nao — ela vive no estado daqui de cima, que a chave nao alcanca. */}
      <Acrescentar key={selCO} kind={kind} setKind={setKind} />

      {KINDS.map((k) => (
        <Cartao key={`${selCO}|${k}`} kind={k} cor={k === 'prato' ? co.cc : k === 'restaurante' ? '--c-nl' : '--ochre'} />
      ))}

      {/* Os avisos ficam AQUI, fora do painel de sugestao que saiu em 06/09.
          Sem isto, um aviso que ele adota na aba Sugestoes nao teria tela
          nenhuma para aparecer — ficaria no banco, invisivel. Enquanto ele
          nao adotar nenhum, os dois blocos desenham so o "+ aviso". */}
      <div className="card">
        <div className="h">
          <h3>Avisos de {co.n}</h3>
          <div className="m">o que você anotou, ou puxou da aba Sugestões</div>
        </div>
        <div className="b">
          <Avisos spot={`comidas:${selCO}:naovale`} lista />
          <Avisos spot={`comidas:${selCO}`} rotulo="aviso do país" />
        </div>
      </div>
    </>
  );
}

/** Um dos tres cartoes: so a lista. O formulario e um so, la em cima. */
function Cartao({ kind, cor }: { kind: FoodKind; cor: string }) {
  const { s } = useApp();
  const { selCO } = useUi();
  const co = coOf(selCO);
  const itens = C.foodsKind(s, selCO, kind);
  const n = itens.length;

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cor})` }}>
      <div className="h">
        <h3>{fkEmoji(kind)} {TITULO[kind]}</h3>
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
      </div>
    </div>
  );
}

function Vazio({ kind }: { kind: FoodKind }) {
  if (kind === 'prato') {
    return (
      <>
        Nada aqui ainda. As minhas sugestões estão embaixo — puxe com o <b>+</b>, ou escreva
        o seu no campo do topo com a etiqueta <b>prato</b>.
      </>
    );
  }
  if (kind === 'restaurante') {
    return (
      <>
        Nenhum restaurante anotado. Quando achar um que você quer ir, escreva no campo do
        topo com a etiqueta <b>restaurante</b> — <b>ele vira opção nos dias do Roteiro</b>.
      </>
    );
  }
  return (
    <>
      Nenhum café anotado. Mesmo caso, com a etiqueta <b>café</b>: ele{' '}
      <b>entra nos dias do Roteiro</b>.
    </>
  );
}

/** nome | tipo | x — e nada mais: comida nao tem preco (regra 5.9). */
function Linha({ it }: { it: Food }) {
  const { patch, now, nowMany } = useApp();
  const apagar = useApagarLinha();

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
          <option key={k} value={k}>{fkEmoji(k)} {FK[k]}</option>
        ))}
      </select>
      {/* o x grava o seed_id em killed_seed para o item nao ressuscitar (regra 5.14) */}
      <button
        className="xb"
        aria-label="tirar"
        onClick={() => void apagar('food', it.id, it.seed_id)}
      >
        ×
      </button>
      {/* a segunda linha agora edita: o pais e a nota */}
      <div className="wh nt">
        <select
          className="mv"
          aria-label="país"
          value={it.country}
          /* mesma trava da cidade em Atracoes: pais vazio orfanaria a linha */
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v) now('food', it.id, 'country', v);
          }}
        >
          {CO.map((c) => (
            <option key={c.k} value={c.k}>{c.n}</option>
          ))}
        </select>
        {it.day_iso ? <span className="dtag">{shortDt(it.day_iso)}</span> : null}
        <TextField
          fk={`food|${it.id}|note`}
          value={it.note}
          onCommit={(v) => patch('food', it.id, 'note', v)}
          className="wv"
          placeholder="uma nota sua"
          aria-label="nota"
        />
      </div>
    </div>
  );
}

/**
 * UM formulario para os tres cartoes (06/09/2026).
 *
 * Ele pediu: "em comidas nao precisa de tres inputs (comida, cafe e
 * restaurante): temos que ter um input e la colocamos o nome e uma tag
 * de qual das 3 opcoes e". Antes, cada cartao tinha o seu — tres
 * formularios identicos, um por tipo.
 *
 * A etiqueta e um `select` de verdade, nao um botao que parece etiqueta:
 * e o mesmo controle que ja existe em cada linha da lista, entao ele
 * escolhe do mesmo jeito ao criar e ao corrigir depois.
 *
 * `day_iso: null` sempre, para os tres. Restaurante e cafe ganham dia no
 * Roteiro, nunca aqui; e prato nao ganha dia nunca (regra 5.8).
 */
function Acrescentar({
  kind,
  setKind,
}: {
  kind: FoodKind;
  setKind: (k: FoodKind) => void;
}) {
  const { insert } = useApp();
  const { selCO } = useUi();
  const co = coOf(selCO);
  const campo = useLocal();
  const nota = useLocal();
  const [indo, setIndo] = useState(false);

  const por = async () => {
    const nome = campo.get();
    if (!nome || indo) return;
    setIndo(true);
    const r = await insert('food', {
      country: selCO,
      name: nome,
      note: nota.get(),
      kind,
      day_iso: null,
      seed_id: null,
    });
    setIndo(false);
    // So limpa depois de o banco confirmar (secao 8, promessa 3): antes de
    // 05/09 o campo era limpo sempre, e um insert que falhava comia o que
    // ele digitou. O rodape avisa; o texto fica na tela para ele tentar.
    if (!r.ok) return;
    campo.limpar();
    nota.limpar();
  };

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${co.cc})` }}>
      <div className="h">
        <h3>Acrescentar em {co.n}</h3>
        <div className="m">
          escreva o nome, escolha a etiqueta — e ele entra na lista certa aqui embaixo
        </div>
      </div>
      <div className="b">
        <div className="addrow fo3">
          <input
            type="text"
            ref={(el) => { campo.ref.current = el; }}
            placeholder={PLACEHOLDER[kind]}
            aria-label="nome"
          />
          <input
            type="text"
            ref={(el) => { nota.ref.current = el; }}
            placeholder="uma nota (opcional)"
            aria-label="nota"
          />
          <select
            /* sem `className="sv"`: as onze regras `.sv` do projeto comecam
               todas com `.mrow`, e aqui estamos dentro de `.addrow`. Quem
               veste este select e `.addrow select` do extras.css. */
            aria-label="etiqueta"
            value={kind}
            onChange={(e) => setKind(e.currentTarget.value as FoodKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{fkEmoji(k)} {FK[k]}</option>
            ))}
          </select>
          <button onClick={() => void por()} disabled={indo}>
            {indo ? 'pondo…' : `pôr em ${FKPL[kind]}`}
          </button>
        </div>
      </div>
    </div>
  );
}
