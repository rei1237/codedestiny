---
status: active
updated: 2026-11-02
next: "origin/main에서 scripts/create-safe-worktree.ps1로 새 워크트리를 만들고, superpowers:writing-plans로 그룹 A(검사기 신뢰성)부터 후속 정리 계획을 쓴다"
---

# SEO 묶음 ① 후속 정리 (미룬 사소한 항목 최적화)

## 왜

SEO 재구축 묶음 ①(V0 검사 도구 `verify-dist`·A2 메타/JSON-LD/robots·D1 날짜 계약)은 2026-11-02에 main으로 push됐다. 운영 배포는 아직이다.
태스크별 검토와 최종 Opus 검토에서 "머지 후 처리 가능"으로 미룬 사소한 항목이 약 45건 남았다. 사용자는 이것을 다른 세션에서 최적화하라고 요청했다(2026-11-02).
본 재구축(묶음 ②~⑤)은 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`가 따로 맡는다. 이 문서는 그 흐름을 막지 않는 정리 작업만 다룬다.

## 첫 행동

1. 루트 체크아웃 `D:\Development\code-destiny`는 다른 세션이 쓰는 중이다. `git fetch origin` 후 `scripts/create-safe-worktree.ps1`로 origin/main 기준 새 워크트리를 만든다.
2. 미룬 항목의 전체 원장은 `D:\Development\seo-audit\code-destiny-20261101\bundle-1\sdd-ledger.md`다(`minor (deferred)` 줄). 이 문서의 그룹은 그 줄들을 묶은 것이다. 원장 줄 번호를 같이 적었다.
3. 설계 정본 `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`의 '작업 경계'와 묶음 ① 계획 `docs/superpowers/plans/2026-11-01-seo-bundle-1-v0-a2-d1.md`를 읽는다.
4. superpowers:writing-plans로 그룹 A부터 계획을 쓰고, 그룹마다 TDD → check:fast → 커밋한다. 실행 방식은 사용자에게 묻는다.

## 지금 상태

- 묶음 ① main push 완료(인수인계 문서 `2026-11-01-seo-architecture-rebuild.md` '지금 상태'에 SHA). 운영 배포는 사용자 승인 대기.
- 아직 손댄 후속 항목 없음.

## 작업 규칙

- push는 사용자가 요청할 때만 한다. 운영 배포는 별도 승인이 필요하다.
- `verify-dist`의 실패 규칙을 새로 만들거나 경고 → 실패로 올리려면, 그 전에 실제 `npm run build:cf`의 dist에서 0건인지 확인한다. 00:10 KST `fortune-daily-publish`를 막으면 안 된다.
- `scripts/seo/verify-dist.mjs`·`scripts/seo/health-policy.mjs`는 본 재구축 세션(묶음 ②·③)도 고친다. 작은 커밋으로 자주 rebase하고, 규칙 표(`RULES`)를 크게 재배치하지 않는다.
- 결제·패스·인증·DB·운세 계산 로직, 메인 디자인, `.github/workflows/*`는 건드리지 않는다.
- 새 FAQPage·HowTo나 가짜 구조화 데이터는 만들지 않는다.
- `build:cf`가 다시 만드는 rss 4개(`rss.xml`, `insights/rss.xml`, `public/rss.xml`, `public/insights/rss.xml`)는 `git checkout --`으로 되돌리고 커밋하지 않는다.
- check:fast에서 크로미움 미설치로 실패하는 Playwright 2건(yeongnyangi daily tarot, hat story)은 환경 기준선이다. 그 밖의 실패는 막는다. `npx playwright install`은 실행하지 않는다.

## 단계

### 그룹 A — 검사기 신뢰성 (먼저)

- [ ] A1 `RULES` 등급 고정 테스트: 규칙마다 fail/warn을 단언한다. `__tests__/ui/sitemap-canonical.test.mjs:368`의 항상 참인 단언(`assert 'fail'`)을 실제 값 비교로 바꾼다. organization-name 동률 판정과 "같은 @id·같은 타입 두 페이지 = 0건" 테스트도 추가한다(원장 81·111·124).
- [ ] A2 internal-404에 워커 동적 경로(`/api/*` 등 `public/_worker.js`가 처리하는 경로) 허용 목록을 둔다. 지금은 잠재적 거짓 실패다(원장 120).
- [ ] A3 `_redirects` 정확 일치 원본에도 슬래시 제거가 적용된다(`verify-dist.mjs` ~:430). Pages 동작을 확인하고 맞춘다. html-only 경고 묶음 테스트도 추가하고, href 불일치가 두 번 세어지는지 확인한다(원장 46·47).
- [ ] A4 `dist/_redirects`가 없으면 스택 트레이스 대신 규칙 실패로 보고한다. 테스트 픽스처의 mkdtemp 임시 폴더를 정리한다(원장 49·50).
- [ ] A5 엣지 탐침(`distAssets`)의 308/404/경로 이탈/`%` 규칙 테스트를 추가한다. Pages 재현이 다른 점(`/x.html→/x`, `/dir/index.html→/dir/`, `_headers` 미적용)을 코드 주석에 적는다. CONTENT_TYPES에 woff2·webmanifest·gif·avif·mp4를 추가한다(원장 33·34·35).
- [ ] A6 `redirectSources`가 저장소 `public/_worker.js` 대신 `dist/_worker.js`를 읽게 한다. 두 파일이 바이트 동일하다는 제약을 먼저 확인한다(원장 48).

### 그룹 B — robots·llms

- [ ] B1 robots 파서 2개(`scripts/lib/robots-groups.mjs`·`health-policy.robotsAllows`)를 하나로 합친다. 판정 표본 생성 중복(`verify-dist.mjs` ~:272-291 ↔ `robots-policy.test.mjs`)도 하나로 묶는다. 테스트 UA 표본은 픽스처 `User-agent`에서 뽑아 인용·학습 크롤러를 모두 포함한다(원장 72·73·75).
- [ ] B2 `scripts/generate-llms-txt.mjs` ~:64-70: sitemap이 비었거나 크기가 0이면 throw한다. `--check`는 사라진 경로가 있으면 실패한다(원장 90·121).
- [ ] B3 entity-registry에 남은 noindex 경로 프로필(`/fusion-fortune` "published", `/fortune/date`)을 정리한다. 지우기 전에 `git grep`으로 쓰는 곳을 확인한다(원장 93).
- [ ] B4 `fortune-only-exposure.test.mjs:9` 일시중지 리터럴에 `noindexPathPrefixes` 출처 주석을 단다. 테스트 정규식 `[^\s)]*`가 URL 뒤 구두점까지 먹는 문제도 고친다(원장 91·92).

### 그룹 C — 메타·구조화 데이터

- [ ] C1 `/fortune/` 정적 셸(`scripts/build-fortune-hub-shell.mjs` ~:177)은 `#website`를 참조하지만 WebSite 노드가 없다. 노드를 넣거나 참조를 뺀다(원장 119).
- [ ] C2 `lib/seo/page-open-graph.ts`가 `app/layout.js` openGraph 기본값을 복제한다. 공유 기본값 하나로 합치고 `pageOpenGraph` 단위 테스트를 추가한다. 쓰이지 않는 `ROOT_SEO.ogTitle/ogDescription`도 정리한다(원장 60·64).
- [ ] C3 자체 openGraph 페이지에서 빠진 og:site_name(7)·og:locale(13)·og:type(3)과 twitter 태그 없는 7쪽(about·contact·faq·privacy·refund-policy·terms·운세 1)을 채운다. og:url 누락을 검사할 규칙(og-url-missing)이 필요한지는 실제 dist 0건을 확인한 뒤 판단한다(원장 59·63·67).
- [ ] C4 `app/saju/monthly/[month]/page.tsx`에 남은 JSON-LD 출력을 `serializeJsonLd`로 바꾼다. famous-saju 작성자 폴백 `{Organization, name}`에 `@id`를 붙인다(원장 82·83).
- [ ] C5 jsonld-id-type이 중첩 노드도 센다. 지금 dist에는 해당이 없으니 fail 유지 여부를 판단하고, 판단을 주석으로 남긴다(원장 80).
- [ ] C6 날짜만 있는 원본을 `toISOString()`으로 내보내는 곳 3곳을 날짜 문자열 또는 `+09:00`로 바꾼다: `app/insights/famous-saju/[slug]/page.tsx:787,789`, `app/components/SeoJsonLd.jsx:12`, `lib/generate-page-metadata.ts:252-253`. 바꾸면 jsonld-dates를 다시 시각 단위로 좁힐 수 있는지 검토한다.
- [ ] C7 주석 정리: `app/layout.js` alternates 블록 밑 새 주석 위치, tarot/numerology 리터럴의 adsense 사유, `seo-audit.mjs:43` 낡은 주석(원장 24·65·66).

### 그룹 D — 날짜·lastmod 신호 (설계 판단 필요, 사용자 확인 후)

- [ ] D1 lastmod 서명을 import한 모듈 전체 해시가 아니라 렌더 결과나 경로 프로필 기준으로 바꾼다. 공유 모듈 한 줄 수정에 322쪽 lastmod가 움직이는 문제다(원장 88·124). 사이트맵 diff와 `verify:sitemap-drift`로 검증한다.
- [ ] D2 today/weekly/monthly 운세 dateModified가 배포할 때마다 빌드 시각으로 오른다. 내용이 바뀔 때만 오르게 할지 판단한다(원장 122).
- [ ] D3 fortune-date-contract의 "대상일 또는 전날" 허용을 tomorrow·build<target일 때로 좁힌다. freshness 검사가 datePublished 대신 `<time datetime>` 표식을 읽게 해서 독립성을 높인다(원장 109·110).
- [ ] D4 기존 문제: weekly/monthly 기대값이 검사기 시계를 쓴다. 일요일·월말 23:59 렌더를 자정 뒤에 검사하면 실패한다(원장 106·113).
- [ ] D5 `parseJsonLdDate`가 확장형 날짜에 기본형 오프셋(±hhmm)을 받는 의도를 주석으로 적는다(원장 112).

### 그룹 E — 헤더·기타

- [ ] E1 `_headers` 주석은 "뒤 규칙이 이긴다"고 하지만 Cloudflare는 중복 값을 쉼표로 합친다. 주석을 고친다. 새 테스트가 `CDN-Cache-Control`도 보게 하고, 블록 파서가 중복 패턴의 마지막 것만 남기는 문제를 고친다(원장 97·101·123).
- [ ] E2 `/audio/*`·`/DestinyCafe/*` 넓은 splat을 좁힌다(지금은 HTML 없음)(원장 102).
- [ ] E3 공유 decodeHtml의 특이 동작(`&gt;`→공백, `&amp;lt;` 이중 해제)을 고치고, 대문자 태그·속성 순서·작은따옴표 canonical 테스트를 추가한다. seo-audit "JSON-LD @type 없음" 판정 완화를 복원할지 판단하고, `data-href=` 오인식과 `<svg>` 안 `<title>` 문제도 본다(원장 22·23·25·26).

- [ ] 끝: 이 문서 `status: done`, 워크트리 배수(junction 해제 → `git worktree remove --force` → `git branch -d`)

## 함정

1. `npm run build:cf`가 끝날 때 postbuild 안에서 verify-dist가 돈다. 규칙을 바꾸면 반드시 실제 빌드로 한 번 확인한다. 픽스처 테스트만으로는 1,037쪽 실데이터의 거짓 실패를 못 잡는다.
2. 빌드 로그의 "Skipped … ECONNREFUSED 127.0.0.1:3187"(천문력 fetch)은 원래 있던 잡음이다.
3. 페이지 소스나 공유 모듈을 고치면 `config/sitemap-lastmod.json`과 sitemap XML이 바뀐다. `verify:sitemap-drift`가 요구하는 대로 재생성본을 같은 커밋에 넣는다.
4. 겹치는 기존 검사는 지우지 않는다. main CI에서 10회 같은 판정을 낸 뒤 별도 커밋으로 지운다(CLAUDE.md:54).
5. Git Bash는 호출마다 cwd가 초기화된다. 명령 앞에 워크트리 `cd`를 붙인다.

## 검증

```
node --test scripts/seo/*.test.mjs
node --test __tests__/ui/sitemap-canonical.test.mjs
npm run build:cf            # postbuild의 [verify-dist] 표에서 실패 0 확인
npm run verify:fortune-freshness
npm run verify:handoff-contract
npm run check:fast
```

## 근거

- 미룬 항목 원장: `D:\Development\seo-audit\code-destiny-20261101\bundle-1\sdd-ledger.md`
- 묶음 ① 승인 패킷·검사 결과 전후: `D:\Development\seo-audit\code-destiny-20261101\bundle-1\`
- 원 대화: `C:\Users\user\.claude\projects\C--Users-user\f5e38547-2f74-4110-bc7d-b421424452c4.jsonl`

## 재개

- 새 세션은 `C:\Users\user`에서 열고 `/handoff docs/handoff/2026-11-02-seo-bundle-1-followups.md`로 시작한다. 이 문서는 origin/main에 있다.
- 다음 행동은 frontmatter `next`다.
