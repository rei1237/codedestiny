#!/usr/bin/env node
// Read-only inventory; output is JSON on stdout. No imports execute application code.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd();
const edgeSource = fs.readFileSync(path.join(root, 'public/_worker.js'), 'utf8');
const consolidated = JSON.parse(edgeSource.match(/const CONSOLIDATED_PAGE_REDIRECTS = (\{[\s\S]*?\});/)[1]);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
const untracked = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
const excluded = /^(?:\.claude\/worktrees|\.codex-worktrees|\.delivery-worktrees|\.cleanup|reports)\//;
const sources = tracked.filter(f => fs.existsSync(path.join(root, f)) && !excluded.test(f) && /\.(?:[cm]?js|jsx|tsx?|html|css|json|mjs)$/.test(f) && /^(?:app|components|js|lib|scripts|config|content|src)\/|^index\.html$/.test(f));
const text = sources.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
function decision(route) {
  if (Object.hasOwn(consolidated, route.replace(/\/$/, ''))) return ['통합', consolidated[route.replace(/\/$/, '')], '중복 소개·별칭 소스 삭제, 질의 문자열을 보존한 단일 301'];
  if (['/premium/', '/premium-reports/'].includes(route)) return ['통합', '/consultations/', '상호 안내 CTA 루프를 기존 상담 선택 화면으로 통합'];
  if (route.startsWith('/features/')) return ['재설계', null, '직접 시작과 선택적 상세 안내를 분리'];
  if (/^\/(?:admin|auth|account|checkout|records|gift|login|signup|share|points)(?:\/|$)|\/(?:result|library|report|share)\//.test(route)) return ['유지', null, '운영·계정·결제·저장 결과·공유 계약 보호'];
  if (/debug|asset-demo|dev-status/.test(route)) return ['유지', null, '개발 검수 도구; NODE_ENV production에서 notFound 또는 렌더 차단 확인'];
  if (/^\/(?:guides|insights|compare)\//.test(route)) return ['유지', null, '고유 공개 콘텐츠; 유입 미확인, 템플릿 유사성은 삭제 근거 아님'];
  if (/^\[(?:locale)/.test(route.slice(1))) return ['유지', null, '로케일별 서비스·검색 경로 보존'];
  return ['유지', null, '독립 기능·콘텐츠 또는 호환 경로; 참조 없음을 폐지 근거로 사용하지 않음'];
}
const routes = tracked.filter(f => /^app\/.*\/page\.(?:js|jsx|tsx)$|^app\/page\.js$/.test(f)).map(file => {
  const route = '/' + file.replace(/^app\//, '').replace(/(?:^|\/)page\.(?:js|jsx|tsx)$/, '') + (file === 'app/page.js' ? '' : '/');
  const body = fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
  const [action, destination, reason] = decision(route);
  return { route, file, kind: route.includes('[') ? 'dynamic-template' : 'app', action: body ? action : '삭제', destination,
    reason, traffic: '미확인', search: /index:\s*false|noindex:\s*true/.test(body) ? 'source-noindex' : '메타·헤더·사이트맵 교차 확인 필요',
    entrySources: text.filter(([f, s]) => f !== file && s.includes(route.slice(0, -1)) && route !== '/').map(([f]) => f),
    literalTargets: [...new Set([...body.matchAll(/(?:href|ctaHref)\s*[:=]\s*["']([^"']+)["']/g)].map(m => m[1]))] };
});
const redirects = fs.readFileSync(path.join(root, 'public/_redirects'), 'utf8').split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#')).map(line => {
  const [route, destination, status] = line.trim().split(/\s+/);
  return { route, destination, status, action: '유지', reason: '외부 북마크 호환; 대상 변경 시 별도 검증' };
});
const staticPages = tracked.filter(f => f.endsWith('.html') && !f.includes('/')).map(file => ({
  file, action: '유지', reason: '레거시 실행 진입점; HTML 확장자는 미사용 근거가 아님',
  entrySources: text.filter(([f, s]) => f !== file && s.includes(file)).map(([f]) => f),
}));
const mirrorList = new Set((fs.readFileSync(path.join(root, '.ignore'), 'utf8').match(/^\/public\/.+$/gm) || []).map(s => s.slice(1)));
const files = [...tracked.map(file => [file, true]), ...untracked.filter(f => !tracked.includes(f)).map(file => [file, false])].filter(([f]) => !excluded.test(f)).map(([file, isTracked]) => {
  let disposition = '정본', reason = '추적 파일; 삭제는 호출부·빌드·테스트·외부 참조의 개별 입증 필요';
  if (mirrorList.has(file)) { disposition = '필수 생성물'; reason = 'sync:public 미러; 원본과 생성 계약 유지'; }
  else if (!isTracked) { disposition = '보류'; reason = '다른 세션 소유·최종본 여부 미확정; 일괄 삭제 제외'; }
  else if (/^(?:docs\/handoff|docs\/verification|artifacts|marketing|store-assets)\//.test(file)) { disposition = '최종 증빙'; reason = '복구·제작·검증 이력 보존; 중복 입증 전 삭제 금지'; }
  if (isTracked && !fs.existsSync(path.join(root, file))) { disposition = '삭제 또는 이동'; reason = '이번 변경의 Git diff와 대조'; }
  return { file, tracked: isTracked, disposition, reason };
});
const edgeRedirects = Object.entries(consolidated).map(([route, destination]) => ({ route: route + '/', destination, status: '301', action: '통합', reason: decision(route + '/')[2] }));
// Enumerate published URLs separately from dynamic source templates. A sitemap
// entry is evidence of publication intent, never evidence of Google indexing.
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const publishedUrls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => {
  const url = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
  const pathname = new URL(url).pathname;
  const template = routes.find(r => {
    const pattern = r.route.split('/').map(segment => segment.startsWith('[') ? '[^/]+' : segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/');
    return new RegExp('^' + pattern + '$').test(pathname);
  });
  return { url, source: template?.file || '정적 생성·locale mirror (sitemap generator)', action: '유지', reason: template?.reason || '생성기 관리 공개 콘텐츠', search: '사이트맵 포함; Google 개별 색인·유입 미확인', alternatives: [...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(m => ({ locale: m[1], url: m[2] })) };
});
console.log(JSON.stringify({ version: 2, head: git('rev-parse', 'HEAD').trim(), basis: 'source inventory, not live analytics or visual verification', routes, staticPages, redirects, edgeRedirects, publishedUrls, files }, null, 2));
