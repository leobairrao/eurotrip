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
  for (const rel of ['src/screens/roteiro/Editor.tsx',
                     'src/screens/roteiro/Acrescentar.tsx']) {
    if (!existsSync(join(RAIZ, rel))) continue;   // Acrescentar nasce na tarefa 3
    const src = readFileSync(join(RAIZ, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const chamadas = src.match(/now(?:Many)?\([\s\S]{0,300}?\)\s*[,;)\n]/g) ?? [];
    const poeNoDia = chamadas.filter((c) => /day_iso['"]?\s*[:,]\s*iso\b/.test(c));
    assert.ok(poeNoDia.length > 0, `${rel}: nenhum + poe no dia? o teste ficou cego`);
    for (const c of poeNoDia) {
      assert.match(
        c, /day_pos/,
        `${rel}: um + poe no dia sem escrever day_pos — o item vai nascer no topo.`
        + ` Use D.proximaPos(s, iso). Chamada: ${c.slice(0, 120)}`,
      );
    }
  }
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
