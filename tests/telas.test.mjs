// ============================================================
// A higiene das TELAS, lida no proprio codigo-fonte.
//
// Por que um teste que le texto em vez de rodar funcao: o defeito que
// derrubou o app em 05/09 nao estava em formula nenhuma. `calc.ts` ja
// tratava a cidade criada pelo Leo do jeito certo, e ate havia teste
// verde provando isso — mas TRES telas perguntavam direto a `CT`, a
// lista das 11 cidades fixas, e `CT['teste'].n` num nome que ela nao
// tem e TypeError. Tela nao se testa com `node --test` neste projeto
// (nao ha React aqui dentro), entao o que da para provar e a REGRA:
// nenhuma tela indexa `CT` sem rede.
//
// Ele criou uma cidade chamada "teste" e o app foi ao chao duas vezes
// em cinco minutos, com "Application error" em ingles e nada mais.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { TK, TKPL, TKE, TKORD, ATR_SUG, HOSP_SUG, TRANSP_SUG, SUGGRES, FOOD } from '@/content/index.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Todo .tsx de tela e de componente — onde o JSX mora. */
function arquivosDeTela() {
  const out = [];
  for (const pasta of ['src/screens', 'src/screens/roteiro', 'src/components']) {
    if (!existsSync(join(RAIZ, pasta))) continue;   // a pasta nasce na Tarefa 6
    for (const f of readdirSync(join(RAIZ, pasta))) {
      if (f.endsWith('.tsx')) out.push(join(pasta, f));
    }
  }
  return out;
}

/**
 * `CT[...]` seguido de `.` — o jeito que estoura.
 *
 * `CT[k] ?? ...` e `CT[k]?.n` continuam permitidos: os dois tem rede.
 * Quem quiser o nome ou o pais de uma cidade numa tela usa
 * `C.nomeCidade(s, k)` / `C.paisDaCidade(s, k)`, que olham tambem as
 * cidades que ele criou.
 */
const CRU = /\bCT\[[^\]]+\]\s*\./;

test('nenhuma tela indexa CT[...] cru — foi assim que uma cidade nova derrubou o app', () => {
  const achados = [];
  for (const rel of arquivosDeTela()) {
    const linhas = readFileSync(join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return;
      if (CRU.test(l)) achados.push(`${rel}:${i + 1}  ${l.trim()}`);
    });
  }
  assert.deepEqual(
    achados,
    [],
    `Tela indexando CT direto. Troque por C.nomeCidade(s, k) / C.paisDaCidade(s, k) / C.ccCidade(s, k):\n${achados.join('\n')}`,
  );
});

test('a rede embaixo do app existe — error.tsx e global-error.tsx', () => {
  // Sem eles, qualquer tropeco de tela vira "Application error: a
  // client-side exception has occurred", em ingles, sem botao e sem
  // pista. Foi o que ele viu duas vezes.
  for (const f of ['src/app/error.tsx', 'src/app/global-error.tsx']) {
    const src = readFileSync(join(RAIZ, f), 'utf8');
    assert.ok(src.startsWith("'use client'"), `${f} tem que ser client component`);
    assert.ok(/export default function/.test(src), `${f} precisa exportar o componente`);
    assert.ok(/reset/.test(src), `${f} precisa oferecer o "tentar de novo"`);
  }
});

/**
 * Toda grade de formulario de acrescentar tem que virar coluna unica no celular.
 *
 * As `.addrow.<sigla>` sao grades em px com aritmetica justa. Cada uma delas
 * PRECISA de um par dentro de um `@media (max-width: ...)` que a devolva para
 * `1fr`; sem isso, a linha nao cabe num aparelho de 360 e o app anda para o
 * lado. Hoje todas tem — mas so porque quem escreveu lembrou. Em 06/09, ao
 * criar a `.fo3` de Comidas, eu lembrei; nada me obrigava.
 *
 * Este teste faz a obrigacao existir.
 */
function grades(css) {
  const fora = new Map();   // sigla -> linha, definidas FORA de @media
  const dentro = new Set(); // siglas citadas DENTRO de um @media (max-width)
  let profundidadeMedia = 0;
  let dentroDeMedia = false;
  css.split('\n').forEach((l, i) => {
    if (/@media[^{]*max-width/.test(l)) { dentroDeMedia = true; profundidadeMedia = 0; }
    for (const ch of l) {
      if (ch === '{') profundidadeMedia++;
      if (ch === '}') { profundidadeMedia--; if (dentroDeMedia && profundidadeMedia <= 0) dentroDeMedia = false; }
    }
    for (const m of l.matchAll(/\.addrow\.([a-z0-9]+)/g)) {
      const sigla = m[1];
      if (dentroDeMedia) dentro.add(sigla);
      else if (/grid-template-columns/.test(l) && !fora.has(sigla)) fora.set(sigla, i + 1);
    }
  });
  return { fora, dentro };
}

test('toda grade .addrow tem o par que vira coluna unica no celular', () => {
  const arquivos = ['src/app/estilo-atual.css', 'src/app/extras.css'];
  const fora = new Map();
  const dentro = new Set();
  for (const f of arquivos) {
    const g = grades(readFileSync(join(RAIZ, f), 'utf8'));
    for (const [k, linha] of g.fora) if (!fora.has(k)) fora.set(k, `${f}:${linha}`);
    for (const k of g.dentro) dentro.add(k);
  }
  const orfas = [...fora].filter(([sigla]) => !dentro.has(sigla)).map(([s, onde]) => `${s} (${onde})`);
  assert.deepEqual(
    orfas,
    [],
    `Grade de formulario sem colapso no celular. Ponha a sigla na lista do @media (max-width: 700px):\n${orfas.join('\n')}`,
  );
});

/**
 * A REGRA DE ESPECIFICIDADE (constraint global do plano) — a unica que nao
 * tinha teste, e a unica que quebrou (Tarefa 7).
 *
 * `layout.tsx` carrega `identidade.css` DEPOIS de `extras.css`. Numa
 * EMPATE de especificidade quem vem depois ganha, sempre — entao regra
 * nova em `extras.css` que dispute com uma de `identidade.css` precisa de
 * especificidade MAIOR, nunca igual. Foi isto que quebrou o cabecalho da
 * vista: `.dvista .h { display: grid; ... }` tem a MESMA especificidade
 * (0,2,0) de `.card > .h` (identidade.css), o empate foi para quem vem
 * depois (identidade), e o cabecalho nunca virou grid — so um humano
 * dirigindo o Chrome achou, nao o `tsc` nem o `npm test`.
 *
 * Dentro de `.card`, `identidade.css` e dono de quatro alvos, cada um com
 * a propria especificidade:
 *   .card > .h       (0,2,0)  -- o cabecalho do cartao
 *   .card > .b       (0,2,0)  -- o corpo do cartao
 *   .card > .h h3    (0,2,1)  -- o titulo dentro do cabecalho
 *   .card > .h .m    (0,3,0)  -- o subtitulo dentro do cabecalho
 *
 * Este teste e CRU de proposito (igual ao `grades()` acima) — nao e um
 * parser de CSS. Ele so pega o seletor de cada regra de `extras.css` e
 * recusa quem chega num destes quatro alvos por um caminho de MESMA
 * especificidade: uma classe solta seguida de espaco (combinador
 * descendente), tipo `.dvista .h`. Tem que chegar por
 * `.card.<classe> > .h` (ou `.b`, `h3`, `.m`), que soma uma classe a mais
 * e sempre vence — nao importa a ordem dos imports.
 */
function seletoresDeclarados(css) {
  // comentario de bloco fora primeiro: prosa dentro de /* */ pode conter
  // qualquer coisa parecida com seletor, e nao e codigo de verdade.
  const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let atual = '';
  for (const ch of semComentario) {
    if (ch === '{') { out.push(atual.trim()); atual = ''; }
    else if (ch === '}' || ch === ';') { atual = ''; }
    else atual += ch;
  }
  return out
    .filter(Boolean)
    .flatMap((bloco) => bloco.split(','))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// cada `re` so casa quando o alvo esta no FIM do seletor (o `$`): e o que
// prova que e ELE quem a regra estiliza, nao so um ancestral no caminho.
// `.dvista .h .m` por exemplo nao pode acusar o alvo `.h` — quem a regra
// estiliza de verdade e o `.m`, e esse tem o proprio item na lista.
const ALVOS_DE_IDENTIDADE = [
  { alvo: '.h (o cabecalho, dono de .card > .h)', re: /\.[\w-]+\s+\.h\b\s*$/ },
  { alvo: '.b (o corpo, dono de .card > .b)', re: /\.[\w-]+\s+\.b\b\s*$/ },
  { alvo: 'h3 (o titulo, dono de .card > .h h3)', re: /\.[\w-]+\s+\.h\s+h3\b\s*$/ },
  { alvo: '.h .m (o subtitulo, dono de .card > .h .m)', re: /\.[\w-]+\s+\.h\s+\.m\b\s*$/ },
];

test('nenhum seletor de extras.css empata especificidade com o que identidade.css ja e dono dentro de .card', () => {
  const css = readFileSync(join(RAIZ, 'src/app/extras.css'), 'utf8');
  const achados = [];
  for (const sel of seletoresDeclarados(css)) {
    for (const { alvo, re } of ALVOS_DE_IDENTIDADE) {
      if (re.test(sel)) achados.push(`"${sel}" empata com ${alvo}`);
    }
  }
  assert.deepEqual(
    achados,
    [],
    `extras.css carrega ANTES de identidade.css (layout.tsx) — no empate quem ganha e identidade.css. ` +
    `Escreva ".card.<classe> > ..." em vez de "<classe> ...":\n${achados.join('\n')}`,
  );
});

/**
 * Nenhuma tela pode ler `AKE[...]`, `TKE[...]` ou `FKE[...]` direto.
 *
 * O tema da atracao e TEXTO LIVRE desde 06/09, entao `AKE['museu']` e
 * `undefined` — e `{undefined} {nome}` no JSX nao quebra nada: desenha um
 * espaco solto e segue. Transporte e comida ainda tem lista fechada, mas o
 * dado vem do BANCO, e banco com valor fora da lista e questao de tempo.
 *
 * As funcoes com `??` sao `akEmoji`, `tkEmoji` e `fkEmoji`, em @/content.
 * `AKE.passeio` / `TKE.trem` continuam permitidos: sao chaves literais, e a
 * legenda do Roteiro as escreve na mao.
 */
const EMOJI_CRU = /\b(AKE|TKE|FKE)\[[^\]]+\]/;

test('nenhuma tela le AKE/TKE/FKE[...] direto — o dado vem do banco', () => {
  const achados = [];
  for (const rel of arquivosDeTela()) {
    const linhas = readFileSync(join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return;
      if (EMOJI_CRU.test(l)) achados.push(`${rel}:${i + 1}  ${l.trim()}`);
    });
  }
  assert.deepEqual(
    achados,
    [],
    `Tela lendo o dicionario de emoji direto. Troque por akEmoji/tkEmoji/fkEmoji, de @/content:\n${achados.join('\n')}`,
  );
});

/**
 * Um tipo de transporte novo precisa de OITO lugares, nao de um.
 *
 * Descoberto ao por o metro em 06/09: o tipo (`types.ts`), tres dicionarios
 * (`TK`, `TKPL`, `TKE`), a ordem (`TKORD`), a trava do banco (`leg_kind_check`)
 * e tres regras de CSS (a barra da linha, a etiqueta do dia, a cor do texto).
 * Faltar qualquer uma NAO da erro de build: da um transporte sem emoji, ou sem
 * cor, ou que a tela oferece e o banco recusa.
 *
 * O nono lugar deixou de existir: `identidade.css` listava os quatro tipos para
 * apagar a barra antiga, e agora usa `[class*="tk-"]`. Lista em CSS e lista para
 * esquecer.
 */
test('todo tipo de transporte tem os oito lugares preenchidos', () => {
  const css = ['src/app/estilo-atual.css', 'src/app/extras.css']
    .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n');
  const schema = ['supabase/01-schema.sql', 'supabase/00-tudo.sql']
    .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n');
  const tipoTs = readFileSync(join(RAIZ, 'src/lib/types.ts'), 'utf8');
  const linhaDaTrava = schema.split('\n').filter((l) => /kind in \('trem'/.test(l));

  const faltando = [];
  for (const k of Object.keys(TK)) {
    if (!TKPL[k]) faltando.push(`${k}: sem plural em TKPL (content/index.ts)`);
    if (!TKE[k]) faltando.push(`${k}: sem emoji em TKE (content/index.ts)`);
    if (TKORD[k] === undefined) faltando.push(`${k}: sem ordem em TKORD (content/index.ts)`);
    if (!new RegExp(`LegKind[^;]*'${k}'`, 's').test(tipoTs)) faltando.push(`${k}: fora do tipo LegKind (lib/types.ts)`);
    if (!css.includes(`.mrow.tr5.tk-${k}`)) faltando.push(`${k}: sem a barra da linha (.mrow.tr5.tk-${k})`);
    if (!css.includes(`.dtg.tk-${k}`)) faltando.push(`${k}: sem a cor da etiqueta do dia (.dtg.tk-${k})`);
    if (!css.includes(`.stg.tkc-${k}`)) faltando.push(`${k}: sem a cor do texto (.stg.tkc-${k})`);
    // a trava do banco: as duas copias do esquema tem que aceitar o tipo
    const emTodas = linhaDaTrava.length > 0 && linhaDaTrava.every((l) => l.includes(`'${k}'`));
    if (!emTodas) faltando.push(`${k}: o banco RECUSA — falta em leg_kind_check (supabase/01-schema.sql e 00-tudo.sql)`);
  }
  assert.deepEqual(faltando, [], `Tipo de transporte pela metade:\n${faltando.join('\n')}`);
});

/**
 * Nenhuma lista de sugestao pode ter chave que nao seja lista.
 *
 * Os JSONs de pesquisa carregam uma chave `_` no topo, com a PROSA que
 * explica o arquivo. `hospedagens-sugeridas.json` tem; `atracoes-sugeridas`
 * nao. Quem varre as cidades e faz `.map` na chave `_` recebe uma string e
 * quebra a tela inteira — aconteceu em 06/09, no primeiro minuto da aba
 * Sugestoes, e a rede do error.tsx foi quem segurou.
 */
test('as listas de sugestao nao escondem chave de comentario', () => {
  const ruins = [];
  for (const [nome, mapa] of [['ATR_SUG', ATR_SUG], ['HOSP_SUG', HOSP_SUG]]) {
    for (const [k, v] of Object.entries(mapa)) {
      if (!Array.isArray(v)) ruins.push(`${nome}['${k}'] nao e lista, e ${typeof v}`);
    }
  }
  for (const [nome, lista] of [['TRANSP_SUG', TRANSP_SUG], ['SUGGRES', SUGGRES], ['FOOD', FOOD]]) {
    if (!Array.isArray(lista)) ruins.push(`${nome} devia ser lista`);
  }
  assert.deepEqual(ruins, [], `Sugestao com chave que nao e lista:\n${ruins.join('\n')}`);
});

// tira comentario, espaco de sobra e virgula final de cada linha do corpo
// de um `create table`, pra sobrar so a lista de definicoes de coluna
function colunasDoCorpo(corpo) {
  return corpo
    .split('\n')
    .map((linha) => linha.split('--')[0].trim())
    .filter((linha) => linha.length > 0)
    .map((linha) => linha.replace(/\s+/g, ' ').replace(/,$/, ''));
}

// o corpo (as colunas) do `create table if not exists <tabela>` num SQL.
// null se a tabela nao existir nesse arquivo
function corpoDaTabela(sql, tabela) {
  const bloco = sql.split(`create table if not exists ${tabela} (`)[1];
  if (!bloco) return null;
  return colunasDoCorpo(bloco.split('\n);')[0]);
}

// compara duas listas de colunas linha a linha; devolve as diferencas,
// cada uma dizendo QUAL linha e o que tinha de cada lado
function difColunas(a, b) {
  const max = Math.max(a.length, b.length);
  const difs = [];
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      difs.push(`linha ${i + 1}: "${a[i] ?? '(faltando)'}" vs "${b[i] ?? '(faltando)'}"`);
    }
  }
  return difs;
}

/**
 * `dados/` e `src/content/` sao copias que precisam bater, e as copias
 * do esquema tambem: `00-tudo.sql` e a colada unica, `01-schema.sql` e a
 * fatiada, e a tabela `day_item` tem ainda uma TERCEIRA copia, em
 * `10-o-dia-em-ordem.sql` — a migracao que ele roda de verdade no banco.
 * Quem mexe numa e esquece a outra cria um banco novo diferente do banco
 * de producao, e a diferenca so aparece quando alguem roda o seed do
 * zero — meses depois.
 *
 * Nao basta achar a palavra `day_pos` em cada copia (isso passa mesmo se
 * uma copia tiver `currency default 'brl'` e a outra `default 'eur'`).
 * Este teste extrai as colunas de cada `create table` e compara as
 * copias LINHA A LINHA, pra pegar justamente esse tipo de divergencia
 * silenciosa — o mesmo defeito de "R$ 257 virou R$ 1.595" descrito no
 * SQL, só que agora entre arquivos em vez de entre moedas.
 */
test('as duas copias do esquema conhecem o dia em ordem', () => {
  const arquivos = {
    'supabase/00-tudo.sql': null,
    'supabase/01-schema.sql': null,
    'supabase/10-o-dia-em-ordem.sql': null,
  };
  for (const rel of Object.keys(arquivos)) {
    arquivos[rel] = readFileSync(join(RAIZ, rel), 'utf8');
  }

  const faltando = [];

  // 1. o basico: a tabela e as seis colunas tem que existir em cada
  // copia. Roda mesmo antes de as copias existirem (ou existirem por
  // completo), pra dar um erro legivel nesse estagio tambem.
  for (const [nome, sql] of [
    ['supabase/00-tudo.sql', arquivos['supabase/00-tudo.sql']],
    ['supabase/01-schema.sql', arquivos['supabase/01-schema.sql']],
  ]) {
    if (!/create table if not exists day_item/.test(sql)) {
      faltando.push(`${nome}: sem a tabela day_item`);
    }
    for (const t of ['attraction', 'food', 'leg']) {
      const corpo = corpoDaTabela(sql, t);
      if (corpo === null) { faltando.push(`${nome}: sem a tabela ${t}`); continue; }
      if (!corpo.some((l) => /day_pos/.test(l))) faltando.push(`${nome}: ${t} sem day_pos`);
      if (!corpo.some((l) => /\bdone\b/.test(l))) faltando.push(`${nome}: ${t} sem done`);
    }
  }

  // 2. a comparacao de verdade: 00-tudo.sql e 01-schema.sql tem que
  // descrever EXATAMENTE as mesmas colunas para attraction/food/leg/day_item
  if (faltando.length === 0) {
    const tudo = arquivos['supabase/00-tudo.sql'];
    const fatiado = arquivos['supabase/01-schema.sql'];
    for (const t of ['attraction', 'food', 'leg', 'day_item']) {
      const corpoTudo = corpoDaTabela(tudo, t);
      const corpoFatiado = corpoDaTabela(fatiado, t);
      for (const dif of difColunas(corpoTudo, corpoFatiado)) {
        faltando.push(`${t} (00-tudo.sql vs 01-schema.sql), ${dif}`);
      }
    }

    // 3. day_item tem uma terceira copia: a migracao que ele roda
    const corpoMigracao = corpoDaTabela(arquivos['supabase/10-o-dia-em-ordem.sql'], 'day_item');
    if (corpoMigracao === null) {
      faltando.push('supabase/10-o-dia-em-ordem.sql: sem a tabela day_item');
    } else {
      const corpoTudoDayItem = corpoDaTabela(tudo, 'day_item');
      for (const dif of difColunas(corpoTudoDayItem, corpoMigracao)) {
        faltando.push(`day_item (00-tudo.sql vs 10-o-dia-em-ordem.sql), ${dif}`);
      }
    }
  }

  assert.deepEqual(faltando, [], `Esquema pela metade ou copias divergindo:\n${faltando.join('\n')}`);
});

/**
 * TODA FONTE DE DINHEIRO DO `totalBrl` TEM QUE APARECER NA ABA CUSTOS.
 *
 * A tabela do Custos imprime `totalBrl` no rodape e uma linha por categoria
 * no corpo. Nada obrigava as duas coisas a baterem — e em 07/09 elas pararam
 * de bater: o item livre do dia entrou no `totalBrl` e nao virou linha, entao
 * o rodape ficou maior que a soma do corpo, sem nada explicando. So nao
 * apareceu porque ainda nao existe nenhum item livre no banco dele.
 *
 * O teste irmao em calc.test.mjs ("11.9") tranca a ARITMETICA: que as
 * categorias somadas dao o total. Ele NAO tranca que a TELA usa essas
 * categorias — eu tentei, tirei o conserto do Custos.tsx e ele passou verde
 * assim mesmo. Este aqui fecha esse buraco, lendo os dois arquivos: cada
 * helper de dinheiro chamado dentro do `totalBrl` tem que ser citado tambem
 * no Custos.tsx.
 *
 * E crua de proposito — cita, nao "usa direito". Uma regra crua que falha no
 * dia certo vale mais que uma fina que ninguem consegue escrever.
 */
test('toda fonte de dinheiro do totalBrl aparece na aba Custos', () => {
  const calc = readFileSync(join(RAIZ, 'src/lib/calc.ts'), 'utf8');
  const tela = readFileSync(join(RAIZ, 'src/screens/Custos.tsx'), 'utf8');

  const corpo = calc.match(/export function totalBrl[\s\S]*?\n}/);
  assert.ok(corpo, 'nao achei o totalBrl no calc.ts — o teste precisa dele');

  // os helpers que o totalBrl chama, menos os que nao sao fonte de dinheiro
  const NAO_E_FONTE = new Set(['rate', 'legSum', 'totalBrl']);
  const fontes = [...new Set(
    [...corpo[0].matchAll(/\b([a-z][A-Za-z]+)\s*\(/g)].map((m) => m[1]),
  )].filter((f) => !NAO_E_FONTE.has(f));

  assert.ok(fontes.length >= 5, `esperava varias fontes, achei ${fontes.length}`);

  const faltando = fontes.filter((f) => !new RegExp(`\\b${f}\\b`).test(tela));
  assert.deepEqual(
    faltando, [],
    `entrou dinheiro no totalBrl que a aba Custos nao mostra: ${faltando.join(', ')}.`
    + ' O rodape da tabela vai ficar maior que a soma das linhas.',
  );

  // o VOO nao e funcao, e uma constante — confere na mao
  assert.match(corpo[0], /\bVOO\b/);
  assert.match(tela, /\bVOO\b/, 'o voo esta no total e tem que estar na tabela');
});

/**
 * A TIRA DE ETIQUETAS NAO PODE VOLTAR A MONTAR O DIA SOZINHA.
 *
 * Ate 07/09 o `DiaTags` buscava e ordenava as quatro origens por conta
 * propria, e discordava do `dia.ts` em duas coisas: comida e item livre
 * trocados, e a ordem dentro de cada tipo. Ninguem via, porque a tira e a
 * visualizacao nunca aparecem juntas — e ia deixar de ser invisivel na etapa
 * 2, quando as setas passassem a mandar na ordem e so uma das duas obedecesse.
 *
 * Hoje ele consome `D.itensDoDia`. Este teste impede a volta: se alguem
 * reintroduzir uma busca por dia dentro do `Roteiro.tsx`, a divergencia volta
 * junto, e e melhor descobrir aqui do que numa tela.
 *
 * A regra e crua de proposito: proibe os buscadores por dia neste arquivo, e
 * exige a chamada ao modulo. Uma regra crua que falha no dia certo vale mais
 * que uma fina que ninguem escreve.
 */
test('a tira de etiquetas do dia sai do dia.ts, e nao se remonta na tela', () => {
  const bruto = readFileSync(join(RAIZ, 'src/screens/Roteiro.tsx'), 'utf8');
  // SEM COMENTARIOS. Os comentarios deste arquivo contam a historia do
  // defeito e citam os nomes proibidos de proposito; a regra e sobre codigo.
  // (Ja errei assim hoje: um grep de palavra casou prosa em portugues.)
  const src = bruto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  assert.match(
    src, /D\.itensDoDia\s*\(/,
    'Roteiro.tsx tem que pegar a lista do dia em dia.ts',
  );
  assert.match(
    src, /D\.totalDoDia\s*\(/,
    'o total do dia tem que vir do mesmo lugar que a lista',
  );

  const PROIBIDOS = ['attrsOfDay', 'foodsOfDay', 'legsOfDay', 'dayAttrTotal',
                     'dayLegEur', 'dayLegBrl'];
  const achados = PROIBIDOS.filter((f) => new RegExp(`\\b${f}\\b`).test(src));
  assert.deepEqual(
    achados, [],
    `Roteiro.tsx voltou a montar o dia sozinho com: ${achados.join(', ')}.`
    + ' Use D.itensDoDia/D.totalDoDia — senao a tira e a visualizacao'
    + ' voltam a ordenar os mesmos itens de formas diferentes.',
  );

  // e o dia.ts continua sendo quem resolve a cor da etiqueta
  assert.doesNotMatch(
    src, /\bFKCLS\b/,
    'a classe da etiqueta sai do `classe` do ItemDoDia, nao do FKCLS na tela',
  );
});

test('a fita mostra ZERO, nunca um espaco em branco', () => {
  // Pedido dele em 08/09, olhando a tela: "deixe zerado se nao tiver nada
  // adicionado, e nao um espaco em branco".
  //
  // A `Fita` desenha `{v ? <span> : null}`, entao QUALQUER caminho que
  // devolva string vazia apaga o numero — e o `|| ''` fazia exatamente isso
  // com o zero, que e um valor legitimo ("nao registrei nada aqui ainda").
  // Sao seis chamadas em cinco telas; se uma voltar a esconder o zero, a
  // aba dela passa a discordar das outras quatro em silencio.
  const CHAMAM = ['src/screens/Atracoes.tsx', 'src/screens/Hospedagem.tsx',
                  'src/screens/Comidas.tsx', 'src/screens/Dicas.tsx',
                  'src/screens/Sugestoes.tsx'];

  let total = 0;
  for (const rel of CHAMAM) {
    const bruto = readFileSync(join(RAIZ, rel), 'utf8');
    // sem comentarios: eles citam o `|| ''` de proposito ao contar a historia
    const src = bruto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    // O BLOCO da Fita, e nao todo `valor=` do arquivo: `Sugestoes.tsx` tem
    // dois `valor=` de OUTRO componente (o preco do cartao de sugestao, que
    // mostra "gratis" e pode ser vazio de proposito). A primeira versao
    // deste teste contou 8 em vez de 6 por causa deles.
    const blocos = src.match(/<Fita[\s\S]*?\/>/g) ?? [];
    assert.ok(blocos.length > 0, `${rel} deveria montar uma <Fita>`);
    total += blocos.length;

    for (const c of blocos) {
      assert.match(c, /valor=\{/, `${rel}: <Fita> sem valor=`);
      assert.doesNotMatch(
        c, /\|\|\s*''/,
        `${rel}: \`|| ''\` no valor= da Fita esconde o zero. Ele pediu o zero na tela.`,
      );
      assert.doesNotMatch(
        c, /\?\s*String\([^)]*\)\s*:\s*''/,
        `${rel}: o ternario que devolve '' esconde o zero. Devolva String(n) sempre.`,
      );
    }
  }
  assert.equal(total, 6, 'sao seis fitas no app; se mudou, revise a regra aqui');
});

test('a Fita continua desenhando o que recebe — inclusive "0"', () => {
  // O outro lado da regra de cima: as telas passam "0", e a Fita tem que
  // pintar. Ela filtra com `{v ? ... : null}`, e a STRING "0" e truthy —
  // e por isso que a correcao pode morar so nas telas. Se alguem trocar
  // esse teste por `{v !== '' ? ...}` nada muda; se trocar por
  // `{Number(v) ? ...}` o zero some de novo, e ai este teste cai.
  const src = readFileSync(join(RAIZ, 'src/components/Fita.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(
    src, /Number\(\s*v\s*\)/,
    'Fita.tsx nao pode converter o valor para numero antes de decidir se desenha',
  );
  assert.match(src, /\{v\s*\?/, 'a Fita decide pela string, e "0" e truthy');
});

test('todo + do dia escreve day_pos junto com day_iso', () => {
  // Sem isto o item novo nasce em zero e vai para o TOPO de um dia que ele
  // ja arrumou. A lista parece se desarrumar sozinha e nada na tela explica.
  // Os arquivos JUNTOS, e nao um por um: os tres `+` ja mudaram de endereco
  // uma vez (Editor -> Acrescentar, na etapa 2) e vao mudar de novo. Exigir
  // um `+` em CADA arquivo prende o teste ao desenho de hoje, nao a regra —
  // foi assim que ele quebrou sozinho na tarefa 3.
  let achados = 0;
  for (const rel of ['src/screens/roteiro/Editor.tsx',
                     'src/screens/roteiro/Acrescentar.tsx',
                     'src/screens/roteiro/Ordem.tsx']) {
    if (!existsSync(join(RAIZ, rel))) continue;
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    // Fatiar a chamada CONTANDO PARENTESES, e nao com regex nao-guloso: o
    // `insert` do item livre tem `parseNum(valor.get())` no meio, e o
    // nao-guloso fechava ali — dava o alarme falso de "sem day_pos" na
    // unica chamada que o tinha. (Aconteceu ao escrever a tarefa 4.)
    const chamadas = [];
    for (const m of src.matchAll(/(?:now(?:Many)?|insert)\(/g)) {
      let i = m.index + m[0].length;
      let n = 1;
      while (i < src.length && n > 0) {
        if (src[i] === '(') n++;
        else if (src[i] === ')') n--;
        i++;
      }
      chamadas.push(src.slice(m.index, i));
    }
    const poeNoDia = chamadas.filter((c) => /day_iso['"]?\s*[:,]\s*iso\b/.test(c));
    achados += poeNoDia.length;
    for (const c of poeNoDia) {
      assert.match(
        c, /day_pos/,
        `${rel}: um + poe no dia sem escrever day_pos — o item vai nascer no topo.`
        + ` Use D.proximaPos(s, iso). Chamada: ${c.slice(0, 120)}`,
      );
    }
  }
  assert.ok(achados >= 3, `so achei ${achados} lugares que poem no dia; eram 3+. O teste ficou cego.`);
});

test('a ordem do dia sai do dia.ts, e a tela nao reordena por conta propria', () => {
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Ordem.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  assert.match(src, /D\.itensDoDia\s*\(/, 'a lista tem que vir de dia.ts');
  assert.match(src, /D\.moverNoDia\s*\(/, 'as setas tem que passar por dia.ts');
  assert.doesNotMatch(
    src, /\.sort\s*\(/,
    'Ordem.tsx nao pode ordenar sozinho: `mover` depende da ordem de itensDoDia,'
    + ' e um sort proprio aqui move a linha errada sem erro nenhum',
  );
  assert.doesNotMatch(
    src, /[^.]\bmover\s*\(/,
    'chame D.moverNoDia, nao o mover de ordem.ts — este nao sabe a tabela de cada id',
  );
});

test('a lista do dia nao existe em dois lugares', () => {
  // A licao do DiaTags, de 07/09: duas implementacoes do mesmo dia
  // discordam na primeira vez que uma delas mudar. Os cartoes de
  // acrescentar sao SO seletores desde a etapa 2.
  for (const rel of ['src/screens/roteiro/Editor.tsx',
                     'src/screens/roteiro/Acrescentar.tsx']) {
    if (!existsSync(join(RAIZ, rel))) continue;
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const PROIBIDOS = ['attrsOfDay', 'foodsOfDay', 'legsOfDay'];
    const achados = PROIBIDOS.filter((f) => new RegExp(`\\b${f}\\b`).test(src));
    assert.deepEqual(
      achados, [],
      `${rel} voltou a montar a lista do dia com: ${achados.join(', ')}.`
      + ' Ela mora em Ordem.tsx, e uma so.',
    );
  }
});

test('o x do item livre APAGA, e o das outras tres so tira do dia', () => {
  // Sao dois comportamentos no MESMO botao. Trocar um pelo outro nao da erro:
  // apagaria de vez uma atracao que ele so queria tirar do dia (e ela some do
  // backlog junto), ou deixaria um item livre orfao, sem dia e sem tela.
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Ordem.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  assert.match(src, /apagar\s*\(\s*'day_item'/,
    'o item livre tem que passar por useApagarLinha');
  assert.match(src, /'day_iso'\s*,\s*null/,
    'as outras tres tem que voltar para a aba delas com day_iso = null');
  assert.doesNotMatch(src, /apagar\s*\(\s*x\.tabela/,
    'nao apague pela tabela da linha: as outras tres NAO se apagam daqui');
});

test('so o item livre e editavel na ordem do dia', () => {
  // A decisao dele de 08/09, e o custo de errar: dar campo a uma atracao aqui
  // criaria um SEGUNDO lugar de editar o mesmo nome (o outro e a aba
  // Atracoes), e a primeira vez que os dois discordassem ninguem saberia qual
  // esta certo. Todo campo desta lista tem que ser `day_item|`.
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Ordem.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const chaves = [...src.matchAll(/fk=\{`([a-z_]+)\|/g)].map((m) => m[1]);
  assert.ok(chaves.length >= 3, `esperava 3+ campos na lista, achei ${chaves.length}`);
  assert.deepEqual([...new Set(chaves)], ['day_item'],
    `campo de outra tabela na ordem do dia: ${[...new Set(chaves)].join(', ')}`);

  const escritas = [...src.matchAll(/(?:patch|now)\(\s*'([a-z_]+)'/g)].map((m) => m[1]);
  const semDayPos = escritas.filter((t) => t !== 'day_item');
  assert.deepEqual([...new Set(semDayPos)], [],
    'so o day_item se escreve por nome/valor aqui; o resto so muda day_pos e day_iso');
});

test('a visualizacao nao promete mais a ordem — ela chegou', () => {
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Vista.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /chega em seguida/,
    'a etapa 2 entregou a ordem; a tela nao pode continuar prometendo');
});

test('toda etiqueta .dtg de TIPO tem cor da paleta dele', () => {
  // A do item livre era a unica sem, e ficava no cinza padrao — lia como
  // esquecimento, nao como escolha. Ele decidiu a cor em 08/09. Este teste
  // existe para a proxima etiqueta nova nao repetir o esquecimento.
  const css = ['src/app/estilo-atual.css', 'src/app/extras.css']
    .map((f) => readFileSync(join(RAIZ, f), 'utf8')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // as classes que `dia.ts` produz em `classe`, mais as de situacao
  const usadas = [...readFileSync(join(RAIZ, 'src/lib/dia.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    .matchAll(/classe:\s*[`']([a-z-]+)/g)].map((m) => m[1]);
  assert.ok(usadas.includes('di'), 'o item livre tem que continuar com a classe `di`');

  for (const cls of ['di', 'st-esc']) {
    const re = new RegExp(`\\.dtg\\.${cls}\\s*\\{[^}]*border-left-color`);
    assert.match(css, re, `.dtg.${cls} sem border-left-color — a etiqueta cai no cinza padrao`);
  }
});

test('o menu de tema tem UMA implementacao, e as duas telas consomem ela', () => {
  // A licao do DiaTags (07/09): duas copias da mesma peca divergem na
  // primeira vez que alguem mexe numa. O tema virou compartilhado em 08/09,
  // quando o Roteiro passou a registrar atracao tambem.
  const tema = readFileSync(join(RAIZ, 'src/components/Tema.tsx'), 'utf8');
  assert.match(tema, /export default function Tema/, 'Tema.tsx tem que exportar o menu');

  for (const rel of ['src/screens/Atracoes.tsx', 'src/screens/roteiro/Acrescentar.tsx']) {
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.match(src, /from '@\/components\/Tema'/, `${rel} tem que importar o Tema`);
    assert.doesNotMatch(src, /function Tema\s*\(/,
      `${rel} declarou o proprio menu de tema — ele mora em components/Tema.tsx`);
    assert.doesNotMatch(src, /__novo/,
      `${rel} reimplementou o "outro tema…" — isso e do Tema.tsx`);
  }
});

test('atracao registrada no dia nasce com cidade, dia e posicao', () => {
  // Os tres campos que, faltando, quebram em silencio:
  //   sem `city`   -> atracao orfa, e `CT[cidade]` cru derruba a tela
  //   sem `day_iso`-> ele registra dentro do dia e ela nao aparece no dia
  //   sem `day_pos`-> nasce em zero e vai para o TOPO de um dia arrumado
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Acrescentar.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const i = src.indexOf("insert('attraction'");
  assert.ok(i > 0, 'o formulario tem que inserir na tabela attraction');
  let j = i + "insert('attraction'".length;
  let n = 1;
  while (j < src.length && n > 0) {
    if (src[j] === '(') n++;
    else if (src[j] === ')') n--;
    j++;
  }
  const chamada = src.slice(i, j);
  for (const campo of ['city:', 'day_iso: iso', 'day_pos:', 'kind:', 'price_eur:', 'note:']) {
    assert.ok(chamada.includes(campo), `o insert da atracao no dia esta sem \`${campo}\``);
  }
  assert.doesNotMatch(chamada, /currency/,
    'atracao nao tem moeda: a tabela so tem price_eur, e ele pediu euro sempre');

  // e a cidade nova entra ANTES da atracao, senao ela aponta para o vazio
  assert.ok(src.indexOf("insert('city'") < i,
    'a cidade nova tem que ser criada antes da atracao que aponta para ela');
});

// ============================================================
// A LIMPEZA DE TELA DE 09/09 — os guards das decisoes dele.
//
// Sao decisoes, nao bugs: nenhuma delas quebra nada se voltar, e e
// exatamente por isso que precisam de guard. Um texto meu que renasce numa
// tela dele passa despercebido por semanas.
// ============================================================

test('nenhuma tela abre com paragrafo meu embaixo do titulo', () => {
  // Pedido dele em 09/09, olhando a lista: as frases grandes de abertura
  // ("Os dias estao em branco de proposito...", "Roteiro fechado em
  // 04/09...") saem de TODAS as abas. Serviram na primeira semana; hoje sao
  // um paragrafo que ele rola por cima todo dia. A aba abre no conteudo.
  const culpadas = [];
  for (const rel of arquivosDeTela()) {
    const src = readFileSync(join(RAIZ, rel), 'utf8');
    const m = src.match(/<div className="panelhead">[\s\S]*?<\/div>/);
    if (m && /<p[\s>]/.test(m[0])) culpadas.push(rel);
  }
  assert.deepEqual(culpadas, [],
    `paragrafo de volta no cabecalho de: ${culpadas.join(', ')}`);
});

test('a tabela 1 do Painel tem TRES numeros, e nenhuma frase miuda', () => {
  // Ele listou tres itens onde havia quatro, e escolheu "so os tres, mais
  // largos" quando perguntei do lugar vago. O <small> embaixo de cada
  // numero foi o primeiro item da lista de 08/09: "Remover as frases abaixo
  // dos dados".
  const src = readFileSync(join(RAIZ, 'src/screens/Painel.tsx'), 'utf8');
  const kpi = src.match(/<div className="kpi">[\s\S]*?\n      <\/div>/);
  assert.ok(kpi, 'nao achei o bloco .kpi no Painel');

  const quantos = (kpi[0].match(/^        <div>$/gm) ?? []).length;
  assert.equal(quantos, 3, `a .kpi do Painel tem ${quantos} numeros, e sao tres`);
  assert.doesNotMatch(kpi[0], /<small>/, 'a frase miuda embaixo do numero nao volta');

  // O terceiro e o que ele pediu, e sai da atracao — nao da base do dia.
  assert.match(kpi[0], /cidades visitadas/);
  assert.match(kpi[0], /cidadesVisitadas/);
});

test('"Decisoes de roteiro" nao existe mais em lugar nenhum', () => {
  // "Deixa de existir, isso eu que mando" (08/09). Eram cinco conselhos
  // meus num cartao ocre do Painel, e a constante DECISOES em src/content.
  for (const rel of [...arquivosDeTela(), 'src/content/index.ts']) {
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /DECISOES/, `DECISOES voltou em ${rel}`);
    assert.doesNotMatch(src, /Decisões de roteiro/, `o cartao voltou em ${rel}`);
  }
});

test('a legenda do Roteiro nao tem contador escrito', () => {
  // "So os icones; as escritas pode tirar" (08/09), e depois: "emoji e uma
  // palavra bem como esta hoje". Ficam os dois simbolos e a fita de emojis.
  const src = readFileSync(join(RAIZ, 'src/screens/Roteiro.tsx'), 'utf8');
  const leg = src.match(/<div className="calleg">[\s\S]*?<\/div>/);
  assert.ok(leg, 'nao achei a .calleg');
  assert.doesNotMatch(leg[0], /\{/,
    'a legenda voltou a calcular algo: ela e texto fixo com dois simbolos');
  assert.doesNotMatch(src, /className="atsum"/,
    'o rodape "10 blocos · 34 dias com base de 34" nao volta ao Roteiro');
});

test('o apagar da cidade nao e destacado', () => {
  // "ela nao pode aparecer 'apagar esta cidade' assim destacado, nao importa
  // se ela e criada depois ou se ja veio com o sistema, elas tem que ser
  // padrao" (08/09). Era --rust e sublinhado. A lixeira em TODA cidade, com
  // CONFIRMAR digitado, e o resto do pedido e ainda nao existe.
  const css = readFileSync(join(RAIZ, 'src/app/identidade.css'), 'utf8');
  const regra = css.match(/\.apagarcidade \{[\s\S]*?\}/);
  assert.ok(regra, 'nao achei a regra .apagarcidade');
  assert.doesNotMatch(regra[0], /--rust|--ochre|text-decoration:\s*underline/,
    'o destaque voltou ao apagar da cidade');
});

test('os TRES numeros de Atracoes seguem a bandeira, e nenhum e da viagem toda', () => {
  // Eram quatro, e so o primeiro seguia o pais — os outros tres eram da
  // viagem inteira, na mesma linha, sem nada dizendo qual era qual.
  // Perguntado, ele escolheu "os tres seguem o pais". O erro que isto
  // impede e silencioso: `attrEurAll` no lugar de `attrEurCountry` da um
  // numero plausivel que simplesmente nao muda quando ele troca de
  // bandeira, e ninguem repara olhando um pais so.
  const src = readFileSync(join(RAIZ, 'src/screens/Atracoes.tsx'), 'utf8');
  const bs = src.match(/<div className="bigsum">[\s\S]*?\n      <\/div>/);
  assert.ok(bs, 'nao achei o .bigsum de Atracoes');

  const quantos = (bs[0].match(/^        <div>$/gm) ?? []).length;
  assert.equal(quantos, 3, `a linha tem ${quantos} numeros, e sao tres`);

  // Os tres valores nascem no topo do componente, todos com selCO.
  const cab = src.slice(0, src.indexOf('return ('));
  for (const nome of ['real', 'fora', 'pct']) {
    const m = cab.match(new RegExp(`const ${nome} = C\\.(\\w+)\\(s, selCO`));
    assert.ok(m, `${nome} tem que sair de uma funcao de calc com selCO`);
  }
  assert.match(cab, /const pct = C\.attrPctPais\(s, selCO\)/);
  assert.doesNotMatch(bs[0], /attrEurAll/,
    'attrEurAll aqui volta a mostrar a viagem toda no lugar do pais');
});

// ============================================================
// "COMPRO ANTES" NA TELA  (09/09/2026)
//
// Tres decisoes de desenho que se desfazem sem dar erro, e cada uma tem uma
// frase dele por tras. Ver o desenho em
// docs/superpowers/specs/2026-09-09-comprar-antes-design.md.
// ============================================================

test('a intencao e ETIQUETA, e nao uma segunda caixinha', () => {
  // As duas abas JA TEM uma caixinha na linha: "comprado" em Transporte,
  // "ja paguei" em Atracoes. Uma segunda caixinha ao lado seria
  // indistinguivel dela — e a regua dele de 08/09 e literal: "nao precisa
  // ter tantos campos... nao entendi porque tem dois campos de dinheiro".
  for (const rel of ['src/screens/Transporte.tsx', 'src/screens/Atracoes.tsx']) {
    const src = readFileSync(join(RAIZ, rel), 'utf8');
    const m = [...src.matchAll(/type="checkbox"/g)];
    assert.equal(m.length, 1, `${rel}: tem ${m.length} caixinhas, e e uma so`);

    // e a intencao tem que estar la, como botao de etiqueta
    assert.match(src, /className=\{`dtag tgl\$\{[^}]*buy_ahead/,
      `${rel}: a etiqueta de "compro antes" nao esta mais aqui`);
  }
});

test('o prazo da atracao SO existe com a tag ligada', () => {
  // Desligada, o campo nao ocupa lugar nenhum: e o que impede a linha de
  // crescer para as atracoes que se paga na porta, que sao a maioria.
  const src = readFileSync(join(RAIZ, 'src/screens/Atracoes.tsx'), 'utf8');
  assert.ok(src.includes('ahead_days'), 'o campo de prazo desapareceu de Atracoes');

  // A CONDICAO TEM QUE COLAR NO CAMPO. A primeira versao deste guard olhava
  // "os 260 caracteres antes de `ahead_days`" e era VAZIA: ali dentro cabem
  // o `className` e o `title` do botao, que tambem leem `it.buy_ahead`.
  // Trocar a condicao do campo por `{true ? (` passava verde. Descoberto
  // sabotando, 09/09.
  assert.match(
    src,
    /\{it\.buy_ahead \? \(\s*<NumField\s+fk=\{`attraction\|\$\{it\.id\}\|ahead_days`\}/,
    'o campo de dias passou a aparecer sempre, com a tag ligada ou nao',
  );
});

test('a linha do transporte no Painel conta os que ele COMPRA ANTES', () => {
  // A confusao de uma letra desta etapa: `legDone`/`s.legs.length` conta
  // TODOS os trechos e da dois numeros plausiveis — mas o pedido dele e
  // "so os que compro antes", e o metro do dia a dia nunca fica pendente.
  const src = readFileSync(join(RAIZ, 'src/screens/Painel.tsx'), 'utf8');
  assert.match(src, /C\.legAhead\(s\)/, 'o Painel parou de usar legAhead');
  assert.doesNotMatch(src, /\{C\.legDone\(s\)\} de \{s\.legs\.length\}/,
    'a linha voltou a contar todos os trechos');
});

test('prato tipico NAO ganha campo de dinheiro', () => {
  // Regra 5.8: prato nao tem dia, entao nunca entra em conta nenhuma. Um
  // campo de valor nele prometeria uma soma que nao existe.
  const src = readFileSync(join(RAIZ, 'src/screens/Comidas.tsx'), 'utf8');
  const i = src.indexOf('food|${it.id}|price_eur');
  assert.ok(i > 0, 'o campo de valor desapareceu de Comidas');
  const antes = src.slice(Math.max(0, i - 400), i);
  assert.match(antes, /it\.kind === 'prato' \? null :/,
    'o campo de valor passou a aparecer tambem no prato tipico');

  // e a grade de quatro colunas tem que acompanhar, senao a linha desmonta
  assert.match(src, /it\.kind === 'prato' \? '' : ' fk4'/);
  const css = readFileSync(join(RAIZ, 'src/app/extras.css'), 'utf8');
  const g = css.match(/\.mrow\.fk4 \{[\s\S]*?\}/);
  assert.ok(g, 'a grade fk4 nao existe mais');
  assert.match(g[0], /grid-template-areas:\s*"nm st pr x"/,
    'a area `pr` saiu da grade: o campo de preco cai numa faixa implicita');
});

test('as tres tabelas de dinheiro do Painel nao voltam a ser cinco', () => {
  // A Tabela 2 dele: "Total pago / Total estimado / Valor Acumulado". Eram
  // cinco numeros por categoria, e o que os substituiu nao e uma
  // reorganizacao: e outra pergunta ("quanto levo no bolso").
  const src = readFileSync(join(RAIZ, 'src/screens/Painel.tsx'), 'utf8');
  assert.doesNotMatch(src, /className="bigsum b5"/,
    'a linha de cinco numeros por categoria voltou ao Painel');
  for (const r of ['total pago', 'total estimado', 'valor acumulado'])
    assert.ok(src.includes(`<span>${r}</span>`), `faltou "${r}" no Painel`);
  assert.match(src, /C\.estimadoBrl\(s\)/);
  assert.match(src, /C\.cxTotalBrl\(s\)/);
});

// ============================================================
// A CAMA VEM DA HOSPEDAGEM, E O DIA LIDERA POR ONDE ELE PASSA  (09/09/2026)
// ============================================================

test('as datas da hospedagem sao DATAS, e as noites nao se digitam mais', () => {
  // Eram texto livre ("ex. dia 12 - 15h"), e nao ha faixa de dias que se
  // tire disso — sem data de verdade a ideia dele (a hospedagem manda na
  // base do Roteiro) simplesmente nao existe.
  const src = readFileSync(join(RAIZ, 'src/screens/Hospedagem.tsx'), 'utf8');

  for (const campo of ['check_in', 'check_out']) {
    const i = src.indexOf(`stay_option|\${o.id}|${campo}`);
    assert.ok(i > 0, `o campo ${campo} desapareceu`);
    // o componente vem ANTES do fk, na abertura da tag
    const antes = src.slice(Math.max(0, i - 120), i);
    assert.match(antes, /<DateField\s*$|<DateField\s+/,
      `${campo} voltou a ser texto livre: sem data nao ha faixa de dias`);
  }

  assert.doesNotMatch(src, /stay_option\|\$\{o\.id\}\|nights/,
    'o campo de noites digitado voltou, e ele pode discordar das datas');
  assert.match(src, /C\.noitesDaOpcao\(o\)/, 'as noites tem que sair das datas');
});

test('marcar "e esta" NAO escreve em day.base, e recusa quando bate', () => {
  // ESTE GUARD ERA O CONTRARIO ate a tarde de 09/09, e a inversao e o
  // ponto: a primeira versao ESCREVIA a base dos dias, e ele olhou a tela e
  // viu o app afirmando onde dorme numa cidade que nao havia escolhido. O
  // bloco do Roteiro passou a sair da propria reserva (`C.estadias`), e
  // escrever uma copia em `day.base` traria de volta os dois problemas:
  // a afirmacao falsa, e uma copia que fica velha quando ele desmarca.
  const src = readFileSync(join(RAIZ, 'src/screens/Hospedagem.tsx'), 'utf8');
  const m = src.match(/const marcar = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(m, 'nao achei a funcao marcar');
  const f = m[0];

  assert.doesNotMatch(f, /'day'/,
    'marcar voltou a escrever no dia: o bloco tem que sair da propria reserva');
  assert.match(f, /now\('stay_option', o\.id, 'chosen', true\)/);
  assert.match(f, /C\.opcoesQueBatem\(s, o\)/,
    'a recusa por datas que batem saiu, e ele pediu "o app recusa e avisa"');
  assert.match(f, /setRecusa\(/, 'a recusa tem que aparecer na tela, nao num title');

  // e a regra de "uma marcada por cidade" nao pode voltar: ele dorme em
  // Madrid duas vezes, e desmarcar a primeira ao marcar a segunda tirava
  // uma estadia inteira do Roteiro e do total.
  assert.doesNotMatch(f, /stayChosen\(/,
    'voltou a desmarcar a anterior da mesma cidade');
});

test('a cama do dia e SO LEITURA nas duas telas do Roteiro', () => {
  // Ela se edita em UM lugar: o campo do cartao do dia (e, por cima dele, a
  // hospedagem marcada). Dois lugares mexendo na mesma coisa foi o problema
  // do DiaTags em 07/09, e aqui seria pior: a base decide bloco, noites e
  // as contas de hospedagem.
  for (const rel of ['src/screens/Roteiro.tsx', 'src/screens/roteiro/Vista.tsx']) {
    const src = readFileSync(join(RAIZ, rel), 'utf8');
    const i = src.search(/className="dv?cama"/);
    assert.ok(i > 0, `${rel}: a linha da cama desapareceu`);
    const bloco = src.slice(i, i + 420);
    assert.doesNotMatch(bloco, /TextField|<input|onCommit|patch\(/,
      `${rel}: a linha da cama virou campo`);
  }
});

test('o dia lidera pela cidade que ele PASSA, e o bloco lista todas', () => {
  const src = readFileSync(join(RAIZ, 'src/screens/Roteiro.tsx'), 'utf8');
  assert.match(src, /C\.cidadesDoDia\(s, iso\)/, 'a linha do dia parou de ler as cidades do dia');
  assert.match(src, /C\.cidadesDoBloco\(s, \{ from: estadia\.from, to: estadia\.to \}\)/,
    'o cabecalho do bloco parou de listar as cidades de passagem');
  // e a cidade vem ANTES da cama na linha do dia
  assert.ok(src.indexOf('dcid') < src.indexOf('dcama'),
    'a cama voltou a vir antes da cidade onde ele vai');
});

test('o cartao do dia diz que aquele campo e o PLANO, e nao a cama', () => {
  // O rotulo era "Onde eu durmo / qual e a base", e era essa palavra que
  // fazia o app parecer saber onde ele dorme. Agora o campo e o plano dele,
  // e o cartao diz de onde a cama vem de verdade — ou que ela nao existe.
  const src = readFileSync(join(RAIZ, 'src/screens/roteiro/Editor.tsx'), 'utf8');
  assert.match(src, /C\.hospedagemDoDia\(s, iso\)/);
  assert.match(src, /Meu plano para este dia/, 'o rotulo voltou a falar de cama');
  assert.doesNotMatch(src, /Onde eu durmo/, 'o rotulo antigo voltou');
  assert.match(src, /sem hospedagem definida para este dia/,
    'o dia sem reserva parou de dizer que nao tem cama');
});

test('a cama sai da RESERVA, e o plano nunca vira "durmo em"', () => {
  // A queixa dele de 09/09, na tela: "aqui voce ja esta colocando onde vou
  // dormir, sendo que nem escolhi o airbnb". A linha "durmo em" tem que ler
  // `hospedagemDoDia` — o airbnb marcado — e NUNCA `day.base`, que e o
  // plano dele. Trocar um pelo outro nao da erro nenhum: volta a aparecer
  // uma cama plausivel em 34 dias.
  for (const rel of ['src/screens/Roteiro.tsx', 'src/screens/roteiro/Vista.tsx']) {
    // SEM COMENTARIO, e a primeira versao deste guard morreu por isso: a
    // janela pegava a frase "plano base" de um comentario meu logo abaixo
    // e acusava a tela de ler o plano. Comentario nao e codigo.
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').replace(/\/\/.*$/gm, '');
    const m = src.match(/<div className="dv?cama">[\s\S]*?<\/div>/);
    assert.ok(m, `${rel}: a linha da cama desapareceu`);
    assert.match(m[0], /hosp\.city/, `${rel}: a cama parou de sair da reserva`);
    assert.doesNotMatch(m[0], /\bbase\b/, `${rel}: a cama voltou a ler o plano`);
    assert.match(src, /C\.hospedagemDoDia\(s, iso\)/);
  }
  // O "em trânsito" continua tratado, mas agora so no PLANO: se ele
  // escrever isso no campo livre, aquilo nao e cama nem noite.
  const rot = readFileSync(join(RAIZ, 'src/screens/Roteiro.tsx'), 'utf8');
  assert.match(rot, /C\.ehTransito\(plano\)/, 'o plano perdeu o tratamento de transito');

  // e a regra vive em UM lugar so
  const calc = readFileSync(join(RAIZ, 'src/lib/calc.ts'), 'utf8');
  const copias = (calc.match(/tr\[âa\]nsito/g) ?? []).length;
  assert.equal(copias, 1, `o regex de transito tem ${copias} copias em calc.ts, e e uma so`);
});

test('o plano do roteiro e TABELA de tres campos, e nao um aviso', () => {
  // A primeira versao usou o `aviso` (titulo + texto + cor) para nao
  // precisar de SQL, e ele apontou na hora: "aqui sao 3 campos: cidade,
  // dias e um campo escrito, da mesma forma que tinhamos antes". Com tres
  // colunas os dias sao um NUMERO que soma; com um campo de texto so,
  // "Lisboa 4 dias" e uma frase.
  const src = readFileSync(join(RAIZ, 'src/screens/Painel.tsx'), 'utf8');
  assert.doesNotMatch(src, /<Avisos spot="painel:roteiro"/,
    'o plano voltou a ser um aviso, e os campos eram os errados');
  for (const campo of ['place', 'days', 'note'])
    assert.ok(src.includes(`plan_row|\${r.id}|${campo}`), `faltou o campo ${campo}`);
  assert.match(src, /C\.planRows\(s\)/);

  // e a grade tem que ter a area `pr`, senao o campo de dias cai numa
  // faixa implicita e a linha desmonta calada (a mordida da area `cu`).
  const css = readFileSync(join(RAIZ, 'src/app/extras.css'), 'utf8');
  const g = css.match(/\.mrow\.pl3 \{[\s\S]*?\}/);
  assert.ok(g, 'a grade pl3 nao existe');
  assert.match(g[0], /grid-template-areas:\s*"nm pr x"/);
});

test('o plano do roteiro NAO alimenta conta nenhuma', () => {
  // O ponto inteiro da tarde de 09/09: o app parou de afirmar cama e noite
  // a partir de plano. Se `planRows` aparecer numa formula de dinheiro ou
  // de noite, a afirmacao falsa volta por outro caminho.
  const calc = readFileSync(join(RAIZ, 'src/lib/calc.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const usos = [...calc.matchAll(/\bplanRows\b/g)].length;
  assert.equal(usos, 2, `planRows aparece ${usos}x em calc.ts (a definicao e o s.planRows), e nao pode entrar em formula`);
  for (const f of ['nightsAll', 'baseList', 'estadias', 'totalBrl', 'estimadoSides']) {
    const m = calc.match(new RegExp(`(export (?:function|const) ${f}[\\\\s\\\\S]*?\\n)(?=export |$)`));
    if (m) assert.doesNotMatch(m[1], /planRows/, `${f} passou a ler o plano dele`);
  }
});

test('a pagina reserva a faixa da barra de rolagem', () => {
  // Sem isto, todo bloco que abre e fecha desloca a pagina ~15px: a barra
  // aparece, a largura util diminui, e o botao pula debaixo do dedo. Ele viu
  // nas tres gavetas do dia ("o botao desloca quando e clicado"), mas o
  // rascunho do Painel, os avisos e o acrescentar cidade fazem o mesmo.
  const css = readFileSync(join(RAIZ, 'src/app/extras.css'), 'utf8');
  assert.match(css, /html \{[^}]*scrollbar-gutter:\s*stable/,
    'a faixa da barra deixou de ser reservada, e a pagina volta a pular');
});

test('a chave da gaveta tem LUGAR, e nao sobra', () => {
  // Ele viu o interruptor deslocar ao ser clicado, e nas duas fotos era
  // sempre a linha recem-clicada. Com `justify-content: space-between` o
  // interruptor encontra a borda direita e qualquer mudanca de largura do
  // rotulo o move; com uma coluna de grade da largura dele, nao ha o que
  // mover. `min-width: 0` no rotulo faz parte do conserto: sem ele um
  // texto que nao caiba estoura o 1fr e empurra a coluna.
  const css = readFileSync(join(RAIZ, 'src/app/extras.css'), 'utf8');
  const r = css.match(/\.liga \{[\s\S]*?\}/);
  assert.ok(r, 'nao achei a regra .liga');
  assert.match(r[0], /grid-template-columns:\s*1fr 46px/,
    'a chave voltou a depender de sobra em vez de ter coluna');
  assert.doesNotMatch(r[0], /justify-content:\s*space-between/);

  const lbl = css.match(/\.liga \.lbl \{[\s\S]*?\}/);
  assert.match(lbl[0], /min-width:\s*0/, 'sem min-width:0 o rotulo empurra a coluna');
});

test('o afundadinho do clique nao vale para botao de largura inteira', () => {
  // O defeito que ele viu tres vezes: `button:active { transform:
  // scale(.97) }` e global, e a linha da gaveta e um <button> de 1229px.
  // 3% disso sao 37px — apertar jogava o rotulo e a chave para o centro.
  // A frase dele que resolveu: "ela SO desloca na hora do clique", que e
  // exatamente o que `:active` significa.
  const css = readFileSync(join(RAIZ, 'src/app/identidade.css'), 'utf8');
  assert.match(css, /\.liga:active \{ transform: none; \}/,
    'a linha da gaveta voltou a encolher no clique');
  assert.match(css, /\.liga:active \.sw \{ transform: scale/,
    'o afundadinho tem que ir para a CHAVE, que e onde o dedo esta');

  // e a regra global continua existindo para os botoes pequenos, que e
  // onde ela serve
  assert.match(css, /button:active[^{]*\{ transform: scale\(\.97\); \}/);
});
