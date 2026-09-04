// ============================================================
// npm run import — traz o que o Leo JA PREENCHEU (secao 12.3).
//
// dados/estado-atual-do-leo.json e dado real e nao pode ser perdido.
// Rode DEPOIS de `npm run seed`.
//
// E idempotente: casa pelo sid / pelo nome e sobrescreve com o valor
// do JSON. Rodar duas vezes da o mesmo resultado.
// ============================================================
import { db, lerJson, precisa, valOrNull } from './_db.mjs';

const S = lerJson('dados/estado-atual-do-leo.json');
const transportes = lerJson('dados/transportes.json');

const ST  = { esc: 'escolhida', bac: 'backlog', sug: 'sugerida' };
const FKD = { pr: 'prato', rest: 'restaurante', cafe: 'cafe' };
const log = [];

// ---------- 0. killed: esta vazio hoje, mas importe de qualquer forma ----------
{
  const ids = Object.keys(S.killed ?? {});
  if (ids.length) {
    await precisa(
      await db.from('killed_seed').upsert(ids.map((seed_id) => ({ seed_id })), { onConflict: 'seed_id' }),
      'importar killed_seed',
    );
  }
  log.push(`killed_seed: ${ids.length}`);
}

// ---------- 1. o cambio que ele ja ajustou ----------
{
  const eur_rate = valOrNull(S.rate) ?? 6.0;
  await precisa(await db.from('settings').update({ eur_rate }).eq('id', 1), 'cambio');
  log.push(`cambio: ${eur_rate}`);
}

// ---------- 2. os dias: c -> base, p -> plan ----------
{
  let n = 0;
  for (const [iso, d] of Object.entries(S.days ?? {})) {
    await precisa(
      await db.from('day').update({ base: d.c ?? '', plan: d.p ?? '' }).eq('iso', iso),
      `dia ${iso}`,
    );
    n++;
  }
  log.push(`dias: ${n}`);
}

// ---------- 3. atracoes: casa pelo sid ----------
// Traz st (situacao), pr (preco), n (nome), w (nota) e day.
// O que ele criou a mao (sem sid) entra como linha nova.
{
  const porSeed = new Map(
    (await precisa(
      await db.from('attraction').select('id,seed_id').not('seed_id', 'is', null),
      'ler attraction',
    )).map((r) => [r.seed_id, r.id]),
  );
  let casadas = 0, criadas = 0, orfas = [];
  const novas = [];

  for (const [city, itens] of Object.entries(S.mine ?? {})) {
    for (const it of itens) {
      const patch = {
        name: it.n,
        price_eur: Number(valOrNull(it.pr) ?? 0),
        note: it.w ?? '',
        status: ST[it.st] ?? 'backlog',
        kind: it.k === 'tour' ? 'tour' : 'passeio',
        day_iso: it.day && String(it.day).trim() ? it.day : null,
      };
      if (it.sid && porSeed.has(it.sid)) {
        await precisa(await db.from('attraction').update(patch).eq('id', porSeed.get(it.sid)), `atracao ${it.sid}`);
        casadas++;
      } else if (it.sid) {
        orfas.push(it.sid);   // sid que nao existe mais no JSON de semente
      } else {
        novas.push({ city, ...patch, seed_id: null });
        criadas++;
      }
    }
  }
  if (novas.length) await precisa(await db.from('attraction').insert(novas), 'inserir atracoes dele');
  log.push(`atracoes: ${casadas} casadas pelo sid` + (criadas ? `, ${criadas} criadas por ele` : ''));
  if (orfas.length) log.push(`  ! ${orfas.length} sid sem par na semente: ${orfas.join(', ')}`);
}

// ---------- 4. comidas: k -> kind (pr/rest/cafe) ----------
// Inclui os 3 itens de teste dele na Espanha. Apagar coisa dele
// nao e decisao minha (secao 12.3).
{
  const existentes = await precisa(await db.from('food').select('id,country,name,seed_id'), 'ler food');
  const porSeed = new Map(existentes.filter((r) => r.seed_id).map((r) => [r.seed_id, r.id]));
  const porNome = new Map(existentes.map((r) => [`${r.country}|${r.name}`, r.id]));
  let n = 0;
  const novas = [];

  for (const [country, itens] of Object.entries(S.foods ?? {})) {
    itens.forEach((it, i) => {
      const kind = FKD[it.k] ?? 'prato';
      const patch = {
        name: it.n,
        note: it.w ?? '',
        kind,
        // prato nunca tem dia (regra 5.8)
        day_iso: kind !== 'prato' && it.day && String(it.day).trim() ? it.day : null,
      };
      const sid = `f:${country}:${i}`;
      const alvo = porSeed.get(sid) ?? porNome.get(`${country}|${it.n}`);
      if (alvo) novas.push({ __update: alvo, patch });
      else novas.push({ __insert: { country, ...patch, seed_id: null } });
      n++;
    });
  }
  for (const x of novas) {
    if (x.__update) await precisa(await db.from('food').update(x.patch).eq('id', x.__update), 'comida');
    else await precisa(await db.from('food').insert(x.__insert), 'comida nova');
  }
  log.push(`comidas: ${n}`);
}

// ---------- 5. burocracia: casa pelo NOME, traz v e resdone ----------
{
  const existentes = await precisa(await db.from('booking').select('id,name,position'), 'ler booking');
  const porNome = new Map(existentes.map((r) => [r.name, r.id]));
  let maxPos = existentes.reduce((a, r) => Math.max(a, r.position ?? 0), -1);
  let casadas = 0, criadas = 0;

  for (const r of S.res ?? []) {
    const patch = {
      name: r.n,
      note: r.w ?? '',
      amount: valOrNull(r.v),
      // a moeda padrao da burocracia e o REAL (regra 5.11)
      currency: r.m === 'eur' ? 'eur' : 'brl',
      done: !!(S.resdone ?? {})[r.id],
    };
    const alvo = porNome.get(r.n);
    if (alvo) {
      await precisa(await db.from('booking').update(patch).eq('id', alvo), `reserva ${r.n}`);
      casadas++;
    } else {
      await precisa(await db.from('booking').insert({ position: ++maxPos, ...patch, seed_id: null }), `reserva nova ${r.n}`);
      criadas++;
    }
  }
  log.push(`reservas: ${casadas} casadas pelo nome` + (criadas ? `, ${criadas} criadas por ele` : ''));
}

// ---------- 6. trechos: casa pelo sid; o tipo vem de transportes.json ----------
{
  const porSeed = new Map(
    (await precisa(
      await db.from('leg').select('id,seed_id').not('seed_id', 'is', null),
      'ler leg',
    )).map((r) => [r.seed_id, r.id]),
  );
  let casados = 0;
  for (const t of S.tr ?? []) {
    if (!t.sid || !porSeed.has(t.sid)) continue;
    const ix = parseInt(String(t.sid).split(':')[1], 10);
    const patch = {
      name: t.n,
      note: t.w ?? '',
      amount: valOrNull(t.v),
      // a moeda padrao do transporte e o EURO (regra 5.11)
      currency: t.m === 'brl' ? 'brl' : 'eur',
      // o trecho dele nasceu sem tipo: o tipo certo vem pelo indice do sid
      kind: t.k ?? transportes[ix]?.k ?? 'trem',
      bought: !!t.ok,
      day_iso: t.day && String(t.day).trim() ? t.day : null,
    };
    await precisa(await db.from('leg').update(patch).eq('id', porSeed.get(t.sid)), `trecho ${t.sid}`);
    casados++;
  }
  log.push(`trechos: ${casados} casados pelo sid`);
}

// ---------- 7. hospedagem, linhas livres e caixa (vazios hoje) ----------
{
  let n = 0;
  for (const [city, st] of Object.entries(S.stays ?? {})) {
    await precisa(
      await db.from('stay').update({
        address: st.end ?? '',
        check_in: st.ci ?? '',
        check_out: st.co ?? '',
        nightly_eur: valOrNull(st.diaria),
        nights: valOrNull(st.nt) === null ? null : Math.round(valOrNull(st.nt)),
        total_eur: valOrNull(st.total),
        link: st.link ?? '',
        notes: st.notas ?? '',
      }).eq('city', city),
      `hospedagem ${city}`,
    );
    n++;
  }
  log.push(`hospedagens: ${n}`);
}
{
  const linhas = (S.extra ?? []).map((x) => ({
    name: x.n, amount: valOrNull(x.v), currency: x.m === 'brl' ? 'brl' : 'eur',
  }));
  if (linhas.length) await precisa(await db.from('extra').insert(linhas), 'extras');
  log.push(`linhas livres: ${linhas.length}`);
}
{
  const cx = S.cx ?? {};
  const hoje = new Date().toISOString().slice(0, 10);
  let n = 0;
  for (const who of ['leo', 'lu']) {
    await precisa(
      await db.from('savings').update({
        goal: valOrNull((cx.meta ?? {})[who]),
        currency: (cx.cur ?? {})[who] === 'eur' ? 'eur' : 'brl',
      }).eq('who', who),
      `caixa ${who}`,
    );
    n++;
  }
  // O JSON dele ainda fala a lingua velha (saldo de hoje + aporte por mes).
  // Aqui vira aporte: o saldo com a data de hoje, cada mes no dia 1o.
  // Mesma traducao de supabase/03-caixa-aportes.sql.
  const aportes = [];
  for (const who of ['leo', 'lu']) {
    const ini = valOrNull((cx.ini ?? {})[who]);
    if (ini) aportes.push({ who, on_date: hoje, label: 'o que eu já tinha', amount: ini });
  }
  for (const [month, o] of Object.entries(cx.ap ?? {}))
    for (const who of ['leo', 'lu']) {
      const v = valOrNull(o?.[who]);
      if (v) aportes.push({ who, on_date: `${month}-01`, label: `aporte de ${month}`, amount: v });
    }
  // insert, nao upsert: o aporte nao tem mais chave natural para conflitar.
  // Rodar o import duas vezes duplicaria — e por isso ele so roda uma vez.
  if (aportes.length)
    await precisa(await db.from('contribution').insert(aportes), 'aportes');
  log.push(`caixa: ${n} linhas, ${aportes.length} aportes`);
}
{
  const ids = Object.keys(S.adopted ?? {});
  if (ids.length)
    await precisa(
      await db.from('adopted').upsert(ids.map((seed_id) => ({ seed_id })), { onConflict: 'seed_id' }),
      'adopted',
    );
  log.push(`sugestoes adotadas: ${ids.length}`);
}

console.log('\n  importacao pronta.\n');
console.log(log.map((l) => '  ' + l).join('\n'));
console.log('\n  agora rode:  npm run check\n');
