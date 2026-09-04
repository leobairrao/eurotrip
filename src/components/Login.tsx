'use client';
// ============================================================
// A tela de entrada (secao 9).
// Um campo de e-mail e um botao. Nada mais: sem cadastro, sem senha,
// sem "entrar com", sem texto de marketing.
// ============================================================
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Login({ erro }: { erro?: string }) {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'parado' | 'indo' | 'enviado' | 'negado' | 'falhou'>('parado');
  const [detalhe, setDetalhe] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const alvo = email.trim().toLowerCase();
    if (!alvo) return;
    setEstado('indo');
    const db = supabaseBrowser();
    if (!db) {
      // so acontece se faltar variavel de ambiente na Vercel
      setEstado('falhou');
      setDetalhe('o app não está configurado');
      return;
    }

    // A allowlist vive em app_user (secao 9.5). A funcao devolve so
    // true/false — nunca diz se a conta existe (secao 9.2).
    const { data: permitido, error: erroRpc } = await db.rpc('email_permitido', { e: alvo });
    if (erroRpc) {
      setEstado('falhou');
      setDetalhe(erroRpc.message);
      return;
    }
    if (!permitido) {
      setEstado('negado');
      return;
    }

    const { error } = await db.auth.signInWithOtp({
      email: alvo,
      options: {
        // ninguem de fora cria conta pedindo link
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setEstado('falhou');
      setDetalhe(error.message);
      return;
    }
    setEstado('enviado');
  }

  return (
    <div className="entrar">
      <h1>Eurotrip 2026</h1>
      <p className="sub">10 DEZ 2026 — 12 JAN 2027</p>

      <form onSubmit={entrar}>
        <input
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="seu e-mail"
          autoComplete="email"
          aria-label="e-mail"
          required
        />
        <button type="submit" disabled={estado === 'indo' || estado === 'enviado'}>
          {estado === 'indo' ? 'enviando' : estado === 'enviado' ? 'enviado' : 'me manda o link'}
        </button>
      </form>

      {estado === 'enviado' && (
        <p className="msg ok">
          Olhe o seu e-mail. O link entra direto — não tem senha.
          <br />
          Se não chegar em um minuto, veja o spam.
        </p>
      )}
      {estado === 'negado' && (
        <p className="msg no">
          Este app é privado. Ele foi feito para duas pessoas, e o acesso é só por
          convite direto.
        </p>
      )}
      {estado === 'falhou' && (
        <p className="msg no">
          Não deu para enviar agora. Tente de novo em um instante.
          {detalhe ? <><br />{detalhe}</> : null}
        </p>
      )}
      {erro && estado === 'parado' && (
        <p className="msg no">
          O link não funcionou — provavelmente expirou. Peça outro.
        </p>
      )}

      <p className="rodape">O PLANO É SEU — EU GUARDO, PESQUISO E FAÇO AS CONTAS</p>
    </div>
  );
}
