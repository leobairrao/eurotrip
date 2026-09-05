// ============================================================
// Entrar so com o nome de usuario (escolha do Leo em 04/09/2026).
//
// Antes era link magico no e-mail. A Lu nao conseguia entrar, e ele
// pediu: digitar "luananda" ou "leobairrao" e pronto, sem verificacao
// nenhuma. Foi dito a ele, e ele decidiu assim: QUEM SOUBER O NOME
// ENTRA. Nao ha segundo fator, nao ha senha do usuario, nao ha e-mail.
//
// Como a sessao nasce: o Supabase precisa de ALGUMA credencial para
// emitir uma sessao, e a sessao e o que faz a RLS funcionar (as
// politicas olham auth.uid()). Entao existe uma senha de servidor,
// igual para as duas contas, que mora SO em ENTRAR_SENHA e nunca chega
// ao navegador. Ela nao protege nada — o nome e que e a porta; ela e so
// o jeito de pedir a sessao ao Supabase.
//
// O repositorio e PUBLICO: essa senha nao pode entrar em arquivo
// nenhum daqui. Sem a variavel, esta rota recusa e diz por que.
// ============================================================
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** minusculo, sem acento, sem espaco nem ponto — "Leo Bairrão" vira "leobairrao". */
function chave(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9@]/g, '');
}

/**
 * Os apelidos que cada um pode digitar. Os e-mails ja estao no
 * repositorio publico desde sempre (scripts/usuarios.mjs), entao nao ha
 * nada aqui que nao fosse publico antes.
 */
const QUEM: Record<string, string> = {};
const por = (email: string, apelidos: string[]) => {
  for (const a of apelidos) QUEM[chave(a)] = email;
  QUEM[chave(email)] = email;
};
por('leobairrao05@gmail.com', ['leobairrao', 'leo', 'leonardo', 'leobairrao05']);
por('luisaanandamelo@gmail.com', ['luananda', 'lu', 'luisa', 'luisaananda', 'ananda', 'luisaanandamelo']);

export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => ({}));
  const email = QUEM[chave((corpo as { usuario?: string }).usuario)];

  const senha = process.env.ENTRAR_SENHA;
  if (!senha) {
    // Acontece se o codigo subir antes de a variavel existir na Vercel.
    // Dizer a verdade aqui vale mais do que um "nao deu certo" generico.
    return NextResponse.json({ erro: 'sem-configuracao' }, { status: 503 });
  }

  // Nome que nao esta na lista: a mesma resposta de sempre, sem dizer
  // se existe ou nao (secao 9.2).
  if (!email) return NextResponse.json({ erro: 'nao-e-da-casa' }, { status: 401 });

  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({ email, password: senha });
  if (error) return NextResponse.json({ erro: error.message }, { status: 401 });

  return NextResponse.json({ ok: true });
}
