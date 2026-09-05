'use client';
// ============================================================
// 10.3 — Atracoes. UMA lista so por cidade: o que eu sugeri e o
// que ele escreveu convivem, separados pela situacao e ordenados
// escolhida -> backlog -> sugerida.
// Regra 5.2: so 'escolhida' entra no custo. O backlog aparece
// sempre em linha propria ("somaria mais"), nunca somado ao real.
// ============================================================
import { AK, AKE, CITYNOTE, CO, CT, ST, STCLS, coOf } from '@/content';
import { Inline, NumField, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, parseNum, shortDt, stripTags } from '@/lib/fmt';
import type { Attraction } from '@/lib/types';

/**
 * Os quatro chips de filtro. [valor no banco, rotulo, sigla do CSS].
 * O valor guardado em `filt` e a palavra inteira, para bater direto com
 * `it.status`; a sigla curta existe so para a classe .f-esc / .f-all.
 */
const FILTROS: [string, string, string][] = [
  ['', 'tudo', 'all'],
  ['escolhida', 'escolhidas', 'esc'],
  ['backlog', 'backlog', 'bac'],
  ['sugerida', 'sugeridas', 'sug'],
];

export default function Atracoes() {
  const { s } = useApp();
  const { selCO, setSelCO, filt, setFilt } = useUi();

  const co = coOf(selCO);

  let nE = 0;
  let nB = 0;
  let nS = 0;
  for (const cc of co.cities) {
    nE += C.attrCountCity(s, cc, 'escolhida');
    nB += C.attrCountCity(s, cc, 'backlog');
    nS += C.attrCountCity(s, cc, 'sugerida');
  }
  const conta: Record<string, number> = {
    '': nE + nB + nS,
    escolhida: nE,
    backlog: nB,
    sugerida: nS,
  };

  const E = C.attrEurAll(s, 'escolhida');
  const B = C.attrEurAll(s, 'backlog');

  return (
    <>
      <div className="panelhead">
        <h2>Atrações</h2>
        <p>
          Tudo que você tem vontade de fazer, num lugar só. Eu jogo aqui como <b>sugerida</b>;
          você manda pro <b>backlog</b> o que interessa e marca como <b>escolhida</b> o que cabe
          nos dias. <b>Só as escolhidas entram no custo.</b>
        </p>
      </div>

      {/* ---- sub-abas por pais, com o € das escolhidas de cada ---- */}
      <div className="subtabs">
        {CO.map((c) => {
          const e = C.attrEurCountry(s, c.k, 'escolhida');
          return (
            <button
              key={c.k}
              className="chip"
              aria-pressed={selCO === c.k}
              style={{ ['--cc' as string]: `var(${c.cc})` }}
              onClick={() => setSelCO(c.k)}
            >
              {c.n}<span className="cn">{e ? eur(e) : '—'}</span>
            </button>
          );
        })}
      </div>

      {/* ---- filtros: a contagem e so do pais selecionado ---- */}
      <div className="filt">
        {FILTROS.map(([v, rot, sig]) => (
          <button
            key={sig}
            className={`fchip f-${sig}`}
            aria-pressed={filt === v}
            onClick={() => setFilt(v)}
          >
            {rot}<span className="cn">{conta[v]}</span>
          </button>
        ))}
      </div>

      {co.cities.map((city) => (
        <Cidade key={city} city={city} cc={co.cc} />
      ))}

      <div className="bigsum">
        <div>
          <b>{eur(C.attrEurCountry(s, selCO, 'escolhida'))}</b>
          <span>{co.n}, escolhidas</span>
        </div>
        <div>
          <b>{eur(E)}</b>
          <span>escolhidas na viagem</span>
        </div>
        <div>
          <b>{brl(E * C.rate(s))}</b>
          <span>em reais</span>
        </div>
        <div>
          <b>{eur(B)}</b>
          <span>o backlog inteiro somaria</span>
        </div>
      </div>
      <p className="mono foot">
        Os preços são de 2026 e servem de ordem de grandeza — confirme no site oficial ao
        reservar. Tudo é editável, inclusive o que eu sugeri: o nome, a nota, a cidade, o tipo
        e o número que eu chutei.
      </p>
    </>
  );
}

/** Um cartao por cidade: o aviso da cidade em cima, a lista, o formulario, o resumo. */
function Cidade({ city, cc }: { city: string; cc: string }) {
  const { s } = useApp();
  const te = C.attrEur(s, city, 'escolhida');
  const tb = C.attrEur(s, city, 'backlog');
  // Regra 5.6: o aviso de cidade e meu, nao dele — nao edita, nao apaga, nao soma.
  const av = CITYNOTE[city];

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cc})` }}>
      <div className="h">
        <h3>{CT[city].n}</h3>
        <div className="m">
          {C.attrCountCity(s, city, 'escolhida')} escolhidas · {C.attrCountCity(s, city, 'backlog')} no backlog · {C.attrCountCity(s, city, 'sugerida')} sugeridas
        </div>
      </div>
      <div className="b">
        {av ? (
          <div className={`n ${av[0]}`}>
            <b>{av[1]}</b>
            <Inline html={av[2]} />
          </div>
        ) : null}
        <Lista city={city} />
        <AddRow city={city} />
        {te || tb ? (
          <div className="atsum">
            escolhidas: <b>{eur(te)}</b>
            {tb ? ` · backlog inteiro somaria mais ${eur(tb)}` : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Lista({ city }: { city: string }) {
  const { s } = useApp();
  const { filt } = useUi();
  const todas = C.attrsSorted(s, city);
  const linhas = filt ? todas.filter((x) => x.status === filt) : todas;

  if (!linhas.length) {
    return (
      <div className="empty">
        {filt
          ? `Nada ${filt === 'escolhida' ? 'escolhido' : filt === 'backlog' ? 'no backlog' : 'sugerido'} aqui.`
          : 'Nada aqui ainda. Escreve abaixo.'}
      </div>
    );
  }
  return (
    <div className="mt">
      {linhas.map((it) => (
        <Linha key={it.id} it={it} />
      ))}
    </div>
  );
}

/** nome | situacao | tipo | preco | x — e embaixo a etiqueta do dia + a nota. */
function Linha({ it }: { it: Attraction }) {
  const { patch, now, remove } = useApp();

  return (
    <div className={`mrow at5 st-${STCLS[it.status]}`}>
      <TextField
        fk={`attraction|${it.id}|name`}
        value={it.name}
        onCommit={(v) => patch('attraction', it.id, 'name', v)}
        className="nv"
        aria-label="nome"
      />
      <select
        className="sv"
        aria-label="situação"
        value={it.status}
        onChange={(e) => now('attraction', it.id, 'status', e.currentTarget.value)}
      >
        {Object.entries(ST).map(([k, rot]) => (
          <option key={k} value={k}>{rot}</option>
        ))}
      </select>
      {/* v28: passeio (rua/centro) ou tour (visitar um lugar). O emoji vai para o dia. */}
      <select
        className="sv kv"
        aria-label="tipo"
        value={it.kind}
        onChange={(e) => now('attraction', it.id, 'kind', e.currentTarget.value)}
      >
        {Object.entries(AK).map(([k, rot]) => (
          <option key={k} value={k}>{`${AKE[k]} ${rot}`}</option>
        ))}
      </select>
      {/* Campo de valor vazio e vazio, nao zero (10.0): o artefato escreve `it.pr||""`,
          e sao 66 atracoes gratuitas — com "0" no campo a borda deixa de ser transparente. */}
      <NumField
        fk={`attraction|${it.id}|price_eur`}
        value={it.price_eur || null}
        onCommit={(v) => patch('attraction', it.id, 'price_eur', v ?? 0)}
        className="pv"
        placeholder="€ 0"
        aria-label="preço em euros"
      />
      {/* Regra 5.14: o seed_id vai junto, senao o item ressuscita na proxima carga. */}
      <button
        className="xb"
        title="tirar da lista"
        aria-label="tirar da lista"
        onClick={() => void remove('attraction', it.id, it.seed_id)}
      >
        ×
      </button>
      {/* A segunda linha, que antes era so leitura, agora e onde se edita
          a cidade e a nota. A grade da linha de cima nao mudou. */}
      <div className="wh nt">
        <select
          className="mv"
          aria-label="cidade"
          value={it.city}
          /* cidade vazia sumiria com a linha de TODOS os cartoes: ela so
             aparece dentro do cartao da cidade dela. Nao ha como o select
             devolver vazio pela tela, mas o custo da trava e uma linha. */
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v) now('attraction', it.id, 'city', v);
          }}
        >
          {CO.map((c) => (
            <optgroup key={c.k} label={c.n}>
              {c.cities.map((ck) => (
                <option key={ck} value={ck}>{CT[ck]?.n ?? ck}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {it.day_iso ? (
          <span className="dtag">{`${AKE[it.kind]} ${shortDt(it.day_iso)}`}</span>
        ) : null}
        {/* stripTags no que ENTRA: a nota semeada pode ter <b>, e campo
            nenhum mostra tag crua. O que ele digitar ja sai puro. */}
        <TextField
          fk={`attraction|${it.id}|note`}
          value={stripTags(it.note)}
          onCommit={(v) => patch('attraction', it.id, 'note', v)}
          className="wv"
          placeholder="uma nota sua"
          aria-label="nota"
        />
      </div>
    </div>
  );
}

/** O formulario de acrescentar. Entra sempre como backlog — quem escolhe e ele. */
function AddRow({ city }: { city: string }) {
  const { insert } = useApp();
  const nome = useLocal();
  const nota = useLocal();
  const preco = useLocal();

  const por = () => {
    const nm = stripTags(nome.get()).trim();
    if (!nm) return;
    void insert('attraction', {
      city,
      name: nm,
      price_eur: parseNum(preco.get()) ?? 0,
      note: stripTags(nota.get()),
      status: 'backlog',
      kind: 'passeio',
      day_iso: null,
      seed_id: null,
    });
    nome.limpar();
    nota.limpar();
    preco.limpar();
  };

  return (
    <div className="addrow at3">
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder={`o que você quer fazer em ${CT[city].n}`}
        aria-label="nome da atração"
      />
      <input
        ref={(el) => { nota.ref.current = el; }}
        type="text"
        placeholder="uma nota (opcional)"
        aria-label="nota da atração"
      />
      <input
        ref={(el) => { preco.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="€"
        aria-label="preço em euros"
      />
      <button onClick={por}>pôr no backlog</button>
    </div>
  );
}
