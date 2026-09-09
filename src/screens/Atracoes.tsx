'use client';
// ============================================================
// 10.3 — Atracoes. UMA lista so por cidade: o que eu sugeri e o
// que ele escreveu convivem, separados pela situacao e ordenados
// escolhida -> backlog -> sugerida.
// Regra 5.2: so 'escolhida' entra no custo. O backlog aparece
// sempre em linha propria ("somaria mais"), nunca somado ao real.
// ============================================================
import { CO, CT, akEmoji, coOf } from '@/content';
import { useState } from 'react';
import { NumField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import Tema from '@/components/Tema';
import { useApp } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, norm, parseNum, shortDt } from '@/lib/fmt';
import { AK_MAX } from '@/lib/types';
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

/**
 * A % no rotulo. Arredonda para inteiro, mas nunca deixa uma fatia que
 * EXISTE virar "0%": com uma atracao de EUR 2 num total de EUR 900, o
 * arredondamento diria que a Alemanha nao custa nada.
 */
function pctLabel(p: number): string {
  if (!p) return '0%';
  if (p < 1) return '<1%';
  return `${Math.round(p)}%`;
}

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

  // Os TRES numeros do topo seguem a bandeira clicada (09/09). Antes so o
  // primeiro seguia, e os outros tres eram da viagem toda: a linha falava de
  // duas coisas ao mesmo tempo sem dizer qual era qual.
  const real = C.attrEurCountry(s, selCO, 'roteiro');
  const fora = C.attrEurCountry(s, selCO, 'fora');
  const pct = C.attrPctPais(s, selCO);

  return (
    <>
      <div className="panelhead">
        <h2>Atrações</h2>
      </div>

      {/* ---- a fita de paises, com QUANTAS ele registrou em cada (08/09) ----
          Era o € do que ja esta num dia do roteiro. Ele pediu a contagem,
          apontando para Comidas: "quero que voce deixe esse numerozinho
          embaixo tambem na aba atracoes e hospedagem".

          O dinheiro nao sumiu: ele esta logo abaixo, no `bigsum`, que e onde
          ele mesmo mandou por em 06/09. O que se perde e comparar dois paises
          de relance sem clicar — dito a ele antes, e escolhido assim.

          `'dele'` e nao o total: esta aba e so dele desde 06/09, e minha
          pesquisa se conta na aba Sugestoes. */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => String(C.attrCountCountry(s, k, 'dele'))}
      />

      {/* ---- os numeros da viagem, LOGO ABAIXO das bandeiras (06/09) ----
          Ele pediu assim: "as infos da viagem devem aparecer no topo da aba
          logo abaixo das bandeiras dos paises". Estavam no rodape, depois de
          todos os cartoes — para ver quanto o pais somava era preciso rolar a
          aba inteira. O primeiro numero acompanha a bandeira selecionada; os
          outros tres sao da viagem toda e nao mudam com o pais. */}
      <div className="bigsum">
        <div>
          {/* "em euro grande e em R$ embaixo" — a frase dele. O R$ deixou de
              ser uma celula propria: era o unico numero da linha que nao
              respondia a pergunta "quanto custa este pais", e ocupava o
              mesmo tamanho dos outros. */}
          <b>{eur(real)}</b>
          <span>{co.n}, custo real</span>
          <i>{brl(real * C.rate(s))}</i>
        </div>
        <div>
          {/* A fatia deste pais no custo de ATRACOES da viagem, e nao no
              custo da viagem inteira — escolha dele. As sete somam 100. */}
          <b>{pctLabel(pct)}</b>
          <span>das atrações da viagem</span>
        </div>
        <div>
          <b>{eur(fora)}</b>
          <span>{co.n}, fora do roteiro</span>
        </div>
      </div>

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
  const { s } = useApp();
  const apagar = useApagarLinha();
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
      await apagar('aviso', av.id, av.seed_id);
    await apagar('city', dele.id);
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
  const { s, patch, now } = useApp();
  const apagar = useApagarLinha();
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
      {/* v28: passeio (rua/centro) ou tour (visitar um lugar). Desde 06/09 tambem
          qualquer tema que ele escrever. O emoji vai para a etiqueta do dia. */}
      <Tema
        className="sv kv"
        value={it.kind}
        /* `patch` e nao `now`: o campo de escrever comita a cada tecla, e com
           `now` isso seria um UPDATE por letra. `patch` junta em 400ms, que e
           o que todo campo digitado do app ja faz. */
        onChange={(v) => patch('attraction', it.id, 'kind', v)}
      />
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
        onClick={() => void apagar('attraction', it.id, it.seed_id)}
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
          <span className="dtag">{`${akEmoji(it.kind)} ${shortDt(it.day_iso)}`}</span>
        ) : null}
        {/* "Comprar com antecedencia", e o TEMPO QUE PRECISA (09/09).
            Pedido dele: "Atracoes que tiverem a tag 'Comprar com
            antecedencia', e o tempo que precisa".

            Etiqueta e nao caixinha: a linha ja tem a de "ja paguei", e duas
            caixinhas lado a lado seriam indistinguiveis.

            O campo de dias SO EXISTE COM A TAG LIGADA. Desligado ele nao
            ocupa lugar nenhum — e o que impede a linha de crescer para as
            atracoes que se paga na porta, que sao a maioria.

            DESLIGAR NAO APAGA O PRAZO, e e escolha: o numero fica guardado
            e volta se ele remarcar. Nao vaza para conta nenhuma — tudo que
            le prazo (a lista do "o que ainda esta aberto") filtra por
            `buy_ahead`, entao um `ahead_days` de uma tag desligada nunca
            aparece em lugar nenhum. Se um dia incomodar, apagar no clique
            e uma linha aqui. */}
        <button
          type="button"
          className={`dtag tgl${it.buy_ahead ? '' : ' off'}`}
          onClick={() => now('attraction', it.id, 'buy_ahead', !it.buy_ahead)}
          title={it.buy_ahead
            ? 'precisa comprar com antecedência — clique para mudar'
            : 'compra na hora, na porta — clique para mudar'}
        >
          {it.buy_ahead ? 'comprar antes' : 'compro na hora'}
        </button>
        {it.buy_ahead ? (
          <NumField
            fk={`attraction|${it.id}|ahead_days`}
            value={it.ahead_days}
            onCommit={(v) => patch('attraction', it.id, 'ahead_days', v)}
            className="aheadd"
            placeholder="dias antes"
            aria-label="quantos dias antes"
          />
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
  /**
   * O TEMA ESCOLHIDO NA HORA DE REGISTRAR (06/09), que e o pedido dele.
   *
   * Antes o `insert` mandava `kind: 'passeio'` fixo, e o unico jeito de dizer
   * que era um tour era acrescentar e DEPOIS achar a linha e trocar o menu.
   * Numa cidade com 20 atracoes isso e procurar a linha que voce acabou de
   * criar no meio da lista ordenada por nome.
   *
   * Isto e estado de verdade, e nao `useLocal`, porque o menu precisa mostrar
   * o que esta escolhido enquanto ele preenche o resto da linha.
   */
  const [tema, setTema] = useState('passeio');
  const [erro, setErro] = useState('');

  const por = async () => {
    const nm = nome.get().trim();
    if (!nm) return;
    setErro('');
    const r = insert('attraction', {
      city,
      name: nm,
      price_eur: parseNum(preco.get()) ?? 0,
      note: nota.get(),
      status: 'backlog',
      kind: tema.trim().slice(0, AK_MAX) || 'passeio',
      day_iso: null,
      seed_id: null,
    });
    // So limpa depois de o banco confirmar (secao 8, promessa 3): antes de
    // 05/09 o campo era limpo sempre, e um insert que falhava comia o que
    // ele digitou. O rodape avisa; o texto fica na tela para ele tentar.
    if (!(await r).ok) {
      // O rodape ja dizia "nao consegui salvar", mas em cima da tela e sem
      // dizer O QUE nao salvou. Numa cidade com 20 linhas ele nao tem como
      // saber se a atracao entrou. E enquanto o 09-tema-da-atracao.sql nao
      // rodar, tema escrito por ele e RECUSADO pelo banco — este e o unico
      // lugar onde essa recusa aparece por escrito.
      setErro(
        `Não consegui guardar "${nm}". O que você escreveu continua aqui — tente de novo.`,
      );
      return;
    }
    nome.limpar();
    nota.limpar();
    preco.limpar();
    // o TEMA nao volta para 'passeio': quem esta cadastrando cinco museus
    // seguidos escolhe uma vez, nao cinco.
  };

  return (
    <div className="addrow at4">
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
      <Tema value={tema} onChange={setTema} />
      <input
        ref={(el) => { preco.ref.current = el; }}
        type="text"
        inputMode="decimal"
        className="pv"
        placeholder="€"
        aria-label="preço em euros"
      />
      <button onClick={() => void por()}>pôr no backlog</button>
      {erro ? <div className="ferro" role="alert">{erro}</div> : null}
    </div>
  );
}
