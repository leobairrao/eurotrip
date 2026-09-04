import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** O link magico volta aqui. Troca o code pela sessao e manda para o app. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const erro = searchParams.get('error_description') ?? searchParams.get('error');

  if (erro) return NextResponse.redirect(`${origin}/?erro=${encodeURIComponent(erro)}`);

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/?erro=${encodeURIComponent(error.message)}`);
    return NextResponse.redirect(origin);
  }
  return NextResponse.redirect(`${origin}/?erro=link-invalido`);
}
