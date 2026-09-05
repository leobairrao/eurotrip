import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Renova a sessao a cada navegacao — ninguem quer logar de novo toda
 * semana (secao 9.3).
 *
 * ESTE ARQUIVO TEM QUE FICAR EM src/, NAO NA RAIZ. O app vive em
 * src/app, entao o Next procura o middleware em src/middleware.ts. Da
 * primeira publicacao ate 05/09/2026 ele esteve na raiz, e por isso
 * NUNCA rodou: o middleware-manifest.json saia com `"middleware": {}`.
 * A sessao nao se renovava, e passada a validade do token os dois caiam
 * na tela de entrada sem entender por que. Se um dia mexer aqui, confira
 * `.next/server/middleware-manifest.json` depois do build — ele tem que
 * listar a entrada, e o relatorio do build tem que imprimir uma linha
 * "ƒ Middleware".
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem Supabase configurado o app roda em modo demonstracao: nao ha
  // sessao para renovar, e tentar criar o cliente aqui derrubaria a pagina.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css)$).*)'],
};
