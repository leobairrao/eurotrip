// ============================================================
// Os avisos deixaram de ser meus em 05/09 (regra 5.6, revista).
// O que nao pode quebrar: o corpo e TEXTO PURO, o negrito e *assim*,
// e o que ele digitar nunca pode virar tag.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marcado, deHtml, escHtml, stripTags } from '@/lib/fmt.ts';
import { avisosSemeados } from '@/lib/avisos-semente.ts';

// ---------------- *negrito* ----------------
test('*assim* vira negrito, e so isso vira HTML', () => {
  assert.equal(marcado('nada aqui'), 'nada aqui');
  assert.equal(marcado('custa *€ 28* a diária'), 'custa <b>€ 28</b> a diária');
  assert.equal(marcado('*tudo* e *nada*'), '<b>tudo</b> e <b>nada</b>');
});

test('o que ele digitar NUNCA vira tag', () => {
  // o bug de 04/09: '<' sem '>' engolia o resto da frase no innerHTML
  assert.equal(marcado('confirmar <ver e-mail'), 'confirmar &lt;ver e-mail');
  assert.equal(marcado('<b>eu mesmo</b>'), '&lt;b&gt;eu mesmo&lt;/b&gt;');
  assert.equal(marcado('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(marcado('a & b'), 'a &amp; b');
  // e nem escrevendo tag DENTRO do asterisco
  assert.equal(marcado('*<i>x</i>*'), '<b>&lt;i&gt;x&lt;/i&gt;</b>');
});

test('asterisco solto ou vazio nao quebra nada', () => {
  assert.equal(marcado('3 * 4 = 12'), '3 * 4 = 12', 'asterisco sozinho fica');
  assert.equal(marcado('**'), '**', 'sem conteudo dentro, nao vira nada');
  assert.equal(marcado('um * dois * tres'), 'um <b> dois </b> tres');
  assert.equal(marcado(''), '');
  assert.equal(marcado(null), '');
  assert.equal(marcado(undefined), '');
});

test('o negrito nao atravessa linha', () => {
  // senao um asterisco esquecido no comeco negritaria o aviso inteiro
  assert.equal(marcado('abre *aqui\ne fecha* ali'), 'abre *aqui\ne fecha* ali');
});

// ---------------- a conversao da semeadura ----------------
test('deHtml traz o <b> das minhas notas para o asterisco', () => {
  assert.equal(deHtml('custa <b>€ 28</b> a diária'), 'custa *€ 28* a diária');
  assert.equal(deHtml('<i>talvez</i> valha'), 'talvez valha', '<i> nao tem par: vira texto');
  assert.equal(deHtml('sem tag nenhuma'), 'sem tag nenhuma');
  assert.equal(deHtml(''), '');
  assert.equal(deHtml(null), '');
});

test('ida e volta: o que eu semeei aparece igual ao que eu escrevi', () => {
  assert.equal(marcado(deHtml('a <b>b</b> c')), 'a <b>b</b> c');
  assert.equal(marcado(deHtml('<b>tudo</b> e <b>nada</b>')), '<b>tudo</b> e <b>nada</b>');
});

// ---------------- a lista semeada ----------------
const SEMENTE = avisosSemeados();

test('a semeadura cobre as quatro telas', () => {
  const conta = (p) => SEMENTE.filter((a) => a.spot.startsWith(p)).length;
  assert.ok(conta('atracoes:') >= 7, 'aviso de cidade');
  assert.ok(conta('roteiro:') >= 18, 'aviso de dia');
  assert.ok(conta('comidas:') >= 15, 'aviso de pais e "nao vale"');
  assert.equal(conta('transporte'), 1, 'o "nao conte duas vezes"');
  assert.ok(SEMENTE.length >= 40, `poucos avisos: ${SEMENTE.length}`);
});

test('cada aviso semeado tem seed_id proprio — senao um apaga o outro', () => {
  const ids = SEMENTE.map((a) => a.seed_id);
  assert.equal(new Set(ids).size, ids.length, 'seed_id repetido');
  for (const a of SEMENTE) {
    assert.ok(a.seed_id, 'aviso semeado sem seed_id nao respeita a regra 5.14');
    assert.match(a.seed_id, /^av:/);
  }
});

test('nenhum aviso semeado guarda tag: o banco so tem texto puro', () => {
  for (const a of SEMENTE) {
    assert.doesNotMatch(a.title, /<[a-z/]/i, `tag no titulo: ${a.seed_id}`);
    assert.doesNotMatch(a.body, /<[a-z/]/i, `tag no corpo: ${a.seed_id}`);
  }
});

test('todo aviso tem tom valido e posicao', () => {
  for (const a of SEMENTE) {
    assert.ok(['free', 'warn', 'alert'].includes(a.tone), `tom estranho: ${a.tone}`);
    assert.equal(typeof a.position, 'number');
    assert.ok(a.spot.length > 0);
  }
});

test('as posicoes do "nao vale" nao empatam dentro do mesmo pais', () => {
  const porSpot = new Map();
  for (const a of SEMENTE) {
    if (!porSpot.has(a.spot)) porSpot.set(a.spot, []);
    porSpot.get(a.spot).push(a.position);
  }
  for (const [spot, pos] of porSpot) {
    assert.equal(new Set(pos).size, pos.length, `posicao repetida em ${spot}`);
  }
});

test('escHtml e a base: o marcado depende dele', () => {
  assert.equal(escHtml('<>&"'), '&lt;&gt;&amp;&quot;');
});

// ============================================================
// A poda da ENTRADA (achado da revisao de 05/09).
//
// Ate 05/09 todo campo de texto passava por stripTags a cada tecla.
// stripTags nao escapa: APAGA o trecho entre "<" e ">". O texto sumia
// do BANCO, nao so da tela — o bug de 04/09 ao contrario.
// Hoje o banco guarda o que ele digitou, e quem escapa e a saida.
// ============================================================
test('stripTags APAGA — e por isso ele nao pode mais tocar na entrada', () => {
  assert.equal(stripTags('metrô custa < 2 euros e > 1 zona'), 'metrô custa  1 zona');
  assert.equal(stripTags('Madrid <-> Paris de trem'), 'Madrid  Paris de trem');
  assert.equal(stripTags('levar <de 10kg> na mochila'), 'levar  na mochila');
});

test('a saida entrega inteiro o que a poda comeria', () => {
  for (const v of [
    'metrô custa < 2 euros e > 1 zona',
    'Madrid <-> Paris de trem',
    'levar <de 10kg> na mochila',
    'peso > 10kg e preço < 20',
  ]) {
    const html = marcado(v);
    // nada foi apagado: desescapando, volta identico
    const devolta = html
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    assert.equal(devolta, v, `perdeu texto: ${v}`);
    // e nenhuma tag de verdade saiu
    assert.doesNotMatch(html, /<(?!\/?b>)/, `virou tag: ${html}`);
  }
});

test('o negrito continua funcionando junto com sinal de menor', () => {
  assert.equal(marcado('almoço *< 15 euros*'), 'almoço <b>&lt; 15 euros</b>');
});
