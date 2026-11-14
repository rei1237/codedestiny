---
status: done
updated: 2026-11-14
next: 완료 — 운영 승격은 사용자 1회 승인 필요
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
- 기준: origin/main `a5d6f5814e996f7bc5292e40042c7a7fdb572421` (2026-11-14 리베이스, 이전 기준 `02476159e`, 리베이스 전 끝 `e17001343` = 백업 브랜치 `backup/ux-conversion-pre-rebase-20261114`)
- node_modules는 정션, `.env.local`·`.env.cloudflare.local`은 링크(건드리지 않는다).
- 워크트리 제거: 다른 체크아웃에서 `npm run worktree:remove -- 'D:\Development\codedestiny-worktrees\ux-conversion-20261113-215142'` (git worktree remove 금지 — 긴 경로 고아 폴더).
- 마지막 커밋: 단계마다 아래 표에 적는다. 묶음 ① 끝 코드 커밋 `3af1f976b`(미push). 묶음 ② 6b 끝 코드 커밋 `dd10f6156`(미push). 묶음 ② 6c-1 코드 커밋 `4dd33836e`·`9b9a8e706`·`3c8d5ac2f`(미push). 묶음 ② 6c-2 코드 커밋 `273aa5ce6`·`d1eba2bae`(미push). 묶음 ② 11a 코드 커밋 `81b1be43d`(미push). 묶음 ② 배너 모바일 다듬기 `c7edcc6c3`·사이트맵 원장 `a10578ada`(미push). 묶음 ③ 단계 5 ReviewProof `f554b8920`(미push). 단계 5 남은 일 `c674869d9`(보존 기준 해시)·`f6768d579`(`/reviews/?product=` 필터), 묶음 ③ 단계 7 `008432add`(미push). 묶음 ③ 단계 8 `efafe2738`(미push) — 묶음 ③ 완료. 묶음 ④ 단계 9 공용 GenerationProgress `1c0e07c2b`·연애 비책 이전 `98ca36812`·신년운세 `6c48059f9`·인생의 책 `27e2c5eb2`·베다 `be646a9f1`(미push). 묶음 ④ 단계 10 영냥이 대기 화면 `b397bcddf`·공용 막대 테두리/줄바꿈 `d0d6f2144`(미push) — 묶음 ④ 완료.

## 승인 상태 (사용자 원문, 2026-11-13)

- 원 요청: "너는 최고의 ui/ux 디자이너이자 사용자 경험 전문가야 내 서비스의 서비스 진입점부터 시작해서 꿀꿀운세, 운세보는 영냥이 서비스의 ui/ux가 자연스럽게 구매까지 이어질 수 있도록하고 후기를 통해서 신뢰감을 높힐 수 있도록해줘 그리고 후기를 쓰기도 더 편하고 직관적으로 개선해주고 llm 기능들의 운세 생성 과정 ui/ux를 개선해줘 필요하다면 이미지를 생성해도 좋아 완벽까지 진행할때까지 끊지말고 압축하면서 끝까지 작업을 완수해줘"
- 추가 요청: "특히 첨부한 부분은 좀 더 고급스럽게 개선해주도록하고 각 기능에 맞는 상세 페이지가 기존에 있다면 표시하거나 만들어줘 데스크탑에서 가로로 너무 길지 않게 카드처럼 고급스러운 느낌으로 개선해줘" (첨부: `/` 무료 배너 "3개월 한정 · 지금만 전부 무료", 칩 3묶음·연이·D-91·CTA 2개)
- push: "스테이징까지 push (Recommended)" — 단계별 커밋, **내 커밋만** `git push origin HEAD:main`. 운영 승격은 **승인 안 됨**(별도 1회 승인 필요).
- 후기 보상 표시: "카드마다 작은 표시 (Recommended)" — 공개 API에 읽기 전용 `rewarded` boolean 추가, 카드마다 작은 표시.
- 계획(아래 설계) 승인됨(ExitPlanMode).
- 이미지 생성: 허용(필요한 곳만, codex-image).
- **범위 밖으로 넘김(2026-11-13 23:40):** 사용자가 이 세션에 잘못 보낸 "가장 급한 문제" 목록(구매 문구 모순·화폐 단순화·브랜드 통일·홈 title/H1·robots `/points/`·사이트맵 lastmod·`?action=` URL·검수 절차)과 브랜드 통일 결정("꿀꿀 운세 안의 영냥이 상담")은 사용자 지시("아 이 세션에 시키려는게 아니였는데 다른 SEO, AEO, GEO 수정 중인 세션에 전달하도록해줘")로 SEO·AEO·GEO 세션에 넘겼다. **이 워크트리에서는 손대지 않는다.**

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
- **다른 세션과 겹치는 곳:** SEO 세션이 같은 시기에 브랜드 이름, 홈 title/H1(`app/page.js`·`lib/seo/home-discovery.mjs`), 무료 배너 문구(`lib/marketing/free-promo.mjs`), robots·사이트맵 lastmod, `?action=` 링크, `/yeongnyangi/1000-won-fortune/` 문구를 고친다.
  - 이 워크트리에서는 브랜드 표기, 배너 문구, 사이트맵 날짜 로직을 바꾸지 않는다.
  - 묶음 ⑤에서 push하기 전에 `git fetch` 후 origin/main 위로 리베이스한다. 문구·브랜드 충돌은 origin/main(SEO 세션) 쪽을 따른다.
  - 리베이스한 뒤 생성물은 `npm run sitemap:generate`, `npm run llms:generate`, `npm run sync:public`으로 다시 만든다.
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
- [x] 11a. 명식·절기 그림·상세 9개 OG — SHA: 81b1be43d (결과는 문서 끝 "11a 결과")
- [x] 배너 모바일 다듬기(390 주 버튼 위치·말풍선 조판·반짝이 대비) — SHA: c7edcc6c3, 사이트맵 원장 a10578ada (결과는 문서 끝 "배너 모바일 다듬기 결과")

### 묶음 ③ 신뢰·구매 흐름 (단계 5, 7, 8) — 완료(2026-11-14)
- [x] 5. ReviewProof — SHA: f554b8920 (결과는 문서 끝 "묶음 ③ 단계 5 ReviewProof 결과")
- [x] 7. 영냥이·홈 — SHA: 008432add · 단계 5 남은 일 c674869d9, f6768d579 (결과는 문서 끝 "묶음 ③ 단계 7 결과")
- [x] 8. 결제 인접 — SHA: efafe2738 (결과는 문서 끝 "묶음 ③ 단계 8 결과")

### 묶음 ④ 생성 진행 (단계 9, 10) — 완료(2026-11-14)
- [x] 9. GenerationProgress + love-secret — SHA: 1c0e07c2b, 98ca36812 (결과는 문서 끝 "묶음 ④ 단계 9 결과")
- [x] 9. new-year — SHA: 6c48059f9
- [x] 9. life-book — SHA: 27e2c5eb2
- [x] 9. vedic — SHA: be646a9f1
- [x] 10. 영냥이 ReadingLoading — SHA: b397bcddf, d0d6f2144 (결과는 문서 끝 "묶음 ④ 단계 10 결과")

### 묶음 ⑤ 마무리 (단계 12)
- [x] 리베이스(origin/main a5d6f5814)·재생성 — SHA: ca4d878b6, 3f3f5476b (결과는 문서 끝 "묶음 ⑤ 단계 12 결과 — 리베이스·검사")
- [x] check:fast·검증 스크립트
- [x] visual-checker 판정·수정 — 회귀 없음, 수정 커밋 없음(문서 끝 "묶음 ⑤ 단계 12 결과 — 실화면·push")
- [x] SEO 점검(정적)
- [x] push(origin main, 내 커밋만) — 범위: b69eea884..3b82aa2ce(본편), fece5889d..eeebfadaf·b67b027f3..e1fc882d7(CI·스테이징 수정)
- [x] 문서 done·워크트리 정리 — 백업 브랜치 삭제, 워크트리는 지시대로 남김

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
  - 11a 주의: Edit 도구는 CRLF 파일 전체를 LF로 바꿨다. 고친 뒤 줄 끝을 확인한다("11a 결과" 함정).
- free-promo.mjs·free-feature-details.mjs를 고치면 그 모듈을 import하는 라우트(/, 각 랜딩, 상세 9개 등 36~43개)의 lastmod 원장 서명이 바뀐다.
  - 고친 뒤 `npm run sitemap:generate`를 다시 돌려 원장을 같이 커밋해야 `verify:sitemap-drift`가 통과한다.
  - 날짜는 같은 날이면 그대로다.
- free-promo.mjs는 public 미러가 아니다. 칩 주소가 들어가는 곳은 `index.html`(build-home-funnel → sync:public)과 React `FreePromoBanner`다.

후속
- ~~OG 이미지: 상세 9개는 기본 OG다. fuctionassets(1672×941)는 buildSeoMetadata의 1200×630 고정 표기와 맞지 않는다. 11a에서 함께 정한다.~~ → 11a에서 해결(`81b1be43d`, 아래 "11a 결과").
- 셸 사주 결과 카드(스킬 트리)에는 원천 trustNotes의 어긋난 문장이 그대로 있다. 원천(셸 정본) 문구를 고치는 일은 별도 판단이 필요하다.
- origin/main이 이 브랜치 기준보다 2커밋 앞서 있다. 승격 때 리베이스 뒤 `sitemap:generate`·`sync:public`을 다시 돌린다.

### 11a 결과 (2026-11-13 완료, 미push)

코드 커밋 `81b1be43d`: 명식·절기 히어로 그림, 상세 9개 OG 1200×630, alt 구체화.

그림
- 생성: codex-image(gpt-image-2, Codex OAuth라 유료 API 호출이 아니다).
  - 배치 스크립트: `D:\CodeDestiny-Build\free-feature-art-20261113\gen.mjs`, 작업 파일 `jobs/round1.json`.
  - 페이지마다 2장씩 만들었다. a는 스타일 참조를 넣었고, b는 연이 참조만 넣었다.
- 참조:
  - `refs/yeoni-sheet.png`: 꽃돼지 정본 시트(forest-walk/refs에서 복사).
  - `refs/yeoni-profile.png`: mascot/yeoni-profile-v1.
  - `refs/style-saju-prompt.png`: 사주 프롬프트 썸네일. 팔레트만 참조했다.
- 4장 모두 글자가 없고, 연이도 참조와 맞는다(머리 위 연꽃, 라벤더 목수건, 귀 2개, 꼬인 꼬리, 발굽). 고른 그림:
  - 명식: `natal-chart-a`. 네 기둥에 두 칸씩 오행 그림이 있고, 기둥마다 별 장식(신살)이 달렸다. 뒤의 12띠 고리가 빠짐없이 다 있다.
  - 절기: `season-rhythm-a`. 24칸 바퀴가 봄→여름→가을→겨울 시계 방향으로 돈다. 한 칸이 빛나고 진행 호가 있다.
- 원본: `D:\CodeDestiny-Build\free-feature-art-20261113\final\{natal-chart,season-rhythm}.png`(1672×941). 나머지 후보는 `out/`에 있다.
- 웹: 레지스트리 `functionAsset()`으로 연결하고 heroGlyphs는 지웠다.
  - `public/fuctionassets/saju-natal-chart.webp`: 1672×941, q78, 197KB.
  - `public/fuctionassets/saju-season-rhythm.webp`: q74, 185KB.
- alt: 9개 모두 그림 내용을 적었다. 기존 7개는 그림을 열어 보고 고쳤다.
- 크기: 도파민 그림은 실측 1659×948이라 크기 값을 고쳤다.

OG 결정
- 상세 9개 모두 `/images/free-feature-og/<slug>.jpg`를 쓴다.
  - 1200×630, 히어로 원본을 가운데 기준 cover로 잘랐다. mozjpeg q82, 135~210KB.
  - 레지스트리 map이 `ogImage`를 만들고, 각 page.tsx가 `buildSeoMetadata({ ..., ogImage: detail.ogImage })`로 넘긴다.
- 이유:
  - buildSeoMetadata는 og:image width·height를 1200×630으로 고정해 적는다. 1672×941 webp를 그대로 넘기면 크기 표기가 틀린다.
  - 카카오·네이버 미리보기는 webp 지원이 약하다.
  - `/images/saju-crystals/og-1200x630.jpg` 선례와 같은 방식이다.
  - 축소 접점 시트로 보니 제목과 연이가 잘리지 않았다.
- 다시 만들기:
  - `node D:\CodeDestiny-Build\free-feature-art-20261113\export.mjs og`. final/ 원본이 있으면 원본에서, 없으면 public webp에서 만든다.
  - 새 히어로는 `node export.mjs hero <slug> <png>`. 히어로를 바꾸면 OG도 다시 만든다.

컴포넌트
- 모든 항목에 그림이 생기자 `detail.heroGlyphs`의 타입 추론이 사라져 typecheck가 깨졌다.
- `FreeFeatureDetail.tsx` HeroVisual이 `(detail as { heroGlyphs?: unknown }).heroGlyphs`로 읽게 고쳤다. 글자 히어로 폴백은 남겼다(지금은 쓰이지 않음).

검증(실측)
- `sitemap:generate`: 1,081 URL, 원장 9건 갱신 / `verify:sitemap-drift` OK
- `generate-llms-txt --check`: 변경 없음
- `node --test __tests__/ui/free-promo.test.mjs`: 6/6
- `typecheck`: exit 0
- `verify:og-route-contract` 통과, `verify:static-asset-cache-keys` PASS
- `verify:public-mirror-fresh`: OK(커밋 뒤. 커밋 전에는 작업 트리가 깨끗하지 않아 판정 불가로 실패한다)
- next dev(포트 3217):
  - /saju/natal-chart/, /saju/season-rhythm/, /saju/four-cut/, /saju/dopamine/ 모두 200.
  - og:image는 `https://code-destiny.com/images/free-feature-og/<slug>.jpg`이고, og:image:width 1200, height 630이다. twitter:image도 같다.
  - 히어로 img의 src·alt가 맞고, 크기는 1672×941(도파민 1659×948)이다.
  - OG JPG 9개와 webp 2개가 모두 200이다.
  - 끝난 뒤 서버를 끄고 포트 3217이 비었음을 확인했다.

함정
- Edit 도구로 CRLF 작업 파일(.mjs)을 고치면 파일 전체가 LF가 된다.
  - node로 `t.replace(/\r?\n/g, '\r\n')` 정규화를 한 뒤 저장했다.
  - app/*.tsx와 이 문서는 index·작업 트리 모두 LF라 그대로 둔다.
  - 고치기 전에 `git ls-files --eol <file>`로 줄 끝을 먼저 본다.
- node 문자열·heredoc에 Windows 경로 `D:\...`를 넣으면 `\f`·`\n`이 이스케이프로 바뀐다(셸을 거치면 `\\`도 하나로 줄 수 있다). 코드 주석의 경로는 `/`로 적고, 백슬래시가 든 글은 Write 도구로 쓴 스크립트에서 고친다.
- codex image_gen은 그림을 1672×941(16:9)로 내놓는다. 형제 그림과 크기가 같아 그대로 썼다.
- `npm run dev:next`를 백그라운드로 띄우면 셸을 끝내도 next dev와 start-server node 프로세스가 포트를 계속 잡는다. 포트로 PID를 찾아 함께 끝낸다.

후속(보고만)
- 상세 페이지는 next dev로만 확인했다. 빌드 산출물로 하는 검사(`verify:sitemap-canonical` 등)는 dist/·out/ 빌드가 필요해 돌리지 않았다.
- origin/main을 리베이스한 뒤에는 `sitemap:generate`를 다시 돌린다(위 메모와 같음).

### 배너 모바일 다듬기 결과 (2026-11-14 완료, 미push)

커밋
- `c7edcc6c3` fix(free-promo): 모바일 배너 주 버튼을 소개 바로 뒤로, 말풍선 문장 조판(React·셸·미러·테스트)
- `a10578ada` chore(sitemap): 배너 소스를 읽는 라우트 36개의 원장 서명만 갱신

바뀐 것
- 390(카드 폭 700px 미만):
  - 주 버튼 줄(`.foot`/`.cdh-promo__foot`)을 grid `order`로 타일 묶음 위에 올렸다. DOM·읽기 순서와 카드 길이는 그대로다.
  - 카드 위에서 버튼까지 거리: home 325px, saju 326, shell 310, 영냥이 363. 전에는 약 1,230px 카드의 맨 아래였다.
  - 카드 높이는 그대로다(home·saju 1233, shell 1210, 영냥이 498).
- 말풍선은 문장마다 새 줄에서 시작하고, 문장 끝 두 낱말은 NBSP로 묶었다. "열어 / 뒀어요!"는 이제 갈라지지 않는다. 문구는 그대로다.
  - React: `bubbleLines()`가 문장마다 block span을 만든다.
  - 셸: 번역 요소 안에는 마크업을 둘 수 없다(prerender 가드). 그래서 `bubbleText()`가 줄 바꿈 문자를 넣고 CSS `white-space:pre-line`으로 나눈다.
  - `i18n-extract-ko`는 공백을 접어 읽으므로 사전 값 drift가 없다(i18n-check·ko-coverage OK).
- 반짝이:
  - React 영냥이는 `--yn-yehwa-mask-sparkle`(선 0.8) 대신 기본 `--si-mask-sparkle`(선 2.9)을 쓴다.
  - 셸은 비공개 `--cdh-promo-sparkle`(선 2.9)을 쓴다.
  - 아이콘 대비: home·saju 6.17:1, shell 5.44:1, 영냥이 11.33:1.
- 1440: 3열이고 버튼은 아래에 그대로 있다.

visual-checker
- 1차: 실패. 셸 390 말풍선에서 둘째 문장이 줄 중간에서 시작했고, 쿠키 배너가 일부를 가렸다.
- 2차: 8개 모두 통과(home·영냥이·saju·shell × 390/1440).
  - 버튼은 첫 화면 y 327~379에 있다.
  - 구분선 하나에 위아래 24/26px로, 이중 테두리가 없다.
  - 말풍선 꼬리와 마스코트가 잘리지 않았다.

검증
- free-promo + home-funnel-free-prices 테스트: 12/12
- `typecheck`: exit 0
- `i18n-check`: OK, `verify:i18n-ko-coverage`: OK
- `verify:hero-contrast`: 통과
- `measure:touch-targets`: 스테이징 기준이다. 44px 미달 5개는 푸터 링크·버튼으로 이번 변경과 무관하다.
- `verify:public-mirror-fresh`: OK(커밋 뒤)
- `verify:sitemap-drift`: OK
- dev 서버 3217은 꺼졌고 포트가 비었다. 12828(다른 세션, PID 22560)은 건드리지 않았다.

함정
- 사이트맵:
  - `sitemap:generate`를 날짜가 바뀐 뒤(KST 11-14) 돌리면 휘발성 운세 라우트 376개의 lastmod가 함께 바뀐다.
  - 드리프트 검사는 휘발성 라우트를 정규화하므로 서명 36건만 담아도 통과한다.
  - 날짜만 바뀐 줄을 되돌린 스크립트: `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\sitemap-sig-only.mjs <기준 SHA>`
  - 날짜 로직은 SEO 세션 담당이라 손대지 않았다.
- perl 치환 문자열 안의 `\u`는 다음 글자를 대문자로 만드는 이스케이프다. `\u00a0`를 넣다가 `00a0`이 됐다. NBSP 이스케이프는 Write로 쓴 node 스크립트로 넣는다.
- 측정 시 쿠키 배너는 `cd_cookie_consent=essential`(쿠키 + localStorage)을 미리 넣어 끈다.

후속(보고만)
- 1440 묶음 열 높이가 고르지 않다(타일 9/6/7개 → 5/3/4행).
  - 맞추려면 3열 타일을 좁혀 이름이 줄 바꿈되거나, 항목을 다른 묶음으로 옮겨야 한다(콘텐츠 변경).
  - 그래서 두었다.
- 영냥이 390 말풍선은 글자 폭 약 150px에 5줄이라 좁다. 잘림은 없다. 마스코트 크기·겹침을 바꾸면 넓어지지만 영냥이 그림 검수가 필요해 두었다.
- 영냥이 공유 버튼은 경계 대비가 1.08:1로 거의 보이지 않는다(어두운 카드 위 `--yn-deep` 버튼, 글자는 읽힘). 이번 변경 전부터 있던 스타일이다(`.yeongnyangi .share`).

### 묶음 ③ 단계 5 ReviewProof 결과 (2026-11-14 완료, 미push)

커밋
- `f554b8920` feat(review-proof): 결정 지점 신뢰 블록 — 구매 인증 후기 또는 확인된 사실
  - 새 파일: `app/components/ReviewProof.tsx`, `app/components/ReviewProof.module.css`, `__tests__/ui/review-proof.test.mjs`
  - 배치 4곳은 마크업만(10줄 추가·1줄 변경). 가격·결제 핸들러·제출 로직은 그대로다.

동작
- 클라이언트에서 `/api/reviews/summary?productId=<id>&verifiedOnly=1`과 `/api/reviews?productId=<id>&verifiedOnly=1&sort=latest&page=1&limit=3`을 함께 받는다.
  - 목록에서 `isVerifiedPurchase === true`만 다시 거른다(최대 3개).
  - 같은 상품 요청은 한 번만 보낸다(pending·resolved 맵).
- 표시
  - 구매 인증 후기 0건, 또는 응답 실패 → 사실 안내(TrustFacts). 면책 문구·"후기 더 보기"는 없다(보여 줄 후기가 없으므로).
  - 1~2건 → 카드만. 평균은 없다.
  - 3건 이상 → "평균 별점 N.N점 · 구매 인증 후기 N개" + 카드 3개.
  - 카드: 별점(시각 별은 aria-hidden, 읽기용 "별점 5점 만점에 N점"), YYYY.MM, 제목, 본문(없으면 빠른 태그를 " · "로), "구매 인증" 배지, `rewarded`면 `reviewCardRewardLabel("ko")`.
  - 후기 모드에만 "개인 경험에 따른 후기이며 결과를 보장하지 않습니다." + "후기 더 보기" → `/reviews/?product=<id>`.
- 로딩 중에는 빈 자리만 예약한다(aria-hidden). 390에서 예약 432px, 최종 428/430px라 밀림이 없다.
- 브랜드 변형: 꿀꿀은 `--cd-*`, 영냥이는 `--yn-*`. 비공개 `--rp-*` 네임스페이스. 새 hex·`dark:`·`prefers-color-scheme`은 없다.
- 제목은 `useId` 기반 id로 `aria-labelledby`. 꿀꿀은 h2, 영냥이는 `#yn-prices`(h2) 안이라 h3.
- AggregateRating·JSON-LD·분석 이벤트 없음(테스트가 소스에서 확인).

배치 (커밋 기준 줄)
- `app/love-secret-ai/LoveSecretAiClient.tsx` import L46, 블록 L2339 — `LoveSecretHero`와 `CraftedProductDisclosure` 사이. productId `love-coach`, 예시 `#service-samples-love-secret`
- `app/new-year-ai-consultation/NewYearAiClient.tsx` import L8, 블록 L2179 — `CraftedProductDisclosure` 묶음 앞, 폭 1180 래퍼. productId `new-year`, 예시 `#service-samples-new-year`
- `app/life-book-ai/LifeBookAiClient.tsx` import L24, 블록 L1792 — 히어로 `</header>` 바로 뒤. productId `life-book`, 예시 `#service-samples-life-book`
- `app/yeongnyangi/_components/YeongnyangiGuide.tsx` import L13, 블록 L61 — `#yn-prices`의 `.note` 문단 뒤. productId `yeongnyangi`, 예시 `#yn-example`. 머리 주석도 갱신.
- 꿀꿀 3곳 조건: 한국어 웹(`copy === *_COPY.ko`), 토스 화면 제외(`paymentSurface !== "toss"`), 생성 중·결과 화면 아님. 토스 `apps/toss/service/*.jsx`가 같은 클라이언트를 `paymentSurface="toss"`로 그리므로 토스 화면은 바뀌지 않는다.

TrustFacts 문장과 근거
- 꿀꿀
  1. 가격은 시작 버튼 옆, 결제창에서 결제 금액 재확인 — `PriceBadge`가 CTA 옆(love-secret L2549, new-year ≈L2318, life-book ≈L1786), `app/_lib/billing-client.ts` L1322 `결제 금액 {amount}`
  2. 완성된 상담은 결제한 계정 보관함에 저장 — `lib/records/service-registry.js` L11·L15·L16
  3. 화면을 닫아도 이어서, 오래 비우면 서버가 마저 완성 — 세 클라이언트의 `usePaidResume`, `worker/lib/consultation-recovery-task.js`(cron), 이 문서 L46 확인 문구
  4. 결과를 못 받으면 확인 뒤 재생성 또는 환불 기준 — 이용약관 12조(TermsContent L177 "재생성 … 부분 환불 또는 전액 환불"), 링크 `/refund-policy/`
  - 링크: "환불 안내 보기" `/refund-policy/`(`app/refund-policy/page.js`), "실제 결과 예시 보기" → 각 page.tsx의 `ResultSamples ids=[...]`가 만드는 `service-samples-<id>`
- 영냥이
  1. 결제창에서 총액과 적용 수단 재확인 — `YeongnyangiCheckout` L141("추가 결제 금액")·L144, 가격 FAQ
  2. 결제 확인 뒤 생성 시작, 닫아도 같은 계정 내 상담에서 확인 — `YEONGNYANGI_FAQS` "결제하고 나면 결과는 언제, 어디서 보나요?"(서버 큐)
  3. 안 만들어지면 내 상담에서 상태 확인·문의, 환불은 환불 정책 — `YEONGNYANGI_FAQS` "상담이 만들어지지 않으면…", `checkout-copy.ts` L267 `resolveCheckoutPolicyHrefs`
  - 링크: "환불 정책 보기" `/refund-policy/`, "문의하기" `/contact/#payment-help`(ContactUsPage `<li id="payment-help">`), "실제 상담 예시 보기" `#yn-example`
  - "내 상담"은 NBSP로 묶었다(소스에는 `\u00a0` 이스케이프).
- 문구 테스트: `보장|100%|반드시|무조건|지금 바로|놓치|마감|한정|최고|유일` 없음(면책 문구 상수는 제외).

API 판단
- 목록·요약 모두 `verifiedOnly`를 이미 지원한다(캐시 키 `reviews:list:v5:…:verified|all`, `reviews:summary:v3:<id>:<0|1>`). 서버·worker 변경 없음 → `verify:public-api-edge-cache` 불필요.
- 분석 이벤트를 추가하지 않았으므로 `verify:analytics-events`도 불필요.

검증
- `node --test __tests__/ui/review-proof.test.mjs`: 6/6
  - 기준값(0/1/2/3/12/-1/NaN), 0건·실패 → 사실 안내와 링크 대상 존재, 2건 → 평균 없음·보상 라벨 1회, 7건 평균 4.57 → "평균 별점 4.6점 · 구매 인증 후기 7개"·카드 3개, 로딩 aria-hidden·fetch URL·비인증 제외, 금지 문구·JSON-LD·analytics 없음
- 관련 UI 테스트 17개 파일 묶음: 242개 중 241 통과. 실패 1건은 이번 변경과 무관(아래 후속 1).
- `npm run typecheck`: 0 errors
- visual-checker(390, 쿠키 배너 끔): `/love-secret-ai/`·`/yeongnyangi/` 둘 다 PASS
  - love-secret: 본문·링크 12.86:1(rgb(246,242,237) 위), 밑줄 1px, 링크 간격 약 20px, 아래 테두리 온전
  - 영냥이: 링크 7.64:1, 본문 10.92:1(rgb(35,52,75) 위), 줄 간격 48px, "내 상담" 붙어 있음
  - 링크 높이 모두 44px, 가로 넘침 0, h2/h3 + aria-labelledby
- 로딩 예약 대비 최종 높이(px): 360 = 453/455, 640 = 329/308, 768 = 329/283, 1440 = 304/258(love-secret/영냥이). 예약값 27rem(<640), 19rem(≥640), 18rem(≥1024)
- dev 서버 12828(API 12829)은 이 워크트리 경로 해시 포트였다(`dev-with-local-auth.mjs` PID 33656 트리). 끄고 두 포트가 빈 것을 확인했다.
- `check:fast`는 돌리지 않았다(지시).

함정
- GNU sed·perl 치환 문자열의 `\u`는 다음 글자 대문자 이스케이프다. `\u00a0`이 "내00a0상담"이 됐다.
- Edit 도구는 `\u00a0`을 실제 NBSP 문자로 풀어 쓴다. 이스케이프로 남기려면 Write로 쓴 node 스크립트로 바꾼다.
- `sed -i`는 CRLF 작업 사본을 LF로 바꾼다(인덱스는 LF, text=auto). 고친 뒤 `git ls-files --eol`로 w/crlf인지 본다.
- 로컬 mock `/api/reviews`는 308 → 501이라 화면에서는 늘 사실 안내 모드다. 카드·평균 모드는 단위 테스트로만 확인했다.
- 화면 측정 때 쿠키 배너는 `cd_cookie_consent=essential` 쿠키를 미리 넣어 끈다. 측정 스크립트: `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\rp-shots.mjs`

후속(보고만)
1. `__tests__/ui/ziwei-result-disclosure.test.mjs` "other service presentation changes preserve…"가 실패한다. 단계 3(`70fe88e4d`)이 `SukuyoCompatibilityAiClient` 함수 안 `<ReviewRewardBanner afterResult/>`에 `reviewProductId="sukuyo"`를 넣어 함수 해시가 `__tests__/fixtures/result-presentation-preservation.json` 기준과 달라졌다. 의도된 변경이면 기준 해시만 갱신하면 된다(묶음 ⑤ `check:fast` 전에 처리).
2. `/reviews/?product=<id>`는 아직 목록을 거르지 않는다(ReviewsClient는 `write=1`일 때만 `product`를 읽음). 링크는 후기 페이지로 가지만 해당 상품만 보이지는 않는다.
3. `#yn-example` 링크는 `<details>`를 열지 않는다. 해시로 여는 스크립트는 단계 7 범위다.
4. new-year·life-book 화면 확인은 묶음 ⑤로 미뤘다(단위 테스트·typecheck로만 확인).
5. 로딩 예약 높이는 390에 맞췄고 다른 폭은 근사값이다. 최종 높이와의 차이(love-secret/영냥이): 360 +21/+23, 640 +25/+4, 768 +25/−21, 1440 +16/−30px. 실제 후기가 쌓이면 카드 모드 높이로 다시 맞춘다.

### 묶음 ③ 단계 7 결과 (2026-11-14 완료, 미push)

커밋
- `c674869d9` test(preservation): `__tests__/fixtures/result-presentation-preservation.json`의 `SukuyoCompatibilityAiClient` 기준 해시 갱신(단계 3의 `reviewProductId="sukuyo"` 반영). 단계 5 후속 1 해결.
- `f6768d579` fix(reviews): `app/reviews/ReviewsClient.tsx`가 `?product=`를 `/api/reviews/products` 항목(카탈로그 slug)으로 검증한 뒤에만 목록·요약을 그 상품으로 거른다. 검증이 끝날 때까지(`filterReady`) 목록·요약 요청을 미룬다. 모르는 값은 무시하고 전체를 보인다. 테스트 `__tests__/ui/review-consent-flow.test.mjs` 11/11. 단계 5 후속 2 해결.
- `008432add` feat(yeongnyangi): 시작 가격 한 줄·상담 예시 바로가기·홈 카드 가격. 단계 5 후속 3(`#yn-example` 열기) 해결.

변경 (커밋 기준 줄)
- a. `app/yeongnyangi/_components/NightHero.tsx` L35: 히어로 가격을 한 줄 `질문 상담 {starter.priceKRW}원부터`로 줄였다. 체험가 조건 접두(`planned!==null`)는 그대로라 가격 표시 로직은 같다. 데스크톱 소개 div 안 가격 줄과 모바일 전용 가격 줄을 없앴다. 세부("고등어 질문 상담 … 챕터 · 추가 질문 없음")는 `NightPriceDetails`(L15-22, 변경 없음)에 남는다.
  - `night-hero.module.css` L45·L48: `.mobilePrice`·`.desktopIntro .price` 규칙 삭제, `.mobileTitle`만 남김.
- b. `app/yeongnyangi/_components/ProductGuide.tsx` L93: `#founder-records` → `/yeongnyangi/1000-won-fortune/#founder-records`. 대상 id는 이미 `app/components/FounderTrust.tsx` L14에 있고 `app/yeongnyangi/1000-won-fortune/page.tsx` L146이 그린다. id 추가 불필요.
- c. 새 `app/yeongnyangi/_components/RevealDetailsOnHash.tsx`: 해시가 `#<id>`이면 그 `<details>`와 바깥 `<details>`(HomeDisclosure)를 모두 열고, 다음 프레임에 `scrollIntoView`한다(움직임 줄이기면 `auto`, 아니면 `smooth`). 처음 열 때·`hashchange`·같은 해시 링크 재클릭 때 동작한다.
  - `YeongnyangiGuide.tsx` L14 import, L82 `<RevealDetailsOnHash id="yn-example"/>`(`<details id="yn-example">` L73 안).
  - `app/components/QuestionJourney.tsx` L18-20·L29: QuestionOffer 주 버튼 뒤에 "예시 먼저 보기" → `#yn-example`. 문서에 `#yn-example`이 있을 때만 보인다(한국어 영냥이 홈 가이드에만 있음). `QuestionJourney.module.css` L20 `.example`.
- d. `app/page.js` L23 카탈로그 import, L32 `YN_STARTER_KRW`, L119: 영냥이 카드 태그 끝에 `N원부터`(웹 전용 `!IS_APP_BUILD`, 앱은 스토어 가격이라 뺌). 꿀꿀 카드는 그대로. 가격은 `aria-describedby` 텍스트 안에 들어간다. `home-main.module.css` L93 `.cardPrice`(토큰 `--hm-card-ink`, 영냥이 카드에서 `--yn-ivory`).
- 새 hex·`dark:`·`prefers-color-scheme` 없음. 영냥이 대사는 바꾸지 않았고 UI 문구는 해요체·명사구.

가정
- a: 데스크톱은 기존 "상담 가격" 내비 링크와 열린 `#yn-prices`로, 모바일은 `NightPriceDetails`로 세부에 간다.
- c: "한국어 전용"은 `#yn-example` 존재 여부로 판단했다(QuestionJourney는 한국어 FortuneHome에서만 그려진다).
- d: 카드 폭 때문에 "질문 상담" 없이 "N원부터"만 넣었다.

검증
- 관련 UI 테스트 묶음: 1020개 중 1019 통과. 실패 1건 `home-service-separation.test.cjs` "service home owns discovery…"(`index.html`에 `.yh-concerns` 없음)는 이전부터다. origin/main `index.html`에도 `yh-concerns`가 0개이고 이번에 `index.html`을 건드리지 않았다.
- `npm run typecheck`: EXIT 0. eslint: 0 errors(경고는 기존 패턴).
- `verify:hero-contrast` 통과, `verify:mobile-journeys` 6개 폭 통과.
- `verify:home-identity`: dev가 그린 HTML을 scratch `hi-dist`에 저장해 `--dist=`로 돌려 OK(실제 dist는 빌드가 필요해 돌리지 않음).
- `measure:touch-targets`: `/yeongnyangi/` 44 미만 2(숨은 1x1 input, 기존). `/` 44 미만 5(푸터 링크 4개 실효 65x33·`home-main_footerButton`, 기존, 카드 아님).
- 390 측정(`D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\s7-shots.mjs`)
  - 히어로 가격 한 줄 "질문 상담 10,000원부터". 가격 안내 summary 48px.
  - 예시 링크 45px, 기록 링크 45px. 클릭 → 해시 `#yn-example`, details·바깥 접힘 열림, top 0. 같은 해시 재클릭도 다시 연다. `/yeongnyangi/#yn-example` 직접 진입도 열린다.
  - 홈 영냥이 카드 " 10,000원부터", 꿀꿀 카드 가격 없음, describedby "…살펴보세요. 10,000원부터", 가로 넘침 0.
- visual-checker(390, 하위 에이전트): 5개 항목 모두 PASS. 히어로 가격 11.10:1, 가격 안내 10.25:1, 예시 링크 13.20:1, 카드 가격 14.95:1. 잘림·겹침 없음. 카드 높이 168/190이어도 정렬이 깨지지 않는다.
- dev 서버 12828(API 12829)은 `npm run dev` → `dev-with-local-auth.mjs` 트리였다. 트리째 끄고 두 포트가 빈 것을 확인했다.
- sitemap 원장·public 미러 변경 없음(`index.html`·셸·무료 배너 파일 안 건드림) → `sync:public`·`verify:sitemap-drift` 불필요. `check:fast`는 돌리지 않았다(지시).

함정
- Edit 도구가 CRLF 작업 사본(NightHero.tsx 등)을 LF로 바꾼다. 고친 뒤 `git ls-files --eol`로 w/crlf인지 보고, 아니면 node로 되돌린다. 이 PC에는 Python이 없다.
- 테스트의 `NODE_OPTIONS --require`는 `D:/...` Windows 경로로 줘야 한다(`/d/...`면 MODULE_NOT_FOUND).
- HomeDisclosure의 `revealHash`와 자식 effect 순서 때문에 스크롤은 rAF로 한 프레임 미룬다.
- dev 서버에서 `measure:touch-targets`를 두 번째 돌릴 때 networkidle 대기로 시간 초과가 날 수 있다(첫 실행은 통과).

후속(보고만)
1. `js/feature-detail-panels.mjs` L146(과 public 미러)의 fortuneFounder 링크 `/yeongnyangi/#founder-records`도 죽은 앵커다. `scripts/verify-premium-detail.mjs`·`verify-premium-finder.mjs`·`__tests__/ui/feature-visual-details.test.mjs` L329가 그 값을 단언하므로 함께 바꿔야 한다.
2. `ReviewsClient`의 `loadReviews`에 늦게 온 응답을 버리는 가드가 없다(필터·페이지를 빨리 바꾸면 이전 응답이 덮을 수 있음).
3. `NightPriceDetails` 줄이 "기준"을 "기/준"으로 끊는다(`.shortcuts .terms>p`에 `word-break: keep-all` 없음, 기존).
4. `home-service-separation.test.cjs`의 `.yh-concerns` 실패(기존, 위 검증).

### 묶음 ③ 단계 8 결과 (2026-11-14 완료, 미push)

커밋
- `efafe2738` feat(checkout): 결제 인접 — 단계별 가격 한 줄·안내 위치·영냥이 checkout_opened

변경 (커밋 기준 줄)
- a. `app/love-secret-ai/LoveSecretAiClient.tsx` L2361-2369: 입력 단계 카드 맨 위에 오른쪽 정렬 `PriceBadge` 한 줄을 넣었다. 위치는 생성 중이 아닌 분기이고, 헤더(L2370) 바로 앞이다.
  - 인트로(L2560)와 같은 `featureKey="love-secret-ai-consultation"`과 `prefix={copy.priceLabelPrefix}`를 쓴다. 새 문자열은 없다.
  - 클래스는 `text-xs font-semibold text-[var(--ls-text-muted)]`이다.
  - 게이트는 `paymentSurface !== "toss" && !resultUrl`로, ReviewProof(L2339) 기준을 따랐다. 생성 중(`busy`)에는 분기가 달라 보이지 않는다.
  - PriceBadge는 toss나 앱에서 스스로 숨지 않는다. `app/components/PriceBadge.tsx`에 화면 종류 분기가 없다.
    - 앱(Play)은 `useServerPrice`가 Play 가격을 보여 주므로 그대로 둔다.
    - toss만 명시적으로 뺐다. 인트로와 마지막 단계 가격은 toss에서도 이미 보이지만(기존), 새 배지는 ReviewProof 기준을 따랐다.
  - 처음에는 "STEP n / N" 줄 오른쪽에 넣었다. 390 "내 정보" 단계에서 헤더 제목 열이 0px로 무너져 가격이 41x64로 쪼개졌다. 그래서 헤더 밖 별도 한 줄로 옮겼다(후속 1).
- b. `app/checkout/YeongnyangiCheckout.tsx` L145-146: 안심 문구 `<p className={styles.legal}>`와 약관·환불·문의 링크 `<p className={styles.legal}>`를 `.action`(L144, 결제 버튼) 바로 다음으로 옮겼다.
  - 피드백 `<p role="status">`(L147)와 "보유 혜택 다시 확인하기" 버튼은 그 뒤로 밀렸다.
  - 문구, 링크 대상, 버튼, `pay()`는 바이트 단위로 그대로다.
  - CSS는 바꾸지 않았다. 기존 `.legal` margin 14px로 충분해 `--yn-*` 조정이 필요 없다.
  - 760px 이하에서는 `.action`이 고정 하단 바다. 두 줄은 요약 카드 끝의 흐름 안에 남겼다. 바 안에 넣으면 바가 3줄 커지고 `.checkout` 하단 패딩 155px를 바꿔야 해서 하지 않았다.
  - DOM, 읽기, 탭 순서는 모두 버튼 → 안심 문구 → 링크다.
- c. `YeongnyangiCheckout.tsx` L9에 `trackEvent`를 import했다. L34-35는 `opened` ref 가드와 `useEffect`로, 상품(`draft.product.cdFeatureKey`)마다 한 번 `trackEvent('checkout_opened',{item_id,service:'yeongnyangi'})`를 보낸다.
  - 영냥이 기존 관례(`Consultation.tsx`의 `view_item`·`consultation_start`, `item_id`+`service`)와 같다. 금액과 PII는 없다.
  - GA4 전용(`cdTrack`)이다. 1st-party 퍼널(`/api/billing/funnel-event`)은 건드리지 않았다.
  - **`checkout_pg_opened`는 일부러 추가하지 않았다(지시와 다름).** 영냥이 결제는 `runPaidAccessGate`를 거쳐 공용 런타임 `window._cdOpenPaidServiceGate`(`js/destiny-profile.js`)로 간다.
    - 그 런타임이 L6002에서 `window.PortOne.requestPayment` 직전에 이미 `_dpTrackCheckoutEvent('checkout_pg_opened', …)`를 보낸다.
    - `js/core/analytics.js` L352-356은 `checkout_pg_opened`를 GA4 `begin_checkout`으로 바꾸고, 중복을 걸러 내지 않는다. 페이지에서 또 보내면 begin_checkout이 두 번 잡힌다.
    - 83622ef19가 같은 이유로 CheckoutClient의 이른 begin_checkout을 없앴다(`docs/marketing/naver-keyword-evidence-20261029.md` L110·L118).
    - 페이지에서 꼭 보내려면 `pay()` 앞에 래퍼 한 줄이면 된다. 다만 PG가 열리지 않는 경로(이용권, 꿀단지, 로그인 전, 취소)에서도 찍혀 "PG가 열렸다"는 뜻이 깨진다.
  - GA4 `checkout_opened`에는 런타임 결제 선택 모달의 이벤트도 섞인다(destiny-profile L12631, React 모달 billing-client L1671). 새 페이지 이벤트는 `service:'yeongnyangi'`로 구분된다.
- d. 테스트
  - `__tests__/ui/checkout-method-order.test.mjs` L45: 결제 버튼 < 안심 문구 < 약관 링크 < 피드백 순서인지 본다.
  - `__tests__/ui/purchase-analytics.test.mjs` L419: 다음을 본다.
    - ref 가드와 `checkout_opened`(service 'yeongnyangi')가 있다.
    - 페이지에 `checkout_pg_opened`·`begin_checkout`이 없다.
    - `runPaidAccessGate(`가 그대로 있다.
    - destiny-profile의 `checkout_pg_opened`가 `window.PortOne.requestPayment(requestData)`보다 앞에 있다.
  - `__tests__/ui/mobile-pricing-source.static.test.js` L31: 다음을 본다. love-secret 소스를 읽는 가격 테스트가 이 파일이라 여기에 넣었다.
    - love-secret 단계 가격이 생성 카드 뒤(생성 중이 아닌 분기)이자 헤더 바로 앞에 있다.
    - toss·결과 게이트가 있다.
    - 인트로와 같은 featureKey·prefix를 쓴다.

RED 확인 (금액·핸들러 무변경)
- HEAD와 작업 사본을 node로 CRLF 정규화해 비교했다.
  - `pay()` 함수 본문이 같다(2617자).
  - `.action`과 결제 버튼 줄이 같다.
  - `pricing|amount|won(|runPaidAccessGate|allowedPaymentModes`가 들어간 줄이 모두 같다.
  - `git diff -U0`에서 이 패턴이 들어간 +/- 줄은 0개다.
- 새 PriceBadge는 표시 전용(`useServerPrice`)이라 결제 경로와 상관없다.

검증
- `node --test` checkout-method-order·purchase-analytics·mobile-pricing-source: 52/52 통과. 새 테스트 3개는 변경 전 소스라면 실패하는 단언이다.
- love-secret-* 테스트 5개 파일(wake-recovery, paid-delivery, pdf-chapters, rejection-repair, speaker): 56/56 통과.
- `apps/toss/test/checkout-denied.test.mjs`(영냥이 checkout CSS 모듈을 쓰는 토스 결제): 30/30 통과.
- 이름이 "yeongnyangi-checkout*"인 테스트 파일은 없다. 옮긴 마크업을 단언하는 다른 테스트도 없다(`styles.legal`·`policyHrefs`·안심 문구로 Grep).
- `npm run typecheck`: EXIT 0. 배지 위치를 바꾼 뒤 다시 돌렸다.
- `npm run verify:analytics-events`: 통과.
- `measure:touch-targets`: `/love-secret-ai/`에서 networkidle 대기 60초를 넘겼다(dev 서버, 기존 함정).
  - 이번 변경으로 새로 생긴 탭 대상은 없다. 배지는 span이고, 영냥이 링크는 위치만 옮겼다(크기 그대로, 높이 15px 인라인 링크, 기존).
  - 영냥이 결제 화면은 질문을 제출해야 열려서 측정기가 닿지 않는다.
- 390 측정(`D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\s8-shots.mjs`, `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\s8-desk.mjs`)
  - love-secret status·focus·me 세 단계 모두 가격이 한 줄 "상담 이용 가격 30,000원"(122x16, x227, 오른쪽 정렬)이고 가로 넘침은 0이다.
  - 영냥이는 `/yeongnyangi/fortune/`에서 비로그인 mock으로 "상담과 결제 확인하기"까지만 눌렀다. 결제 버튼은 누르지 않았다.
    - DOM 순서는 버튼 → 안심 문구 → 링크 → 피드백이다.
    - 390에서는 버튼이 고정 바(top 735)에 있고, 두 줄은 카드 끝 흐름(y 705/762)에 있다.
    - 데스크톱 1280에서는 버튼 아래 14px에 안심 문구, 그 아래에 링크가 온다.
- visual-checker(하위 에이전트) 판정
  - Q1 love-secret 가격 줄 3단계: PASS(대비 6.55:1).
  - Q2 390 영냥이 두 줄이 고정 바에 가리지 않음: PASS(바까지 24px).
  - Q3 데스크톱 버튼 → 문구 → 링크 사이에 다른 컨트롤 없음: PASS.
- dev 서버 12828/12829는 이번에 띄운 `npm run dev` → `dev-with-local-auth.mjs` 트리였다(PID 22560, 02:16 시작). 트리째 끄고 두 포트가 빈 것을 확인했다.
- sitemap 원장, `index.html`, 셸, 무료 배너는 바꾸지 않았다. 그래서 `sync:public`·`verify:sitemap-drift`는 필요 없다. `check:fast`는 돌리지 않았다(지시).

함정
- `/yeongnyangi/fortune/`은 첫 방문 때 프롤로그 `<dialog>`가 질문 입력을 덮는다. 스크립트에서 `localStorage['cd:yeongnyangi:neo-prologue:v1']='read'`를 init script로 넣으면 건너뛴다.
- dev 화면 왼쪽 아래 "개발 결제 테스터" 버튼(`fixed bottom-4 left-4`)이 390 영냥이 고정 바의 금액 라벨을 가린다. dev 전용이라 운영과 상관없다. 스크린샷을 판정할 때 헷갈리지 말 것.
- 12828의 조부모 PID가 22560으로, 이전에 "다른 세션 PID"로 적힌 번호와 같았다. PID는 재사용되므로 시작 시각과 명령줄로 내 트리인지 확인한 뒤 끈다.

후속(보고만)
1. love-secret 390 "내 정보" 단계에서 헤더의 `SavedBirthProfilePicker` 카드가 헤더 폭 308px를 다 차지한다.
   - 그래서 제목 열(`min-w-0 flex-1`)이 0px로 무너지고, 제목과 도움말이 한 글자씩 꺾여 높이가 922px가 된다.
   - HEAD에서도 같다(배지를 넣기 전에 측정).
   - 헤더에 `flex-wrap`을 주거나 피커를 헤더 아래로 내려야 한다.
2. love-secret 마지막 단계에서는 같은 가격이 두 곳에 보인다. 위는 새 배지, 아래는 L2494 근처 제출 옆의 기존 가격이다. 줄이려면 아래 것을 빼야 하지만 범위 밖이라 두었다.
3. 인트로, 마지막 단계, ExpertStickyCta의 love-secret PriceBadge는 toss에서도 보인다(기존). 토스 단건 가격과 같은지는 따로 확인해야 한다.

### 묶음 ④ 단계 9 결과 — 공용 GenerationProgress·연애 비책 (2026-11-14 완료, 미push)

커밋
- `1c0e07c2b` feat(fortune): 공용 GenerationProgress 대기 화면 추가
- `98ca36812` feat(love-secret): 생성 대기 화면을 GenerationProgress 로 이전

공용 컴포넌트 (`1c0e07c2b`)
- `components/fortune/GenerationProgress.tsx`: 원본 `app/human-design/report/_components/GenerationProgress.tsx`는 그대로 두고 본떴다.
  - export: `LEAVE_SAFE_NOTICE`(지시 원문 그대로), `formatElapsed`, `resolveGenerationCount`, 타입.
  - props: `title`·`status`·`description?`·`completed?`·`total?`·`countUnit?`·`steps?`·`timing?`·`elapsedLabel?`·`typicalRange?`·`leaveNotice?`(기본 원문, null이면 숨김)·`progressLabel?`·`persona?: 'yeoni'|'neo'`·`counselor?: {src, srcSet?}`.
  - 막대: `resolveGenerationCount`가 `total`이 0보다 큰 유한수이고 `completed`가 0 이상 유한수일 때만 값을 돌려준다(completed는 total로 자름). 이때만 `role="progressbar"`(valuemin 0·valuemax total·valuenow·valuetext "N / M 단위")와 `--gp-ratio` 채움이다. 아니면 `aria-hidden` 흐르는 막대다. 퍼센트·시간 기반 숫자는 없다.
  - 알림: `aria-live="polite" aria-atomic="true"` 영역에는 상태 문장과 "N / M"만 둔다. 경과 `<time>`(m:ss)과 "보통"은 그 밖이다. 조상에 `aria-busy` 없음.
  - 상담사 그림은 호출하는 쪽이 넘긴 초상만 쓴다(`aria-hidden`, `alt=""`).
- `components/fortune/useElapsed.ts`: `formatElapsed`(내림, NaN·음수는 0:00), `useElapsed(running)`(1초 간격, 멈추면 0).
- `components/fortune/GenerationProgress.module.css`: `--cd-samples-*`(연이 분홍)·`--cd-neo-letter-*`(네오 달빛)를 사설 `--gp-*`로 옮겨 쓴다. `--cd-*` 재선언·새 hex·`dark:`·`prefers-color-scheme` 없음. 움직임은 CSS 키프레임 3개, `prefers-reduced-motion`이면 멈추고 흐르는 막대는 옅은 고정 막대가 된다. 단계 줄 최소 높이 44px.
- `__tests__/ui/generation-progress.behavior.test.mjs`: 10개(확정·불확정·자름·퍼센트 없음·떠남 안내 원문/null/대체·m:ss·알림 영역 밖 경과·단계 상태·장식 그림).

연애 비책 이전 (`98ca36812`, 커밋 기준 줄)
- `app/love-secret-ai/LoveSecretAiClient.tsx`
  - L47 import. 타입 L122-124와 12개 언어에 `generatingElapsedLabel`·`generatingCountUnit`·`leaveSafeNotice`를 넣었다(ko는 `LEAVE_SAFE_NOTICE` 그대로, 나머지는 번역).
  - L1533 `WRITING_STEP_INDEX = 3`: 생성 중 상태 문장은 기존 `generatingSteps[3]`(쓰는 중) 한 문장으로 고정했다. 시간으로 단계 문장을 바꾸던 가짜 진행은 없앴다.
  - L1947 `groupProgress` 상태가 `progress`·`progressIndex`를 대신한다. 가짜 진행 `useEffect`(700ms·1800ms 간격)를 지웠다.
  - L2157 partial 응답마다 `setGroupProgress({ completed: completedGroups.length, total: totalGroups })`. 서버 `worker/routes/love-secret-ai.js` L1331 `totalGroups: planGroups.length`(V2 = 7).
  - 처음 POST가 돌아오기 전에는 실제 수가 없어 불확정 막대다. 첫 partial부터 "N / 7 갈래 완성" 막대로 바뀐다.
  - L2360 입력 단계 레일은 생성 중이 아닐 때만 보인다. L2376 생성 중에는 `<GenerationProgress persona="yeoni">`(초상 `masterProfiles.yeoniLove`), 경과 시간은 `phase === "generating"`일 때만, 떠남 안내도 그때만이다.
  - `LoveSecretGeneratingCard` 함수와 미사용 아이콘 import(`Clock3`·`Star`·`WalletCards`)를 지웠다.
- `LoveSecretAiClient.module.css`: 꽃잎·반짝이 입자 블록과 그 reduced-motion 규칙을 지웠다.
- 테스트·검사 문구: `love-secret-paid-delivery.behavior` 픽스처를 `setGroupProgress`로 바꾸고, 실제 수 순서(`null`, 1/7…5/7)를 새로 단언했다. `mobile-pricing-source.static`·`scripts/verify-love-secret-ai-flow.mjs`의 표지를 `<GenerationProgress`로 바꿨다.

UI 전용 확인
- TS AST로 HEAD와 작업 사본에서 `startConsultation`·`pollResult`·`buildResume`·`handleSubmit`·`resetAttempt`·`postJson`을 뽑아 비교했다. `set(Progress|ProgressIndex|GroupProgress)(` 줄만 빼면 6개 모두 같다. 도구는 `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\ui-only-check.mjs`(`node ui-only-check.mjs <rel> <fn1,fn2> '<setter 정규식>'`)이다. 신년운세 등에도 그대로 쓸 수 있다.
- `git diff`에 fetch·postJson·await·요청 본문 변경 줄은 없다.

떠남 안내 사실 확인 (연애 비책: 원문 그대로 사용)
- 다시 열면 이어 씀
  - 마운트 때 `GET /api/love-secret-ai/result`가 partial·generating·delivery_pending이면 `pendingGenerationRef`를 세워 이어 쓴다.
  - 결과 화면 `LoveSecretAiResultClient.tsx`(~L875-895)도 partial을 최대 8번 이어 쓴다.
  - 결제 복귀는 `usePaidResume`이다.
- 오래 비우면 서버가 마저 완성함
  - `worker/lib/consultation-recovery-task.js` 레지스트리 L19에 `love-secret-ai`가 있다.
  - 조건: `llmMeta.delivery.resumeBody` 저장, 5분 유휴, 7일 이내, userId 필요.
  - 운영 크론은 `*/10`(`worker/index.js` ~L2082)이다. 스테이징에는 크론이 없다.
- 시간 약속 문구는 넣지 않았다.

"보통 N~M분"
- 연애 비책은 뺐다. 근거가 서버 예산뿐이라서다.
  - 요청당 LLM 마감 86초, 갈래 타임아웃 54초, 주석의 "7,500자 ≈ 34초".
  - partial 재개 횟수만큼 늘어난다.
- 실측 분포가 없다. `typicalRange`는 근거가 있는 상품만 넘긴다.

검증
- node 테스트 13개 파일 152/152 통과.
  - love-secret 5종: wake-recovery·paid-delivery·pdf-chapters·rejection-repair·speaker.
  - 그 밖: mobile-pricing-source·paid-generation-timeout·paid-library-completion·feature-visual-details·signature-detail-chapters·saju-authority-consumers-a·locale-request-boundaries·generation-progress.
- `verify-love-secret-ai-flow` PASS(변경 전에도 PASS), `verify-paid-gate-ui-regression` PASS.
- `npm run typecheck` 깨끗, eslint 깨끗, `npm run verify:hero-contrast` 경고·실패 없음.
- sitemap 원장·`index.html`·셸·무료 배너는 바꾸지 않았다. 그래서 `sync:public`·`verify:sitemap-drift`는 필요 없다. `check:fast`는 돌리지 않았다(지시).
- 화면 확인(과금 호출 없음)
  - 방법: `npm run dev:next -- -p 12931 -H 127.0.0.1`에 Playwright로 `**/api/**`를 전부 가로챘다.
    - result GET → partial.
    - 확정 모드: 첫 generate POST → `completedGroups` 2개/`totalGroups` 7, 그 뒤 응답 보류.
    - 불확정 모드: 첫 POST부터 보류.
    - `form.requestSubmit()`이 pending-generation 경로를 타서 결제를 거치지 않는다.
  - 스크립트: `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\ls-shot.mjs`.
  - 캡처: `D:\Development\Temp\claude\ec29f026d20d029c\5016f536-7db3-4def-b6e1-84b5f5a786cd\scratchpad\shots\` 아래 `ls-390-determinate.png`·`ls-390-indeterminate.png`·`ls-1440-determinate.png`.
  - 측정
    - 알림 영역 "일곱 갈래의 상담을 동시에 쓰고 있어요 / 2 / 7 갈래 완성", progressbar now 2·max 7.
    - %는 없고, 레일은 숨었다.
    - 가로 넘침 0, 초상 `yeoni-love-portrait-360.webp`.
- visual-checker(하위 에이전트) 판정: 5문항 모두 PASS.
  - 390 잘림·넘침 없음.
  - 대비: 제목·상태 12.52:1, 설명 7.06:1, 갈래 수 6.45:1, 경과 7.06:1, 안내 11.12:1.
  - 채움 28.56%(2/7 = 28.57%).
  - 불확정 흐름 막대 보임(3.33:1), 숫자·% 없음.
  - 1440 카드 788×498 가운데, 초상 118px.
- dev 서버(12931, PID 15604·부모 25136, 02:54 시작)를 트리째 끄고 12931·12828·12829가 빈 것을 확인했다.

함정
- 이전 스크립트에서 `/^( *)generatingCardSubtext: .*$/gm`이 타입 줄까지 13곳에 걸렸다. `": "` 뒤 따옴표까지 넣어(`generatingCardSubtext: ".*`) 12개 언어만 잡았다. 스크립트는 개수가 다르면 쓰기 전에 멈추게 해 두어 부분 수정은 없었다.
- Git Bash `grep -c $'\r$'`가 CRLF 파일에서 0을 냈다(셸 따옴표 문제). CRLF 보존은 node로 셌다(CRLF 2893, 맨 LF 0).
- 화면 확인은 `npm run dev`(로컬 인증 트리 12828/12829) 대신 `dev:next`를 단독 포트로 띄웠다. API를 전부 가로채므로 인증 서버가 필요 없다.

후속(보고만)
1. 빈 트랙과 카드의 대비가 1.16:1(테두리 1.39:1)이라 막대 끝이 옅다. 같은 정보를 "N / M" 글자가 전하므로 두었다. 손보려면 `--gp-track`이나 테두리를 한 단계 진하게 한다.
2. 네오용 고정 보라 토큰이 없다. 네오 강조는 `--cd-samples-lilac`과 `--cd-neo-letter-silver`로 했다.
3. 설계에 적힌 `public/images/fortune-chat/moments/{yeoni,neo}-loading.webp`는 쓰지 않았다(돼지 연이·사자 네오). 상품 상세와 같은 인간형 마스터 초상(`masterProfiles.*.portrait`)을 호출하는 쪽에서 넘긴다. 메모리 "네오는 인간, 사자 아님"과도 맞다.

신년운세 이어받기 메모 (코드 변경 없음, 위치만 확인)
- `app/new-year-ai-consultation/NewYearAiClient.tsx`(CRLF)
  - L600-660 `READING_STAGES`·`READING_PROGRESS_CAP=92`·`READING_EXPECTED_MS=48000`·`readingProgressFromElapsed`(가짜 이징), `ReadingProgressPanel({percent})`(퍼센트 progressbar).
  - L657 근처 안내 "다른 앱으로 옮기거나 창을 닫으면 잠시 멈추고…"가 고칠 문구다.
  - 인라인 CSS `.nyai-progress*`는 ~L2523-2600, 미디어 규칙은 L1457이다.
  - 실제 `progress.completed/total`은 ~L1659(아직 읽지 않음).
  - `readDevPreviewState`(L50, 사용 ~L1905)로 대기 화면을 띄울 수 있을지 먼저 본다.
- 초상은 `masterProfiles.neoNewYear.portrait/portraitSrcSet`, `persona="neo"`.
- 크론 레지스트리 L17에 `new-year-ai`가 있다(`llmMeta.resumeBody`). 떠남 안내 원문을 쓰기 전에 클라이언트 이어쓰기(다시 열면 저장된 분야부터)를 코드로 확인한다.
- `READING_EXPECTED_MS` 주석의 "4섹션 시절 실측 40~55초"는 지금 섹션 수와 다를 수 있다. "보통 N~M분" 근거로 쓰기 전에 현재 섹션 수와 맞는지 확인하고, 아니면 뺀다.

### 묶음 ④ 단계 9 결과 — 신년운세·인생의 책 (2026-11-14 완료, 미push)

커밋
- `6c48059f9` feat(new-year): 생성 대기 화면을 GenerationProgress 로 이전
- `27e2c5eb2` feat(life-book): 집필 대기 화면을 GenerationProgress 로 이전

신년운세 (`app/new-year-ai-consultation/NewYearAiClient.tsx`, CRLF 유지)
- `NewYearGenerationPanel`이 `<GenerationProgress persona="neo">`를 그린다. 초상은 `masterProfiles.neoNewYear`, 단위는 "분야 완성", `timing`.
- 상태 `readingCount`(`{completed,total}|null`)가 `readingProgress`(퍼센트)를 대신한다. applyResult는 미완료일 때 `result.progress ?? null`만 넣는다.
- 지운 것: `READING_STAGES`·`READING_PROGRESS_CAP`·`READING_EXPECTED_MS`·`readingProgressFromElapsed`·`readingStageLabel`·`ReadingProgressPanel`, 250ms 가짜 진행 effect, 인라인 `.nyai-progress*` CSS.
- 떠남 안내
  - 웹: 공용 원문을 그대로 쓴다. 근거는 sid·pendingSessionId → loadSession → startConsultation({resumeSessionId}), 서버의 savedSections 재사용, 크론 `new-year-ai`.
  - 토스: 다시 열어도 자동 재개가 아니라 '구매한 상담 이어보기' 버튼으로 이어 간다. 그래서 `NEW_YEAR_TOSS_LEAVE_NOTICE`를 쓴다.
- "보통": 뺐다. 40~55초 실측은 4섹션(V1) 값이고, 지금은 7섹션·여러 웨이브다.
- 단계 목록: 뺐다. 서버 progress로는 어느 분야가 끝났는지 알 수 없다.
- UI 전용: `ui-only-check` 13개 함수 SAME(setter `setReading(Progress|Count)` 제외).
- 픽스처: preservation 픽스처에서 지운 함수 3줄을 뺐다.
- 검사 스크립트: `scripts/verify-new-year-ai-flow.mjs` 표지를 `<GenerationProgress`로 바꿨다.

인생의 책 (`app/life-book-ai/LifeBookAiClient.tsx`, CRLF 유지)
- `{isBusy && <GenerationProgress persona="neo" …>}`를 그린다.
  - 초상은 `masterProfiles.yunLifeBook`(윤달, 인간형 + 흰 고양이)이다.
  - persona는 색 묶음이라, 윤달 테마에 맞는 어두운 달빛 묶음을 골랐다.
- 막대
  - `status === "generating"`일 때만 `waveProgress`(저장 섹션 수 / plan 길이 15·25)로 채운다.
  - 단위는 "부분 완성"이다. 섹션 수가 장 수와 다르기 때문이다.
  - 첫 웨이브 응답 전, opening·payment·navigating에서는 불확정 막대다.
  - 경과 시간과 떠남 안내는 generating일 때만 나온다.
- 지운 것: 점근선 `progress`, 가짜 `activeStep`, `startedAt`·`elapsedMs`와 1초 타이머, `GENERATION_STEPS`, 펄스 자리표시, `chapterCountUnit`. lifeBookCopy.ts의 `WRITING_STAGES` export는 그대로 두었다.
- 단계 목록: 뺐다. 섹션이 `Promise.allSettled`로 병렬로 쓰여 어느 장이 끝났는지 알 수 없다.
- 문구
  - 12개 언어에 `writingStatus`·`writingCountUnit`·`writingElapsedLabel`·`leaveSafeNotice`를 넣었다.
  - ko 떠남 안내는 `LEAVE_SAFE_NOTICE`이고, 다른 언어는 연애 비책 번역을 썼다.
  - ko 제목·설명은 해요체로 바꾸고, 병렬이라 "차례로"를 뺐다.
- 떠남 안내
  - 웹: 공용 원문을 그대로 쓴다.
    - 화면을 숨기면 다음 웨이브 전에 결과 화면으로 옮긴다(`goToResult`).
    - 결과 화면(`LifeBookAiResultClient.tsx` L1455-1480)은 202 partial을 받으면 resumeSessionId로 이어 쓴다.
    - 기록함 링크도 `/life-book-ai/result/?attemptId=`라 같은 결과 화면으로 간다.
    - 크론 `life-book-ai`가 덮는다.
  - 토스: 기록함·크론 경로를 확인하지 못했다. 그래서 `LIFE_BOOK_TOSS_LEAVE_NOTICE`로 확인한 사실만 말한다.
- "보통": 실측 근거가 없어 뺐다.
- UI 전용: `ui-only-check` 12개 함수 SAME(setter `set(StartedAt|ElapsedMs)` 제외). 지운 setInterval은 가짜 경과 타이머뿐이다.
- 테스트: `life-book-ux.static`의 progressbar 단언을 "GenerationProgress가 waveProgress로만 채운다·자체 progressbar 없음"으로 바꿨다.

검증
- node 테스트 통과: 신년운세 122/122, 인생의 책 113/113.
- worker jest(`npm run test:jest -- --runInBand`) 통과: new-year 34/34, life-book sections 41/41.
- 그 밖
  - `npm run typecheck` 깨끗하다.
  - `verify-new-year-ai-flow`·`verify-life-book-ai-flow`·`verify-paid-gate-ui-regression`·`verify:hero-contrast` 통과.
  - eslint 오류 0, 경고는 기존 것만.
- 화면 확인
  - 방법: `dev:next` + 스크래치 `gp-shot.mjs`. API를 모두 가로채 과금 호출은 없었다.
  - visual-checker 판정
    - 신년운세: 390 결정형·불확정형·1440 통과(채움 28.7%, 대비 10.2~15.5:1).
    - 인생의 책: 390 결정형·불확정형 통과(채움 40.0%, 대비 10.23~15.50:1, 초상 인간형).

후속(보고만)
1. 첫 방문 모바일에서는 고정 쿠키 배너가 대기 카드 아래쪽 떠남 안내를 가릴 수 있다(신년운세 390 불확정형). 페이지 쪽 문제다.
2. 인생의 책 카드가 남색이라 호박색·초록 페이지에서 떨어져 보인다. 호박색 persona를 만들려면 공용 CSS 토큰이 필요하다.
3. 신년운세 대기 화면 문구는 한국어 리터럴이다(예전 패널도 같았다).
4. 인생의 책 `PHASE_COPY`(opening·payment·navigating)는 한국어 전용 합니다체 그대로다.
5. 네오 신년 초상은 모바일 원(98px) 안에서 얼굴이 약 15px로 작다.

### 묶음 ④ 단계 9 결과 — 베다 (2026-11-14 완료, 미push)

커밋
- `be646a9f1` feat(vedic): 생성 대기 화면을 GenerationProgress 로 이전

베다 (`app/vedic-ai/VedicAiClient.tsx` CRLF 유지, `VedicAiClient.module.css`)
- `CosmosLoadingScreen`(L2649)이 `<GenerationProgress persona="neo">`를 그린다.
  - 초상은 `masterProfiles.yun.portrait`(윤달, 인간형)이다.
  - 상태는 기존 `phaseText || cosmosFallbackText`이고, 경과 시간을 센다(`timing`).
  - 막대는 불확정이다. 베다 서버는 그룹 진행 수를 주지 않는다.
- 서버 `basis.stages`가 있을 때만 그 아래에 `AnalysisBasisLoading`을 둔다. 재개 경로는 basis를 받지 않아 숨는다.
- 렌더(L3664): 로더가 `!consultation && phase === "start"`일 때 빈 상태 자리를 대신한다. 겹침(absolute) 대신 일반 흐름이라 39rem 패널에서 잘리지 않는다.
- 지운 것
  - 시간 기반 가짜 단계 점·문구(`cosmosStages`·`cosmosFooter`)
  - `COSMOS_GLYPHS`·`COSMOS_ORBITS`·`COSMOS_STARS`와 궤도 SVG·별 장식
  - CSS `.cosmosStars`·`.cosmosOrbit*`·`.cosmosStageDots`·`.activeCosmosDot`·`.cosmosProgress`·`@keyframes mandalaDrift`와 관련 reduced-motion 선택자
  - 쓰이지 않던 기존 `.cosmosLabelSwap`은 그대로 두었다.
- 문구
  - 12개 언어에 `generationTitle`·`generationElapsedLabel`·`leaveSafeNotice`·`tossLeaveNotice`를 넣었다(타입 L244-247).
  - ko 제목은 "윤달이 베다점 상담문을 쓰고 있어요", ko 떠남 안내는 `LEAVE_SAFE_NOTICE`, 다른 언어는 연애 비책 번역이다.
  - `GENERATION_TIMEOUT`의 "페이지를 닫지 말고"(옛 ko L545)를 12개 언어에서 "결제한 상담은 저장돼 있으니 잠시 뒤 다시 열면 이어서 받을 수 있어요"로 고쳤다(ko L526).
- 떠남 안내
  - 웹: 공용 원문을 그대로 쓴다.
    - 다시 열면 목록 조회의 `pendingSessionId` 또는 URL `cid` → `resumeSavedConsultation` → `pollVedicResult`(202면 `resumeSessionId`로 start)로 저장된 그룹 다음부터 이어 쓴다.
    - 크론은 `consultation-recovery-registry.js`의 `vedic-ai`(`llmMeta.resumeBody` 있는 문서)이고, 기록함은 `service-registry.js`의 `/vedic-ai/result/?id=`다.
  - 토스: 목록 조회가 `pendingSessionId`를 주지 않는다. 그래서 "이 화면으로 돌아오면 저장된 부분 다음부터 이어서 받아요"만 말한다(`tossLeaveNotice`). URL `cid`가 남아 있을 때만 참이다.
- "보통": 실측 근거가 없어 뺐다.
- UI 전용: `ui-only-check` 18개 함수 SAME이다(setter 제외 없음). startConsultation·startTossConsultation·handleSubmit·handleTossSubmit·resumeSavedConsultation·resumeTossConsultation·pollVedicResult·pollVedicTossResult·buildPayload·retryTossVedic 외.
- 픽스처: preservation 픽스처의 `CosmosLoadingScreen` 해시를 갱신했다(`93cde7…` → `0e4454…`).
- 테스트: 옛 cosmos 마크업을 단언하던 테스트는 없었다. `verify-vedic-ai-flow`는 mandala·print 표지만 본다.

검증
- node 테스트 통과
  - ziwei-result-disclosure·vedic-ai-wake-recovery·vedic-paid-resume·consultation-intro-hydration·mobile-pricing-source·generation-progress*·paid-generation-timeout*·paid-library-completion* 57/57
  - vedic UI 6파일 22/22
- 그 밖
  - `npm run typecheck` 깨끗하다.
  - `verify-vedic-ai-flow`·`verify-paid-gate-ui-regression`·`verify:hero-contrast` 통과.
  - eslint 오류 0, 경고 1(`Sparkles` 미사용)은 HEAD부터 있던 것이다.
- 화면 확인
  - 방법: `dev:next` + 스크래치 `gp-shot.mjs vedic`. 목록 조회만 `pendingSessionId`로 답하고, `?id=` 폴·start는 붙잡았다. 과금 호출은 없었다.
  - visual-checker 판정
    - 1440 통과
      - 오른쪽 열 가운데에 있고 남색 카드가 우주 톤에 맞는다.
      - 대비는 제목 15.5:1, '경과' 10.2:1, 떠남 안내 11.9:1이다.
      - % 없음, 초상 인간형.
    - 390 통과(쿠키 선택을 미리 넣고 다시 찍음). 카드 전체가 y16–479 안에 있고 겹침·잘림이 없다. 대비는 제목 15.5:1, '경과' 9.75:1, 떠남 안내 11.6–11.9:1이다. % 없음, 초상 인간형(지름 약 92px).

후속(보고만)
1. 모바일에서 대기 카드가 폼 아래(문서 y≈2900)에 있다. 재개 때 화면이 그리로 가지 않으면 사용자가 카드를 보지 못할 수 있다. 예전 오버레이도 같은 자리였다.
2. 모바일에서 "차트를 분석하는 중..."이 폼 상태줄·버튼·카드에 세 번 나온다.
3. 첫 방문 모바일에서는 고정 쿠키 배너가 대기 카드 아래쪽을 가린다(신년운세와 같은 문제). 캡처는 쿠키 선택을 미리 넣고 찍었다.
4. 불확정 막대 트랙 테두리 대비가 2.85:1로 그래픽 3:1에 조금 못 미친다. 공용 컴포넌트 토큰 문제다.
5. 윤달 초상(`yun-astrology-portrait.webp`, 600x720, 89KB)에는 srcSet이 없다.
6. 토스 재개는 URL에 `cid`가 남아 있을 때만 된다.
7. 기존 eslint 경고 `Sparkles` 미사용, 기존 미사용 CSS `.cosmosLabelSwap`.
8. 390에서 제목("…쓰고 / 있어요")과 떠남 안내 마지막 줄("저장해요.")에 한 어절만 남는다. 공용 컴포넌트에 `text-wrap: balance`/`pretty`를 쓰면 다듬을 수 있다(선택).

### 묶음 ④ 단계 10 결과 — 영냥이 대기 화면 (2026-11-14 완료, 미push)

커밋
- `b397bcddf` feat(yeongnyangi): 기다리는 화면에 경과 시간과 쓰는 중인 장 표시
- `d0d6f2144` fix(fortune): 생성 대기 불확정 막대 테두리 3:1, 줄바꿈 다듬기

A. 영냥이 `ReadingLoading` (`app/yeongnyangi/_components/ReadingLoading.tsx`, CRLF 유지)
- 새 props: `manifest?: ChapterSpec[]`, `timing?: boolean`. `Result.tsx` L226의 결과 폴링 화면만 `manifest={row!.manifest} timing`을 넘긴다. L247 의식 자리표시는 그대로다.
- L12 `waitCopy`: 12개 언어 문구. ko는 "기다린 시간", "N번째 장 쓰는 중 · 전체 M장"이다.
- L37: 쓰는 장 = 저장된 장 + 1. 장은 순서대로 하나씩 쓴다.
  - 장 제목은 manifest가 있을 때만 보인다. ko는 `title`, 다른 언어는 `v7Label(titleKey)`다.
  - 수가 없으면(`total=0`) `data-reading-count="indeterminate"`로 흐르는 막대만 보인다(L50). %는 없다.
- L40·L51: `useElapsed`로 m:ss를 센다. 알림 영역(`aria-live`) 밖에 두어, 장이 바뀔 때만 읽힌다.
- L27 떠남 안내(반말): "창을 닫아도 괜찮아. 남은 장은 서버가 이어서 써. 영냥이 보관함에서 다시 열면 그동안 쓴 장을 바로 읽을 수 있어."
  - 시간 약속은 없다. 생성 중일 때만 보인다.
  - 다른 언어는 기존 `copy.generating` 제목이 같은 사실을 말한다.
- CSS(`reading-loading.module.css`): `--yn-*` 토큰만 쓴다. 새 hex·dark:·prefers-color-scheme는 없다.
  - `.count`(금색)·`.chapterTitle`·`.elapsed`·`.flow`(`ynReadingFlow`)를 더했다. `prefers-reduced-motion`이면 멈춘다.
  - `.copy p`에 `text-wrap: pretty`, `.title`에 `balance`를 넣었다. 이미지는 건드리지 않았다.
- UI만 바뀌었다. `ui-only-check.mjs`로 `Result`·`load`·`generate`·`sameRequest`·toss 3개·`hideDeniedTossResult`를 비교하니 모두 SAME이었다(`^ const loading=` 줄만 뺌). API·워커 변경도 없다.

떠나도 안전한지 확인한 근거 (영냥이, 모두 참)
- `worker/yeongnyangi/queue.js`의 `consumeConsultationQueue`가 장마다 `generateNextChapter`를 실행하고 다시 큐에 넣는다. 브라우저와 상관없이 돈다.
- 다시 열면 `delivery.js`의 `readAndContinueFortune`이 GET에서 빠진 큐 인계를 다시 걸고, 저장된 장을 보여 준다. 토스 결과 GET(`worker/toss/routes.js` L570)도 큐에 넣는다.
- 운영은 `*/10` 크론(`worker/index.js` L2072)의 `runYeongnyangiRecovery`가 5분 넘게 버려진 주문을 다시 잡는다.
- 스테이징은 `crons = []`이지만 큐 소비자는 있다.

"보통 몇 분" 줄은 넣지 않았다. 실측 근거가 없고, 있는 것은 `chapterTimeoutMs`·`chapterLeaseMs` 같은 상한값뿐이다.

B. 공용 `GenerationProgress.module.css`
- 불확정 막대 트랙 테두리를 L140·L144의 기존 토큰 `color-mix`로 진하게 했다.
  - 네오: silver 45% + blue → 카드 바탕 대비 2.85 → **3.93:1**(픽셀 실측)
  - 연이: muted 70% + blush → 1.39 → 3.7:1(계산값)
  - 확정 막대(N/M 글자가 정보를 전함)는 그대로 두었다.
- 줄바꿈: `.title`에 `text-wrap: balance`, `.description`·`.status`·`.leave`에 `pretty`를 넣었다.

검증
- `__tests__/ui/yeongnyangi-result-focus.test.mjs`에 4개를 더했다: 경과 표시(알림 영역 밖), 실제 수로만 센 장, 가짜 % 없음, 반말 떠남 안내. 8/8 통과.
- `generation-progress.behavior`, `yeongnyangi-ui-locale-copy`, `yeongnyangi-reading-v7-copy`, `yeongnyangi-all-locales`: 38/38 통과.
- `npm run typecheck` 통과, `npm run verify:hero-contrast` 통과. 해당하는 영냥이 verify 스크립트는 없다(tarot-assets는 무관). check:fast는 돌리지 않았다(지시).
- 시각 검사(visual-checker 하위 에이전트)는 Playwright로 `/api/**`를 가로채고 쿠키 선택을 미리 넣어 찍었다. 과금·결제·DB는 없었다. 모두 통과했다.
  - 영냥이 390 세 장
    - 0장 저장: 비압축
    - 2장 저장: 압축 96px
    - manifest 없음: 흐르는 막대
  - 영냥이 1440 한 장
  - 대비는 제목 16.2:1, 금색 11.3:1, 흐린 글 11.1:1이다. 막대 금색 대 바탕은 9.2:1, 테두리 대 페이지는 3.21:1이다.
  - 고아 어절과 가로 넘침은 없다.
  - 귀는 2개다. 압축 96px에서는 왼쪽 귀가 작아 확정하지 못했지만, 같은 원본이다.
  - 베다 390 불확정은 테두리 3.93:1, 고아 어절 없음으로 통과했다.
- 개발 서버(3417)는 내렸고, 포트가 비어 있음을 확인했다.

후속(보고만)
1. questionSky에서 "전체 2장"은 사용자가 묻고 나서야 쓰는 후속 장까지 센다. 기존 데이터 그대로다(예전에는 "0 / 2"로 보였다).
2. manifest가 비면 `Result.tsx`가 `chapters.length===manifest.length`로 '검토 중' 단계를 고른다. 그래서 불확정 막대가 "최종 확인" 제목과 함께 보인다. 기존 단계 판정 로직이다.
3. 범위 밖 시각 결함 2건
   - "영냥이의 감사 인사" 카드에서 "찬찬히"가 "찬 / 찬히"로 끊긴다(keep-all 누락 추정).
   - 390 압축 화면에서 왼쪽 아래 떠 있는 버튼이 본문 제목 앞 글자를 가린다(스크롤 위치에 따라).
4. 결과 화면 하단 링크(이용약관 등, 높이 16~19px)는 44px 탭 기준에 못 미친다. 기존 상태다.

### 묶음 ⑤ 단계 12 결과 — 리베이스·검사 (2026-11-14, 미push)

리베이스
- 리베이스 전 끝: `e170013436a35ddff32bfde19635d4f50cc2b86f` (백업 브랜치 `backup/ux-conversion-pre-rebase-20261114`).
- 옛 기준: `02476159e`. 새 기준 origin/main: `a5d6f5814e996f7bc5292e40042c7a7fdb572421`. origin/main이 192커밋 앞서 있었다(대부분 toss 작업, SEO 세션의 브랜드·홈 title·배너·robots·lastmod 변경은 아직 origin/main에 없음).
- 우리 커밋 43개 → 41개로 옮겨졌다. 빈 커밋이 되어 빠진 2개: `a10578ada`(사이트맵 원장 서명만), `c674869d9`(숙요 보존 해시). 둘 다 아래 재생성·테스트 커밋으로 대신했다.
- 리베이스 뒤 끝(재생성 전): `64cdc03d0`.

충돌과 해결
- `config/sitemap-lastmod.json` — `273aa5ce6`·`d1eba2bae`·`81b1be43d`·`a10578ada`에서 충돌. 생성물이라 손으로 합치지 않고 origin/main 쪽을 받은 뒤 재생성했다.
- `app/love-secret-ai/LoveSecretAiClient.tsx` (`f554b8920`) — origin/main이 `LoveSecretHero`에 `showWebPrice` prop을 더했다. 그 줄은 origin/main 그대로 두고, 바로 아래에 우리 `ReviewProof` 줄만 다시 넣었다.
- `app/love-secret-ai/LoveSecretAiClient.tsx` (`98ca36812`, 2곳) — origin/main이 `buildResultUrl(..., paymentSurface)` 인자를 더했다. 그 인자는 유지하고, 진행률은 우리 `setGroupProgress`를 쓰며 옛 `setProgress` 줄을 뺐다. 결제 로직(`onSubmit`의 `price.confirm`)은 자동 병합된 origin/main 그대로다. 가격·결제·이용권·환불 로직 충돌은 없었다.
- `__tests__/fixtures/result-presentation-preservation.json` (`c674869d9`) — 기준 해시 충돌. origin/main 쪽을 받고 리베이스 뒤 다시 계산했다.
- `lib/marketing/free-promo.mjs`는 자동 병합됐다. 칩 href 구조 변경만 있고 문구 충돌은 없다.

재생성 (리베이스 뒤)
- `npm run sync:public`·`sitemap:generate`·`llms:generate`를 다시 돌렸다.
- `index.html` 미러 8개는 js·styles 해시 캐시 키(`?v=build-…`)만 바뀌었다.
- 사이트맵 원장·XML은 스크래치 도우미 `sitemap-sig-only.mjs HEAD`로 서명이 바뀐 라우트만 남겼다. 날짜만 바뀐 75개는 되돌렸다. 신규 `/saju/<slug>/` 9개가 들어가 있다.
- llms 출력은 바뀌지 않았다.
- 커밋 `ca4d878b6` chore(generated). 그 뒤 `verify:sitemap-drift` OK(URL 1081개), `verify:public-mirror-fresh` OK, `generate-llms-txt --check` OK.

리베이스로 생긴 실패와 수정 — 커밋 `3f3f5476b`
- `ziwei-result-disclosure.test.mjs` 보존 해시: `SukuyoCompatibilityAiClient` 해시를 `ad51ce12…`로 갱신했다. origin/main 대비 차이는 우리 `reviewProductId="sukuyo"` 한 줄뿐인 것을 diff로 확인했다.
- `core-landing-calculation-examples.test.mjs`: 6c-1에서 `FOCUS_RING`·`SectionHead`를 `seo-landing-parts.jsx`로 옮겨 템플릿 파일만 읽던 토큰 검사가 실패했다(이 브랜치 원인). 검사가 두 파일을 함께 읽게 고쳤다.
- `fortune/sky-and-range.test.mjs`: 무시 파일 `fortune/data/daily-2026-11-14.json`이 없어서 실패했다(환경 원인, 브랜치 무관). `npm run fortune:build-data`로 만든 뒤 통과했다. 추적 파일 변화는 없다.

검사 결과 (최종 끝 `3f3f5476b` 기준)
- `check:fast`: 그냥 돌리면 작업 트리=HEAD라 "검사할 변경 없음"으로 끝난다. 그래서 `node scripts/check-changed.mjs --profile=fast --skip-build --base=origin/main`으로 돌렸다.
  - 1회차: test:node 3건 실패(위 3건).
  - 수정 뒤 2회차: 통과(EXIT 0). test:node fail 0. 결제·이용권 verify 묶음과 build:worker 통과. test:jest 479 suites, 8004 tests 통과(1 skipped).
- 통과: `npm run typecheck`, `verify:hero-contrast`, `verify:mobile-detail-nonintrusive`, `verify:analytics-events`, `node scripts/verify-seo-entity-registry.mjs`(profiles=72), `verify:adsense-route-policy`, `verify:saju-fun-content-gate`, `verify:public-api-edge-cache`.
- 못 돌림: `verify:adsense-readiness`·`verify:home-identity`는 `dist/` 빌드 산출물이 필요하다. 빌드(`build-cf-main.mjs`)는 `fetch-published-cms.mjs`로 네트워크에서 CMS를 받아 오므로 이번 범위에서 돌리지 않았다.
- 대상 테스트
  - node:test 118파일(review-*, free-promo, free-feature*, yeongnyangi-*, love-secret-*, new-year-*, life-book-*, vedic-*, purchase-analytics, checkout-method-order, generation-progress, ziwei-result-disclosure 등): 923 통과, 0 실패.
  - jest 대상(record-library, review-create, review-author-masking 등 워커 후기 테스트 포함): 35 suites, 754 통과.
- 알려진 기존 실패(지시서에 적힌 것, 이 브랜치 무관): `home-service-separation.test.cjs` `.yh-concerns` 1건. 그대로 둔다.
- `npm run check:pre-push`: 통과(EXIT 0). 스크립트는 push하지 않는다(home-service-registry → public-mirror-fresh → sitemap-drift → llms --check → seo-entity-registry → repo-hygiene).
- 줄바꿈: origin/main에서 CRLF였다가 LF로 바뀐 파일은 0개다.
- 개발 서버는 띄우지 않았다.

SEO 동시 점검 (정적, 네트워크 없음)
- 신규 `/saju/<slug>/` 9개(four-cut, dopamine, teto-egen, t-test, lotto-ritual, ai-prompt-card, skill-tree, natal-chart, season-rhythm)
  - title(32~38자, "| 꿀꿀 운세")·description(63~70자)·H1이 서로 맞고, 9개 모두 다르다.
  - canonical은 `buildSeoMetadata(path)`가 만들고 trailingSlash다.
  - `indexable: true` → noindex 없음. 사이트맵 9/9, llms-full 9/9.
  - JSON-LD는 WebPage·BreadcrumbList·FAQPage다. FAQ는 화면의 `<details>` 목록(2~4문항)과 같은 데이터다. Offer·price·isAccessibleForFree·AggregateRating은 없다.
  - 레지스트리 primary 키워드는 72개 중 중복 0이다(9개 primary: 사주 네컷, 사주 도파민, 테토 에겐 사주, 극T 테스트, 사주 로또, 사주 AI 프롬프트, 인생 스킬 트리, 사주 12신살, 사주 절기).
- `/`: 우리 변경은 영냥이 카드의 "N원부터" 표시뿐이다(결제 카탈로그 `saju_mackerel` 값, 앱 빌드 제외). title·H1·description·JSON-LD는 바꾸지 않았다.
- `/yeongnyangi/`, 대표 상품 3개(`/love-secret-ai/`·`/new-year-ai-consultation/`·`/life-book-ai/`): 우리 diff에 metadata·H1·JSON-LD 변경이 없다. ReviewProof는 JSON-LD를 만들지 않는다(클라이언트 데이터라 AggregateRating 금지 주석 유지).
- `/reviews/`: `robots: { index: false, follow: true }` 유지.
- SEO 세션과 겹침: origin/main(a5d6f5814)에는 아직 SEO 세션의 브랜드·홈 title/H1·배너 문구·robots·lastmod·`?action=` 변경이 없다(192커밋은 toss·sitemap 원장 위주). 그래서 맞출 문구 충돌은 없었다. 우리 신규 페이지는 브랜드를 title 끝 "꿀꿀 운세"로만 쓰고 '영냥이' 표기는 없다.
  - push 직전에 SEO 세션 변경이 origin/main에 들어와 있으면 다시 리베이스하고, 브랜드 결정("꿀꿀 운세 안의 영냥이 상담")과 우리 페이지 문구를 다시 대조한다.

남은 일
- 실화면 판정(visual-checker 390·1440, 설계 §12 목록) → 스테이징 push(내 커밋만 `git push origin HEAD:main`). 운영 승격은 승인되지 않았다.
- push 직전 `git fetch` 후 origin/main이 또 움직였으면 다시 리베이스하고 재생성·검사한다(사이트맵 원장은 서명만).
- 백업 브랜치 `backup/ux-conversion-pre-rebase-20261114`는 push가 끝나면 지운다.

### 묶음 ⑤ 단계 12 결과 — 실화면·push (2026-11-14)

실화면 판정 방법
- dev 서버 1개(`npm run dev:next -- -p 12941 -H 127.0.0.1`), Playwright 390·1440, 쿠키 선택(`cd_cookie_consent=essential`)과 영냥이 프롤로그 읽음을 미리 넣었다.
- `page.route('**/api/**')`로 모든 API를 가로챘다. 후기 상품·자격·요약·목록과 영냥이 완료 요청만 가짜 JSON을 주고, 나머지는 404를 돌려줬다. 유료 모델 호출, 실제 결제, 운영 DB 접근은 없었다.
- 후기 자리표시 3건("화면 확인용 자리표시…")은 캡처에만 쓰였다. 저장소와 DB에는 넣지 않았다.
- 스크린샷은 visual-checker 하위 에이전트가 읽었다. 대비는 픽셀 값을 sharp로 쟀다.
- 끝난 뒤 dev 서버 트리를 종료했고 12941 포트가 비었음을 확인했다.

판정 (페이지 · 폭)

| 화면 | 390 | 1440 | 근거 |
|---|---|---|---|
| `/` 무료 배너 | PASS | PASS | 1440 카드 1080px 가운데 정렬, 칩 44px, 대비 5.91~15.38:1 |
| `/` 영냥이 카드 가격 | PASS | PASS | "10,000원부터" 한 번 표시, 연이 카드엔 가격 없음, 가로 넘침 0 |
| `/saju/four-cut/`·`natal-chart/`·`season-rhythm/` | PASS | PASS | H1 일치, 이미지 표시, 대비 ≥5.3:1, 시작 버튼이 첫 화면 안 |
| `/love-secret-ai/` 인트로 ReviewProof | PASS | PASS | summary 모드(평균 4.3·3건, 보상 표시, 고지문), 대비 ≥10.37:1 |
| `/love-secret-ai/` 단계 가격 줄 | PASS | PASS | "상담 이용 가격 30,000원" 6.55:1. 글자가 11~12px로 작다(후속) |
| `/new-year-ai-consultation/`·`/life-book-ai/` ReviewProof | PASS* | PASS | facts 모드. *390에서는 하단 고정 바와 dev 전용 버튼이 일부를 가렸다(캡처 시점 문제, 아래) |
| `/yeongnyangi/` 히어로 가격 | PASS | PASS | "질문 상담 10,000원부터" 11.1:1, 영냥이 귀 2개 |
| `/yeongnyangi/` 가격 안내 | PASS | PASS | 9.5:1. 390 "기/준" 줄바꿈은 기존 문제. 390 가격 캡처 1장은 대상이 어긋나 푸터를 찍었다(재촬영 안 함) |
| `/yeongnyangi/` "예시 먼저 보기" | PASS | PASS | 클릭하면 `#yn-example` details가 열린다(`open=true`). 13.2:1. 밑줄은 `.journey a` 규칙으로 이미 있다. 축소 캡처에서는 얇아서 잘 보이지 않았다 |
| 영냥이 결제 목업 | PASS | PASS | 순서가 버튼 → 안심 문구 → 약관 링크다. 고정 결제 바(y≈735)가 약관을 가리지 않는다. 9.0~10.0:1 |
| 결과 화면 후기 작성기(영냥이, 목업) | PASS | PASS | 별 약 55~59×51px, 태그 3/3 묶음, "4점 · 좋아요" |
| `/reviews/?write=1&product=love-coach` | PASS | PASS | love-coach가 미리 선택된다 |
| `/reviews/?product=yeongnyangi` | PASS | PASS | 보상 표시 7.52:1, 작고 튀지 않는다 |
| 대기 화면: 신년운세(꿀꿀) | PASS | PASS | 막대 28.6%(2/7), 퍼센트 글자 없음, ≥9.13:1, 은발 인간 네오 |
| 대기 화면: 영냥이 | PASS | PASS | ≥9.2:1, 귀 2개 |

이 브랜치가 만든 회귀: 없음. 이번 단계에서 고친 코드는 없다(수정 커밋 없음).
- 여러 390 캡처의 왼쪽 아래 버튼(결제 바 "총 결제 금액", 작성기 칩, 후기 모달 동의 체크박스, 신년·인생의 책 본문을 가림)은 dev 전용 "개발 결제 테스터"(`fixed bottom-4 left-4`)다. 이 브랜치 diff에는 함정 메모 한 줄로만 나온다. 운영과 상관없다.
- 작성기 제출 버튼 `.cd-quick-review__submit`과 별 색 CSS는 이 브랜치 diff에서 바뀌지 않은 줄이다. 바뀐 것은 태그 묶음 grid뿐이다.

재리베이스 (push 직전)
- `git fetch` 결과 origin/main이 `a5d6f5814` → `f63ff9bb0`로 5커밋 움직였다(toss 위주, `41e168dd7` handoff 규약 검사 완화). 백업 `backup/ux-conversion-pre-rebase2-20261114`를 만든 뒤 리베이스했다.
- 충돌은 `config/sitemap-lastmod.json` 1건이었다. 생성물이라 upstream 값을 받고, 사이트맵 XML 12개도 upstream 값으로 맞췄다.
- 그 뒤 `sitemap:generate`·`llms:generate`·`sync:public`을 돌리고 서명 전용 도우미를 적용했다(서명이 바뀐 47개 라우트만 남기고 날짜만 바뀐 375개는 되돌림) → `c4843b4e5`.
- SEO 세션의 브랜드·title 변경은 아직 origin/main에 없다. 그래서 문구를 맞출 일이 없었다.

### 묶음 ⑤ 단계 12 결과 — push 뒤 CI·스테이징 수정 (2026-11-14)

본편 push
- 두 번째 재리베이스: origin/main이 `f63ff9bb0` → `b69eea884`로 움직였다. 충돌은 없었다.
- `git push origin HEAD:main` 범위: `b69eea884..3b82aa2ce`.

push 뒤 깨진 것과 고친 것(모두 이 브랜치가 원인)
1. 스테이징 배포 실패 — `[adsense-readiness] out/saju/lotto-ritual: <title> 표시 폭 61 > 60`.
   - title을 '사주 로또 리추얼 — 일진으로 뽑는 상징 번호 | 꿀꿀 운세'(54)로 줄였다. H1은 그대로다 → `65d8accfe`.
   - 로컬 전체 빌드에서 adsense-readiness·home-identity가 둘 다 통과했다.
2. Yeongnyangi Browser Shadow — `Unrecognised API`: `GET /api/reviews/summary`, `GET /api/reviews`(ReviewProof).
   - 픽스처에 공개 읽기 두 개를 빈 응답으로 추가했다(승인 후기는 넣지 않음) → `00433b122`.
3. PR CI Critical checks — toss 계약 테스트 4개 파일.
   - native-delivery-messages: `setGroupProgress` 스텁 추가.
   - records-access·records-recheck·records-refresh: `@/app/components/review/review-ui`의 `reviewWriteHref` 목 추가 → `9733ee4ce`.
4. 사이트맵 원장 — 1번 수정 때 재생성하면서 서명이 그대로인 375개 라우트까지 날짜가 올라갔다.
   - 서명 전용 도우미로 되돌려 서명이 바뀐 9개만 남겼다 → `eeebfadaf`.
5. Shadow `webkit-expired-login` — 재로그인 직후 `page.goto`가 `/login/`을 떠날 때 끊긴 `/i18n/ko.json` 읽기를 WebKit이 접근 제어 오류로 올렸다.
   - 재실행 2회 모두 같았다. `loadDictionary`는 catch로 null을 돌려준다.
   - 그래서 `/login/` 페이지·이 시나리오에서만 취소로 분류했다 → `e1fc882d7`.
   - WebKit이 로컬에 없어 CI에서 확인했다. 결과는 통과(아래).

push 범위(수정분): `fece5889d..eeebfadaf`(1~4), `b67b027f3..e1fc882d7`(5). 매번 fetch 뒤 리베이스했다. 충돌은 없었고 force-push는 하지 않았다.

검사
- 로컬
  - `check-changed --base=<upstream>`(build:cf 포함): 통과.
  - `check:pre-push`: 3회 모두 통과.
  - sitemap-drift·mirror-fresh: 통과.
  - toss 전체 1590건 중 1589건 통과. 1건은 로컬에 `@apps-in-toss/devtools`가 없는 환경 문제이고 CI에서는 통과한다.
  - 영냥이 chromium 매트릭스: 통과(로컬 정적 서버가 리다이렉트 때 쿼리를 버리던 문제를 고친 뒤).
- 다른 세션의 `D:Developmentcode-destiny` dev 서버(별도 .next) 때문에 빌드 가드가 막혀 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 돌렸다. 그 서버는 건드리지 않았다.
- CI
  - PR CI `26b2f860b`(우리 커밋 포함): 전체 job 통과.
  - `eeebfadaf` 자체의 PR CI는 뒤 push에 밀려 취소됐다.
- 스테이징 배포: dispatch `43563647504`(eeebfadaf) 성공, 마지막 dispatch `43572225433`(e1fc882d7) 성공. 이제 staging `version.json` gitSha는 `e1fc882d7`이다.
- `e1fc882d7`: Yeongnyangi Browser Shadow `43572170854`(webkit 포함) 통과, PR CI `43572170878` 통과.

스테이징 라우트 (plain GET, 2026-11-14 · eeebfadaf/26b2f860b에서 H1을 확인했고 e1fc882d7에서 다시 200을 확인)

| 경로 | HTTP | H1 |
|---|---|---|
| `/` | 200 | 마음이 가는 카드를 골라보세요 |
| `/saju/four-cut/` | 200 | 사주 네컷 — 오늘의 일주로 만드는 인생네컷 |
| `/saju/natal-chart/` | 200 | 사주 명식과 12신살 — 네 기둥 여덟 글자 읽기 |
| `/saju/season-rhythm/` | 200 | 내 절기 리듬 — 태어난 절기로 읽는 월령 |
| `/saju/lotto-ritual/` | 200 | 사주 로또 리추얼 — 오늘의 상징 번호 (title 54폭 반영) |
| `/reviews/?product=yeongnyangi` | 200 | 실시간 사용자 리뷰 — 구매 인증 후기 모음 |

스테이징은 모든 경로가 `noindex,nofollow`다(스테이징 규칙).

정리
- 백업 브랜치 2개를 삭제했다.
- 스크래치 정적 서버와 dev 서버를 종료했다. 3118·12941 포트가 비었다.
- 워크트리는 남겼다.
- 운영 승격은 하지 않았다. 사용자 승인 1회가 필요하다.

## 후속 과제 (통합, 중복 제거 — 2026-11-14)

위 각 절의 "후속"을 모았다. 해결된 항목(취소선, 단계 5 후속 1~3)은 뺐다. 모두 이 브랜치에서 고치지 않았다.

후기·신뢰 (법무·운영 판단 포함)
1. 운영진이 등록한 후기에 "운영진 작성" 표시가 없다.
2. 후기 POST에 rate limit이 없다.
3. `/ggulggul/` `index.html`에 죽은 후기 위젯 스크립트와 쓰지 않는 AggregateRating 빌더가 남아 있다.
4. `app/records/view/SavedRecordClient.tsx`의 후기 링크에 `product=`가 없다.
5. `QuickReviewComposer`의 `review_ui_view`가 두 번 전송될 수 있다(`eligible.length`가 바뀌면 다시 구독함).
6. `ReviewsClient` `loadReviews`에 늦게 도착한 응답을 버리는 가드가 없다.
7. `ReviewsClient` 대비 부족(기존 hex): placeholder 2.54:1, 글자 수 카운터 4.21:1, "4일 전" 4.25:1, 별 2.38:1.
8. 작성기 문제
   - 선택된 금색 별이 선택 안 된 흰 별보다 어두워 보인다(기존 CSS).
   - 제출 버튼이 칩과 비슷해 눈에 덜 띈다.
   - 보상 문구가 두 번 나온다.
9. ReviewProof 예약 높이는 390 기준이다. 실제 후기가 쌓이면 카드 모드 높이로 다시 맞춘다.

구매 흐름·가격 표시 (가격 값 자체는 RED, 표시만)
10. love-secret 390 "내 정보" 단계
    - `SavedBirthProfilePicker`가 헤더 폭을 다 차지해 제목 열이 0px로 무너진다.
    - 헤더에 `flex-wrap`을 주거나 피커를 헤더 아래로 내려야 한다.
11. love-secret 가격 표시
    - 마지막 단계에서 같은 가격이 두 번 보인다.
    - 단계 가격 줄은 11~12px로 작다.
    - toss에서 보이는 PriceBadge가 토스 단건 가격과 같은지 따로 확인해야 한다.
12. `NightPriceDetails` "기/준" 줄바꿈과 감사 카드 "찬/찬히" 줄바꿈은 `word-break: keep-all`이 빠져서 생긴다.
13. `js/feature-detail-panels.mjs` fortuneFounder 링크 `/yeongnyangi/#founder-records`는 죽은 앵커다. 바꿀 때 검사 스크립트 2개와 테스트 1개도 함께 고쳐야 한다.
14. 결과·결제 화면의 약관 링크(15px 인라인), 결과 하단 링크(16~19px), 푸터 5개 요소가 44px 탭 기준에 못 미친다.

무료 배너·상세 페이지
15. 1440 묶음 열 높이가 고르지 않다(타일 9/6/7). 고치려면 콘텐츠 이동이 필요하다.
16. 모바일 홈 카드가 약 1233px로 길다. `<details>`로 접는 안은 설계 밖이라 보류했다.
17. 영냥이 390 말풍선
    - 글자 폭이 약 150px에 5줄로 좁다.
    - "열어 / 뒀어요!"가 갈라진다.
18. 아이콘·버튼 대비
    - 셸과 영냥이 버튼 아이콘 대비가 2.34~2.93:1로 React 화면과 어긋난다.
    - 영냥이 공유 버튼 경계 대비가 1.08:1이다.
19. 홈 `.page :where(a){color:inherit}`가 넓어서 다른 링크 버튼도 덮어쓸 수 있다.
20. 스킬 트리 trustNotes 원천 문구가 어긋난다("고정값" vs "변할 수 있습니다"). 셸 사주 결과 카드에는 그대로 남아 있다.
21. hover·focus 색과 네오 테마 영냥이 화면은 정지 캡처로 확인하지 못했다.

생성 진행·대기 화면
22. 불확정 막대 대비
    - 빈 트랙이 1.16:1, 테두리가 1.39:1이다.
    - 베다 트랙 테두리는 2.85:1로 그래픽 기준 3:1에 못 미친다.
    - 공용 토큰 `--gp-track`을 조정해야 한다.
23. 네오 전용 보라 토큰이 없다. 지금은 `--cd-samples-lilac`과 `--cd-neo-letter-silver`로 대신한다.
24. 첫 방문 모바일에서는 고정 쿠키 배너가 대기 카드 아래쪽(떠남 안내)을 가린다(신년운세·베다).
25. 대기 화면 이미지
    - 인생의 책 카드가 남색이라 페이지 색과 떨어져 보인다. 호박색 persona 토큰이 필요하다.
    - 네오 신년 초상은 얼굴이 약 15px로 작다.
    - 윤달 초상에 srcSet이 없다.
26. 대기 화면 문구
    - 신년운세 문구와 인생의 책 `PHASE_COPY`는 한국어 리터럴이다.
    - 베다 모바일에서는 "차트를 분석하는 중..."이 세 번 나온다.
    - 390 제목 끝에 한 어절만 남는다. `text-wrap: balance`를 쓸지 선택한다.
27. 베다 대기 카드가 폼 아래(y≈2900)에 있다. 토스 재개는 URL에 `cid`가 남아 있을 때만 된다.
28. 영냥이 대기 화면
    - questionSky "전체 2장"이 후속 장까지 센다.
    - manifest가 비면 "최종 확인" 제목과 불확정 막대가 함께 보인다.
    - `<progress>`는 chapters/(manifest+1) 식이라 28.5%로 보인다.
    - 목차 "1 / 6"과 "3번째 장"이 어긋난다.
    - 모두 기존 로직이다.
29. 설계에 적힌 `moments/{yeoni,neo}-loading.webp`는 쓰지 않는다(돼지·사자 그림이라). 지울지 판단해야 한다.
30. 베다 eslint 경고(`Sparkles` 미사용), 쓰지 않는 CSS `.cosmosLabelSwap`.

검사·운영
31. ~~`verify:adsense-readiness`·`verify:home-identity` 미실행~~ — 2026-11-14 로컬 전체 빌드와 스테이징 배포에서 둘 다 통과했다(로또 title 61→54 수정 뒤).
32. 알려진 기존 실패: `home-service-separation.test.cjs` `.yh-concerns`.
33. SEO 세션의 브랜드·title 변경이 들어오면 신규 `/saju/<slug>/` 9개 문구를 "꿀꿀 운세 안의 영냥이 상담" 결정과 다시 대조한다.
34. 운영 승격은 사용자 승인이 1회 필요하다(이번에는 스테이징까지만 승인됨).
