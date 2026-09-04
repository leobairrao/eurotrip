// ============================================================
// npm run usuarios — a allowlist (secao 9.5 e 14.3).
//
// A tabela app_user tem FK para auth.users, entao a conta de
// autenticacao precisa existir ANTES da linha da allowlist. Este
// script cria as duas contas (sem senha — o acesso e so por link
// magico) e insere as duas linhas com o `who` certo.
//
// Idempotente: rodar de novo nao duplica nada.
// ============================================================
import { db, precisa } from './_db.mjs';

const DOIS = [
  { email: 'leobairrao05@gmail.com',   who: 'leo' },
  { email: 'luisaanadamelo@gmail.com', who: 'lu'  },
];

// Procura a conta de auth pelo e-mail, paginando a lista.
async function acharAuth(email) {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) { console.error('  ' + error.message); process.exit(1); }
    const achou = (data?.users ?? []).find(
      (u) => (u.email ?? '').toLowerCase() === email.toLowerCase(),
    );
    if (achou) return achou;
    if ((data?.users ?? []).length < 200) return null;
  }
  return null;
}

for (const { email, who } of DOIS) {
  let user = await acharAuth(email);

  if (!user) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,   // o link magico e a unica porta; nao ha senha
    });
    if (error) { console.error(`  falhou criar ${email}: ${error.message}`); process.exit(1); }
    user = data.user;
    console.log(`  conta de auth criada  ${email}`);
  } else {
    console.log(`  conta de auth ja existia  ${email}`);
  }

  await precisa(
    await db.from('app_user').upsert({ id: user.id, email, who }, { onConflict: 'id' }),
    `app_user ${email}`,
  );
  console.log(`  allowlist ok          ${email}  ->  ${who}`);
}

const { data: todos } = await db.from('app_user').select('email,who').order('who');
console.log('\n  quem pode entrar:');
for (const r of todos ?? []) console.log(`    ${r.who.padEnd(4)} ${r.email}`);
console.log(`
  Nao esqueca, no painel do Supabase:
    Authentication > Sign In / Providers > desligue "Allow new users to sign up"
  Sem isso, um estranho pode criar conta pedindo um link. (A RLS ja o deixaria
  sem ver nada, mas e uma porta que nao precisa ficar aberta.)
`);
