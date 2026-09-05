// ============================================================
// Fase 4 — move os 18 avisos de dia para a aba Dicas.
//
// POR QUE UM SCRIPT, se a Fase 4 e "sem mudanca de esquema":
// "sem SQL" quer dizer "sem mexer no formato das tabelas", nao "sem
// escrever no banco". Nada no app move um aviso de lugar: `Avisos.tsx`
// edita titulo, corpo e tom, e o `spot` e fixado por quem monta o
// componente. E `seed.mjs` so INSERE o que ainda nao existe — editar o
// arquivo semente nao mexe numa linha ja semeada.
//
// POR QUE NAO PELO `x` DA TELA: o `x` grava o `seed_id` em `killed_seed`
// e `seed.mjs` nunca mais traz aquilo de volta (regra 5.14). Seria
// IRREVERSIVEL pelo app. Renomear o `spot` preserva a linha e o
// `seed_id` — e como a semeadura pula por `seed_id`, mover nao duplica.
//
// O `seed_id` NAO muda: continua `av:dia:<iso>`.
//
// E o `position` vai junto, obrigatoriamente: `avisos-semente.ts` da
// position 0 aos 18, e TRES caem em Madrid. Movendo so o `spot` eles
// chegam empatados, e `porPosicao` desempata por uuid — determinístico,
// mas arbitrario. E aviso NAO TEM setas de ordem na tela: o Leo nao
// teria como consertar.
//
// E idempotente: casa por `seed_id` e pode rodar de novo.
//
//   node --import ./scripts/_ts.mjs scripts/mover-avisos.mjs [--seco]
// ============================================================
import { db, precisa } from './_db.mjs';
import { DESTINO, planoDasDicas } from '../src/lib/dicas-destino.ts';

const SECO = process.argv.includes('--seco');

const avisos = await precisa(
  await db.from('aviso').select('*').like('seed_id', 'av:dia:%'),
  'ler os avisos de dia',
);

console.log(`\n  ${avisos.length} avisos de dia no banco\n`);

// A MESMA conta que a semente usa (src/lib/dicas-destino.ts). Escrever a
// posicao duas vezes ja deu dois avisos empatados em `dicas:voos`.
const isos = avisos.map((a) => String(a.seed_id).replace('av:dia:', ''));
const plano = planoDasDicas(isos);
const planos = [];

for (const av of [...avisos].sort((a, b) => String(a.seed_id).localeCompare(String(b.seed_id)))) {
  const iso = String(av.seed_id).replace('av:dia:', '');
  if (!DESTINO[iso]) { console.log(`  ?  ${iso} nao esta na tabela de destino — deixado como esta`); continue; }
  const d = plano.get(iso);
  if (!d) { console.log(`  ·  ${iso} [${av.tone}] FICA no dia`); continue; }

  planos.push({
    id: av.id, iso, de: av.spot, para: d.spot, position: d.position,
    title: d.title ?? av.title, body: d.body ?? av.body,
    mudouTexto: !!(d.title || d.body),
  });
}

for (const p of planos) {
  console.log(`  →  ${p.iso}  ${p.de}  ->  ${p.para} (pos ${p.position})${p.mudouTexto ? '  [texto reescrito]' : ''}`);
}

const ficam = avisos.length - planos.length;
console.log(`\n  ${planos.length} se movem, ${ficam} ficam no dia\n`);

if (SECO) { console.log('  --seco: nada foi escrito.\n'); process.exit(0); }

let n = 0;
for (const p of planos) {
  const { error } = await db
    .from('aviso')
    .update({ spot: p.para, position: p.position, title: p.title, body: p.body })
    .eq('id', p.id);
  if (error) { console.error(`  erro em ${p.iso}: ${error.message}`); process.exit(1); }
  n++;
}

const { count } = await db.from('aviso').select('*', { count: 'exact', head: true });
console.log(`  ${n} movidos. A tabela continua com ${count} avisos — nenhum foi apagado.\n`);
