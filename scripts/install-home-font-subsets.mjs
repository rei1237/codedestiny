// Register only the characters covered by the home WOFF2 files. Keep source
// font stacks, user preferences and the full-range family registrations intact.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function installHomeFontSubsets(directory) {
  const css = readFileSync(path.join(directory, 'assets/fonts/home/ggulggul.css'), 'utf8');
  for (const [, file] of css.matchAll(/url\((\/assets\/fonts\/home\/[a-z0-9-]+\.woff2)\)/g)) {
    if (!existsSync(path.join(directory, file))) throw new Error('Missing home font file: ' + file);
  }
  const marker = 'id="cd-home-font-faces"';
  const target = path.join(directory, 'ggulggul/index.html');
  if (!existsSync(target)) return;
  const html = readFileSync(target, 'utf8');
  if (html.includes(marker)) return;
  writeFileSync(target, html.replace('</head>', '<style ' + marker + '>' + css + '</style></head>'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    && process.env.NEXT_PUBLIC_RUNTIME_TARGET !== 'mobile-app') {
  installHomeFontSubsets(path.resolve(process.argv[2] || 'dist'));
}
