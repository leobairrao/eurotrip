'use client';
// ============================================================
// 10.1 — Painel ("Detalhes gerais"). SO LEITURA. Nada se edita aqui.
// Tudo e derivado: o cartao vermelho de pendencias nunca e escrito
// a mao, sai do que ele marcou nas outras abas.
// ============================================================
import { DECISOES, ISOS, STAYS } from '@/content';
import { Inline } from '@/components/Field';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { brl, daysTo, eur, num, plMesAte } from '@/lib/fmt';

const CIDADES = STAYS.map((s) => s.c);

export default function Painel() {
  const { s } = useApp();

  const dep = daysTo('2026-12-10', s.hoje);
  const bases = C.baseList(s);
  const noites = C.nightsAll(s);
  const voo = C.flyDays(s);
  const legEur = C.legSum(s, '').eur;
  const legBrlLado = C.legSum(s, '').brl;
  const hosp = C.stayTotalAll(s, CIDADES);
  const comEndereco = C.stayCount(s, CIDADES);
  const bookPago = C.bookingBrl(s, 'pago');

  return (
    <>
      <div className="panelhead">
        <h2>Detalhes gerais</h2>
        <p>
          <b>Roteiro fechado em 04/09.</b> Oito bases, e os bate-voltas saem de dentro delas.
          Tudo continua editável dia por dia na aba Roteiro. O custo é só o que você lançar.
        </p>
      </div>

      {/* ---- os quatro indicadores ---- */}
      <div className="kpi">
        <div>
          <b>{dep}</b>
          <span>dias até embarcar</span>
          <small>10 dez, 20h15 de Florianópolis — voo pago</small>
        </div>
        <div>
          <b>{ISOS.length}</b>
          <span>dias de viagem</span>
          <small>
            {bases.length
              ? `${noites} noites na Europa · ${bases.length} bases · ${voo} ${voo === 1 ? 'dia' : 'dias'} só de voo`
              : `${ISOS.length} dias no calendário, ainda em branco`}
          </small>
        </div>
        <div>
          <b>{C.attrCount(s, 'escolhida')}</b>
          <span>atrações escolhidas</span>
          <small>
            {C.attrCount(s, 'backlog')} no backlog · {C.attrCount(s, 'sugerida')} sugeridas por mim
          </small>
        </div>
        <div>
          <b>{comEndereco}/{STAYS.length}</b>
          <span>hospedagens fechadas</span>
          <small>diária cheia, sem divisão</small>
        </div>
      </div>

      {/* ---- os cinco numeros de dinheiro, nesta ordem (foi pedida) ---- */}
      <div className="bigsum b5">
        <div>
          <b>{brl(C.pagoBrl(s))}</b>
          <span>total já pago</span>
          <i>{bookPago ? `o voo + ${brl(bookPago)} de burocracia` : 'o voo internacional'}</i>
        </div>
        <div>
          <b>{eur(hosp)}</b>
          <span>hospedagem</span>
          <i>{comEndereco} de {STAYS.length} bases lançadas</i>
        </div>
        <div>
          <b>{eur(C.attrEurAll(s, 'escolhida'))}</b>
          <span>atrações</span>
          <i>{C.attrCount(s, 'escolhida')} escolhidas</i>
        </div>
        <div>
          <b>{eur(legEur)}</b>
          <span>transportes</span>
          <i>
            {C.legDone(s)} de {s.legs.length} comprados
            {legBrlLado ? ` · mais ${brl(legBrlLado)}` : ''}
          </i>
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
          <p className="mono foot" style={{ marginBottom: 0 }}>
            A tabela sai do calendário: se você mudar a base de um dia na aba <b>Roteiro</b>,
            ela se refaz aqui.
          </p>
        </div>
      </div>

      <Pendencias />

      {/* ---- as decisoes de roteiro, que sao outra coisa ---- */}
      <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
        <div className="h">
          <h3>Decisões de roteiro</h3>
          <div className="m">isto não trava nada — dá para decidir em cima da hora</div>
        </div>
        <div className="b">
          <ul className="pl">
            {DECISOES.map((d, i) => (
              <li key={i}><Inline html={d} /></li>
            ))}
          </ul>
        </div>
      </div>
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
      corpo: (v ? `<b>${r.currency === 'eur' ? eur(v) : brl(v)}</b> previstos. ` : '') + (r.note || ''),
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
