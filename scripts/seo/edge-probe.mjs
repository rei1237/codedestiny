// Network-free edge probe: runs the Cloudflare Pages advanced-mode worker (dist/_worker.js) in a
// Node vm in front of an emulation of Pages static serving, so build output alone shows
// trailing-slash 308s, country 302s and crawler geo cookies.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const ORIGIN = 'https://code-destiny.test';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
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
    if ((await visit(worker, assets, path, 'KR', CHROME_UA)).status === 308) result.slash308.push(path);
  }
  if ((await visit(worker, assets, '/', 'US', CHROME_UA)).status === 302) result.country302.push('/ US');
  for (const userAgent of ['Googlebot-InspectionTool', 'Mediapartners-Google']) {
    for (const path of ['/', '/saju/']) {
      const response = await visit(worker, assets, path, 'US', userAgent);
      const cacheControl = response.headers.get('Cache-Control') || '';
      if (/cd_geo/.test(response.headers.get('Set-Cookie') || '') || /private|no-store/i.test(cacheControl)) {
        result.crawlerCookie.push(`${path} ${userAgent}`);
      }
    }
  }
  return result;
}
