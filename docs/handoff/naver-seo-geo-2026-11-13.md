---
status: in-progress
updated: 2026-11-14
next: 사용자 결정 대기(push 승인, 홈 title·H1 선택, C5 이름 통일, 이용권 혜택 문구). 승인되면 origin/main에 rebase하고 생성물을 다시 만든 뒤 push. 묶음 1 구현은 끝
---
# 네이버 SEO·AEO·GEO + 구매 동선 (Phase 1~5)

Phase 0 보고서와 승인된 계획의 정본은 `docs/seo/phase0-report.md`다. 문제 ID(C1, K3 등)는 그 문서의 문제 목록을 가리킨다. 이 문서는 진행 상태와 함정만 적는다.

## 첫 행동
1. 이 워크트리에서 작업한다: `D:\Development\codedestiny-worktrees\codedestiny-worktrees\naver-seo-geo-20261113-234756` (브랜치 `wt/naver-seo-geo-20261113-234756`, origin/main `f2db2995d`에서 분기). 경로의 `codedestiny-worktrees`가 두 번 겹친 것은 생성 스크립트를 다른 워크트리 안에서 돌린 탓이고 동작에는 문제없다. `node_modules`는 메인 폴더로 연결한 junction이다.
2. `git fetch origin` 뒤 origin/main이 앞서 있으면 rebase한다. UX 세션 커밋이 main에 들어왔는지 `git log origin/main --oneline -20`으로 확인한다.
3. `docs/seo/phase0-report.md`의 "실행 계획"에서 `next` 단계만 진행하고, 끝나면 아래 체크박스·결과(SHA)를 갱신해 커밋한다.
4. 파일 경로는 추측하지 않는다. 보고서의 줄 번호는 `f2db2995d` 기준이므로 고치기 전에 `rg`로 다시 확인한다.

## 지금 상태
- 브랜치 `wt/naver-seo-geo-20261113-234756`, 기준 `f2db2995d`. 운영 배포본은 `91e4261d8`(그 위에 문서 커밋 1개).
- 2026-11-14: 묶음 1 구현·검증 끝(1-4의 C5만 보류). 코드 마지막 커밋 `23c689fd2`. push 없음. push 승인을 기다린다.
- 2026-11-14 확인: origin/main이 `f2db2995d` → `c3a960736`으로 44커밋 앞서 갔다(대부분 toss 작업, `app/yeongnyangi/_components` 4개 파일 포함). 이 브랜치의 기준은 아직 `f2db2995d`다. **push 전에 rebase가 필요하다.** UX 브랜치는 아직 미머지.
- 루트 체크아웃 `D:\Development\code-destiny`는 다른 브랜치이고 origin/main보다 2,252커밋 뒤라 기준으로 쓰지 않는다.

## 승인 상태
- 2026-11-13 사용자가 계획 전체를 승인했다(계획 모드 승인). 승인 범위는 묶음 1~5의 **구현과 로컬 커밋**까지다.
- **main push(스테이징)는 묶음마다 사용자 승인**, **운영 승격은 별도 승인**이다. 사용자 답변 원문: 작업 방식 = "저장소 규칙대로 (Recommended)" — origin/main 기반 전용 워크트리, 묶음마다 승인 뒤 내 커밋만 main push, 운영 승격은 별도 승인.
- 확정된 결정(2026-11-13, 사용자 직접 답변):
  - 로그인 시점 = "로그인 없이 결과" — 랜딩 CTA를 로그인 없는 결과 경로로, 저장·유료 구매 때만 로그인.
  - `/points/` = "차단만 풀고 noindex 유지".
  - 상품 정리 = "이름·표기만 정리" — 결제 구조·가격 불변. 생선 등급은 "가격 + 분량"이 주 표기, 생선명은 보조.
- 브랜드 결정(UX 세션이 사용자 원문을 전달했고, 계획 승인으로 확정): 대표 이름은 "꿀꿀 운세" 하나. 영냥이는 상담가·상품 이름으로만 쓴다. "운세보는 영냥이"·"사주보는 영냥이"는 description과 alternateName에만. `lib/brand/brand-facts.mjs`의 2026-10-16 결정을 대체하고 version·reviewedAt을 올린다.
- 2026-11-14 추가 확정(조정 세션이 사용자 답변을 전달. 원문 그대로 적는다):
  - C7·C8·F4 문구 = "이 부분은 실제 가격과 동일하게 해주면될것 같다". 대상은 "66종 · 302,000원 상당", 29,000원 묶음, 작은 꿀단지 상한 문구. → 단계 1-12.
  - sameAs = 지금 있는 6개 유지 + 카카오 채널 '꿀꿀운세' `https://pf.kakao.com/_GgxaGX`(출처 `lib/marketing/kakao-crm.mjs`의 `KAKAO_CHANNEL.url`) 추가. 다른 URL은 추가하지 않는다. → 1-5에서 처리.
  - 검수 범위 = "핵심 허브만, 읽은 뒤 표시". 검수자 박병하(운영자). 원장은 계속 비워 두고, 사용자가 "URL · 확인한 날짜"를 알려 주면 그때 넣는다. → 1-10 체크리스트에 반영.
- **아직 승인받지 않은 것**(구현하지 말고 선택지를 정리해 사용자에게 묻는다):
  - 홈 title·H1 확정 문구와 전체 title/description 표 — `docs/seo/meta-table.md`에 현재 → 제안 표를 만들어 승인받은 뒤 적용.
  - 홈 이원화(B3), `/compare/` 인덱스(A3), 번역 페이지 noindex.
  - 검수 원장 항목 — 사용자가 실제 검수했다고 "URL · 확인한 날짜"를 알려 준 페이지만 넣는다.

## 작업 규칙과 함정
- 사용자 프롬프트의 절대 규칙(그대로 유지):
  - 최소·외과적 변경. 리팩터링·디자인 전면 교체 금지. 데스크톱 960px 레이아웃 유지. 모든 사용자 노출 문자열은 i18n 키 사용.
  - `sajuAdapter.ts`의 `calculateLocalResult()` 수정 금지. KASI prefetch에 timezone 주입 금지, `normalizeSaju.ts`에 timezone 필드 추가 금지. 6개 점술 엔진은 읽기 전용.
  - PortOne/Inicis 결제 실행 파일은 범위 밖. 결제창 호출 이전의 UI·문구·라우팅만 다룬다. 결제 실행 파일을 건드려야 하면 변경 제안서(`docs/seo/payment-change-proposal.md`)만 쓰고 멈춘다.
  - Android WebView의 Google OAuth는 Custom Tabs 전용 유지. 폐기 코드는 `_graveyard/` 격리. 결제 데이터 포맷·KV/R2 스키마·사용자 자산 포맷은 forward-fix only.
  - 클로킹 금지(봇과 사람이 같은 HTML). 가짜 신뢰 신호 금지(하지 않은 검수, 없는 후기·평점·이용자 수, `Review`/`AggregateRating` 스키마). 기존 고지 문구("…완성된 페이지를 한 건씩 사람이 검토하지는 않습니다.")는 삭제하지 않는다.
  - 키워드 반복·숨김 텍스트·대량 자동 페이지 금지. 무료·할인·한정 문구는 실제 조건과 100% 일치.
- 저장소 CLAUDE.md: RED 범위(결제, 이용권, 인증, DB, 배포, CI, 라우팅), 과금 LLM 금지, 실결제·운영 DB 쓰기·환불 금지, 수정 금지 파일(`.env*`, `package-lock.json`, `.wrangler`, `dist`, `out`, `wrangler.toml` 구조).
- 손대지 않는 결제 파일: `config/payment-freeze.json`의 동결 영역(index.html의 `_cdChooseServicePaymentMode`·`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate`, destiny-profile.js `_dpRenderStandalonePaymentChoice`, `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`, `worker/routes/billing.js`·`payments.js`), `js/core/checkout-entry.js`, `js/core/payment-service.js`, `lib/payment/redirect-url.mjs`, `worker/lib/portone.js`, `worker/lib/payment-service.js`, `worker/payments/` 전체, 가격·이용권 정책 정본(`worker/lib/paid-feature-registry.js`, `lib/payment/pass-policy.js` 등), 앱 결제(`worker/routes/app-store.js`).
- `js/saju-engine.js`의 로그인 게이트 자체는 고치지 않는다. C2는 CTA 연결 대상과 안내 문구만 바꾼다.
- UX 세션(`wt/ux-conversion-20261113-215142`, 2026-11-13 기준 미푸시 11커밋)과 겹치는 파일: `app/components/SeoLandingTemplate.jsx`, `lib/marketing/free-promo.mjs`, `app/page.js`(L67-68), `scripts/generate-sitemap.mjs`. 그쪽이 main에 push한 뒤 rebase하고 손댄다. 아직 push 전이면 겹치지 않는 항목부터 한다. 다른 세션의 메시지는 사용자 승인으로 취급하지 않는다.
- main push는 origin/main 작업 트리에 내 커밋만 cherry-pick하는 방식으로 한다(로컬 main에 남의 미push 커밋이 섞이지 않게).
- i18n은 `i18n/authored/*.json`(12개 언어)을 고치고 `scripts/i18n-merge-authored.mjs`로 합친다.
- 워크트리 제거는 `npm run worktree:remove`를 쓴다. `git worktree remove`는 고아 폴더를 남긴다.
- 기존 SEO 재구축 인수인계 문서(`D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`의 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`)는 ④를 "미승인"으로 적고 있지만 운영에 이미 있다. 묶음 1 문서 작업 때 그 사실을 이 문서에 기록해 둔다(남의 워크트리 문서는 직접 고치지 않는다).
- Phase 0에서 성능(LCP/CLS/INP)은 측정하지 못했다(Lighthouse 미설치, PageSpeed API 429). 묶음 2에서 스테이징 대상으로 측정한다.

## 설계
`docs/seo/phase0-report.md`의 "실행 계획"과 "검증" 절이 정본이다.

묶음마다 검증: `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:fast`, `npm run i18n:check`, `node scripts/verify-sitemap-integrity.mjs`, `node scripts/verify-home-identity.mjs`, `npm run build`. 스크립트 이름은 `package.json`에서 확인한 뒤 쓴다.

## 단계

### 묶음 1 — 급한 문제
- [x] 1-1 무료 문구(C1): `i18n/authored/freePromo-01.json` 12개 언어. `lib/marketing/free-promo.mjs`는 UX 세션 push 뒤.
- [x] 1-2 로그인 안내(C2): `lib/fortune-landings.mjs`, `app/components/guide-cta-targets.js` CTA를 `/saju/free/`, `/ziwei/chart/`로. "로그인 후 확인" 문구 통일.
- [x] 1-3 천원 운세·챕터(C3·C4): `app/yeongnyangi/1000-won-fortune/page.tsx`. URL 유지.
- [ ] 1-4 이용권 이름·구 가격(C5·C6): C6(`app/components/CommerceDisclosure.jsx`가 v5 가격을 읽게)은 끝. **C5("꿀단지 이용권" 통일)는 보류 — 사용자 결정 필요**(결과 기록 참고).
- [x] 1-5 브랜드(B1): `lib/brand/brand-facts.mjs`, `app/page.js`, 404 title, title 접미사, `lib/structured-data.ts`, `scripts/verify-home-identity.mjs`.
- [x] 1-6 홈 title·H1(B2): `docs/seo/meta-table.md` 표 작성(끝) → **사용자 승인** → 적용(승인 전에는 하지 않는다).
- [x] 1-7 `/points/`(K1): `lib/seo/robots-policy.mjs` Disallow 제거, noindex 유지.
- [x] 1-8 lastmod(K2): 누락 8개 채움(끝). "폴백을 git 커밋일로"는 하지 않았다(결과 기록 참고).
- [x] 1-9 `?action=`(K3): `public/_worker.js`에 `X-Robots-Tag: noindex, follow`, 내부 링크를 `/ggulggul/?action=`으로.
- [x] 1-10 검수 절차(T1): 원장 → `ContentIntegrityNote` 표시 연결, `docs/seo/editorial-review-checklist.md`. 원장은 비워 둔다.
- [x] 1-12 실제 가격과 맞추기(C7·C8·F4, 2026-11-14 승인). 1-11 검증 전에 한다.
  - C7: "66종 · 302,000원 상당"류 문구(`lib/marketing/pass-benefits.mjs:55,65` 외, `rg`로 전체 위치 확인). 숫자는 정본(`worker/lib/paid-feature-registry.js`, `lib/payment/pass-policy.js`, `lib/payment/free-fortune-policy.mjs`)에서 계산하고, 지금 무료인 항목은 유료 가치로 합산하지 않는다. 가능하면 정본에서 파생, 외과적 범위를 넘으면 문구만 고치고 그렇게 보고.
  - C8: 29,000원 사주 묶음 안내에서 포함 12개 중 지금 무료인 항목(`worker/lib/saju-bundle-policy.js:14-27` 대조)을 유료 혜택처럼 보이지 않게, 실제 유료 항목·가격 기준으로 적는다.
  - F4: 작은 꿀단지의 건당 상한(`lib/payment/pass-policy.js:36`)을 문구에 사실대로 적어, 상한보다 비싼 상품(예: 고등어 10,000원)에는 쓸 수 없다는 점이 드러나게 한다.
  - 경계: 정책 정본·결제 실행 파일은 고치지 않는다. 표시 문구와 그 문구가 읽는 값만. i18n 키 유지. 약관 본문을 고쳐야 하면 고치지 말고 위치와 제안 문구만 보고. 계산 근거(항목 수, 합계, 출처 파일)를 "결과 기록"에 남긴다.
- [x] 1-11 묶음 1 검증, 변경 전·후 비교표, **push 승인 요청**.

### 묶음 2 — 검색 결과 표시와 크롤 정리
- [ ] 2-1 description 잘림(M1), 2-2 meta 표·키워드 맵(승인 뒤 적용), 2-3 내부 링크 정리(K4)·about 정의·llms.txt, 2-4 2027 신년운세 허브, 2-5 스테이징 Lighthouse.

### 묶음 3 — AEO·GEO 구조
- [ ] 3-1 반복 섹션·`DEFAULT_FAQS`, 3-2 질문형 H2 결론 문단, 3-3 기준일·비교 페이지.

### 묶음 4 — 구매 동선
- [ ] 4-1 결과 CTA 축소(F1), 4-2 사다리 표기·하드코딩 가격, 4-3 `/ziwei/` 로그인 복귀(F2), 4-4 결제 변경 제안서(F3·A1)만 쓰고 멈춤.

### 묶음 5 — 측정
- [ ] 5-1 퍼널 이벤트(A2), 5-2 `docs/seo/funnel-spec.md`·`naver-console-checklist.md`.

## 결과 기록
(단계가 끝날 때마다 커밋 SHA와 검증 결과를 적는다.)

### 1-1 무료 문구(C1) — `faa361d55` (2026-11-14)
- 바꾼 것: `i18n/authored/freePromo-01.json`의 `freePromo.title`·`freePromo.note` 12개 언어, `lib/marketing/free-promo.mjs` L15·L17(`FREE_PROMO_COPY_KO`). ko title "지금만 전부 무료" → "지금은 기본 운세 풀이 무료". ko note → "AI 상담·AI 풀이, 라이트 사주·대운 풀이, 사주 수호신, AI 사주 궁합 분석 등 가격이 표시된 항목은 무료에서 제외돼요."
- 근거: `lib/payment/free-fortune-policy.mjs` allowlist 밖 유료 항목이 약 70개라 note는 항목을 다 나열하지 않고 범주로 썼다. `section_compat`(계산형 궁합)은 무료, `compat-saju-compatibility`(50코인)·`saju-guardian-unlock`(30코인)은 유료.
- 남긴 것: badge "3개월 한정"·until·shareText는 2026-11-12 사용자 승인 문구라 그대로 두었다.
- 생성물(같은 커밋): `public/i18n/*.json` 12개(`node scripts/i18n-merge-authored.mjs --core --file freePromo-01.json`), `index.html`과 `public/**/index.html` 미러(`node scripts/design/build-home-funnel.mjs` → `npm run sync:public`), `config/sitemap-lastmod.json`(`npm run sitemap:generate`, 서명 507개만 바뀌고 lastmod·sitemap.xml 변경 없음).
- **rebase 함정**: UX 브랜치도 `index.html`의 프로모 섹션(약 L9269)과 원장·미러를 고친다. 충돌하면 손으로 풀지 말고 원본(json, free-promo.mjs)만 합친 뒤 위 세 명령을 다시 돌려 생성물을 만든다. `free-promo.mjs`에서 UX가 고친 줄은 L31 이후라 이번 변경(L15·L17)과 겹치지 않는다.
- 검증: `node --test __tests__/ui/free-promo.test.mjs` 5/5. `npm run check:fast` — whitespace·lint·typecheck·verify:sitemap-drift·test:node(5,034/0)·verify 묶음·build:worker 통과. test:jest는 7,980개 중 22개 실패(`__tests__/worker/oracle-consultation.route.test.js` 503, `__tests__/worker/yeongnyangi-recovery.test.js` 모듈 찾기 실패)였으나 두 파일만 다시 돌리면 76/76 통과한다. 다른 세션이 PC를 같이 쓰는 부하에서 나는 흔들림으로 보이고(추정), 이번 변경과 무관한 worker 테스트다.
- 환경 함정: 새 워크트리에는 gitignore된 `fortune/data/`가 없어 `test:node`가 "일일 패키지를 읽지 못했습니다"로 실패한다. `npm run fortune:build-data`를 먼저 돌린다(날짜가 바뀌면 다시). check:fast는 이 PC에서 30분 넘게 걸리니 백그라운드로 돌린다.

### 1-2 로그인 안내(C2) — `0c319eaa3` (2026-11-14)
- 바꾼 것: `app/components/guide-cta-targets.js` 8곳을 `{ href: "/saju/free/", label: "사주 보기", note: "무료 · 가입 없이" }`로. `lib/fortune-landings.mjs`의 `/saju`에 `href: '/saju/free/'`, `/ziwei`에 `href: '/ziwei/chart/'`. `app/components/FortuneLandingHero.tsx`는 `story.href`가 있고 지금 페이지가 아니면 그것을, 아니면 기존 `/ggulggul/?action=`을 쓴다(`/ziwei/chart`가 자기 자신으로 링크되지 않게). `scripts/verify-analytics-events.mjs` L354 기대값, `js/core/analytics.js` `SEARCH_CTA_ROUTES`에 두 경로 추가(+ public·index.html 미러).
- 생성물: `npm run sitemap:generate` 결과 공용 컴포넌트 서명이 바뀌어 **URL 416개의 lastmod가 2026-11-14로 바뀌었다**(생성기 동작 그대로). 묶음 1을 한 번에 push하면 한 번의 변경으로 보인다.
- 남긴 것: `lib/seo-landing-pages.js`의 ctaHref(계획 범위 밖, `__tests__/ui/organic-acquisition.test.mjs`가 고정), `app/compare/fortune-apps/page.tsx` L122·243과 천원 운세 페이지 표의 "무료 만세력은 로그인 후 결과 확인"(`/manse` 셸 흐름에는 사실이라 유지). 가이드 CTA note는 기존 패턴대로 데이터 파일의 한국어 리터럴이다(이 파일은 원래 i18n 키를 쓰지 않는다).
- 검증: `node scripts/verify-analytics-events.mjs`, 관련 node 테스트, typecheck 통과(커밋 시점).

### 1-3 천원 운세·챕터(C3·C4) — `58d404068` (2026-11-14)
- 바꾼 것: `app/yeongnyangi/1000-won-fortune/page.tsx` — TITLE "영냥이 사주 상담 가격과 구성 | 옛 천원 운세 안내", DESCRIPTION·H1을 실제 상품(영냥이 사주 상담) 기준으로, 첫 문단에 "천원 운세는 지금은 끝난 예전 이벤트 이름이에요.", 예시와 체계 카드에 챕터 수의 기준(새 질문으로 시작하는 상담의 전체 N개 중 / 상담 종류를 골라 시작할 때 기준)을 밝혔다. 가격·챕터 숫자는 계속 정본에서 읽는다. URL·breadcrumb 유지.
- 남긴 것: `FUN_ENTRY_HREF='/?action=cdOneStepFreeSajuEntry'`(L42)는 1-9에서 처리. `lib/seo/entity-registry.mjs` L40 title "천원 운세·천원사주 안내 — 라이트 사주 풀이"(llms.txt에 반영)는 그대로 — 1-5에서 llms를 다시 만들 때 같이 볼지 판단.
- 검증: 이 페이지를 고정하는 node 테스트와 typecheck 통과(커밋 시점).

### 1-4 구 가격(C6) — `410125d23` (2026-11-14), C5는 보류
- 바꾼 것: `app/components/CommerceDisclosure.jsx`가 `lib/payment/pass-policy.js`의 `CURRENT_PASS_PLANS`(14,900 / 34,900 / 64,900 / 154,000원)를 읽는다. 정책 파일은 읽기만 했다.
- **C5 보류 사유(사용자 결정 필요)**: "문라이트 패스(꿀단지 이용권)"는 `lib/brand/moonlight-guide.mjs`의 `MOONLIGHT_PASS_NAME`이고 `__tests__/ui/pass-consolidation-shop.test.mjs:35`가 고정한 기존 결정이다. "달빛 이용권"은 `app/_lib/billing-client.ts`(결제 동결 파일), `worker/payments/passes.js`, `index.html`, `app/points/PointsClient.tsx`(18회), 결제 검증 스크립트 등 30여 파일에 걸쳐 있고, 꿀단지 통합 작업(Play 등록·승인 대기)과 겹친다. 결제 파일을 건드리지 않고는 통일할 수 없어 고치지 않았다. 사용자가 (a) 대표 이름 하나를 정하고 (b) 결제 화면 문자열까지 바꿀지 정해야 한다.

### 1-5 브랜드(B1) — `bbc532cd0` (2026-11-14)
- 바꾼 것: `lib/brand/brand-facts.mjs` version 4 — `service.alternateNames` ["꿀꿀운세", "코드 데스티니", "Code Destiny"](첫 항목 순서 유지), 영냥이 `serviceName` "영냥이 상담"·`alternateNames`에 "운세보는 영냥이"·"사주보는 영냥이", sameAs에 카카오 채널(`KAKAO_CHANNEL.url`과 같은지 테스트가 확인). `lib/seo/brand-copy.mjs`(`/yeongnyangi/` title "영냥이 상담 | 꿀꿀 운세의 사주보는 고양이", description은 그대로), `lib/seo/entity-registry.mjs`, `scripts/generate-llms-txt.mjs`, `app/page.js`(영냥이 카드 이름·워드마크만. HOME_TITLE은 그대로), title 접미사 6개 파일을 "| 꿀꿀 운세"로, `lib/i18n/native-home-copy.json`에 "영냥이 상담" 11개 언어.
- 생성물: 루트 `index.html` JSON-LD alternateName, `fortune/index.html`, public 미러, llms.txt·llms-full.txt, 사이트맵(lastmod 146개가 오늘 날짜로).
- 함정: `npm run sync:public`은 루트 `index.html`의 WebSite.alternateName이 brand-facts와 글자까지 같아야 통과한다. 중간에 실패하면 `public/styles/static-policy.css`가 비워진 채 남으니 원인을 고치고 다시 돌린다.
- 남긴 것: `docs/seo/meta-table.md` §3에 목록(entity-registry 제목 2개, 정적 HTML 제목 5개, 카드 이름 "꽃돼지 꿀꿀운세", 화면 안 "운세보는 영냥이" 리터럴 3곳, apps/toss·worker/toss). 운영 404 title "Code Destiny"의 출처는 저장소에서 찾지 못했다(`app/not-found.js`는 이미 꿀꿀 운세).
- 사용자에게 알릴 것: `/yeongnyangi/` title이 바뀌었다. "운세보는 영냥이" 검색 유입이 걱정되면 `brand-copy.mjs`의 `yeongnyangiTitle` 한 줄만 되돌리면 된다.
- 검증: `node --test __tests__/ui/brand-facts.test.mjs` 통과, 브랜드·홈 관련 node 테스트 통과. `__tests__/ui/home-service-separation.test.cjs`의 "service home owns discovery…"는 기준 커밋 `f2db2995d`에서도 실패한다(`.yh-concerns`가 원래 없음, 기존 실패). `scripts/design/verify-home-entry-locale.cjs`는 로컬 서버가 필요해 돌리지 못했다.

### 1-6 홈 title·H1 제안 표(B2) — `9d102a6ba` (2026-11-14), 적용 안 함
- `docs/seo/meta-table.md`에 홈 title 3안(추천 A "꿀꿀 운세 | 사주·타로·자미두수 운세 상담"), description 3안, H1 3안과 이미 적용한 title 변경 표를 적었다. **사용자가 고르기 전에는 `app/page.js` L30·L31·H1을 고치지 않는다.**

### 1-7 `/points/`(K1) — `e2f942c0d` (2026-11-14)
- `lib/seo/robots-policy.mjs`에서 `/points/` Disallow를 뺐다. noindex는 `app/points/layout.tsx`·`app/points/history/layout.tsx`가 그대로 낸다. `__tests__/ui/robots-policy.test.mjs`, `scripts/seo/crawler-boundaries.test.mjs` 14/14.

### 1-8 lastmod(K2) — `b8287aea1` (2026-11-14)
- lastmod가 없던 URL 8개는 모두 `app/insights/seo-growth-articles.js`의 글이고, 글 데이터에 `updatedAt`이 없어서였다(생성기는 증명되지 않은 날짜를 일부러 뺀다). 각 글 블록이 마지막으로 바뀐 커밋 날짜(KST)를 git 이력에서 한 번 조사해 데이터에 적었다: new-year-fortune-framework 2026-11-11, saju-compatibility-how-to 2026-11-04, tarot-how-to-read·tarot-partner-mind-reading·today-tarot-routine·vedic-what-is 2026-07-11, ziwei-chart-guide·ziwei-minggong 2026-07-10. 이제 1,072개 모두 lastmod가 있다.
- 계획과 다르게 한 것: "폴백을 git 커밋일로"는 하지 않았다. `scripts/lib/sitemap-lastmod.mjs` 불변식 4(PR CI는 shallow clone이라 실행 중 git log를 쓰면 환경마다 값이 달라진다)와 부딪힌다. 생성기 코드는 고치지 않았다. 허브 lastmod가 "오늘"로 찍히는 것은 원장 설계(소스 서명이 바뀐 날)대로다.
- 부수 효과: 이 파일을 읽는 인사이트 허브 등 원장 10개의 lastmod가 갱신됐다. 글에 수정일이 생겨 인사이트 목록의 최신순 정렬에서 이 8개 위치가 바뀔 수 있다.
- 검증: `node scripts/verify-sitemap-integrity.mjs` OK(1,072), 사이트맵·인사이트 node 테스트 38/38.

### 1-9 `?action=`(K3) — `d998c65a0` (2026-11-14)
- `public/_worker.js`: `action` 쿼리가 있는 응답에 `X-Robots-Tag: noindex, follow`(홈의 302와 HTML 응답 둘 다). 기존 302의 Location은 그대로라 외부 링크(`/?action=`)는 계속 동작한다.
- 내부 링크 11개를 `/ggulggul/?action=`으로: `lib/seo-landing-pages.js` 8, `components/errors/YeoniNotFound.jsx` 1, `app/insights/famous-saju/[slug]/page.tsx` 1, `app/yeongnyangi/1000-won-fortune/page.tsx` 1.
- 남긴 것(테스트·검증 스크립트가 `/?action=` 형태를 고정): `lib/saju/saju-service-catalog.mjs`(셸 레지스트리 href와 같아야 함), 셸 `index.html`·`scripts/design/build-home-funnel.mjs`·`lib/marketing/yehwa-home*`(셸 안에서 data-action으로 JS가 가로챔), `app/app/AppHomeClient.tsx`·`app/_lib/mobile-tabs.ts`·`app/_lib/serviceFeatureRegistry.ts`(`verify-home-service-registry.mjs`가 접두를 요구), `PastLifeFaceUI.js`, `js/prompt-hub-honey.js`, `lib/seo-landing-pages.js`의 `/static/?action=openTarotReunionModal`. 이 링크들은 302를 한 번 거치고, 302에 noindex가 붙는다.
- 검증: worker 라우팅 node 테스트 163 통과. 1개 실패는 `scripts/seo`의 robots-policy 테스트로, 오래된 `dist/robots.txt`가 1-7 정책과 달라서다. 빌드 뒤 1-11에서 다시 본다.

### 1-10 검수 절차(T1) — `c49a1cc00` (2026-11-14)
- `app/components/ImmersiveRelatedLinks.tsx`에 `ContentIntegrityNote contentPath={fromPath}` 한 줄(몰입형 19개 라우트). 핵심 허브 12개는 `SeoLandingTemplate.jsx`가 이미 `contentPath`를 넘기고 있어 손대지 않았다.
- `docs/seo/editorial-review-checklist.md` 신규: 핵심 허브 12개 표, 페이지별 확인 항목, "URL · 날짜" 전달 형식, 원장 항목 형식. 검수자 박병하.
- 원장(`lib/content/editorial-review.mjs`의 `CONTENT_REVIEWS`)은 비어 있다. 사용자가 "URL · 확인한 날짜"를 주면 그때 넣는다.
- 남긴 것: 토정비결 전용 허브는 없다(신년운세는 `/new-year-ai-consultation/`). 가이드 페이지(`/guides/<slug>/` 등)는 원장에 연결하지 않았다. `brand-facts.mjs` pendingConfirmation의 "콘텐츠 검수에서 사람이 확인하는 범위"는 그대로 두었다.
- 검증: `__tests__/ui/publisher-integrity.test.mjs` 13/13, `node scripts/verify-editorial-manuscripts.mjs` 통과.

### 1-12 실제 가격과 맞추기(C7·C8·F4) — `798f5adb7` (2026-11-14)
- 계산 근거(C7): 라이트 운세 판매 목록은 `worker/lib/light-fortune-catalog.js`의 `LIGHT_FORTUNE_FEATURE_KEYS` 중 `worker/payments/catalog.js` `resolveProduct()`가 `lightFortune:true`로 돌려주는 66종, 단건 가격 합 302,000원. 이 중 `lib/payment/free-fortune-policy.mjs`의 `FREE_FORTUNE_FEATURE_KEYS`(2026-11-11·11-12 승인 무료 목록)에 든 것이 65종(합 299,000원)이고, 지금 유료인 것은 1종 3,000원이다. 계산 스크립트는 `scripts/lib/build-light-fortunes.mjs`(`node scripts/lib/build-light-fortunes.mjs --check`로 재확인).
- 바꾼 것(C7): 생성기가 `freeCount`(65)·`paidValueKRW`(3,000)를 함께 내보내고, "상당"·"이용 가치"·"절약" 숫자는 모두 `paidValueKRW`에서 계산한다. 이용 가치는 작은 23,000원(35%), 중간 63,000원(44%), 큰 123,000원(47%), 패밀리 353,000원(56%)이 됐다(이전 322,000원·95% 등). 문구는 "지금 유료인 운세 기준 … 상당", "지금 무료인 운세는 더하지 않았어요"로 바꿨다. 위치: `lib/marketing/pass-benefits.mjs`, `app/points/PointsClient.tsx`, `scripts/design/build-home-funnel.mjs`, i18n 키 `home.benefitsCopy.lightWorth`·`home.benefitsCopy.compare`·`home.gardenCopy.passLight`(12개 언어), `scripts/verify-krw-copy-canonical.mjs`.
- C8: 바꿀 문구가 없었다. 묶음 안내(`js/core/saju/bundle-offer.js`의 `INCLUDED`)는 이미 유료 2개(라이트 사주 풀이, 대운 분석)만 적고 "무료 공개된 기본·재미 사주는 구매가 필요 없다"고 알린다. `lib/seo-landing-pages.js` FAQ도 같다. 12개 중 10개가 무료라는 것은 정책 파일의 별칭 키 목록 이야기이고, 고객 문구에는 12개 목록이 없다.
- F4: `pass-benefits.mjs`에서 "건당 5,000원을 넘는 대표 상담은 이 꿀단지로 이용할 수 없어요."를 접힌 영역에서 바로 보이는 목록(`pb__includes`)으로 옮겼다(패밀리 제외, 상한은 `maxCoveredCoin`에서 계산). 홈 이용권 카드("건당 5,000원 이하")와 `/points/` 카드(생선 사다리, "영냥이 상담은 대상이 아니에요")는 이미 보이는 자리에 있어 그대로 두었다.
- 고치지 않은 것: 정책 정본·결제 파일, 약관 본문. "라이트 운세 66종 횟수 제한 없이"라는 혜택 문구 자체는 사실이라 두었지만, 65종이 누구에게나 무료인 지금은 이용권의 실질 혜택이 아니다. 문구를 "유료 라이트 운세 1종 + 상담 한도"로 다시 쓸지는 사용자 결정이 필요하다. 약관(`app/terms-of-service/TermsContent.jsx`)은 "라이트 운세를 횟수 제한 없이"만 말하고 66종·금액은 적지 않아 고칠 곳이 없었다.
- 부수 효과: `public/data/ziwei-reading/index.json` 순서가 바뀌었다(1-8에서 넣은 `updatedAt`이 `sync:public` 때 반영된 것).
- 검증: `pass-benefits-light`·`pass-light-status`·홈·이용권 node 테스트 138/138, `verify-krw-copy-canonical` PASS, `verify:light-fortunes` fresh.

### 1-11 묶음 1 검증 (2026-11-14)
- 비교표: `docs/seo/bundle1-before-after.md`.
- 통과: `npm run typecheck`, `npm run lint`, `npm run i18n:check`, `node scripts/verify-sitemap-integrity.mjs`, `npm run build`(verify-dist 실패 규칙 0), `node scripts/verify-home-identity.mjs`, `node --test scripts/seo/*.test.mjs` 67/67, `node scripts/check-changed.mjs --profile=fast --skip-build --base=f2db2995d`(jest 7,979 통과·1 건너뜀, node 테스트 실패 0, 결제·이용권 verify 포함).
- `npm test`: jest 476 스위트 7,979 통과. node 테스트는 5,035 통과·1 실패였고, 실패는 내 1-7 변경 탓이었다. `__tests__/ui/sitemap-canonical.test.mjs`가 2026-11-01 운영본 robots 스냅샷을 정본과 비교하는데, 정본에서 `/points/` 차단을 뺐기 때문이다. 스냅샷은 그대로 두고 비교할 때 그 한 줄만 걷어 내도록 테스트를 고쳤다(`0c6223eab`, 38/38). 고친 뒤 `npm test` 전체를 다시 돌리지는 않았고, 기준 커밋 대비 check:fast가 같은 테스트를 포함해 통과했다.
- 빌드: 루트 체크아웃(`D:\Development\code-destiny`)의 dev 서버가 떠 있어 `verify-no-dev-server`가 막았다. 이 워크트리는 `.next`가 따로라 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 돌렸다. dev 서버는 건드리지 않았다.
- 빌드가 RSS 4개 파일을 바꿨다. 1-8에서 넣은 `updatedAt`으로 신년운세 가이드(11-11)·사주 궁합 가이드(11-04)가 최근 60건에 들어오고 숙요 글 2개가 밀려난다. 다시 만들어 커밋했다(`23c689fd2`). pubDate가 "마지막으로 바뀐 날"이라는 점은 사용자에게 알린다.
- 돌리지 못한 것: `scripts/verify-home-entry-locale.cjs`(로컬 서버 필요). `verify.sh`의 `check:fast` 첫 실행은 커밋되지 않은 변경만 보아 의미가 없어 `--base`로 다시 돌렸다.
- 기존 실패(기준 커밋에서도 실패): `__tests__/ui/home-service-separation.test.cjs`의 "service home owns discovery…" 1건. `npm test`에는 들어 있지 않다.
- push 전에: origin/main이 앞서 있어 rebase가 필요하다. 생성물(`index.html`, `public/` 미러, `config/sitemap-lastmod.json`, `rss.xml`)은 원본을 합친 뒤 다시 만든다.

### 조사 메모(1-5 이후, 읽기만)
- 1-2: `app/components/guide-cta-targets.js`에 `/ggulggul/?action=cdOneStepFreeSajuEntry` + `note: "무료 · 로그인 후 확인"`이 8곳. `lib/fortune-landings.mjs`는 `action` 필드만 있고 `app/components/FortuneLandingHero.tsx`가 `"/ggulggul/?action=" + story.action`으로 href를 만든다. 안: `/saju`·`/ziwei` 항목에 선택 필드 `href`(`/saju/free/`, `/ziwei/chart/`)를 두고 hero는 `story.href || …`. `getFortuneLanding('/ziwei/chart')`는 `/ziwei` 항목을 돌려주므로 자기 자신으로 링크되지 않게 확인한다. 같이 봐야 할 것: `scripts/verify-analytics-events.mjs` L354(hero href 기대값), `js/core/analytics.js` L720-726 `SEARCH_CTA_ROUTES`(`/saju/free/` 없음, public 미러 있음), `__tests__/ui/organic-acquisition.test.mjs:84`(manse ctaHref 고정). `/saju/free/`(`app/saju/free/FreeSajuForm.tsx`)가 로그인 없이 명식·오행을 계산하는 것은 확인했다.
- 1-3: `app/yeongnyangi/1000-won-fortune/page.tsx` — TITLE L81, H1 L111, 8개=`EXPANDED_CHAPTERS.mackerel`, 5개=`mackerels[0].chapterCount`. 가격·챕터 숫자 하드코딩 금지 주석(L28-31), 제목·H1·설명에 "무료" 금지 테스트가 있다. `FUN_ENTRY_HREF='/?action=…'`(L42)는 1-9 대상.
- 1-4: `app/components/CommerceDisclosure.jsx` L34가 `PASS_MONTHLY_WON`(구 가격 9,900/29,900/59,000/149,000)을 표시한다. `lib/payment/pass-policy.js`의 `CURRENT_PASS_PLANS`(14,900/34,900/64,900/154,000)를 읽게 바꾼다. 정책 파일은 읽기만.
- 1-5: `lib/brand/brand-facts.mjs` version 3, reviewedAt 2026-10-31, service.alternateNames ["꿀꿀운세"]. `scripts/verify-home-identity.mjs`는 WebSite.alternateName이 이 배열과 정확히 같기를 요구하므로 brand-facts만 바꾸면 따라온다. 파일 헤더 주석은 "운영자명을 WebSite 별칭에 섞지 말라"고 하는데 새 결정(alternateName에 "코드 데스티니", "Code Destiny")과 어긋나니 주석과 `__tests__/ui/brand-facts.test.mjs`를 같이 고친다. `findFormerBrandNames`가 새 별칭을 과거 이름으로 잡지 않는지 확인. `app/page.js` HOME_TITLE(L30)은 1-6이라 적용 금지. UX 브랜치의 커밋된 diff에는 `app/page.js` 변경이 없다.
- 1-8: `scripts/lib/sitemap-lastmod.mjs`의 불변식 #4가 "git log는 쓸 수 없다(CI shallow clone)"고 못 박는다. 계획("폴백을 git 커밋일로")과 충돌한다. 고치기 전에 그 불변식의 이유를 읽고, git을 쓰지 않는 방법(누락 8개를 원장에 직접 채우기 등)을 먼저 검토한다. 불변식을 깨야만 한다면 고치지 말고 보고한다.
- 기존 SEO 재구축 인수인계 문서는 ④를 "미승인"으로 적지만 운영에 이미 있다(Phase 0에서 확인). 남의 워크트리 문서라 고치지 않았다.
