---
status: in-progress
updated: 2026-11-13
next: 묶음 1의 1-1(무료 문구)부터 순서대로. 겹치는 파일은 UX 세션 push 여부를 먼저 확인
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
- 코드 변경 없음. 이 문서와 `docs/seo/phase0-report.md`만 커밋됨.
- 루트 체크아웃 `D:\Development\code-destiny`는 다른 브랜치이고 origin/main보다 2,252커밋 뒤라 기준으로 쓰지 않는다.

## 승인 상태
- 2026-11-13 사용자가 계획 전체를 승인했다(계획 모드 승인). 승인 범위는 묶음 1~5의 **구현과 로컬 커밋**까지다.
- **main push(스테이징)는 묶음마다 사용자 승인**, **운영 승격은 별도 승인**이다. 사용자 답변 원문: 작업 방식 = "저장소 규칙대로 (Recommended)" — origin/main 기반 전용 워크트리, 묶음마다 승인 뒤 내 커밋만 main push, 운영 승격은 별도 승인.
- 확정된 결정(2026-11-13, 사용자 직접 답변):
  - 로그인 시점 = "로그인 없이 결과" — 랜딩 CTA를 로그인 없는 결과 경로로, 저장·유료 구매 때만 로그인.
  - `/points/` = "차단만 풀고 noindex 유지".
  - 상품 정리 = "이름·표기만 정리" — 결제 구조·가격 불변. 생선 등급은 "가격 + 분량"이 주 표기, 생선명은 보조.
- 브랜드 결정(UX 세션이 사용자 원문을 전달했고, 계획 승인으로 확정): 대표 이름은 "꿀꿀 운세" 하나. 영냥이는 상담가·상품 이름으로만 쓴다. "운세보는 영냥이"·"사주보는 영냥이"는 description과 alternateName에만. `lib/brand/brand-facts.mjs`의 2026-10-16 결정을 대체하고 version·reviewedAt을 올린다.
- **아직 승인받지 않은 것**(구현하지 말고 선택지를 정리해 사용자에게 묻는다):
  - 홈 title·H1 확정 문구와 전체 title/description 표 — `docs/seo/meta-table.md`에 현재 → 제안 표를 만들어 승인받은 뒤 적용.
  - C7("66종 · 302,000원 상당"), C8(29,000원 묶음 12개 중 10개 무료), F4(작은 꿀단지 상한) 문구 처리.
  - 홈 이원화(B3), `/compare/` 인덱스(A3), 번역 페이지 noindex.
  - sameAs 공식 채널 URL — 사용자가 확정해 준 URL만 넣는다. 받기 전에는 건드리지 않는다.
  - 검수 원장 항목 — 사용자가 실제 검수했다고 알려 준 페이지만 넣는다.

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
- [ ] 1-1 무료 문구(C1): `i18n/authored/freePromo-01.json` 12개 언어. `lib/marketing/free-promo.mjs`는 UX 세션 push 뒤.
- [ ] 1-2 로그인 안내(C2): `lib/fortune-landings.mjs`, `app/components/guide-cta-targets.js` CTA를 `/saju/free/`, `/ziwei/chart/`로. "로그인 후 확인" 문구 통일.
- [ ] 1-3 천원 운세·챕터(C3·C4): `app/yeongnyangi/1000-won-fortune/page.tsx`. URL 유지.
- [ ] 1-4 이용권 이름·구 가격(C5·C6): "꿀단지 이용권" 통일, `app/components/CommerceDisclosure.jsx`가 v5 가격을 읽게.
- [ ] 1-5 브랜드(B1): `lib/brand/brand-facts.mjs`, `app/page.js`, 404 title, title 접미사, `lib/structured-data.ts`, `scripts/verify-home-identity.mjs`.
- [ ] 1-6 홈 title·H1(B2): `docs/seo/meta-table.md` 표 작성 → **사용자 승인** → 적용.
- [ ] 1-7 `/points/`(K1): `lib/seo/robots-policy.mjs` Disallow 제거, noindex 유지.
- [ ] 1-8 lastmod(K2): `scripts/lib/sitemap-lastmod.mjs` 폴백을 git 커밋일로, 누락 8개 채움.
- [ ] 1-9 `?action=`(K3): `public/_worker.js`에 `X-Robots-Tag: noindex, follow`, 내부 링크를 `/ggulggul/?action=`으로.
- [ ] 1-10 검수 절차(T1): 원장 → `ContentIntegrityNote` 표시 연결, `docs/seo/editorial-review-checklist.md`. 원장은 비워 둔다.
- [ ] 1-11 묶음 1 검증, 변경 전·후 비교표, **push 승인 요청**.

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
