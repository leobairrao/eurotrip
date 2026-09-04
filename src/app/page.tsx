import Login from '@/components/Login';
import AppShell from '@/components/AppShell';
import { Provider } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { MODO_DEMO, SEM_SUPABASE, carregar, carregarDemo } from '@/lib/load';
import type { AppUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const erro = typeof sp.erro === 'string' ? sp.erro : undefined;

  // Publicado sem as variaveis: nao mostra dado nenhum. Melhor a pagina
  // dizer que falta configurar do que servir os dados dele sem login.
  if (SEM_SUPABASE && !MODO_DEMO) {
    return (
      <div className="entrar">
        <h1>Eurotrip 2026</h1>
        <p className="sub">FALTA CONFIGURAR</p>
        <p className="msg no">
          Este site está sem as variáveis do Supabase. Ponha{' '}
          <b>NEXT_PUBLIC_SUPABASE_URL</b> e <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> nas
          variáveis de ambiente do projeto e publique de novo.
        </p>
      </div>
    );
  }

  // Na maquina de quem desenvolve: modo demonstracao, para conferir as
  // telas lado a lado com o artefato antes de o Supabase existir.
  if (MODO_DEMO) {
    const s = await carregarDemo();
    return (
      <Provider inicial={s} me={null}>
        <AppShell demo />
      </Provider>
    );
  }

  const db = await supabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return <Login erro={erro} />;

  // A allowlist. Sessao sem linha em app_user nao ve nada (secao 9.2).
  const { data: linha } = await db
    .from('app_user')
    .select('id,email,who')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!linha) return <Login erro="fora-da-lista" />;

  const me = linha as AppUser;
  const s = await carregar(db, me);
  return (
    <Provider inicial={s} me={me}>
      <AppShell />
    </Provider>
  );
}
