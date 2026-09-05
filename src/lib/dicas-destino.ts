// ============================================================
// Para onde vai cada um dos 18 avisos de dia (Fase 4, 05/09/2026).
//
// O Leo pediu: "tirar todos os disclaimers dos dias do roteiro e deixar
// em algum lugar todas as dicas que voce tiver separado por cidade".
//
// ISTO NAO E FORMULA, E REDACAO ITEM A ITEM, por tres motivos que so
// aparecem quando se le os 18:
//
//  1. DOIS nao tem cidade nenhuma. Os dias 10/12 e 12/01 tem base "em
//     transito", e `cityOfBase('em trânsito')` devolve string vazia. Sao
//     justamente os que guardam os NUMEROS DOS VOOS. Vao para `dicas:voos`.
//
//  2. Em SEIS dias de viagem a base do dia e o DESTINO e o aviso e da
//     PARTIDA. Mandar pela base joga o aviso na cidade errada: o do dia
//     16/12 fala de sair de Lisboa e a base e Madrid; o do dia 19/12 fala
//     do voo de Madrid e a base e Metz. Vao para `dicas:pernas`.
//
//  3. Varios trazem o dia da semana no meio do texto ("hoje e quinta",
//     "e segunda"). Cinco caem em Madrid: juntos num cartao de cidade,
//     "hoje e quinta" e "e segunda" viram contradicao. O texto e
//     reescrito ao mover, e por isso a tabela carrega titulo e corpo.
//
// OS TRES VERMELHOS FICAM NO DIA, por escolha dele: 24/12 (todo o
// transporte de Luxemburgo para as 20h), 29/12 (a perna mais cara) e
// 06/01 (Epifania). Sao os `alert`, e sao os unicos que podem arruinar
// um dia se ele nao os vir NAQUELE dia.
// ============================================================

export interface Destino {
  /** O `spot` novo. `null` = fica no dia, nao se move. */
  spot: string | null;
  /** Titulo novo, quando o velho so faz sentido naquela data. */
  title?: string;
  /** Corpo novo, idem. Texto puro: negrito com *asterisco*. */
  body?: string;
}

export const DESTINO: Record<string, Destino> = {
  // ---------- ficam no dia: os tres alertas ----------
  '2026-12-24': { spot: null },
  '2026-12-29': { spot: null },
  '2027-01-06': { spot: null },

  // ---------- os voos: sem cidade para onde ir ----------
  '2026-12-10': { spot: 'dicas:voos' },
  '2027-01-12': { spot: 'dicas:voos' },

  // ---------- as pernas entre bases ----------
  '2026-12-11': {
    spot: 'dicas:pernas',
    title: 'Madrid → Cáceres: o trem tem só 3 por dia',
    body: 'São 3h07. *Confira o horário antes de sair de Barajas* — perder um custa meio dia.',
  },
  '2026-12-16': { spot: 'dicas:pernas', title: 'Lisboa → Cáceres → Madrid, no dia 16' },
  '2026-12-19': { spot: 'dicas:pernas', title: 'Madrid → Luxemburgo, e a Lu te encontra' },
  '2026-12-26': {
    spot: 'dicas:pernas',
    title: 'Metz → Reims não tem trem direto',
    body: '1h25 no melhor caso, média 2h24, uma troca, desde ~€ 31. *No dia 26 é feriado na '
      + 'Moselle* (Saint-Étienne) e o serviço é reduzido — confira antes.',
  },
  '2027-01-02': { spot: 'dicas:pernas', title: 'Amsterdã → Roma, e a volta da Lu' },
  '2027-01-10': { spot: 'dicas:pernas', title: 'Roma → Madrid, e onde dormir na última noite' },

  // ---------- dicas de cidade de verdade ----------
  '2026-12-17': {
    spot: 'dicas:madrid',
    title: 'Palacio Real de graça, 16h–18h',
    body: 'A janela é *segunda a quinta, de outubro a março*, com o passaporte brasileiro. '
      + 'Na viagem você tem duas chances: 17/12 (quinta) e 11/01 (segunda).',
  },
  '2026-12-18': {
    spot: 'dicas:madrid',
    title: 'Museo del Prado de graça, 18h–20h',
    body: 'De segunda a sábado, no fim do dia. Fila de uns 40 min e lotado, mas de graça. '
      + 'Na viagem cai no dia 18/12, uma sexta.',
  },
  '2027-01-11': {
    spot: 'dicas:madrid',
    title: 'O último dia é todo seu',
    body: 'O voo só sai 23h35 do dia 11/01. *Deixe a mala guardada na estação* e use o dia. '
      + 'É segunda: a janela grátis do Palacio Real, 16h–18h, vale.',
  },
  '2026-12-25': {
    spot: 'dicas:metz',
    title: 'No Natal a cidade fecha, e o trem anda pouco',
    body: 'No dia 25 o serviço é reduzido *nos dois sentidos* — confira ida e volta. O '
      + 'Winterlights abre 11h–21h. Dorme em Metz.',
  },
  '2026-12-27': {
    spot: 'dicas:reims',
    title: 'Escurece 16h55, e para Paris o TER é bem mais barato',
    body: 'O inverno tem pouca luz: programe o que é ao ar livre para a manhã. Para Paris, '
      + 'o *TER de 1h35 custa bem menos que o TGV de 45 min*.',
  },
  '2026-12-28': {
    spot: 'dicas:reims',
    title: 'O mercado de Natal vai até 28/12',
    body: '150 chalés nas Hautes Promenades. *Se quiser ver, tem que ser até o dia 28.*',
  },
  '2026-12-31': {
    spot: 'dicas:amsterda',
    title: 'Réveillon: o show oficial é de graça',
    body: 'Fogos de particular são *proibidos* em Amsterdã. O Electric Fireworks é no '
      + 'Museumplein — infantil 19h, principal 22h.',
  },
};

/** Os cartoes da aba Dicas que nao sao cidade. */
export const CARTOES_EXTRA: [string, string, string][] = [
  ['dicas:voos', 'Voos', 'os quatro trechos aéreos, com número e conexão'],
  ['dicas:pernas', 'Pernas entre as bases', 'os dias em que você troca de cidade'],
];

/**
 * Onde cada aviso de dia vai parar, JA COM A POSICAO.
 *
 * Isto existe porque a posicao tem que ser calculada em DOIS lugares — na
 * semente (`avisos-semente.ts`, que alimenta o modo demonstracao e um banco
 * novo) e no script que move as linhas ja gravadas
 * (`scripts/mover-avisos.mjs`). Escrever a conta duas vezes deu, na
 * primeira tentativa, dois avisos empatados em `dicas:voos` — o teste
 * "as posicoes nao empatam dentro do mesmo spot" pegou na hora.
 *
 * Aviso NAO TEM setas de ordem na tela (`ordem.ts` so serve a transporte e
 * reservas), entao posicao empatada e desempatada por uuid: deterministico,
 * igual nos dois navegadores, e sem sentido nenhum para quem le. E o Leo
 * nao teria como consertar.
 *
 * A ordem dentro de cada cartao e a do calendario.
 */
export function planoDasDicas(isos: string[]) {
  const conta = new Map<string, number>();
  const fora = new Map<string, { spot: string; position: number } & Destino>();
  for (const iso of [...isos].sort()) {
    const d = DESTINO[iso];
    if (!d || d.spot === null) continue;
    const n = conta.get(d.spot) ?? 0;
    conta.set(d.spot, n + 1);
    fora.set(iso, { ...d, spot: d.spot, position: n });
  }
  return fora;
}
