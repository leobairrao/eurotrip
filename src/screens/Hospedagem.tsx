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
// ============================================================
import { CIDADES_FIXAS, STAYS, coOf } from '@/content';
import { AreaField, NumField, IntField, TextField, useLocal } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Fita from '@/components/Fita';
import { useApp } from '@/lib/store';
import { useApagarLinha } from '@/lib/apagar';
import { useUi } from '@/lib/ui';
import * as C from '@/lib/calc';
import { brl, eur, parseNum } from '@/lib/fmt';
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
        <p>
          As opções <b>que você guardar aqui</b>, e você marca <b>a que fechou</b>. Só a
          marcada entra no custo da viagem — as outras ficam como plano B. A diária é a
          <b> diária cheia do anúncio</b>, sem dividir. Os bairros que eu pesquisei estão na
          aba <b>Sugestões</b>: o + de lá traz para cá.
        </p>
      </div>

      {/* a mesma fita de Atracoes, Comidas e Dicas */}
      <Fita
        sel={selCO}
        onSel={setSelCO}
        valor={(k: string) => {
          const v = basesDe(k).reduce((a, city) => a + C.stayTotal(s, city), 0);
          return v ? eur(v) : '';
        }}
      />

      <div className="bigsum">
        <div>
          <b>{C.stayCount(s, CIDADES)}/{STAYS.length}</b>
          <span>bases com endereço salvo</span>
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
            Nenhuma opção aqui ainda. Escreva abaixo, ou puxe um bairro meu com o{' '}
            <b>+</b> da aba <b>Sugestões</b>.
          </div>
        ) : (
          <div className="mt">
            {opcoes.map((o) => <Opcao key={o.id} o={o} />)}
          </div>
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
          <label>Localização</label>
          <TextField
            fk={`stay_option|${o.id}|address`}
            value={o.address}
            onCommit={(x: string) => patch('stay_option', o.id, 'address', x)}
            placeholder="rua, número, bairro"
          />
        </div>
        <div className="fld">
          <label>Link da reserva</label>
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
          <label>Nota</label>
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

function Acrescentar({ city, proximaPos }: { city: string; proximaPos: number }) {
  const { insert } = useApp();
  const nome = useLocal();
  const diaria = useLocal();

  const por = async () => {
    const n = nome.get();
    if (!n) return;
    const r = insert('stay_option', {
      city, name: n, note: '',
      nightly_eur: parseNum(diaria.get()),
      position: proximaPos,
      seed_id: null,
    });
    // So limpa depois de o banco confirmar (secao 8, promessa 3).
    if (!(await r).ok) return;
    nome.limpar();
    diaria.limpar();
  };

  // `.addrow` puro, nao `.three`: sao TRES campos, e `.three` declara QUATRO
  // colunas (1fr 96px 62px auto). O botao caia na faixa de 62px precisando de
  // 177px, e o texto vazava para fora do cartao — foi o que ele fotografou em
  // 06/09. Sobra de quando havia um seletor de moeda ali.
  return (
    <div className="addrow">
      <input
        ref={(el) => { nome.ref.current = el; }}
        type="text"
        placeholder="ex. Chamberí"
        aria-label="nome da opção"
      />
      <input
        ref={(el) => { diaria.ref.current = el; }}
        type="text"
        inputMode="decimal"
        placeholder="quanto custa"
        aria-label="diária em euros"
      />
      <button type="button" onClick={() => void por()}>acrescentar opção</button>
    </div>
  );
}
