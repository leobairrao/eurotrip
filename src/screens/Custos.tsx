'use client';
// ============================================================
// 10.9 — Custos. So o real: o que ele lancou nas outras abas.
// A edicao dos trechos NAO mora aqui (v28): mora na aba Transporte,
// porque um lugar so edita cada coisa.
// ============================================================
import { useRef } from 'react';
import { STAYS, VOO } from '@/content';
import { NumField, TextField, useLocal } from '@/components/Field';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { brl, eur, parseNum } from '@/lib/fmt';
import type { Currency } from '@/lib/types';

const CIDADES = STAYS.map((x) => x.c);

export default function Custos() {
  const { s } = useApp();

  const ho = C.stayTotalAll(s, CIDADES);
  const at = C.attrEurAll(s, 'escolhida');       // regra 5.2: so 'escolhida' entra no custo
  const xe = C.extraEur(s);
  const xb = C.extraBrl(s);
  const tr = C.legSum(s, '');                    // regra 5.10: os trechos entram inteiros
  const rs = C.bookingSum(s, '');
  const rsb = C.bookingBrl(s, '');
  const rt = C.rate(s);
  const tb = C.totalBrl(s, CIDADES);
  const somaEur = ho + at + xe + tr.eur + rs.eur;
  const trTudoBrl = C.legBrl(s, '');   // 11.6: eur x cambio + brl

  return (
    <>
      <div className="panelhead">
        <h2>Custos</h2>
        <p>
          Só o que você lançou. Nada aqui é chute meu: hospedagem vem da aba Hospedagem,
          atrações vêm da sua lista de Atrações, e o resto são linhas suas.
        </p>
      </div>

      <div className="bigsum">
        <div><b>{brl(tb)}</b><span>total real até agora</span></div>
        <div><b>{eur(somaEur)}</b><span>em euros</span></div>
        <div><b>{brl(C.pagoBrl(s))}</b><span>total já pago</span></div>
        {/* O artefato pinta brl(tb - VOO) na primeira vez e o refreshSums conserta
            depois. A secao 11.7 manda totalReal - jaPago, e e isso que fica. */}
        <div><b>{brl(C.aindaPorGastar(s, CIDADES))}</b><span>ainda por gastar</span></div>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Linha</th>
              <th className="num">€</th>
              <th className="num">R$</th>
              <th>de onde vem</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pl2">Voo internacional</td>
              <td className="num">—</td>
              <td className="num">{brl(VOO)}</td>
              <td className="sb">já pago, GRU–MAD ida e volta</td>
            </tr>
            <tr>
              <td className="pl2">Hospedagem</td>
              <td className="num">{eur(ho)}</td>
              <td className="num">{brl(ho * rt)}</td>
              <td className="sb">diárias cheias que você lançou</td>
            </tr>
            <tr>
              <td className="pl2">Atrações</td>
              <td className="num">{eur(at)}</td>
              <td className="num">{brl(at * rt)}</td>
              <td className="sb">
                {C.attrCount(s, 'escolhida')} escolhidas · backlog somaria mais{' '}
                {eur(C.attrEurAll(s, 'backlog'))}
              </td>
            </tr>
            <tr>
              <td className="pl2">Transportes</td>
              <td className="num">{eur(tr.eur)}</td>
              <td className="num">{brl(trTudoBrl)}</td>
              <td className="sb">
                {C.legWithVal(s)} de {s.legs.length} trechos com valor · {C.legDone(s)} comprados,{' '}
                {brl(C.legBrl(s, 'pago'))} já pago
              </td>
            </tr>
            <tr>
              <td className="pl2">Burocracia</td>
              <td className="num">{rs.eur ? eur(rs.eur) : '—'}</td>
              <td className="num">{brl(rsb)}</td>
              <td className="sb">
                passaporte, seguro, chip… · {brl(C.bookingBrl(s, 'pago'))} já pago
              </td>
            </tr>
            {/* as duas ultimas so aparecem se ele tiver linha naquela moeda */}
            {xe ? (
              <tr>
                <td className="pl2">Outras linhas em €</td>
                <td className="num">{eur(xe)}</td>
                <td className="num">{brl(xe * rt)}</td>
                <td className="sb">suas linhas abaixo</td>
              </tr>
            ) : null}
            {xb ? (
              <tr>
                <td className="pl2">Outras linhas em R$</td>
                <td className="num">—</td>
                <td className="num">{brl(xb)}</td>
                <td className="sb">suas linhas abaixo</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{eur(somaEur)}</td>
              <td className="num">{brl(tb)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---- transportes: a edicao mudou para a aba Transporte (v28) ---- */}
      <div className="card" style={{ ['--cc' as string]: 'var(--c-fr)' }}>
        <div className="h">
          <h3>Transportes entre as bases</h3>
          <div className="m">
            {s.legs.length} trechos · {C.legWithVal(s)} com valor · {C.legDone(s)} comprados
          </div>
        </div>
        <div className="b">
          <p>
            Os trechos moram na aba <b>Transporte</b> agora, com tipo, dia e a caixinha de
            comprado. Aqui fica só a soma: <b>{brl(trTudoBrl)}</b>, dos quais{' '}
            <b>{brl(C.legBrl(s, 'pago'))}</b> já pago e <b>{brl(C.legBrl(s, 'falta'))}</b> ainda
            previsto.
          </p>
          {/* regra 5.12 */}
          <div className="n warn">
            <b>não conte duas vezes</b>
            Bate-volta cujo trem já está no preço da atração — <b>Sintra, Cascais, Toledo,
            Segovia, Ávila, Utrecht, Ostia, Nápoles, Florença</b> — fica só na aba Atrações.
            A aba Transporte é perna entre bases.
          </div>
        </div>
      </div>

      <OutrasLinhas />

      {/* ---- a minha estimativa: referencia, NAO entra em soma nenhuma ---- */}
      <div className="card">
        <div className="h">
          <h3>Minha estimativa, para referência</h3>
          <div className="m">04/09 · não entra em nenhuma soma acima</div>
        </div>
        <div className="b">
          <p>
            Com o <b>seu perfil</b> — hospedagem sempre em bairro afastado e dividida, trem sempre
            o mais barato, e &quot;um ou outro&quot; passeio — a conta fecha em{' '}
            <b>€ 2.795, uns R$ 16.770</b>. Contra os R$ 19.920 que sobram depois do voo
            internacional, <b>sobram uns R$ 3.150</b>.
          </p>
          <p className="mono">
            hospedagem € 1.062 · transporte € 640 · comida € 788 · passeios € 180 · seguro, chip e
            presentes € 125
          </p>
          <div className="n warn">
            <b>onde está o risco</b>
            Amsterdã são <b>€ 272</b> da sua parte em 4 noites — quase o mesmo que Roma em 8. É a
            única linha que estoura sozinha, e sobe todo mês. Reserve primeiro.
          </div>
          <div className="n free">
            <b>as economias que mais pesam</b>
            Dormir em <b>Metz</b> e não em Estrasburgo (€ 28–92 contra € 289–411 na semana do
            mercado). O <b>TER no lugar do TGV</b> nos dois bate-voltas de Paris, uns R$ 600.
            As <b>janelas grátis</b>: Palacio Real 16h–18h com passaporte, Prado 18h–20h, e o{' '}
            <b>transporte inteiro de Luxemburgo</b>. E <b>menú del día no almoço</b> — a diferença
            entre € 25 e € 40 por dia, uns R$ 2.400 em 31 dias.
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * "Suas outras linhas" — as linhas livres dele, mais o cambio.
 * O cambio mora aqui porque e o numero que multiplica toda a tabela acima.
 */
function OutrasLinhas() {
  const { s, patch, now, remove } = useApp();

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Suas outras linhas</h3>
        <div className="m">
          comida, transporte urbano, chip, seguro, presentes — o que você quiser contar
        </div>
      </div>
      <div className="b">
        {!s.extras.length ? (
          <div className="empty">Nenhuma linha ainda.</div>
        ) : (
          <div className="mt">
            {s.extras.map((x) => (
              <div key={x.id} className="mrow x3">
                <TextField
                  fk={`extra|${x.id}|name`}
                  value={x.name}
                  onCommit={(v) => patch('extra', x.id, 'name', v)}
                  className="nv"
                  aria-label="nome"
                />
                <NumField
                  fk={`extra|${x.id}|amount`}
                  value={x.amount}
                  onCommit={(v) => patch('extra', x.id, 'amount', v)}
                  className="pv"
                  aria-label="valor"
                />
                <select
                  aria-label="moeda"
                  value={x.currency === 'brl' ? 'brl' : 'eur'}
                  onChange={(e) => now('extra', x.id, 'currency', e.currentTarget.value)}
                >
                  <option value="eur">€</option>
                  <option value="brl">R$</option>
                </select>
                <button
                  type="button"
                  className="xb"
                  aria-label="tirar"
                  onClick={() => void remove('extra', x.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Acrescentar />

        <div className="fld" style={{ marginTop: 18, maxWidth: 220 }}>
          <label>Câmbio: R$ por euro</label>
          {/* cambio zero ou negativo apagaria a tabela inteira — so entra > 0 */}
          <NumField
            fk="settings|1|eur_rate"
            value={s.settings.eur_rate}
            onCommit={(v) => { if (v !== null && v > 0) patch('settings', '1', 'eur_rate', v); }}
            aria-label="câmbio: R$ por euro"
          />
        </div>
      </div>
    </div>
  );
}

/** O formulario de acrescentar: campo local, nada vai ao banco antes do botao. */
function Acrescentar() {
  const { insert } = useApp();
  const nome = useLocal();
  const valor = useLocal();
  const moeda = useRef<HTMLSelectElement>(null);

  const acrescentar = async () => {
    const n = nome.get();
    if (!n) return;
    const m: Currency = moeda.current?.value === 'brl' ? 'brl' : 'eur';
    const r = insert('extra', { name: n, amount: parseNum(valor.get()), currency: m });
    // So limpa depois de o banco confirmar (secao 8, promessa 3): antes de
    // 05/09 o campo era limpo sempre, e um insert que falhava comia o que
    // ele digitou. O rodape avisa; o texto fica na tela para ele tentar.
    if (!(await r).ok) return;
    nome.limpar();
    valor.limpar();
    if (moeda.current) moeda.current.value = 'eur';
  };

  return (
    <div className="addrow three">
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="ex. comida em Madrid"
        aria-label="nome da linha"
      />
      <input
        ref={(el) => { valor.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="valor"
        aria-label="valor da linha"
      />
      <select ref={moeda} defaultValue="eur" aria-label="moeda da linha">
        <option value="eur">€</option>
        <option value="brl">R$</option>
      </select>
      <button type="button" onClick={() => void acrescentar()}>adicionar</button>
    </div>
  );
}
