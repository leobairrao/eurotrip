// ============================================================
// Quem entra e quem nao entra. A entrada e so o nome (escolha de
// 04/09/2026), entao esta e a unica porta do app — e ela nao pode
// estourar, nem deixar passar nome que nao esta na lista.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chave, emailDe } from '@/lib/entrar.ts';

const LEO = 'leobairrao05@gmail.com';
const LU = 'luisaanandamelo@gmail.com';

test('os dois entram, escrito de todo jeito', () => {
  for (const v of ['leobairrao', 'Leo Bairrão', 'LEOBAIRRAO', ' leo ', 'leonardo', LEO, LEO.toUpperCase()])
    assert.equal(emailDe(v), LEO, `deveria ser o Leo: ${JSON.stringify(v)}`);
  for (const v of ['luananda', 'Lu Ananda', 'LUANANDA', 'lu', 'luisa', 'ananda', LU])
    assert.equal(emailDe(v), LU, `deveria ser a Lu: ${JSON.stringify(v)}`);
});

test('nome de fora nao entra', () => {
  for (const v of ['joao', 'admin', 'root', 'lua', 'leob', 'ananda2', 'lu@gmail.com', 'x'])
    assert.equal(emailDe(v), null, `nao devia entrar: ${JSON.stringify(v)}`);
});

test('as chaves do Object.prototype NAO furam a lista', () => {
  // QUEM e Object.create(null). Com um {} literal, 'constructor' devolvia
  // a funcao Object — truthy — e furava a trava.
  for (const v of Object.getOwnPropertyNames(Object.prototype))
    assert.equal(emailDe(v), null, `${v} nao pode entrar`);
  // e as variacoes que a normalizacao junta na mesma chave
  for (const v of ['constructor', 'CONSTRUCTOR', 'Constructor', 'c.o.n.s.t.r.u.c.t.o.r', '__proto__', 'toString'])
    assert.equal(emailDe(v), null, `${v} nao pode entrar`);
});

test('nada que nao seja string entra, e nada estoura', () => {
  const zoo = [
    null, undefined, 123, 0, true, false, {}, [], ['lu'], [['lu']],
    { usuario: 'lu' }, { toString: 'x' }, { toString: 1, valueOf: 2 },
    [{ toString: 'x' }], Object.create(null), Symbol.iterator,
    () => 'lu', new Map(), NaN, Infinity,
  ];
  for (const v of zoo) {
    assert.doesNotThrow(() => emailDe(v), `estourou com ${String(typeof v)}`);
    assert.equal(emailDe(v), null, `nao devia entrar: ${String(typeof v)}`);
  }
});

test('so espaco, vazio e pontuacao pura nao entram', () => {
  for (const v of ['', '   ', '\t\n', '...', '---', '@@@', '   @  '])
    assert.equal(emailDe(v), null, `nao devia entrar: ${JSON.stringify(v)}`);
});

test('chave() normaliza como promete', () => {
  assert.equal(chave('Leo Bairrão'), 'leobairrao');
  assert.equal(chave('LU  ANANDA'), 'luananda');
  // o ponto tambem cai — mas cai dos DOIS lados, porque o e-mail do mapa
  // passa pela mesma chave(). Por isso digitar o e-mail inteiro entra.
  assert.equal(chave('a@b.com'), 'a@bcom');
  assert.equal(chave('leobairrao05@gmail.com'), 'leobairrao05@gmailcom');
  assert.equal(chave('José-Ñoño'), 'josenono');
  assert.equal(chave('  '), '');
  assert.equal(chave(null), '');
  assert.equal(chave(42), '');
  assert.equal(chave({}), '');
  assert.equal(chave({ toString: 'nao chamavel' }), '', 'String() estouraria aqui');
});

test('string gigante nao trava nem entra', () => {
  const gigante = 'lu'.repeat(500_000);
  assert.equal(emailDe(gigante), null);
  assert.equal(emailDe('luananda' + 'x'.repeat(100_000)), null);
});
