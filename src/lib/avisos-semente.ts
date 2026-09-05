// ============================================================
// De onde os avisos vem na PRIMEIRA vez.
//
// Os JSONs de src/content continuam sendo a minha pesquisa; esta funcao
// os traduz para linhas da tabela `aviso`. E usada em dois lugares que
// tem que concordar:
//   . scripts/seed.mjs, que enche o banco de verdade;
//   . o modo demonstracao, que nao tem banco.
// Se os dois divergirem, a demonstracao deixa de valer como ensaio.
//
// O <b> das minhas notas vira *asterisco* aqui: a partir do banco, o
// corpo do aviso e TEXTO PURO.
// ============================================================
import { CITYNOTE, DAYNOTE, FOOD } from '@/content';
import { deHtml } from './fmt';
import type { Aviso, Tone } from './types';

export type AvisoSemente = Omit<Aviso, 'id'>;

const tom = (v: unknown): Tone =>
  v === 'free' || v === 'alert' ? v : 'warn';

/** Todas as linhas de aviso da primeira carga, na ordem em que aparecem. */
export function avisosSemeados(): AvisoSemente[] {
  const out: AvisoSemente[] = [];

  // o cartao de aviso de cada cidade, na aba Atracoes
  for (const [cidade, a] of Object.entries(CITYNOTE)) {
    out.push({
      spot: `atracoes:${cidade}`, tone: tom(a[0]),
      title: deHtml(a[1]), body: deHtml(a[2]),
      position: 0, seed_id: `av:cidade:${cidade}`,
    });
  }

  // o aviso de um dia, na aba Roteiro
  for (const [iso, a] of Object.entries(DAYNOTE)) {
    out.push({
      spot: `roteiro:${iso}`, tone: tom(a[0]),
      title: deHtml(a[1]), body: deHtml(a[2]),
      position: 0, seed_id: `av:dia:${iso}`,
    });
  }

  for (const f of FOOD) {
    // o aviso do pais
    if (f.warn) {
      out.push({
        spot: `comidas:${f.pais}`, tone: 'warn',
        title: deHtml(f.warn[0]), body: deHtml(f.warn[1]),
        position: 0, seed_id: `av:pais:${f.pais}`,
      });
    }
    // "o que eu acho que nao vale" — uma linha por item
    (f.av ?? []).forEach((a, i) => {
      out.push({
        spot: `comidas:${f.pais}:naovale`, tone: 'warn',
        title: deHtml(a[0]), body: deHtml(a[1]),
        position: i, seed_id: `av:naovale:${f.pais}:${i}`,
      });
    });
  }

  // o "nao conte duas vezes" da aba Transporte (era JSX cravado na tela)
  out.push({
    spot: 'transporte', tone: 'warn',
    title: 'não conte duas vezes',
    body:
      'Bate-volta cujo trem já está no preço da atração — *Sintra, Cascais, Toledo, ' +
      'Segovia, Ávila, Utrecht, Ostia, Nápoles, Florença* — fica só na aba Atrações. ' +
      'Aqui é perna entre bases.',
    position: 0, seed_id: 'av:tela:transporte',
  });

  return out;
}
