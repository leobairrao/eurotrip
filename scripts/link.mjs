// Gera um link de entrada sem passar pelo e-mail. So para testar a
// entrada na sua propria maquina antes de mandar o link para a Lu.
import { db } from './_db.mjs';

const email = process.argv[2];
if (!email) {
  console.error('\n  uso: node scripts/link.mjs <e-mail>\n');
  process.exit(1);
}
const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email });
if (error) { console.error('  ' + error.message); process.exit(1); }

const base = process.env.BASE ?? 'http://localhost:3000';
console.log(`${base}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`);
