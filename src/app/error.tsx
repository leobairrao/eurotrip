'use client';
// ============================================================
// A rede embaixo do app (06/09/2026).
//
// Ate hoje NAO existia nenhuma: qualquer tropeco de uma tela virava a
// tela preta do Next — "Application error: a client-side exception has
// occurred" — sem uma palavra em portugues, sem botao, sem pista. Foi
// assim que uma cidade chamada "teste" tirou o app do ar duas vezes.
//
// O `reset()` do Next remonta a arvore sem recarregar a pagina. Numa
// falha de desenho (o caso da cidade) ele cai de novo na hora, e por
// isso o texto abaixo NAO promete que resolve: oferece as duas saidas
// na ordem certa — tentar, e recarregar.
//
// Isto pega o que quebra DENTRO da pagina. O que quebra no layout de
// fora e do `global-error.tsx`, ao lado.
// ============================================================
import { useEffect } from 'react';

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // O console e o unico lugar onde a mensagem real sobrevive: a tela
  // mostra portugues, e quem for consertar precisa do erro cru.
  useEffect(() => {
    console.error('[eurotrip] a tela caiu:', error);
  }, [error]);

  return (
    <main>
      <div className="card" style={{ ['--cc' as string]: 'var(--rust)', marginTop: 40 }}>
        <div className="h">
          <h3>Esta tela tropeçou</h3>
          <div className="m">nada seu se perdeu — o que está no banco continua lá</div>
        </div>
        <div className="b">
          <p>
            Alguma coisa nesta aba não conseguiu ser desenhada. O resto da viagem está
            inteiro: os dias, as atrações, a Caixa e as reservas não foram tocados.
          </p>
          <div className="chips" style={{ marginTop: 16 }}>
            <button className="chip" onClick={() => reset()}>tentar de novo</button>
            <button className="chip" onClick={() => window.location.reload()}>
              recarregar a página
            </button>
            <a className="chip" href="/">voltar ao Painel</a>
          </div>
          <div className="n warn" style={{ marginTop: 18 }}>
            <b>se ela cair de novo no mesmo lugar</b>
            Então não foi um tropeço de momento, é defeito — me diga o que você tinha acabado
            de fazer (o botão que clicou, o que digitou). É essa frase que encontra a causa.
          </div>
          {error.digest ? (
            <div className="m" style={{ marginTop: 12 }}>código do erro: {error.digest}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
