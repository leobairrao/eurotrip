import Login from '@/components/Login';
import AppShell from '@/components/AppShell';
import { Provider } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { SEM_SUPABASE, carregar, carregarDemo } from '@/lib/load';
import type { AppUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const erro = typeof sp.erro === 'string' ? sp.erro : undefined;

  // Sem banco configurado: modo demonstracao, para conferir as telas
  // lado a lado com o artefato antes de o Supabase existir.
  if (SEM_SUPABASE) {
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
