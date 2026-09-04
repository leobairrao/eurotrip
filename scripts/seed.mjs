// ============================================================
// npm run seed — a primeira carga, e a reconciliacao (secao 12.1 e 12.2).
//
// Pode rodar quantas vezes quiser:
//   item com o seed_id ja na tabela  -> nao mexe (ele pode ter editado)
//   seed_id em killed_seed           -> NUNCA volta (regra 5.14)
//   senao                            -> insere
//
// E assim que pesquisa nova entra sem duplicar nada (secao 12.4).
// ============================================================
import { db, lerJson, precisa, valOrNull } from './_db.mjs';

const diasBases   = lerJson('dados/dias-bases.json');
const atrDele     = lerJson('dados/atracoes-dele.json');
const atrSug      = lerJson('dados/atracoes-sugeridas.json');
const comidasDele = lerJson('dados/comidas-dele.json');
const reservas    = lerJson('dados/reservas-dele.json');
const transportes = lerJson('dados/transportes.json');
const hospedagem  = lerJson('dados/hospedagem.json');

const log = [];
const conta = (t, n) => { if (n) log.push(`  ${String(n).padStart(4)} ${t}`); };

// ---------- o que o usuario apagou, e nunca volta ----------
const mortos = new Set(
  (await precisa(await db.from('killed_seed').select('seed_id'), 'ler killed_seed')).map(
    (r) => r.seed_id,
  ),
);

async function seedIdsDe(tabela) {
  const rows = await precisa(
    await db.from(tabela).select('seed_id').not('seed_id', 'is', null),
    `ler seed_id de ${tabela}`,
  );
  return new Set(rows.map((r) => r.seed_id));
}

// ============ 1. os 34 dias ============
// base preenchida, plan VAZIO de proposito (regra 5.5)
{
  const isos = Object.keys(diasBases).sort();
  const existentes = new Set(
    (await precisa(await db.from('day').select('iso'), 'ler day')).map((r) => String(r.iso)),
  );
  const novos = isos
    .filter((iso) => !existentes.has(iso))
    .map((iso) => ({ iso, base: diasBases[iso].c ?? '', plan: '' }));
  if (novos.length) await precisa(await db.from('day').insert(novos), 'inserir day');
  conta('dias', novos.length);
}

// ============ 2. atracoes ============
{
  const have = await seedIdsDe('attraction');
  const novas = [];
  const add = (prefixo, fonte, status) => {
    for (const [city, itens] of Object.entries(fonte)) {
      itens.forEach(([name, price, note], i) => {
        const seed_id = `${prefixo}:${city}:${i}`;
        if (have.has(seed_id) || mortos.has(seed_id)) return;
        novas.push({
          city, name,
          price_eur: Number(price) || 0,
          note: note ?? '',
          status, kind: 'passeio',
          day_iso: null, seed_id,
        });
      });
    }
  };
  add('m', atrDele, 'backlog');    // 35 -> backlog
  add('s', atrSug, 'sugerida');    // 69 -> sugerida
  if (novas.length) await precisa(await db.from('attraction').insert(novas), 'inserir attraction');
  conta('atracoes', novas.length);
}

// ============ 3. comidas ============
{
  const have = await seedIdsDe('food');
  const novas = [];
  for (const [country, itens] of Object.entries(comidasDele)) {
    itens.forEach(([name, note], i) => {
      const seed_id = `f:${country}:${i}`;
      if (have.has(seed_id) || mortos.has(seed_id)) return;
      novas.push({ country, name, note: note ?? '', kind: 'prato', day_iso: null, seed_id });
    });
  }
  if (novas.length) await precisa(await db.from('food').insert(novas), 'inserir food');
  conta('comidas', novas.length);
}

// ============ 4. transporte ============
// position = a ordem do arquivo. A posicao E a identidade (secao 12.2).
{
  const have = await seedIdsDe('leg');
  const novos = transportes
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => !have.has(`t:${i}`) && !mortos.has(`t:${i}`))
    .map(({ t, i }) => ({
      position: i,
      name: t.n,
      note: t.w ?? '',
      kind: t.k ?? 'trem',
      amount: null,          // sem valor ate ele lancar
      currency: 'eur',       // regra 5.11: transporte comeca em euro
      bought: false,
      day_iso: null,
      seed_id: `t:${i}`,
    }));
  if (novos.length) await precisa(await db.from('leg').insert(novos), 'inserir leg');
  conta('trechos', novos.length);
}

// ============ 5. burocracia ============
{
  const have = await seedIdsDe('booking');
  const novos = reservas
    .map(([name, note], i) => ({ name, note, i }))
    .filter(({ i }) => !have.has(`b:${i}`) && !mortos.has(`b:${i}`))
    .map(({ name, note, i }) => ({
      position: i,
      name,
      note: note ?? '',
      amount: null,
      currency: 'brl',       // regra 5.11: burocracia comeca em real
      done: false,
      seed_id: `b:${i}`,
    }));
  if (novos.length) await precisa(await db.from('booking').insert(novos), 'inserir booking');
  conta('reservas', novos.length);
}

// ============ 6. hospedagem: 7 linhas vazias, uma por base ============
{
  const existentes = new Set(
    (await precisa(await db.from('stay').select('city'), 'ler stay')).map((r) => r.city),
  );
  const novas = hospedagem
    .filter((s) => !existentes.has(s.c))
    .map((s) => ({ city: s.c }));
  if (novas.length) await precisa(await db.from('stay').insert(novas), 'inserir stay');
  conta('hospedagens', novas.length);
}

// ============ 7. Caixa: uma linha por pessoa, vazia ============
{
  const existentes = new Set(
    (await precisa(await db.from('savings').select('who'), 'ler savings')).map((r) => r.who),
  );
  const novas = ['leo', 'lu']
    .filter((w) => !existentes.has(w))
    .map((who) => ({ who, goal: null, opening: null, currency: who === 'lu' ? 'eur' : 'brl' }));
  if (novas.length) await precisa(await db.from('savings').insert(novas), 'inserir savings');
  conta('linhas de caixa', novas.length);
}

// ============ 8. settings ============
await precisa(
  await db.from('settings').upsert({ id: 1 }, { onConflict: 'id', ignoreDuplicates: true }),
  'settings',
);

console.log('\n  semeadura pronta.');
console.log(log.length ? '\n  inserido agora:\n' + log.join('\n') : '\n  nada novo — o banco ja estava em dia.');
if (mortos.size) console.log(`\n  ${mortos.size} seed_id em killed_seed foram respeitados e nao voltaram.`);
console.log('');
