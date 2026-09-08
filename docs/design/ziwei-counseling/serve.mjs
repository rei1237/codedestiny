import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/mockup.css', ['mockup.css', 'text/css; charset=utf-8']],
  ['/mockup.js', ['mockup.js', 'text/javascript; charset=utf-8']],
  ['/assets/celestial-atlas.webp', ['assets/celestial-atlas.webp', 'image/webp']],
  ['/assets/celestial-atlas-mobile.webp', ['assets/celestial-atlas-mobile.webp', 'image/webp']],
  ['/styles/fonts-serif.css', ['../../../styles/fonts-serif.css', 'text/css; charset=utf-8']],
]);
const server = createServer(async (req, res) => {
  const target = files.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (req.method !== 'GET' || !target) { res.writeHead(404).end(); return; }
  try {
    const bytes = await readFile(path.resolve(directory, target[0]));
    res.writeHead(200, { 'Content-Type': target[1], 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
server.listen(Number(process.env.ZIWEI_MOCKUP_PORT || 0), '127.0.0.1', () => console.log(`Ziwei design mockup: http://127.0.0.1:${server.address().port}`));
process.on('SIGINT', () => server.close(() => process.exit(0)));
