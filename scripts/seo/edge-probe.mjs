// Network-free edge probe: runs the Cloudflare Pages advanced-mode worker (dist/_worker.js) in a
// Node vm in front of an emulation of Pages static serving, so build output alone shows
// trailing-slash redirects (slash308: any 3xx other than one absolute https 301), country 302s and crawler geo cookies.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const ORIGIN = 'https://code-destiny.test';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
// Label is what Task 3 consumes; ua is what is actually sent. Send the strings Google really uses:
// a bare token like "Googlebot-InspectionTool" trips the worker's /bot/ exclusion and hides the case.
const CRAWLERS = [
  { label: 'Google-InspectionTool', ua: 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)' },
  { label: 'Mediapartners-Google', ua: 'Mediapartners-Google' },
];
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.gif': 'image/gif', '.avif': 'image/avif', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4',
};

// Same loading trick as __tests__/ui/visitor-country-routing.test.mjs. fetch is a trap: a plain GET
// must never reach the network, so any subrequest the worker attempts fails loudly.
export function loadWorker(source) {
  const noNetwork = async () => { throw new Error('edge probe: network access is disabled'); };
  return runInNewContext(source.replace('export default {', 'globalThis.worker = {') + '\nworker;', {
    URL, URLSearchParams, Request, Response, Headers, AbortSignal, console, fetch: noNetwork,
  });
}

// Pages static serving: a file is 200, `/dir` with dir/index.html is a 308 to `/dir/`, `/dir/` serves
// its index.html, `/page` serves page.html, anything else (or anything outside distDir) is 404.
// Where real Pages differs (not emulated, so counts describe the worker, not the full production response):
//   - `/x.html` is 200 here; Pages 308s it to `/x`. `/dir/index.html` is 200 here; Pages 308s it to `/dir/`.
//   - `/dir/` with only dir.html (no dir/index.html) is 404 here; Pages still resolves it to dir.html.
//   - `_redirects` and `_headers` are not applied.
// The vm context is not a sandbox and has no timeout: only run a dist this repo built.
export function distAssets(distDir) {
  const root = resolve(distDir);
  const fileAt = (relPath) => {
    const file = resolve(root, relPath);
    const inside = relative(root, file);
    if (/^\.\.(?:[\\/]|$)/.test(inside) || isAbsolute(inside)) return null;
    return existsSync(file) && statSync(file).isFile() ? file : null;
  };
  const serve = (file) => new Response(readFileSync(file), {
    status: 200, headers: { 'Content-Type': CONTENT_TYPES[extname(file).toLowerCase()] || 'application/octet-stream' },
  });
  return {
    async fetch(request) {
      const url = new URL(request.url);
      let path;
      try { path = decodeURIComponent(url.pathname); } catch { return new Response('Not Found', { status: 404 }); }
      if (path.includes('\0')) return new Response('Not Found', { status: 404 });
      const rel = path.replace(/^\/+/, '');
      if (path.endsWith('/')) {
        const index = fileAt(join(rel, 'index.html'));
        return index ? serve(index) : new Response('Not Found', { status: 404 });
      }
      const exact = fileAt(rel);
      if (exact) return serve(exact);
      if (fileAt(join(rel, 'index.html'))) {
        return new Response(null, { status: 308, headers: { Location: url.pathname + '/' + url.search } });
      }
      const page = fileAt(rel + '.html');
      return page ? serve(page) : new Response('Not Found', { status: 404 });
    },
  };
}

async function visit(worker, assets, path, country, userAgent) {
  const request = new Request(ORIGIN + path, { headers: { 'User-Agent': userAgent, Accept: 'text/html' } });
  Object.defineProperty(request, 'cf', { value: { country } });
  return worker.fetch(request, { ASSETS: assets }, { waitUntil() {}, passThroughOnException() {} });
}

export async function probeEdge({ workerSource, assets }) {
  const worker = loadWorker(workerSource);
  const result = { slash308: [], country302: [], crawlerCookie: [] };
  for (const path of ['/saju', '/en', '/ggulggul']) {
    // Violation: any 3xx that is not the worker's own one absolute https 301. 200 and 404 are not (a missing directory must not block publishing).
    const response = await visit(worker, assets, path, 'KR', CHROME_UA);
    const redirected = response.status >= 300 && response.status < 400;
    if (redirected && !(response.status === 301 && /^https:\/\//i.test(response.headers.get('Location') || ''))) result.slash308.push(path);
  }
  if ((await visit(worker, assets, '/', 'US', CHROME_UA)).status === 302) result.country302.push('/ US');
  for (const { label: crawler, ua } of CRAWLERS) {
    for (const path of ['/', '/saju/']) {
      const response = await visit(worker, assets, path, 'US', ua);
      const cacheControl = response.headers.get('Cache-Control') || '';
      // Crawlers get cd_geo_country and `private` (the cookie makes the response per-visitor); a language cookie or no-store is the violation.
      if (/cd_geo_locale/.test(response.headers.get('Set-Cookie') || '') || /no-store/i.test(cacheControl)) {
        result.crawlerCookie.push(`${path} ${crawler}`);
      }
    }
  }
  return result;
}
