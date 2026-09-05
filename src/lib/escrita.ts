// ============================================================
// As regras de escrita no banco, fora do React para poderem ser
// testadas (achado da revisao de 05/09).
//
// A terceira promessa da secao 8 e "o que ele digitou nunca e
// descartado em silencio: se a rede cair, enfileira e tenta de
// novo". Ate 05/09 isso estava implementado como "tenta de novo
// PARA SEMPRE" — e ai a promessa se voltava contra o projeto:
//
//   enquanto a chave esta na fila, `merge.ts` PRESERVA aquela
//   coluna contra toda mudanca remota (merge.ts:118-121).
//
// Entao um erro PERMANENTE — um check violado, uma coluna que nao
// existe, RLS negando — nao so travava o app em "erro": congelava
// aquela coluna daquela linha contra o que a outra pessoa
// escrevesse, ate alguem dar F5. E o modo de falha exato de uma
// migracao malfeita, e as Fases 5 e 6 trazem duas.
//
// A distincao que faltava: "nao cheguei no servidor" (repete) nao
// e a mesma coisa que "o servidor disse nao" (para e avisa).
// ============================================================

/** Quantas vezes se insiste antes de desistir. 6 = ~50 s no total. */
export const MAX_TENTATIVAS = 6;

export type Falha =
  /** Nao chegou no servidor: rede caiu, DNS, aba dormindo. Repetir faz sentido. */
  | { tipo: 'rede'; msg: string }
  /** O servidor respondeu, e respondeu NAO. Repetir igual da o mesmo nao. */
  | { tipo: 'recusa'; msg: string; code: string | null };

export type Decisao =
  | { acao: 'repetir'; espera: number }
  | { acao: 'desistir'; motivo: 'permanente' | 'tentativas' };

/**
 * Codigos do Postgres que significam "tente de novo", nao "voce esta
 * errado": serializacao, deadlock, conexao e consulta cancelada.
 * Todo o resto — check, coluna inexistente, RLS, chave duplicada —
 * vai dar exatamente o mesmo erro na proxima tentativa.
 */
const TRANSITORIOS = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '53300', // too_many_connections
  '57014', // query_canceled
  '08000', '08003', '08006', // connection exception
]);

/** O erro que o PostgREST devolveu (ou null, se deu certo). */
export function daResposta(
  error?: { message?: string; code?: string | null } | null,
): Falha | null {
  if (!error) return null;
  return {
    tipo: 'recusa',
    msg: error.message ?? 'o banco recusou',
    code: error.code ?? null,
  };
}

/** O que foi lancado: nunca chegou no servidor. */
export function daExcecao(e: unknown): Falha {
  return { tipo: 'rede', msg: e instanceof Error ? e.message : String(e) };
}

/**
 * Repetir ou desistir. `tentativa` comeca em 0.
 *
 * A recusa permanente desiste na PRIMEIRA — insistir nela e o que
 * congelava a coluna contra a outra pessoa.
 */
export function decidir(f: Falha, tentativa: number): Decisao {
  const permanente = f.tipo === 'recusa' && !(f.code && TRANSITORIOS.has(f.code));
  if (permanente) return { acao: 'desistir', motivo: 'permanente' };
  if (tentativa >= MAX_TENTATIVAS) return { acao: 'desistir', motivo: 'tentativas' };
  return { acao: 'repetir', espera: Math.min(30000, 800 * Math.pow(2, tentativa)) };
}

/**
 * O `x`. A ORDEM e o conteudo desta funcao.
 *
 * Ate 05/09 o killed_seed era gravado ANTES do DELETE. Se o DELETE
 * falhasse, o item sumia da tela, continuava no banco, e o seed_id
 * ficava PARA SEMPRE na lista de "nunca mais traga de volta"
 * (regra 5.14) — sem desfazer pelo app. Agora o item so entra
 * naquela lista depois de o banco confirmar que ele saiu.
 */
export async function apagar(
  ops: {
    // PromiseLike, e nao Promise: o construtor de consulta do Supabase e
    // "thenable" mas nao e uma Promise de verdade (nao tem .catch nem
    // .finally). `await` so precisa do .then, e o `tsc` pegou isto.
    deletar: () => PromiseLike<{ error?: { message?: string } | null }>;
    marcarMorto: () => PromiseLike<unknown>;
  },
  seedId?: string | null,
): Promise<{ ok: boolean; falha?: Falha }> {
  let falha: Falha | null = null;
  try {
    falha = daResposta((await ops.deletar()).error);
  } catch (e) {
    falha = daExcecao(e);
  }
  if (falha) return { ok: false, falha };

  if (seedId) await ops.marcarMorto();
  return { ok: true };
}
