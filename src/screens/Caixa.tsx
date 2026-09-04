'use client';
// ============================================================
// 10.8 — Caixa. Sub-abas geral / Leo / Lu, e abre na do usuario
// logado (quem sou eu vem do UiProvider).
//
// A secao 7 propunha deixar a Caixa privada e mandava PERGUNTAR
// antes de abrir. Perguntado em 04/09: o Leo escolheu abrir, igual
// ao artefato de hoje (a nota esta em types.ts e no fim de
// supabase/02-politicas.sql). Entao os dois lancam e os dois veem.
//
// O que MUDOU em 04/09: a grade fixa set/out/nov/dez saiu. Agora
// cada aporte e uma linha com dia, nome e valor — um extrato, como
// numa corretora — e o acumulado corre ao lado. "Aporte de outubro"
// nao existe mais; existe "R$ 1.500 do 13o salario, em 12 de setembro".
//
// Cada um pensa na sua moeda (Leo em R$, Lu em EUR); o geral converte
// tudo a R$ pelo cambio da aba Custos.
// ============================================================
import { useEffect, useRef } from 'react';
import { ESTIM_EUR, STAYS, VOO } from '@/content';
import { DateField, NumField, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, daysTo, dtLabel, hojeLocal, isData, num, parseNum, plMesAte, stripTags } from '@/lib/fmt';
import type { Who } from '@/lib/types';

const CIDADES = STAYS.map((x) => x.c);
const WHO: Record<Who, string> = { leo: 'Leo', lu: 'Lu' };
const SUB: ReadonlyArray<readonly ['geral' | Who, string]> = [
  ['geral', 'Geral'],
  ['leo', 'Leo'],
  ['lu', 'Lu'],
];

export default function Caixa() {
  const { s } = useApp();
  const { selWho } = useUi();
  const meses = C.mesesAte(s.hoje);   // do mes corrente a dez/26, nunca fixo
  const dep = daysTo('2026-12-10', s.hoje);
  const w: Who | null = selWho === 'leo' ? 'leo' : selWho === 'lu' ? 'lu' : null;

  return (
    <>
      <div className="panelhead">
        <h2>Caixa</h2>
        <p>
          Quanto vocês dois já guardaram, e quanto falta por mês para chegar em dezembro com
          tudo. São <b>{dep} dias</b> até embarcar e <b>{meses} {meses > 1 ? 'meses' : 'mês'}</b>{' '}
          para guardar. Cada entrada de dinheiro é um aporte, com o dia e de onde veio.
        </p>
      </div>

      <Subabas />

      {w ? <Pessoa w={w} /> : <Geral />}
    </>
  );
}

/** As tres sub-abas, cada uma com o total de quem ela mostra. */
function Subabas() {
  const { s } = useApp();
  const { selWho, setSelWho } = useUi();
  return (
    <div className="subtabs">
      {SUB.map(([k, rotulo]) => (
        <button key={k} className="chip" aria-pressed={selWho === k} onClick={() => setSelWho(k)}>
          {rotulo}
          <span className="cn">
            {k === 'geral' ? brl(C.cxTotalBrl(s)) : C.cxMoney(s, C.cxTotal(s, k), k)}
          </span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// geral: os dois somados, em R$
// ------------------------------------------------------------
function Geral() {
  const { s } = useApp();
  const meta = C.cxMetaBrl(s);
  const rt = C.rate(s);
  const n = C.cxConta(s, null);

  return (
    <>
      <div className="bigsum b5">
        <div>
          <b>{brl(C.cxTotalBrl(s))}</b>
          <span>já acumulado</span>
          <i>
            {n
              ? `${n} ${n > 1 ? 'aportes' : 'aporte'}, convertidos a R$ ${num(s.settings.eur_rate).toLocaleString('pt-BR')}`
              : 'nenhum aporte ainda'}
          </i>
        </div>
        <div>
          <b>{brl(meta)}</b>
          <span>meta dos dois</span>
          <i>{meta ? `${Math.round(C.cxPct(s))}% alcançado` : 'sem meta ainda'}</i>
        </div>
        <div>
          <b>{brl(C.cxFaltaBrl(s))}</b>
          <span>ainda falta</span>
          <i>{meta ? 'para bater a meta' : 'defina a meta abaixo'}</i>
        </div>
        <div>
          <b>{brl(C.cxMes(s, null, s.hoje))}</b>
          <span>por mês, os dois</span>
          <i>dividido {plMesAte(C.mesesAte(s.hoje))}</i>
        </div>
        <div>
          <b>{brl(C.totalBrl(s, CIDADES))}</b>
          <span>custo real lançado</span>
          <i>a conta da aba Custos</i>
        </div>
      </div>

      <Barra />

      <Aportes w={null} />

      <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
        <div className="h">
          <h3>Onde as metas se ancoram</h3>
          <div className="m">minha estimativa · não entra em nenhuma soma</div>
        </div>
        <div className="b">
          <p>
            Pelo seu perfil — hospedagem afastada e dividida, trem sempre o mais barato, &quot;um
            ou outro&quot; passeio — a <b>sua parte</b> da viagem fecha em{' '}
            <b>€ {ESTIM_EUR.toLocaleString('pt-BR')}, uns {brl(ESTIM_EUR * rt)}</b>, já fora o voo
            internacional que está pago.
          </p>
          <p>
            O que você já lançou de verdade nas outras abas soma{' '}
            <b>{brl(C.totalBrl(s, CIDADES) - VOO)}</b> além do voo. A meta de cada um é decisão de
            vocês — os botões abaixo só preenchem o campo.
          </p>
          <Botoes />
        </div>
      </div>
    </>
  );
}

/** A barra: a fatia do Leo, a da Lu, e o que falta. Sem meta, nao existe. */
function Barra() {
  const { s } = useApp();
  if (C.cxMetaBrl(s) <= 0) return null;
  const l = C.cxBrl(s, C.cxTotal(s, 'leo'), 'leo');
  const u = C.cxBrl(s, C.cxTotal(s, 'lu'), 'lu');
  const f = C.cxFaltaBrl(s);
  const t = l + u + f;
  const larg = (v: number) => ((v / t) * 100).toFixed(2) + '%';
  return (
    <>
      <div className="bar">
        {l > 0 ? <div style={{ width: larg(l), background: 'var(--pine)' }}>Leo</div> : null}
        {u > 0 ? <div style={{ width: larg(u), background: 'var(--c-it)' }}>Lu</div> : null}
        {f > 0 ? (
          <div style={{ width: larg(f), background: 'var(--surface-2)', color: 'var(--muted)' }}>
            falta
          </div>
        ) : null}
      </div>
      <div className="key">
        <span><i style={{ background: 'var(--pine)' }} />Leo {brl(l)}</span>
        <span><i style={{ background: 'var(--c-it)' }} />Lu {brl(u)}</span>
        <span><i style={{ background: 'var(--surface-2)' }} />falta {brl(f)}</span>
        <span>{Math.round(C.cxPct(s))}% da meta</span>
      </div>
    </>
  );
}

// ------------------------------------------------------------
// O extrato. E o MESMO componente nas tres sub-abas: no geral
// (w = null) ganha a coluna "quem" e soma em R$; na de uma pessoa
// mostra so os dela, na moeda dela.
// ------------------------------------------------------------
function Aportes({ w }: { w: Who | null }) {
  const { s, patch, now, remove } = useApp();
  const lista = C.cxLista(s, w);           // do mais velho para o mais novo

  // O acumulado corre na ordem do tempo; a tela mostra ao contrario,
  // igual a um extrato. Por isso a conta vem antes do reverse().
  const acum = new Map<string, number>();
  let ac = 0;
  for (const c of lista) {
    ac += w ? num(c.amount) : C.cxBrlDe(s, c);
    acum.set(c.id, ac);
  }
  const linhas = lista.slice().reverse();
  const cur = (q: Who) => (C.cxCur(s, q) === 'eur' ? '€' : 'R$');

  return (
    <div className="card">
      <div className="h">
        <h3>{w ? `Aportes de ${WHO[w]}` : 'Aportes'}</h3>
        <div className="m">
          {w
            ? `tudo em ${cur(w)} · do mais recente para o mais antigo`
            : 'os dois, do mais recente para o mais antigo · o acumulado é convertido a R$ pelo câmbio da aba Custos'}
        </div>
      </div>
      <div className="b">
        {!linhas.length ? (
          <div className="empty">
            Nenhum aporte ainda. Cada vez que sobrar dinheiro, lance aqui embaixo — com o dia e
            de onde veio.
          </div>
        ) : (
          <div className="mt">
            {linhas.map((c) => (
              <div key={c.id} className={'mrow ap' + (w ? '' : ' apg')}>
                <DateField
                  fk={`contribution|${c.id}|on_date`}
                  value={c.on_date}
                  onCommit={(v) => patch('contribution', c.id, 'on_date', v)}
                  className="dv"
                  aria-label="dia do aporte"
                />
                <TextField
                  fk={`contribution|${c.id}|label`}
                  value={c.label}
                  onCommit={(v) => patch('contribution', c.id, 'label', v)}
                  className="nv"
                  placeholder="de onde veio"
                  aria-label="de onde veio"
                />
                {w ? null : (
                  <select
                    className="qv"
                    value={c.who}
                    onChange={(e) => now('contribution', c.id, 'who', e.currentTarget.value)}
                    aria-label="de quem é o aporte"
                  >
                    <option value="leo">Leo</option>
                    <option value="lu">Lu</option>
                  </select>
                )}
                <span className="pw">
                  <i>{cur(c.who)}</i>
                  <NumField
                    fk={`contribution|${c.id}|amount`}
                    value={c.amount}
                    onCommit={(v) => patch('contribution', c.id, 'amount', v)}
                    className="pv"
                    placeholder="valor"
                    aria-label="valor do aporte"
                  />
                </span>
                <span className="acv" title="acumulado até este aporte">
                  {w
                    ? C.cxMoney(s, acum.get(c.id) ?? 0, w)
                    : brl(acum.get(c.id) ?? 0)}
                </span>
                <button
                  type="button"
                  className="xb"
                  aria-label="tirar aporte"
                  onClick={() => void remove('contribution', c.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Aportar w={w} />

        <p className="mono foot" style={{ marginBottom: 0 }}>
          {w
            ? `${WHO[w]} lança em ${cur(w)}. Dá para mudar a moeda logo acima.`
            : `Cada um lança na sua própria moeda: Leo em ${cur('leo')}, Lu em ${cur('lu')}. Dá para mudar nas abas Leo e Lu.`}
        </p>
      </div>
    </div>
  );
}

/**
 * O formulario de aportar: campo local, nada vai ao banco antes do botao.
 * O dia ja vem preenchido com hoje — e o caso comum.
 */
function Aportar({ w }: { w: Who | null }) {
  const { s, me, insert } = useApp();
  const dia = useRef<HTMLInputElement>(null);
  const nome = useLocal();
  const valor = useLocal();
  const quem = useRef<HTMLSelectElement>(null);
  const padrao: Who = w ?? (me?.who === 'lu' ? 'lu' : 'leo');

  /**
   * s.hoje e a data do SERVIDOR (UTC na Vercel), e serve para contar meses
   * sem quebrar a hidratacao. Como data de um lancamento ela mente: as 22h
   * no Brasil o servidor ja acha que e amanha. Depois de montar, o campo
   * passa a mostrar o dia de quem esta olhando (achado da revisao de 04/09).
   */
  useEffect(() => {
    if (dia.current && dia.current.value === s.hoje) dia.current.value = hojeLocal();
  }, [s.hoje]);

  const aportar = () => {
    const v = parseNum(valor.get());
    if (v === null || v <= 0) { valor.ref.current?.focus(); return; }
    const d = dia.current?.value ?? '';
    const who: Who = w ?? (quem.current?.value === 'lu' ? 'lu' : 'leo');
    void insert('contribution', {
      who,
      on_date: isData(d) ? d : hojeLocal(),
      label: stripTags(nome.get()),
      amount: v,
    });
    nome.limpar();
    valor.limpar();
    if (dia.current) dia.current.value = hojeLocal();
    if (quem.current) quem.current.value = padrao;
  };

  return (
    <div className={'addrow ap' + (w ? '' : ' apg')}>
      <input ref={dia} type="date" defaultValue={s.hoje} aria-label="dia do aporte" />
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="de onde veio (ex. 13º salário)"
        aria-label="de onde veio"
      />
      {w ? null : (
        <select ref={quem} defaultValue={padrao} aria-label="de quem é o aporte">
          <option value="leo">Leo</option>
          <option value="lu">Lu</option>
        </select>
      )}
      <input
        ref={(el) => { valor.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="valor"
        aria-label="valor do aporte"
      />
      <button type="button" onClick={aportar}>aportar</button>
    </div>
  );
}

/** Os botoes SO preenchem o campo da meta — a meta e decisao deles. */
function Botoes() {
  const { s, now } = useApp();
  return (
    <div className="addrow fit">
      <button onClick={() => now('savings', 'leo', 'goal', C.estimNaMoeda(s, 'leo'))}>
        pôr {brl(ESTIM_EUR * C.rate(s))} na meta do Leo
      </button>
      <button onClick={() => now('savings', 'lu', 'goal', C.estimNaMoeda(s, 'lu'))}>
        pôr a mesma na meta da Lu
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// a sub-aba de uma pessoa: tudo na moeda dela
// ------------------------------------------------------------
function Pessoa({ w }: { w: Who }) {
  const { s } = useApp();
  const cur = C.cxCur(s, w) === 'eur' ? '€' : 'R$';
  const meta = C.cxMeta(s, w);
  const total = C.cxTotal(s, w);
  const n = C.cxConta(s, w);
  const ult = C.cxUltimo(s, w);

  return (
    <>
      <div className="bigsum b5">
        <div>
          <b>{C.cxMoney(s, total, w)}</b>
          <span>{WHO[w]} já tem</span>
          <i>{n ? `somando ${n} ${n > 1 ? 'aportes' : 'aporte'}` : 'nenhum aporte ainda'}</i>
        </div>
        <div>
          <b>{C.cxMoney(s, meta, w)}</b>
          <span>meta</span>
          <i>
            {meta
              ? `${Math.round(Math.min(100, (total / meta) * 100))}% alcançado`
              : 'sem meta ainda'}
          </i>
        </div>
        <div>
          <b>{C.cxMoney(s, C.cxFalta(s, w), w)}</b>
          <span>ainda falta</span>
          <i>{meta ? `em ${cur}` : 'defina a meta'}</i>
        </div>
        <div>
          <b>{C.cxMoney(s, C.cxMes(s, w, s.hoje), w)}</b>
          <span>por mês</span>
          <i>{plMesAte(C.mesesAte(s.hoje))}</i>
        </div>
        <div>
          {/* aporte ainda sem valor mostra '—', nao 'R$ 0' (regra 10.0) */}
          <b>{ult && ult.amount !== null ? C.cxMoney(s, num(ult.amount), w) : '—'}</b>
          <span>último aporte</span>
          <i>
            {!ult
              ? 'nada lançado'
              : ult.amount === null
                ? `${dtLabel(ult.on_date)} · ainda sem valor`
                : dtLabel(ult.on_date) + (ult.label ? ` · ${ult.label}` : '')}
          </i>
        </div>
      </div>

      <div className="card">
        <div className="h">
          <h3>{WHO[w]}</h3>
          <div className="m">a meta e a moeda em que {WHO[w]} pensa</div>
        </div>
        <div className="b">
          <Campos w={w} />
        </div>
      </div>

      <Aportes w={w} />

      {w === 'lu' ? (
        <div className="n free" style={{ maxWidth: 'none' }}>
          <b>a Lu ganha em euro</b>
          Como au pair no Luxemburgo o salário dela já é em €, então ela guarda em € e não perde
          nada no câmbio. O geral converte a R$ pelo câmbio da aba Custos só para somar com você.
        </div>
      ) : null}
    </>
  );
}

/** A meta e a moeda. O que ja esta guardado hoje e o primeiro aporte da lista. */
function Campos({ w }: { w: Who }) {
  const { s, patch, now } = useApp();
  const sv = s.savings[w];
  return (
    <div className="frow">
      <div className="fld">
        <label>meta de {WHO[w]}</label>
        <NumField
          fk={`savings|${w}|goal`}
          value={sv?.goal ?? null}
          onCommit={(v) => patch('savings', w, 'goal', v)}
          placeholder="0"
          aria-label={`meta de ${WHO[w]}`}
        />
      </div>
      <div className="fld">
        <label>moeda</label>
        {/* select e escrita imediata: nao passa pelo debounce */}
        <select
          value={C.cxCur(s, w)}
          onChange={(e) => now('savings', w, 'currency', e.currentTarget.value)}
          aria-label={`moeda de ${WHO[w]}`}
        >
          <option value="brl">R$ reais</option>
          <option value="eur">€ euros</option>
        </select>
      </div>
    </div>
  );
}
