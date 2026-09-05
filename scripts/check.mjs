// ============================================================
// npm run check — os numeros de aceite, lidos DO BANCO (secao 12.3 e 15).
// Se algum destes nao bater, nao siga para as telas.
//
// ESTE E O UNICO QUE FALA DA PRODUCAO. `npm test` roda sobre
// `dados/estado-atual-do-leo.json`, que e um retrato de 04/09 e passou a
// ser declarado HISTORICO em 05/09 — fixture de teste, nao o banco. Em
// 05/09 os dois discordavam: 85/85 verde aqui e 5 vermelhos ali.
//
// Os numeros que o LEO mexe (escolhidas, backlog) mudam quando ele usa o
// app; os que descrevem a VIAGEM (34 dias, 31 noites, 12 trechos) nao.
// Um vermelho da primeira familia costuma ser ele decidindo algo; da
// segunda, e bug. Atualizados em 05/09 depois da limpeza da Fase 0.6:
// 8 -> 13 escolhidas e 27 -> 22 no backlog (ele promoveu os cinco de
// Sintra; os 35 "dele" continuam 35).
// ============================================================
import { db, brl, eur, num, precisa } from './_db.mjs';

const VOO = 5079.77;
const T = (b) => (b ? '  ok  ' : '  X   ');
let falhas = 0;
const linha = (ok, rotulo, esperado, achado) => {
  if (!ok) falhas++;
  console.log(`${T(ok)} ${rotulo.padEnd(34)} esperado ${String(esperado).padEnd(16)} achado ${achado}`);
};

const g = async (t, sel = '*') => precisa(await db.from(t).select(sel), `ler ${t}`);

const settings   = (await g('settings'))[0];
const days       = await g('day');
const attraction = await g('attraction');
const food       = await g('food');
const leg        = await g('leg');
const booking    = await g('booking');
const stay       = await g('stay');
const extra      = await g('extra');

const rate = num(settings?.eur_rate);

// ---- somas, com a mesma mecanica do app (secao 11.6) ----
const sides = (rows, campoPago, modo, moedaPadraoEur) => {
  let e = 0, b = 0;
  for (const r of rows) {
    const pago = !!r[campoPago];
    if (modo === 'pago' && !pago) continue;
    if (modo === 'falta' && pago) continue;
    const ehBrl = moedaPadraoEur ? r.currency === 'brl' : r.currency !== 'eur';
    if (ehBrl) b += num(r.amount); else e += num(r.amount);
  }
  return { eur: e, brl: b };
};
const legS  = (m) => sides(leg, 'bought', m, true);    // transporte -> euro
const bookS = (m) => sides(booking, 'done', m, false); // burocracia -> real
const emBrl = (x) => x.eur * rate + x.brl;

// 5.2 REVISTA (05/09): o custo segue `day_iso`, nao `status`.
// `status` passou a significar origem: 'sugerida' e a camada de pesquisa.
const noRoteiro = attraction.filter((a) => a.day_iso);
const foraDoRoteiro = attraction.filter((a) => !a.day_iso && a.status !== 'sugerida');
const pesquisa = attraction.filter((a) => !a.day_iso && a.status === 'sugerida');
const somaEur = (l) => l.reduce((a, x) => a + num(x.price_eur), 0);
const attrEsc = somaEur(noRoteiro);
const stayTot = stay.reduce((a, s) => {
  const t = num(s.total_eur);
  return a + (t ? t : num(s.nightly_eur) * num(s.nights));
}, 0);
const xEur = extra.reduce((a, x) => (x.currency !== 'brl' ? a + num(x.amount) : a), 0);
const xBrl = extra.reduce((a, x) => (x.currency === 'brl' ? a + num(x.amount) : a), 0);

const jaPago = VOO + emBrl(bookS('pago')) + emBrl(legS('pago'));
const totalReal =
  VOO + (attrEsc + stayTot + xEur + legS('').eur) * rate + xBrl + legS('').brl + emBrl(bookS(''));

// ---- blocos, noites e dias (secao 11.2) ----
const isos = days.map((d) => String(d.iso)).sort();
const porIso = Object.fromEntries(days.map((d) => [String(d.iso), d]));
const blocos = [];
let cur = null;
for (const iso of isos) {
  const b = (porIso[iso].base ?? '').trim();
  if (!b) { cur = null; continue; }
  if (cur && cur.base.toLowerCase() === b.toLowerCase()) { cur.n++; } else { cur = { base: b, n: 1 }; blocos.push(cur); }
}
const bases = blocos.filter((b) => !/tr[âa]nsito|no ar|voando/i.test(b.base)).map((b) => ({ ...b, d: b.n, nt: b.n }));
if (bases.length > 1) bases[bases.length - 1].nt = Math.max(0, bases[bases.length - 1].d - 1);
const noites = bases.reduce((a, b) => a + b.nt, 0);
const emTerra = bases.reduce((a, b) => a + b.d, 0);

console.log('\n  ================ NUMEROS DE ACEITE (secao 12.3) ================\n');
linha(noRoteiro.length === 0, 'atracoes no roteiro', 0, noRoteiro.length);
linha(
  foraDoRoteiro.length === 35,
  '  ... na lista dele, sem dia', 35, foraDoRoteiro.length,
);
linha(Math.round(jaPago) === 5337, 'total ja pago', 'R$ 5.337', brl(jaPago));
linha(rate === 6.2, 'cambio', '6,2', String(rate));

console.log('\n  ================ O RESTO DO CHECKLIST (secao 15) ================\n');
linha(days.length === 34, 'dias no banco', 34, days.length);
linha(noites === 31, 'noites', 31, noites);
linha(emTerra === 32, 'dias em terra', 32, emTerra);
linha(isos.length - emTerra === 2, 'dias so de voo', 2, isos.length - emTerra);
linha(bases.length === 8, 'bases (linhas da tabela do roteiro)', 8, bases.length);
linha(attraction.length === 104, 'atracoes no total', 104, attraction.length);
linha(pesquisa.length === 69, '  ... sugeridas por mim (pesquisa)', 69, pesquisa.length);
linha(
  noRoteiro.length + foraDoRoteiro.length + pesquisa.length === attraction.length,
  '  ... as tres familias cobrem tudo', attraction.length,
  noRoteiro.length + foraDoRoteiro.length + pesquisa.length,
);
linha(leg.length === 12, 'trechos de transporte', 12, leg.length);
linha(stay.length === 7, 'bases de hospedagem', 7, stay.length);
linha(
  days.every((d) => !d.plan || !d.plan.trim()),
  'texto dos dias comeca vazio (regra 5.5)', 'todos vazios',
  days.filter((d) => d.plan && d.plan.trim()).length + ' com texto',
);
const paisesComida = [...new Set(food.map((f) => f.country))];
linha(
  !paisesComida.includes('be') && !paisesComida.includes('pl'),
  'comida: nada de Belgica nem Polonia', 'sem be/pl',
  paisesComida.join(',') || '(vazio)',
);
linha(
  food.every((f) => f.kind !== 'prato' || !f.day_iso),
  'prato tipico sem dia (regra 5.8)', 'nenhum',
  food.filter((f) => f.kind === 'prato' && f.day_iso).length + ' com dia',
);
const passaporte = booking.find((b) => b.name === 'Passaporte');
linha(
  !!passaporte?.done && num(passaporte?.amount) === 257.25,
  'passaporte resolvido, R$ 257,25', 'done + 257,25',
  `${passaporte?.done ? 'done' : 'aberto'} + ${num(passaporte?.amount)}`,
);

console.log('\n  ================ OS OUTROS NUMEROS DO PAINEL ================\n');
console.log(`      total real ate agora ............ ${brl(totalReal)}`);
console.log(`      ainda por gastar ............... ${brl(totalReal - jaPago)}`);
console.log(`      atracoes no roteiro (EUR) ...... ${eur(attrEsc)}`);
console.log(`      fora do roteiro somaria ........ ${eur(somaEur(foraDoRoteiro))}`);
console.log(`      a pesquisa inteira somaria ..... ${eur(somaEur(pesquisa))}`);
console.log(`      hospedagem ..................... ${eur(stayTot)}`);
console.log(`      transportes .................... ${eur(legS('').eur)}`);
console.log(`      burocracia inteira ............. ${brl(emBrl(bookS('')))}`);
console.log(`      hospedagens com endereco ....... ${stay.filter((s) => (s.address ?? '').trim()).length}/7`);
console.log(`      trechos comprados .............. ${leg.filter((l) => l.bought).length}/12`);
console.log(`      bases: ${bases.map((b) => `${b.base} (${b.d}d/${b.nt}n)`).join(' · ')}`);
console.log(`      rodape: ${emTerra} dias em terra + ${isos.length - emTerra} de voo = ${isos.length} dias de viagem`);

console.log(
  falhas
    ? `\n  ${falhas} verificacao(oes) FALHARAM. Nao siga para as telas.\n`
    : '\n  todos os numeros de aceite bateram.\n',
);
process.exit(falhas ? 1 : 0);
