'use client';
// ============================================================
// 10.6 — Hospedagem, REESCRITA na Fase 6 (05/09/2026).
//
// O Leo pediu: "na parte de hospedagem, vamos colocar assim como em
// atracoes e restaurantes, vamos fazer opcoes por pais". E escolheu, das
// tres leituras possiveis, a de ESCOLHER: cada cidade vira uma lista de
// opcoes e ele marca a que fechou.
//
// Ate aqui isto eram 7 cartoes fixos, um por base, e os bairros que eu
// pesquisei estavam em PROSA, escondidos numa frase — Madrid tinha tres
// (Chamberi, Arguelles, Tetuan) empacotados numa linha so.
//
// SO A OPCAO MARCADA ENTRA NO CUSTO. Sem isso, tres opcoes em Madrid com
// diaria lancada entrariam as tres no total da viagem, e ele veria um
// numero errado sem nada na tela indicando erro.
//
// DUAS ABAS NASCEM SEM BASE, e nao e bug: Luxemburgo e Alemanha nao tem
// hospedagem porque sao bate-volta de Metz. Aba vazia parece defeito,
// entao elas dizem isso com todas as letras.
//
// O `selCO` e o MESMO de Atracoes e Comidas, de proposito — as duas ja o
// compartilham. Consequencia registrada: escolher Luxemburgo aqui deixa
// Atracoes e Comidas abrindo em Luxemburgo no proximo F5, porque
// `setSelCO` grava em localStorage.
// ============================================================
import { CT, STAYS, coOf } from '@/content';
import { AreaField, NumField, IntField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, parseNum } from '@/lib/fmt';
import type { StayOption } from '@/lib/types';


const CIDADES = STAYS.map((x) => x.c);
/** As bases de cada pais. Pode ser vazio: Luxemburgo e Alemanha nao tem. */
const basesDe = (co: string) => coOf(co).cities.filter((c) => CIDADES.includes(c));

export default function Hospedagem() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const tt = C.stayTotalAll(s, CIDADES);
  const bases = basesDe(selCO);

  return (
    <>
      <div className="panelhead">
        <h2>Hospedagem</h2>
        <p>
          As opções que eu pesquisei em cada base, e você marca <b>a que fechou</b>. Só a
          marcada entra no custo da viagem — as outras ficam guardadas como plano B. A
          diária é a <b>diária cheia do anúncio</b>, sem dividir.
        </p>
      </div>

      {/* a mesma fita de Atracoes, Comidas e Dicas */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => {
          const v = coOf(k).cities.reduce((a, city) => a + C.stayTotal(s, city), 0);
          return v ? eur(v) : '';
        }}
      />

      <div className="bigsum">
        <div>
          <b>{C.stayCount(s, CIDADES)}/{STAYS.length}</b>
          <span>bases com endereço salvo</span>
        </div>
        <div>
          <b>{eur(tt)}</b>
          <span>diárias cheias somadas</span>
        </div>
        <div>
          <b>{brl(tt * C.rate(s))}</b>
          <span>em reais</span>
        </div>
      </div>

      {bases.length === 0 ? (
        <div className="card" style={{ ['--cc' as string]: `var(${coOf(selCO).cc})` }}>
          <div className="h"><h3>{coOf(selCO).n}</h3></div>
          <div className="b">
            <div className="empty">
              Aqui é bate-volta de Metz — você não dorme neste país, e isso foi escolha sua.
              {selCO === 'lu'
                ? ' Luxemburgo fica a 45 min de trem, e o lado luxemburguês é de graça.'
                : ' Trier se faz de Metz via Luxemburgo, num dia.'}
            </div>
          </div>
        </div>
      ) : (
        bases.map((city) => <Base key={city} city={city} cc={coOf(selCO).cc} />)
      )}

      <p className="mono foot">
        Paris saiu daqui: virou bate-volta de Amsterdã, você não dorme lá. Em Amsterdã, a
        base é <b>Haarlem</b> — 15 min de trem e fora da taxa municipal de 12,5%.
      </p>
    </>
  );
}

function Base({ city, cc }: { city: string; cc: string }) {
  const { s } = useApp();
  const opcoes = C.staysOf(s, city);
  const marcada = C.stayChosen(s, city);

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cc})` }}>
      <div className="h">
        <h3>{CT[city].n}</h3>
        <div className="m">
          {opcoes.length} {opcoes.length === 1 ? 'opção' : 'opções'}
          {marcada ? ` · fechou: ${marcada.name}` : ' · nenhuma marcada ainda'}
        </div>
      </div>
      <div className="b">
        {/* o "warn" de cada base virou aviso dele, como em Atracoes e Comidas */}
        <Avisos spot={`stay:${city}`} rotulo="aviso" />

        {opcoes.length === 0 ? (
          <div className="empty">Nenhuma opção aqui ainda. Escreve abaixo.</div>
        ) : (
          <div className="mt">
            {opcoes.map((o) => <Opcao key={o.id} o={o} />)}
          </div>
        )}

        <Acrescentar city={city} proximaPos={opcoes.length} />

        {marcada ? <Reserva o={marcada} /> : null}
      </div>
    </div>
  );
}

/** nome | diária | noites | total | "é essa" | ✓pago | × */
function Opcao({ o }: { o: StayOption }) {
  const { s, patch, now, remove } = useApp();
  const v = C.stayValor(o);

  /** Marcar uma DESMARCA a anterior: nao existe duas fechadas na mesma cidade. */
  const marcar = () => {
    if (o.chosen) { now('stay_option', o.id, 'chosen', false); return; }
    const antiga = C.stayChosen(s, o.city);
    if (antiga && antiga.id !== o.id) now('stay_option', antiga.id, 'chosen', false);
    now('stay_option', o.id, 'chosen', true);
  };

  return (
    <div className={`mrow ho6${o.chosen ? ' pgo' : ''}`}>
      <TextField
        fk={`stay_option|${o.id}|name`}
        value={o.name}
        onCommit={(x) => patch('stay_option', o.id, 'name', x)}
        className="nv"
        aria-label="nome da opção"
      />
      <NumField
        fk={`stay_option|${o.id}|nightly_eur`}
        value={o.nightly_eur}
        onCommit={(x) => patch('stay_option', o.id, 'nightly_eur', x)}
        className="pv"
        placeholder="quanto custa"
        aria-label="diária cheia em euros"
      />
      <IntField
        fk={`stay_option|${o.id}|nights`}
        value={o.nights}
        onCommit={(x) => patch('stay_option', o.id, 'nights', x)}
        className="pv nt"
        placeholder="noites"
        aria-label="noites"
      />
      <span className="vl" title="diária × noites, ou o total se você lançou">
        {v ? eur(v) : '—'}
      </span>
      <button
        className={`esta${o.chosen ? ' on' : ''}`}
        title={o.chosen ? 'desmarcar' : 'é esta que eu fechei'}
        aria-pressed={o.chosen}
        onClick={marcar}
      >
        é esta
      </button>
      <input
        className="ck"
        type="checkbox"
        title="já paguei"
        aria-label="já paguei"
        checked={o.paid}
        onChange={(e) => now('stay_option', o.id, 'paid', e.currentTarget.checked)}
      />
      <button
        className="xb"
        title="apagar esta opção"
        aria-label={`apagar ${o.name}`}
        onClick={() => void remove('stay_option', o.id, o.seed_id)}
      >
        ×
      </button>
      <AreaField
        fk={`stay_option|${o.id}|note`}
        value={o.note}
        onCommit={(x) => patch('stay_option', o.id, 'note', x)}
        className="wh"
        placeholder="uma nota sua"
      />
    </div>
  );
}

/** O formulario da reserva fechada: so aparece depois de ele marcar uma. */
function Reserva({ o }: { o: StayOption }) {
  const { patch } = useApp();
  return (
    <div className="form resv">
      <div className="fld">
        <label>Endereço de {o.name}</label>
        <TextField
          fk={`stay_option|${o.id}|address`}
          value={o.address}
          onCommit={(v: string) => patch('stay_option', o.id, 'address', v)}
          placeholder="rua, número, bairro"
        />
      </div>
      <div className="frow">
        <div className="fld">
          <label>Check-in</label>
          <TextField
            fk={`stay_option|${o.id}|check_in`}
            value={o.check_in}
            onCommit={(v: string) => patch('stay_option', o.id, 'check_in', v)}
            placeholder="ex. dia 12 - 15h"
          />
        </div>
        <div className="fld">
          <label>Check-out</label>
          <TextField
            fk={`stay_option|${o.id}|check_out`}
            value={o.check_out}
            onCommit={(v: string) => patch('stay_option', o.id, 'check_out', v)}
            placeholder="ex. dia 16 - 11h"
          />
        </div>
      </div>
      <div className="frow">
        <div className="fld">
          <label>Total lançado, se souber</label>
          <NumField
            fk={`stay_option|${o.id}|total_eur`}
            value={o.total_eur}
            onCommit={(v: number | null) => patch('stay_option', o.id, 'total_eur', v)}
            className="pv"
            placeholder="total, se souber"
            aria-label="total em euros"
          />
        </div>
        <div className="fld">
          <label>Link do anúncio</label>
          <TextField
            fk={`stay_option|${o.id}|link`}
            value={o.link}
            onCommit={(v: string) => patch('stay_option', o.id, 'link', v)}
            placeholder="cole aqui"
          />
        </div>
      </div>
    </div>
  );
}

function Acrescentar({ city, proximaPos }: { city: string; proximaPos: number }) {
  const { insert } = useApp();
  const nome = useLocal();
  const diaria = useLocal();

  const por = async () => {
    const n = nome.get();
    if (!n) return;
    const r = insert('stay_option', {
      city, name: n, note: '',
      nightly_eur: parseNum(diaria.get()),
      position: proximaPos,
      seed_id: null,
    });
    // So limpa depois de o banco confirmar (secao 8, promessa 3).
    if (!(await r).ok) return;
    nome.limpar();
    diaria.limpar();
  };

  return (
    <div className="addrow three">
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="ex. Chamberí"
        aria-label="nome da opção"
      />
      <input
        ref={(el) => { diaria.ref.current = el; }}
        type="text"
        inputMode="decimal"
        placeholder="quanto custa"
        aria-label="diária em euros"
      />
      <button type="button" onClick={() => void por()}>acrescentar opção</button>
    </div>
  );
}
