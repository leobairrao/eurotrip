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
// A ORDEM E DELE desde a etapa 2 (08/09/2026): ele a monta com as setas do
// editor, e o rodape parou de prometer o que ja chegou.
//
// Esta tela continua NAO NUMERANDO, e isso nao mudou nem vai mudar: a
// caixinha de feito E o marcador da linha, e dois marcadores diriam a mesma
// coisa duas vezes. Os numeros aparecem so no editor, ao lado das setas,
// que e onde saber "esta e a terceira" importa para mover.
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
  const passa = C.cidadesDoDia(s, iso);
  const hosp = C.hospedagemDoDia(s, iso);

  return (
    <div className="card dvista" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>{longDt(iso)}</h3>
        <div className="m">
          {wdOf(iso)} · dia {ISOS.indexOf(iso) + 1} de {ISOS.length}
          {total ? ` · ${feitas} de ${total} feitas` : ''}
        </div>
        {/* ONDE ELE VAI vem antes de onde ele dorme (09/09). A base desceu
            para a linha do fim da lista, junto das atracoes e das comidas —
            "as cidades que vou dormir vao aparecer no fim da lista". */}
        {passa.length ? <div className="dvcid">{passa.join(' · ')}</div> : null}
        <button type="button" className="chip" onClick={onEditar}>editar</button>
      </div>

      <div className="b">
        {/* leitura: nem o "mexer" nem o "+ aviso do dia" aparecem aqui —
            a regra 1 do cabecalho desta tela vale tambem para o Avisos */}
        <Avisos spot={`roteiro:${iso}`} rotulo="aviso do dia" somenteLeitura />

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

        {/* A CAMA, no fim da lista. So leitura: quem manda nela e a
            hospedagem marcada (a opcao com check-in e check-out que cobre
            este dia), e o campo do cartao do dia e o que sobra para os dias
            que nenhuma hospedagem cobre. */}
        {base ? (
          <div className="dvcama">
            🛏️ durmo em <b>{base}</b>
            {hosp ? <span className="dvcs">{hosp.name}</span> : null}
          </div>
        ) : null}

        <div className="atsum">
          {te || tb ? (
            <>
              <b>{te ? eur(te) : ''}{te && tb ? ' + ' : ''}{tb ? brl(tb) : ''}</b> no dia
            </>
          ) : 'nada a pagar neste dia'}
        </div>
      </div>
    </div>
  );
}
