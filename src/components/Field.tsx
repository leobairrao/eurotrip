'use client';
// ============================================================
// Os campos. Existem por causa da regra 5.15 e da secao 8:
//
//  - sao NAO-CONTROLADOS (defaultValue). Digitar nao re-monta o
//    input, nao perde o foco e nao reformata o numero no meio;
//  - quando chega mudanca da outra pessoa, o valor novo so entra
//    no DOM se o campo NAO estiver com o foco. Nunca rouba o cursor.
// ============================================================
import { useEffect, useId, useRef } from 'react';
import { estaFocado, limparFoco, marcarFoco } from '@/lib/store';
import { inputInt, inputNum, isData, parseInt10, parseNum } from '@/lib/fmt';

interface Base {
  /** Chave unica do campo: "tabela|linha|coluna". E o que protege o foco. */
  fk: string;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
}

/** Sincroniza o DOM com o valor remoto — mas nunca por cima do foco. */
function useRemoto(
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  texto: string,
  fk: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el || estaFocado(fk)) return;  // <- a regra
    if (el.value !== texto) el.value = texto;
  }, [ref, texto, fk]);
}

// ---------------- texto ----------------
// O que ele digita vai para o banco COMO ELE DIGITOU.
//
// Ate 05/09 estes campos passavam por stripTags a cada tecla. Parecia
// prudencia e era destruicao: a regex e /<[^>]*>/g, que nao escapa —
// APAGA. Escrever "metro custa < 2 euros e > 1 zona" gravava "metro
// custa  1 zona", e as quatro palavras sumiam do banco, nao so da tela.
// Era o bug de 04/09 ao contrario, e a revisao de 05/09 o pegou.
//
// Podar aqui deixou de ser necessario quando a SAIDA passou a escapar
// sempre: `marcado()` para nota e aviso, JSX puro no resto. A regra 10.0
// continua cumprida — so que no lugar certo, sem comer o texto dele.
export function TextField({
  value, onCommit, fk, ...r
}: Base & { value: string; onCommit: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useRemoto(ref, value, fk);
  return (
    <input
      ref={ref}
      type="text"
      defaultValue={value}
      onFocus={() => marcarFoco(fk)}
      onBlur={() => limparFoco(fk)}
      onInput={(e) => onCommit(e.currentTarget.value)}
      {...r}
    />
  );
}

// ---------------- area de texto ----------------
export function AreaField({
  value, onCommit, fk, ...r
}: Base & { value: string; onCommit: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useRemoto(ref, value, fk);
  return (
    <textarea
      ref={ref}
      defaultValue={value}
      onFocus={() => marcarFoco(fk)}
      onBlur={() => limparFoco(fk)}
      onInput={(e) => onCommit(e.currentTarget.value)}
      {...r}
    />
  );
}

// ---------------- valor em dinheiro ----------------
// Vazio e vazio, nao zero. Aceita virgula. Nao formata enquanto digita.
export function NumField({
  value, onCommit, fk, ...r
}: Base & { value: number | null; onCommit: (v: number | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useRemoto(ref, inputNum(value), fk);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      defaultValue={inputNum(value)}
      onFocus={() => marcarFoco(fk)}
      onBlur={() => limparFoco(fk)}
      onInput={(e) => onCommit(parseNum(e.currentTarget.value))}
      {...r}
    />
  );
}

// ---------------- inteiro (noites) ----------------
export function IntField({
  value, onCommit, fk, ...r
}: Base & { value: number | null; onCommit: (v: number | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useRemoto(ref, inputInt(value), fk);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      defaultValue={inputInt(value)}
      onFocus={() => marcarFoco(fk)}
      onBlur={() => limparFoco(fk)}
      onInput={(e) => onCommit(parseInt10(e.currentTarget.value))}
      {...r}
    />
  );
}

// ---------------- data (o dia de um aporte) ----------------
// O <input type="date"> ja fala 'aaaa-mm-dd', que e o formato do banco,
// entao nao ha conversao nenhuma no meio.
//
// ESTE CAMPO COMITA NO BLUR, e nao a cada tecla. E de proposito, e a razao
// e a mesma regra 5.15 por outro caminho (achado da revisao de 04/09):
//
//   a lista de aportes se ORDENA pela data. Comitando a cada tecla, digitar
//   o ano "2026" grava 0002, depois 0020, depois 0202 — cada um valido de
//   forma, cada um jogando a linha para outra posicao do extrato. O React
//   move o <div> da linha, o navegador solta o foco do input que esta sendo
//   digitado, e as tres teclas seguintes caem no vazio. O foco nao foi
//   roubado pela outra pessoa; foi roubado pelo proprio teclado.
//
// No blur, a linha so muda de lugar depois que o dedo ja saiu do campo.
// Data que nao existe (ou ano parcial) nao e comitada: o campo volta ao
// que estava. Nunca fica sem dia.
export function DateField({
  value, onCommit, fk, ...r
}: Base & { value: string; onCommit: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useRemoto(ref, value, fk);
  return (
    <input
      ref={ref}
      type="date"
      defaultValue={value}
      onFocus={() => marcarFoco(fk)}
      onBlur={() => {
        limparFoco(fk);
        const v = ref.current?.value ?? '';
        if (isData(v)) { if (v !== value) onCommit(v); }
        else if (ref.current) ref.current.value = value;
      }}
      {...r}
    />
  );
}

// ---------------- campo local, so para os formularios de acrescentar ----------------
export function useLocal(inicial = '') {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const id = useId();
  return {
    id,
    ref,
    get: () => (ref.current?.value ?? inicial).trim(),
    limpar: () => { if (ref.current) ref.current.value = ''; },
  };
}

/**
 * Nota semeada: vem dos JSONs com <b> e <i>, e SO ela e renderizada
 * como HTML. O que o usuario digita nao passa por aqui: ele e pintado
 * por `marcado()`, que escapa tudo antes (secao 10.0).
 */
export function Nota({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
export function Inline({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
