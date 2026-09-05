'use client';
// ============================================================
// A tela de entrada (secao 9).
//
// Era um campo de e-mail e um link magico. Em 04/09/2026 o Leo pediu
// para trocar por nome de usuario, sem verificacao nenhuma: a Lu nao
// conseguia entrar pelo e-mail e ele nao quis mais depender disso.
//
// Um campo e um botao. O que decide tudo e a rota /auth/entrar, no
// servidor — o navegador nunca ve credencial nenhuma.
// ============================================================
import { useState } from 'react';

type Estado = 'parado' | 'indo' | 'negado' | 'semconfig' | 'falhou';

export default function Login({ erro }: { erro?: string }) {
  const [usuario, setUsuario] = useState('');
  const [estado, setEstado] = useState<Estado>('parado');
  const [detalhe, setDetalhe] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const nome = usuario.trim();
    if (!nome) return;
    setEstado('indo');
    try {
      const r = await fetch('/auth/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: nome }),
      });
      if (r.ok) {
        // recarrega do servidor: a sessao acabou de nascer no cookie
        window.location.href = '/';
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (r.status === 503 || j.erro === 'sem-configuracao') { setEstado('semconfig'); return; }
      if (r.status === 401 && j.erro === 'nao-e-da-casa') { setEstado('negado'); return; }
      setEstado('falhou');
      setDetalhe(String(j.erro ?? ''));
    } catch {
      setEstado('falhou');
      setDetalhe('sem conexão');
    }
  }

  return (
    <div className="entrar">
      <h1>Eurotrip 2026</h1>
      <p className="sub">10 DEZ 2026 — 12 JAN 2027</p>

      <form onSubmit={entrar}>
        <input
          type="text"
          value={usuario}
          onChange={(ev) => setUsuario(ev.target.value)}
          placeholder="seu usuário"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="usuário"
          required
          autoFocus
        />
        <button type="submit" disabled={estado === 'indo'}>
          {estado === 'indo' ? 'entrando' : 'entrar'}
        </button>
      </form>

      {estado === 'negado' && (
        <p className="msg no">
          Este app é privado. Ele foi feito para duas pessoas, e o acesso é só por
          convite direto.
        </p>
      )}
      {estado === 'semconfig' && (
        <p className="msg no">
          O site está sem a variável <b>ENTRAR_SENHA</b>. Ponha ela nas variáveis de
          ambiente do projeto na Vercel e publique de novo — sem ela o servidor não
          consegue abrir a sessão.
        </p>
      )}
      {estado === 'falhou' && (
        <p className="msg no">
          Não deu para entrar agora. Tente de novo em um instante.
          {detalhe ? <><br />{detalhe}</> : null}
        </p>
      )}
      {erro && estado === 'parado' && (
        <p className="msg no">A sessão anterior expirou. Entre de novo.</p>
      )}

      <p className="rodape">O PLANO É SEU — EU GUARDO, PESQUISO E FAÇO AS CONTAS</p>
    </div>
  );
}
