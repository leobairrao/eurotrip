// ============================================================
// Quem pode entrar, e com que nome (escolha do Leo em 04/09/2026).
//
// Fica FORA da rota de proposito: rota do Next nao se testa direto, e
// esta e a parte que decide quem entra. Ver tests/entrar.test.mjs.
// ============================================================

/**
 * minusculo, sem acento, sem espaco nem ponto — "Leo Bairrão" vira "leobairrao".
 *
 * So aceita STRING. `String(v)` parecia a defesa obvia e nao e: ela
 * ESTOURA em objeto com toString sombreado por algo que nao da para
 * chamar, e o JSON.parse produz exatamente esse objeto —
 * {"usuario":{"toString":"x"}} derrubava a rota em 500 (achado da
 * revisao de 05/09). Qualquer coisa que nao seja string vira ''.
 */
export function chave(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9@]/g, '');
}

/**
 * Os apelidos que cada um pode digitar. Os e-mails ja estao no
 * repositorio publico desde sempre (scripts/usuarios.mjs), entao nao ha
 * nada aqui que nao fosse publico antes.
 *
 * Object.create(null), nao {}: um objeto literal herda de
 * Object.prototype, e `chave()` deixa passar exatamente um nome de la —
 * "constructor". QUEM['constructor'] devolvia a funcao Object, que e
 * truthy, entao a trava do `if` nao travava e um nao-string chegava ao
 * Supabase (achado da revisao de 05/09). Sem prototipo, so existe o que
 * eu pus aqui.
 */
const QUEM: Record<string, string> = Object.create(null);
const por = (email: string, apelidos: string[]) => {
  for (const a of apelidos) QUEM[chave(a)] = email;
  QUEM[chave(email)] = email;
};
por('leobairrao05@gmail.com', ['leobairrao', 'leo', 'leonardo', 'leobairrao05']);
por('luisaanandamelo@gmail.com', ['luananda', 'lu', 'luisa', 'luisaananda', 'ananda', 'luisaanandamelo']);

/** O e-mail de quem digitou esse nome, ou null. Nunca estoura. */
export function emailDe(usuario: unknown): string | null {
  const k = chave(usuario);
  if (!k) return null;
  const e = QUEM[k];
  // confere o TIPO, nao so se e truthy: e o que garante que nada alem
  // de um e-mail meu saia daqui
  return typeof e === 'string' ? e : null;
}
