'use client';
// ============================================================
// 10.2 — Roteiro. O coracao do app, e a tela mais complexa.
// Quatro partes, na ordem em que o artefato as monta:
//   (a) o calendario de dois meses, sempre visivel;
//   (b) sem dia selecionado, os blocos de dias com a mesma base;
//   (c) com um dia selecionado e sem editar, a Vista — so-leitura, em
//       ./roteiro/Vista.tsx;
//   (d) com o botao "editar" apertado, o editor de QUATRO cartoes, em
//       ./roteiro/Editor.tsx (saiu daqui em 06/09, sem mudar comportamento).
// ============================================================
import type { ReactNode } from 'react';
import { AKE, FKE, ISOS, TKE } from '@/content';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, shortDt, wdOf } from '@/lib/fmt';
import Editor from './roteiro/Editor';
import Vista from './roteiro/Vista';

const WDS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

// Cidade aqui passa SEMPRE por `C.temCidade`/`C.nomeCidade`/`C.ccCidade`,
// nunca por `CT[k]` cru: a `CT` so conhece as 11 fixas, e uma cidade criada
// por ele derrubava esta tela inteira (05/09).

export default function Roteiro() {
  const { s } = useApp();
  const { selDay, irParaDia, editando, setEditando } = useUi();

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
          você que escreve. Clique numa data para ver o dia: a nota, as atrações, o trem ou voo
          e onde comer aparecem ali; o botão <b>editar</b> é onde você escreve ou marca isso.
          Onde tem um fato duro (o corte das 20h do dia 24, as janelas grátis do Palacio Real)
          eu deixei um aviso.
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
        {/* So durante a viagem: fora dela, `s.hoje` nao esta nos 34 dias e o
            botao apontaria para lugar nenhum. Nao troca o dia sozinho — se ele
            fechou o app planejando o dia 20, reabrir no dia 20 e o certo. */}
        {ISOS.includes(s.hoje) ? (
          <button
            className="chip"
            aria-pressed={selDay === s.hoje ? true : undefined}
            onClick={() => irParaDia(s.hoje)}
          >
            hoje
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
        editando === selDay ? (
          <>
            <div className="chips" style={{ marginBottom: 12 }}>
              <button type="button" className="chip" onClick={() => setEditando(null)}>← pronto</button>
            </div>
            <Editor iso={selDay} />
          </>
        ) : (
          <Vista iso={selDay} onEditar={() => setEditando(selDay)} />
        )
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
                  {' '}clique num dia para ver o itinerário
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
    const av = C.alertaDoDia(s, iso);
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
  const av = C.alertaDoDia(s, iso);

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
          : <p style={{ color: 'var(--muted)' }}>clique para ver o dia</p>}
        <DiaTags iso={iso} />
        {(() => {
          const { feitas, total } = D.feitasDoDia(s, iso);
          return total ? <div className="dfeitas">{feitas} de {total} feitas</div> : null;
        })()}
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
  // UMA fonte para o dia, e nao cinco (07/09). Ate aqui esta funcao montava e
  // ordenava as quatro origens sozinha, e discordava do `dia.ts` em duas
  // coisas: comida e item livre trocados, e a ordem dentro de cada tipo. Como
  // ninguem ve a tira e a visualizacao ao mesmo tempo, a divergencia era
  // invisivel — e ia deixar de ser na etapa 2, quando as setas passarem a
  // mandar na ordem e so uma das duas telas obedecer.
  const itens = D.itensDoDia(s, iso);
  if (!itens.length) return null;

  // OS DOIS LADOS, nao so o euro (06/09). A etiqueta somava
  // `dayAttrTotal + dayLegEur` e imprimia `eur(tot)`: um trem de R$ 800 no
  // mesmo dia de uma atracao de EUR 20 desaparecia do resumo — a etiqueta
  // dizia "EUR 20 no dia". Nao contava errado; escondia. Agora o total vem do
  // mesmo lugar que a lista, entao nao ha como um crescer sem o outro.
  const { eur: totE, brl: totB } = D.totalDoDia(s, iso);

  return (
    <div className="dtags">
      {itens.map((x) => (
        <span key={`${x.tabela}:${x.id}`} className={`dtg ${x.classe}`}>
          {x.emoji} {x.nome}
          {x.eur || x.brl ? <> <b>{x.eur ? eur(x.eur) : brl(x.brl)}</b></> : null}
        </span>
      ))}
      {totE || totB ? (
        <span className="dtg tot">
          {totE ? eur(totE) : ''}{totE && totB ? ' + ' : ''}{totB ? brl(totB) : ''} no dia
        </span>
      ) : null}
    </div>
  );
}
