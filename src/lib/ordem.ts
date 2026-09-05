// ============================================================
// Subir e descer uma linha numa lista ordenada por `position`.
//
// Vale para transporte (a sequencia da viagem) e para burocracia.
// Nao existe em atracao nem em comida: la a ordem e a situacao e o
// tipo que mandam, nao a mao.
// ============================================================

export interface ComPos { id: string; position: number }

/**
 * Devolve o que PRECISA ser escrito para mover `id` uma casa.
 * Lista vazia se nao da para mover (ja e a primeira / ja e a ultima).
 *
 * Renumera de 0 a n-1 em vez de so trocar os dois numeros: assim uma
 * lista com posicao repetida ou com buraco (o que acontece quando se
 * apaga do meio) se conserta sozinha no primeiro movimento, em vez de
 * ficar com duas linhas empatadas que nunca mais se separam.
 */
export function mover<T extends ComPos>(
  lista: T[], id: string, dir: -1 | 1,
): { id: string; position: number }[] {
  const ord = [...lista].sort((a, b) => a.position - b.position);
  const i = ord.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ord.length) return [];

  const t = ord[i];
  ord[i] = ord[j];
  ord[j] = t;

  const escrever: { id: string; position: number }[] = [];
  ord.forEach((x, n) => { if (x.position !== n) escrever.push({ id: x.id, position: n }); });
  return escrever;
}

/** Da para mover nessa direcao? So para acender ou apagar a seta. */
export function podeMover<T extends ComPos>(lista: T[], id: string, dir: -1 | 1): boolean {
  return mover(lista, id, dir).length > 0;
}
