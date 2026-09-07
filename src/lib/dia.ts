// ============================================================
// O DIA, juntando as quatro origens (06/09/2026).
//
// Ate aqui um dia eram TRES listas soltas — atracao, trecho e comida —
// desenhadas como parede de etiqueta, sem ordem entre si. Ele pediu
// "o itinerario do dia mais detalhado" e escolheu ordem sem hora.
//
// Este modulo e PURO de proposito: nao importa React, nao le contexto, e
// e testado em tests/dia.test.mjs. A juncao e a ordem sao onde este
// desenho erra em silencio, e funcao pura e o que da para trancar.
// ============================================================
import { akEmoji, fkEmoji, tkEmoji, DI_EMOJI, FK, FKCLS, TK } from '@/content';
import * as C from './calc';
import { num } from './fmt';
import type { Snapshot } from './types';

export type Origem = 'leg' | 'attraction' | 'day_item' | 'food';

/**
 * A ORDEM DE DESEMPATE, e ela nao e arbitraria: e a ordem em que as coisas
 * acontecem num dia. Primeiro voce chega (trecho), depois anda (atracao),
 * o que voce escreveu fica no meio, e comer fecha.
 *
 * Ela existe porque todo item nasce com `day_pos = 0`: empate e o caso
 * NORMAL, nao a excecao. Sem desempate fixo, a lista sairia numa ordem no
 * navegador dele e noutra no da Lu, e nenhum dos dois entenderia.
 */
const ORD: Record<Origem, number> = { leg: 0, attraction: 1, day_item: 2, food: 3 };

export interface ItemDoDia {
  id: string;
  tabela: Origem;
  /** O `day_pos`. O nome casa com `ComPos` de ordem.ts, que as setas usam. */
  position: number;
  nome: string;
  nota: string;
  emoji: string;
  /** 0 quando nao ha valor — nunca null, para quem soma nao precisar checar. */
  eur: number;
  brl: number;
  feito: boolean;
  /** A linha miuda: a cidade da atracao, o tipo do trecho, o tipo da comida. */
  sub: string;
  /**
   * O modificador CSS da etiqueta na lista de blocos (`.dtg <classe>`).
   *
   * Mora aqui, e nao na tela, pelo mesmo motivo do `emoji` e do `sub`: e
   * escolha de exibicao POR TIPO, e o tipo so existe aqui dentro. Ate 07/09 a
   * tira de etiquetas resolvia isso sozinha, e para isso remontava o dia
   * inteiro — e remontando, discordava desta ordem. Trazendo a classe para ca,
   * a tela vira um `map` e nao tem mais como divergir.
   */
  classe: string;
}

/** As quatro origens do dia, juntas e em ordem estavel. */
export function itensDoDia(s: Snapshot, iso: string): ItemDoDia[] {
  const out: ItemDoDia[] = [];

  for (const t of C.legsOfDay(s, iso)) {
    const v = num(t.amount);
    out.push({
      id: t.id, tabela: 'leg', position: t.day_pos,
      nome: t.name, nota: t.note, emoji: tkEmoji(t.kind),
      eur: t.currency === 'brl' ? 0 : v,
      brl: t.currency === 'brl' ? v : 0,
      feito: t.done,
      sub: (TK as Record<string, string>)[t.kind] ?? t.kind,
      classe: `tk-${t.kind}${t.bought ? ' pgo' : ''}`,
    });
  }
  for (const a of C.attrsOfDay(s, iso)) {
    out.push({
      id: a.id, tabela: 'attraction', position: a.day_pos,
      nome: a.name, nota: a.note, emoji: akEmoji(a.kind),
      eur: num(a.price_eur), brl: 0,
      feito: a.done,
      sub: C.nomeCidade(s, a.city),
      // dentro de um dia toda atracao esta no roteiro, por definicao
      classe: 'st-esc',
    });
  }
  for (const d of s.dayItems) {
    if (d.day_iso !== iso) continue;
    const v = num(d.amount);
    out.push({
      id: d.id, tabela: 'day_item', position: d.day_pos,
      nome: d.name, nota: d.note, emoji: DI_EMOJI,
      eur: d.currency === 'brl' ? 0 : v,
      brl: d.currency === 'brl' ? v : 0,
      feito: d.done,
      sub: 'seu',
      classe: 'di',
    });
  }
  for (const f of C.foodsOfDay(s, iso)) {
    out.push({
      id: f.id, tabela: 'food', position: f.day_pos,
      nome: f.name, nota: f.note, emoji: fkEmoji(f.kind),
      eur: 0, brl: 0,
      feito: f.done,
      sub: (FK as Record<string, string>)[f.kind] ?? f.kind,
      classe: `fk-${FKCLS[f.kind] ?? f.kind}`,
    });
  }

  return out.sort((x, y) =>
    x.position - y.position
    || ORD[x.tabela] - ORD[y.tabela]
    || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/**
 * A proxima posicao, olhando as QUATRO origens.
 *
 * Se olhasse so uma, todo item novo nasceria empatado com um existente — e
 * a lista so se consertaria na primeira seta.
 */
export function proximaPos(s: Snapshot, iso: string): number {
  const l = itensDoDia(s, iso);
  return l.length ? Math.max(...l.map((x) => x.position)) + 1 : 0;
}

export function totalDoDia(s: Snapshot, iso: string): { eur: number; brl: number } {
  return itensDoDia(s, iso).reduce(
    (a, x) => ({ eur: a.eur + x.eur, brl: a.brl + x.brl }),
    { eur: 0, brl: 0 },
  );
}

export function feitasDoDia(s: Snapshot, iso: string): { feitas: number; total: number } {
  const l = itensDoDia(s, iso);
  return { feitas: l.filter((x) => x.feito).length, total: l.length };
}
