// ============================================================
// As duas regras de escrita no banco que a revisao de 05/09 achou
// quebradas — as duas em `store.tsx`, as duas invisiveis ate doer.
//
// 1. O REENVIO NAO TINHA TETO. `enviar` repetia a cada 30 s para
//    sempre. E enquanto a chave esta na fila, `merge.ts` PRESERVA
//    aquela coluna contra toda mudanca remota. Entao um erro
//    PERMANENTE (um check violado, uma coluna que nao existe, RLS
//    negando) fazia tres coisas juntas: reenvio eterno, app preso
//    em "erro", e aquela coluna daquela linha NUNCA MAIS aceitando
//    o que a outra pessoa escrevesse, ate dar F5.
//    E o modo de falha exato de uma migracao malfeita.
//
// 2. O `remove` gravava em killed_seed ANTES do DELETE. Se o DELETE
//    falhasse, o item sumia da tela, CONTINUAVA no banco, e o
//    seed_id ficava para sempre na lista de "nunca mais traga de
//    volta" (regra 5.14) — sem desfazer pelo app.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TENTATIVAS, apagar, daExcecao, daResposta, decidir,
} from '@/lib/escrita.ts';

// ------------------------------------------------------------
// Classificar: quem nao chegou no servidor x quem o servidor recusou
// ------------------------------------------------------------

test('resposta sem erro nao e falha nenhuma', () => {
  assert.equal(daResposta(null), null);
  assert.equal(daResposta(undefined), null);
});

test('erro que o servidor devolveu e recusa, e carrega o codigo', () => {
  const f = daResposta({ message: 'new row violates check constraint', code: '23514' });
  assert.equal(f.tipo, 'recusa');
  assert.equal(f.code, '23514');
});

test('recusa sem codigo continua sendo recusa', () => {
  assert.equal(daResposta({ message: 'permission denied' }).tipo, 'recusa');
  assert.equal(daResposta({ message: 'permission denied' }).code, null);
});

test('excecao e falha de rede: nunca chegou la', () => {
  const f = daExcecao(new TypeError('Failed to fetch'));
  assert.equal(f.tipo, 'rede');
  assert.match(f.msg, /Failed to fetch/);
});

test('excecao que nao e Error tambem vira rede, sem quebrar', () => {
  assert.equal(daExcecao('caiu').tipo, 'rede');
  assert.equal(daExcecao(undefined).tipo, 'rede');
});

// ------------------------------------------------------------
// Decidir: repetir ou desistir
// ------------------------------------------------------------

test('rede repete, com espera dobrando', () => {
  const rede = { tipo: 'rede', msg: 'sem rede' };
  assert.deepEqual(decidir(rede, 0), { acao: 'repetir', espera: 800 });
  assert.deepEqual(decidir(rede, 1), { acao: 'repetir', espera: 1600 });
  assert.deepEqual(decidir(rede, 2), { acao: 'repetir', espera: 3200 });
});

test('a espera tem teto de 30 s, como antes', () => {
  const d = decidir({ tipo: 'rede', msg: '' }, MAX_TENTATIVAS - 1);
  assert.equal(d.acao, 'repetir');
  assert.ok(d.espera <= 30000, 'nunca espera mais de 30 s');
});

test('O TETO: depois de MAX_TENTATIVAS a rede desiste — era o laco infinito', () => {
  const rede = { tipo: 'rede', msg: 'sem rede' };
  assert.deepEqual(decidir(rede, MAX_TENTATIVAS), { acao: 'desistir', motivo: 'tentativas' });
  assert.deepEqual(decidir(rede, MAX_TENTATIVAS + 9), { acao: 'desistir', motivo: 'tentativas' });
});

test('recusa do servidor desiste NA HORA, na primeira tentativa', () => {
  // Repetir o mesmo payload que o banco ja recusou so serve para
  // congelar a coluna contra a outra pessoa.
  for (const code of ['23514', '42703', '42501', '23505', null]) {
    assert.deepEqual(
      decidir({ tipo: 'recusa', msg: 'nao', code }, 0),
      { acao: 'desistir', motivo: 'permanente' },
      `codigo ${code} devia parar na hora`,
    );
  }
});

test('recusa transitoria do Postgres ainda repete', () => {
  // Deadlock, serializacao e conexao caida sao "tente de novo",
  // nao "voce esta errado".
  for (const code of ['40001', '40P01', '08006', '57014']) {
    const d = decidir({ tipo: 'recusa', msg: '', code }, 0);
    assert.equal(d.acao, 'repetir', `codigo ${code} e transitorio`);
  }
});

test('mesmo transitorio nao repete para sempre', () => {
  const d = decidir({ tipo: 'recusa', msg: '', code: '40001' }, MAX_TENTATIVAS);
  assert.deepEqual(d, { acao: 'desistir', motivo: 'tentativas' });
});

// ------------------------------------------------------------
// Apagar: a ordem importa, e e irreversivel se estiver errada
// ------------------------------------------------------------

const espiao = ({ falhar = false } = {}) => {
  const ordem = [];
  return {
    ordem,
    deletar: async () => { ordem.push('delete'); return { error: falhar ? { message: 'nao' } : null }; },
    marcarMorto: async () => { ordem.push('killed_seed'); },
  };
};

test('o DELETE vem primeiro, e so entao o killed_seed', () => {
  const o = espiao();
  return apagar(o, 'b:4').then((r) => {
    assert.deepEqual(o.ordem, ['delete', 'killed_seed'], 'nesta ordem, sempre');
    assert.equal(r.ok, true);
  });
});

test('DELETE que falha NAO envenena o killed_seed (regra 5.14)', () => {
  const o = espiao({ falhar: true });
  return apagar(o, 'b:4').then((r) => {
    assert.deepEqual(o.ordem, ['delete'], 'o killed_seed nem foi tocado');
    assert.equal(r.ok, false);
  });
});

test('sem seed_id nao ha o que marcar', () => {
  const o = espiao();
  return apagar(o, null).then((r) => {
    assert.deepEqual(o.ordem, ['delete']);
    assert.equal(r.ok, true);
  });
});

test('excecao no DELETE tambem poupa o killed_seed', () => {
  const ordem = [];
  const o = {
    deletar: async () => { ordem.push('delete'); throw new TypeError('Failed to fetch'); },
    marcarMorto: async () => { ordem.push('killed_seed'); },
  };
  return apagar(o, 'b:4').then((r) => {
    assert.deepEqual(ordem, ['delete']);
    assert.equal(r.ok, false);
  });
});
