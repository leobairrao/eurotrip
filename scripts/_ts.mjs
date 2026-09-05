// Faz o `node` enxergar o codigo de producao: alias @/, import de
// diretorio, .json como modulo, e TypeScript sem compilar.
// Usado pelos testes (via tests/reg.mjs) e pelo `npm run seed`, que
// importa src/lib/avisos-semente.ts para nao duplicar a lista.
import { registerHooks } from 'node:module';
import { resolve, load } from './_ts-hook.mjs';
registerHooks({ resolve, load });
