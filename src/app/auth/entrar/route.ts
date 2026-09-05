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
import { emailDe } from '@/lib/entrar';

export async function POST(request: NextRequest) {
  // `.catch` so cobre a promessa REJEITADA (corpo vazio, corpo que nao e
  // JSON). O corpo literal `null` e JSON valido: resolve com null, o catch
  // nao roda, e ler .usuario de null derrubava a rota em 500.
  const cru: unknown = await request.json().catch(() => null);
  const corpo = (cru && typeof cru === 'object' ? cru : {}) as { usuario?: unknown };
  const email = emailDe(corpo.usuario);

  const senha = process.env.ENTRAR_SENHA;
  if (!senha) {
    // Acontece se o codigo subir antes de a variavel existir na Vercel.
    // Dizer a verdade aqui vale mais do que um "nao deu certo" generico.
    return NextResponse.json({ erro: 'sem-configuracao' }, { status: 503 });
  }

  // Nome que nao esta na lista: a mesma resposta de sempre, sem dizer
  // se existe ou nao (secao 9.2). Confere o TIPO, nao so se e truthy —
  // e o que garante que nada alem de um e-mail meu chegue la embaixo.
  if (email === null) return NextResponse.json({ erro: 'nao-e-da-casa' }, { status: 401 });

  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({ email, password: senha });
  // A mensagem crua do Supabase nao vai para a tela: ela fala de e-mail e
  // de senha, coisas que quem digita um nome nao deveria nem ver.
  if (error) return NextResponse.json({ erro: 'nao-entrou' }, { status: 401 });

  return NextResponse.json({ ok: true });
}
