'use client';
// ============================================================
// 10.1 — Painel ("Detalhes gerais"). SO LEITURA. Nada se edita aqui.
// Tudo e derivado: o cartao vermelho de pendencias nunca e escrito
// a mao, sai do que ele marcou nas outras abas.
// ============================================================
import { ISOS, STAYS } from '@/content';
import { useState } from 'react';
import Avisos from '@/components/Avisos';
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
  const trPago = C.legSum(s, 'pago');
  const est = C.estimadoSides(s);
  const meta = C.cxMetaBrl(s);
  const trAntes = C.legAhead(s);

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

      {/* ---- os TRES numeros de dinheiro (09/09) ----
          Eram cinco, um por categoria. Ele os trocou na lista de 08/09, e
          definiu os dois primeiros com as proprias palavras em 09/09:

            "Total pago: o que eu ja paguei (a maioria das coisas com
             antecedencia: hospedagem, aviao, documentos, seguros, voos NA
             europa, trens entre paises da europa, atracoes que sao com
             antecedencia)"

            "O total estimado e para eu me preparar para o quanto vou ter
             que levar em dinheiro para viver la esse periodo"

          O ESTIMADO NAO E "O RESTO DO CUSTO": e dinheiro na mao. Por isso o
          rodape dele mostra o lado em EURO — e isso que ele vai carregar.

          O "total real ate agora" e o "ainda por gastar" sairam daqui e
          NAO se perderam: os dois vivem na aba Custos, que e a aba de
          dinheiro. Ver `estimadoSides` em calc.ts para as tres perguntas
          que estes numeros respondem, e por que somar os tres da errado. */}
      <div className="bigsum">
        <div>
          <b>{brl(C.pagoBrl(s, CIDADES))}</b>
          <span>total pago</span>
          <i>{bookPago ? `o voo + ${brl(bookPago)} de burocracia` : 'o voo internacional'}</i>
        </div>
        <div>
          <b>{brl(C.estimadoBrl(s))}</b>
          <span>total estimado</span>
          <i>
            {est.eur ? eur(est.eur) : ''}
            {est.eur && est.brl ? ' + ' : ''}
            {est.brl ? brl(est.brl) : ''}
            {!est.eur && !est.brl ? 'nada lançado ainda' : ' para levar'}
          </i>
        </div>
        <div>
          <b>{brl(C.cxTotalBrl(s))}</b>
          <span>valor acumulado</span>
          <i>{meta > 0 ? `de ${brl(meta)} de meta` : 'sem meta na aba Caixa'}</i>
        </div>
      </div>

      {/* ---- "quantos peguei e quanto gastei" (09/09) ----
          A Tabela 3 da lista de 08/09: "igual a de cima (em design) mas com
          os seguintes itens". O numero GRANDE e a contagem nas tres, e sai
          da frase dele: "Quantos eu peguei (0 de 7) deve ficar grande". O
          dinheiro fica na linha de baixo.

          "Peguei" quer dizer a MESMA coisa nas tres, e e decisao dele de
          09/09: esta num dia do roteiro (atracao), esta fechada com endereco
          (hospedagem), esta marcada como comprada (transporte). Um conceito,
          nao tres.

          A LINHA DO TRANSPORTE conta so os que ele COMPRA ANTES, desde o
          SQL 11 (09/09) — "voos interpaises e trens intercidades". O metro
          do dia a dia nao entra em nenhum dos dois numeros, porque ele
          nunca vai estar pendente. `legAhead` le `buy_ahead`, e ler
          `bought` no lugar daria dois numeros plausiveis e errados. */}
      <div className="bigsum">
        <div>
          <b>{comEndereco} de {STAYS.length}</b>
          <span>hospedagens que eu peguei</span>
          <i>{eur(hosp)} nas fechadas</i>
        </div>
        <div>
          <b>{trAntes.pegos} de {trAntes.total}</b>
          <span>transportes que compro antes</span>
          <i>
            {trPago.eur ? eur(trPago.eur) : ''}
            {trPago.eur && trPago.brl ? ' + ' : ''}
            {trPago.brl ? brl(trPago.brl) : ''}
            {!trPago.eur && !trPago.brl ? eur(0) : ''}{' '}pagos
          </i>
        </div>
        <div>
          <b>{C.attrCount(s, 'roteiro')} de {C.attrCount(s, 'dele')}</b>
          <span>atrações que eu peguei</span>
          <i>{eur(C.attrEurAll(s, 'roteiro'))} no roteiro</i>
        </div>
      </div>

      {/* ---- a tabela do roteiro: sem datas, ele pediu assim ---- */}
      <div className="card">
        <div className="h">
          <h3>O roteiro, em uma tabela</h3>
          <div className="m">
            {ISOS.length} dias de viagem · {noites} {noites === 1 ? 'noite' : 'noites'} reservadas ·{' '}
            {bases.length} {bases.length === 1 ? 'estadia' : 'estadias'}
          </div>
        </div>
        <div className="b">
          <TabelaRoteiro />
          <MeuRascunho />
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

/**
 * O MEU RASCUNHO DO ROTEIRO — o campo a mao que ele pediu (09/09, tarde).
 *
 * "eu quero que tenha um campo personalizavel a mao para eu deixar por
 * enquanto para eu me guiar criando o roteiro (ele pode ter ate um botao de
 * mostrar e esconder)".
 *
 * A tabela de cima e FATO (as estadias reservadas) e hoje esta vazia. Isto
 * e o lugar dele escrever o que quiser enquanto monta a viagem — e some com
 * um clique quando incomodar.
 *
 * SEM SQL: usa o mesmo `Avisos` das outras dez chamadas do app, com um
 * `spot` proprio (`painel:roteiro`). Ele ja conhece esse mecanismo do "+
 * aviso" de Atracoes e Hospedagem: escreve, edita, apaga, e aparece no
 * outro navegador na hora.
 */
function MeuRascunho() {
  const { s } = useApp();
  const quantos = C.avisosDe(s, 'painel:roteiro').length;
  // Nasce ABERTO se ele ja escreveu algo, e fechado se nao: assim o Painel
  // nao ganha um bloco vazio para quem nunca usar, e nunca esconde o que
  // ele escreveu.
  const [aberto, setAberto] = useState(quantos > 0);

  return (
    <div className="rasc">
      <button type="button" className="rascbt" onClick={() => setAberto(!aberto)}>
        {aberto ? '−' : '+'} o meu rascunho do roteiro
        {!aberto && quantos ? <span className="rascn">{quantos}</span> : null}
      </button>
      {aberto ? (
        <>
          <p className="mono foot">
            Escreva aqui o roteiro do jeito que você está pensando. Isto é só seu, não entra
            em conta nenhuma, e a tabela acima continua mostrando o que você <b>reservou</b>.
          </p>
          <Avisos spot="painel:roteiro" rotulo="linha do rascunho" />
        </>
      ) : null}
    </div>
  );
}

function TabelaRoteiro() {
  const { s } = useApp();
  const bases = C.baseList(s);
  if (!bases.length) {
    // A TABELA PASSOU A SER "AS ESTADIAS QUE EU RESERVEI" (09/09). Antes ela
    // se montava com a minha semente e dizia "31 noites em 8 bases" sem ele
    // ter fechado nada — foi essa afirmacao que ele mandou acabar.
    return (
      <div className="empty">
        Nenhuma hospedagem fechada ainda. Marque <b>é esta</b> numa opção da aba{' '}
        <b>Hospedagem</b>, com check-in e check-out, e ela aparece aqui com as noites dela.
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
              <td className="sb">{C.baseOut(b.base)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{bases.length} {bases.length === 1 ? 'estadia' : 'estadias'}</td>
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
