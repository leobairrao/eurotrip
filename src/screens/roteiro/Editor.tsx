'use client';
// ============================================================
// O EDITOR DE UM DIA — tres cartoes, desde a etapa 2 (08/09/2026).
//
// Saiu de Roteiro.tsx em 06/09 e eram QUATRO cartoes, cada um com a
// propria lista do dia. Na etapa 2 as listas viraram uma so (`Ordem.tsx`)
// e os tres cartoes de seletor viraram tres gavetas de um cartao
// (`Acrescentar.tsx`). Aqui sobrou o cartao "o dia" e a montagem.
//
// O arquivo foi de 512 linhas para pouco mais de 100, e isso e o ponto:
// tudo que sobrou aqui e do DIA — a base, o texto dele e os avisos.
// ============================================================
import { ISOS } from '@/content';
import { AreaField, TextField } from '@/components/Field';
import Avisos from '@/components/Avisos';
import Acrescentar from './Acrescentar';
import Ordem from './Ordem';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { longDt, wdOf } from '@/lib/fmt';

export default function Editor({ iso }: { iso: string }) {
  return (
    <>
      <CartaoDia iso={iso} />
      {/* A lista do dia mora AQUI agora, e uma so. Ate 07/09 cada cartao de
          seletor tinha a propria — e com quatro listas nao ha como por um
          restaurante entre duas atracoes. */}
      <Ordem iso={iso} />
      {/* a chave por dia e de proposito: "vou usar transporte neste dia?" e uma
          pergunta por DIA, entao a resposta nao pode vazar para o dia seguinte.
          `key={iso}` fecha as tres gavetas ao trocar de dia. */}
      <Acrescentar key={iso} iso={iso} />
    </>
  );
}

/** 1. "O dia" (--pine). */
function CartaoDia({ iso }: { iso: string }) {
  const { s, patch, now } = useApp();
  const d = s.days[iso];
  const hosp = C.hospedagemDoDia(s, iso);

  return (
    <div className="card" style={{ ['--cc' as string]: 'var(--pine)' }}>
      <div className="h">
        <h3>{longDt(iso)}</h3>
        <div className="m">{wdOf(iso)} · dia {ISOS.indexOf(iso) + 1} de {ISOS.length}</div>
      </div>
      <div className="b">
        {/* O aviso do dia virou dele em 05/09: edita, apaga, e pode ter mais de um. */}
        <Avisos spot={`roteiro:${iso}`} rotulo="aviso do dia" />

        <div className="form">
          <div className="fld">
            {/* ESTE CAMPO E O PLANO DELE, e nao a cama (09/09, tarde).
                Pedido: "deve ter um campo livre so para eu escrever e me
                localizar como um plano base". Ele nao decide bloco, noite,
                custo nem nada — quem decide e o airbnb marcado. */}
            <label>Meu plano para este dia — só para eu me localizar</label>
            <TextField
              fk={`day|${iso}|base`}
              value={d?.base ?? ''}
              onCommit={(v) => patch('day', iso, 'base', v)}
              placeholder="ex. Madrid"
              aria-label="meu plano para este dia"
            />
            {/* DE ONDE VEM A BASE (09/09). Ideia dele: a hospedagem marcada
                escreve a base dos dias entre o check-in e o check-out. O
                campo continua aqui porque os dias que nenhuma hospedagem
                cobre precisam de um — os de trânsito, e todos eles hoje.

                O aviso existe para ele não editar à mão um dia que a
                hospedagem manda e achar que mudou a reserva: mudar aqui
                muda só este dia, e remarcar a opção escreve por cima. */}
            {hosp ? (
              <span className="fdica">
                você dorme em <b>{C.nomeCidade(s, hosp.city)}</b> neste dia — pela
                hospedagem <b>{hosp.name}</b>, que você marcou. Este campo é só o seu plano
              </span>
            ) : (
              <span className="fdica">
                sem hospedagem definida para este dia — marque <b>é esta</b> numa opção da
                aba <b>Hospedagem</b>, com check-in e check-out
              </span>
            )}
          </div>
          <div className="fld">
            <label>O que fazer neste dia — suas palavras</label>
            <AreaField
              fk={`day|${iso}|plan`}
              value={d?.plan ?? ''}
              onCommit={(v) => patch('day', iso, 'plan', v)}
              placeholder="escreva livre, ou só marque as atrações abaixo e deixe isto em branco"
              aria-label="o que fazer neste dia"
            />
          </div>
        </div>

        {/* Apaga SO o texto dele. A base e o roteiro fechado e fica. */}
        <div className="addrow one">
          <button onClick={() => now('day', iso, 'plan', '')}>apagar o meu texto</button>
        </div>
      </div>
    </div>
  );
}
