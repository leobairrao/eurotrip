'use client';
// ============================================================
// A rede de fora (06/09/2026).
//
// O `error.tsx` ao lado pega o que quebra DENTRO da pagina, e desenha
// bonito porque o layout — e com ele o CSS — ainda esta de pe. Se quem
// quebrar for o proprio layout, o Next joga fora tudo, inclusive as
// folhas de estilo, e chama este arquivo: por isso ele traz `<html>` e
// `<body>` proprios e escreve o estilo na mao. Feio de proposito;
// existe so para NUNCA mais aparecer a tela preta em ingles.
// ============================================================
export default function ErroGeral({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf9f7',
          color: '#1a1a19',
          font: '16px/1.5 system-ui, -apple-system, Segoe UI, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontSize: 26, margin: '0 0 10px', letterSpacing: '-.02em' }}>
            O app tropeçou ao abrir
          </h1>
          <p style={{ margin: '0 0 18px' }}>
            Nada seu se perdeu — os dias, as atrações, a Caixa e as reservas estão no banco,
            intactos. Foi a página que não conseguiu montar.
          </p>
          <button
            onClick={() => reset()}
            style={{
              font: '600 13px system-ui, sans-serif',
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid #1a1a19',
              background: '#1a1a19',
              color: '#faf9f7',
              cursor: 'pointer',
            }}
          >
            tentar de novo
          </button>
          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>
              código do erro: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
