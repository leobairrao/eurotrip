import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * O link magico volta aqui. Aceita as duas formas que o Supabase manda,
 * porque depende de qual variavel o modelo de e-mail usa:
 *   ?code=...                      -> {{ .ConfirmationURL }} (fluxo PKCE)
 *   ?token_hash=...&type=magiclink -> {{ .TokenHash }}
 * Se so uma estivesse tratada, trocar o texto do e-mail quebraria a entrada.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const erro = searchParams.get('error_description') ?? searchParams.get('error');

  const paraLogin = (motivo: string) =>
    NextResponse.redirect(`${origin}/?erro=${encodeURIComponent(motivo)}`);

  if (erro) return paraLogin(erro);

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return paraLogin(error.message);
    return NextResponse.redirect(origin);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return paraLogin(error.message);
    return NextResponse.redirect(origin);
  }

  return paraLogin('link-invalido');
}
