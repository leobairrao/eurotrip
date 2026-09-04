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
import { inputInt, inputNum, parseInt10, parseNum, stripTags } from '@/lib/fmt';

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
      onInput={(e) => onCommit(stripTags(e.currentTarget.value))}
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
      onInput={(e) => onCommit(stripTags(e.currentTarget.value))}
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
 * como HTML. O que o usuario digita passa por stripTags antes de salvar,
 * entao nunca chega tag aqui (secao 10.0).
 */
export function Nota({ html, className }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
export function Inline({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
