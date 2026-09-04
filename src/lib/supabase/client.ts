'use client';
import { createBrowserClient } from '@supabase/ssr';

/** O cliente do navegador. So a chave anonima chega aqui (secao 14.4). */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
