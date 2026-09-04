'use client';
// ============================================================
// 10.8 — Caixa. Sub-abas geral / Leo / Lu, e abre na do usuario
// logado (quem sou eu vem do UiProvider).
//
// A secao 7 propunha deixar a Caixa privada e mandava PERGUNTAR
// antes de abrir. Perguntado em 04/09: o Leo escolheu abrir, igual
// ao artefato de hoje (a nota esta em types.ts e no fim de
// supabase/02-politicas.sql). Entao esta tela e o artefato 1:1:
// os dois lancam, o geral mostra as duas colunas, e a barra tem a
// fatia do Leo, a da Lu e a que falta.
//
// Cada um pensa na sua moeda (Leo em R$, Lu em €); o geral converte
// tudo a R$ pelo cambio da aba Custos.
// ============================================================
import { ESTIM_EUR, STAYS, VOO } from '@/content';
import { NumField } from '@/components/Field';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, daysTo, mesLabel, num, plMesV, saveMonths } from '@/lib/fmt';
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
  const ms = saveMonths(s.hoje);   // do mes corrente a dez/26, nunca fixo
  const dep = daysTo('2026-12-10', s.hoje);
  const w: Who | null = selWho === 'leo' ? 'leo' : selWho === 'lu' ? 'lu' : null;

  return (
    <>
      <div className="panelhead">
        <h2>Caixa</h2>
        <p>
          Quanto vocês dois já têm guardado, e quanto falta por mês para chegar em dezembro com
          tudo. São <b>{dep} dias</b> e <b>{ms.length} {ms.length > 1 ? 'meses' : 'mês'}</b> de
          aporte — {mesLabel(ms[0])} a dez 26.
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
            {k === 'geral'
              ? brl(C.cxTotalBrl(s, s.hoje))
              : C.cxMoney(s, C.cxTotal(s, k, s.hoje), k)}
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

  return (
    <>
      <div className="bigsum b5">
        <div>
          <b>{brl(C.cxTotalBrl(s, s.hoje))}</b>
          <span>já acumulado</span>
          <i>Leo + Lu, convertido a R$ {num(s.settings.eur_rate).toLocaleString('pt-BR')}</i>
        </div>
        <div>
          <b>{brl(meta)}</b>
          <span>meta dos dois</span>
          <i>{meta ? `${Math.round(C.cxPct(s, s.hoje))}% alcançado` : 'sem meta ainda'}</i>
        </div>
        <div>
          <b>{brl(C.cxFaltaBrl(s, s.hoje))}</b>
          <span>ainda falta</span>
          <i>{meta ? 'para bater a meta' : 'defina a meta abaixo'}</i>
        </div>
        <div>
          <b>{brl(C.cxMes(s, null, s.hoje))}</b>
          <span>por mês, os dois</span>
          <i>dividido {plMesV(C.mesesVazios(s, null, s.hoje))}</i>
        </div>
        <div>
          <b>{brl(C.totalBrl(s, CIDADES))}</b>
          <span>custo real lançado</span>
          <i>a conta da aba Custos</i>
        </div>
      </div>

      <Barra />

      <div className="card">
        <div className="h">
          <h3>Mês a mês</h3>
          <div className="m">o acumulado é convertido a R$ pelo câmbio da aba Custos</div>
        </div>
        <div className="b">
          <TabelaGeral />
          <p className="mono foot" style={{ marginBottom: 0 }}>
            Cada um lança na sua própria moeda: Leo em {C.cxCur(s, 'leo') === 'eur' ? '€' : 'R$'},
            Lu em {C.cxCur(s, 'lu') === 'eur' ? '€' : 'R$'}. Dá para mudar nas abas Leo e Lu.
          </p>
        </div>
      </div>

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
  const l = C.cxBrl(s, C.cxTotal(s, 'leo', s.hoje), 'leo');
  const u = C.cxBrl(s, C.cxTotal(s, 'lu', s.hoje), 'lu');
  const f = C.cxFaltaBrl(s, s.hoje);
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
        <span>{Math.round(C.cxPct(s, s.hoje))}% da meta</span>
      </div>
    </>
  );
}

/**
 * Mes · Leo · Lu · o mes dos dois · o acumulado dos dois.
 * O acumulado se refaz a cada tecla porque o React recalcula a coluna;
 * o campo e nao-controlado, entao o foco fica onde estava (regra 5.15).
 */
function TabelaGeral() {
  const { s, setAporte } = useApp();
  const ms = saveMonths(s.hoje);
  const ini = C.cxBrl(s, C.cxIni(s, 'leo'), 'leo') + C.cxBrl(s, C.cxIni(s, 'lu'), 'lu');
  let ac = ini;
  return (
    <div className="tw">
      <table className="rot cxt">
        <thead>
          <tr>
            <th>Mês</th>
            <th className="num">Leo</th>
            <th className="num">Lu</th>
            <th className="num hidem">no mês</th>
            <th className="num">acumulado</th>
          </tr>
        </thead>
        <tbody>
          {/* o saldo de hoje some quando e zero (secao 10.8) */}
          <tr hidden={!ini}>
            <td className="sb">saldo de hoje</td>
            <td className="num">—</td>
            <td className="num">—</td>
            <td className="num hidem">—</td>
            <td className="num">{ini ? brl(ini) : '—'}</td>
          </tr>
          {ms.map((ym) => {
            const mes = C.cxMesBrl(s, ym);
            ac += mes;
            const acum = ac;
            return (
              <tr key={ym}>
                <td className="pl2">{mesLabel(ym)}</td>
                <td className="num">
                  <NumField
                    fk={`contribution|leo|${ym}`}
                    value={C.cxAporteRaw(s, ym, 'leo')}
                    onCommit={(v) => setAporte('leo', ym, v)}
                    className="cxv"
                    placeholder="—"
                    aria-label={`aporte do Leo em ${mesLabel(ym)}`}
                  />
                </td>
                <td className="num">
                  <NumField
                    fk={`contribution|lu|${ym}`}
                    value={C.cxAporteRaw(s, ym, 'lu')}
                    onCommit={(v) => setAporte('lu', ym, v)}
                    className="cxv"
                    placeholder="—"
                    aria-label={`aporte da Lu em ${mesLabel(ym)}`}
                  />
                </td>
                <td className="num hidem">{mes ? brl(mes) : '—'}</td>
                <td className="num">{acum ? brl(acum) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>total</td>
            <td className="num">{C.cxMoney(s, C.cxAportes(s, 'leo', s.hoje), 'leo')}</td>
            <td className="num">{C.cxMoney(s, C.cxAportes(s, 'lu', s.hoje), 'lu')}</td>
            <td className="num hidem">—</td>
            <td className="num">{brl(C.cxTotalBrl(s, s.hoje))}</td>
          </tr>
        </tfoot>
      </table>
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
  const total = C.cxTotal(s, w, s.hoje);

  return (
    <>
      <div className="bigsum b5">
        <div>
          <b>{C.cxMoney(s, total, w)}</b>
          <span>{WHO[w]} já tem</span>
          <i>saldo de hoje + aportes</i>
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
          <b>{C.cxMoney(s, C.cxFalta(s, w, s.hoje), w)}</b>
          <span>ainda falta</span>
          <i>{meta ? `em ${cur}` : 'defina a meta'}</i>
        </div>
        <div>
          <b>{C.cxMoney(s, C.cxMes(s, w, s.hoje), w)}</b>
          <span>por mês</span>
          <i>{plMesV(C.mesesVazios(s, w, s.hoje))}</i>
        </div>
        <div>
          <b>{C.cxMoney(s, C.cxAportes(s, w, s.hoje), w)}</b>
          <span>aportado até agora</span>
          <i>sem contar o saldo de hoje</i>
        </div>
      </div>

      <div className="card">
        <div className="h">
          <h3>{WHO[w]}</h3>
          <div className="m">tudo em {cur}</div>
        </div>
        <div className="b">
          <Campos w={w} />
          <TabelaPessoa w={w} />
        </div>
      </div>

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

/** O saldo de hoje, a meta e a moeda. O saldo e separado dos aportes. */
function Campos({ w }: { w: Who }) {
  const { s, patch, now } = useApp();
  const sv = s.savings[w];
  return (
    <div className="frow3">
      <div className="fld">
        <label>já guardado hoje</label>
        <NumField
          fk={`savings|${w}|opening`}
          value={sv?.opening ?? null}
          onCommit={(v) => patch('savings', w, 'opening', v)}
          placeholder="0"
          aria-label={`já guardado hoje, ${WHO[w]}`}
        />
      </div>
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

function TabelaPessoa({ w }: { w: Who }) {
  const { s, setAporte } = useApp();
  const ms = saveMonths(s.hoje);
  const ini = C.cxIni(s, w);
  let ac = ini;
  return (
    <div className="tw">
      <table className="rot cxt">
        <thead>
          <tr>
            <th>Mês</th>
            <th className="num">{WHO[w]}</th>
            <th className="num">acumulado</th>
          </tr>
        </thead>
        <tbody>
          <tr hidden={!ini}>
            <td className="sb">saldo de hoje</td>
            <td className="num">—</td>
            <td className="num">{ini ? C.cxMoney(s, ini, w) : '—'}</td>
          </tr>
          {ms.map((ym) => {
            ac += C.cxAporte(s, ym, w);
            const acum = ac;
            return (
              <tr key={ym}>
                <td className="pl2">{mesLabel(ym)}</td>
                <td className="num">
                  <NumField
                    fk={`contribution|${w}|${ym}`}
                    value={C.cxAporteRaw(s, ym, w)}
                    onCommit={(v) => setAporte(w, ym, v)}
                    className="cxv"
                    placeholder="—"
                    aria-label={`aporte de ${WHO[w]} em ${mesLabel(ym)}`}
                  />
                </td>
                <td className="num">{acum ? C.cxMoney(s, acum, w) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>total</td>
            <td className="num">{C.cxMoney(s, C.cxAportes(s, w, s.hoje), w)}</td>
            <td className="num">{C.cxMoney(s, C.cxTotal(s, w, s.hoje), w)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
