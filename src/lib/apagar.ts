'use client';
// ============================================================
// O que o × faz, decidido num lugar só (06/09/2026).
//
// Existem DOIS jeitos de tirar uma linha, e escolher errado custa dado:
//
//   `devolver` — a linha veio de uma sugestao minha que ele adotou pelo +.
//                Apaga a linha, tira de `adopted`, NAO escreve killed_seed.
//                A sugestao volta para a aba Sugestoes, com o + de novo.
//
//   `remove`   — a linha e dele: escreveu na mao, ou veio do retrato dele
//                (`m:` atracoes, `f:` comidas, `b:` reservas). Aqui o
//                killed_seed E o comportamento certo: ele apagou de
//                proposito, e a proxima semeadura tem que respeitar.
//
// A prova de qual e qual e `adopted`. Nao e o prefixo do seed_id: prefixo
// e convencao, e convencao se esquece. `adopted` so ganha linha quando o +
// grava, entao "esta em adopted" e exatamente "veio de uma sugestao".
//
// Antes disto havia um caminho so, o `remove`, e ele fazia o pior dos dois
// mundos com sugestao adotada: mandava para killed_seed (de onde nem
// `npm run seed` traz de volta) e deixava a marca em `adopted` (que fazia
// a aba de sugestoes mostrar "na sua lista", sem botao). Foi assim que ele
// perdeu 17 opcoes de hospedagem e 35 atracoes, em dois dias.
// ============================================================
import { useApp } from './store';
import type { Tabela } from './merge';

export function useApagarLinha() {
  const { s, remove, devolver } = useApp();
  return (t: Tabela, pk: string, seedId?: string | null) => {
    if (seedId && s.adopted.includes(seedId)) return devolver(t, pk, seedId);
    return remove(t, pk, seedId);
  };
}
