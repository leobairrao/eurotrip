// Cliente de service role. SO roda na sua maquina (secao 14.4).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// O .env.local e convencao do Next, nao do dotenv: precisa ser pedido.
// A ordem importa — o primeiro que definir a variavel ganha.
config({ path: join(ROOT, '.env.local') });
config({ path: join(ROOT, '.env') });
export const lerJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(`
  Falta configurar o .env.local.

    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJ...

  A chave de service role fica SO aqui, na sua maquina. Nunca na Vercel,
  nunca no cliente (ESPECIFICACAO.md secao 14.4).
`);
  process.exit(1);
}

export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};
/** Vazio e vazio, nao zero (secao 10.0). */
export const valOrNull = (v) => {
  const t = String(v ?? '').trim();
  if (!t) return null;
  const n = parseFloat(t.replace(',', '.'));
  return isNaN(n) ? null : n;
};

export const brl = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
export const eur = (v) => '€ ' + (Math.round(v * 100) / 100).toLocaleString('pt-BR');

export async function precisa(res, oque) {
  if (res.error) {
    console.error(`\n  falhou: ${oque}\n  ${res.error.message}\n`);
    process.exit(1);
  }
  return res.data;
}
