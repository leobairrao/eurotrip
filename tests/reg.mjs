import { registerHooks } from 'node:module';
import { resolve, load } from './hook.mjs';
registerHooks({ resolve, load });
