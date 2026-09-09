'use client';
// ============================================================
// 10.1 — Painel ("Detalhes gerais"). SO LEITURA. Nada se edita aqui.
// Tudo e derivado: o cartao vermelho de pendencias nunca e escrito
// a mao, sai do que ele marcou nas outras abas.
// ============================================================
import { ISOS, STAYS } from '@/content';
import { Inline } from '@/components/Field';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { brl, daysTo, eur, marcado, num, plMesAte } from '@/lib/fmt';

const CIDADES = STAYS.map((s) => s.c);

export default function Painel() {
  const { s } = useApp();

  const dep = daysTo('2026-12-10', s.hoje);
  const bases = C.baseList(s);
  const noites = C.nightsAll(s);
  const visit = C.cidadesVisitadas(s);
  const legEur = C.legSum(s, '').eur;
  const legBrlLado = C.legSum(s, '').brl;
  const hosp = C.stayTotalAll(s, CIDADES);
  const comEndereco = C.stayCount(s, CIDADES);
  const bookPago = C.bookingBrl(s, 'pago');

  return (
    <>
      <div className="panelhead">
        <h2>Detalhes gerais</h2>
      </div>

      {/* ---- os TRES indicadores (09/09) ----
          Eram quatro, com uma frase miuda embaixo de cada um. Ele pediu na
          lista de 08/09: tirar as frases, e ficar com "Dias ate embarcar,
          Dias de viagem, e Cidades visitadas". Perguntado sobre o quarto
          lugar vago, escolheu "so os tres, mais largos" — e a grade e
          `auto-fit`, entao cada um se alarga sozinho.

          As atracoes no roteiro e o 0/7 de hospedagem nao se perderam: os
          dois voltam como numero grande nas tabelas que ele desenhou na
          mesma lista ("quantos peguei e quanto gastei"). ---- */}
      <div className="kpi">
        <div>
          <b>{dep}</b>
          <span>dias até embarcar</span>
        </div>
        <div>
          <b>{ISOS.length}</b>
          <span>dias de viagem</span>
        </div>
        <div>
          {/* Sai da ATRACAO, nao da base do dia: ele dorme em 7 cidades e
              passa por umas 15. Ver `cidadesVisitadas` em calc.ts. */}
          <b>{visit.feitas} de {visit.total}</b>
          <span>cidades visitadas</span>
        </div>
      </div>

      {/* ---- os cinco numeros de dinheiro, nesta ordem (foi pedida) ---- */}
      <div className="bigsum b5">
        <div>
          <b>{brl(C.pagoBrl(s, CIDADES))}</b>
          <span>total já pago</span>
          <i>{bookPago ? `o voo + ${brl(bookPago)} de burocracia` : 'o voo internacional'}</i>
        </div>
        <div>
          <b>{eur(hosp)}</b>
          <span>hospedagem</span>
          <i>{comEndereco} de {STAYS.length} bases lançadas</i>
        </div>
        <div>
          <b>{eur(C.attrEurAll(s, 'roteiro'))}</b>
          <span>atrações</span>
          <i>{C.attrCount(s, 'roteiro')} no roteiro</i>
        </div>
        <div>
          {/* O NUMERO GRANDE E O TRANSPORTE INTEIRO (06/09). Antes era so a
              parte em euro, e o que estava em real ia para o rodape pequeno
              como "mais R$ X" — nada se perdia no total da viagem, mas o
              numero embaixo do rotulo "transportes" nao era o transporte. */}
          <b>
            {legEur ? eur(legEur) : ''}{legEur && legBrlLado ? ' + ' : ''}
            {legBrlLado ? brl(legBrlLado) : ''}{!legEur && !legBrlLado ? eur(0) : ''}
          </b>
          <span>transportes</span>
          <i>{C.legDone(s)} de {s.legs.length} comprados</i>
        </div>
        <div>
          <b>{brl(C.totalBrl(s, CIDADES))}</b>
          <span>total real até agora</span>
          <i>câmbio R$ {num(s.settings.eur_rate).toLocaleString('pt-BR')}</i>
        </div>
      </div>

      {/* ---- a tabela do roteiro: sem datas, ele pediu assim ---- */}
      <div className="card">
        <div className="h">
          <h3>O roteiro, em uma tabela</h3>
          <div className="m">
            {ISOS.length} dias de viagem · {noites} noites · {bases.length} bases · sem contar bate-volta
          </div>
        </div>
        <div className="b">
          <TabelaRoteiro />
        </div>
      </div>

      {/* O cartao "Decisoes de roteiro" ficava aqui, com cinco conselhos
          meus (o carro de Caceres, Toledo/Segovia/Avila, o dia 21 em Metz,
          o dia 28 em Reims, as 8 noites de Roma). Ele o apagou da lista de
          08/09 com uma frase: "Deixa de existir, isso eu que mando".
          A constante DECISOES saiu de src/content junto. */}
      <Pendencias />
    </>
  );
}

function TabelaRoteiro() {
  const { s } = useApp();
  const bases = C.baseList(s);
  if (!bases.length) {
    return (
      <div className="empty">
        O calendário está em branco — escreva a base de cada dia na aba <b>Roteiro</b> e a
        tabela se monta sozinha.
      </div>
    );
  }
  const tot = bases.reduce((a, b) => a + b.nt, 0);
  return (
    <div className="tw">
      <table className="rot">
        <thead>
          <tr>
            <th>Lugar</th>
            <th className="num">Noites</th>
            <th>O que sai daqui de bate-volta</th>
          </tr>
        </thead>
        <tbody>
          {bases.map((b, i) => (
            <tr key={`${b.base}-${i}`}>
              <td className="pl2">{b.base}</td>
              <td className="num">{b.nt}</td>
              <td className="sb">{C.baseOut(b.base, i === bases.length - 1, b)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{bases.length} bases</td>
            <td className="num">{tot}</td>
            <td className="sb">
              {C.groundDays(s)} dias em terra + {C.flyDays(s)} de voo = {ISOS.length} dias de viagem
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * "O que ainda esta aberto" — inteiramente derivado (secao 10.1).
 * O rotulo em caixa alta fica EM CIMA do titulo, na largura inteira:
 * e a classe .bkr.pnd que faz isso.
 */
function Pendencias() {
  const { s } = useApp();
  type Pend = { k: 'res' | 'din' | 'stay' | 'tr'; titulo: string; corpo: string };
  const pend: Pend[] = [];

  for (const r of [...s.bookings].sort((a, b) => a.position - b.position)) {
    if (r.done) continue;
    const v = num(r.amount);
    pend.push({
      k: 'res',
      titulo: r.name,
      // `corpo` vira HTML la embaixo (<Inline html=...>). A nota agora e
      // texto DELE, entao ela entra escapada — senao um "<" solto engole o
      // resto da frase na tela de abertura do app.
      corpo: (v ? `<b>${r.currency === 'eur' ? eur(v) : brl(v)}</b> previstos. ` : '') + marcado(r.note),
    });
  }

  const meta = C.cxMetaBrl(s);
  const acum = C.cxTotalBrl(s);
  if (meta > 0) {
    const falta = C.cxFaltaBrl(s);
    pend.push({
      k: 'din',
      titulo: 'Dinheiro acumulado',
      corpo: falta > 0
        ? `<b>${brl(acum)} de ${brl(meta)}</b> — faltam <b>${brl(falta)}</b>, ou ${brl(C.cxMes(s, null, s.hoje))} por mês, dividido ${plMesAte(C.mesesAte(s.hoje))}. Detalhe na aba Caixa.`
        : `<b>meta batida</b>: ${brl(acum)} guardados. Veja a aba Caixa.`,
    });
  } else {
    pend.push({
      k: 'din',
      titulo: 'Dinheiro acumulado',
      corpo: `Você tem <b>${brl(acum)}</b> em aportes e <b>nenhuma meta definida</b>. Abra a aba <b>Caixa</b>, ponha a meta e lance o que já está guardado — ela divide o que falta pelos meses que sobram.`,
    });
  }

  const semReserva = STAYS.length - C.stayCount(s, CIDADES);
  if (semReserva > 0) {
    pend.push({
      k: 'stay',
      titulo: `${semReserva} de ${STAYS.length} hospedagens sem reserva`,
      corpo: 'A de <b>Amsterdã, 29/12 a 02/01</b>, é a que mais sobe de preço — Réveillon nos Países Baixos. Reserve essa antes de todas.',
    });
  }

  const semComprar = s.legs.length - C.legDone(s);
  if (semComprar > 0) {
    pend.push({
      k: 'tr',
      titulo: `${semComprar} de ${s.legs.length} trechos ainda não comprados`,
      corpo: 'O <b>voo Madrid → Luxemburgo do dia 19</b> é o mais urgente: rota pequena em semana pré-Natal, compre até meados de outubro. Marque a caixinha na aba <b>Transporte</b> quando comprar cada um.',
    });
  }

  const cls = { res: 'now', din: 'hard', stay: '', tr: '' };
  const rotulo = { res: 'burocracia', din: 'dinheiro', stay: 'hospedagem', tr: 'transporte' };

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--rust)' }}>
      <div className="h">
        <h3>O que ainda está aberto</h3>
        <div className="m">
          {pend.length} {pend.length === 1 ? 'pendência' : 'pendências'} · sai do que você marcou nas outras abas
        </div>
      </div>
      <div className="b">
        {!pend.length ? (
          <div className="n free">
            <b>nada pendente</b>
            Reservas resolvidas, hospedagens fechadas, trechos comprados e a meta batida. Boa viagem.
          </div>
        ) : (
          <>
            <div className="bk">
              {pend.map((p, i) => (
                <div key={i} className={`bkr pnd ${cls[p.k]}`.trim()}>
                  <div className="w">{rotulo[p.k]}</div>
                  <div>
                    <h4>{p.titulo}</h4>
                    {p.corpo ? <p><Inline html={p.corpo} /></p> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mono foot" style={{ marginBottom: 0 }}>
              Some daqui marcando a caixinha na aba <b>Reservas</b>, salvando a hospedagem em{' '}
              <b>Hospedagem</b>, ou marcando o trecho como comprado em <b>Transporte</b>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
