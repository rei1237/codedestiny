import { registerHooks } from 'node:module';

const library = './node_modules/astronomy-engine/esm/astronomy.js';
const files = [
  library, './imd-origin.mjs', '../../../lib/vedicCalculator.js', '../../../worker/lib/imd-sidereal-profile.js',
  ...['vedic-derived-calculations', 'sukuyo-coordinate', 'sukuyo-premium', 'sukuyo-relation-core', 'cms-record-store']
    .map(name => '../../../worker/lib/' + name + '.js'),
];
const allowed = new Set(files.map(file => new URL(file, import.meta.url).href));
registerHooks({ resolve(specifier, context, next) {
  if (!specifier.startsWith('.') || !allowed.has(new URL(specifier, context.parentURL).href)) {
    throw Error('UNREVIEWED_PANCHANG_IMPORT: ' + specifier);
  }
  return next(specifier, context);
} });
globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
