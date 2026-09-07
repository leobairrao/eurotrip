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
import { db, brl, eur, num, lerJson, precisa } from './_db.mjs';

// A pesquisa saiu do banco em 06/09 e virou arquivo. Quem vigiava as 69
// atracoes, os 12 trechos e as 19 hospedagens era este script, contando
// LINHAS DA TABELA — e depois da mudanca ele contaria zero e diria que
// esta tudo bem. Entao ele passa a contar os ARQUIVOS: e la que a
// pesquisa mora agora, e sumir de la continua sendo estrago.
const atrSugArq   = lerJson('dados/atracoes-sugeridas.json');
const transpArq   = lerJson('dados/transportes.json');
const hospSugArq  = lerJson('dados/hospedagens-sugeridas.json');
const soma = (o) => Object.entries(o).filter(([k]) => k !== '_')
  .reduce((n, [, v]) => n + (Array.isArray(v) ? v.length : 0), 0);

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
// Fase 6: a `stay` ficou APOSENTADA (continua no banco, ninguem le) e quem
// manda e `stay_option`. Sem esta leitura o check diria hospedagem EUR 0 e
// um total que nao bate com a tela — a mesma "segunda copia da formula"
// que ja tinha mordido na Fase 3.
const stayOpt    = await g('stay_option');
// As cidades que ELE criou (05/09). As 11 de sempre continuam no arquivo.
const cidades = await g('city').catch(() => []);
const extra      = await g('extra');
// Fase 7: o item que ele escreve dentro de um dia. Entra no total da viagem
// e nao aparece na aba Custos.
//
// `g` usa `precisa`, que da process.exit(1) em qualquer erro — um .catch
// aqui nunca rodaria de verdade (rodada de correcao 1 da revisao). Por isso
// a leitura e direta, sem passar por `g`/`precisa`: um erro aqui vira linha
// de aceite reprovada, nao morte do script. A migracao 10 ja rodou em 07/09
// e um banco novo nasce de `supabase/00-tudo.sql`, que ja cria `day_item` —
// entao nao existe mais um estado legitimo em que esta leitura falhe. Se
// falhar hoje, e um problema real que ele quer ver, nao um caso para
// tolerar em silencio.
const diRes    = await db.from('day_item').select('*');
const diFalhou = !!diRes.error;
const dayItem  = diRes.data ?? [];

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
// SO a opcao marcada. Somar todas infla o total em silencio no dia em que
// existirem tres opcoes em Madrid com diaria lancada.
const valorOpc = (o) => {
  const t = num(o.total_eur);
  return t ? t : num(o.nightly_eur) * num(o.nights);
};
const marcadas = stayOpt.filter((o) => o.chosen);
const stayTot = marcadas.reduce((a, o) => a + valorOpc(o), 0);
const xEur = extra.reduce((a, x) => (x.currency !== 'brl' ? a + num(x.amount) : a), 0);
const xBrl = extra.reduce((a, x) => (x.currency === 'brl' ? a + num(x.amount) : a), 0);
const diEur = dayItem.filter((r) => r.currency !== 'brl').reduce((a, r) => a + num(r.amount), 0);
const diBrl = dayItem.filter((r) => r.currency === 'brl').reduce((a, r) => a + num(r.amount), 0);

// Fase 5: atracao e hospedagem passaram a poder ser marcadas como pagas.
const attrPago = noRoteiro.filter((a) => a.paid).reduce((a, x) => a + num(x.price_eur), 0);
const stayPago = marcadas.filter((o) => o.paid).reduce((a, o) => a + valorOpc(o), 0);
const jaPago = VOO + emBrl(bookS('pago')) + emBrl(legS('pago')) + (attrPago + stayPago) * rate;
const totalReal =
  VOO + (attrEsc + stayTot + xEur + diEur + legS('').eur) * rate + xBrl + diBrl + legS('').brl + emBrl(bookS(''));

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
// O QUE ELE MEXE NAO E ACEITE. Ate 06/09 este bloco cravava "0 no roteiro"
// e "35 na lista": os numeros do dia da semeadura. No instante em que ele
// pos quatro atracoes de Lisboa no dia 13/12 — que e exatamente para o que
// o app serve — o check ficou vermelho e disse "nao siga para as telas",
// com as mesmas palavras que usaria se algo tivesse quebrado de verdade.
// Agora esses dois viram RETRATO, e o aceite ficou so com o que nao muda.
linha(Math.round(jaPago) === 5337, 'total ja pago', 'R$ 5.337', brl(jaPago));
linha(rate === 6.2, 'cambio', '6,2', String(rate));
console.log(`       retrato de hoje: ${noRoteiro.length} atracoes num dia do roteiro, ${foraDoRoteiro.length} na lista sem dia`);

console.log('\n  ================ O RESTO DO CHECKLIST (secao 15) ================\n');
linha(days.length === 34, 'dias no banco', 34, days.length);
linha(noites === 31, 'noites', 31, noites);
linha(emTerra === 32, 'dias em terra', 32, emTerra);
linha(isos.length - emTerra === 2, 'dias so de voo', 2, isos.length - emTerra);
linha(bases.length === 8, 'bases (linhas da tabela do roteiro)', 8, bases.length);
linha(attraction.length >= 35, 'atracoes na lista DELE', '>= 35', attraction.length);
// A PROVA DE QUE A MUDANCA DE 06/09 CONTINUA VALENDO: sugestao minha nao
// mora mais na tabela dele. Se isto ficar vermelho, alguem religou um
// bloco da semeadura — e a aba dele voltou a nascer cheia de coisa minha.
linha(pesquisa.length === 0, '  ... nenhuma sugestao minha aqui dentro', 0, pesquisa.length);
linha(stay.length === 7, 'bases de hospedagem (tabela aposentada)', 7, stay.length);
console.log(`       retrato de hoje: ${leg.length} trechos e ${stayOpt.length} opcoes de hospedagem que ELE puxou`);
linha(
  !diFalhou,
  'itens escritos no dia',
  '(retrato)',
  diFalhou ? `FALHOU: ${diRes.error.message}` : `${dayItem.length} · ${eur(diEur)} + ${brl(diBrl)}`,
);

console.log('\n  ================ A PESQUISA, QUE AGORA VIVE EM ARQUIVO ================\n');
linha(soma(atrSugArq) === 69, 'atracoes que eu pesquisei', 69, soma(atrSugArq));
linha(transpArq.length === 12, 'trechos que eu pesquisei', 12, transpArq.length);
linha(soma(hospSugArq) === 19, 'opcoes de hospedagem que eu pesquisei', 19, soma(hospSugArq));
linha(
  cidades.length === new Set(cidades.map((c) => c.k)).size,
  'cidades dele sem chave repetida', 'sem repetida',
  cidades.length === new Set(cidades.map((c) => c.k)).size ? 'ok' : 'CHAVE REPETIDA',
);
linha(
  marcadas.length === new Set(marcadas.map((o) => o.city)).size,
  '  ... no maximo uma marcada por cidade', 'sem cidade repetida',
  marcadas.length === new Set(marcadas.map((o) => o.city)).size ? 'ok' : 'DUAS marcadas na mesma cidade',
);
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
console.log(`      hospedagens com endereco ....... ${marcadas.filter((o) => (o.address ?? '').trim()).length}/7`);
console.log(`      opcoes marcadas ................ ${marcadas.length}/7 bases`);
console.log(`      cidades que ele criou .......... ${cidades.length}${cidades.length ? ' (' + cidades.map((c) => c.n).join(', ') + ')' : ''}`);
console.log(`      trechos comprados .............. ${leg.filter((l) => l.bought).length}/12`);
console.log(`      bases: ${bases.map((b) => `${b.base} (${b.d}d/${b.nt}n)`).join(' · ')}`);
console.log(`      rodape: ${emTerra} dias em terra + ${isos.length - emTerra} de voo = ${isos.length} dias de viagem`);

console.log(
  falhas
    ? `\n  ${falhas} verificacao(oes) FALHARAM. Nao siga para as telas.\n`
    : '\n  todos os numeros de aceite bateram.\n',
);
process.exit(falhas ? 1 : 0);
