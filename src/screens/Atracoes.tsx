'use client';
// ============================================================
// 10.3 — Atracoes. UMA lista so por cidade: o que eu sugeri e o
// que ele escreveu convivem, separados pela situacao e ordenados
// escolhida -> backlog -> sugerida.
// Regra 5.2: so 'escolhida' entra no custo. O backlog aparece
// sempre em linha propria ("somaria mais"), nunca somado ao real.
// ============================================================
import { CO, CT, akEmoji, coOf } from '@/content';
import { useRef, useState } from 'react';
import { NumField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
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
          Tudo que você tem vontade de fazer, num lugar só — e aqui é <b>só o seu</b>. O
          que eu pesquisei mora na aba <b>Sugestões</b>, e só entra nesta lista quando você
          clica no <b>+</b> de lá. <b>O que entra no custo é o que está num dia do
          Roteiro</b> — a etiqueta é automática, e tirar do dia diminui o total na hora.
        </p>
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

/**
 * O TEMA da atracao — um componente so, usado na linha e no formulario de
 * acrescentar (06/09/2026).
 *
 * O pedido dele: "quando eu for registrar um passeio eu devo poder escolher
 * logo no registro se e passeio ou tour ou outro tema que pode ser escrita
 * livre". Duas coisas ai: escolher NA HORA DE REGISTRAR (antes so dava para
 * trocar depois, na linha), e TEMA LIVRE (antes so havia dois).
 *
 * POR QUE UM MENU, E NAO UM CAMPO DE TEXTO SOLTO. Com campo solto, usar
 * "mercado de natal" na segunda atracao exige escrever de novo — e sai
 * "Mercado de Natal", que para o banco e outro tema. Duas listas onde ele
 * queria uma, e nada na tela dizendo que sao a mesma coisa. Entao o menu
 * traz os dois de sempre MAIS tudo que ele ja escreveu (`C.temasDeAtracao`),
 * e a ultima opcao abre o campo de escrever.
 *
 * O `__novo` como valor da opcao e uma sentinela, e nao um tema: dois
 * sublinhados nas pontas nao colidem com nada que alguem escreva, e se
 * colidisse o pior caso seria abrir o campo de texto.
 *
 * NUNCA comita vazio: campo em branco no blur volta para o tema anterior. A
 * coluna e `not null` no banco, e um `kind` vazio derrubaria a trava nova
 * (`length(btrim(kind)) between 1 and 24`) com a linha ja na tela.
 */
function Tema({
  value, onChange, className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { s } = useApp();
  const [escrevendo, setEscrevendo] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const temas = C.temasDeAtracao(s);

  const fechar = (v: string) => {
    const t = v.trim().slice(0, AK_MAX);
    setEscrevendo(false);
    if (t && t !== value) onChange(t);
  };

  if (escrevendo) {
    return (
      <input
        ref={campo}
        className={className}
        type="text"
        autoFocus
        maxLength={AK_MAX}
        defaultValue=""
        placeholder="o tema"
        aria-label="escreva o tema"
        /**
         * COMITA A CADA TECLA, e nao so no blur — isto conserta um defeito
         * de verdade, achado ao provar a tela em 06/09.
         *
         * So no blur: ele escreve "mercado de natal" e clica DIRETO em "pôr
         * no backlog". O clique tira o foco, o blur dispara e chama
         * `setTema` — mas `por()` roda no mesmo instante, lendo o `tema`
         * ANTERIOR. A atracao nasce com "passeio", ele so descobre depois
         * de achar a linha na lista, e nada na tela indicou erro.
         *
         * Comitando a cada tecla, o tema esta sempre em dia e o botao pode
         * ser clicado a qualquer momento. Vazio nao comita: a coluna e
         * `not null` e a trava do banco recusa string em branco.
         */
        onInput={(e) => {
          const t = e.currentTarget.value.trim().slice(0, AK_MAX);
          if (t && t !== value) onChange(t);
        }}
        onBlur={(e) => fechar(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          // Esc desiste: o blur do `fechar` ja ignora vazio, mas sem isto ele
          // ficaria preso no campo sem jeito de voltar ao menu pelo teclado.
          if (e.key === 'Escape') { e.preventDefault(); setEscrevendo(false); }
        }}
      />
    );
  }

  return (
    <select
      className={className}
      aria-label="tema"
      value={value}
      onChange={(e) => {
        const v = e.currentTarget.value;
        if (v === '__novo') { setEscrevendo(true); return; }
        onChange(v);
      }}
    >
      {/* o tema atual pode nao estar na lista se a outra pessoa acabou de
          renomear o dela: sem esta linha o <select> mostraria o primeiro
          da lista, e a tela mentiria sobre o que esta no banco */}
      {temas.includes(value) ? null : <option value={value}>{`${akEmoji(value)} ${value}`}</option>}
      {temas.map((k) => (
        <option key={k} value={k}>{`${akEmoji(k)} ${k}`}</option>
      ))}
      <option value="__novo">✏️ outro tema…</option>
    </select>
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
