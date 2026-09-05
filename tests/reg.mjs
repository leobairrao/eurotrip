import { registerHooks } from 'node:module';
import { resolve, load } from '../scripts/_ts-hook.mjs';
registerHooks({ resolve, load });
