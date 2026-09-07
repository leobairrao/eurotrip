'use client';
// ============================================================
// A VISUALIZACAO DE UM DIA (06/09/2026).
//
// O pedido dele: "quando eu clicar em um dia nao devo aparecer em editar,
// quero ver o itinerario do dia mais detalhado". Ate aqui clicar num dia
// era SEMPRE editar — quatro cartoes de formulario.
//
// TRES REGRAS QUE ESTA TELA NAO PODE QUEBRAR:
//
//  1. A CAIXINHA E O [editar] SAO AS UNICAS COISAS CLICAVEIS. Nenhum campo
//     de texto, nenhum `x`, nenhum seletor. Ele vai usar isto com o celular
//     na mao, no frio, no metro — qualquer coisa que se apague por encosto
//     e um defeito.
//  2. A NOTA VEM INTEIRA, nunca cortada. Foi escolha dele entre tres
//     opcoes, e existe porque a informacao que salva o dia mora ali:
//     "GRATIS seg-qui 16h-18h", "fila de ~40 min". Hoje essa nota nao
//     aparece em lugar nenhum do Roteiro.
//  3. FEITO RISCA NO LUGAR — a lista nunca se reordena sozinha. Ele
//     escolheu isso sabendo que continua rolando para achar a proxima; a
//     troca foi "a lista nao danca debaixo do meu dedo".
//
// A ORDEM AINDA NAO E DELE. Todo item nasce com `day_pos = 0`, e as setas
// so chegam na etapa 2. Ate la a lista sai pelo desempate de dia.ts, que e
// estavel mas nao foi escolhida por ninguem — por isso ela NAO NUMERA, e o
// rodape diz que a ordem chega em seguida. Numerar seria a tela afirmando
// uma sequencia que ele nao montou.
// ============================================================
import Avisos from '@/components/Avisos';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import * as D from '@/lib/dia';
import { brl, eur, longDt, marcado, wdOf } from '@/lib/fmt';
import { ISOS } from '@/content';
import { Inline } from '@/components/Field';

export default function Vista({ iso, onEditar }: { iso: string; onEditar: () => void }) {
  const { s, now } = useApp();
  const itens = D.itensDoDia(s, iso);
  const { eur: te, brl: tb } = D.totalDoDia(s, iso);
  const { feitas, total } = D.feitasDoDia(s, iso);
  const d = s.days[iso];
  const base = (d?.base ?? '').trim();
  const plano = (d?.plan ?? '').trim();

  return (
    <div className="card dvista" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>{longDt(iso)}</h3>
        <div className="m">
          {wdOf(iso)} · dia {ISOS.indexOf(iso) + 1} de {ISOS.length}
          {base ? ` · ${base}` : ''}
          {total ? ` · ${feitas} de ${total} feitas` : ''}
        </div>
        <button type="button" className="chip" onClick={onEditar}>editar</button>
      </div>

      <div className="b">
        {/* leitura: o Avisos desenha o cartao dele, e o "mexer" fica la dentro */}
        <Avisos spot={`roteiro:${iso}`} rotulo="aviso do dia" />

        {plano ? <Inline html={marcado(plano)} className="dvplano" /> : null}

        {!itens.length ? (
          <div className="empty">
            Nada marcado neste dia ainda. Clique em <b>editar</b> para escrever o que
            fazer, ou puxar uma atração, um trecho ou um lugar de comer.
          </div>
        ) : (
          <div className="dvlista">
            {itens.map((x) => (
              <div key={`${x.tabela}:${x.id}`} className={`dvit${x.feito ? ' ok' : ''}`}>
                <input
                  className="ck"
                  type="checkbox"
                  checked={x.feito}
                  aria-label={`já fiz: ${x.nome}`}
                  onChange={(e) => now(x.tabela, x.id, 'done', e.currentTarget.checked)}
                />
                <div className="dvnm">
                  {x.emoji} {x.nome}
                </div>
                <div className="dvvl">
                  {x.eur ? eur(x.eur) : ''}
                  {x.eur && x.brl ? ' + ' : ''}
                  {x.brl ? brl(x.brl) : ''}
                </div>
                {x.nota ? <Inline html={marcado(x.nota)} className="dvnota" /> : null}
                <div className="dvsub">{x.sub}</div>
              </div>
            ))}
          </div>
        )}

        <div className="atsum">
          {te || tb ? (
            <>
              <b>{te ? eur(te) : ''}{te && tb ? ' + ' : ''}{tb ? brl(tb) : ''}</b> no dia
            </>
          ) : 'nada a pagar neste dia'}
          {itens.length ? ' · a ordem do dia chega em seguida' : ''}
        </div>
      </div>
    </div>
  );
}
