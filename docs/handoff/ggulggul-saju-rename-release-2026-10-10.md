---
status: active
updated: 2026-10-10
next: 운영 승격 1회(사용자 직접 실행 또는 권한 허용) → 운영 검증(6~7단계) → 배포 기록(productionReleasedSha·At)·status done
---

> 2026-10-10 진행: 1~5단계 완료. `d9769658c` push, 스테이징 검증 통과(결과는 개명 문서 "배포 기록").
> 6단계 운영 승격은 Claude Code 자동 권한 검사가 `gh workflow run … -f mode=production`을 거부해 실행하지 않았다.

# 꿀꿀 사주 개명 — 배포 인수인계 (2026-10-10)

코드 수정은 모두 로컬 main에 커밋했다. **아직 push하지 않았다.** 남은 일은 배포와 검증, 보고다.
개명 내용·옛 이름 유지 위치·GSC/네이버 수동 작업은 [개명 문서](../seo/2026-10-10-ggulggul-saju-rename.md)가 정본이다.

## 커밋 (origin/main 위에 8개, 미push)

| 커밋 | 내용 |
|---|---|
| 334ab4e5d | 사이트명 신호(WebSite.name·og:site_name·application-name·manifest)·홈 메타 |
| 16e912048 | 한국어 대표 페이지 title·접미사 |
| 1b4ef1822 | `/kkul-kkul-unse/` 개명 안내 페이지 |
| c5af77b60 | 화면 표시 문구(81개 파일) |
| c452d60dd | OG 카드 재렌더, `?v=42dedf5c85` → `aa88d371b4` |
| 0013ed4e3 | Android 앱 표시명(스토어 제출 없음) |
| a687b9960 | 문서·SEO_STATE.json·개명 기록 |
| (이 문서) | 배포 인수인계 |

origin/main에는 다른 세션의 `d07f1d50d`(ops-hq만 수정)가 먼저 올라가 있다. 겹치는 파일은 없다.

## 사용자 결정 (재확인하지 말 것)

- 스테이징 검증을 통과하면 운영 승격을 **1회** 실행한다: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`
- og:site_name·WebSite.name은 전 로케일 "꿀꿀 사주". 외국어 화면 제목·UI는 Code Destiny 유지.
- 이름을 다시 제안하지 않는다. GSC·네이버는 접근 불가이므로 수동 절차만 문서에 남긴다(이미 작성됨).

## 남은 순서

1. `git pull --rebase origin main` (force push 금지)
2. `npm run check:pre-push`
3. `git push origin main` → 스테이징 자동 배포
4. `npm run verify:staging -- --sha=<HEAD SHA>`
5. 아래 probe를 스테이징에 실행: `node probe.mjs https://staging.code-destiny.com` → "all name signals ok"
   - `/records/`·`/yeongnyangi/library/`가 200인지 확인한다. **200이 아니면** `app/kkul-kkul-unse/page.js` FAQ 1번 답의 "로그인 계정·구매 내역·저장된 결과(나의 기록 보관함/영냥이 상담 기록)를 그대로 이용" 문장을 빼고, 개명 문서 40~45행 설명도 맞춘 뒤 다시 커밋한다.
   - OG 이미지: `curl -sI "https://staging.code-destiny.com/og/code-destiny-og-vvip.png?v=aa88d371b4"` → `content-type: image/png`
   - 390px 모바일 스크린샷(Playwright): `/ggulggul/` 헤더, `/kkul-kkul-unse/`, `/records/`에서 이름 잘림 여부
6. 통과하면 운영 승격 1회 실행 → 워크플로 성공·IndexNow 단계 로그 확인(`gh run view <id> --log | grep -i indexnow`)
7. 운영 검증: `node probe.mjs https://code-destiny.com` 와 `node probe.mjs https://code-destiny.com "?cdcb=1"` 결과가 같아야 한다(엣지 캐시 혼입 없음). `https://code-destiny.com/sitemap.xml`에서 바뀐 URL의 lastmod 확인.
8. main CI는 한 번만 확인한다(`gh run list --branch main --limit 3`). sleep 루프 금지.
9. 기록: 개명 문서의 "배포 기록" 섹션과 상태 표, `docs/seo/SEO_STATE.json`의 `rename20261010.stagingVerifiedSha`·`productionReleasedSha`·`productionReleasedAt`을 채워 커밋·push. 이 핸드오프의 status를 `done`으로.
10. 최종 보고(한국어): 상태를 따로 적는다 — 코드 수정 / 스테이징 검증 / 운영 배포 / IndexNow 제출 / GSC·네이버 재수집 요청(미실행, 수동) / 검색 반영(미확인). 옛 이름을 의도적으로 남긴 곳과 이유는 개명 문서 표를 그대로 옮긴다.

## 주의

- **로컬 테스트 실패 3건은 환경 오염이다.** `cd:* 이벤트`, `og:site_name`, `application-name` 테스트가 추적되지 않는 폴더(`.claude/`, `.codex-worktrees/`, `.delivery-worktrees/`, `build-cache/`, `dist/`, `out/`, `output/`)의 옛 HTML을 읽어 실패한다. 실패 경로가 모두 이 폴더인지 확인하면 된다. CI에서는 통과해야 한다.
- `npm run og:cache-bust`를 쓰지 않는다. 정규식이 `index.html`의 `?v=build-…` 토큰을 깨뜨린다(토큰은 이미 수동 교체 완료).
- `node scripts/i18n-extract-ko.mjs`를 돌리지 않는다(대량 변경). ko 문자열은 직접 고친다.
- `app/insights/methodology-articles.js`의 "꿀꿀운세는 23시 출생을…" FAQ는 검수 해시로 고정된 원고라 일부러 남겼다. 해시만 바꾸지 않는다.
- 다른 세션의 미추적 파일 `.claude/skills/fire-your-seo-agency/`, `docs/handoff/destiny-flower-dawn-garden-2026-10-10.md`는 커밋하지 않는다.
- 실결제·실 LLM·운영 DB 쓰기 금지. 외부 SNS 발행·스토어 제출·PG 가맹점명 변경은 범위 밖.

## 운영 기준값 (배포 전 실측)

모든 페이지 og:site_name·WebSite.name이 "꿀꿀운세", 루트 `/`는 `/ggulggul/`로 301, `/yeongnyangi/library/`는 og:site_name 없음(기존 상태, 문제로 세지 않음).

## probe.mjs

임시 폴더에 저장해 쓰고, 저장소에 커밋하지 않는다.

```js
// usage: node probe.mjs <origin> [query]  — 초기 HTML 의 이름 신호를 파싱한다.
const origin = process.argv[2];
const q = process.argv[3] || '';
const paths = ['/ggulggul/', '/kkul-kkul-unse/', '/yeongnyangi/', '/saju/basic/', '/manse/', '/saju/compatibility/', '/ziwei/', '/sukuyo/', '/tarot/', '/en/', '/ja/', '/zh/', '/zh-tw/', '/records/', '/yeongnyangi/library/'];
const pick = (re, s) => (re.exec(s) || [])[1] ?? '-';
let bad = 0;
for (const p of paths) {
  const res = await fetch(origin + p + q, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 rename-probe' } });
  const html = await res.text();
  const title = pick(/<title[^>]*>([^<]*)<\/title>/, html);
  const site = pick(/<meta\s+property="og:site_name"\s+content="([^"]*)"/, html);
  const canon = pick(/<link\s+rel="canonical"\s+href="([^"]*)"/, html);
  const ogi = pick(/<meta\s+property="og:image"\s+content="([^"]*)"/, html);
  const desc = pick(/<meta\s+name="description"\s+content="([^"]*)"/, html);
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const sites = [];
  for (const b of blocks) {
    try {
      const walk = (n) => { if (Array.isArray(n)) return n.forEach(walk); if (n && typeof n === 'object') { if (n['@type'] === 'WebSite') sites.push(`${n['@id'] || ''}=${n.name}`); Object.values(n).forEach(walk); } };
      walk(JSON.parse(b));
    } catch { sites.push('PARSE_ERR'); }
  }
  const uniq = [...new Set(sites)];
  const ok = res.status === 200 && site === '꿀꿀 사주' && uniq.length === 1 && uniq[0].endsWith('=꿀꿀 사주');
  if (!ok && !p.startsWith('/records') && !p.includes('library')) bad++;
  console.log(`${res.status} ${p}\n  title: ${title}\n  desc: ${desc.slice(0, 90)}\n  site_name: ${site} | WebSite: ${uniq.join(', ') || '-'}\n  canonical: ${canon}\n  og:image: ${ogi}`);
}
const root = await fetch(origin + '/' + q, { redirect: 'manual' });
console.log(`root ${root.status} -> ${root.headers.get('location')}`);
console.log(bad ? `PROBLEMS: ${bad}` : 'all name signals ok');
```
