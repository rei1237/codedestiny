/**
 * GET /tadagochi
 * tadagochi.html SPA를 Next.js 앱 라우트로 직접 서빙.
 * - next.config.mjs 리다이렉트(/tadagochi→/tadagochi.html) + Cloudflare Pages Clean URLs가
 *   충돌(무한 루프)하는 이슈를 완전히 제거.
 * - force-static: next build 시 readFileSync가 한 번 실행되어 정적 응답으로 번들링됨.
 *   Cloudflare Workers 런타임에서는 fs 접근 없이 캐시된 HTML이 바로 서빙됨.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export function GET() {
  const html = readFileSync(
    join(process.cwd(), 'public', 'tadagochi.html'),
    'utf-8'
  );
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
