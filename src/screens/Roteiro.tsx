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

  const idx = selDay ? ISOS.indexOf(selDay) : -1;

  // Os dias soltos agora saem de `C.roteiroEmOrdem`, junto das estadias.

  return (
    <>
      <div className="panelhead">
        <h2>Roteiro</h2>
      </div>

      <div className="cal">
        <Mes y={2026} m={11} label="dezembro 2026" />
        <Mes y={2027} m={0} label="janeiro 2027" />
      </div>

      {/* ---- a legenda: SIMBOLO + UMA PALAVRA, e nada mais (09/09) ----
          Ela tinha mais cinco vaos escritos — "0 de 34 planejados", "31
          noites em 8 bases", "2 dias so de voo", "x de y atracoes com dia" e
          dois condicionais. Ele pediu na lista de 08/09: "Organizar a
          legenda. So os icones; as escritas pode tirar". Perguntado do que
          sobrava, respondeu "emoji e uma palavra bem como esta hoje" — ou
          seja, estes dois e a fita de emojis logo abaixo ficam como estao.

          Nada se perde de vista: "31 noites em 8 bases" continua na tabela
          do roteiro, no Painel. ---- */}
      <div className="calleg">
        <span><i /> dia com plano</span>
        <span><i className="nt" /> tem aviso meu</span>
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
      ) : (
        /* ---- O ROTEIRO DE CIMA PARA BAIXO (09/09, tarde) ----
           Estadias reservadas e dias sem hospedagem, INTERCALADOS em ordem
           de data. Antes daqui o agrupamento vinha de `day.base`, que era
           SEMENTE MINHA: o app afirmava "durmo em Cáceres" numa cidade que
           ele nao escolheu, e ele apontou isso na tela.

           Agora o bloco e a RESERVA. Sem airbnb marcado sao dias soltos, e
           e assim que ele quer: "cada dia por vez, isso me da liberdade
           para mudancas de planos". */
        C.roteiroEmOrdem(s).map((t) =>
          t.tipo === 'estadia' ? (
            <CartaoEstadia key={`e-${t.estadia.id}-${t.dias[0]}`} estadia={t.estadia} dias={t.dias} />
          ) : (
            <CartaoSemCama key={`s-${t.dias[0]}`} dias={t.dias} />
          ),
        )
      )}
    </>
  );
}

/**
 * UM BLOCO DE ESTADIA: o airbnb marcado, na cidade dele.
 *
 * O titulo e "Chamberí · Madrid" porque foi o que ele pediu — "o bloco pode
 * ser sobre o airbnb em x cidade". As datas sao as da RESERVA, e as noites
 * saem delas: nada aqui e plano.
 */
function CartaoEstadia({ estadia, dias }: { estadia: C.Estadia; dias: string[] }) {
  const { s } = useApp();
  return (
    <div className="card">
      <div className="h">
        <h3>{estadia.nome} · {C.nomeCidade(s, estadia.city)}</h3>
        <div className="m">
          {shortDt(estadia.from)} → {shortDt(estadia.to)} ·{' '}
          {estadia.n}{estadia.n > 1 ? ' noites' : ' noite'} ·{' '}
          clique num dia para ver o itinerário
        </div>
        <Passa cidades={C.cidadesDoBloco(s, { from: estadia.from, to: estadia.to })} />
      </div>
      <div className="b">
        {dias.map((iso) => <DiaLinha key={iso} iso={iso} />)}
      </div>
    </div>
  );
}

/**
 * OS DIAS SEM HOSPEDAGEM DEFINIDA — e o aviso vermelho dele.
 *
 * O AVISO FICA UMA VEZ POR CARTAO, E NAO POR DIA, e isso e escolha: hoje
 * nenhum dos 34 dias tem airbnb marcado, entao um aviso por linha seriam
 * 34 blocos vermelhos e a tela viraria ruido. O cartao E o grupo de dias
 * sem cama, e por isso o vermelho pertence a ele.
 */
function CartaoSemCama({ dias }: { dias: string[] }) {
  return (
    <div className="card semcama" style={{ ['--cc' as string]: 'var(--rust)' }}>
      <div className="h">
        <h3>Hospedagem não definida</h3>
        <div className="m">
          {dias.length} de {ISOS.length} dias · {shortDt(dias[0])}
          {dias.length > 1 ? ` → ${shortDt(dias[dias.length - 1])}` : ''} ·{' '}
          marque um airbnb na aba <b>Hospedagem</b> e estes dias ganham uma cama
        </div>
      </div>
      <div className="b">
        {dias.map((iso) => <DiaLinha key={iso} iso={iso} />)}
      </div>
    </div>
  );
}

/** "passa por Trier, Estrasburgo" — no cabecalho do bloco. */
function Passa({ cidades }: { cidades: string[] }) {
  if (!cidades.length) return null;
  return <div className="dpassa">passa por {cidades.join(', ')}</div>;
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
  /** O PLANO dele (`day.base`), que nao manda em nada. Ver calc 11.2. */
  const plano = (d?.base ?? '').trim();
  const texto = (d?.plan ?? '').trim();
  const av = C.alertaDoDia(s, iso);
  const passa = C.cidadesDoDia(s, iso);
  /** A CAMA, e ela so existe se houver airbnb marcado cobrindo o dia. */
  const hosp = C.hospedagemDoDia(s, iso);

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
        {/* O DIA LIDERA PELA CIDADE ONDE ELE VAI, e nao pela cama (09/09).
            Ele escolheu esta estrutura vendo o desenho: o bloco continua
            sendo a base, e cada dia diz por onde passa. Sem atracao no dia
            nao ha o que liderar, e a linha volta a ser a de antes. */}
        {passa.length ? <h4 className="dcid">{passa.join(' · ')}</h4> : null}
        {texto
          ? <p>{d?.plan}</p>
          : <p style={{ color: 'var(--muted)' }}>clique para ver o dia</p>}
        <DiaTags iso={iso} />
        {/* A CAMA NO FIM DA LISTA, junto das atracoes, trechos e comidas —
            a inversao que ele pediu: "as cidades que vou dormir vao
            aparecer no fim da lista". Ela nao se edita aqui: quem manda e
            a hospedagem marcada, e o campo do cartao do dia e o que sobra.
            Dois lugares editando a mesma coisa foi o problema do DiaTags
            em 07/09. */}
        {/* A CAMA VEM DA RESERVA, e so dela (09/09, tarde). O `day.base`
            NAO entra aqui: ele e o PLANO dele, e o app dizendo "durmo em
            Cáceres" por causa da minha semente foi exatamente a queixa.

            Nos dias sem reserva nao ha aviso NESTA linha: o cartao que os
            agrupa ja e vermelho e ja diz "hospedagem não definida". Um
            aviso por dia seriam 34 hoje. */}
        {hosp ? (
          <div className="dcama">
            🛏️ durmo em <b>{C.nomeCidade(s, hosp.city)}</b>
            <span className="dcs">{hosp.name}</span>
          </div>
        ) : plano ? (
          /* O PLANO dele, discreto e nomeado: "so para eu escrever e me
             localizar como um plano base". So aparece onde ajuda — nos dias
             que ainda nao tem cama. */
          <div className="dplano">
            {C.ehTransito(plano) ? <>▸ {plano}</> : <>▸ plano: <b>{plano}</b></>}
          </div>
        ) : null}
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
