'use client';
// ============================================================
// A fita de países (Fase 7, 05/09/2026) — a assinatura da direção
// "Círculos", que o Leo escolheu olhando.
//
// Substitui os chips de `.subtabs` em Atrações, Comidas, Hospedagem e
// Dicas. O COMPORTAMENTO é o mesmo de antes, linha por linha: o mesmo
// `selCO`, o mesmo `aria-pressed`, o mesmo clique. O que muda é a forma.
//
// O anel usa `--cc`, a cor de país que já existia em `paises-cidades`;
// país sem nada lançado fica com o anel apagado, como uma conta sem
// story. E o número que ficava no chip continua embaixo do nome.
//
// UM SÓ componente para as quatro telas, de propósito: quatro cópias
// desta marcação divergiriam na primeira vez que alguém mexesse numa.
// ============================================================
import { CO, COEMOJI } from '@/content';

export default function Fita({
  sel, onSel, valor,
}: {
  sel: string;
  onSel: (k: string) => void;
  /** O que aparece embaixo do nome. Devolva string vazia para não mostrar nada. */
  valor: (k: string) => string;
}) {
  return (
    <div className="fita" role="tablist" aria-label="países">
      {CO.map((c) => {
        const v = valor(c.k);
        return (
          <button
            key={c.k}
            type="button"
            className="fita-item"
            aria-pressed={sel === c.k}
            style={{ ['--cc' as string]: `var(${c.cc})` }}
            onClick={() => onSel(c.k)}
          >
            <span className="fita-anel">
              <span className="fita-in" aria-hidden="true">{COEMOJI[c.k]}</span>
            </span>
            <span className="fita-nome">{c.n}</span>
            {v ? <span className="fita-vl">{v}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
