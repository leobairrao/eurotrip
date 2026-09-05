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
import { CITYNOTE, DAYNOTE, FOOD, STAYS } from '@/content';
import { deHtml } from './fmt';
import { planoDasDicas } from './dicas-destino';
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

  // O aviso de um dia (Fase 4, 05/09): so os tres `alert` continuam no
  // Roteiro. Os outros 15 viraram a aba Dicas, por cidade.
  //
  // ISTO TEM QUE CONCORDAR COM `scripts/mover-avisos.mjs`: e daqui que
  // `carregarDemo` reconstroi os avisos, entao se a semente ficasse com
  // `roteiro:<iso>` a demonstracao nasceria com a aba Dicas vazia e os 18
  // de volta nos dias — e um banco novo pelo ritual do README tambem.
  //
  // O `seed_id` NAO muda (`av:dia:<iso>`), de proposito: e ele que faz
  // `seed.mjs` pular a linha ja semeada em vez de duplicar.
  const plano = planoDasDicas(Object.keys(DAYNOTE));
  for (const [iso, a] of Object.entries(DAYNOTE)) {
    const d = plano.get(iso);
    out.push({
      spot: d?.spot ?? `roteiro:${iso}`,
      tone: tom(a[0]),
      title: d?.title ?? deHtml(a[1]),
      body: d?.body ?? deHtml(a[2]),
      position: d?.position ?? 0,
      seed_id: `av:dia:${iso}`,
    });
  }

  // O `warn` de cada base virou aviso DELE (Fase 6), como ja tinha
  // acontecido em Atracoes e Comidas em 05/09.
  for (const sp of STAYS) {
    if (!sp.warn) continue;
    out.push({
      spot: `stay:${sp.c}`, tone: 'warn',
      title: 'onde não ficar', body: deHtml(sp.warn),
      position: 0, seed_id: `av:stay:${sp.c}`,
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
