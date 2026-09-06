'use client';
// ============================================================
// 10.2 — Roteiro. O coracao do app, e a tela mais complexa.
// Tres partes, na ordem em que o artefato as monta (viewRoteiro):
//   (a) o calendario de dois meses, sempre visivel;
//   (b) sem dia selecionado, os blocos de dias com a mesma base;
//   (c) com um dia selecionado, o editor de QUATRO cartoes.
// ============================================================
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AKE, CO, FK, FKCLS, FKE, ISOS, ST, STCLS, TK, TKE, TKPL, coOf,
} from '@/content';
import { AreaField, Inline, TextField } from '@/components/Field';
import Avisos from '@/components/Avisos';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, longDt, marcado, num, shortDt, wdOf } from '@/lib/fmt';
import type { Attraction, Food, Leg, Snapshot } from '@/lib/types';

// Os rotulos como Record<string,string>: a chave vem do banco (palavra
// inteira) e nem sempre esta no tipo estreito de `as const`.
const TKROT: Record<string, string> = TK;
const FKROT: Record<string, string> = FK;
/**
 * A ORIGEM da linha, nao mais a situacao (05/09).
 *
 * Ate 05/09 isto imprimia a palavra do `status` cru — e a lista "por neste
 * dia" e, por definicao, so de itens SEM dia: ela escrevia "escolhida" em
 * 14 atracoes exatamente enquanto a regra nova as declarava fora do
 * roteiro. Agora so distingue o que e dele do que eu pesquisei.
 */
const ORIGEM = (a: Attraction) => (C.ehPesquisa(a) ? 'sugestão minha' : 'sua lista');
const ORIGCLS = (a: Attraction) => (C.ehPesquisa(a) ? 'sug' : 'bac');
const TKS = Object.keys(TK);

const WDS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/**
 * O aviso de um dia. Desde 05/09 ele vem do BANCO, nao do arquivo: e
 * dele, edita e apaga. O calendario e o cartao do dia mostram so o
 * primeiro, que e o que cabe; a tela do dia mostra todos.
 */
const avisoDe = (s: Snapshot, iso: string) => C.avisosDe(s, `roteiro:${iso}`)[0];
/**
 * O que aparece no calendario e na linha do bloco SEM ele clicar no dia
 * (Fase 4, 05/09). Eram os dois unicos lugares assim, e o Leo pediu o dia
 * limpo — mas so os `alert` podem arruinar um dia se ele nao os vir NAQUELE
 * dia: o transporte de Luxemburgo parando as 20h no 24, a perna mais cara
 * no 29, a Epifania no 6. Dia limpo e dia sem triangulo e sem etiqueta de
 * dica; nao e dia sem alerta. O resto virou a aba Dicas.
 */
const alertaDe = (s: Snapshot, iso: string) => {
  const av = avisoDe(s, iso);
  return av && av.tone === 'alert' ? av : undefined;
};
// Cidade aqui passa SEMPRE por `C.temCidade`/`C.nomeCidade`/`C.ccCidade`,
// nunca por `CT[k]` cru: a `CT` so conhece as 11 fixas, e uma cidade criada
// por ele derrubava esta tela inteira (05/09).

export default function Roteiro() {
  const { s } = useApp();
  const { selDay, irParaDia } = useUi();

  const bl = C.blocks(s);
  const fd = C.filledDays(s);
  const idx = selDay ? ISOS.indexOf(selDay) : -1;

  const comeu = C.foodPlaced(s);
  const trPl = C.legPlaced(s);

  // Os dias que nao cairam em nenhum bloco: base em branco.
  const inBlock = new Set<string>();
  for (const b of bl) {
    for (let j = ISOS.indexOf(b.from); j <= ISOS.indexOf(b.to); j++) inBlock.add(ISOS[j]);
  }
  const loose = ISOS.filter((i) => !inBlock.has(i));
  const tn = bl.reduce((a, b) => a + b.n, 0);

  return (
    <>
      <div className="panelhead">
        <h2>Roteiro</h2>
        <p>
          <b>Os dias estão em branco de propósito</b> — as bases estão postas, o que fazer é
          você que escreve. Clique numa data: dá para escrever livre, marcar as atrações da
          cidade, o trem ou voo do dia e onde comer. Onde tem um fato duro (o corte das 20h do
          dia 24, as janelas grátis do Palacio Real) eu deixei um aviso.
        </p>
      </div>

      <div className="cal">
        <Mes y={2026} m={11} label="dezembro 2026" />
        <Mes y={2027} m={0} label="janeiro 2027" />
      </div>

      <div className="calleg">
        <span><i /> dia com plano</span>
        <span><i className="nt" /> tem aviso meu</span>
        <span>{fd} de {ISOS.length} planejados</span>
        <span>{C.nightsAll(s)} noites em {C.baseList(s).length} bases</span>
        <span>{C.flyDays(s)} dias só de voo</span>
        <span>{C.attrPlaced(s)} de {C.attrCount(s)} atrações com dia</span>
        {comeu ? (
          <span>
            {comeu} lugar{comeu > 1 ? 'es' : ''} de comer marcado{comeu > 1 ? 's' : ''}
          </span>
        ) : null}
        {trPl ? (
          <span>{trPl} trecho{trPl > 1 ? 's' : ''} de transporte com dia</span>
        ) : null}
      </div>

      <div className="emoleg">
        <span>{TKE.trem} trem</span>
        <span>{TKE.aviao} voo</span>
        <span>{TKE.onibus} ônibus</span>
        <span>{TKE.carro} carro</span>
        <span>{AKE.passeio} passeio pela rua</span>
        <span>{AKE.tour} tour num lugar</span>
        <span>{FKE.restaurante} restaurante</span>
        <span>{FKE.cafe} café</span>
      </div>

      <div className="chips" style={{ marginTop: 20 }}>
        {idx > 0 ? (
          <button className="chip" onClick={() => irParaDia(ISOS[idx - 1])}>
            ← {shortDt(ISOS[idx - 1])}
          </button>
        ) : null}
        <button
          className="chip"
          aria-pressed={selDay ? undefined : true}
          onClick={() => irParaDia(null)}
        >
          ver o roteiro inteiro
        </button>
        {idx >= 0 && idx < ISOS.length - 1 ? (
          <button className="chip" onClick={() => irParaDia(ISOS[idx + 1])}>
            {shortDt(ISOS[idx + 1])} →
          </button>
        ) : null}
      </div>

      {selDay ? (
        <Editor iso={selDay} />
      ) : !bl.length && !loose.length ? (
        <div className="empty">Nada no calendário.</div>
      ) : (
        <>
          {bl.map((bk) => (
            <div key={`${bk.base}-${bk.from}`} className="card">
              <div className="h">
                <h3>{bk.base}</h3>
                <div className="m">
                  {shortDt(bk.from)} → {shortDt(bk.to)} · {bk.n}{bk.n > 1 ? ' dias' : ' dia'} ·
                  {' '}clique num dia para editar
                </div>
              </div>
              <div className="b">
                {ISOS.slice(ISOS.indexOf(bk.from), ISOS.indexOf(bk.to) + 1).map((iso) => (
                  <DiaLinha key={iso} iso={iso} />
                ))}
              </div>
            </div>
          ))}

          {loose.length ? (
            <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
              <div className="h">
                <h3>Dias sem base</h3>
                <div className="m">
                  {loose.length} de {ISOS.length} · escreva onde você dorme e eles entram num
                  bloco
                </div>
              </div>
              <div className="b">
                {loose.map((iso) => <DiaLinha key={iso} iso={iso} />)}
              </div>
            </div>
          ) : null}

          <div className="atsum">
            {bl.length}{bl.length === 1 ? ' bloco' : ' blocos'} · <b>{tn} dias</b> com base de{' '}
            {ISOS.length}{loose.length ? ` · ${loose.length} ainda sem base` : ''}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// (a) o calendario. A semana comeca na SEGUNDA: lead=(getDay()+6)%7.
// Nao use `new Date()` aqui — as duas datas sao fixas, e por isso o
// mes sai igual no servidor e no cliente.
// ============================================================
function Mes({ y, m, label }: { y: number; m: number; label: string }) {
  const { s } = useApp();
  const { selDay, irParaDia } = useUi();

  const dim = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;

  const cels: ReactNode[] = [];
  for (let i = 0; i < lead; i++) cels.push(<div key={`lead-${i}`} className="cd off" />);
  for (let d = 1; d <= dim; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (ISOS.indexOf(iso) < 0) {
      cels.push(<div key={iso} className="cd off">{d}</div>);
      continue;
    }
    const av = alertaDe(s, iso);
    cels.push(
      <div
        key={iso}
        className={`cd trip${selDay === iso ? ' sel' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => irParaDia(iso)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irParaDia(iso); }
        }}
      >
        {d}
        {C.hasPlan(s, iso) ? <span className="pip" /> : null}
        {av ? <span className={`nt nt-${av.tone}`} /> : null}
      </div>,
    );
  }

  return (
    <div className="mo">
      <h4>{label}</h4>
      <div className="grid7">
        {WDS.map((w) => <div key={w} className="wd">{w}</div>)}
        {cels}
      </div>
    </div>
  );
}

// ============================================================
// (b) a linha de um dia dentro do bloco.
// ============================================================
function DiaLinha({ iso }: { iso: string }) {
  const { s } = useApp();
  const { irParaDia } = useUi();
  const d = s.days[iso];
  const base = (d?.base ?? '').trim();
  const plano = (d?.plan ?? '').trim();
  const av = alertaDe(s, iso);

  return (
    <div
      className={`day${C.hasPlan(s, iso) ? '' : ' day--move'} day--pick`}
      role="button"
      tabIndex={0}
      onClick={() => irParaDia(iso)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irParaDia(iso); }
      }}
    >
      <div className="dt"><b>{shortDt(iso)}</b><i>{wdOf(iso)}</i></div>
      <div>
        {base ? null : <h4>— sem base</h4>}
        {plano
          ? <p>{d?.plan}</p>
          : <p style={{ color: 'var(--muted)' }}>clique para escrever</p>}
        <DiaTags iso={iso} />
        {av ? (
          <div className="ntags"><span className={`ntg nt-${av.tone}`}>{av.title}</span></div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * O que esta marcado no dia, em linha e nesta ordem: transporte,
 * atracoes, comida. O emoji diz o que e cada coisa (secao 13.5).
 */
function DiaTags({ iso }: { iso: string }) {
  const { s } = useApp();
  const a = C.attrsOfDay(s, iso);
  const f = C.foodsOfDay(s, iso);
  const tr = C.legsOfDay(s, iso);
  if (!a.length && !f.length && !tr.length) return null;

  const tot = C.dayAttrTotal(s, iso) + C.dayLegEur(s, iso);

  return (
    <div className="dtags">
      {tr.map((t) => {
        const v = num(t.amount);
        return (
          <span key={t.id} className={`dtg tk-${t.kind}${t.bought ? ' pgo' : ''}`}>
            {TKE[t.kind]} {t.name}
            {v ? <> <b>{t.currency === 'brl' ? brl(v) : eur(v)}</b></> : null}
          </span>
        );
      })}
      {a.map((it) => {
        const pr = num(it.price_eur);
        // dentro do dia toda linha esta no roteiro, por definicao
        return (
          <span key={it.id} className="dtg st-esc">
            {AKE[it.kind]} {it.name}
            {pr ? <> <b>{eur(pr)}</b></> : null}
          </span>
        );
      })}
      {f.map((it) => (
        <span key={it.id} className={`dtg fk-${FKCLS[it.kind]}`}>
          {FKE[it.kind]} {it.name}
        </span>
      ))}
      {tot ? <span className="dtg tot">{eur(tot)} no dia</span> : null}
    </div>
  );
}

// ============================================================
// (c) o editor: quatro cartoes, nesta ordem.
// ============================================================
function Editor({ iso }: { iso: string }) {
  return (
    <>
      <CartaoDia iso={iso} />
      {/* a chave por dia e de proposito: "vou usar transporte neste dia?" e uma
          pergunta por DIA, entao a resposta nao pode vazar para o dia seguinte */}
      <CartaoTransporte key={iso} iso={iso} />
      <CartaoAtracoes iso={iso} />
      <CartaoComidas iso={iso} />
    </>
  );
}

/** 1. "O dia" (--pine). */
function CartaoDia({ iso }: { iso: string }) {
  const { s, patch, now } = useApp();
  const d = s.days[iso];
  const av = avisoDe(s, iso);

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>{longDt(iso)}</h3>
        <div className="m">{wdOf(iso)} · dia {ISOS.indexOf(iso) + 1} de {ISOS.length}</div>
      </div>
      <div className="b">
        {/* O aviso do dia virou dele em 05/09: edita, apaga, e pode ter mais de um. */}
        <Avisos spot={`roteiro:${iso}`} rotulo="aviso do dia" />

        <div className="form">
          <div className="fld">
            <label>Onde eu durmo / qual é a base</label>
            <TextField
              fk={`day|${iso}|base`}
              value={d?.base ?? ''}
              onCommit={(v) => patch('day', iso, 'base', v)}
              placeholder="ex. Madrid"
              aria-label="onde eu durmo neste dia"
            />
          </div>
          <div className="fld">
            <label>O que fazer neste dia — suas palavras</label>
            <AreaField
              fk={`day|${iso}|plan`}
              value={d?.plan ?? ''}
              onCommit={(v) => patch('day', iso, 'plan', v)}
              placeholder="escreva livre, ou só marque as atrações abaixo e deixe isto em branco"
              aria-label="o que fazer neste dia"
            />
          </div>
        </div>

        {/* Apaga SO o texto dele. A base e o roteiro fechado e fica. */}
        <div className="addrow one">
          <button onClick={() => now('day', iso, 'plan', '')}>apagar o meu texto</button>
        </div>
      </div>
    </div>
  );
}

/** 2. "Como eu me movo neste dia" (--c-fr). */
function CartaoTransporte({ iso }: { iso: string }) {
  const { s, now } = useApp();
  const { selTPick, setSelTPick } = useUi();
  /**
   * O liga/desliga que ele pediu em 06/09: "deve ter um on/off assim: vou
   * usar transporte esse dia? Se eu ativar, abre a seleção e eu coloco qual
   * transporte vou usar".
   *
   * Comeca LIGADO se o dia ja tem trecho marcado — nesse caso ele ja
   * respondeu que sim, e esconder a selecao seria esconder o unico jeito de
   * marcar o segundo trecho do mesmo dia (o 16 tem carro e voo).
   */
  const [usaTransporte, setUsaTransporte] = useState(C.legsOfDay(s, iso).length > 0);

  const pk = selTPick && TKROT[selTPick] ? selTPick : 'trem';
  const mine = C.legsOfDay(s, iso);
  const te = C.dayLegEur(s, iso);
  const tb = C.dayLegBrl(s, iso);
  const mt = te || tb
    ? (te ? eur(te) : '') + (te && tb ? ' + ' : '') + (tb ? brl(tb) : '')
    : 'nada lançado';

  // Trecho que ja esta em OUTRO dia nao aparece na lista: sai so a contagem.
  const livres: Leg[] = [];
  let other = 0;
  for (const t of C.legsOfKind(s, pk)) {
    if (t.day_iso === iso) continue;
    if (t.day_iso) { other++; continue; }
    livres.push(t);
  }

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--c-fr)' }}>
      <div className="h">
        <h3>Como eu me movo neste dia</h3>
        <div className="m">
          {mine.length}{mine.length === 1 ? ' trecho marcado' : ' trechos marcados'} · {mt}
        </div>
      </div>
      <div className="b">
        {!mine.length ? (
          <div className="empty">
            Nenhum trecho neste dia. Se você pega trem, metrô ou voo, ligue a chave
            abaixo.
          </div>
        ) : (
          <div className="at">
            {mine.map((t) => {
              const v = num(t.amount);
              return (
                <div key={t.id} className={`atr pkd${v ? '' : ' free'}`}>
                  <div className="nm">{TKE[t.kind]} {t.name}</div>
                  <div className="vl">
                    {v ? (t.currency === 'brl' ? brl(v) : eur(v)) : 'sem valor'}
                  </div>
                  <button
                    className="xb"
                    title="tirar deste dia"
                    aria-label="tirar deste dia"
                    onClick={() => now('leg', t.id, 'day_iso', null)}
                  >
                    ×
                  </button>
                  <div className="wh">
                    <span className={`stg tkc-${t.kind}`}>{TKROT[t.kind]}</span> ·{' '}
                    {t.bought ? <b>comprado</b> : 'ainda não comprado'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          className="liga"
          role="switch"
          aria-checked={usaTransporte}
          onClick={() => setUsaTransporte((v) => !v)}
        >
          <span className="lbl">vou usar transporte neste dia?</span>
          <i className="sw" aria-hidden="true" />
        </button>

        {!usaTransporte ? null : (
        <>
        <div className="sechead">pôr neste dia</div>
        <div className="subtabs">
          {TKS.map((x) => {
            const fn = C.legsOfKind(s, x).filter((t) => !t.day_iso).length;
            return (
              <button
                key={x}
                className="chip"
                aria-pressed={pk === x}
                style={{ ['--cc' as string]: 'var(--c-fr)' }}
                onClick={() => setSelTPick(x)}
              >
                {TKE[x]} {TKPL[x]}<span className="cn">{fn}</span>
              </button>
            );
          })}
        </div>

        <div>
          {!livres.length ? (
            <div className="empty">
              {other
                ? `Todo ${TKROT[pk]} da lista já está em algum dia.`
                : <>Nenhum {TKROT[pk]} na lista ainda — a aba <b>Transporte</b> é onde isso entra.</>}
            </div>
          ) : (
            <>
              {livres.map((t) => {
                const v = num(t.amount);
                return (
                  <div key={t.id} className="sgr">
                    <div className="nm">
                      {TKE[pk]} {t.name}
                      {t.bought ? <> <span className={`stg tkc-${pk}`}>comprado</span></> : null}
                    </div>
                    <div className="vl">
                      {v ? (t.currency === 'brl' ? brl(v) : eur(v)) : '—'}
                    </div>
                    <button
                      className="plus"
                      title="pôr neste dia"
                      aria-label="pôr neste dia"
                      onClick={() => now('leg', t.id, 'day_iso', iso)}
                    >
                      +
                    </button>
                    {t.note ? <Inline html={marcado(t.note)} className="wh" /> : null}
                  </div>
                );
              })}
              {other ? (
                <p className="mono foot" style={{ margin: '12px 0 0' }}>
                  {other}{other > 1 ? ' já estão' : ' já está'} em outro dia.
                </p>
              ) : null}
            </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

/** 3. "Atrações deste dia" (--ochre). A cidade da base vem pre-selecionada. */
function CartaoAtracoes({ iso }: { iso: string }) {
  const { s, now, nowMany } = useApp();
  const { selPick, setSelPick } = useUi();

  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const pk = selPick && C.temCidade(s, selPick) ? selPick : bk;
  const mine = C.attrsOfDay(s, iso);
  const tot = C.dayAttrTotal(s, iso);
  const cs = C.pickCities(s, bk);

  const livres: Attraction[] = [];
  let other = 0;
  if (pk) {
    // A lista dele primeiro, a pesquisa depois — a mesma separacao que a aba
    // Atracoes passou a fazer. Separar so la deixaria misturado justamente na
    // tela onde o dinheiro nasce.
    for (const it of [...C.attrsDele(s, pk), ...C.attrsPesquisa(s, pk)]) {
      if (it.day_iso === iso) continue;
      if (it.day_iso) { other++; continue; }
      livres.push(it);
    }
  }

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Atrações deste dia</h3>
        <div className="m">
          {mine.length}{mine.length === 1 ? ' marcada' : ' marcadas'}
          {tot ? ` · ${eur(tot)} · ${brl(tot * C.rate(s))}` : ' · nada a pagar'}
        </div>
      </div>
      <div className="b">
        {!mine.length ? (
          <div className="empty">Nada marcado para este dia ainda. Escolha abaixo.</div>
        ) : (
          <div className="at">
            {mine.map((it) => {
              const pr = num(it.price_eur);
              return (
                <div key={it.id} className={`atr pkd${pr ? '' : ' free'}`}>
                  <div className="nm">{AKE[it.kind]} {it.name}</div>
                  <div className="vl">{pr ? eur(pr) : 'grátis'}</div>
                  {/* Tirar do dia NAO desfaz a escolha (regra 5.3). */}
                  <button
                    className="xb"
                    title="tirar deste dia"
                    aria-label="tirar deste dia"
                    onClick={() => now('attraction', it.id, 'day_iso', null)}
                  >
                    ×
                  </button>
                  <div className="wh">
                    {C.nomeCidade(s, it.city)} ·{' '}
                    <span className={`stg st-${ORIGCLS(it)}`}>{ORIGEM(it)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!bk && !pk ? (
          <div className="n warn" style={{ maxWidth: 'none', marginTop: 18 }}>
            <b>escreva a base primeiro</b>
            Ponha no campo de cima em que cidade você dorme neste dia — <b>Lisboa</b>,{' '}
            <b>Metz</b>, <b>Roma</b>… — e eu abro aqui a lista de atrações dela. Ou escolha a
            cidade na mão abaixo.
          </div>
        ) : null}

        <div className="sechead">pôr neste dia</div>
        <div className="subtabs">
          {cs.map((c) => (
            <button
              key={c}
              className="chip"
              aria-pressed={c === pk}
              style={{ ['--cc' as string]: `var(${C.ccCidade(s, c)})` }}
              onClick={() => setSelPick(c)}
            >
              {C.nomeCidade(s, c)}<span className="cn">{C.freeCount(s, c)}</span>
            </button>
          ))}
        </div>

        <div>
          {pk ? (
            !livres.length ? (
              <div className="empty">
                {other
                  ? `Tudo de ${C.nomeCidade(s, pk)} já está em algum dia.`
                  : `Nada na lista de ${C.nomeCidade(s, pk)} ainda — a aba Atrações é onde isso entra.`}
              </div>
            ) : (
              <>
                {livres.map((it) => {
                  const pr = num(it.price_eur);
                  return (
                    <div key={it.id} className="sgr">
                      <div className="nm">
                        {AKE[it.kind]} {it.name}{' '}
                        <span className={`stg st-${ORIGCLS(it)}`}>{ORIGEM(it)}</span>
                      </div>
                      <div className="vl">{pr ? eur(pr) : 'grátis'}</div>
                      {/* Por num dia E escolher, numa escrita so (regra 5.3). */}
                      <button
                        className="plus"
                        title="pôr neste dia"
                        aria-label="pôr neste dia"
                        onClick={() =>
                          nowMany('attraction', it.id, { day_iso: iso, status: 'escolhida' })
                        }
                      >
                        +
                      </button>
                      {it.note ? <Inline html={marcado(it.note)} className="wh" /> : null}
                    </div>
                  );
                })}
                {other ? (
                  <p className="mono foot" style={{ margin: '12px 0 0' }}>
                    {other}
                    {other > 1 ? ' itens desta cidade já estão' : ' item desta cidade já está'}
                    {' '}em outro dia.
                  </p>
                ) : null}
              </>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 4. "Onde comer neste dia" (--c-nl). Prato NAO aparece aqui (regra 5.8). */
function CartaoComidas({ iso }: { iso: string }) {
  const { s, now } = useApp();
  const { selCO, selFPick, setSelFPick } = useUi();

  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const dco = C.paisDaCidade(s, bk);
  const pk = selFPick && coOf(selFPick).k === selFPick ? selFPick : (dco || selCO);
  const mine = C.foodsOfDay(s, iso);

  const livres: Food[] = [];
  let other = 0;
  for (const it of C.foodsOf(s, pk)) {
    if (!C.foodPickable(it.kind)) continue;
    if (it.day_iso === iso) continue;
    if (it.day_iso) { other++; continue; }
    livres.push(it);
  }

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--c-nl)' }}>
      <div className="h">
        <h3>Onde comer neste dia</h3>
        <div className="m">
          {mine.length}{mine.length === 1 ? ' lugar marcado' : ' lugares marcados'} · prato
          {' '}típico fica só na aba Comidas
        </div>
      </div>
      <div className="b">
        {!mine.length ? (
          <div className="empty">
            Nada marcado. Escolha abaixo, ou anote antes na aba <b>Comidas</b>.
          </div>
        ) : (
          <div className="at">
            {mine.map((it) => (
              <div key={it.id} className="atr pkd">
                <div className="nm">{FKE[it.kind]} {it.name}</div>
                <div className="vl">
                  <span className={`stg fkc-${FKCLS[it.kind]}`}>
                    {FKE[it.kind]} {FKROT[it.kind]}
                  </span>
                </div>
                <button
                  className="xb"
                  title="tirar deste dia"
                  aria-label="tirar deste dia"
                  onClick={() => now('food', it.id, 'day_iso', null)}
                >
                  ×
                </button>
                {it.note ? <Inline html={marcado(it.note)} className="wh" /> : null}
              </div>
            ))}
          </div>
        )}

        <div className="sechead">pôr neste dia</div>
        <div className="subtabs">
          {CO.map((c) => {
            const fn = C.foodsOf(s, c.k).filter(
              (f) => C.foodPickable(f.kind) && !f.day_iso,
            ).length;
            return (
              <button
                key={c.k}
                className="chip"
                aria-pressed={pk === c.k}
                style={{ ['--cc' as string]: `var(${c.cc})` }}
                onClick={() => setSelFPick(c.k)}
              >
                {c.n}<span className="cn">{fn}</span>
              </button>
            );
          })}
        </div>

        <div>
          {!livres.length ? (
            <div className="empty">
              {other ? (
                `Todo restaurante e café de ${coOf(pk).n} já está em algum dia.`
              ) : (
                <>
                  Você ainda não anotou restaurante nem café de {coOf(pk).n}. A aba{' '}
                  <b>Comidas</b> é onde isso entra — <b>prato típico não aparece aqui</b>, só
                  lugar.
                </>
              )}
            </div>
          ) : (
            <>
              {livres.map((it) => (
                <div key={it.id} className="sgr">
                  <div className="nm">
                    {FKE[it.kind]} {it.name}{' '}
                    <span className={`stg fkc-${FKCLS[it.kind]}`}>{FKROT[it.kind]}</span>
                  </div>
                  {/* Comida nao tem preco. Nenhum (regra 5.9). */}
                  <div className="vl" />
                  <button
                    className="plus"
                    title="pôr neste dia"
                    aria-label="pôr neste dia"
                    onClick={() => now('food', it.id, 'day_iso', iso)}
                  >
                    +
                  </button>
                  {it.note ? <Inline html={marcado(it.note)} className="wh" /> : null}
                </div>
              ))}
              {other ? (
                <p className="mono foot" style={{ margin: '12px 0 0' }}>
                  {other}{other > 1 ? ' já estão' : ' já está'} em outro dia.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
