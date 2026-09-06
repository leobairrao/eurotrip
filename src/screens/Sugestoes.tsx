'use client';
// ============================================================
// 10.11 — Sugestoes (06/09/2026). TUDO que eu pesquisei, num lugar so.
//
// A REGRA, na palavra dele: "tudo que for sugerido por voce,
// absolutamente tudo. As minhas abas devem ficar apenas com os meus
// dados".
//
// Antes disto eu SEMEAVA a pesquisa dentro das tabelas dele. Parecia
// dado dele; o `x` mandava o seed_id para `killed_seed`; e nem
// `npm run seed` trazia de volta. Ele perdeu 17 opcoes de hospedagem e
// 35 atracoes assim, em dois dias.
//
// Agora sugestao minha e ARQUIVO (src/content), e so vira linha dele
// pelo +. O `x` de uma linha adotada chama `devolver`, que apaga a linha
// e TIRA de `adopted` — a sugestao volta para ca, com o + de novo.
//
// SEIS segmentos, e todos usam o mesmo par: `Linha` para desenhar e
// `usarPuxar` para gravar. Copiar o padrao em seis lugares diferentes e
// como se cada um ganha um jeito proprio de falhar.
// ============================================================
import { CO, FOOD, HOSP_SUG, ATR_SUG, TRANSP_SUG, SUGGRES, SUGTABS, TKE, AKE, CT, coOf } from '@/content';
import type { SugKey } from '@/content';
import { Nota } from '@/components/Field';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { deHtml, eur, marcado } from '@/lib/fmt';
import { avisosSemeados } from '@/lib/avisos-semente';
import type { Snapshot } from '@/lib/types';

/**
 * Uma sugestao ja esta na lista dele?
 *
 * DUAS provas, e as duas sao necessarias. `adopted` e a marca que o +
 * grava — sobrevive a ele editar o nome da linha. A varredura por
 * `seed_id` pega o caso contrario: a linha existe (veio de uma
 * semeadura antiga) e ninguem nunca gravou a marca.
 */
function adotada(s: Snapshot, sid: string): boolean {
  if (s.adopted.includes(sid)) return true;
  const tem = (xs: { seed_id: string | null }[]) => xs.some((x) => x.seed_id === sid);
  return tem(s.attractions) || tem(s.foods) || tem(s.legs) || tem(s.bookings)
    || tem(s.stayOptions) || tem(s.avisos);
}

/**
 * O + de qualquer segmento.
 *
 * DUAS escritas, nesta ordem, e a segunda so acontece se a primeira der
 * certo. O + de Comidas e o de Reservas, escritos em 04/09, gravavam
 * `adopted` mesmo quando o insert falhava — a sugestao ficava marcada
 * "na sua lista" com a linha inexistente, e sem botao para tentar de
 * novo. Aqui nao.
 */
function usarPuxar() {
  const { insert } = useApp();
  return async (tabela: 'attraction' | 'food' | 'leg' | 'booking' | 'stay_option' | 'aviso',
                linha: Record<string, unknown>, sid: string) => {
    const r = await insert(tabela, { ...linha, seed_id: sid });
    if (!r.ok) return;
    await insert('adopted', { seed_id: sid });
  };
}

/** A linha de uma sugestao: nome, o que eu achei, e o + (ou "na sua lista"). */
function Linha({
  sid, titulo, nota, valor, emoji, puxar,
}: {
  sid: string;
  titulo: string;
  nota?: string;
  valor?: string;
  emoji?: string;
  puxar: () => void;
}) {
  const { s } = useApp();
  const ja = adotada(s, sid);
  return (
    <div className={ja ? 'sgr taken' : 'sgr'}>
      {/* O `Nota` E a `.nm`, nao um filho dela: `.sgr` e uma grade, e um
          elemento a mais no meio empilha titulo, valor e nota em coluna.
          E o mesmo uso de Comidas.tsx:349 e Reservas.tsx:178. */}
      <Nota html={(emoji ? `${emoji} ` : '') + marcado(titulo)} className="nm" />
      {ja ? (
        <div className="vl">{valor ? `${valor} · ` : ''}na sua lista</div>
      ) : (
        <>
          {valor ? <div className="vl">{valor}</div> : null}
          <button className="plus" aria-label={`pôr ${titulo} na minha lista`} onClick={puxar}>+</button>
        </>
      )}
      {nota ? <Nota html={marcado(nota)} className="wh" /> : null}
    </div>
  );
}

/** O cartao de um grupo (uma cidade, um pais, ou o grupo inteiro). */
function Grupo({ titulo, sub, cor, children }: {
  titulo: string; sub?: string; cor?: string; children: React.ReactNode;
}) {
  return (
    <div className="card" style={cor ? { ['--cc' as string]: `var(${cor})` } : undefined}>
      <div className="h">
        <h3>{titulo}</h3>
        {sub ? <div className="m">{sub}</div> : null}
      </div>
      <div className="b">
        <div className="sg" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Os seis segmentos
// ============================================================

/** 1. Atracoes — 69, por cidade, dentro do pais escolhido na fita. */
function SegAtracoes() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const puxar = usarPuxar();
  const cidades = C.cidadesDe(s, selCO).filter((c) => (ATR_SUG[c] ?? []).length);

  return (
    <>
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => {
          const n = C.cidadesDe(s, k)
            .reduce((a, c) => a + (ATR_SUG[c] ?? []).filter((_, i) => !adotada(s, `s:${c}:${i}`)).length, 0);
          return n ? String(n) : '';
        }}
      />
      {!cidades.length ? (
        <div className="empty">Nada pesquisado em {coOf(selCO).n} ainda.</div>
      ) : cidades.map((city) => (
        <Grupo
          key={city}
          titulo={C.nomeCidade(s, city)}
          sub={`${ATR_SUG[city].length} que eu pesquisei · o + põe no seu backlog em Atrações`}
          cor={C.ccCidade(s, city)}
        >
          {ATR_SUG[city].map(([nome, preco, nota], i) => {
            const sid = `s:${city}:${i}`;
            return (
              <Linha
                key={sid}
                sid={sid}
                titulo={nome}
                nota={nota}
                valor={preco ? eur(Number(preco)) : 'grátis'}
                emoji={AKE.passeio}
                puxar={() => void puxar('attraction', {
                  city, name: deHtml(nome), price_eur: Number(preco) || 0,
                  note: deHtml(nota ?? ''), status: 'backlog', kind: 'passeio',
                  day_iso: null, paid: false,
                }, sid)}
              />
            );
          })}
        </Grupo>
      ))}
    </>
  );
}

/** 2. Comidas — o "vale provar" de cada pais. */
function SegComidas() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const puxar = usarPuxar();
  const f = FOOD.find((x) => x.pais === selCO) ?? null;

  return (
    <>
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => {
          const g = FOOD.find((x) => x.pais === k);
          const n = (g?.reg ?? []).filter((_, i) => !adotada(s, `F${k}|${i}`)).length;
          return n ? String(n) : '';
        }}
      />
      {!f ? (
        <div className="empty">Nada pesquisado em {coOf(selCO).n}.</div>
      ) : (
        <Grupo
          titulo={`O que provar em ${coOf(selCO).n}`}
          sub={`${f.reg.length} pratos · o + põe na sua lista de pratos, em Comidas`}
          cor={coOf(selCO).cc}
        >
          {f.reg.map((r, i) => {
            const sid = `F${selCO}|${i}`;
            return (
              <Linha
                key={sid}
                sid={sid}
                titulo={deHtml(r[0])}
                nota={deHtml(r[1])}
                puxar={() => void puxar('food', {
                  country: selCO, name: deHtml(r[0]), note: deHtml(r[1]),
                  kind: 'prato', day_iso: null,
                }, sid)}
              />
            );
          })}
        </Grupo>
      )}
    </>
  );
}

/** 3. Reservas — as 13 de burocracia e prazo. */
function SegReservas() {
  const { s } = useApp();
  const puxar = usarPuxar();
  const proxima = () => s.bookings.reduce((a, b) => Math.max(a, b.position), 0) + 1;

  return (
    <Grupo
      titulo="Burocracia e prazos"
      sub={`${SUGGRES.length} itens · o + põe na sua lista, em Reservas`}
      cor="--ochre"
    >
      {SUGGRES.map((sg, i) => {
        const sid = `R|${i}`;
        return (
          <Linha
            key={sid}
            sid={sid}
            titulo={deHtml(sg[0])}
            nota={deHtml(sg[1])}
            puxar={() => void puxar('booking', {
              position: proxima(), name: deHtml(sg[0]), note: deHtml(sg[1]),
              amount: null, currency: 'brl', done: false,
            }, sid)}
          />
        );
      })}
    </Grupo>
  );
}

/** 4. Hospedagem — os bairros que eu pesquisei, por cidade. */
function SegHospedagem() {
  const { s } = useApp();
  const puxar = usarPuxar();
  const cidades = Object.keys(HOSP_SUG);

  return (
    <>
      {cidades.map((city) => (
        <Grupo
          key={city}
          titulo={C.nomeCidade(s, city)}
          sub={`${HOSP_SUG[city].length} bairros · o + põe como opção sua, em Hospedagem`}
          cor={C.ccCidade(s, city)}
        >
          {HOSP_SUG[city].map(([nome, diaria, nota], i) => {
            const sid = `h:${city}:${i}`;
            return (
              <Linha
                key={sid}
                sid={sid}
                titulo={nome}
                nota={nota}
                valor={diaria == null ? '' : diaria ? `${eur(Number(diaria))}/noite` : 'grátis'}
                puxar={() => void puxar('stay_option', {
                  city, name: nome, note: deHtml(nota ?? ''),
                  nightly_eur: diaria == null ? null : Number(diaria),
                  nights: null, total_eur: null,
                  address: '', check_in: '', check_out: '', link: '',
                  chosen: false, paid: false,
                  position: C.staysOf(s, city).length,
                }, sid)}
              />
            );
          })}
        </Grupo>
      ))}
    </>
  );
}

/** 5. Transporte — os 12 trechos entre as bases. */
function SegTransporte() {
  const { s } = useApp();
  const puxar = usarPuxar();
  const proxima = () => s.legs.reduce((a, l) => Math.max(a, l.position), 0) + 1;

  return (
    <Grupo
      titulo="Trechos entre as bases"
      sub={`${TRANSP_SUG.length} trechos · o + põe na sua lista, em Transporte`}
      cor="--c-fr"
    >
      {TRANSP_SUG.map((t, i) => {
        const sid = `t:${i}`;
        return (
          <Linha
            key={sid}
            sid={sid}
            titulo={t.n}
            nota={deHtml(t.w)}
            emoji={TKE[t.k]}
            puxar={() => void puxar('leg', {
              position: proxima(), name: t.n, note: deHtml(t.w), kind: t.k,
              amount: null, currency: 'eur', bought: false, day_iso: null,
            }, sid)}
          />
        );
      })}
    </Grupo>
  );
}

/**
 * 6. Dicas — os 51 avisos que eu pesquisei.
 *
 * A fonte e a MESMA funcao que enchia o banco (`avisosSemeados`), entao
 * nao ha uma segunda copia do texto para divergir. O `spot` de cada um
 * diz em que tela ele vai aparecer depois de adotado — por isso o grupo
 * aqui e por tela, e nao por cidade.
 */
const ONDE: Record<string, string> = {
  atracoes: 'Aparece na aba Atrações, no cartão da cidade',
  dicas: 'Aparece na aba Dicas',
  comidas: 'Aparece na aba Comidas',
  stay: 'Aparece na aba Hospedagem',
  roteiro: 'Aparece no dia, no Roteiro',
  transporte: 'Aparece na aba Transporte',
};

function SegDicas() {
  const puxar = usarPuxar();
  const todos = avisosSemeados();
  const grupos = new Map<string, typeof todos>();
  for (const a of todos) {
    const tela = String(a.spot).split(':')[0];
    if (!grupos.has(tela)) grupos.set(tela, []);
    grupos.get(tela)!.push(a);
  }

  return (
    <>
      {[...grupos].map(([tela, itens]) => (
        <Grupo
          key={tela}
          titulo={ONDE[tela] ?? tela}
          sub={`${itens.length} ${itens.length === 1 ? 'aviso' : 'avisos'} · o + põe onde ele pertence`}
          cor={tela === 'roteiro' ? '--rust' : '--pine'}
        >
          {itens.map((a) => (
            <Linha
              key={a.seed_id ?? a.spot}
              sid={a.seed_id ?? a.spot}
              titulo={a.title}
              nota={a.body}
              puxar={() => void puxar('aviso', {
                spot: a.spot, tone: a.tone, title: a.title,
                body: a.body, position: a.position,
              }, a.seed_id ?? a.spot)}
            />
          ))}
        </Grupo>
      ))}
    </>
  );
}

const SEG: Record<SugKey, () => React.JSX.Element> = {
  atracoes: SegAtracoes,
  comidas: SegComidas,
  reservas: SegReservas,
  stay: SegHospedagem,
  transporte: SegTransporte,
  dicas: SegDicas,
};

/** Quantas de cada segmento ainda esperam — a que ele ja puxou nao espera nada. */
function quantasEsperam(s: Snapshot, k: SugKey): number {
  const conta = (sids: string[]) => sids.filter((sid) => !adotada(s, sid)).length;
  switch (k) {
    case 'atracoes':
      return conta(Object.entries(ATR_SUG).flatMap(([c, xs]) => xs.map((_, i) => `s:${c}:${i}`)));
    case 'comidas':
      return conta(FOOD.flatMap((f) => f.reg.map((_, i) => `F${f.pais}|${i}`)));
    case 'reservas':
      return conta(SUGGRES.map((_, i) => `R|${i}`));
    case 'stay':
      return conta(Object.entries(HOSP_SUG).flatMap(([c, xs]) => xs.map((_, i) => `h:${c}:${i}`)));
    case 'transporte':
      return conta(TRANSP_SUG.map((_, i) => `t:${i}`));
    case 'dicas':
      return conta(avisosSemeados().map((a) => a.seed_id ?? a.spot));
  }
}

export default function Sugestoes() {
  const { s } = useApp();
  const { selSug, setSelSug } = useUi();
  const Tela = SEG[selSug];

  return (
    <>
      <div className="panelhead">
        <h2>Sugestões</h2>
        <p>
          Tudo que eu pesquisei, num lugar só e separado por segmento. <b>Nada daqui entra na
          sua lista sozinho: o + é o que decide.</b> E nada aqui se perde — se você puxar e
          se arrepender, o × devolve para cá.
        </p>
      </div>

      <div className="subtabs">
        {SUGTABS.map(([k, rot]) => {
          const n = quantasEsperam(s, k);
          return (
            <button
              key={k}
              className="chip"
              aria-pressed={selSug === k}
              onClick={() => setSelSug(k)}
            >
              {rot}<span className="cn">{n || ''}</span>
            </button>
          );
        })}
      </div>

      <Tela />
    </>
  );
}
