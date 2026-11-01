# SEO 묶음 ① 후속 — 그룹 A(검사기 신뢰성) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `scripts/seo/verify-dist.mjs`의 거짓 실패·거짓 통과 여지를 줄이고, 규칙 등급과 경계 동작을 테스트로 고정한다.

**Architecture:** 규칙 표 `RULES`와 판정 함수는 그대로 두고, 리디렉션 출발점 판정(`isRedirectSource`)·출발점 표 읽기(`redirectSources`)·엣지 흉내(`distAssets`)만 국소 수정한다. 테스트는 기존 `__tests__/ui/sitemap-canonical.test.mjs`의 임시 dist 픽스처 방식에 붙인다.

**Tech Stack:** Node ESM, `node:test`, 임시 dist 픽스처(mkdtemp).

**Spec:** `docs/handoff/2026-11-02-seo-bundle-1-followups.md` 그룹 A, 원장 `D:\Development\seo-audit\code-destiny-20261101\bundle-1\sdd-ledger.md` 33·34·35·46·47·48·49·50·81·111·120·124줄.

## Global Constraints

- 새 실패 규칙을 만들거나 warn→fail로 올리기 전에 실제 `npm run build:cf` dist에서 0건을 확인한다(00:10 KST fortune-daily-publish 보호).
- `RULES` 표를 재배치하지 않는다(묶음 ②·③ 세션과 충돌 방지). 작은 커밋.
- `verify-sitemap-canonical.mjs`의 기존 검사는 지우지 않는다. `redirectSources`의 반환 모양(`{ exact, prefixes }`)은 유지하고 필드만 더한다.
- 결제·인증·DB·`.github/workflows/*` 손대지 않음. build:cf가 다시 만드는 rss 4개는 커밋하지 않는다.

## Review Focus

1. 링크가 `/old/`인데 `_redirects`에는 `/old`만 있는 경우 — Pages는 글자 그대로 맞추므로 404로 세야 한다(Task 2 테스트).
2. 워커 표(CONSOLIDATED_PAGE_REDIRECTS) 출발점의 `/x/`·`/x` 두 꼴 — 워커가 슬래시를 떼고 찾으므로 둘 다 출발점(Task 2 테스트).
3. dist에 `_worker.js`가 없는 픽스처 — 워커 리디렉션도 없다고 본다(throw 아님, Task 3 테스트).
4. `/api/…`·`/rss.xml` 같은 워커 동적 경로 링크 — 404가 아니다. `/apix/`는 404(Task 2 테스트).
5. `dist/_redirects` 없음 — 스택 트레이스가 아니라 `sitemap-page`·`internal-404` 실패 1줄(Task 3 테스트).

---

### Task 1: 등급 고정·정체성 경계 테스트 (A1)

**Files:**
- Modify: `__tests__/ui/sitemap-canonical.test.mjs` (370줄 항상 참 단언 제거, 새 테스트 3개, `writeDist` 임시 폴더 정리)

- [ ] **Step 1:** 테스트 `RULES grades are pinned rule by rule` — `assert.deepEqual(RULES, {...})`로 현재 18개 규칙 등급 전체를 그대로 적는다. 370줄 `=== 'fail' || === 'warn'` 단언은 지운다.
- [ ] **Step 2:** 테스트 `organization-name ties pick the first-seen name as majority and report the other` — 두 쪽이 각각 다른 name 1번씩 → counts 1, 상세에 `≠ 최다` 포함.
- [ ] **Step 3:** 테스트 `the same @id with the same @type on two pages is not a jsonld-id-type finding` — counts 0.
- [ ] **Step 4:** `writeDist`가 만든 폴더를 모아 `test.after`에서 `rmSync(dir, { recursive: true, force: true })`(A4의 mkdtemp 정리를 여기서 함께).
- [ ] **Step 5:** `node --test __tests__/ui/sitemap-canonical.test.mjs` PASS → 커밋 `test(seo): verify-dist 규칙 등급을 고정하고 정체성 경계를 테스트한다`

### Task 2: 리디렉션 출발점·워커 동적 경로 (A2·A3)

**Files:**
- Modify: `scripts/verify-sitemap-canonical.mjs` `redirectSources` — `worker: Set`(CONSOLIDATED 키 + WORKER_REDIRECT_PATHS) 필드 추가, `exact`는 지금처럼 합집합 유지
- Modify: `scripts/seo/verify-dist.mjs` `isRedirectSource` — 슬래시 제거 일치는 `worker` 집합에만. 새 `isWorkerDynamic(pathname, workerSource)` 또는 상수 `WORKER_DYNAMIC` — `/api`·`/api/*`·`DYNAMIC_FEED_PATHS`(dist 워커 소스에서 읽음)를 internal-404에서 존재로 본다
- Test: `__tests__/ui/sitemap-canonical.test.mjs`

**Interfaces:** Produces `redirectSources(dist) → { exact: Set<string>, prefixes: string[], worker: Set<string> }`

- [ ] **Step 1:** 기존 internal-404 테스트에서 `/old/`(→`_redirects`에 `/old`만)를 404 기대로 바꾸고, `/api/fortune`·`/api`·`/rss.xml` 링크는 404 아님, `/apix/`는 404 단언 추가. 실패 확인.
- [ ] **Step 2:** 구현. `DYNAMIC_FEED_PATHS`는 `const DYNAMIC_FEED_PATHS = new Set([...])` 정규식으로 읽고, 못 찾으면 빈 집합(링크가 있으면 404로 세지므로 fail-closed).
- [ ] **Step 3:** 테스트 PASS → 실제 build:cf로 internal-404·sitemap-page 0건 확인 → 커밋.

### Task 3: dist 기준 출발점·누락 파일 보고 (A4·A6)

**Files:**
- Modify: `scripts/verify-sitemap-canonical.mjs` `redirectSources` — 워커 표를 `join(dist, "_worker.js")`에서 읽는다. 파일이 없으면 워커 출발점 없음, 파일은 있는데 표가 없으면 지금처럼 throw
- Modify: `scripts/seo/verify-dist.mjs` `inspectDist` — `dist/_redirects` 없으면 원하는 규칙(`sitemap-page`·`internal-404`)에 `"<dist>/_redirects 없음"` 1줄을 넣고 그 규칙은 돌리지 않는다
- Test: 같은 파일

- [ ] **Step 1:** 먼저 실제 build:cf 뒤 `cmp dist/_worker.js public/_worker.js`로 바이트 동일 확인(다르면 Task 3 멈추고 보고).
- [ ] **Step 2:** 테스트: `_redirects` 없는 픽스처 → failures에 `_redirects 없음`, throw 없음. 워커 표 있는 `_worker.js` 픽스처의 출발점 `/moved` → `/moved/` 링크 404 아님.
- [ ] **Step 3:** 구현·PASS·커밋.

### Task 4: 엣지 흉내 테스트·주석·CONTENT_TYPES (A5) + html-only 테스트(A3 후반)

**Files:**
- Modify: `scripts/seo/edge-probe.mjs` — CONTENT_TYPES에 `.woff2 font/woff2`, `.webmanifest application/manifest+json`, `.gif image/gif`, `.avif image/avif`, `.mp4 video/mp4`; `distAssets` 위 주석에 Pages와 다른 점(`/x.html`→`/x` 308 미재현, `/dir/index.html` 200, `_redirects`·`_headers` 미적용) 명시
- Test: 같은 테스트 파일

- [ ] **Step 1:** 테스트 `distAssets serves 200/308/404, refuses traversal and bad percent, and labels new content types` — 기존 엣지 테스트 속 단언을 분리·확장(woff2 content-type 단언).
- [ ] **Step 2:** 테스트 `hreflang html-only` — HTML에만 있는 언어 쌍 1건 → `html-only` 1건. href만 다른 경우(같은 언어 코드)는 `code-sitemap-only`가 아니라 html-only 1건 + 사이트맵 쪽 코드 1건으로 두 번 세는지 확인하고, 두 번이면 판정 결과를 계획 결과에 기록(수정은 원장 47 재평가 후).
- [ ] **Step 3:** PASS·커밋.

### 마감

- [ ] `node --test scripts/seo/*.test.mjs __tests__/ui/sitemap-canonical.test.mjs`, `npm run build:cf`(verify-dist 실패 0), `npm run check:fast` → 인수인계 문서에 SHA 기록.
