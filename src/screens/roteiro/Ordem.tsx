'use client';
// ============================================================
// A ORDEM DO DIA (etapa 2, 08/09/2026).
//
// Ate aqui o dia nao tinha ordem nenhuma: atracao, trecho, comida e item
// livre eram quatro listas soltas, cada uma dentro do proprio cartao. Nao
// dava para por um restaurante entre duas atracoes porque eles nem se
// viam. A visualizacao ja mostrava os quatro juntos, mas numa sequencia
// que EU escolhi — e dizia isso no rodape, de proposito.
//
// DUAS COISAS QUE ESTA TELA NAO PODE QUEBRAR:
//
//  1. A LISTA QUE VAI PARA AS SETAS E A QUE ESTA NA TELA. `moverNoDia`
//     depende disso, e o comentario dele em `dia.ts` explica por que.
//     Aqui isso quer dizer: passe `lista` — a mesma que o `map` desenha —
//     e nunca `D.itensDoDia(...)` de novo, que ignoraria o
//     `useOrdemEstavel` e moveria a linha errada enquanto ele digita.
//
//  2. O `x` FAZ COISAS DIFERENTES POR ORIGEM. Atracao, trecho e comida
//     voltam para a aba delas (`day_iso = null`, regra 5.3): tirar do dia
//     nao desfaz a escolha, e apagar ali custaria o backlog dele. O item
//     livre nao existe em lugar nenhum alem deste dia — nele o `x` APAGA,
//     e o rotulo do botao tem que dizer isso antes do clique.
// ============================================================
import { useApp, useOrdemEstavel } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { Inline, NumField, TextField } from '@/components/Field';
import * as D from '@/lib/dia';
import { brl, eur, marcado } from '@/lib/fmt';

export default function Ordem({ iso }: { iso: string }) {
  const { s, now, patch } = useApp();
  const apagar = useApagarLinha();

  // `useOrdemEstavel` segura o rearranjo enquanto o dedo esta num campo do
  // item livre — a unica linha desta lista que tem campo.
  const lista = useOrdemEstavel(D.itensDoDia(s, iso), 'day_item|');

  const irPara = (id: string, dir: -1 | 1) => {
    for (const w of D.moverNoDia(lista, id, dir)) {
      now(w.tabela, w.id, 'day_pos', w.day_pos);
    }
  };

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>A ordem do dia</h3>
        <div className="m">
          {lista.length
            ? <>{lista.length}{lista.length === 1 ? ' item' : ' itens'} · as setas arrumam a sequência</>
            : 'ainda não há nada neste dia'}
        </div>
      </div>
      <div className="b">
        {!lista.length ? (
          <div className="empty">
            Nada neste dia ainda. Escreva um item ou puxe da sua lista no cartão
            abaixo — a ordem aparece aqui.
          </div>
        ) : (
          <div className="mt">
            {lista.map((x, ix) => {
              const livre = x.tabela === 'day_item';
              return (
                <div
                  key={`${x.tabela}:${x.id}`}
                  className={`mrow do5${x.feito ? ' feito' : ''}`}
                >
                  <span className="ordb">
                    <button
                      type="button"
                      onClick={() => irPara(x.id, -1)}
                      disabled={ix === 0}
                      title="subir um lugar"
                      aria-label={`subir ${x.nome} um lugar`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => irPara(x.id, 1)}
                      disabled={ix === lista.length - 1}
                      title="descer um lugar"
                      aria-label={`descer ${x.nome} um lugar`}
                    >
                      ↓
                    </button>
                  </span>
                  <div className="don">{ix + 1}</div>

                  {/* O ITEM LIVRE E A UNICA LINHA COM CAMPOS, e foi escolha
                      dele entre tres opcoes: atracao, trecho e comida se
                      editam na aba delas; o 📌 nao tem aba nenhuma. Se nao
                      der para consertar aqui, nao da em lugar nenhum, e um
                      acento errado custaria a nota inteira. */}
                  {livre ? (
                    /* O emoji fica FORA do campo, e nao dentro do valor: ele e
                       marcador de TIPO, igual ao das outras tres linhas, e nao
                       texto que ele escreveu. Sem isto a linha do item livre
                       nasce sem marcador nenhum e para de se parecer com uma
                       linha da mesma lista — so a tela mostra isso. */
                    <div className="donm dolivre">
                      <span aria-hidden="true">{x.emoji}</span>
                      <TextField
                        fk={`day_item|${x.id}|name`}
                        value={x.nome}
                        onCommit={(v) => patch('day_item', x.id, 'name', v)}
                        className="nv"
                        aria-label="o que é este item"
                      />
                    </div>
                  ) : (
                    <div className="donm">{x.emoji} {x.nome}</div>
                  )}

                  {livre ? (
                    <>
                      <NumField
                        fk={`day_item|${x.id}|amount`}
                        value={x.eur || x.brl || null}
                        onCommit={(v) => patch('day_item', x.id, 'amount', v)}
                        className="pv"
                        placeholder="quanto custa"
                        aria-label="quanto custa"
                      />
                      {/* regra 5.11: a moeda ao lado do valor, sempre visivel */}
                      <select
                        value={x.brl ? 'brl' : 'eur'}
                        onChange={(e) => now('day_item', x.id, 'currency', e.currentTarget.value)}
                        aria-label="moeda"
                      >
                        <option value="eur">€</option>
                        <option value="brl">R$</option>
                      </select>
                    </>
                  ) : (
                    <div className="dovl">
                      {x.eur ? eur(x.eur) : ''}
                      {x.eur && x.brl ? ' + ' : ''}
                      {x.brl ? brl(x.brl) : ''}
                    </div>
                  )}

                  {/* O x, e ele NAO e o mesmo botao nas quatro origens. */}
                  <button
                    className="xb"
                    title={livre ? 'apagar de vez' : 'tirar deste dia'}
                    aria-label={
                      livre ? `apagar ${x.nome} de vez` : `tirar ${x.nome} deste dia`
                    }
                    onClick={() =>
                      livre
                        ? void apagar('day_item', x.id)
                        : now(x.tabela, x.id, 'day_iso', null)
                    }
                  >
                    ×
                  </button>

                  <div className="wh nt">
                    <span className={`dtg ${x.classe}`}>{x.sub}</span>
                    {livre ? (
                      <TextField
                        fk={`day_item|${x.id}|note`}
                        value={x.nota}
                        onCommit={(v) => patch('day_item', x.id, 'note', v)}
                        className="wv"
                        placeholder="uma nota sua"
                        aria-label="nota"
                      />
                    ) : x.nota ? (
                      <Inline html={marcado(x.nota)} className="wv" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mono foot" style={{ margin: '12px 0 0' }}>
          O <b>×</b> de uma atração, de um trecho ou de um lugar de comer só{' '}
          <b>tira deste dia</b> — a linha volta para a aba dela, com tudo que você
          escreveu. O <b>×</b> de um item escrito por você <b>apaga de vez</b>: ele não
          existe em lugar nenhum além deste dia.
        </p>
      </div>
    </div>
  );
}
