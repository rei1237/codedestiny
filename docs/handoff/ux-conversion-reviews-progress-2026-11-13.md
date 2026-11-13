---
status: in-progress
updated: 2026-11-13
next: 묶음 ② 단계 6a(무료 배너 카드화) 시작
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
- 마지막 커밋: 단계마다 아래 표에 적는다. 묶음 ① 끝 코드 커밋 `3af1f976b`(미push).

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
- [ ] 6a. 배너 카드화(React·셸) — SHA:
- [ ] 6b. 칩 연결·랜딩 액션 확인 — SHA:
- [ ] 6c. 상세 페이지 9개·SEO·사이트맵 — SHA:
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
