'use client';
// ============================================================
// ACRESCENTAR AO DIA (etapa 2, 08/09/2026).
//
// Os tres cartoes de seletor viraram tres GAVETAS de um cartao so. Ele
// escolheu assim vendo o desenho: a tela do dia cai de cinco cartoes para
// tres, e ele vai usar isto no celular, no frio, dentro do metro — hoje,
// para chegar no seletor de comida, rola a tela inteira.
//
// A GAVETA E A CHAVE QUE ELE JA PEDIU. Em 06/09: "deve ter um on/off
// assim: vou usar transporte esse dia? Se eu ativar, abre a selecao e eu
// coloco qual transporte vou usar". Era uma chave, so no transporte;
// agora sao tres, uma por gaveta, com a contagem do que ha disponivel na
// testa. Mesmo `.liga`, mesmo `role="switch"`, mesmo alvo de toque.
//
// AS TRES NASCEM FECHADAS. Na etapa 1 a do transporte nascia ligada se o
// dia ja tivesse trecho, para nao esconder o unico jeito de marcar o
// segundo trecho do mesmo dia. Isso deixou de valer na etapa 2: o que ja
// esta no dia mora em `Ordem.tsx`, acima, e nao passa mais por aqui.
//
// O `key={iso}` fica no cartao inteiro, em `Editor.tsx`: "vou usar
// transporte neste dia?" e uma pergunta POR DIA, e a resposta nao pode
// vazar para o dia seguinte.
//
// O QUE NAO MUDOU: os tres seletores por dentro. Vieram de `Editor.tsx`
// linha por linha — os chips, a lista de livres, a contagem de "ja esta
// em outro dia", os textos de lista vazia e os `+` que escrevem
// `day_pos`. So perderam a casca do cartao.
// ============================================================
import { useState } from 'react';
import {
  CO, CT, FK, FKCLS, TK, TKPL, akEmoji, coOf, fkEmoji, tkEmoji,
} from '@/content';
import { Inline, useLocal } from '@/components/Field';
import Tema from '@/components/Tema';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, marcado, norm, num, parseNum } from '@/lib/fmt';
import { AK_MAX } from '@/lib/types';
import type { Attraction, Food, Leg } from '@/lib/types';

const TKROT: Record<string, string> = TK;
const FKROT: Record<string, string> = FK;
const ORIGEM = (a: Attraction) => (C.ehPesquisa(a) ? 'sugestão minha' : 'sua lista');
const ORIGCLS = (a: Attraction) => (C.ehPesquisa(a) ? 'sug' : 'bac');
const TKS = Object.keys(TK);

/**
 * Uma gaveta: a chave que ele ja conhece, mais a contagem do que ha dentro.
 *
 * O numero na testa e o que evita o clique a toa — ele ve que a gaveta esta
 * vazia sem precisar abrir.
 */
function Gaveta({
  rotulo, n, children,
}: {
  rotulo: string; n: number; children: React.ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button
        className="liga"
        role="switch"
        aria-checked={aberta}
        onClick={() => setAberta((v) => !v)}
      >
        <span className="lbl">
          {rotulo}<span className="cn">{n}</span>
        </span>
        <i className="sw" aria-hidden="true" />
      </button>
      {aberta ? <div className="gav">{children}</div> : null}
    </>
  );
}

export default function Acrescentar({ iso }: { iso: string }) {
  const { s } = useApp();
  const bk = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const dco = C.paisDaCidade(s, bk);

  const nTransporte = s.legs.filter((t) => !t.day_iso).length;
  const nAtracoes = bk
    ? C.attrsDele(s, bk).filter((a) => !a.day_iso).length
      + C.attrsPesquisa(s, bk).filter((a) => !a.day_iso).length
    : 0;
  const nComidas = dco
    ? C.foodsOf(s, dco).filter((f) => C.foodPickable(f.kind) && !f.day_iso).length
    : 0;

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Acrescentar a este dia</h3>
        <div className="m">
          uma atração nova, ou algo que você já anotou — tudo entra no fim da ordem, acima
        </div>
      </div>
      <div className="b">
        <AtracaoNoDia iso={iso} />

        <Gaveta
          rotulo={bk ? `da lista de ${C.nomeCidade(s, bk)}` : 'da sua lista de atrações'}
          n={nAtracoes}
        >
          <SeletorAtracoes iso={iso} />
        </Gaveta>

        <Gaveta rotulo="um trecho de transporte" n={nTransporte}>
          <SeletorTransporte iso={iso} />
        </Gaveta>

        <Gaveta rotulo="um lugar de comer" n={nComidas}>
          <SeletorComidas iso={iso} />
        </Gaveta>
      </div>
    </div>
  );
}

/** A gaveta do transporte. Era o cartao "Como eu me movo neste dia". */
function SeletorTransporte({ iso }: { iso: string }) {
  const { s, nowMany } = useApp();
  const { selTPick, setSelTPick } = useUi();

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
    <>
      <div className="gavsum">{mt === 'nada lançado' ? 'nada lançado neste dia' : `${mt} neste dia`}</div>
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
  );
}

/** A gaveta das atracoes. A cidade da base continua pre-selecionada. */
function SeletorAtracoes({ iso }: { iso: string }) {
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
    <>
      <div className="gavsum">
        {tot ? `${eur(tot)} · ${brl(tot * C.rate(s))} neste dia` : 'nada a pagar neste dia'}
      </div>
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
    </>
  );
}

/** A gaveta de comer. Prato NAO aparece aqui (regra 5.8). */
function SeletorComidas({ iso }: { iso: string }) {
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
    <>
      <div className="gavsum">prato típico fica só na aba Comidas</div>
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
    </>
  );
}
/**
 * REGISTRAR UMA ATRACAO DENTRO DO DIA (08/09/2026).
 *
 * O pedido dele, olhando a tela: *"para eu acrescentar uma atracao aqui, ela
 * deve ser adicionada na aba atracoes tambem, assim podendo adicionar
 * atracoes por qualquer um dos dois lugares e eles aparecem certinho neles"*.
 *
 * E UMA LINHA SO NO BANCO, e e por isso que funciona. A atracao nasce na
 * tabela `attraction` como qualquer outra — com cidade, tema, preco e nota.
 * O que muda e que ela ja nasce COM DIA (`day_iso`), entao aparece na ordem
 * daqui e na aba Atracoes ao mesmo tempo. Nao ha copia, nao ha sincronizar:
 * sao duas telas lendo a mesma linha.
 *
 * NAO HA SELETOR DE MOEDA, e isso e o pedido dele: *"a moeda sempre deve ser
 * euro, nao de opcao de escolha, atracoes sempre serao pagas la e por euro"*.
 * Sai de graca: `attraction` so tem `price_eur`, nunca teve coluna de moeda.
 *
 * A CIDADE E O CAMPO DELICADO. Atracao sem cidade fica orfa, e `CT[cidade]`
 * cru numa tela derruba o app inteiro — ja aconteceu. Aqui a cidade vem
 * pre-escolhida pela base do dia; sem base, ele escolhe na mao; e se a
 * cidade nao existir, ela e CRIADA antes, como ele pediu: *"se eu quiser
 * adicionar uma que nao exista ela vira uma cidade nova em atracoes tambem"*.
 *
 * A cidade nova precisa de PAIS, e ele escolheu nao poder criar pais novo —
 * entao o pais vem do menu dos sete, ja apontando para o pais da base quando
 * ela existe.
 */
function AtracaoNoDia({ iso }: { iso: string }) {
  const { s, insert } = useApp();
  const nome = useLocal();
  const nota = useLocal();
  const preco = useLocal();
  const cidadeNova = useLocal();

  const base = C.cityOfBase(s, s.days[iso]?.base ?? '');
  const cidades = C.todasCidades(s);

  const [cidade, setCidade] = useState(base || cidades[0] || '');
  const [pais, setPais] = useState(C.paisDaCidade(s, base) || CO[0].k);
  const [tema, setTema] = useState('passeio');
  const [erro, setErro] = useState('');
  const [indo, setIndo] = useState(false);

  const criandoCidade = cidade === '__nova';

  const por = async () => {
    const nm = nome.get().trim();
    if (!nm) { setErro('escreva o que é, primeiro'); return; }

    let alvo = cidade;

    // 1. a cidade nova, quando for o caso — ANTES da atracao, senao ela
    //    nasceria apontando para uma cidade que nao existe
    if (criandoCidade) {
      const n = cidadeNova.get().trim();
      if (!n) { setErro('escreva o nome da cidade nova'); return; }
      const k = norm(n);
      if (!k) { setErro('esse nome não vira uma chave válida — tente outro'); return; }
      if (CT[k] ?? s.cities.find((c) => c.k === k)) {
        const onde = CO.find((x) => x.k === C.paisDaCidade(s, k))?.n ?? '';
        setErro(`${C.nomeCidade(s, k)} já existe${onde ? ` (em ${onde})` : ''} — escolha ela no menu.`);
        return;
      }
      setErro('');
      setIndo(true);
      const rc = await insert('city', {
        k, n, co: pais,
        position: s.cities.filter((c) => c.co === pais).length,
      });
      if (!rc.ok) {
        setIndo(false);
        setErro('não consegui criar a cidade. O que você escreveu está aí — tente de novo.');
        return;
      }
      alvo = k;
    }

    if (!alvo) { setErro('escolha a cidade'); return; }

    setErro('');
    setIndo(true);
    const r = await insert('attraction', {
      city: alvo,
      name: nm,
      note: nota.get(),
      price_eur: parseNum(preco.get()) ?? 0,
      // nasce DENTRO do dia: por isso 'escolhida' e o dia, e nao 'backlog'
      status: 'escolhida',
      kind: tema.trim().slice(0, AK_MAX) || 'passeio',
      day_iso: iso,
      day_pos: D.proximaPos(s, iso),
      seed_id: null,
    });
    setIndo(false);
    if (!r.ok) {
      setErro(`Não consegui guardar "${nm}". O que você escreveu continua aqui — tente de novo.`);
      return;
    }
    nome.limpar();
    nota.limpar();
    preco.limpar();
    cidadeNova.limpar();
    if (criandoCidade) setCidade(alvo);
    // o TEMA nao volta para 'passeio': quem registra tres museus seguidos
    // escolhe uma vez, nao tres (a mesma regra da aba Atracoes)
  };

  return (
    <>
      <div className="addrow ad6">
        <input
          ref={(el) => { nome.ref.current = el; }}
          type="text"
          placeholder="uma atração… ex. Palacio Real"
          aria-label="nome da atração"
        />
        <input
          ref={(el) => { nota.ref.current = el; }}
          type="text"
          placeholder="uma nota (opcional)"
          aria-label="nota da atração"
        />
        <select
          className="cv"
          aria-label="cidade"
          value={cidade}
          onChange={(e) => setCidade(e.currentTarget.value)}
        >
          {cidades.map((c) => (
            <option key={c} value={c}>{C.nomeCidade(s, c)}</option>
          ))}
          <option value="__nova">＋ outra cidade…</option>
        </select>
        <Tema value={tema} onChange={setTema} />
        {/* sem seletor de moeda: `attraction` so tem price_eur */}
        <input
          ref={(el) => { preco.ref.current = el; }}
          type="text"
          inputMode="decimal"
          className="pv"
          placeholder="€"
          aria-label="preço em euros"
        />
        <button onClick={() => void por()} disabled={indo}>
          {indo ? 'guardando…' : 'pôr neste dia'}
        </button>
      </div>

      {criandoCidade ? (
        <div className="addrow cn2">
          <input
            ref={(el) => { cidadeNova.ref.current = el; }}
            type="text"
            placeholder="o nome da cidade nova — ex. Sevilha"
            aria-label="nome da cidade nova"
          />
          <select
            aria-label="país da cidade nova"
            value={pais}
            onChange={(e) => setPais(e.currentTarget.value)}
          >
            {CO.map((c) => <option key={c.k} value={c.k}>{c.n}</option>)}
          </select>
        </div>
      ) : null}

      {erro ? (
        <div className="n warn" style={{ maxWidth: 'none', marginBottom: 12 }} role="alert">
          {erro}
        </div>
      ) : null}
    </>
  );
}
