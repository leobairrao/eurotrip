'use client';
// ============================================================
// O EDITOR DE UM DIA — os quatro cartoes.
//
// Saiu de Roteiro.tsx em 06/09 sem uma linha de mudanca: o arquivo tinha
// 809 linhas e a visualizacao nova dobraria isso. Aqui nao mudou nada de
// comportamento, so de endereco.
//
// A REESCRITA DELE E A ETAPA 2 (ver a spec): a lista do dia sai dos quatro
// cartoes e vira uma lista so, ordenavel; os cartoes viram so os seletores
// de onde puxar. Nao da para ordenar entre tipos enquanto cada tipo tiver
// a propria lista.
// ============================================================
import { useState } from 'react';
import {
  CO, FK, FKCLS, ISOS, TK, TKPL, akEmoji, coOf, fkEmoji, tkEmoji,
} from '@/content';
import { AreaField, Inline, TextField } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Ordem from './Ordem';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, longDt, marcado, num, wdOf } from '@/lib/fmt';
import type { Attraction, Food, Leg } from '@/lib/types';

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

export default function Editor({ iso }: { iso: string }) {
  return (
    <>
      <CartaoDia iso={iso} />
      {/* A lista do dia mora AQUI agora, e uma so. Ate 07/09 cada cartao abaixo
          tinha a propria — e com quatro listas nao ha como por um restaurante
          entre duas atracoes. */}
      <Ordem iso={iso} />
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
  const { s, nowMany } = useApp();
  const { selTPick, setSelTPick } = useUi();
  /**
   * O liga/desliga que ele pediu em 06/09: "deve ter um on/off assim: vou
   * usar transporte esse dia? Se eu ativar, abre a seleção e eu coloco qual
   * transporte vou usar".
   *
   * NASCE FECHADO desde a etapa 2 (08/09). Ate aqui comecava ligado se o dia
   * ja tivesse trecho, porque a lista do dia morava DENTRO deste cartao e
   * esconde-la esconderia o unico jeito de marcar o segundo trecho. Isso
   * deixou de valer: o que ja esta no dia mora em `Ordem.tsx`, acima, e nao
   * passa mais por aqui. O cartao virou so o seletor.
   */
  const [usaTransporte, setUsaTransporte] = useState(false);

  const pk = selTPick && TKROT[selTPick] ? selTPick : 'trem';
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
        <div className="m">o que você já pôs neste dia está na ordem, acima · {mt}</div>
      </div>
      <div className="b">
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
                {tkEmoji(x)} {TKPL[x]}<span className="cn">{fn}</span>
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
                      {tkEmoji(pk)} {t.name}
                      {t.bought ? <> <span className={`stg tkc-${pk}`}>comprado</span></> : null}
                    </div>
                    <div className="vl">
                      {v ? (t.currency === 'brl' ? brl(v) : eur(v)) : '—'}
                    </div>
                    <button
                      className="plus"
                      title="pôr neste dia"
                      aria-label="pôr neste dia"
                      onClick={() =>
                        nowMany('leg', t.id, { day_iso: iso, day_pos: D.proximaPos(s, iso) })
                      }
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
  const { s, nowMany } = useApp();
  const { selPick, setSelPick } = useUi();

  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const pk = selPick && C.temCidade(s, selPick) ? selPick : bk;
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
          o que você já marcou está na ordem, acima
          {tot ? ` · ${eur(tot)} · ${brl(tot * C.rate(s))}` : ' · nada a pagar'}
        </div>
      </div>
      <div className="b">
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
                        {akEmoji(it.kind)} {it.name}{' '}
                        <span className={`stg st-${ORIGCLS(it)}`}>{ORIGEM(it)}</span>
                      </div>
                      <div className="vl">{pr ? eur(pr) : 'grátis'}</div>
                      {/* Por num dia E escolher, numa escrita so (regra 5.3). */}
                      <button
                        className="plus"
                        title="pôr neste dia"
                        aria-label="pôr neste dia"
                        onClick={() =>
                          nowMany('attraction', it.id, {
                            day_iso: iso, status: 'escolhida', day_pos: D.proximaPos(s, iso),
                          })
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
  const { s, nowMany } = useApp();
  const { selCO, selFPick, setSelFPick } = useUi();

  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const dco = C.paisDaCidade(s, bk);
  const pk = selFPick && coOf(selFPick).k === selFPick ? selFPick : (dco || selCO);

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
          o que você já marcou está na ordem, acima · prato típico fica só na aba Comidas
        </div>
      </div>
      <div className="b">
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
                    {fkEmoji(it.kind)} {it.name}{' '}
                    <span className={`stg fkc-${FKCLS[it.kind]}`}>{FKROT[it.kind]}</span>
                  </div>
                  {/* Comida nao tem preco. Nenhum (regra 5.9). */}
                  <div className="vl" />
                  <button
                    className="plus"
                    title="pôr neste dia"
                    aria-label="pôr neste dia"
                    onClick={() =>
                      nowMany('food', it.id, { day_iso: iso, day_pos: D.proximaPos(s, iso) })
                    }
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
