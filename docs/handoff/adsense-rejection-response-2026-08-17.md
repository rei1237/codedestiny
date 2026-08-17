# AdSense "가치 없는 콘텐츠" 거절 대응 — 인수인계 (2026-08-17)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 수치는 전부 `out/` 2026-08-17 빌드 실측이다.

## 0. 상황

Google AdSense 가 **"가치 없는 콘텐츠(low value content)"** 로 code-destiny.com 을 **거절**했다.

측정 방법(재현용):
```bash
# getVisibleText(script/style/svg 제거 후 태그 제거, verify-adsense-readiness.mjs:582~619) 로 뽑은
# 텍스트에 8-gram shingle 을 적용해, 전체 페이지의 10% 초과에 등장하는 shingle(=공통 크롬)을
# 제외한 "고유 본문" 길이. scripts/verify-editor-notes.mjs 가 같은 계산을 한다.
node scripts/verify-editor-notes.mjs   # build:cf 뒤에 실행
```

기준선(2026-08-17, 조치 전):

| 지표 | 값 |
|---|---|
| 사이트맵 | 433 |
| 광고 게재 가능 라우트 | 215 |
| 그중 고유 본문 1,500자 미만 | **40** |
| 그중 1,000자 미만 | **16** |
| `/famous-saju/category/*` 4-gram Jaccard 중복도 | **84.4%** |
| `/high-value/*` | 73.7% |
| `/fortune/{period}/{sign}` | 69.4% |

## 1. 착지한 것 — PR 3개

| PR | 범위 | 상태 (2026-08-17 갱신) |
|---|---|---|
| #757 `fix/adsense-thin-route-deindex` | 얇은 카테고리·스텁 22개를 색인·광고에서 제외 | **MERGED** |
| #758 `fix/adsense-trust-page-depth` | `/contact`·`/editorial-policy` 본문 보강 | **MERGED** |
| #759 `feature/adsense-editor-notes` | 편집자 노트 18개 + 발견형 가드 + 가드 배선 | **OPEN** — §4-1 참고 |

머지 순서(#757 → #759)는 지켜졌고 #758 은 독립적으로 들어갔다.

### 결과 (실측)
- 사이트맵 **433 → 411**
- 광고 게재 가능 라우트 **215 → 197**
- `/contact` 903 → **1,536자**, `/editorial-policy` 1,189 → **1,803자**

## 2. 반드시 알아야 할 함정 3가지

### 2-1. 🔴 `noindexPathPrefixes` 는 공유 버튼도 끈다
`lib/seo/siteSeo.ts:384 noindexPathPrefixes` → `isNoindexPath` → `lib/seo.v2.ts:85 isPrivateRoute`
→ `lib/share.v2.ts:36` → `app/components/ShareWidget.tsx:115 if (!share.shareable) return null`.

`/flower/*` 4개는 `FeatureLandingPage.tsx:1054` 가 ShareWidget 을 렌더하는 **유료 기능 랜딩**이라,
접두사 목록에 넣으면 **색인만 끄려다 기능을 지운다.** 그래서 `/flower` 만 페이지 단위
`generatePageMetadata({ noindex: true })` 로 처리했다(`lib/generate-page-metadata.ts` 에 옵션 추가,
`isIndexableRoute` 는 원래부터 2번째 인자를 받고 있었다).

**새 라우트를 noindex 할 때마다 이 질문을 할 것: 이 페이지가 ShareWidget 을 쓰는가?**

### 2-2. 🔴 noindex 목록이 **3벌** 이고 손으로 맞춘다
| 위치 | 개수 | 재현 명령 |
|---|---|---|
| `_headers` X-Robots-Tag | 55 | `grep -c "X-Robots-Tag: noindex" _headers` |
| `scripts/generate-sitemap.mjs:49` | **35** | 배열 파싱 |
| `lib/seo/siteSeo.ts:384` | **57** | 배열 파싱(주석 줄 제외) |

> 🔴 **정정(2026-08-17 재측정)**: 초판에 39·64 로 적혀 있었으나 실제는 35·57 이다.
> `siteSeo.ts` 는 주석 안의 따옴표 문자열까지 세면 59 가 나온다 — 주석을 걷어내고 세야 57 이다.
> 두 목록의 차집합: `siteSeo` 에만 있는 23개는 전부 private/auth/commerce 접두사이고,
> `generate-sitemap` 에만 있는 것은 **`/flower` 하나**다(§2-1 의 ShareWidget 사유로 의도적 제외).

셋이 서로 다르다. 한쪽만 고치면 "사이트맵에 있는데 noindex" 가 되어 GSC 가 「제출된 URL에 noindex」로
잡는다. **같은 커밋에 함께 담을 것.**

`_headers` 는 Cloudflare Pages 상한 **100개** 중 현재 **94개**다(`grep -c "^/" _headers`,
검사기는 `verify-adsense-readiness.mjs:1143 CLOUDFLARE_HEADERS_RULE_LIMIT`).
**여유 6칸뿐**이므로 App Router 라우트는 헤더 대신 metadata `robots` 로 처리하는 게 맞다(비용 0).

### 2-3. 🔴 광고 정책을 함께 끄지 않으면 **배포가 막힌다**
`verify-adsense-readiness.mjs:1355 verifyAdsenseEligibleRouteSitemapAlignment` 가
*"광고 가능 + self-canonical → noindex 금지 + 사이트맵 필수"* 를 단언한다.
noindex 만 걸고 `app/components/adsense-route-policy.js` 를 그대로 두면 postbuild 에서 터진다.

## 3. 편집자 노트 (#759) 구조

- 컴포넌트: `app/components/EditorNote.jsx` — 서버 컴포넌트. 루트에 `data-cd-editor-note` 마커.
  🔴 `"use client"` 금지 — `getVisibleText` 가 서버 렌더 텍스트만 세므로 클라이언트로 내리면 분량 계산에서 사라진다.
- 데이터: `app/_content/editor-notes.js` — 라우트 경로 키. **사람이 직접 쓴다.**
- 대상 18개: `/high-value/<slug>` 12 + `/insights/{dream,fusion,sukuyo-basics,ziwei-basics}` 4 + `/faq` + `/methodology`
- 가드: `scripts/verify-editor-notes.mjs` (`npm run verify:editor-notes`)

### 🔴 `/fortune/{period}/{sign}` 96개를 제외한 이유 (다시 파지 말 것)
`lib/fortune/sign-profiles.ts` 의 산문이 **sign 단위**라 today/tomorrow/weekly/monthly 4개 URL 에
그대로 복제된다. 이 페이지들이 1,488자로 측정되는 이유가 바로 그 중복 제거 때문이다.
**sign 단위 노트를 붙이면 노트도 똑같이 4개 URL 에 복제되어 고유 본문이 1자도 오르지 않는다.**
실제로 올리려면 (기간 × sign) 96개를 손으로 써야 한다. 가드의 `DECLARED_EXCEPTIONS` 에 사유가 적혀 있다.

### 가드 설계에서 놓치기 쉬운 점
1. **노트를 제거한 뒤에 분량을 잰다.** 포함해서 재면 노트가 붙는 순간 임계값을 넘겨 가드가 영원히 침묵한다.
2. **코퍼스가 다르면 수치가 다르다.** 이 가드는 **광고 가능 라우트 197개**로 코퍼스를 잡는다.
   §0 의 기준선은 **사이트맵 433개** 코퍼스라 절대값을 직접 비교하면 안 된다
   (shingle 의 document frequency 임계가 `총 개수 × 0.1` 이라 코퍼스가 줄면 고유 판정이 후해진다).
3. **하한은 한국어 글자 수 기준이다.** 처음에 영어 감각으로 lede 120자·팁 60자를 잡았더니
   실제로 충실한 2문장 lede(101~119자)가 전부 걸렸다. 한국어는 글자당 정보 밀도가 영어의 두 배쯤이라
   90자·50자로 내렸다. **다시 올리지 말 것** — 근거는 상수 주석에 있다.

### 이 가드가 실제로 잡은 것 (작성 중 실측)
`/high-value/saju-beginner` 로 키를 잘못 적었다. 그건 **카테고리 슬러그**이고 실제 페이지는
`complete-guide-to-saju` 다. 손으로 적은 목록이었다면 노트가 렌더되지 않은 채
"12개 완료" 로 보고됐을 것이다. 발견형 가드가 아니면 못 잡는 종류의 실수다.

## 4. 남은 일

### 4-1. ✅ 해결됨 (2026-08-17, 사용자 승인) — PR CI 스텝으로 배선

초판은 "수동 실행 전용이라 놔뒀다"고만 적었는데, **그게 #759 를 CI 빨간불로 만들고 있었다.**
`scripts/verify-guard-wiring.mjs` 는 fail-closed 라 *"아무 게이트도 안 부르는데 사유 선언도 없는
검증기"* 를 실패시킨다 — 배선은 선택이 아니라 **머지의 전제조건**이었다:

```
[verify-guard-wiring] FAIL
  아무 게이트도 부르지 않는데 사유 선언도 없는 검증기 1개: verify:editor-notes
```

**조치**: `.github/workflows/pr-ci.yml` 의 `Build Pages and Worker` 잡, `verify:seo-heading-integrity`
바로 뒤에 `npm run verify:editor-notes` 스텝 추가.

- **왜 `run-postbuild.mjs` 가 아니라 PR CI 인가** — ① `verify:seo-heading-integrity` 가 정확히 같은
  성격(build:cf 뒤 `out/` 을 읽는 SEO 가드)으로 이미 그 자리에 있다. 새 패턴을 만들지 않는다.
  ② `run-postbuild.mjs` 는 `optional` 개념이 없어(steps 가 평문 문자열 배열, 비-0이면 `process.exit`)
  넣는 순간 **릴리스 배포까지 하드 차단**된다. 이 가드는 코퍼스 크기에 결합돼 있어(아래) 무관한
  PR 에서도 빨간불이 날 수 있는데, 그 대가를 릴리스가 치르게 할 이유가 없다.
- 🔴 **코퍼스 결합 주의** — `uniqueBodyLength`(`scripts/verify-editor-notes.mjs:184-192`)가
  `총 광고 라우트 수 × 0.1` 을 boilerplate 임계로 쓴다. **다른 라우트를 광고 목록에서 빼기만 해도**
  무관한 라우트의 측정 분량이 흔들려 실패할 수 있다. 실패가 diff 와 무관해 보이면 이걸 먼저 의심할 것.
- 🔴 **`fast` 티어 PR 에서는 안 돈다** (`runs_build != 'true'` → 빌드 잡 스텝 스킵). 문구·CSS·
  `index.html`·docs 전용 PR 이 해당한다. `verify:adsense-readiness`·`verify:seo-heading-integrity`
  와 **똑같은 구멍**이고 이번에 넓히지 않았다.
- 이 스텝을 지우려면 `UNWIRED_BY_DESIGN`(`verify-guard-wiring.mjs:46`)에 사유와 함께 옮겨야 한다.
  그냥 지우면 가드가 다시 빨간불이 된다.

### 4-2. 심사자가 볼 수 있는 저가치 페이지 — 조사 완료 (2026-08-17). 🔴 **①robots.txt Disallow 는 하지 말 것**

전제("noindex 는 색인만 막고 크롤러 접근은 막지 않는다")는 **맞다.** 대상도 여전히 많다:

| 대상 | 개수 | 비고 |
|---|---|---|
| `/insights/famous-saju/<slug>` | **134** (초판 136 은 오기) | 이름·생일만 바뀌는 템플릿. `ls -d out/insights/famous-saju/*/ \| wc -l` |
| `/psychotest/<slug>` | 14 | 상세끼리 텍스트 81.5% 공유, 실제 테스트는 외부 링크 |
| 정적 셸 | 19 | 가시 텍스트 **130~1,344자** |

**그런데 초판이 제시한 대응 ①(robots.txt `Disallow`)은 이 사이트에서 효과가 없고 오히려 해롭다.**
구글 1차 출처로 확인한 근거 4가지 — **다시 파지 말 것**:

1. **AdSense 크롤러는 광고 태그가 있는 URL 만 가져간다.**
   구글: *"The crawler attempts to access URLs only where our ad tags are implemented."*
   ([AdSense 크롤러 안내](https://support.google.com/adsense/answer/99376))
   그런데 이 세 클러스터는 `app/components/adsense-route-policy.js` 에서 전부 `canLoadAdsense=false` 다
   — `/insights/famous-saju/*`는 `BLOCKED_DESCENDANT_PREFIXES:131`, `/psychotest`는 `BLOCKED_PREFIXES:53`,
   정적 셸은 허용목록 미포함이라 기본 deny(`:254`). **→ Mediapartners-Google 은 애초에 안 가져간다.
   막을 대상 자체가 없다.**
2. **`Disallow` 를 걸면 noindex 가 죽는다.** 구글:
   *"If the page is blocked by a robots.txt file … the crawler will never see the `noindex` rule,
   and the page can still appear in search results."*
   ([noindex 문서](https://developers.google.com/search/docs/crawling-indexing/block-indexing))
   **이미 색인된 URL 이 영영 안 빠진다.** 지금 필요한 건 정확히 그 반대다 — 색인에서 빼려면
   Googlebot 이 계속 들어와 noindex 를 읽어야 한다.
3. **`User-agent: *` 로는 애초에 안 막힌다.** 구글: Mediapartners-Google·AdsBot 은
   *"The global user agent (`*`) is ignored."*
   ([특수 크롤러 문서](https://developers.google.com/search/docs/crawling-indexing/google-special-case-crawlers))
   레포도 이미 알고 있어 `app/robots.ts` 가 21개 규칙을 **11개 그룹에 각각 복제**한다
   (`scripts/lib/robots-groups.mjs` 헤더에 그 사고 이력이 적혀 있다).
4. **막으면 승인 후 광고가 안 나간다.** 구글: 차단 시 *"we can't serve Google ads on the site."*
   ([robots.txt 접근 허용 안내](https://support.google.com/adsense/answer/10532))
   `verify-adsense-readiness.mjs:1276` 이 Mediapartners-Google 그룹의 `Allow: /` 를 **강제**하고 있다.

**→ 남는 진짜 레버는 ②링크 정리와 ③본문 보강뿐이다.** ②의 진입점은 딱 두 줄이다:
`app/insights/famous-saju/page.tsx:187` (134개 전부 링크) · `app/psychotest/page.tsx:104` (14개 전부).
지금은 홈에서 2클릭이면 닿는다. 다만 링크 제거는 절대규칙 6 경계라 **사용자 판단이 필요하고,
2026-08-17 세션에서는 사용자 지시로 기록만 하고 손대지 않았다.**

### 4-2b. 🔴 새로 발견 — noindex 신호가 **아예 없는** 정적 셸 2개

세 목록 어디에도 없고 `<meta robots>` 도 없다. 즉 **색인 가능한 얇은 페이지**다:

| 라우트 | 크기 | `_headers` | sitemap | `<meta robots>` |
|---|---|---|---|---|
| `/prompt-hub-3004` | 105 KB | 0개 | 없음 | 없음 |
| `/ifa_oracle_v2_full` | 38 KB | 0개 | 없음 | 없음 |

`/ifa_oracle_v2_full` 이 새는 이유가 고약하다 — `_headers:155` 의 규칙이 `/ifa-oracle*`(하이픈)인데
실제 파일명은 `ifa_oracle_v2_full.html`(언더스코어)이라 **매치되지 않는다.**

🔴 **`/destiny-poker` 도 규칙 0개지만 이건 2026-08-16 에 의도적으로 색인 대상으로 승격한 것이다
(`_headers:182` 에 사유). 건드리지 말 것.**

고치려면 `_headers` + `public/_headers` 에 2줄(94→96, 상한 100 이내)과
`verify-adsense-readiness.mjs:186 xRobotsNoindexHeaderPatterns` 계약 목록에 2개 추가.
검증에 `npm run build:cf` 전체가 필요하다. **미조치 — 별도 PR 로 남긴다.**

### 4-2c. `_headers` 는 famous-saju 에 쓸 수 없다 (헛수고 방지)

`public/_routes.json:8` 이 `/insights/famous-saju/*` 를 Worker(`public/_worker.js`)로 보낸다.
Cloudflare `_headers` 는 **Worker 응답을 장식하지 않으므로** 그 접두사에 헤더 규칙을 넣어도 무동작이다.
그쪽 noindex 는 `app/insights/famous-saju/[slug]/page.tsx:79-94` 의 페이지 metadata 가 유일한 레버다.

### 4-3. 홈 `/` 이 광고 차단 목록에 있다
`app/components/adsense-route-policy.js:4`. 승인 후 홈 광고 인벤토리가 0이 된다.

### 4-4. 손대지 않은 근중복 클러스터
- `/nakshatra/codex/*` 27개 — 고유 본문 2,136~2,332자, codex 간 토큰 72% 중복
- `/fortune/{period}/{sign}` 96개 — Jaccard 69.4%
사용자가 A안(22개)을 선택해 이번 범위에서 제외했다.

## 5. 작업 환경 주의

🔴 **다른 세션이 같은 작업 디렉터리를 쓴다.** 이 작업 중에도
`app/components/FeatureMarketingDetailModal.tsx` · `scripts/verify-feature-marketing-schema.mjs` ·
`index.html` 에 결제 팝업 관련 미커밋 변경이 계속 들어왔다.

- `git add .` 절대 금지. **파일을 하나씩 지정해 스테이지할 것.**
- `config/sitemap-lastmod.json` 은 그 세션의 `index.html` 변경 때문에 서명 297개 중 287개가 흔들린다.
  #757 에서는 **일부러 커밋에서 뺐다** — 원장 신선도를 요구하는 가드는 없고
  (`git grep sitemap-lastmod.json -- scripts/verify-* .github/` → 0건), 남는 항목은 다음 빌드의
  `save()`(`scripts/lib/sitemap-lastmod.mjs:410`)가 정리한다.

## 6. 검증 명령

```bash
npm run build:cf     # sitemap:generate → verify:redirects-budget → verify:public-parity
                     # → i18n:check(🔴 optional 이라 실패해도 안 멈춘다, 로그를 직접 읽을 것)
                     # → verify:adsense-route-policy → next build → postbuild verify:adsense-readiness
npm run verify:sitemap        # build:cf 체인에는 없다. 배포 워크플로가 따로 돈다
npm run verify:editor-notes   # build:cf 뒤에 실행 (out/ 를 읽는다). 약 6초
npm run verify:guard-wiring   # 🔴 새 verify:* 를 추가했다면 반드시. 배선/선언 없으면 실패한다
npx tsc --noEmit
npm test                      # 236개
```

### 어디서 자동으로 도는가 (2026-08-17 기준)

| 검증기 | PR CI (`standard`+) | 릴리스 배포 |
|---|---|---|
| `verify:adsense-readiness` | ✅ `build:cf` 의 postbuild | ✅ postbuild |
| `verify:seo-heading-integrity` | ✅ `pr-ci.yml` 스텝 | ❌ |
| `verify:editor-notes` | ✅ `pr-ci.yml` 스텝 (§4-1) | ❌ |
| `verify:guard-wiring` | ✅ `Typecheck and lint` 잡 (티어 무관 항상) | ❌ |

🔴 `fast` 티어(문구·CSS·`index.html`·docs 전용 PR)는 빌드 잡 스텝을 통째로 건너뛰므로
위 표의 앞 세 개가 **안 돈다.** 얇은 라우트에 영향이 갈 변경이면 로컬에서 직접 돌릴 것.
