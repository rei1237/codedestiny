---
status: in-progress
updated: 2026-11-13
next: 묶음 ② 11a(명식·절기 그림)·배너 모바일 다듬기 시작
---

# 꿀꿀 운세·영냥이 UX: 구매 흐름 · 후기 신뢰 · 후기 작성 · 생성 진행 · 무료 배너

## 첫 행동

1. 이 워크트리에서 작업한다: `D:\Development\codedestiny-worktrees\ux-conversion-20261113-215142` (브랜치 `wt/ux-conversion-20261113-215142`, origin/main 추적).
   - 메인 체크아웃 `D:\Development\code-destiny`는 다른 세션 소유(`feat/world-cast-page`)다. 읽기·쓰기 모두 하지 않는다.
2. `git status`, `git fetch origin`, `git log --oneline -5`로 상태를 본다. 아래 "단계"에서 첫 미체크 묶음을 맡는다.
3. 맡은 묶음만 진행한다. 단계마다 커밋하고 이 문서의 체크박스·SHA·결과를 갱신해 커밋한 뒤 요약을 돌려준다.

## 지금 상태

- 워크트리: `D:\Development\codedestiny-worktrees\ux-conversion-20261113-215142`
- 브랜치: `wt/ux-conversion-20261113-215142`
- 기준: origin/main `02476159e0b545b887fe04a12815b7123b4b614d`
- node_modules는 정션, `.env.local`·`.env.cloudflare.local`은 링크(건드리지 않는다).
- 워크트리 제거: 다른 체크아웃에서 `npm run worktree:remove -- 'D:\Development\codedestiny-worktrees\ux-conversion-20261113-215142'` (git worktree remove 금지 — 긴 경로 고아 폴더).
- 마지막 커밋: 단계마다 아래 표에 적는다. 묶음 ① 끝 코드 커밋 `3af1f976b`(미push). 묶음 ② 6b 끝 코드 커밋 `dd10f6156`(미push). 묶음 ② 6c-1 코드 커밋 `4dd33836e`·`9b9a8e706`·`3c8d5ac2f`(미push). 묶음 ② 6c-2 코드 커밋 `273aa5ce6`·`d1eba2bae`(미push).

## 승인 상태 (사용자 원문, 2026-11-13)

- 원 요청: "너는 최고의 ui/ux 디자이너이자 사용자 경험 전문가야 내 서비스의 서비스 진입점부터 시작해서 꿀꿀운세, 운세보는 영냥이 서비스의 ui/ux가 자연스럽게 구매까지 이어질 수 있도록하고 후기를 통해서 신뢰감을 높힐 수 있도록해줘 그리고 후기를 쓰기도 더 편하고 직관적으로 개선해주고 llm 기능들의 운세 생성 과정 ui/ux를 개선해줘 필요하다면 이미지를 생성해도 좋아 완벽까지 진행할때까지 끊지말고 압축하면서 끝까지 작업을 완수해줘"
- 추가 요청: "특히 첨부한 부분은 좀 더 고급스럽게 개선해주도록하고 각 기능에 맞는 상세 페이지가 기존에 있다면 표시하거나 만들어줘 데스크탑에서 가로로 너무 길지 않게 카드처럼 고급스러운 느낌으로 개선해줘" (첨부: `/` 무료 배너 "3개월 한정 · 지금만 전부 무료", 칩 3묶음·연이·D-91·CTA 2개)
- push: "스테이징까지 push (Recommended)" — 단계별 커밋, **내 커밋만** `git push origin HEAD:main`. 운영 승격은 **승인 안 됨**(별도 1회 승인 필요).
- 후기 보상 표시: "카드마다 작은 표시 (Recommended)" — 공개 API에 읽기 전용 `rewarded` boolean 추가, 카드마다 작은 표시.
- 계획(아래 설계) 승인됨(ExitPlanMode).
- 이미지 생성: 허용(필요한 곳만, codex-image).

## 작업 규칙과 함정

- **결제 로직(RED) 불변:** 가격·결제·이용권·환불 로직과 금액, 제출 핸들러는 바꾸지 않는다. 결제 인접 화면은 마크업 위치·분석 이벤트만. 가격 문구는 카탈로그·레지스트리(`PriceBadge`, 영냥이 catalog)에서 읽는다.
- **후기 법적 규칙:** 지어내지 않음, 후기 문장 생성 금지, 감정별 초대 변경 금지, 본문을 분석 이벤트로 보내지 않음, 면책 "개인 경험에 따른 후기이며 결과를 보장하지 않습니다" 유지, `/reviews` noindex 유지, 클라이언트 전용 데이터로 AggregateRating 금지, 결정 지점 블록은 `verifiedOnly`만(운영진 등록 후기 제외), 카드마다 경제적 이해 표시.
- **디자인:** 꿀꿀 `--cd-*`·Tailwind, 영냥이 `--yn-*`(`app/yeongnyangi/night-tokens.css`). `.module.css` 안에서 `--cd-*` 재선언 금지(사설 네임스페이스). `dark:`, `prefers-color-scheme`, 새 hex 금지. 대비 AA, 탭 44px, 입력 16px, alt·aria-label. 신규 화면은 몰입형(AppChrome 등록). PRODUCT.md 안티레퍼런스: 그라디언트 텍스트, 사이드 스트라이프, 반복 eyebrow, 01·02·03 스캐폴딩 금지.
- **말투:** 영냥이 반말('~냥'은 짧은 한마디에만), 연이·네오 존댓말, UI 해요체. 공포·보장·결제 압박 금지. 식별 이모지는 🌸·🦁만. 결제 용어: 달빛 이용권·월정석·단건 결제(코인 노출 금지). 영냥이 등급: 고등어·연어·광어·참치·모둠·오마카세.
- **분석:** `trackEvent`(`lib/analytics.ts`), 이벤트 이름은 문자열 리터럴(`verify:analytics-events`). S00 계약 `docs/strategy/conversion-s00-baseline-2026-10-07.md` L98-107: `review_invite_view`, `review_invite_click`, `review_write_start`, `review_submit_attempt`, `review_submit_success`, `review_submit_failed`; payload `service`, `product_id`, `surface`, `eligibility`, `metric_version=1`.
- **검증:** mock만. 실제 LLM 호출·실결제·운영 DB 쓰기·환불 금지. `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조 수정 금지. 비밀값 출력·저장·커밋 금지.
- **테스트 리듬:** 단계마다 관련 jest만(targeted). `npm run check:fast`는 마지막(묶음 ⑤)에 1회. 커밋 전 `git status`·`git diff --stat` 확인 후 경로 지정 `git add`.
- **스크린샷:** 메인 세션/에이전트 컨텍스트에서 직접 Read 하지 말고 visual-checker 에이전트로 판정(`.claude/agents/visual-checker.md`).
- **URL:** 콘텐츠 ID 금지. 후기 쪽은 카탈로그 slug(`product=`)만.
- **이어하기 문구(사실 확인됨):** love-secret·new-year·life-book·vedic은 다시 열면 클라이언트가 재개. 운영은 `worker/lib/consultation-recovery-task.js`(IDLE 5분, 최대 7일)가 `*/10` 크론으로 마무리. 스테이징은 크론 없음. 문구: "화면을 닫아도 결제한 상담은 사라지지 않아요. 다시 열면 이어서 쓰고, 오래 비워 두면 서버가 마저 완성해 기록함에 저장해요." 시간 약속 금지. 영냥이는 서버 큐 생성.
- **함정:** 영냥이 `#yn-example`은 닫힌 `<details>` 안. QuickReviewComposer 기존 이벤트 이름은 S00과 다름. 요약 집계는 운영진 등록 후기를 포함하므로 verifiedOnly 필요. 게스트 `next`에 현재 페이지(콘텐츠 ID) 넣지 않음. 꿀꿀 카드엔 "N원부터" 금지(무료 운세 있음). 두 후기 UI(QuickReviewComposer·ReviewsClient)를 합치지 않음. `ReviewsClient.tsx`는 이미 `dark:`·hex가 있으니 재스타일하지 않고 새 마크업만 토큰 사용.
- **public 미러:** `index.html`·`styles/home-funnel.css`·`lib/marketing/free-promo*.mjs` 바꾸면 `npm run sync:public`.
- 컨텍스트가 길어지면 이 문서를 갱신·커밋하고 요약을 돌려준다(전역 규칙).

## 설계

### 1. 후기 서버 (GREEN)
- `worker/routes/reviews.js`: 공개 투영(L42)에 `reviewReward.granted` 추가, `toPublicReview`(L101)에 `rewarded: Boolean(doc?.reviewReward?.granted)` (다른 보상 필드는 내보내지 않음). 목록 캐시 `reviews:list:v4`→`v5`(L186). `handleSummary`가 `verifiedOnly=1`을 받고 캐시 키 `reviews:summary:v3:${productId}:${verified?1:0}`(L229). `REVIEW_QUICK_TAGS`(L45-52)에 균형 태그(긍정·아쉬움 같은 수, 예: "설명이 이해하기 쉬웠어요", "기대와 달랐어요", "더 구체적이면 좋겠어요") 추가, 기존 태그 유지, 개수 제한(L333·L436) 확인.
- `worker/lib/record-library.js` L56-75: `resolveReviewProductByFeatureKey` 결과로 `reviewProductId`를 응답에 싣는다.
- 테스트: `__tests__/worker/review-create.test.js`(화이트리스트 L74-78), `review-author-masking.test.js`(공개 필드에 `rewarded`만 추가), record-library 테스트, 요약 `verifiedOnly`가 운영진 등록 후기를 빼는 케이스 추가.
- 검증: jest, `npm run verify:public-api-edge-cache`.

### 2. 결과 화면 후기 작성기 (GREEN)
- 새 `app/components/review/review-ui.ts`: 별점 단어 라벨(1~5 별로예요…최고예요), 균형 빠른 태그(서버 화이트리스트 부분집합), `useReviewDraft(productId)`(localStorage `cd_review_draft_v1:<productId>`, 7일 만료, 성공 시 삭제, try/catch).
- `app/components/ReviewRewardBanner.tsx`: 선택 prop `reviewProductId` → `QuickReviewComposer`.
- `app/components/QuickReviewComposer.tsx`: 작성 가능 목록에 있으면 미리 선택(없으면 `items[0]`), 초안 저장·복원, 균형 태그·별점 라벨(초대는 별점 무관 동일), 게스트 `next=/reviews/?write=1&product=<id>`, 제출 뒤 타임라인 접수→검토→공개·월정석 지급, S00 이벤트(복원 시 `review_write_start` 안 보냄, 본문 미포함).
- 동기화 테스트: 작성기·`ReviewsClient` L63·worker 태그 목록 정적 일치.
- 테스트 갱신: `__tests__/ui/review-consent-flow.test.mjs`(L67-69), `review-reward-copy.test.mjs`. 검증: `verify:analytics-events`, jest, `measure:touch-targets`.

### 3. 결과 화면마다 후기 상품 ID 전달 (GREEN)
- 통과 prop: `components/fortune/PremiumResultShare.tsx` L118, `ConsultationShare.tsx` L123, `PaidResultImageGuide.tsx` L16.
- 리터럴: 타로 2곳(`LoveRelationshipTarot.tsx` L873, `MindScanTarot.tsx` L1421)→`tarot`; `app/fortune-chat/ConsultationResult.tsx` L150→`fortune-chat`; `FusionFortuneClient.tsx` L3087→`fusion-fortune`; `IslandConsultClient.tsx` L1126→`destiny-island`; `NakshatraAiClient.tsx` L461→`nakshatra`; `NewYearAiClient.tsx` L2426→`new-year`; `SukuyoCompatibilityAiClient.tsx` L2101→`sukuyo`; 영냥이 `Result.tsx` L232·L269→`yeongnyangi`; life-book(`kind="book"`)→`life-book`; love-secret(`kind="letter"`)→`love-coach`; astrology·vedic·ziwei·destiny-compass·human-design·karma-destiny·naming→각자 카탈로그 id(`worker/lib/review-product-catalog.js`에서 확인).
- 정적 검사: 모든 `reviewProductId` 리터럴이 카탈로그 id인지(`review-reward-copy` 테스트에 추가).

### 4. `/reviews` 미리 선택 · 카드 보상 표시 · 기록함·보관함 연결 (GREEN)
- `app/reviews/ReviewsClient.tsx`: `write=1`(L1057) 옆에서 `product`를 읽어 작성 가능할 때만 `formProductId`(L944) 설정. `ReviewCardView`에 `rewarded`면 "작성 보상(월정석) 지급 후기" 표시 — 문구는 `js/review-reward-copy.mjs` 한 곳.
- `app/records/RecordsClient.tsx` L101: `&product=<reviewProductId>`. `app/yeongnyangi/_components/Library.tsx` L90: `&product=yeongnyangi`.

### 5. 결정 지점 신뢰 블록 `ReviewProof` (GREEN)
- 새 `app/components/ReviewProof.tsx` + `.module.css`(꿀꿀 `--cd-*` / 영냥이 `--yn-*` 변형). `verifiedOnly=1` 목록·요약 사용.
  - 0건 → TrustFacts: 결제 전 총액 확인, 완성본 기록함 보관, 생성 실패 시 처리·환불 정책 링크, 실제 예시 링크.
  - 1~2건 → 카드만(평균 없음). 3건 이상 → 평균·건수·카드.
- 카드마다 보상 표시, 블록에 면책 문구, "후기 더 보기" `/reviews/?product=<id>`. 높이 확보(CLS 없음), 실패 시 TrustFacts.
- 배치: 연애 비책 소개, 신년운세, 인생의 책 가격·CTA 근처, 영냥이 `FortuneHome` #yn-prices 근처. 결과 화면에는 넣지 않음.
- 테스트: 문구·임계값 단위 테스트(`customer-reviews.test.mjs` 패턴).

### 6. 무료 배너 고급화 + 칩별 상세 페이지 (GREEN, SEO 동시 점검)
- 사실: `/` React 배너 `app/components/FreePromoBanner.tsx` + `free-promo-banner.module.css`, `.banner` `width:100%`, `.stage`(`app/home-main.module.css` L40) 최대 폭 없음 → 1920px에서 ~1856px. 영냥이 변형은 이미 `width:min(1080px, calc(100% - 40px))`. 셸: `lib/marketing/free-promo-shell.mjs` → `build-home-funnel.mjs` L343 → `index.html`, CSS `styles/home-funnel.css` L1693-1755. 마운트: `app/page.js:123`, `app/yeongnyangi/_home/FortuneHome.tsx:147`, `app/components/SeoLandingTemplate.jsx:15/274`(/saju, /saju/free, /manse, /ziwei, /astrology, /vedic, /sukuyo).
- 6a 카드화(React·셸 둘 다): `width:min(1080px,100%)`, `margin-inline:auto`, 반경 `--cd-r-section`, 토큰 기반 은은한 표면 + 헤어라인 테두리, 제목·기한·D-day 위계, 연이 그림·말풍선을 카드 안에, 데스크톱 3열/모바일 세로, 칩은 "이름 + →" 링크 타일(44px+, hover·focus 분명), 현재 페이지 칩 `aria-current`. impeccable critique→audit·polish, visual-checker 1440·390. 셸 CSS 변경 후 `npm run sync:public`.
- 6b 칩 연결: tarot→`/tarot/`, ziwei→`/ziwei/`, sukuyo→`/sukuyo/`, vedic→`/vedic/`, astro→`/astrology/`, compat→`/saju/compatibility/`, humanDesign→`/human-design/guide/`; manse·today·career·bias·animal·promptHub 유지. 랜딩 시작 버튼 `/?action=…`(tarot·sukuyo·vedic·astro)가 `LegacyHomeEntry`로 셸 액션까지 가는지 확인, 끊겼으면 최소 수정.
- 6c 신규 상세 9개: fourCut→`/saju/four-cut/`, dopamine→`/saju/dopamine/`, hormone→`/saju/teto-egen/`, tTest→`/saju/t-test/`, lotto→`/saju/lotto-ritual/`, aiPrompt→`/saju/ai-prompt-card/`, skillTree→`/saju/skill-tree/`, natal→`/saju/natal-chart/`, seasonRhythm→`/saju/season-rhythm/`.
  - 레지스트리 `lib/marketing/free-feature-details.mjs`. 카드 7개 문구는 `lib/marketing/feature-marketing-copy.generated.json` `items[rpt_*].copy`(headline, previewText, feats, analysisSteps, answersQuestions, recommendedFor, faq, trustNotes)를 import해서 사용. 키: rpt_skillTreeCard, rpt_aiPromptCard, rpt_tTestCard, rpt_hormone-vibe-section, rpt_lottoCard, rpt_sajuFourCutCard, rpt_dopamineCard. 명식·절기는 `js/saju-engine.js` L9324-9344, `worker/lib/saju-section/report.js` L445-457, `js/core/saju/manse-shinsal.js` 근거로 사실만.
  - 공용 서버 컴포넌트 `app/components/free-feature/FreeFeatureDetail.tsx`(Tailwind, `--cd-*`), 몰입형 `AppChrome.tsx`(`IMMERSIVE_FORTUNE_ROUTES` L106 또는 `FEATURE_NAV_SELF_MANAGED_ROUTES` L123) 등록. 구성: 히어로(그림·이름·한 줄·"2027년 2월 12일까지 무료" 배지 — `FREE_PROMO` 값), 미리보기, 얻는 것, 읽는 순서, 이런 분께, FAQ, 시작 버튼 `/ggulggul/?action=cdOneStepFreeSajuEntry` + "사주 결과 화면의 'OO' 카드에서 열려요", 다른 무료 기능 링크.
  - 그림: `public/fuctionassets/{사주 네컷,도파민 중독,테토VS에겐,극T테스트,사주 로또,사주 프롬프트,RPG 인생 스킬트리}.webp`, `public/images/feature-details/life-skill-tree-*.webp`, `public/images/psychotest/bmovie-v1/{dopamine,ttest}-*.webp`. 명식·절기는 단계 11에서 생성.
  - SEO: `buildSeoMetadata`(`lib/seo.ts:71`), JSON-LD `lib/structured-data.ts`(Breadcrumb L137, WebPage L150, FAQ L255 — FAQ가 보일 때만) + `lib/seo/json-ld.mjs:11` 직렬화(`SeoLandingTemplate.jsx` L233-248 패턴). 가격 0 오퍼·`isAccessibleForFree` 금지. `lib/seo/entity-registry.mjs` `SEO_ROUTE_PROFILES`에 고유 주 키워드. `scripts/generate-sitemap.mjs` coreRoutes(L99) 추가 후 `npm run sitemap:generate`, `npm run llms:generate`. 서버 렌더 본문이 ~1,300자 이상이면 색인, 아니면 noindex·사이트맵 제외.
  - 이어서 `free-promo.mjs` href 갱신, `sync:public`, `__tests__/ui/free-promo.test.mjs` 갱신(`app${href}page.*`, `index.html`에 `href="${href}" data-cd-free-promo-item="${id}"`, `app/page.js`에 `<FreePromoBanner />`, `i18n/authored/freePromo-01.json` 12로케일 `freePromo.item.<id>`).
  - 검증: `node scripts/verify-seo-entity-registry.mjs`, `verify-adsense-readiness`, `verify:sitemap-drift`, `verify:public-mirror-fresh`, `verify:saju-fun-content-gate`, 새 경로 worker 라우팅 가로채임 여부(코드로 확인, 스테이징 실주소는 push 뒤 묶음 ⑤).

### 7. 영냥이·홈 구매 흐름 (GREEN, 표시 전용)
- `app/yeongnyangi/_components/NightHero.tsx` L36-37: 가격 두 줄 → "질문 상담 N원부터"(`starter.priceKRW`), 세부는 `NightPriceDetails`(L15-22).
- `app/yeongnyangi/_components/ProductGuide.tsx` L93: 죽은 `#founder-records` → `/yeongnyangi/1000-won-fortune/` FounderTrust(없으면 id 추가).
- `app/components/QuestionJourney.tsx` L16-30: "예시 먼저 보기" 링크(한국어만) + 해시가 `#yn-example`이면 `<details>` 여는 작은 스크립트.
- `app/page.js` L67-68: 영냥이 카드만 "N원부터"(catalog 값). 꿀꿀 카드엔 넣지 않음.
- 검증: `verify:home-identity`, `verify:hero-contrast`, `measure:touch-targets`, `verify:mobile-journeys`.

### 8. 결제 인접 화면 (마크업·이벤트만)
- `app/love-secret-ai/LoveSecretAiClient.tsx`: 모든 단계 상단에 작은 `PriceBadge` 요약(원천은 L2549 소개 가격과 동일, 마지막 단계 ~L2457-2483).
- `app/checkout/YeongnyangiCheckout.tsx`: 안심 문구·정책 링크(L144-145)를 결제 버튼(L141) 바로 아래로 이동.
- `checkout_opened`, `checkout_pg_opened`를 `service:'yeongnyangi'`로(기존 `FUNNEL_EVENTS` 이름을 `purchase-analytics` 테스트로 먼저 확인).
- 테스트: `purchase-analytics`, `checkout-method-order`. 검증: `verify:analytics-events`.

### 9. 공용 생성 진행 `GenerationProgress` + 4개 상품 이전 (상품마다 커밋)
- 새 `components/fortune/GenerationProgress.tsx` + `.module.css` + `useElapsed` 훅, `app/human-design/report/_components/GenerationProgress.tsx`를 본뜸(원본 유지). 상담가 장면은 기존 에셋(`ExpertCharacterStage`, `public/images/fortune-chat/moments/{yeoni,neo}-loading.webp`). 진행률은 실제 `completed/total` 또는 불확정 막대(가짜 % 금지). 단계 체크리스트, 경과 m:ss, "보통 N~M분". `aria-live="polite"`, reduced motion. 위 이어하기 문구 하나로 통일.
- 이전: ① love-secret 가짜 진행(~L1990-2006)→`completedGroups/totalGroups` ② new-year 패널(L600-660)을 `progress.completed/total`(L1659)로, "멈춰요"(L657) 수정 ③ life-book `waveProgress`(~L2001) ④ vedic `CosmosLoadingScreen` 가짜 막대(L2715-2800)→불확정+경과, `AnalysisBasisLoading` 유지, L545 "페이지를 닫지 말고" 수정.
- 생성·폴링·재개 로직 불변. 테스트: `paid-generation-timeout.behavior`, `paid-library-completion.behavior` 등 문구 단언 갱신.

### 10. 영냥이 대기 화면
- `app/yeongnyangi/_components/ReadingLoading.tsx`(27줄): 경과 시간 + "N번째 장 쓰는 중"(반말), `--yn-*`. 다음 장 제목은 `ChapterSpec.title`이 응답에 이미 있을 때만(API 불변). 등급별 "보통 몇 분"(확정 약속 금지). `Result.tsx` L226에서 prop 전달. 테스트: `yeongnyangi-*`.

### 11. 이미지 (필요할 때만)
- codex-image로 실제 빈 곳만: 명식·절기 상세 대표 그림, 필요하면 영냥이 후기 감사 장면. 원본 에셋 참조 첨부·나란히 비교. 영냥이는 원본 크기에서 귀 2개. 네오는 은발 인간 남성. 원본은 D:에, webp로 변환해 `public/`.

### 12. 마무리 (묶음 ⑤)
- `npm run check:fast` 1회, 관련 jest, `verify:hero-contrast`, `verify:mobile-detail-nonintrusive`, `measure:touch-targets`, `verify:analytics-events`.
- visual-checker 390·1440: `/`, 무료 배너, 신규 상세, `/love-secret-ai/`, `/new-year-ai-consultation/`, `/life-book-ai/`, `/yeongnyangi/`, `/checkout`(mock), 후기 작성기(mock), `/reviews?write=1&product=…`, 생성 대기(mock).
- SEO 동시 점검(title·description·H1·canonical·noindex·sitemap·구조화 데이터).
- `npm run check:pre-push` 후 내 커밋만 `git push origin HEAD:main`. 운영 승격 안 함.
- 문서 `status: done`, 워크트리 제거(다른 체크아웃에서 `npm run worktree:remove`), 임시 파일 삭제.

### 후속으로 보고만 (고치지 않음)
- 운영진 등록 후기에 "운영진 작성" 표시 없음.
- `/ggulggul/` `index.html`의 죽은 후기 위젯 스크립트·미사용 AggregateRating 빌더.
- 후기 POST rate limit 없음.

## 단계

### 묶음 ① 후기 (단계 1~4)
- [x] 1. 후기 서버 — SHA: 4462ff058
- [x] 2. 후기 작성기 — SHA: 3250dbb7e
- [x] 3. 결과 화면 reviewProductId — SHA: 70fe88e4d
- [x] 4. /reviews 미리 선택·보상 표시·기록함 연결 — SHA: 3af1f976b

### 묶음 ② 무료 배너·상세 (단계 6, 11 일부)
- [x] 6a. 배너 카드화(React·셸) — SHA: a631c8f7b (미러 정리 chore 4049d813b 별도)
- [x] 6b. 칩 연결·랜딩 액션 확인 — SHA: dd10f6156
- [x] 6c. 상세 페이지 9개·SEO·사이트맵 — SHA: 4dd33836e, 9b9a8e706, 3c8d5ac2f, 273aa5ce6, d1eba2bae (결과는 문서 끝 "6c-2 결과")
  - [x] 6c-1 레지스트리·컴포넌트·페이지 — SHA: 4dd33836e, 9b9a8e706 · indexable 기본값 수정 3c8d5ac2f
  - [x] 6c-2 SEO 등록·사이트맵·llms·칩 href·미러·테스트 — SHA: 273aa5ce6(색인 등록·사이트맵·llms·스킬 트리 문구 필터), d1eba2bae(칩 href·미러·테스트)
- [ ] 11a. 명식·절기 그림 — SHA:

### 묶음 ③ 신뢰·구매 흐름 (단계 5, 7, 8)
- [ ] 5. ReviewProof — SHA:
- [ ] 7. 영냥이·홈 — SHA:
- [ ] 8. 결제 인접 — SHA:

### 묶음 ④ 생성 진행 (단계 9, 10)
- [ ] 9. GenerationProgress + love-secret — SHA:
- [ ] 9. new-year — SHA:
- [ ] 9. life-book — SHA:
- [ ] 9. vedic — SHA:
- [ ] 10. 영냥이 ReadingLoading — SHA:

### 묶음 ⑤ 마무리 (단계 12)
- [ ] check:fast·검증 스크립트
- [ ] visual-checker 판정·수정
- [ ] SEO 점검
- [ ] push(origin main, 내 커밋만) — 범위:
- [ ] 문서 done·워크트리 정리

## 결과 기록

묶음마다 요약을 여기에 덧붙인다.

### 묶음 ① 후기 (단계 1~4) — 2026-11-13 완료, 미push

커밋
- `4462ff058` 단계 1: `worker/routes/reviews.js`
  - 공개 후기 `rewarded` (투영에 `reviewReward.granted`, 목록 캐시 키 v5)
  - 요약 `verifiedOnly` (키 `reviews:summary:v3:<productId>:<0|1>`)
  - 빠른 태그를 좋았던 점 3개와 아쉬웠던 점 3개로 균형 맞춤 (화이트리스트 9개, 옛 태그도 허용)
  - `worker/lib/record-library.js` 기록에 `reviewProductId` (카탈로그 slug) 추가
- `3250dbb7e` 단계 2: 새 파일 `app/components/review/review-ui.ts` 하나에 모음
  - 별점 라벨, 태그, slug 검증, `reviewWriteHref`, 초안 저장소 (`cd_review_draft_v1:<slug>`, 이 기기, 7일)
  - `QuickReviewComposer`가 바뀐 점
    - 상품 미리 선택, 초안 복원·저장, "N점 · 라벨" 표시
    - 태그를 두 그룹으로 나눔
    - S00 이벤트 6종 추가 (본문 미포함)
    - 접수 뒤 3단계 타임라인
  - `ReviewRewardBanner`가 `reviewProductId`를 받아 넘김
  - `ReviewsClient`는 태그 목록을 공용 모듈에서 가져옴
  - `styles/review-reward.css`와 `public/` 미러는 토큰만 사용
- `70fe88e4d` 단계 3: 결과 화면의 후기 배너 마운트 전부에 카탈로그 상품 id 리터럴을 넘김
  - 공유 컴포넌트 3종 (`PremiumResultShare`, `ConsultationShare`, `PaidResultImageGuide`)은 받은 값을 그대로 넘김
  - 정적 테스트가 모든 마운트와 호출부를 훑어 카탈로그 id인지 확인
- `3af1f976b` 단계 4: `/reviews/?write=1&product=<slug>`
  - 작성 가능한 상품일 때만 미리 고름. 비로그인 복귀 `next`에도 같은 slug만 실림
  - 카드에 `rewarded`면 "작성 보상(월정석) 지급 후기"를 토큰 스타일로 표시 (`reviewCardRewardLabel`, 문구는 `js/review-reward-copy.mjs` 한 곳)
  - 후기 링크가 상품을 넘김: 기록함은 `reviewProductId`, 영냥이 보관함은 `yeongnyangi`

테스트 (실제 수치)
- 단계 1
  - jest 6 suites, 94 passed
  - `verify:public-api-edge-cache` OK
- 단계 2
  - `node --test __tests__/ui/review-consent-flow.test.mjs` 9/9
  - `verify:analytics-events` 통과
  - `typecheck` 0 errors
- 단계 3
  - `review-reward-copy.test.mjs` 4/4
  - `typecheck` 0 errors
- 단계 4
  - `review-consent-flow` 10/10, `review-reward-copy` 5/5
  - `typecheck` 0 errors
- 묶음 끝 재실행
  - jest (`record-library`, `review-author-masking`, `review-create`) 3 suites, 49 passed
  - UI 두 파일 15/15
  - `verify:public-api-edge-cache` OK
  - `verify:analytics-events` 통과
- `check:fast`는 묶음 ⑤에서 돌린다.

설계와 다르게 한 점
- 태그 그룹 제목은 "좋았던 점"과 "아쉬웠던 점"이다.
- `review_write_start`는 별점·본문을 처음 직접 고칠 때만 보낸다 (태그 클릭과 복원은 제외).
- 기존 이벤트 `review_ui_view`, `review_rating_select`, `review_submit` 등은 그대로 둔다.
- 접수 타임라인은 이렇게 갈린다.
  - 공개 동의를 한 경우: "익명 공개·월정석 지급"
  - 동의하지 않은 경우: "내 후기에서 지급 상태 확인"으로 중립적으로 적는다. 비공개 후기의 지급 시점이 코드상 분명하지 않아서다.
- 문구가 실제로 보이지는 않지만, 정적 규칙을 단순하게 유지하려고 아래 두 화면에도 `reviewProductId`를 넘긴다.
  - astrology·vedic의 `ConsultationShare`
  - vedic `VedicAiClient`의 `PaidResultImageGuide`
- `/reviews` 카드 보상 문구는 ko 외 로캘에서 영어 한 줄로 나온다 (`paidReviewCopy`와 같은 규칙).
- `public/styles/review-reward.css`는 `sync:public` 대신 같은 내용을 복사했다. 편집 전 두 파일이 같은 것을 확인했다.
- `review-consent-flow` 테스트 하네스를 고쳤다.
  - `opts.url`, `opts.storage`, `opts.visible` 추가
  - 이벤트 캡처, `next/link` 목, `.css` empty 로더 추가
- `measure:touch-targets`는 staging을 재기 때문에 로컬 변경을 잴 수 없다. 묶음 ⑤에서 배포 빌드로 잰다.

후속 (고치지 않음)
- `app/records/view/SavedRecordClient.tsx`의 후기 링크에 `product=`가 없다 (설계 범위 밖).
- `QuickReviewComposer`의 옛 `review_ui_view` 관찰 effect는 `eligible.length`가 바뀌면 다시 구독돼 두 번 보낼 수 있다 (기존 동작).
- `/reviews` 요약 호출은 아직 `verifiedOnly`를 쓰지 않는다. 결정 지점 블록(단계 5)에서 쓴다.
- 기존 후속 3건은 위 "후속으로 보고만"에 그대로 있다.

### 묶음 ② A (단계 6a·6b) — 2026-11-13 완료, 미push

커밋
- `4049d813b` chore: `public/js/review-reward-copy.mjs` 미러가 묶음 ① `3af1f976b`의 `reviewCardRewardLabel`을 빠뜨려 `sync:public` 생성물만 맞췄다.
- `a631c8f7b` 단계 6a: 무료 배너 카드화
  - React `FreePromoBanner.tsx` + `free-promo-banner.module.css`, 셸 `lib/marketing/free-promo-shell.mjs` + `styles/home-funnel.css`, 미러(`index.html`, `public/{,en,ja,zh,zh-tw,static,ggulggul}/index.html`, `public/styles/home-funnel.css`).
  - 가운데 카드 `min(1080px,100%)`, `--cd-r-section`, 얇은 이중 테두리(`::after` inset 6px), 메타 알약(배지 | D-day) → 제목 → 기한. 연이·말풍선은 카드 안 오른쪽.
  - 컨테이너 쿼리(`fp`/`cdhpromo`): 700px↑ 머리 2열, 860px↑ 묶음 3열, 560px 미만 버튼 세로 꽉 참.
  - 칩: "이름 + →" 타일(최소 44px). 화살표는 평소 회색, hover·`aria-current`만 강조색. React는 `currentPath` prop(`SeoLandingTemplate`이 `page.path` 전달)으로 `aria-current="page"`.
  - 영냥이 변형은 `--fp-*`를 `--yn-*`로 다시 정의해 같은 구조·폭.
  - 셸 번역 `data-cd-trans`는 칩 이름 span에만 단다(링크에 달면 → 가 덮인다).
- `dd10f6156` 단계 6b: tarot·ziwei·sukuyo·vedic·astro·compat·humanDesign 칩을 설명 페이지로. 나머지 6개는 그대로. `policyKey`·`freeStart`는 유지.

테스트·검증 (실제 수치)
- `node --test __tests__/ui/free-promo.test.mjs __tests__/ui/home-funnel-free-prices.test.mjs`: 6a 뒤 10/10, 6b 뒤 11/11(새 테스트 1개: 칩 주소 표).
- `npm run typecheck`: 오류 0.
- `npm run verify:public-mirror-fresh`: 6b 커밋 뒤 OK(exit 0).
- 개발 서버 측정(1440·390, 모션 줄임):
  - home 카드 1080폭 좌우 180 여백, 3열; 390에서 350폭·1열·높이 약 1233px. 칩 최소 높이 44. 문서 가로 넘침 없음.
  - `/manse/` `aria-current`=manse. 6b 뒤 `/ziwei/` `/sukuyo/` `/vedic/` `/astrology/`에서 각각 자기 칩에 `aria-current`.
  - 셸 1440 1040폭(좌우 200), 390 328폭(좌우 31) — 바로 아래 `.cdh-free` 섹션과 같은 여백이라 그대로 둔다.
- 랜딩 시작 버튼(6b 확인, 개발 서버): `/?action=openTarotModal`·`openSukuyoModal`·`openAstroModal` → `LegacyHomeEntry`가 `/ggulggul/?action=…`로 넘기고 각 모달 오버레이가 열린다. `/?action=navigateToVedic` → `/vedic-astrology.html?lang=ko`. 끊긴 곳이 없어 수정하지 않았다. `/ziwei/`는 처음부터 `/ggulggul/?action=cdHomeZiweiEntry`.
- visual-checker(`.claude/agents/visual-checker.md` 절차를 general-purpose 에이전트로 실행 — 이 세션에 visual-checker 타입이 없었다)
  - r1: 홈 버튼 글자 대비 실패(라이트 2.33:1, 네오 1.63:1), 네오 회색 글자 4.61:1 경계, 잔가지 장식이 연이 귀에 약 8px. manse·셸은 통과.
  - r2(수정 뒤, 고정 오버레이 숨김): 10개 대상(home 라이트·네오, manse, 영냥이, 셸 × 1440·390) 모두 PASS. 홈 버튼 라이트 5.91:1, 네오 9.04:1, 네오 회색 글자 6.09:1, 현재 페이지 타일 테두리 6.41:1. 막는 결함 없음.

설계와 다르게 한 점
- 홈 `app/home-main.module.css`의 `.page :where(a){color:inherit}`가 배너 버튼 글자색을 덮어써서 선택자를 `.banner .cta`로 올렸다(홈 규칙은 그대로).
- 네오에서 `--cd-text-muted`만으로는 4.61:1이라 배너 안 `--fp-muted`를 `color-mix(--cd-text-muted 78%, --cd-text)`로 섞었다(`--cd-*` 재선언 아님).
- 셸 카드 모바일 여백은 React(16-20px)와 달리 31px. 셸 이웃 섹션과 맞춘 것이다.

함정 (6c가 알아 둘 것)
- `verify:public-mirror-fresh`는 작업 트리가 깨끗해야 판정한다. 커밋하고 돌린다.
- `sync:public`은 빌드 캐시 키(og 이미지·review-reward.css·카드 이미지 `?v=build-…`)도 바꾼다. 생성물은 함께 커밋한다.
- `free-promo.test.mjs`의 새 칩 주소 표는 6b 대상 7개 + 유지 6개만 고정한다. 6c가 fun·classic 9개 href를 바꿔도 이 표와 부딪히지 않는다.
- 랜딩 배너는 `FREE_PROMO_LANDING_PATHS`에 있는 페이지에만 뜬다. 지금 `/tarot/`, `/saju/compatibility/`, `/human-design/guide/`에는 배너가 없다(기존 동작). 6c 상세 페이지에 배너를 달면 `currentPath`를 넘긴다.
- 개발 서버: 워크트리에서 `npm run dev`(mock) → http://127.0.0.1:12828, 셸은 `/ggulggul/index.html`. 스크린샷 전에 쿠키 배너·하단 내비·Next 배지 같은 고정 요소를 숨겨야 배너가 가려지지 않는다.

후속 (고치지 않음, 사용자 판단)
- 모바일 홈 카드가 약 1233px로 길어 버튼이 아래로 밀린다. 모바일에서 2·3번째 묶음을 `<details>`로 접는 안(visual-checker 제안)은 설계에 없어 보류.
- 세 열의 타일 수 9/6/7로 열 높이가 고르지 않다.
- 셸 버튼 반짝이 아이콘 2.34:1(React 6.17:1), 영냥이 버튼 아이콘 2.93:1 — 장식이라 기준 밖이지만 두 화면이 어긋난다.
- 영냥이 390 말풍선에서 "열어 / 뒀어요!"가 갈라진다.
- 셸은 자체의 큰 옅은 가지 장식을 써서 React(작은 잔가지)와 톤이 조금 다르다. 연이 귀와 4-5px, 겹치지는 않는다.
- 홈 `.page :where(a){color:inherit}`는 넓은 규칙이라 홈 안 다른 링크 버튼도 같은 덮어쓰기를 겪을 수 있다.
- hover·focus 상태 색과 네오 테마 영냥이 화면은 정지 스크린샷으로 확인하지 못했다.

### 6c 착수 메모 (2026-11-13, 탐색만 끝남 · 코드 변경 없음)

6c·11a·배너 다듬기를 맡은 에이전트가 탐색 도중 컨텍스트 압축을 맞아, 전역 규칙대로 찾은 사실만 적고 돌아왔다. 다음 에이전트는 아래를 다시 찾지 않아도 된다. 기준 HEAD `2d9615887`, 작업 트리 깨끗, push 없음.

이번 범위(승인 범위 안, 2026-11-13 묶음 ② 지시 원문 요약)
- 6c: 무료 상세 페이지 9개 + SEO + 사이트맵 + 칩 href.
- 11a: 명식·절기 그림은 `public/`에 맞는 그림이 없을 때만 `codex-image`로 만든다(원본 D:, webp를 public/, 한국어 alt, 스타일은 `public/fuctionassets/*.webp`와 나란히 비교, visual-checker 절차).
- 배너 다듬기: 좁은 폭에서 주 버튼이 22개 타일 아래로 밀리지 않게(React `app/components/FreePromoBanner.tsx`·`free-promo-banner.module.css`, 셸 `lib/marketing/free-promo-shell.mjs`·`styles/home-funnel.css` 같은 방식), 영냥이 390 말풍선 "열어 / 뒀어요!" 갈라짐(keep-all/balance). 이후 sync:public, visual-checker 390·1440(배너 + 상세 2~3개).
- 끝나면 6c·11a 체크(배너 다듬기 메모), 결과 기록, `next:` → "묶음 ③ 단계 5(ReviewProof) 시작".
- 커밋 단위: 레지스트리+컴포넌트 / 페이지+SEO / 사이트맵·llms / 칩 href+미러 / 그림 / 배너. `npm run check:fast` 금지, 대상 테스트만.

확인한 사실
- 경로 9개: `/saju/four-cut/` `/saju/dopamine/` `/saju/teto-egen/` `/saju/t-test/` `/saju/lotto-ritual/` `/saju/ai-prompt-card/` `/saju/skill-tree/` `/saju/natal-chart/` `/saju/season-rhythm/`. app/·worker 라우팅 충돌 여부는 아직 확인하지 않았다(첫 확인 대상).
- CTA 액션 `cdOneStepFreeSajuEntry`는 실제 셸 함수다(`js/destiny-profile.js:11057`, 테스트 `direct-fortune-entry.behavior.test.js`·`first-visit-guide.test.js`). CTA 주소 `/ggulggul/?action=cdOneStepFreeSajuEntry`.
- 칩 9개는 `lib/marketing/free-promo.mjs`에서 `...SAJU`(href 없음)로 펼쳐진다. fun 7개(fourCut·dopamine·hormone·tTest·lotto·aiPrompt·skillTree) + classic 2개(natal '명식·12신살', seasonRhythm '절기 리듬', 둘 다 policyKey `saju_natal_reading`). `href`만 더하고 policyKey·freeStart는 둔다. `freePromoItemHref`는 `item.href || '/ggulggul/?action=' + item.action`. "사주 카드 칩은 독립 주소가 없어 사주 입력으로 보낸다"는 주석을 고친다. `FREE_PROMO.endsAt` = `2027-02-12T23:59:59+09:00`(배지 "2027년 2월 12일까지 무료"는 여기서 계산).
- AppChrome 등록 방식: `/saju/destiny-bias`·`/saju/career-style`는 `CHROMELESS_ROUTES`(L34~)에 있다. CHROMELESS에만 넣으면 전역 헤더·푸터·하단 탭바가 빠지고 `FeatureBackHomeNav`(뒤로·홈)가 뜬다(`/saju/career-style`는 자체 내비라 `FEATURE_NAV_SELF_MANAGED_ROUTES`에도 있음). 9개는 `/saju/destiny-bias`처럼 CHROMELESS에만 넣는 안이 맞다. 단 푸터가 빠지므로 본문 글자 수 측정은 푸터 없이 해야 한다.
- 문구 원천(복붙 금지, import): `lib/marketing/feature-marketing-copy.generated.json`의 `items[키].copy` — 키 `rpt_sajuFourCutCard` `rpt_dopamineCard` `rpt_hormone-vibe-section` `rpt_tTestCard` `rpt_lottoCard` `rpt_aiPromptCard` `rpt_skillTreeCard`. 필드 analysisSteps[{label,detail}]·answersQuestions·badge·ctaLabel·faq[{q,a}]·feats·headline·painPoints·previewText·recommendedFor·subheadline·trustNotes·unlockBenefits(skillTree는 outline·outlineImage·receives·valueCompare 추가). 최상위 `trustNotes.free` = "운세 결과는 참고용이며…".
  - 로또: 문구가 이미 "당첨을 예측하지 않으며", "당첨을 보장하지 않습니다"라 그대로 써도 된다. 페이지 자체 문구는 의식·재미로만.
  - T 테스트: FAQ·trustNotes에 "별도 잠금 해제 후 열립니다"가 있다. 잠금 키 `sukuyo-extreme-t-relationship`이 지금 무료 목록에 있으니, 홍보 기간 문구와 어긋나지 않는지 보고 필요하면 그 항목만 걸러 낸다(원천 JSON은 고치지 않음).
- 무료 판정 원천: `lib/payment/free-fortune-policy.mjs` `FREE_FORTUNE_FEATURE_KEYS`(saju_natal_reading·saju_fun_shared·rpt_skillTreeCard·fun.quantumLotto.ritualReport·tetogen_deep_report·sukuyo-extreme-t-relationship 포함). 가격·결제 로직은 건드리지 않고 가격도 적지 않는다.
- 명식 페이지 사실(엔진): `js/saju-engine.js` renderManse(약 L9880~9925) — 시주·일주·월주·년주 네 기둥, 각 천간·지지에 십성 배지(일간은 "일간"), 음양·오행, 기둥마다 12신살 한 줄, 글자를 누르면 설명. 별신살 칩과 자리 표시, 없으면 "원국에서 직접 확인되는 별신살이 없어요. 없는 것 또한 부족함이나 불운을 뜻하지 않아요." `js/core/saju/manse-shinsal.js`는 "해석문이나 길흉 판정은 만들지 않고 이름과 자리만": 12신살(겁살·재살·천살·지살·년살·월살·망신살·장성살·반안살·역마살·육해살·화개살, 연지 기준), 별신살(도화살·홍염살·천을귀인·문창귀인·태극귀인·월덕귀인·천덕귀인·괴강살·백호살·양인살·공망·귀문관살·원진살). 원국 해석 묶음(`_CD_NATAL_STUBS` 약 L9332~9343, 서버 `worker/lib/saju-section/report.js` L451~457 → `paid-natal-reading.src.js`): 일주 풀이(일간·일지 성향, 일·재물·관계, 조언), 십성 풀이(많은·모자란 기운, 십성 장면), 조후 풀이(한난조습, 맞는 계절·환경, 컨디션), 억부 풀이(센·약한 편, 살리는·조심할 기운), 절기 풀이.
- 절기 페이지 사실: `index.html` L18579~18584 terms24Card "내 절기 리듬 (月令)". `paid-natal-reading.src.js` L487~720 — 월지별 계절(寅卯 봄 목왕절, 辰 봄의 토왕 환절기, 巳午 여름 화왕절, 未 여름 토왕 환절기, 申酉 가을 금왕절, 戌 가을 토왕 환절기, 亥子 겨울 수왕절, 丑 겨울 토왕 환절기), "마음을 여는 속도"(봄·여름 빠름 / 가을·겨울 느림 / 환절기 조율), 절입 구간 안 위치 초입(28% 미만)·중반·마무리(72% 초과)와 진행 막대, 절입 경계 하루 안 출생은 주의 문구, 출생 시각 모르면 막대·위치 없이 월령·계절 해석 + 24절기표만. 영역 카드: 타고난 성향·사람을 받아들이는 방식·연애할 때·일과 돈·컨디션(조후 메모). 근거 칩: 월주·월령·절입·조후·보완 기운·주의 리듬. 24절기표(`<details>`)에 내 생월 절입 강조. 계절 그림 `/images/saju/nature/{spring,summer,autumn,winter}-{480,960}.webp`, 연이 `yeoni-greet.webp`.
- 그림 후보: fun 7개는 `public/fuctionassets/{사주 네컷,도파민 중독,테토VS에겐,극T테스트,사주 로또,사주 프롬프트,RPG 인생 스킬트리}.webp`(+ `public/images/feature-details/life-skill-tree-*.webp`, `public/images/psychotest/bmovie-v1/dopamine-*.webp`). 명식·절기용 fuctionassets 톤 그림은 없다. 후보 `public/feature-details/assets/manse-*.webp`, `public/images/feature-details/manse-hero-v2.webp`, `/images/saju/nature/*`는 톤이 달라 11a 생성이 필요할 가능성이 높다(나란히 비교 후 결정).
- 재사용할 부품: `app/components/SeoLandingTemplate.jsx` — `FOCUS_RING`, `SectionHead`, 빵부스러기 nav(min-h-11), h1 `font-[family-name:var(--font-serif)] text-[clamp(2.15rem,6vw,4rem)]`, 주 버튼 `bg-[var(--cd-primary)] text-[var(--cd-primary-ink)] min-h-12`, 단계 ol·결과 ul·FAQ `<details>`, `ContentIntegrityNote tone="light"`, main `bg-[var(--cd-bg)] px-4 pb-16 pt-6`, 컨테이너 `max-w-5xl`, JSON-LD는 `serializeJsonLd`(lib/seo/json-ld.mjs) + `buildBreadcrumbJsonLd`·`buildWebPageJsonLd`·`buildFaqPageJsonLd`(lib/structured-data.ts L137·L150·L255). 부품이 파일 안 지역 함수라 export하거나 공용 파일로 빼야 재사용된다(평행 시스템 금지). 페이지 패턴은 `app/saju/compatibility/page.js`(`buildSeoMetadata({ path, hreflang, title, description, keywords })`, lib/seo.ts L71).

아직 읽지 않은 것(다음 에이전트 첫 확인)
- `lib/seo/entity-registry.mjs` SEO_ROUTE_PROFILES 형식, `scripts/generate-sitemap.mjs` coreRoutes(약 L99), 애드센스 준비 검사 스크립트의 글자 수 계산(1,300자 기준과 푸터 포함 여부), `scripts/verify-saju-fun-content-gate*`, worker `/saju/*` 라우팅·`_routes`·redirects.
- `__tests__/ui/free-promo.test.mjs`(href마다 `app${href}page.*`, index.html `href="${href}" data-cd-free-promo-item="${id}"`, `i18n/authored/freePromo-01.json` 12개 로케일 `freePromo.item.<id>`를 요구).
- 배너 파일 4개와 `.claude/agents/visual-checker.md`, `codex-image` 스킬.

### 6c-2 착수 메모 (2026-11-13, 6c-1 끝)

6c-1 결과. 커밋 `4dd33836e`(레지스트리·공용 화면), `9b9a8e706`(페이지 9개·AppChrome), `3c8d5ac2f`(indexable 기본값 수정). push 없음.

경로 충돌 확인(끝남): 9개 경로 모두 문제없다. 기존 `app/` 폴더가 없고, 다음 어디에도 가로채는 규칙이 없다.
- `public/_redirects`, `public/_routes.json`
- `public/_worker.js`의 리다이렉트 맵, `public/_headers`
- `lib/seo/index-policy.mjs`, `next.config.mjs`의 rewrites
- `worker/index.js`(`/api/*`만 처리)

`worker/routes/fortune.js`의 `/saju/ai-prompt`는 API 경로라 페이지와 상관없다.

파일
- `lib/marketing/free-feature-details.mjs`: 레지스트리.
- `app/components/free-feature/FreeFeatureDetail.tsx`: 서버 컴포넌트. 화면은 히어로(무료 배지, h1, 시작 버튼, "사주 결과 화면의 'OO' 카드에서 열려요."), 미리 보기, 열면 볼 수 있는 것, 읽는 순서, 이런 분께 맞아요, 자주 묻는 질문(`<details>`), 시작 카드, 함께 열려 있는 무료 기능 8개 링크, ContentIntegrityNote 순서다. JSON-LD는 WebPage·BreadcrumbList·FAQPage이고, Offer와 isAccessibleForFree는 없다.
- `app/components/seo-landing-parts.jsx`: FOCUS_RING·MoonMark·SectionHead. SeoLandingTemplate에서 그대로 옮겼고 동작은 같다.
- `app/saju/<slug>/page.tsx` 9개: `buildSeoMetadata({ path, title, description, keywords, noindex: !detail.indexable })`.
- `app/components/AppChrome.tsx`: CHROMELESS_ROUTES에 9개를 `/saju/career-style` 다음에 넣었다. destiny-bias처럼 FeatureBackHomeNav만 뜬다.

레지스트리 필드
- `id`: free-promo 칩 id.
- `slug`
- `path`: `/saju/<slug>`. 끝 슬래시 없음. metadata와 JSON-LD에 쓴다.
- `href`: `/saju/<slug>/`. 링크와 칩에 쓴다.
- `name`
- `cardName`: 결과 화면 카드 이름.
- `copyKey`: generated.json `items` 키. 명식·절기는 `copyKey` 대신 `copy`(직접 쓴 문구)를 쓴다.
- `excludePhrases`: 극T `['잠금 해제','라이트 사주 풀이']`, 인생 스킬 트리 `['노력으로 변할']`(6c-2에서 추가).
- `h1`, `title`, `description`, `keywords`
- `image`: `{src,alt,width:1672,height:941}` 또는 명식·절기는 `null`.
- `heroGlyphs`: 명식·절기의 글자 히어로.
- `indexable`: 기본 true. 항목에 `indexable: false`만 적으면 그 페이지가 noindex가 된다.

export: `FREE_FEATURE_DETAILS`, `FREE_FEATURE_DETAIL_CTA_HREF`(`/ggulggul/?action=cdOneStepFreeSajuEntry`), `getFreeFeatureDetail(slug)`(모르는 slug면 throw), `freeFeatureFreeUntilLabel(endsAt = FREE_PROMO.endsAt)`("2027년 2월 12일까지 무료"), `resolveFreeFeatureCopy(detail)`.

`resolveFreeFeatureCopy`가 하는 일
- 원천이 없으면 throw.
- `excludePhrases`가 든 항목을 거른다.
- FAQ "어디에서 열 수 있나요?"를 덧붙인다.
- trustNotes에 `trustNotes.free`를 합치고 중복을 뺀다.

id와 slug 대응: fourCut→four-cut, dopamine→dopamine, hormone→teto-egen, tTest→t-test, lotto→lotto-ritual, aiPrompt→ai-prompt-card, skillTree→skill-tree, natal→natal-chart, seasonRhythm→season-rhythm.

검증
- `npm run typecheck`: 통과.
- 서버: `next dev`를 직접 띄웠다(127.0.0.1:12931).
  - 12828은 다른 프로세스가 쓰고 있어 건드리지 않았다.
  - `npm run dev`는 영냥이 연재 복사 선단계가 `public/`에 파일을 써서 쓰지 않았다.
- 결과: 9개 모두 200이고 h1이 정상이다.
  - JSON-LD는 WebPage·BreadcrumbList·FAQPage에 레이아웃 전역 `@graph` 1개가 더해진다.
  - robots `index, follow`. canonical `https://code-destiny.com/saju/<slug>/`.
  - Offer와 isAccessibleForFree 없음.
  - 서버 HTML에 `<footer>` 없음. 히어로 그림 200.
- 서버는 중지했고 포트가 풀린 것까지 확인했다.

본문 글자 수
- 범위: `<main data-free-feature-detail>` 안. script를 빼고, 태그를 지우고, 공백을 정리했다.
- 빵부스러기, 버튼, 다른 무료 기능 링크가 들어 있다. 푸터는 없다.

| slug | 공백 포함 | 공백 제외 |
|---|---:|---:|
| four-cut | 1,731 | 1,280 |
| dopamine | 1,829 | 1,377 |
| teto-egen | 1,611 | 1,201 |
| t-test | 1,600 | 1,194 |
| lotto-ritual | 1,661 | 1,234 |
| ai-prompt-card | 1,739 | 1,293 |
| skill-tree | 1,766 | 1,325 |
| natal-chart | 1,931 | 1,463 |
| season-rhythm | 1,958 | 1,455 |

공백을 포함하면 9개 모두 1,300자 이상이다. 공백을 빼면 5개(four-cut·teto-egen·t-test·lotto-ritual·ai-prompt-card)가 1,300자 미만이다. 애드센스 준비 검사 스크립트가 어떻게 세는지(공백 포함 여부, 범위) 먼저 읽고 indexable을 정한다.

6c-2에서 할 것(승인 범위 안, 이 순서 권장)
1. `lib/seo/entity-registry.mjs` SEO_ROUTE_PROFILES에 9개를 넣는다. 형식을 먼저 읽는다.
2. `scripts/generate-sitemap.mjs` coreRoutes(약 L99)에 넣는다. 가능하면 레지스트리를 읽어 `indexable`인 것만 넣는다.
3. llms 등록.
4. `lib/marketing/free-promo.mjs` 칩 9개에 `href`를 더하고(레지스트리 `href`와 같은 값) "단독 주소가 없어 사주 입력으로 보낸다" 주석을 고친다. policyKey·freeStart는 그대로 둔다.
5. sync:public을 한 뒤 `__tests__/ui/free-promo.test.mjs`를 통과시킨다. 요구 사항은 세 가지다.
   - `app${href}page.*`: page.tsx라 통과할 것으로 본다.
   - index.html의 `href="${href}" data-cd-free-promo-item="${id}"`
   - `i18n/authored/freePromo-01.json`에 12개 로케일 `freePromo.item.<id>`
6. "app 페이지는 모두 사이트맵에 있어야 한다" 같은 테스트가 있으면 함께 맞춘다.
7. 글자 수 기준에 따라 항목별 `indexable`을 정한다. 사이트맵도 같은 값을 읽게 한다.
8. OG 그림은 지금 넘기지 않는다(기본 OG).
   - fuctionassets는 1672×941인데 buildSeoMetadata는 1200×630을 고정으로 적는다. 그대로 넘기면 크기 정보가 틀린다.
   - 11a와 함께 정한다.

함정·후속
- skillTree 원천 trustNotes에 "고정값"과 "노력으로 변할 수 있습니다"가 함께 있어 서로 어긋나 보인다. 원천 JSON 문구 문제이고, 상세 페이지에는 그대로 나온다. → 6c-2에서 상세 페이지만 걸렀다(아래 "6c-2 결과").
- alt는 그림을 열어 보지 않고 "사주 결과 화면의 'OO' 카드 대표 그림"으로 적었다. 11a에서 그림을 볼 때 구체적으로 고친다.
- fuctionassets webp는 1672×941, 약 200KB다. 히어로에서 `fetchPriority="high"`로 불러온다.
- FreePromoBanner는 상세 페이지에 붙이지 않았다(배너 다듬기 때 판단).
- 레지스트리 JSON은 `with { type: 'json' }`로 import한다(wordpress-publications.mjs 선례). typecheck와 next dev 모두 통과했다.

### 6c-2 결과 (2026-11-13 완료, 미push)

커밋
- `273aa5ce6` 색인 등록·사이트맵·llms + 인생 스킬 트리 문구 필터
- `d1eba2bae` 칩 9개 href·index.html/public 미러(sync:public)·테스트

색인 판단 규칙
- `scripts/verify-adsense-readiness.mjs` `getVisibleText`(L617-660)를 그대로 썼다.
  - 범위는 페이지 전체다. script·style·svg 블록을 지우고, 태그는 공백으로 바꾸고, `&nbsp; &amp; &lt; &gt;`를 풀고, 공백을 1칸으로 줄인 뒤 trim한다. 공백도 센다.
- 이 스크립트의 `verifySitemap`에서 글자 수 기준은 주석 처리돼 있다(`// TODO: enforce visibleText >= 900`, L32 "Length is diagnostic").
  - 실제로 막는 조건은 noindex 없음, title 10자 이상이면서 사이트 이름만 아닐 것, description 50자 이상, 사이트맵 안 title·description 중복 없음이다.
- `scripts/generate-adsense-route-audit.mjs`는 같은 방식으로 센다. 900 미만은 "부족", 1,200 미만은 "보강 권장", 1,200 이상은 "충분"이다.
- 판단: 9개 모두 1,668~2,029자라 "충분"이다. 모두 색인(`indexable` 기본 true)하고, noindex는 없다. 채우기용 문장은 넣지 않았다.

실측값 (개발 서버 렌더, 모두 200·`index, follow`·footer 없음, 스킬 트리는 필터 뒤)

| slug | 전체 공백 포함(스크립트 방식) | 전체 공백 제외 | main 공백 포함 | 판단 |
|---|---:|---:|---:|---|
| four-cut | 1,799 | 1,336 | 1,761 | 색인 |
| dopamine | 1,898 | 1,433 | 1,859 | 색인 |
| teto-egen | 1,683 | 1,260 | 1,641 | 색인 |
| t-test | 1,668 | 1,249 | 1,630 | 색인 |
| lotto-ritual | 1,734 | 1,293 | 1,691 | 색인 |
| ai-prompt-card | 1,813 | 1,353 | 1,769 | 색인 |
| skill-tree | 1,813 (필터 전 1,838) | 1,364 | 1,771 | 색인 |
| natal-chart | 2,010 | 1,529 | 1,971 | 색인 |
| season-rhythm | 2,029 | 1,512 | 1,988 | 색인 |

- 공백을 빼면 teto-egen·t-test·lotto-ritual이 1,300자 미만이다. 스크립트는 공백을 빼고 세지 않으므로 판단에는 쓰지 않았다.
- `lib/seo/index-policy.mjs`의 "문장급 본문 1,300자"는 과거 메모다.
- 문구를 줄이면 다시 재고, 기준에 못 미치면 레지스트리에서 `indexable: false`로 둔다. 그러면 noindex가 되고 사이트맵에서도 자동으로 빠지므로 레지스트리 프로필도 함께 뺀다.

SEO 등록
- `lib/seo/entity-registry.mjs`의 `/saju/ten-gods` 뒤에 9개를 리터럴로 넣었다. free-feature-details는 import하지 않았다(lastmod 서명 범위가 넓어진다).
- primary 9개: 사주 네컷 / 사주 도파민 / 테토 에겐 사주 / 극T 테스트 / 사주 로또 / 사주 AI 프롬프트 / 인생 스킬 트리 / 사주 12신살 / 사주 절기.
  - 기존 primary와 겹치지 않는다.
  - 명식은 /saju "사주 원국 보기"와 /saju/guide를 잡아먹지 않도록 secondary로 내렸다.
- `verify-seo-entity-registry` PASS profiles=72(63에서 늘었다).
- 렌더된 meta keywords 첫머리가 레지스트리 primary로 바뀌었다(mergeKeywords 중복 제거).
- 사이트맵: `scripts/generate-sitemap.mjs` coreRoutes에 `FREE_FEATURE_DETAILS.filter(indexable)`를 넣었다(monthly, 0.75).
  - 1,081 URL이다. sitemap.xml·sitemap-ko.xml·public 사본과 lastmod 원장에 9개(2026-11-13)가 추가됐다.
  - 기존 경로는 서명만 바뀌었고 날짜는 그대로다.
- llms: llms-full에 9줄이 자동으로 실렸고, llms.txt는 그대로다.

칩
- `lib/marketing/free-promo.mjs` 9개를 `href: '/saju/<slug>/'`로 바꿨다. `SAJU` 상수는 지웠고, `FREE_PROMO_SAJU_ACTION`은 연이·상세 CTA가 쓰므로 남겼다.
- policyKey는 그대로다.
- free-feature-details가 free-promo를 import하므로 free-promo는 주소를 리터럴로 두고, 테스트가 두 href가 같은지 확인한다.

인생 스킬 트리 문구
- 원천 FAQ "수치가 노력으로 바뀌나요?"의 답은 "원국에서 나오는 고정값"이다.
- 원천 trustNotes "능력치는 개인의 노력으로 변할 수 있습니다"는 같은 화면에서 이와 어긋난다.
- 계산 사실인 FAQ를 두고, trustNotes는 `excludePhrases: ['노력으로 변할']`로 상세 페이지에서만 걸렀다. 원천 JSON은 고치지 않았다.

검증 (실측)
- `verify-seo-entity-registry` PASS 72
- `sitemap:generate` 1,081 URL / `verify:sitemap-drift` OK
- `verify:sitemap` OK 1,081
- `verify:adsense-route-policy` OK
- `generate-llms-txt --check` OK
- `node --test` free-promo + home-funnel-free-prices: 11/11
- 홈 정적 테스트 5개 파일(home-banner-typography·home-entry-card-ownership·home-profile-fortune-entry·international-hub-links·organic-acquisition): 27/27
- `typecheck` exit 0
- `verify:saju-fun-content-gate` 통과(6미러)
- `verify:public-mirror-fresh` OK(커밋 뒤)
- 돌리지 않음:
  - `verify:sitemap-canonical`·`verify:seo-heading-integrity`·`verify:adsense-readiness`: dist/·out/ 빌드가 필요하다.
  - `check:fast`: 금지.

함정
- 이 워크트리의 .mjs는 CRLF다(autocrlf). node로 문자열을 바꿀 때 `\n`만 찾으면 실패한다. Edit 도구를 쓰거나 `\r\n`을 쓴다.
- free-promo.mjs·free-feature-details.mjs를 고치면 그 모듈을 import하는 라우트(/, 각 랜딩, 상세 9개 등 36~43개)의 lastmod 원장 서명이 바뀐다.
  - 고친 뒤 `npm run sitemap:generate`를 다시 돌려 원장을 같이 커밋해야 `verify:sitemap-drift`가 통과한다.
  - 날짜는 같은 날이면 그대로다.
- free-promo.mjs는 public 미러가 아니다. 칩 주소가 들어가는 곳은 `index.html`(build-home-funnel → sync:public)과 React `FreePromoBanner`다.

후속
- OG 이미지: 상세 9개는 기본 OG다. fuctionassets(1672×941)는 buildSeoMetadata의 1200×630 고정 표기와 맞지 않는다. 11a에서 함께 정한다.
- 셸 사주 결과 카드(스킬 트리)에는 원천 trustNotes의 어긋난 문장이 그대로 있다. 원천(셸 정본) 문구를 고치는 일은 별도 판단이 필요하다.
- origin/main이 이 브랜치 기준보다 2커밋 앞서 있다. 승격 때 리베이스 뒤 `sitemap:generate`·`sync:public`을 다시 돌린다.
