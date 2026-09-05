'use client';
// ============================================================
// 10.6 — Hospedagem. Um cartao por base (as 7 de STAYS, nessa ordem).
// O texto do bairro (area/res/warn) e MEU, semeado: nao e editavel,
// nao apaga e nao soma (regra 5.6 aplicada ao conteudo fixo da 6.3).
// O que ele escreve e so o formulario da linha `stay`.
// ============================================================
import { CT, STAYS, ccOf, type StaySpec } from '@/content';
import { AreaField, Inline, NumField, IntField, TextField } from '@/components/Field';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { EMPTY_STAY } from '@/lib/types';
import { brl, eur, num } from '@/lib/fmt';

const CIDADES = STAYS.map((x) => x.c);

export default function Hospedagem() {
  const { s } = useApp();
  const tt = C.stayTotalAll(s, CIDADES);

  return (
    <>
      <div className="panelhead">
        <h2>Hospedagem</h2>
        <p>
          Os bairros que valem em cada base candidata — baratos, seguros e em cima de transporte.
          A diária é a <b>diária cheia do anúncio</b>, sem dividir: a divisão a gente resolve
          quando souber quem vai em qual trecho.
        </p>
      </div>

      {/* ---- os tres numeros do topo ---- */}
      <div className="bigsum">
        <div>
          <b>{C.stayCount(s, CIDADES)}/{STAYS.length}</b>
          <span>com endereço salvo</span>
        </div>
        <div>
          <b>{eur(tt)}</b>
          <span>diárias cheias somadas</span>
        </div>
        <div>
          <b>{brl(tt * C.rate(s))}</b>
          <span>em reais</span>
        </div>
      </div>

      {STAYS.map((sp) => (
        <Base key={sp.c} sp={sp} />
      ))}

      <p className="mono foot">
        Paris saiu daqui: virou bate-volta de Amsterdã, você não dorme lá. Em Amsterdã, a base é{' '}
        <b>Haarlem</b> — 15 min de trem e fora da taxa municipal de 12,5%.
      </p>
    </>
  );
}

function Base({ sp }: { sp: StaySpec }) {
  const { s, patch } = useApp();
  const city = sp.c;
  const st = s.stays[city] ?? EMPTY_STAY(city);
  const tot = C.stayTotal(s, city);
  const nt = num(st.nights);
  // total_eur preenchido manda na conta e a diaria e ignorada (11.5).
  // O rotulo tem que usar o MESMO teste do C.stayTotal (verdadeiro/falso,
  // nao "> 0"), senao ele mente sobre qual formula deu o numero.
  const lancado = num(st.total_eur) !== 0;
  const end = st.address.trim();

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${ccOf(city)})` }}>
      <div className="h">
        <h3>{CT[city].n}</h3>
        <div className="m">
          {sp.area}
          {nt ? ` · ${nt}${nt > 1 ? ' noites' : ' noite'}` : ''}
        </div>
      </div>
      <div className="b">
        <p><Inline html={sp.res} /></p>
        {sp.warn ? (
          <div className="n warn">
            <b>Atenção</b>
            <Inline html={sp.warn} />
          </div>
        ) : null}

        {/* ---- o resumo do que ja esta fechado: so com endereco salvo ---- */}
        {end ? (
          <div className="saved">
            <span className="k">fechado</span>
            <div className="v">{st.address}</div>
            {st.check_in || st.check_out ? (
              <div className="x mono">{st.check_in || '?'} → {st.check_out || '?'}</div>
            ) : null}
            {st.notes ? <div className="x">{st.notes}</div> : null}
            {st.link ? (
              <div className="x">
                <a href={st.link} target="_blank" rel="noopener">{st.link}</a>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="form">
          <div className="fld">
            <label>Endereço</label>
            <TextField
              fk={`stay|${city}|address`}
              value={st.address}
              onCommit={(v) => patch('stay', city, 'address', v)}
              placeholder="rua, número, bairro"
              aria-label="endereço"
            />
          </div>
          <div className="frow">
            <div className="fld">
              <label>Check-in</label>
              <TextField
                fk={`stay|${city}|check_in`}
                value={st.check_in}
                onCommit={(v) => patch('stay', city, 'check_in', v)}
                placeholder="dia · hora"
                aria-label="check-in"
              />
            </div>
            <div className="fld">
              <label>Check-out</label>
              <TextField
                fk={`stay|${city}|check_out`}
                value={st.check_out}
                onCommit={(v) => patch('stay', city, 'check_out', v)}
                placeholder="dia · hora"
                aria-label="check-out"
              />
            </div>
          </div>
          <div className="frow3">
            {/* diaria CHEIA do anuncio, sem dividir (regra 5.7) */}
            <div className="fld">
              <label>Diária cheia €</label>
              <NumField
                fk={`stay|${city}|nightly_eur`}
                value={st.nightly_eur}
                onCommit={(v) => patch('stay', city, 'nightly_eur', v)}
                placeholder="ex. 68"
                aria-label="diária cheia em euros"
              />
            </div>
            <div className="fld">
              <label>Noites</label>
              <IntField
                fk={`stay|${city}|nights`}
                value={st.nights}
                onCommit={(v) => patch('stay', city, 'nights', v)}
                placeholder="ex. 4"
                aria-label="noites"
              />
            </div>
            <div className="fld">
              <label>Total € (se souber)</label>
              <NumField
                fk={`stay|${city}|total_eur`}
                value={st.total_eur}
                onCommit={(v) => patch('stay', city, 'total_eur', v)}
                placeholder="total, se souber"
                aria-label="total em euros"
              />
            </div>
          </div>
          <div className="calcline">
            {tot ? `${lancado ? 'total lançado' : 'diária × noites'}: ${eur(tot)} · ${brl(tot * C.rate(s))}` : ''}
          </div>
          <div className="fld">
            <label>Link da reserva</label>
            <TextField
              fk={`stay|${city}|link`}
              value={st.link}
              onCommit={(v) => patch('stay', city, 'link', v)}
              placeholder="https://"
              aria-label="link da reserva"
            />
          </div>
          <div className="fld">
            <label>Anotações</label>
            <AreaField
              fk={`stay|${city}|notes`}
              value={st.notes}
              onCommit={(v) => patch('stay', city, 'notes', v)}
              placeholder="código do portão, wifi, contato do anfitrião, como chegar do aeroporto…"
              aria-label="anotações"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
