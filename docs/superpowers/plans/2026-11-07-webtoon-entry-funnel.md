# 진입 웹툰과 구매 동선 정리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/`를 인간 연이가 네오의 기록을 소개하고 꽃돼지 연이가 상품을 안내하는 세로 웹툰으로 바꾸고, 꿀꿀 무료 만세력 → 고민 답 → 5,000원 단건 → 29,000원 묶음으로 이어지는 동선을 정리한다.

**Architecture:** 대본은 `lib/brand/entry-webtoon.mjs` 한 곳에 데이터로 두고, `app/_entry/`의 React 컴포넌트가 글자 없는 그림 컷과 HTML 말풍선·카드를 번갈아 렌더한다. 가격은 서버 렌더 시 `resolveServerFeaturePricing`, 정적 셸은 빌드 생성값에서만 읽는다. 꿀꿀 쪽은 기존 정적 셸(`templates/home-funnel.html` + `yehwa-home.mjs` + `index.html` 런타임)을 고친다.

**Tech Stack:** Next.js App Router(서버 컴포넌트), 정적 HTML 셸 + 바닐라 JS, `node --test`, Playwright(목 서버), `codex exec -i`(gpt-image-2), sharp(AVIF/WebP 내보내기).

**Spec:** `docs/superpowers/specs/2026-11-07-webtoon-entry-funnel-design.md` (승인 계획 `C:\Users\user\.claude\plans\dreamy-orbiting-quilt.md`에 컷별 대사 전문이 있다)

## Global Constraints

- 결제 동결: `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts` 전체와 `index.html`의 `_cdChooseServicePaymentMode`·`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate`, `js/destiny-profile.js`의 `_dpRenderStandalonePaymentChoice`는 수정 금지. 커밋마다 `node scripts/verify-payment-freeze.mjs`.
- 가격 숫자는 `worker/lib/paid-feature-registry.js`에서만 읽는다. 코드·템플릿에 `5,000원`·`29,000원`·`30만원 외` 숫자를 새로 하드코딩하지 않는다(1:1 상담 "1회 30만원"은 과거 이력 문구라 예외, `founder.ts`에서 읽는다).
- 사주는 29,000원 묶음(`unlock.saju_lifetime_bundle`)으로만 판다. 사주 단품·균일가 제안 금지.
- 금지 표현: "적중", "1위", "최고", "100%", 누적 고객 수, 경쟁사 비하, 2024-05-12 기록을 "1년 전", 2024-05-27 글의 "혁명" 방식이 실제와 같았다는 확대, 단정 예언, 공포 조장, 결제 압박, 사용자를 돼지라 부르기.
- 신뢰 문구는 `lib/brand/trust-stories.mjs`·`lib/seo/public-record-copy.mjs`·`lib/brand/founder.ts`·`lib/brand/customer-reviews.mjs`의 승인 문구를 import해서 쓴다. 새로 쓰지 않는다.
- 그림: 네오는 은발 인간 남성(사자 시트 참조 금지), 과시 포즈 금지, 헌신은 연이를 향하게. 영냥이는 원본 크기로 귀 2개 확인. 그림 안 글자·말풍선 금지. 원본은 `D:\CodeDestiny-Build\entry-webtoon-20261107\`.
- 테스트는 목 서버만(LLM·결제·DB 실제 호출 금지).
- 커밋은 태스크마다 자동, 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 푸시·배포는 사용자 요청 시에만.
- 사용자 확인 지점: Task 3 컨택트 시트, Task 5 `/` 스크린샷.

## Review Focus

1. **concern 값이 비었거나 위조됨** (`?concern=<script>`, `concern=foo`): 꿀꿀 쪽은 허용 목록 5개(`love|reunion|money|job|year`) 밖이면 무시하고 일반 무료 만세력으로 연다. → Task 9, Task 10 테스트.
2. **레지스트리에 가격이 없는 featureKey** (`resolveServerFeaturePricing`이 `null`): 카드에서 가격 줄만 빼고 렌더한다. 빈 "원"이나 `NaN원` 금지. → Task 4 테스트.
3. **JS 없이/이미지 실패 상태의 `/`**: 대사·기록·CTA가 HTML로 남아 크롤러와 저속망 사용자가 읽고 누를 수 있다. → Task 5 테스트(서버 HTML에 CTA href·H1·기록 날짜 존재).
4. **로그인 모달 뒤 복귀**: 게스트가 잠긴 타일·고민 단건을 눌러 로그인하면 `/`가 아니라 원래 경로+action+concern으로 돌아온다. → Task 8, Task 10 테스트.
5. **sessionStorage 접근 실패**(사파리 사생활 보호): `cd:home-concern` 읽기/쓰기가 throw해도 CTA 이동과 고민 답 렌더가 계속된다. → Task 4, Task 10 테스트.

---

## 파일 지도

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `app/admin/cms/_components/VisualPreview.tsx`, `scripts/test-cms-visual-editor.mjs` | CMS 미리보기 선택 초기화 버그 | 1 |
| `lib/brand/entry-webtoon.mjs` (신규) | 대본·컷 데이터, 고민 칩 연결 | 2 |
| `lib/marketing/home-concerns.mjs` (신규) | 고민 칩 5개 정본(id·라벨·featureKey·사주 필드) | 2 |
| `docs/design/entry-webtoon-20261107.md` (신규) | 콘티·프롬프트 원장 | 2 |
| `D:\CodeDestiny-Build\entry-webtoon-20261107\` | 그림 생성(저장소 밖) | 3 |
| `public/images/entry-webtoon/*`, `docs/design/entry-webtoon-assets.json` | 내보낸 컷·출처 원장 | 3 |
| `app/_entry/*.tsx`, `app/_entry/entry-webtoon.module.css` (신규) | `/` 웹툰 렌더 | 4 |
| `app/page.js` | 웹 빌드 `<main>`을 EntryWebtoon으로 교체 | 5 |
| `lib/cms/registry.mjs`, `app/admin/cms/_lib/{base-values,visual-fields}.ts`, `lib/cms/home-copy.mjs`(신규), `scripts/apply-home-copy.mjs`(신규) | CMS `home-copy` | 6 |
| `lib/marketing/yehwa-home.mjs`, `templates/home-funnel.html`, `scripts/design/build-home-funnel.mjs`, `js/core/saju/concern-offers.generated.js`(생성) | 꿀꿀 홈 재배치·칩 단일화 | 7 |
| `js/core/index-inline-runtime.js`, `js/prompt-hub-honey.js` | 로그인 게이트 복귀 | 8 |
| `js/core/saju/concern-answer.js`(신규), `index.html`, `js/saju-engine.js`, `js/core/saju/bundle-offer.js` | 무료 결과 고민 답·제안 순서 | 9 |
| `js/feature-detail-panels.mjs`, `app/features/FeatureIntroductionActions.tsx`, `app/love-secret-ai/*` | 환불 한 줄·후기 | 10 |
| `app/fortune/_components/ConcernBridge.tsx`(신규) | 띠운세 → 고민 다리 | 11 |
| `js/core/analytics.js`, `lib/marketing/cro-event-contract*`, `scripts/verify-analytics-events.mjs`, `scripts/report-revenue-funnel.mjs` | 이벤트·리포트 | 12 |

---

### Task 1: P0 CMS 미리보기 선택 초기화 수정

**Files:**
- Modify: `app/admin/cms/_components/VisualPreview.tsx:18`
- Modify: `scripts/test-cms-visual-editor.mjs:63`

**Interfaces:**
- Produces: 없음(버그 수정). Task 6이 이 편집기로 `/` 웹툰 대사를 고친다.

- [ ] **Step 1: 실패 확인** — `node scripts/test-cms-visual-editor.mjs`. Expected: FAIL(선택이 다시 렌더될 때 초기화되거나 셀렉터를 못 찾음).
- [ ] **Step 2: 수정** — 기본값 `entries = [], selectedPath = []`를 모듈 수준 `const EMPTY_ENTRIES: readonly … = []`, `const EMPTY_PATH: readonly string[] = []`로 바꿔 매 렌더 새 배열이 effect 의존성을 깨지 않게 한다. 테스트 63행은 `page.getByLabel("편집할 화면·결과").selectOption(...)`로 바꾼다(라벨 문구가 다르면 실제 `<label>`에 맞춘다).
- [ ] **Step 3: 통과 확인** — `node scripts/test-cms-visual-editor.mjs` 와 `node scripts/test-cms-static-preview.mjs`. Expected: 둘 다 PASS.
- [ ] **Step 4: 커밋** — `fix(cms): 미리보기 선택이 렌더마다 초기화되지 않게 한다`

---

### Task 2: 대본 데이터와 고민 칩 정본

**Files:**
- Create: `lib/marketing/home-concerns.mjs`
- Create: `lib/brand/entry-webtoon.mjs`
- Create: `docs/design/entry-webtoon-20261107.md`
- Modify: `__tests__/ui/no-political-trust-copy.static.test.mjs` (ALLOWED)
- Test: `__tests__/ui/entry-webtoon-script.test.mjs`

**Interfaces:**
- Produces (`home-concerns.mjs`):
  ```js
  export const HOME_CONCERNS: ReadonlyArray<{
    id: 'love'|'reunion'|'money'|'job'|'year',
    label: string,          // '연애','재회','돈','이직','올해 흐름'
    featureKey: string,     // tarot-love-relationship | tarot-reunion-reading | tarot-year-fortune(돈) | tarot-ijik | tarot-year-fortune
    sajuField: 'love'|'relationship'|'wealth'|'career'|'lifestyle', // GAEUN_DB 키
  }>
  export const CONCERN_IDS: ReadonlySet<string>
  export function normalizeConcern(value: unknown): HomeConcernId | null  // 허용 목록 밖이면 null
  export function freeEntryHref(concern: string|null, from: string): string
    // '/ggulggul/?action=cdOneStepFreeSajuEntry&from=<from>' + (concern ? '&concern=<id>' : '')
  ```
- Produces (`entry-webtoon.mjs`):
  ```js
  export const ENTRY_WEBTOON: { title: string, h1: string, skipLabel: string, stickyLabel: string, chapters: Chapter[] }
  // Chapter = { id: 'imagine'|'record'|'decade'|'question'|'offer'|'invite', cuts: EntryCut[] }
  // EntryCut = { id: string, kind: 'image'|'record'|'reviews'|'press'|'concern'|'offer'|'cta',
  //              image?: { src: string, w: number, h: number, alt: string },   // src = '/images/entry-webtoon/<id>' (확장자·폭 없이)
  //              lines: Array<{ speaker: 'yeoni'|'neo'|'pig'|'caption', text: string }>,
  //              recordIndex?: 1|2 }   // record 컷만, PRESIDENTIAL_RECORDS 인덱스
  export function entryCuts(): EntryCut[]   // 장 순서대로 평탄화
  ```

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/ui/entry-webtoon-script.test.mjs`:
  - `entryCuts().length` 는 22~26, 첫 컷 id는 `imagine-night`, `kind:'cta'` 컷이 정확히 1개이며 마지막 장(`invite`)에 있다.
  - 장 순서 = `['imagine','record','decade','question','offer','invite']`.
  - `kind:'image'` 컷은 모두 `image.alt` 가 비어 있지 않고 `image.src` 가 `/images/entry-webtoon/` 로 시작한다.
  - `kind:'record'` 컷의 `recordIndex` 집합 = `{1,2}`(2024-05-12, 2024-05-27).
  - 모든 `lines[].text`를 합친 문자열에 `/적중|1위|최고|100%|1년 전|혁명/` 이 없다.
  - `JSON.stringify(ENTRY_WEBTOON)`에 `/대통령|탄핵|윤석열|이재명|대선/` 매치 0개(정치 단어는 trust-stories 쪽에서만 나온다).
  - `normalizeConcern('love') === 'love'`, `normalizeConcern('<script>') === null`, `normalizeConcern(undefined) === null`.
  - `freeEntryHref('job','entry_webtoon') === '/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon&concern=job'`, `freeEntryHref(null,'entry_webtoon')`에는 `concern` 이 없다.
  - `HOME_CONCERNS.map(c=>c.featureKey)` 가 모두 `worker/lib/paid-feature-registry.js` 의 키다.
- [ ] **Step 2: 실패 확인** — `node --test __tests__/ui/entry-webtoon-script.test.mjs`. Expected: FAIL(모듈 없음).
- [ ] **Step 3: 구현** — 대사는 승인 계획의 「웹툰 대본·콘티」 1~24번 문구를 그대로 옮긴다(말투: 연이 부드러운 존댓말·"당신", 네오 짧은 존댓말, 꽃돼지 밝고 짧게). `h1` 은 `"네오가 미리 짚은 흐름, 당신의 운세로"` 처럼 정치 단어 없는 문장으로 정한다(내 판단, SEO 점검으로 확인). 이미지 컷 14개의 alt는 장면 묘사로 쓴다. `docs/design/entry-webtoon-20261107.md` 에 컷 표(id, 장, 그림/HTML, 대사, 프롬프트 초안, 참조 시트)를 남긴다.
- [ ] **Step 4: 정치 단어 허용 목록** — `node --test __tests__/ui/no-political-trust-copy.static.test.mjs` 가 새 파일 때문에 실패하면 실제 횟수를 세어 ALLOWED에 `// 2026-11-07 사용자 요청: 진입 웹툰` 사유와 정확한 횟수로 등록한다(목표 0개라 등록이 없을 수도 있다).
- [ ] **Step 5: 통과 확인** — 두 테스트 PASS.
- [ ] **Step 6: 커밋** — `feat(entry): 진입 웹툰 대본과 고민 칩 정본`

---

### Task 3: 그림 생성·검수·내보내기 (사용자 승인 지점)

**Files:**
- Create (저장소 밖): `D:\CodeDestiny-Build\entry-webtoon-20261107\{gen.mjs,src/chars.mjs,src/export.mjs,sheet.mjs,prompts.json,out/}`
- Create: `public/images/entry-webtoon/<cutId>-{640,1080}.avif`, `<cutId>-720.webp`
- Create: `docs/design/entry-webtoon-assets.json`
- Test: `__tests__/ui/entry-webtoon-assets.test.mjs`

**Interfaces:**
- Consumes: Task 2 `entryCuts()` 의 `image.src`·`w`·`h`.
- Produces: 이미지 컷마다 `public/images/entry-webtoon/<id>-640.avif`, `-1080.avif`, `-720.webp`. 원장 `[{ id, prompt, references: string[], model:'gpt-image-2', generatedAt, approvedBy:'user', bytes:{avif640,avif1080,webp720} }]`.

- [ ] **Step 1: 파이프라인 복사** — `D:\CodeDestiny-Build\webtoon-revamp-20261107\` 의 `gen.mjs`, `src/chars.mjs`, `src/export.mjs`, `sheet.mjs` 를 복사하고, 삭제된 워크트리 경로를 이 워크트리 경로로 바꾼다. `prompts.json` 은 Task 2 문서의 프롬프트 초안에서 만든다.
- [ ] **Step 2: 참조 시트 연결** — `src/chars.mjs` 에 캐릭터별 참조를 둔다: 인간 연이 `public/images/master-profiles/yeoni-teahouse-portrait.webp` + `여_연이 프로필 사복버전.webp`, 인간 네오 `네오 인간 프로필1.png`(종족 칸 무시) + `neo-strategy-portrait.webp`, 꽃돼지 연이 `연이 프로필1/2.png` + `docs/design/character-references/yeoni-profile-v1.png`, 영냥이 `양냥이 프로필 시트.webp`. 사자 네오 시트는 넣지 않는다. 화풍: 따뜻한 밤 찻집 반실사 웹툰, 세로 1024×1536 / 와이드 1080×720, 프롬프트 끝에 "no text, no letters, no speech bubbles".
- [ ] **Step 3: 생성** — `node gen.mjs --concurrency 3`. 컷마다 후보 2장 이상.
- [ ] **Step 4: 검수** — 후보를 정본과 나란히 놓고 Read로 원본 크기 확인: 연이 연꽃·스카프·꼬리, 네오 인간·은발·회청색 눈·손가락 5개·과시 포즈 아님·헌신 방향이 연이, 영냥이 귀 2개, 그림 속 글자 없음. 탈락 컷은 프롬프트를 고쳐 재생성.
- [ ] **Step 5: 컨택트 시트 → 사용자 승인** — `node sheet.mjs` 로 시트를 만들어 사용자에게 보여 주고 승인을 받는다. 승인 전에는 Step 6으로 가지 않는다.
- [ ] **Step 6: 실패 테스트 작성** — `__tests__/ui/entry-webtoon-assets.test.mjs`: `entryCuts()` 의 이미지 컷마다 세 파일이 존재, 첫 이미지 컷의 `-640.avif` 와 `-720.webp` 는 각각 200KB 이하, 원장 id 집합 = 이미지 컷 id 집합, 모든 원장 `references` 에 `lion`/`사자` 경로 없음.
- [ ] **Step 7: 내보내기** — `node src/export.mjs --out <worktree>/public/images/entry-webtoon` 후 원장 작성. 테스트 PASS 확인.
- [ ] **Step 8: 커밋** — `feat(entry): 진입 웹툰 컷 그림과 출처 원장`

---

### Task 4: EntryWebtoon 컴포넌트

**Files:**
- Create: `app/_entry/EntryWebtoon.tsx`(서버), `app/_entry/RecordCard.tsx`, `app/_entry/ReviewCards.tsx`, `app/_entry/OfferChapters.tsx`, `app/_entry/ConcernPicker.tsx`(`'use client'`), `app/_entry/StickyCta.tsx`(`'use client'`), `app/_entry/entry-webtoon.module.css`
- Test: `__tests__/ui/entry-webtoon-render.test.mjs`

**Interfaces:**
- Consumes: Task 2 `ENTRY_WEBTOON`, `entryCuts()`, `HOME_CONCERNS`, `freeEntryHref`; `PRESIDENTIAL_RECORDS`, `PRESIDENTIAL_REACTIONS`, `trustStoriesCopy` (`lib/brand/trust-stories.mjs`); `splitReviews(3)`, `postedMonth` (`lib/brand/customer-reviews.mjs`); `founder` (`lib/brand/founder.ts`); `PressCoverage` (`app/components/PressCoverage.jsx`); `resolveServerFeaturePricing({ featureKey })`.
- Produces:
  ```ts
  export default function EntryWebtoon(): JSX.Element            // 서버 컴포넌트
  export function buildOfferPrices(): {                           // EntryWebtoon.tsx, 테스트용 export
    concern: Record<HomeConcernId, number | null>,               // tarot-* amountKRW
    bundle: number | null,                                        // saju_lifetime_bundle
    signature: Array<{ featureKey: string, label: string, amountKRW: number | null }>
  }
  // ConcernPicker props: { concerns: typeof HOME_CONCERNS, ctaHrefBase: 'entry_webtoon' }
  //   클릭 시 data-concern 선택 표시, 모든 [data-entry-cta] 의 href 를 freeEntryHref(id,'entry_webtoon') 로 교체,
  //   sessionStorage 'cd:home-concern' 저장(try/catch)
  // StickyCta props: { label: string, href: string, watchId: string }  // watchId 컷이 화면 위로 지나가면 표시
  ```
  CTA 마크업 계약: `<a data-entry-cta data-position="hero|sticky|invite" href="/ggulggul/?action=cdOneStepFreeSajuEntry&from=entry_webtoon">`.

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/ui/entry-webtoon-render.test.mjs` (`react-dom/server` `renderToStaticMarkup` 또는 기존 TSX 테스트 방식을 따른다):
  - 렌더 HTML에 `<h1` 1개, `data-entry-cta` 3개(hero·sticky·invite), 모든 CTA href가 `/ggulggul/?action=cdOneStepFreeSajuEntry` 로 시작한다.
  - `2024-05-12`, `2024-05-27` 와 두 원문 URL(`/223444062729`, `/223459696339`)이 있고, `trustStoriesCopy.fine` 문장이 있다.
  - 후기 영역에 "네오 1:1 상담·강의 이용자 후기" 고지가 있다.
  - 첫 `<img>` 만 `fetchpriority="high"` 이고 나머지는 `loading="lazy"`.
  - `buildOfferPrices().bundle === 29000`, `concern.love === 5000`.
  - `resolveServerFeaturePricing` 을 `null` 로 스텁한 경우 렌더 HTML에 `NaN` 과 `null원` 이 없다.
  - 렌더 HTML에 `/적중|1위|최고|100%/` 없음.
- [ ] **Step 2: 실패 확인** — `node --test __tests__/ui/entry-webtoon-render.test.mjs`. Expected: FAIL.
- [ ] **Step 3: 구현** — 이미지 컷은 `CutReader.tsx` 의 `<picture>`(AVIF srcset `${src}-640.avif 640w, ${src}-1080.avif 1080w`, 폴백 `${src}-720.webp`, `sizes='(max-width:680px) 100vw, 680px'`, width/height 지정)와 `.bubble`/`.narration` 방식을 따르되 컴포넌트는 새로 둔다(CutReader 수정 금지). 말풍선 화자별 클래스 `yeoni|neo|pig|caption`. 기록 카드는 날짜·제목·인용·"원글 읽기" 링크·"이후의 기록"·"시기에 관한 기록이며 모든 과정의 일치를 뜻하지 않아요". 가격은 `toLocaleString('ko-KR')+'원'`, `null` 이면 가격 줄 생략. 안심 박스: "결제 전 예시 확인 · 생성에 실패하면 자동 환불 · 환불 정책 →"(`/refund-policy/` 등 기존 경로 확인). 첫 화면 상단에 `건너뛰기 →` (`#entry-invite` 앵커). StickyCta는 IntersectionObserver로 두 번째 이미지 컷이 위로 지나가면 표시, `prefers-reduced-motion` 존중. 배경은 밤 찻집 톤 토큰, 최대 폭 680px, 390px에서 가로 스크롤 없음.
- [ ] **Step 4: 통과 확인** — 테스트 PASS.
- [ ] **Step 5: 커밋** — `feat(entry): 진입 웹툰 렌더 컴포넌트`

---

### Task 5: `/` 교체와 SEO (사용자 확인 지점)

**Files:**
- Modify: `app/page.js`
- Modify: `js/core/analytics.js:123-141, 223-225` (캠페인 허용 목록)
- Modify (필요한 것만): `__tests__/ui/home-service-separation.test.cjs`, `__tests__/ui/native-home-copy.test.cjs`, `__tests__/ui/legacy-home-target.test.mjs`, `__tests__/ui/home-music-video.test.js`, `__tests__/ui/flower-home-hreflang*`, `__tests__/**/home-entry-redirect*`, `scripts/verify-seo-entity-registry.mjs`, `scripts/verify-mobile-entry-actions.mjs`
- Test: `__tests__/ui/entry-webtoon-root.test.mjs`

**Interfaces:**
- Consumes: Task 4 `EntryWebtoon`; `brandCopy.ko.homeSearchTitle` (`lib/seo/brand-copy.mjs:21`).

- [ ] **Step 1: 실패 테스트 작성** — `__tests__/ui/entry-webtoon-root.test.mjs` (소스 정적 검사):
  - `app/page.js` 가 `@/app/_entry/EntryWebtoon` 을 import하고 `!IS_APP_BUILD` 분기에서 렌더한다.
  - `IS_APP_BUILD` 분기에는 기존 서비스 선택 카드(`CARDS`)가 남는다.
  - `<LegacyHomeEntry />`, 푸터, JSON-LD(`buildWebPageJsonLd`, `buildAuthorPersonJsonLd`, `buildServiceJsonLd` 2회), `serializeJsonLd` 가 남는다.
  - 웹 metadata title이 `homeSearchTitle` 을 쓰고 canonical이 `/`.
  - `js/core/analytics.js` 허용 목록에 `entry_webtoon` 캠페인이 있다.
- [ ] **Step 2: 실패 확인** — Expected: FAIL.
- [ ] **Step 3: 구현** — 웹 `<main>` 내용만 `EntryWebtoon` 으로 바꾸고 앱 빌드 경로는 그대로 둔다. description은 새로 쓴다(정치 단어·금지 표현 없이, 120자 안팎, 내 판단). 기존 홈 테스트가 깨지면 앱 빌드 분기를 보도록 단언 대상을 좁힌다. 웹에서 사라진 것을 요구하는 단언은 웹툰 쪽 대응물로 바꾸고 이유를 테스트 주석에 남긴다. `#homeCardTitle` 이 레거시 대상이면 웹툰 H1에 같은 id를 준다.
- [ ] **Step 4: 통과 확인** — `node --test __tests__/ui/entry-webtoon-root.test.mjs __tests__/ui/home-service-separation.test.cjs __tests__/ui/native-home-copy.test.cjs __tests__/ui/legacy-home-target.test.mjs __tests__/ui/home-music-video.test.js __tests__/ui/json-ld-serialize.test.mjs __tests__/ui/no-political-trust-copy.static.test.mjs`, `node scripts/verify-seo-entity-registry.mjs`, `node scripts/verify-mobile-entry-actions.mjs`, `node scripts/verify-app-store-billing-policy.mjs`, `node scripts/verify-payment-freeze.mjs`. Expected: 모두 PASS.
- [ ] **Step 5: 목 서버 확인** — `npm run dev`(목) 후 Playwright로 390px·1280px 전체 스크롤 스크린샷, 고정 CTA 표시, 칩 선택 후 CTA href에 `concern` 반영을 확인한다. `node scripts/measure-home-lcp-budget.mjs`, `node scripts/check-seo-health.mjs` PASS. 스크린샷을 사용자에게 보여 주고 확인받는다.
- [ ] **Step 6: 커밋** — `feat(entry): 첫 화면을 진입 웹툰으로 바꾼다`

---

### Task 6: P7 CMS `home-copy`

**Files:**
- Modify: `lib/cms/registry.mjs` (새 ns `home-copy`)
- Create: `lib/cms/home-copy.mjs` (기본값 레코드)
- Modify: `app/admin/cms/_lib/base-values.ts`, `app/admin/cms/_lib/visual-fields.ts` (`previewPath`)
- Modify: `app/_entry/EntryWebtoon.tsx` (대사에 `cmsText`)
- Create: `scripts/apply-home-copy.mjs`; Modify: 꿀꿀 홈 빌드 sync 단계에서 호출
- Modify: `scripts/verify-cms-registry.mjs`(소비 지점), `docs/**/visual-cms.md`
- Test: `scripts/test-cms-static-preview.mjs`(케이스 추가), `__tests__/ui/home-copy-cms.test.mjs`

**Interfaces:**
- Produces: ns `home-copy`, `channel:"build"`, entries `{ key:"entry-webtoon", label:"첫 화면 웹툰", hint:"/" }`, `{ key:"ggulggul-hero", label:"꿀꿀 홈 히어로", hint:"/ggulggul/" }`, `{ key:"concern-offer", label:"무료 결과 고민 제안", hint:"/ggulggul/" }`. 웹툰 대사 필드 이름은 `line:<cutId>:<index>`(내 판단). `previewPath('home-copy','entry-webtoon') === '/'`, 나머지 key는 `/ggulggul/`.
- `export function homeCopyDefaults(): Record<string, Record<string,string>>` (`lib/cms/home-copy.mjs`) — Task 2 대본과 Task 7·9 문구에서 만든다.

- [ ] **Step 1: 실패 테스트 작성** — `home-copy-cms.test.mjs`: registry에 `home-copy` 가 있고 entries 3개, `previewPath` 값, `homeCopyDefaults()['entry-webtoon']` 키 수 = 웹툰 전체 대사 수, `cms.generated.json` 에 `home-copy.entry-webtoon.line:imagine-night:0` 오버라이드를 넣고 렌더하면 그 문구가 나온다. `test-cms-static-preview.mjs` 에 "`/` 대사 클릭 → 수정값 미리보기" 케이스 추가.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현** — React 쪽은 `cmsText('home-copy','entry-webtoon',`line:${cut.id}:${i}`, line.text)`. 정적 셸은 `data-cms="home-copy:ggulggul-hero:<field>"` 속성을 달고 `apply-home-copy.mjs` 가 sync 뒤 `public/` 산출물에만 적용한다(템플릿 원본과 `--check` 대상은 그대로).
- [ ] **Step 4: 통과 확인** — 새 테스트, `node scripts/verify-cms-registry.mjs`, `node scripts/test-cms-visual-editor.mjs`, `node scripts/test-cms-static-preview.mjs`, `node scripts/design/build-home-funnel.mjs --check`. PASS.
- [ ] **Step 5: 커밋** — `feat(cms): 첫 화면 웹툰과 꿀꿀 홈 문구를 관리자에서 고친다`

---

### Task 7: P3 꿀꿀 홈 재배치와 고민 칩 단일화

**Files:**
- Modify: `lib/marketing/yehwa-home.mjs` (`renderYehwaHome`), `templates/home-funnel.html`, `scripts/design/build-home-funnel.mjs`
- Create (생성물): `js/core/saju/concern-offers.generated.js`
- Modify: i18n 키 파일(기존 홈 키가 있는 곳)
- Modify (같은 커밋): `__tests__/ui/home-service-separation.test.cjs`, `home-direct-feature-links`, `scripts/verify-home-funnel.mjs`, `verify-consultation-home-browser`, `verify-yehwa-home`, `__tests__/ui/home-music-video.test.js`, `feature-visual-details`, `scripts/verify-analytics-events.mjs`, `verify-compact-home`
- Test: `__tests__/ui/ggulggul-home-order.test.mjs`

**Interfaces:**
- Consumes: Task 2 `HOME_CONCERNS`, `freeEntryHref`.
- Produces: `window.CdConcernOffers = { concerns: { [id]: { featureKey, label, amountKRW, href } }, bundle: { featureKey:'saju_lifetime_bundle', amountKRW, priceLabel } }` (`concern-offers.generated.js`, 레지스트리에서 생성, `--check` 대상). `href = '/features/<featureKey>/'`(존재 확인 단언 포함).

- [ ] **Step 1: 실패 테스트 작성** — `ggulggul-home-order.test.mjs` (생성된 `public/ggulggul/index.html` 또는 `renderYehwaHome` 출력):
  - 섹션 순서: 히어로 → 3입구 nav → 결과 예시·후기 → 대표 상담 → 초융합 → 이용권 → 무료로 먼저 → 영냥이·네오 편지 → MV → 도움말·모든 운세·디렉터리.
  - 히어로에 질문 h1, 고민 칩 5개(각 `data-concern`, 가격 표기는 생성값과 일치), "10년 경력 명리학자 · 무료 시작 가능", "명리학자 박병하(네오) 소개 →", CTA 정확히 1개(`href` 가 `/ggulggul/?action=cdOneStepFreeSajuEntry` 로 시작하고 `data-cdh-free` 보유, `data-action` 없음), "상담은 유료예요. 가격과 결과 예시는 먼저 확인할 수 있어요."
  - 고민 선택 UI는 페이지 전체에 1개(`[data-concern-picker]` 개수 1, 옛 `.yh-find` 없음).
  - 로그아웃 헤더 재화 표시는 "이용권 14,900원부터" 1개(14,900도 생성값).
  - `concern-offers.generated.js` 의 `bundle.amountKRW === 29000`, 각 concern `amountKRW === 5000`.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현** — `build-home-funnel.mjs` 가 레지스트리에서 가격을 읽어 생성 파일을 쓰고 `--check` 에 포함한다. 칩은 `HOME_CONCERNS` 에서 렌더, 클릭 시 `sessionStorage 'cd:home-concern'`(try/catch) 저장과 CTA href 교체. 기존 `HOME_CONCERN_GROUPS` 소비처는 새 칩으로 옮기고 남는 사용처가 없으면 지운다.
- [ ] **Step 4: 통과 확인** — 새 테스트, 위 9개 테스트/스크립트, `node scripts/design/build-home-funnel.mjs --check`, `node scripts/verify-payment-freeze.mjs`. PASS.
- [ ] **Step 5: 커밋** — `feat(home): 꿀꿀 홈을 구매 순서로 다시 놓고 고민 칩을 하나로 합친다`

---

### Task 8: P2 히어로 CTA 재로드 제거와 로그인 복귀

**Files:**
- Modify: `js/core/index-inline-runtime.js:1609-1621, 3646-3650, 7721-7725`
- Modify: `js/prompt-hub-honey.js:336`
- Test: `__tests__/ui/login-gate-return.test.mjs`

**Interfaces:**
- Consumes: `window.__cdResolveLoginNextPath(nextPath, reason)` (`index.html:25720`), `window.__cdOpenLoginRequiredModal({ nextPath, reason })` (`index.html:25683`). `_cdPromptLogin` 은 전역이 아니므로 쓰지 않는다.

- [ ] **Step 1: 실패 테스트 작성** — 정적 검사: 네 곳에 `window.confirm(` 과 `next=%2F`/`'/login/?next=' + encodeURIComponent('/')` 가 없고 `__cdOpenLoginRequiredModal` 호출이 있다. jsdom 스모크: 위치 `/ggulggul/?action=openTarot&concern=job` 에서 게이트 함수를 호출하면 모달 스텁이 `nextPath` 에 `/ggulggul/?action=openTarot&concern=job` 를 받는다. `__cdOpenLoginRequiredModal` 이 없으면 `/login/?next=<현재경로 인코딩>` 으로 이동한다.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현** — 공통 헬퍼 `function __cdGateLogin(reason)` 를 `index-inline-runtime.js` 안에 두고 네 곳에서 호출. `prompt-hub-honey.js` 는 같은 전역 함수를 쓰고 없을 때 폴백.
- [ ] **Step 4: 통과 확인** — 새 테스트, `node scripts/verify-payment-freeze.mjs`. PASS.
- [ ] **Step 5: 커밋** — `fix(login): 로그인 뒤 원래 상품과 고민으로 돌아온다`

---

### Task 9: P4 무료 결과의 고민 답과 제안 순서

**Files:**
- Create: `js/core/saju/concern-answer.js`
- Modify: `index.html` (18271과 18272 사이에 `<section id="sajuConcernAnswer" hidden></section>`, 스크립트 태그는 5410 bundle-offer 옆)
- Modify: `js/saju-engine.js` (`renderCurrentSeasonSummary` 24379–24383을 `_cdCurrentYearGanZhi()` 로 추출, 5335 근처 `_cdRenderBundleSurfaces()` 앞에서 `CdConcernAnswer.render(...)`, `getSajuLoginReturnPath`/`saveSajuLoginDraft` 에 concern 저장)
- Modify: `js/core/saju/bundle-offer.js` (`PRICE_LABEL` → `window.CdConcernOffers.bundle.priceLabel`, 고민 중심 문구)
- Test: `__tests__/ui/concern-answer.test.mjs`

**Interfaces:**
- Consumes: Task 7 `window.CdConcernOffers`; `evalDaewun(gan, zhi)`, `getDetailedGaeun(element, isGood)`, `GAN` (`saju-engine.js`); `CdSajuBundleOffer.renderInline(host)`.
- Produces:
  ```js
  function _cdCurrentYearGanZhi(): { yg: string, yz: string }   // saju-engine.js 전역
  window.CdConcernAnswer = {
    resolveConcern(): HomeConcernId | null,  // URL ?concern= → sessionStorage 'cd:home-concern' 순, 허용 목록 밖은 null
    buildAnswer(concern, { ygd, yEv, gaeun }): { lines: [string,string,string] },
    render(host: HTMLElement, ctx): void,     // 답 → 5,000원 카드 → 묶음 호스트 순
  }
  ```

- [ ] **Step 1: 실패 테스트 작성** — jsdom:
  - `resolveConcern()` : `?concern=money` → `'money'`, `?concern=<script>` + 저장값 없음 → `null`, sessionStorage getter가 throw해도 `null` 반환.
  - `buildAnswer('job', …)` 3줄: 1줄 `evalDaewun` 라벨 포함, 2줄은 `getDetailedGaeun()['career']` 첫 문장, 3줄 연결 문장. `null` concern이면 `render` 가 `lifestyle` 기준 일반 답을 낸다.
  - `render` 후 `#sajuConcernAnswer` 자식 순서: `.concern-answer` → `.concern-offer[data-feature-key="tarot-ijik"]`(가격 "5,000원", "생성에 실패하면 자동 환불돼요") → `#sajuBundleOffer`(29,000원).
  - `bundle-offer.js` 에 `'29,000원'` 리터럴이 없다.
  - `_cdCurrentYearGanZhi` 추출 뒤 `renderCurrentSeasonSummary` 출력이 바뀌지 않는다(같은 입력 스냅샷 비교).
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현** — 묶음 대운 요약은 쓰지 않는다. 단건 카드 클릭은 기존 기능 진입 경로(`href`)로 이동하고 결제 함수는 건드리지 않는다. `index.html` 의 `MIN_TO_SHOW = 3`(18028) 근처 로직은 Task 10에서 다룬다.
- [ ] **Step 4: 통과 확인** — 새 테스트, `node scripts/verify-payment-freeze.mjs`, `node scripts/design/build-home-funnel.mjs --check`. PASS.
- [ ] **Step 5: 커밋** — `feat(saju): 무료 결과에 고민 답과 고민별 제안을 먼저 보여 준다`

---

### Task 10: P5 환불 한 줄·후기 배너·후기 대체

**Files:**
- Modify: `js/feature-detail-panels.mjs:~187` (`heroActionHtml`), `app/features/FeatureIntroductionActions.tsx`
- Modify: `/love-secret-ai/` PromiseCard footer, `app/love-secret-ai/result/LoveSecretAiResultClient.tsx` (`ReviewRewardBanner` 추가)
- Modify: `index.html:18028` 부근 후기 렌더(3건 미만이면 결과 예시)
- Test: `__tests__/ui/refund-line.test.mjs`

**Interfaces:**
- Consumes: `app/components/ReviewRewardBanner.tsx`, `lib/marketing/result-samples.json`.
- Produces: 문구 상수 `REFUND_LINE = '생성에 실패하면 자동 환불돼요'` + 환불 정책 링크(기존 정책 경로)를 `lib/marketing/home-concerns.mjs` 에서 export해 Task 4·9와 공유한다.

- [ ] **Step 1: 실패 테스트 작성** — 상세 패널 HTML과 `FeatureIntroductionActions` 렌더에 `REFUND_LINE` 과 정책 링크 존재, 연애 비책 결과 클라이언트가 `ReviewRewardBanner` 를 렌더, 후기 2건 픽스처에서 홈 후기 영역 대신 "결과 예시" 블록 표시.
- [ ] **Step 2: 실패 확인.**
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인** — 새 테스트, `node scripts/verify-payment-freeze.mjs`.
- [ ] **Step 5: 커밋** — `feat(trust): 결제 앞에 자동 환불 한 줄과 후기 배너를 둔다`

---

### Task 11: P6 띠운세 → 고민 다리

**Files:**
- Create: `app/fortune/_components/ConcernBridge.tsx`
- Modify: `SignFortuneView.tsx`(518 앞), `DateSignFortuneView.tsx`(136), `KakaoChannelInvite` 를 다리 아래로
- Test: `__tests__/ui/concern-bridge.test.mjs`

**Interfaces:**
- Consumes: `HOME_CONCERNS`, `freeEntryHref(id, 'fortune_bridge')`.
- Produces: `export default function ConcernBridge({ from }: { from: string }): JSX.Element`

- [ ] **Step 1: 실패 테스트 작성** — 칩 5개, 각 href = `freeEntryHref(id, 'fortune_bridge')`, 두 뷰에서 `ConcernBridge` 가 `KakaoChannelInvite` 보다 앞.
- [ ] **Step 2: 실패 확인.** **Step 3: 구현.** **Step 4: 통과 확인.**
- [ ] **Step 5: 커밋** — `feat(fortune): 띠운세 끝에서 고민 무료 풀이로 잇는다`

---

### Task 12: P8 측정

**Files:**
- Modify: `js/core/analytics.js`, CRO 이벤트 계약 파일(`cro-event-contract`), `scripts/verify-analytics-events.mjs`, `scripts/report-revenue-funnel.mjs`
- Modify: Task 4·7·9·11 컴포넌트에 이벤트 호출

**Interfaces:**
- Produces 이벤트: `entry_webtoon_view`, `entry_webtoon_progress{percent:25|50|75|100}`, `entry_webtoon_cta_click{concern,position}`, `home_concern_select{concern,surface}`, `concern_answer_view{concern}`, `concern_offer_view{feature_key}`, `concern_offer_click{feature_key}`, `begin_checkout` 에 `from` 파라미터.

- [ ] **Step 1: 실패 테스트** — `node scripts/verify-analytics-events.mjs` 에 새 이벤트를 계약에 추가하고 소비 지점 미구현으로 FAIL 확인.
- [ ] **Step 2: 구현** — 기존 `track` 래퍼만 쓴다. `begin_checkout` 의 `from` 은 결제 동결 파일 밖(호출 쪽)에서 넘긴다. 넘길 수 없으면 생략하고 요약에 남긴다.
- [ ] **Step 3: 통과 확인** — `verify-analytics-events`, `node scripts/report-revenue-funnel.mjs --mock`(또는 기존 목 옵션), `verify-payment-freeze`. PASS.
- [ ] **Step 4: 커밋** — `feat(analytics): 진입 웹툰과 고민 동선 이벤트`

---

### Task 13: 전체 검증과 마무리

- [ ] **Step 1:** 목 서버 Playwright 시나리오: `/` 390px·데스크톱 스크롤, 고정 CTA, 칩 → CTA → `/ggulggul/` 재로드 없이 입력 열림, 결과 순서(고민 답 → 5,000원 → 29,000원), 게스트 로그인 모달 → 원래 경로·concern 복귀, 띠운세 다리, 상세 환불 한 줄.
- [ ] **Step 2:** `node scripts/measure-home-lcp-budget.mjs`, `node scripts/check-seo-health.mjs`, `node scripts/verify-internal-link-depth.mjs`, `node scripts/verify-analytics-events.mjs`, `node scripts/test-cms-visual-editor.mjs`, `node scripts/test-cms-static-preview.mjs`.
- [ ] **Step 3:** `npm run check:fast`, `npm run check:pre-push`. 모두 PASS.
- [ ] **Step 4:** 실패가 있으면 superpowers:systematic-debugging으로 원인을 고친 뒤 재실행. 마지막 보고에 사용자 할 일(네이버 비즈머니·UTM, GA4 KST/KRW, Threads 재가동, Search Console 사이트맵 재제출)을 적는다.
