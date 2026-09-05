// Faz o `node --test` enxergar o codigo de producao como ele e:
//  - resolve o alias  @/x  ->  src/x   (o mesmo do tsconfig)
//  - resolve  ../content  ->  ../content/index.ts  (import de diretorio)
//  - entrega .json como modulo, sem exigir import attributes
// Assim os testes rodam contra src/lib/calc.ts de verdade, nao contra uma copia.
import { readFileSync, statSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve as rp } from 'node:path';

const ROOT = rp(dirname(fileURLToPath(import.meta.url)), '..');

export function resolve(spec, ctx, next) {
  let s = spec;
  if (s.startsWith('@/')) s = pathToFileURL(join(ROOT, 'src', s.slice(2))).href;

  const ehArquivo = (c) => {
    try { return statSync(c).isFile(); } catch { return false; }
  };
  const tenta = (base) => {
    for (const c of [base, base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx')]) {
      if (ehArquivo(c)) return c;
    }
    return null;
  };

  if (s.startsWith('file://') || s.startsWith('./') || s.startsWith('../')) {
    const abs = s.startsWith('file://')
      ? fileURLToPath(s)
      : rp(dirname(fileURLToPath(ctx.parentURL)), s);
    const hit = tenta(abs);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true, format: hit.endsWith('.json') ? 'json' : 'module' };
  }
  return next(s, ctx);
}

export function load(url, ctx, next) {
  const p = url.startsWith('file://') ? fileURLToPath(url) : null;
  if (p && p.endsWith('.json')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default ' + readFileSync(p, 'utf8'),
    };
  }
  if (p && /\.tsx?$/.test(p)) {
    // `strip` troca os tipos por espaco: o numero de linha do stack continua certo
    const source = stripTypeScriptTypes(readFileSync(p, 'utf8'), { mode: 'strip' });
    return { format: 'module', shortCircuit: true, source };
  }
  return next(url, ctx);
}
