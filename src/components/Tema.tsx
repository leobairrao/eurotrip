'use client';
// ============================================================
// O menu de TEMA da atracao, num arquivo so (08/09/2026).
//
// Ele morava dentro de `Atracoes.tsx`. Saiu de la quando o Roteiro passou a
// registrar atracao tambem: duas copias deste menu divergiriam na primeira
// vez que alguem mexesse numa — foi exatamente o que aconteceu com a tira
// de etiquetas do dia, que remontava o dia por conta propria e discordava
// do `dia.ts` em duas coisas.
//
// Aqui nao mudou NADA de comportamento, so de endereco.
// ============================================================
import { useRef, useState } from 'react';
import { akEmoji } from '@/content';
import { useApp } from '@/lib/store';
import * as C from '@/lib/calc';
import { AK_MAX } from '@/lib/types';

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
export default function Tema({
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
