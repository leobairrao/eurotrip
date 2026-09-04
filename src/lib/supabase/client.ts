'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sem as duas variaveis o app roda em modo demonstracao. */
export const temSupabase = () => !!URL && !!KEY;

/**
 * O cliente do navegador. So a chave anonima chega aqui (secao 14.4).
 * Devolve null no modo demonstracao — quem chama tem que tratar.
 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!URL || !KEY) return null;
  return createBrowserClient(URL, KEY);
}
