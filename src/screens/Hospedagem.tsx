'use client';
// ============================================================
// 10.6 — Hospedagem, REESCRITA na Fase 6 (05/09/2026).
//
// O Leo pediu: "na parte de hospedagem, vamos colocar assim como em
// atracoes e restaurantes, vamos fazer opcoes por pais". E escolheu, das
// tres leituras possiveis, a de ESCOLHER: cada cidade vira uma lista de
// opcoes e ele marca a que fechou.
//
// Ate aqui isto eram 7 cartoes fixos, um por base, e os bairros que eu
// pesquisei estavam em PROSA, escondidos numa frase — Madrid tinha tres
// (Chamberi, Arguelles, Tetuan) empacotados numa linha so.
//
// SO A OPCAO MARCADA ENTRA NO CUSTO. Sem isso, tres opcoes em Madrid com
// diaria lancada entrariam as tres no total da viagem, e ele veria um
// numero errado sem nada na tela indicando erro.
//
// DUAS ABAS NASCEM SEM BASE, e nao e bug: Luxemburgo e Alemanha nao tem
// hospedagem porque sao bate-volta de Metz. Aba vazia parece defeito,
// entao elas dizem isso com todas as letras.
//
// O `selCO` e o MESMO de Atracoes e Comidas, de proposito — as duas ja o
// compartilham. Consequencia registrada: escolher Luxemburgo aqui deixa
// Atracoes e Comidas abrindo em Luxemburgo no proximo F5, porque
// `setSelCO` grava em localStorage.
//
// AJUSTE DA TARDE DE 06/09: o formulario de acrescentar deixou de ser uma
// tirinha de dois campos e virou o anuncio inteiro, aberto por padrao numa
// base vazia. O porque esta em `Acrescentar`, no fim do arquivo — e vale a
// leitura, porque o defeito nao era campo faltando, era campo escondido.
// ============================================================
import { useEffect, useState } from 'react';
import { CIDADES_FIXAS, STAYS, coOf } from '@/content';
import { AreaField, NumField, IntField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, parseInt10, parseNum } from '@/lib/fmt';
import type { StayOption } from '@/lib/types';


const CIDADES = STAYS.map((x) => x.c);
/**
 * As bases de cada pais. Pode ser vazio: Luxemburgo e Alemanha nao tem.
 *
 * Isto le as 7 BASES do arquivo, e NAO as cidades que o Leo cria. E
 * decisao dele, na palavra dele: "em hospedagem nao precisa mesmo, vou
 * dormir so naquelas cidades que definimos". Uma cidade nova ganha cartao
 * em Atracoes, em Dicas e entra no Roteiro — aqui, nao.
 */
const basesDe = (co: string) => (CIDADES_FIXAS[co] ?? []).filter((c) => CIDADES.includes(c));

export default function Hospedagem() {
  const { s } = useApp();
  const { selCO, setSelCO } = useUi();
  const tt = C.stayTotalAll(s, CIDADES);
  const bases = basesDe(selCO);

  return (
    <>
      <div className="panelhead">
        <h2>Hospedagem</h2>
      </div>

      {/* a mesma fita de Atracoes, Comidas e Dicas — e desde 08/09 as quatro
          dizem a MESMA coisa embaixo do nome: quantas coisas ele registrou.
          Aqui era o € da opcao marcada, e ele pediu a contagem.

          `opcoesCount` e nao `stayCount`: este numero conta OPCOES, inclusive
          a que ainda nao tem endereco nem valor. "Bases com endereco da
          fechada" e outro numero, e esta logo abaixo no `bigsum`. */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => String(C.opcoesCount(s, basesDe(k)))}
      />

      <div className="bigsum">
        <div>
          <b>{C.stayCount(s, CIDADES)}/{STAYS.length}</b>
          <span>bases com endereço da fechada</span>
        </div>
        <div>
          <b>{eur(tt)}</b>
          <span>diárias cheias somadas</span>
        </div>
        <div>
          <b>{brl(tt * C.rate(s))}</b>
          <span>em reais</span>
        </div>
      </div>

      {bases.length === 0 ? (
        <div className="card" style={{ ['--cc' as string]: `var(${coOf(selCO).cc})` }}>
          <div className="h"><h3>{coOf(selCO).n}</h3></div>
          <div className="b">
            <div className="empty">
              Aqui é bate-volta de Metz — você não dorme neste país, e isso foi escolha sua.
              {selCO === 'lu'
                ? ' Luxemburgo fica a 45 min de trem, e o lado luxemburguês é de graça.'
                : ' Trier se faz de Metz via Luxemburgo, num dia.'}
            </div>
          </div>
        </div>
      ) : (
        bases.map((city) => <Base key={city} city={city} cc={coOf(selCO).cc} />)
      )}

      <p className="mono foot">
        Paris saiu daqui: virou bate-volta de Amsterdã, você não dorme lá. Em Amsterdã, a
        base é <b>Haarlem</b> — 15 min de trem e fora da taxa municipal de 12,5%.
      </p>
    </>
  );
}

function Base({ city, cc }: { city: string; cc: string }) {
  const { s } = useApp();
  const opcoes = C.staysOf(s, city);
  const marcada = C.stayChosen(s, city);

  return (
    <div className="card" style={{ ['--cc' as string]: `var(${cc})` }}>
      <div className="h">
        <h3>{C.nomeCidade(s, city)}</h3>
        <div className="m">
          {opcoes.length} {opcoes.length === 1 ? 'opção' : 'opções'}
          {marcada ? ` · fechou: ${marcada.name}` : ' · nenhuma marcada ainda'}
        </div>
      </div>
      <div className="b">
        {/* o "warn" de cada base virou aviso dele, como em Atracoes e Comidas */}
        <Avisos spot={`stay:${city}`} rotulo="aviso" />

        {opcoes.length === 0 ? (
          <div className="empty">
            Nenhuma opção aqui ainda. <b>Os campos do anúncio estão logo abaixo</b> — preencha
            e clique em guardar. Ou puxe um bairro meu com o <b>+</b> da aba <b>Sugestões</b>.
          </div>
        ) : (
          <>
            {/* Sem isto, guardar o anuncio inteiro e ver o total continuar em
                €0 e "0/7 bases" e a proxima pergunta dele — e a tela nao teria
                resposta nenhuma. O cabecalho diz "nenhuma marcada ainda", mas
                em cinza, longe do dinheiro, e sem dizer o que isso CUSTA. */}
            {marcada ? null : (
              <div className="empty">
                Nenhuma destas está marcada — por isso {C.nomeCidade(s, city)} ainda soma
                <b> €0</b> no total da viagem, e não entra na conta de bases lá em cima.
                Clique em <b>é esta</b> na opção que você fechou.
              </div>
            )}
            <div className="mt">
              {opcoes.map((o) => <Opcao key={o.id} o={o} />)}
            </div>
          </>
        )}

        <Acrescentar city={city} proximaPos={opcoes.length} />

      </div>
    </div>
  );
}

/**
 * Uma opcao de hospedagem, REESCRITA em 06/09 a pedido dele:
 * "eu quero a estrutura que tinhamos antes para preencher: nome da
 * cidade, localizacao do airbnb, link para a reserva, custo por noite,
 * quantos dias... do jeito que esta agora esta tudo jogado e mal
 * formatado".
 *
 * O QUE ESTAVA ERRADO. Os campos que ele pede EXISTEM desde a Fase 6 —
 * endereco, link, check-in, check-out, total. So que estavam escondidos
 * atras do "e esta": apareciam num formulario separado, e SO depois de
 * ele marcar a opcao fechada. Diaria e noites ficavam espremidas na
 * linha, com rotulo nenhum, e a nota era uma `textarea` solta dentro de
 * uma `.mrow` — a unica do app — que nascia BRANCA no tema escuro,
 * porque `.mrow` nunca deu fundo a `textarea`.
 *
 * Agora cada opcao e um bloco com rotulo em cima de cada campo, usando
 * `.form`/`.fld`/`.frow`, que o projeto ja tinha e que dao o fundo certo
 * de graca. O formulario separado do "e esta" deixou de existir: nao ha
 * mais campo que so aparece depois de marcar.
 */
function Opcao({ o }: { o: StayOption }) {
  const { s, patch, now } = useApp();
  const apagar = useApagarLinha();
  const v = C.stayValor(o);

  /** Marcar uma DESMARCA a anterior: nao existe duas fechadas na mesma cidade. */
  const marcar = () => {
    if (o.chosen) { now('stay_option', o.id, 'chosen', false); return; }
    const antiga = C.stayChosen(s, o.city);
    if (antiga && antiga.id !== o.id) now('stay_option', antiga.id, 'chosen', false);
    now('stay_option', o.id, 'chosen', true);
  };

  return (
    <div className={`hopc${o.chosen ? ' on' : ''}`}>
      <div className="hopc-h">
        <TextField
          fk={`stay_option|${o.id}|name`}
          value={o.name}
          onCommit={(x) => patch('stay_option', o.id, 'name', x)}
          className="nv"
          aria-label="nome da opção"
        />
        <span className="hopc-tt" title="diária × noites, ou o total se você lançou">
          {v ? eur(v) : '—'}
        </span>
        <button
          className={`esta${o.chosen ? ' on' : ''}`}
          title={o.chosen ? 'desmarcar' : 'é esta que eu fechei'}
          aria-pressed={o.chosen}
          onClick={marcar}
        >
          é esta
        </button>
        <input
          className="ck"
          type="checkbox"
          title="já paguei"
          aria-label="já paguei"
          checked={o.paid}
          onChange={(e) => now('stay_option', o.id, 'paid', e.currentTarget.checked)}
        />
        <button
          className="xb"
          title="apagar esta opção"
          aria-label={`apagar ${o.name}`}
          onClick={() => void apagar('stay_option', o.id, o.seed_id)}
        >
          ×
        </button>
      </div>

      <div className="form">
        <div className="fld">
          <label>Endereço</label>
          <TextField
            fk={`stay_option|${o.id}|address`}
            value={o.address}
            onCommit={(x: string) => patch('stay_option', o.id, 'address', x)}
            placeholder="rua, número, bairro"
          />
        </div>
        <div className="fld">
          <label>Link do anúncio</label>
          <TextField
            fk={`stay_option|${o.id}|link`}
            value={o.link}
            onCommit={(x: string) => patch('stay_option', o.id, 'link', x)}
            placeholder="cole o link do anúncio"
          />
        </div>
        <div className="frow">
          <div className="fld">
            <label>Custo por noite</label>
            <NumField
              fk={`stay_option|${o.id}|nightly_eur`}
              value={o.nightly_eur}
              onCommit={(x) => patch('stay_option', o.id, 'nightly_eur', x)}
              className="pv"
              placeholder="€ por noite"
              aria-label="diária cheia em euros"
            />
          </div>
          <div className="fld">
            <label>Quantas noites</label>
            <IntField
              fk={`stay_option|${o.id}|nights`}
              value={o.nights}
              onCommit={(x) => patch('stay_option', o.id, 'nights', x)}
              className="pv"
              placeholder="noites"
              aria-label="noites"
            />
            <DicaNoites city={o.city} />
          </div>
        </div>
        <div className="frow">
          <div className="fld">
            <label>Check-in</label>
            <TextField
              fk={`stay_option|${o.id}|check_in`}
              value={o.check_in}
              onCommit={(x: string) => patch('stay_option', o.id, 'check_in', x)}
              placeholder="ex. dia 12 - 15h"
            />
          </div>
          <div className="fld">
            <label>Check-out</label>
            <TextField
              fk={`stay_option|${o.id}|check_out`}
              value={o.check_out}
              onCommit={(x: string) => patch('stay_option', o.id, 'check_out', x)}
              placeholder="ex. dia 16 - 11h"
            />
          </div>
        </div>
        <div className="fld">
          <label>Total lançado, se souber</label>
          <NumField
            fk={`stay_option|${o.id}|total_eur`}
            value={o.total_eur}
            onCommit={(x: number | null) => patch('stay_option', o.id, 'total_eur', x)}
            className="pv"
            placeholder="ignora diária × noites"
            aria-label="total em euros"
          />
        </div>
        <div className="fld">
          <label>Observação</label>
          <AreaField
            fk={`stay_option|${o.id}|note`}
            value={o.note}
            onCommit={(x) => patch('stay_option', o.id, 'note', x)}
            placeholder="o que você quer lembrar desta opção"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A dica de noites: o numero que o ROTEIRO dele ja tem para esta cidade.
 *
 * Nao preenche nada sozinho. Preencher seria adivinhar: um Airbnb pode
 * cobrir so parte do bloco, e um numero que aparece sem ele digitar entra
 * calado na conta da viagem. Aqui e so o lembrete, ao lado do campo, para
 * ele nao ter que contar dia por dia no calendario.
 */
function DicaNoites({ city }: { city: string }) {
  const { s } = useApp();
  const n = C.noitesEm(s, city);
  if (!n.length) return null;
  const noite = (x: number) => `${x} ${x === 1 ? 'noite' : 'noites'}`;
  return (
    <span className="fdica">
      {n.length === 1
        ? `o roteiro tem ${noite(n[0])} aqui`
        : `o roteiro passa aqui ${n.length} vezes: ${n.map(noite).join(', depois ')}`}
    </span>
  );
}

/**
 * O formulario de opcao NOVA, reescrito em 06/09 depois desta foto dele:
 * "deve ter campos suficientes para eu preencher os dados do airbnb
 * (endereco, diaria, localizacao, observacao....) ali esta apenas um campo
 * como que vou preencher isso".
 *
 * O DIAGNOSTICO, porque ele nao e obvio. Os campos que ele pede EXISTEM
 * todos, desde a Fase 6, e nenhuma coluna nova precisou nascer para este
 * conserto. So que eles moravam DENTRO de uma opcao ja criada, e Madrid
 * tinha zero opcoes: para chegar aos campos era preciso primeiro inventar
 * um nome numa tirinha de um campo so, clicar, e descobrir o formulario
 * depois. Nada na tela dizia isso. Do lado dele, a aba Hospedagem tinha um
 * campo de texto e um botao.
 *
 * Agora o formulario e o mesmo bloco da opcao — os mesmos rotulos, a mesma
 * ordem — e:
 *
 *  - numa base VAZIA ele nasce ABERTO. E o caso da foto: ele abre Madrid e
 *    os campos do anuncio estao ali, sem clique nenhum no meio;
 *  - numa base que ja tem opcao ele fica RECOLHIDO atras de um link, como
 *    o formulario de aviso. Sete bases x um formulario aberto embaixo de
 *    cada lista seria a tela limpa virando parede de campo vazio.
 *
 * A tirinha `.addrow` morreu junto, e com ela o defeito que aparece na
 * foto: "quanto custa" cortado em "quanto cu", porque a coluna do meio da
 * `.addrow` tem 96px fixos.
 *
 * SO LIMPA DEPOIS DE O BANCO CONFIRMAR (secao 8, promessa 3) — e agora isso
 * pesa muito mais do que pesava com dois campos: um insert que falha aqui
 * apagaria o anuncio inteiro que ele acabou de copiar do Airbnb. Se falhar,
 * o texto fica na tela e o erro aparece por escrito.
 */
function Acrescentar({ city, proximaPos }: { city: string; proximaPos: number }) {
  const { insert } = useApp();
  /**
   * ABERTO E ESTADO LOCAL, E SO ISSO — a revisao adversarial de 06/09 pegou
   * aqui o defeito mais caro desta mudanca, e ele merece as linhas.
   *
   * A primeira versao decidia com `vazio || aberto`, onde `vazio` era
   * `proximaPos === 0` — ou seja, DADO REMOTO. Cenario: ele abre Madrid vazia,
   * o formulario nasce aberto, e ele passa tres minutos colando os nove campos
   * do anuncio. Nesse meio-tempo a Lu acrescenta a primeira opcao de Madrid no
   * navegador dela (ou ele mesmo puxa um bairro pelo `+` de Sugestoes noutra
   * aba). O Realtime entrega o INSERT, `opcoes.length` vai de 0 para 1, `vazio`
   * vira false, `aberto` continua false — e o bloco inteiro SAI DO DOM. Os nove
   * campos sao nao-controlados: o texto morava so ali. Ele volta para a tela e
   * o anuncio sumiu, sem erro, sem aviso, sem desfazer.
   *
   * E a regra 5.15 pelo caminho mais violento que existe: mudanca da outra
   * pessoa nao pode roubar o foco, e MUITO menos apagar o que ele escreveu.
   *
   * Agora `aberto` decide sozinho, e so muda por ACAO DELE: nasce aberto se a
   * base estiver vazia, fecha quando ele guarda ou desiste. O efeito abaixo so
   * ABRE, nunca fecha — e a diferenca entre reagir ao remoto e obedecer a ele.
   */
  const [aberto, setAberto] = useState(proximaPos === 0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  /** Base que FICA vazia (ele apagou a ultima) volta a mostrar o formulario. */
  useEffect(() => { if (proximaPos === 0) setAberto(true); }, [proximaPos]);

  const nome = useLocal();
  const endereco = useLocal();
  const link = useLocal();
  const diaria = useLocal();
  const noites = useLocal();
  const entrada = useLocal();
  const saida = useLocal();
  const total = useLocal();
  const nota = useLocal();

  /** Base sem nenhuma opcao: o formulario E a tela, nao ha o que recolher. */
  const vazio = proximaPos === 0;

  if (!aberto) {
    return (
      <button
        type="button"
        className="maisav"
        onClick={() => { setErro(''); setAberto(true); }}
      >
        + outra opção nesta cidade
      </button>
    );
  }

  const por = async () => {
    const n = nome.get();
    if (!n) {
      setErro('Falta o nome da opção — o bairro, ou o nome do anúncio. O resto pode vir depois.');
      // O botao fica no FIM de nove campos: no celular a mensagem nasce fora da
      // tela, embaixo, e ele le "falta o nome" sem ver qual campo e. O foco leva
      // o campo de volta a tela sozinho, e e o unico jeito que funciona nos dois.
      nome.ref.current?.focus();
      return;
    }
    setErro('');
    setSalvando(true);
    // As colunas vao TODAS explicitas: o insert manda exatamente o objeto que
    // a tela montar, e campo esquecido aqui nasce com o default do banco sem
    // ninguem avisar. Ver a nota em supabase/00-tudo.sql, na tabela.
    const r = await insert('stay_option', {
      city,
      name: n,
      note: nota.get(),
      nightly_eur: parseNum(diaria.get()),
      nights: parseInt10(noites.get()),
      total_eur: parseNum(total.get()),
      address: endereco.get(),
      check_in: entrada.get(),
      check_out: saida.get(),
      link: link.get(),
      chosen: false,
      paid: false,
      position: proximaPos,
      seed_id: null,
    });
    setSalvando(false);
    if (!r.ok) {
      setErro('Não consegui salvar esta opção. Nada do que você escreveu se perdeu — tente de novo, e se insistir, me chame.');
      return;
    }
    for (const c of [nome, endereco, link, diaria, noites, entrada, saida, total, nota]) c.limpar();
    setAberto(false);
  };

  return (
    <div className="hopc novo">
      <div className="hopc-nh">os dados do anúncio</div>
      <div className="form">
        <div className="fld">
          <label>Nome da opção</label>
          <input
            ref={(el) => { nome.ref.current = el; }}
            type="text"
            placeholder="ex. Chamberí"
            aria-label="nome da opção"
          />
        </div>
        <div className="fld">
          <label>Endereço</label>
          <input
            ref={(el) => { endereco.ref.current = el; }}
            type="text"
            placeholder="rua, número, bairro"
            aria-label="endereço"
          />
        </div>
        <div className="fld">
          <label>Link do anúncio</label>
          <input
            ref={(el) => { link.ref.current = el; }}
            type="text"
            placeholder="cole o link do anúncio"
            aria-label="link do anúncio"
          />
        </div>
        <div className="frow">
          <div className="fld">
            <label>Custo por noite</label>
            <input
              ref={(el) => { diaria.ref.current = el; }}
              type="text"
              inputMode="decimal"
              className="pv"
              placeholder="€ por noite"
              aria-label="diária cheia em euros"
            />
          </div>
          <div className="fld">
            <label>Quantas noites</label>
            <input
              ref={(el) => { noites.ref.current = el; }}
              type="text"
              inputMode="numeric"
              className="pv"
              placeholder="noites"
              aria-label="noites"
            />
            <DicaNoites city={city} />
          </div>
        </div>
        <div className="frow">
          <div className="fld">
            <label>Check-in</label>
            <input
              ref={(el) => { entrada.ref.current = el; }}
              type="text"
              placeholder="ex. dia 12 - 15h"
              aria-label="check-in"
            />
          </div>
          <div className="fld">
            <label>Check-out</label>
            <input
              ref={(el) => { saida.ref.current = el; }}
              type="text"
              placeholder="ex. dia 16 - 11h"
              aria-label="check-out"
            />
          </div>
        </div>
        <div className="fld">
          <label>Total lançado, se souber</label>
          <input
            ref={(el) => { total.ref.current = el; }}
            type="text"
            inputMode="decimal"
            className="pv"
            placeholder="ignora diária × noites"
            aria-label="total em euros"
          />
        </div>
        <div className="fld">
          <label>Observação</label>
          <textarea
            ref={(el) => { nota.ref.current = el; }}
            placeholder="o que você quer lembrar desta opção"
            aria-label="observação"
          />
        </div>
        {erro ? <div className="ferro" role="alert">{erro}</div> : null}
        <div className="fim">
          <button type="button" onClick={() => void por()} disabled={salvando}>
            {salvando ? 'guardando…' : 'guardar esta opção'}
          </button>
          {vazio ? null : (
            <button
              type="button"
              className="cancelav"
              disabled={salvando}
              onClick={() => { setErro(''); setAberto(false); }}
            >
              deixa
            </button>
          )}
          <span className="fdica">só o nome é obrigatório — o resto você completa depois</span>
        </div>
      </div>
    </div>
  );
}
