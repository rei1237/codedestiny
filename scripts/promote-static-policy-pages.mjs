import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { STATIC_POLICY_ROUTES, policyStaticPath } from '../lib/navigation/static-policy-routes.mjs';

const dist = resolve('dist');
if (!existsSync(dist)) throw new Error('Static policy promotion requires the prepared dist directory');
await import('./design/build-static-policy-pages.mjs');

for (const route of STATIC_POLICY_ROUTES) {
  const source = resolve('public', '.' + policyStaticPath(route));
  const html = readFileSync(source, 'utf8');
  if (!html.includes('cd-policy-static') || html.includes('/_next/') || html.includes('__next_f')) throw new Error('Invalid static policy: ' + route.key);
  const targets = [policyStaticPath(route), ...[route.canonical, ...route.aliases].map((url) => url + '/index.html')];
  for (const file of targets) {
    const target = resolve(dist, '.' + file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}

for (const file of ['styles/static-policy.css', 'js/static-policy-contact.js', 'icons/yehwa-branch.svg']) {
  const target = resolve(dist, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(resolve('public', file), target);
}
console.log('[static-policies] promoted 6 canonical pages and 3 aliases');
