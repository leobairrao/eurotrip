import type { Metadata, Viewport } from 'next';
import './estilo-atual.css';
import './extras.css';
// A identidade "Circulos" (Fase 7). TEM que vir por ultimo: e tudo
// sobrescrita, e os dois de cima ficam intocados de proposito.
import './identidade.css';

const FONTS =
  // Plus Jakarta Sans entrou na Fase 7 e carrega o app inteiro agora. As
  // outras tres ficam: a Bricolage e a Source Serif ainda sao o fallback de
  // `--display` e `--body` do estilo-atual.css (que nao se toca), e a IBM
  // Plex Mono continua sendo o que alinha as colunas de dinheiro.
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap';

export const metadata: Metadata = {
  title: 'Eurotrip 2026',
  description: '10 dez 2026 — 12 jan 2027',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
