'use client';
// ============================================================
// 10.3 — Atracoes. UMA lista so por cidade: o que eu sugeri e o
// que ele escreveu convivem, separados pela situacao e ordenados
// escolhida -> backlog -> sugerida.
// Regra 5.2: so 'escolhida' entra no custo. O backlog aparece
// sempre em linha propria ("somaria mais"), nunca somado ao real.
// ============================================================
import { AK, AKE, CO, CT, coOf } from '@/content';
import { useState } from 'react';
import { NumField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, norm, parseNum, shortDt } from '@/lib/fmt';
import type { Attraction } from '@/lib/types';

/**
 * Os quatro chips de filtro. [valor no banco, rotulo, sigla do CSS].
 * O valor guardado em `filt` e a palavra inteira, para bater direto com
 * `it.status`; a sigla curta existe so para a classe .f-esc / .f-all.
 */
const FILTROS: [string, string, string][] = [
  ['', 'tudo', 'all'],
  ['roteiro', 'no roteiro', 'esc'],
  ['fora', 'backlog', 'bac'],
];
// O chip "sugeridas" saiu: desde 05/09 a camada de pesquisa nao mora mais
// na lista dele, tem painel proprio embaixo de cada cidade. Deixar o chip
// filtraria uma lista que ja nao as tem — "Nada sugerido aqui" nas 11.
// As classes f-esc / f-bac / f-all sao as do CSS original, de proposito.

export default function Atracoes() {
  const { s } = useApp();
  const { selCO, setSelCO, filt, setFilt } = useUi();

  const co = coOf(selCO);

  let nR = 0;
  let nF = 0;
  for (const cc of C.cidadesDe(s, selCO)) {
    nR += C.attrCountCity(s, cc, 'roteiro');
    nF += C.attrCountCity(s, cc, 'fora');
  }
  // `conta['']` conta so a lista DELE: a pesquisa nao esta mais nesta lista.
  const conta: Record<string, number> = { '': nR + nF, roteiro: nR, fora: nF };

  const E = C.attrEurAll(s, 'roteiro');
  const B = C.attrEurAll(s, 'fora');

  return (
    <>
      <div className="panelhead">
        <h2>Atrações</h2>
        <p>
          Tudo que você tem vontade de fazer, num lugar só. O que eu pesquisei fica no
          painel de sugestões de cada cidade, e só entra na sua lista quando você clica
          no <b>+</b>. <b>O que entra no custo é o que está num dia do Roteiro</b> — a
          etiqueta é automática, e tirar do dia diminui o total na hora.
        </p>
      </div>

      {/* ---- a fita de paises, com o € do que esta no roteiro em cada ---- */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => { const e = C.attrEurCountry(s, k, 'roteiro'); return e ? eur(e) : ''; }}
      />

      {/* ---- filtros: a contagem e so do pais selecionado ---- */}
      <div className="filt">
        {FILTROS.map(([v, rot, sig]) => (
          <button
            key={sig}
            className={`fchip f-${sig}`}
            aria-pressed={filt === v}
            onClick={() => setFilt(v)}
          >
            {rot}<span className="cn">{conta[v]}</span>
          </button>
        ))}
      </div>

      {C.cidadesDe(s, selCO).map((city) => (
        <Cidade key={city} city={city} cc={co.cc} />
      ))}

      {/* Cadastrar cidade nova NESTE pais (05/09). Ele pediu assim: "se eu
          clicar na espanha, devo conseguir cadastrar uma nova cidade". */}
      <AcrescentarCidade co={selCO} />

      <div className="bigsum">
        <div>
          <b>{eur(C.attrEurCountry(s, selCO, 'roteiro'))}</b>
          <span>{co.n}, no roteiro</span>
        </div>
        <div>
          <b>{eur(E)}</b>
          <span>no roteiro, na viagem</span>
        </div>
        <div>
          <b>{brl(E * C.rate(s))}</b>
          <span>em reais</span>
        </div>
        <div>
          <b>{eur(B)}</b>
          <span>fora do roteiro somaria</span>
        </div>
      </div>
      <p className="mono foot">
        Os preços são de 2026 e servem de ordem de grandeza — confirme no site oficial ao
        reservar. Tudo é editável, inclusive o que eu sugeri: o nome, a nota, a cidade, o tipo
        e o número que eu chutei.
      </p>
    </>
  );
}

/**
 * Cadastrar uma cidade nova NESTE pais (05/09/2026).
 *
 * O Leo pediu: "se eu clicar na espanha, devo conseguir cadastrar uma nova
 * cidade (nas atracoes)". Ela ganha cartao aqui e em Dicas, e entra no
 * Roteiro para ser posta num dia. Em Hospedagem NAO — decisao dele: "vou
 * dormir so naquelas cidades que definimos".
 *
 * A CHAVE sai do nome por `norm()`: "Sevilha" vira `sevilha`, que e como o
 * resto do app ja escreve cidade. E a tela RECUSA chave repetida, alem da
 * trava no banco — sao as duas guardas, e as duas sao necessarias: a chave
 * repetida faria a soma de dinheiro do pais contar aquela cidade DUAS
 * VEZES (a conta e uma varredura da lista de cidades), e um insert que o
 * banco rejeita some sem uma palavra, porque insert nao tem fila de
 * repeticao.
 */
function AcrescentarCidade({ co }: { co: string }) {
  const { s, insert } = useApp();
  const nome = useLocal();
  const [aviso, setAviso] = useState('');
  const [indo, setIndo] = useState(false);

  const por = async () => {
    const n = nome.get();
    if (!n) { setAviso('escreva o nome da cidade'); return; }
    const k = norm(n);
    if (!k) { setAviso('esse nome não vira uma chave válida — tente outro'); return; }

    const jaExiste = CT[k] ?? s.cities.find((c) => c.k === k);
    if (jaExiste) {
      const ondeCo = C.paisDaCidade(s, k);
      const onde = CO.find((x) => x.k === ondeCo)?.n ?? '';
      setAviso(`${C.nomeCidade(s, k)} já existe${onde ? ` (em ${onde})` : ''}.`);
      return;
    }

    setAviso('');
    setIndo(true);
    const r = await insert('city', {
      k, n, co,
      position: s.cities.filter((c) => c.co === co).length,
    });
    setIndo(false);
    // So limpa depois de o banco confirmar (secao 8, promessa 3).
    if (!r.ok) { setAviso('não consegui criar. O nome está aqui — tente de novo.'); return; }
    nome.limpar();
  };

  return (
    <div className="card novacidade" style={{ ['--cc' as string]: 'var(--ochre)' }}>
      <div className="h">
        <h3>Cidade nova em {CO.find((c) => c.k === co)?.n}</h3>
        <div className="m">
          ela ganha cartão aqui e em Dicas, e entra no Roteiro para você pôr num dia
        </div>
      </div>
      <div className="b">
        <div className="addrow two">
          <input
            ref={(el) => { nome.ref.current = el; }}
            type="text"
            placeholder="ex. Sevilha"
            aria-label="nome da cidade nova"
          />
          <button type="button" onClick={() => void por()} disabled={indo}>
            {indo ? 'criando…' : 'criar cidade'}
          </button>
        </div>
        {aviso ? <p className="mono foot avisofalha">{aviso}</p> : null}
      </div>
    </div>
  );
}

/** Um cartao por cidade: o aviso da cidade em cima, a lista, o formulario, o resumo. */
function Cidade({ city, cc }: { city: string; cc: string }) {
  const { s, remove } = useApp();
  const te = C.attrEur(s, city, 'roteiro');
  const tb = C.attrEur(s, city, 'fora');
  // So as que ELE criou tem x. As 11 fixas sao a estrutura da viagem.
  const dele = C.cidadeDele(s, city);
  const quantas = C.attrsOf(s, city).length;

  /**
   * O x da cidade RECUSA enquanto houver atracao nela.
   *
   * Nao ha chave estrangeira ligando `attraction.city` a tabela `city`, de
   * proposito. Entao apagar a cidade com atracoes dentro deixaria elas
   * orfas: sumiriam de TODAS as telas — todo laco parte da lista de
   * cidades — e continuariam somando no total, porque `attrEurAll` varre a
   * tabela inteira. Dinheiro invisivel mexendo no numero do Painel.
   *
   * E leva junto os avisos dos dois spots dela, que senao ficam no banco
   * sem tela que os alcance.
   */
  const apagarCidade = async () => {
    if (!dele) return;
    if (quantas) return;
    for (const av of [...C.avisosDe(s, `atracoes:${city}`), ...C.avisosDe(s, `dicas:${city}`)])
      await remove('aviso', av.id, av.seed_id);
    await remove('city', dele.id);
  };

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cc})` }}>
      <div className="h">
        <h3>{C.nomeCidade(s, city)}</h3>
        <div className="m">
          {C.attrCountCity(s, city, 'roteiro')} no roteiro · {C.attrCountCity(s, city, 'fora')} no backlog · {C.attrCountCity(s, city, 'pesquisa')} sugeridas por mim
          {dele ? (
            <>
              {' · '}
              <button
                type="button"
                className="apagarcidade"
                title={quantas
                  ? `tire as ${quantas} atrações daqui primeiro`
                  : `apagar ${dele.n}`}
                disabled={!!quantas}
                onClick={() => void apagarCidade()}
              >
                {quantas ? `${quantas} aqui dentro` : 'apagar esta cidade'}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="b">
        {/* o aviso da cidade agora e dele: edita e apaga (05/09) */}
        <Avisos spot={`atracoes:${city}`} rotulo="aviso" />
        <Lista city={city} />
        <AddRow city={city} />
        <Sugestoes city={city} />
        {te || tb ? (
          <div className="atsum">
            no roteiro: <b>{eur(te)}</b>
            {tb ? ` · fora do roteiro somaria mais ${eur(tb)}` : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A camada de pesquisa desta cidade — o que EU achei, separado do que e dele.
 *
 * Ate 05/09 as 69 sugeridas moravam na mesma lista, separadas so pela palavra
 * "sugerida" no seletor. Com a etiqueta virando automatica elas virariam itens
 * dele sem ele ter clicado em nada — que e exatamente o que a regra 5.13
 * proibe. Entao ganharam painel proprio, como em Comidas.
 *
 * A DIFERENCA para Comidas, e ela importa: la a sugestao mora em ARQUIVO e o +
 * faz `insert`. Aqui as 69 ja SAO linhas da tabela (semeadas em seed.mjs:73),
 * entao o + e um UPDATE de `status`. Copiar o de Comidas criaria linha
 * duplicada.
 *
 * Oito das 11 cidades sao hoje 100% pesquisa: Roma, Metz, Amsterda, Reims,
 * Caceres, Estrasburgo, Paris e Trier.
 */
function Sugestoes({ city }: { city: string }) {
  const { s, now } = useApp();
  const linhas = C.attrsPesquisa(s, city);
  if (!linhas.length) return null;

  return (
    <div className="sg">
      <div className="sgh">sugestões que eu pesquisei</div>
      {linhas.map((it) => (
        <div key={it.id} className="sgr">
          <div className="nm">
            {AKE[it.kind]} {it.name}
            {it.note ? <span className="wh"> — {it.note}</span> : null}
          </div>
          <div className="vl">{it.price_eur ? eur(it.price_eur) : 'grátis'}</div>
          <button
            className="pb"
            title="pôr na minha lista"
            aria-label={`pôr ${it.name} na minha lista`}
            onClick={() => now('attraction', it.id, 'status', 'backlog')}
          >
            +
          </button>
        </div>
      ))}
    </div>
  );
}

function Lista({ city }: { city: string }) {
  const { s } = useApp();
  const { filt } = useUi();
  // A lista DELE. A camada de pesquisa saiu daqui para o painel de sugestoes.
  const todas = C.attrsDele(s, city);
  const linhas = filt
    ? todas.filter((x) => (filt === 'roteiro' ? C.noRoteiro(x) : C.foraDoRoteiro(x)))
    : todas;

  if (!linhas.length) {
    return (
      <div className="empty">
        {filt
          ? `Nada ${filt === 'roteiro' ? 'no roteiro' : 'no backlog'} aqui.`
          : 'Nada aqui ainda. Escreve abaixo.'}
      </div>
    );
  }
  return (
    <div className="mt">
      {linhas.map((it) => (
        <Linha key={it.id} it={it} />
      ))}
    </div>
  );
}

/**
 * nome | situacao | tipo | preco | x — e embaixo a etiqueta do dia + a nota.
 *
 * A SITUACAO NAO E MAIS CLICAVEL (05/09). Ela e lida de `day_iso`: esta num
 * dia do Roteiro, ou nao esta. O seletor de tres valores saiu porque ele
 * deixava a tela mentir — 14 atracoes diziam "escolhida" sem estar em lugar
 * nenhum, e somavam R$ 793,60 no total.
 *
 * A etiqueta ocupa a MESMA area da grade que o seletor ocupava (`grid-area:st`,
 * estilo-atual.css:289), entao `at5` continua valendo no desktop e no celular
 * sem uma linha de mudanca no CSS original.
 */
function Linha({ it }: { it: Attraction }) {
  const { s, patch, now, remove } = useApp();
  const dentro = C.noRoteiro(it);

  return (
    // `at6` e a grade de `at5` com uma coluna a mais para a caixinha
    // "ja paguei" (Fase 5). Definida em extras.css: o estilo-atual.css
    // continua byte a byte igual a referencia.
    <div className={`mrow at6 st-${dentro ? 'esc' : 'bac'}${it.paid ? ' pgo' : ''}`}>
      <TextField
        fk={`attraction|${it.id}|name`}
        value={it.name}
        onCommit={(v) => patch('attraction', it.id, 'name', v)}
        className="nv"
        aria-label="nome"
      />
      <span className={`sttag ${dentro ? 'st-dentro' : 'st-fora'}`}>
        {dentro ? 'no roteiro' : 'backlog'}
      </span>
      {/* So faz sentido marcar como pago o que esta no roteiro: fora dele
          o item nao entra no total, e pago maior que esperado seria
          incoerente. `calc.attrEurPago` ja exige as duas coisas. */}
      {dentro ? (
        <input
          className="ck"
          type="checkbox"
          title="já paguei"
          aria-label="já paguei"
          checked={it.paid}
          onChange={(e) => now('attraction', it.id, 'paid', e.currentTarget.checked)}
        />
      ) : <span className="ck" aria-hidden="true" />}
      {/* v28: passeio (rua/centro) ou tour (visitar um lugar). O emoji vai para o dia. */}
      <select
        className="sv kv"
        aria-label="tipo"
        value={it.kind}
        onChange={(e) => now('attraction', it.id, 'kind', e.currentTarget.value)}
      >
        {Object.entries(AK).map(([k, rot]) => (
          <option key={k} value={k}>{`${AKE[k]} ${rot}`}</option>
        ))}
      </select>
      {/* Campo de valor vazio e vazio, nao zero (10.0): o artefato escreve `it.pr||""`,
          e sao 66 atracoes gratuitas — com "0" no campo a borda deixa de ser transparente. */}
      <NumField
        fk={`attraction|${it.id}|price_eur`}
        value={it.price_eur || null}
        onCommit={(v) => patch('attraction', it.id, 'price_eur', v ?? 0)}
        className="pv"
        placeholder="€ 0"
        aria-label="preço em euros"
      />
      {/* Regra 5.14: o seed_id vai junto, senao o item ressuscita na proxima carga. */}
      <button
        className="xb"
        title="tirar da lista"
        aria-label="tirar da lista"
        onClick={() => void remove('attraction', it.id, it.seed_id)}
      >
        ×
      </button>
      {/* A segunda linha, que antes era so leitura, agora e onde se edita
          a cidade e a nota. A grade da linha de cima nao mudou. */}
      <div className="wh nt">
        <select
          className="mv"
          aria-label="cidade"
          value={it.city}
          /* cidade vazia sumiria com a linha de TODOS os cartoes: ela so
             aparece dentro do cartao da cidade dela. Nao ha como o select
             devolver vazio pela tela, mas o custo da trava e uma linha. */
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v) now('attraction', it.id, 'city', v);
          }}
        >
          {CO.map((c) => (
            <optgroup key={c.k} label={c.n}>
              {C.cidadesDe(s, c.k).map((ck) => (
                <option key={ck} value={ck}>{C.nomeCidade(s, ck)}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {it.day_iso ? (
          <span className="dtag">{`${AKE[it.kind]} ${shortDt(it.day_iso)}`}</span>
        ) : null}
        {/* NAO pode haver poda no que ENTRA: `stripTags` APAGA o trecho
            entre "<" e ">", e o texto sumia do BANCO. Quem escapa e a
            SAIDA — `marcado()` em fmt.ts. Ver tests/avisos.test.mjs. */}
        <TextField
          fk={`attraction|${it.id}|note`}
          value={it.note}
          onCommit={(v) => patch('attraction', it.id, 'note', v)}
          className="wv"
          placeholder="uma nota sua"
          aria-label="nota"
        />
      </div>
    </div>
  );
}

/** O formulario de acrescentar. Entra sempre como backlog — quem escolhe e ele. */
function AddRow({ city }: { city: string }) {
  const { s, insert } = useApp();
  const nome = useLocal();
  const nota = useLocal();
  const preco = useLocal();

  const por = async () => {
    const nm = nome.get().trim();
    if (!nm) return;
    const r = insert('attraction', {
      city,
      name: nm,
      price_eur: parseNum(preco.get()) ?? 0,
      note: nota.get(),
      status: 'backlog',
      kind: 'passeio',
      day_iso: null,
      seed_id: null,
    });
    // So limpa depois de o banco confirmar (secao 8, promessa 3): antes de
    // 05/09 o campo era limpo sempre, e um insert que falhava comia o que
    // ele digitou. O rodape avisa; o texto fica na tela para ele tentar.
    if (!(await r).ok) return;
    nome.limpar();
    nota.limpar();
    preco.limpar();
  };

  return (
    <div className="addrow at3">
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder={`o que você quer fazer em ${C.nomeCidade(s, city)}`}
        aria-label="nome da atração"
      />
      <input
        ref={(el) => { nota.ref.current = el; }}
        type="text"
        placeholder="uma nota (opcional)"
        aria-label="nota da atração"
      />
      <input
        ref={(el) => { preco.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="€"
        aria-label="preço em euros"
      />
      <button onClick={() => void por()}>pôr no backlog</button>
    </div>
  );
}
