---
status: in-progress
updated: 2026-11-14
next: 묶음 3-2(질문형 H2 결론 문단) → 3-3 → 원장 재생성 → 묶음 4-1~4-3 → 전체 검증 → docs/seo/bundle3-4-before-after.md. 3-1은 끝(결과 기록 맨 끝 "묶음 3 진행"). push·배포·운영 승격은 미승인(로컬 커밋만). F3는 구현하지 않는다.
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
- **2026-11-14 rebase 끝**: rebase 전 HEAD `fc9be92f6`(기준 `f2db2995d`) → origin/main `f2e46d05a`(75커밋 앞, 대부분 toss 작업) 위로 19커밋을 옮겼다. 손으로 푼 충돌은 없다. 겹친 것은 생성물 5개(`config/sitemap-lastmod.json`, `sitemap.xml`, `sitemap-ko.xml`, `public/` 미러 2개)뿐이라 upstream 쪽으로 두고 `build-home-funnel` → `sync:public` → `sitemap:generate`로 다시 만들었다(`ad405fbb8`, 원장 서명 7개만 바뀌고 sitemap.xml은 그대로, 1,072 URL). UX 브랜치(`wt/ux-conversion-20261113-215142`)는 **아직 main에 없다**(로컬에서 origin/main보다 32커밋 앞). push 없음. 위 두 줄의 SHA(`23c689fd2` 등)는 rebase 전 값이다.
- **2026-11-14 묶음 2 적용 끝**(결정 일괄 승인 뒤). 이번 커밋은 `2bd7a928e`부터 문서 커밋까지다(결과 기록 "묶음 2 적용" 참고). push 없음. 이 시점에 origin/main은 이 브랜치의 기준보다 116커밋 앞서 있고 UX 브랜치는 아직 미머지다. **push 전에 rebase하고 생성물(홈 퍼널·public 미러·사이트맵·RSS·llms)을 다시 만들어야 한다.** UX 브랜치와 인접한 줄: `app/page.js`의 `HOME_TITLE` 바로 위(UX가 2줄 추가), `scripts/generate-sitemap.mjs` coreRoutes의 `/` 주석 바로 위(UX가 2줄 추가). 같은 줄은 아니지만 rebase 때 충돌로 잡힐 수 있고, 양쪽을 다 살리면 된다.
- **2026-11-14 두 번째 rebase 끝**: rebase 전 HEAD `a762b38d3`(기준 `f2e46d05a`) → origin/main `3b82aa2ce`(167커밋 앞) 위로 옮겼다. **UX 세션은 main에 머지됐다**(`wt/ux-conversion-20261113-215142` 팁 = `3b82aa2ce` = origin/main). 충돌과 해결: 생성물(`config/sitemap-lastmod.json`, `sitemap*.xml`, `public/` 미러)과 `index.html`의 생성 부분 6곳(빌드 해시, `build-home-funnel`이 만드는 프로모 섹션)은 upstream 쪽으로 두고 다시 만들었다. 소스 충돌은 `app/page.js` 1건으로, UX의 `YN_STARTER_KRW` 상수·주석과 이쪽 `HOME_TITLE`·`HOME_DESCRIPTION`을 둘 다 남겼다. `scripts/generate-sitemap.mjs`, `app/components/SeoLandingTemplate.jsx`, `lib/marketing/free-promo.mjs`는 충돌 없이 합쳐졌고, free-promo 무료 문구(title "지금은 기본 운세 풀이 무료", 가격 표시 항목 제외 note)는 그대로다(UX는 그룹·href만 바꿈). 이전 재생성 커밋 `ad405fbb8`은 내용이 비어 빠졌다(49커밋 → 48 + 재생성 1). 재생성 커밋 `1856c615d`(사이트맵 1,081 URL, llms·rss 변경 없음). push 없음. 위 줄들의 SHA는 rebase 전 값이다.
- 함정(이번에 겪음): 이 PC에는 python이 없다. 충돌 해결 스크립트는 node로 쓴다. 해결 명령과 `git add`·`rebase --continue`는 `&&`로 묶어, 해결이 실패하면 진행되지 않게 한다(한 번 충돌 마커가 커밋돼 `--fixup`+autosquash로 고쳤다).
- 다음 순서(2026-11-14 지시): rebase 뒤 전체 검증 → 5-1 측정 이벤트 구현 → A1(유입 정보를 주문에 싣기, 결제 실행 파일을 건드리지 않는 쿠키 경로 재사용 안만) → 이용권 배너 문구 확인 → 검증 전체 재실행. F3(인앱 브라우저)는 구현하지 않고 제안서 상태로 둔다.
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
- **2026-11-14 결정 일괄 승인**(조정 세션이 사용자 답변을 전달. 원문 그대로): "결정에 대해서는 가장 추천되는 방식으로 진행해줘 seo에 유리하도록". 대기 중이던 결정을 문서의 추천안으로 확정한다. **push 승인은 여기에 들어 있지 않다.** 확정 내용:
  - 홈 title·description·H1 = `docs/seo/meta-table.md` §1 A안. 핵심 허브 description 6곳 = §4-1 제안.
  - `/love/`의 "무료 연애운"은 사실대로 고친다. `/ziwei/chart/`는 title·H1·description에 무료·가입 없이를 드러낸다. `/saju/free/` description은 §4-1 제안.
  - 신년운세(2027) = 새 URL을 만들지 않고 `/fortune/2027/`로 내부 링크를 늘린다. 토정비결 페이지는 만들지 않는다.
  - 홈 이원화(B3) = `docs/seo/bundle2-decisions.md` §2 A안(`/`가 hreflang 한국어 대표·x-default, `/ggulggul/`은 묶음에서 뺌).
  - `/compare/` = 목록 페이지를 만들지 않고 관련 허브에서 비교 글로 링크(§3 A안).
  - about 한 문장 정의 = §4 1안 "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요." llms.txt·llms-full.txt도 같은 문장.
  - RSS pubDate = 최초 발행일, 사이트맵 lastmod = 수정일.
  - 이용권 혜택 문구 = 표시 문구만 사실대로(정책 정본은 그대로).
  - **유지로 확정**: `/consultations/` noindex, "운세보는 영냥이" 설명 문장 3곳, C5 이용권 이름 통일 보류(지금 이름 유지), 번역 페이지 색인(noindex로 바꾸지 않음).
- **아직 승인받지 않은 것**:
  - **main push·스테이징 배포·운영 승격.** 묶음 2 적용분까지 모두 로컬 커밋뿐이다.
  - `docs/seo/payment-change-proposal.md`의 결정 4건(F3·A1) — 결제 변경은 제안서만 있고 구현하지 않는다.
  - 검수 원장 항목 — 사용자가 실제 검수했다고 "URL · 확인한 날짜"를 알려 준 페이지만 넣는다. 원장은 계속 비워 둔다.

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
- [x] 2-1 description 잘림(M1) — 문장 경계 절단. 문구 새로 쓰기는 승인 뒤.
- [x] 2-2 meta 표·키워드 맵: 표 작성, 2026-11-14 승인 뒤 적용 끝(결과 기록 "묶음 2 적용").
- [x] 2-3 내부 링크 정리(K4): about 정의·llms.txt·`/compare/` 링크 적용 끝(`7241b2ba6`).
- [x] 2-4 2027 신년운세: 새 URL 없이 `/fortune/2027/` 내부 링크 보강으로 끝(`ba3269622`).
- [x] 2-6 홈 이원화(B3): `/`가 hreflang 한국어 대표(`9dc6743e1`).
- [ ] 2-5 스테이징 Lighthouse(push 뒤).

### 묶음 3 — AEO·GEO 구조
- [ ] 3-1 반복 섹션·`DEFAULT_FAQS`, 3-2 질문형 H2 결론 문단, 3-3 기준일·비교 페이지.

### 묶음 4 — 구매 동선
- [ ] 4-1 결과 CTA 축소(F1), 4-2 사다리 표기·하드코딩 가격, 4-3 `/ziwei/` 로그인 복귀(F2), 4-4 결제 변경 제안서(F3·A1)만 쓰고 멈춤 — **4-4는 끝**(`docs/seo/payment-change-proposal.md`, 구현은 승인 뒤).

### 묶음 5 — 측정
- [x] 5-1 퍼널 이벤트(A2), 5-2 `docs/seo/funnel-spec.md`·`naver-console-checklist.md` — 둘 다 끝. 5-1은 2026-11-14 구현(결과 기록 맨 끝). `free_result` placement를 실제로 쓰는 CTA는 묶음 4-1 몫.

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

### 1-12 보완 확인 — 지금 유료인 라이트 운세 1종 (2026-11-14, 읽기만)
- 키는 **`saju-guardian-unlock`**("사주 가디언 소환진 해금", 3,000원/30코인, 한 번 사면 열리는 unlock). `worker/lib/paid-feature-registry.js` L319, `worker/lib/light-fortune-catalog.js` L120. `lib/payment/free-fortune-policy.mjs`에는 이 키가 없다(무료 대상 아님). 66종 합계 302,000원도 다시 계산해 맞았다.

### 묶음 2 진행 (2026-11-14)
- 재료를 모을 때 쓴 스크립트는 저장소 밖 스크래치에 있어 다음 세션에는 없다. 수치는 묶음 1 빌드(`dist/`)의 HTML에서 title·description·robots를 뽑아 센 것이다.
- **2-1 기준선**: 색인 대상 1,094쪽 중 description이 "…"로 끝나는 쪽 229개(/en 101, /insights 40, /ja 37, /stories 33, /fortune 10, /saju 3, 그 밖 각 1). 절단은 `lib/seo.ts`의 `truncateToDisplayWidth`(폭 160). 계획: 한계를 넘으면 한계 안에 온전히 들어오는 마지막 문장(`/[.!?]+(?=\s|$)|[。！？]+/g`)에서 끊고, 남는 폭이 40 미만이면 기존 "…" 폴백. 사용처: `lib/seo.ts`(buildSeoMetadata), `lib/seo/createI18nMetadata.ts`, `lib/generate-page-metadata.ts`, `app/insights/famous-saju/[slug]/page.tsx`, `app/nakshatra/codex/[index]/page.tsx`. 마지막 파일 L50 주석은 "공용 truncateToDisplayWidth를 고치지 않는다(라우트 43개 공유)"라고 경고하고 자체 `toLastCompleteSentence`를 쓴다. 이번 지시가 공용 함수 변경을 명시했으므로 고치되, 그 주석이 사실과 어긋나게 되면 같이 손본다.
- **2-2 끝(표만)**: `docs/seo/meta-table.md` §4 핵심 허브 표(`e8e5ccce6`), `docs/seo/keyword-page-map.md`(`ca4087615`). 적용 안 함. 검색량은 2026-10-08 관측값 인용뿐이고 나머지는 "미확인". 표에서 "확인 뒤 작성"으로 남긴 것: `/saju/free/` 설명("사주 기본 풀이는 로그인 후"가 C2와 맞는지), `/ziwei/chart/` 제목(C2 버튼 도착지인데 "심화 상담"), `/love/`의 "무료" 범위.
- **2-3 K4 끝(코드 변경 없음)**: `docs/seo/internal-links-noindex.md`(`3deb16317`). noindex 대상이 전부 개인 화면·실행 화면이고 같은 목적의 색인 페이지가 없어 링크를 바꾸지 않았다. `/consultations/`(푸터에서 594쪽이 링크, `index:false, follow:false`)를 색인에 열지는 사용자 결정.
- **네이버 체크리스트 끝**: `docs/seo/naver-console-checklist.md`(`de21745a8`). 묶음 5-2의 같은 파일 항목은 이것으로 끝.
- **결정 문서 끝(구현 없음)**: `docs/seo/bundle2-decisions.md`(`4f984ec10`) — 신년운세 허브, 홈 이원화, `/compare/`, about 정의, llms.txt. 2-4에 대해 알아 둘 것: 색인 가능한 2027 페이지가 이미 있다(`/new-year-ai-consultation/` 내부 링크 475쪽, `/fortune/2027/` + 12띠는 15쪽뿐). Phase 0의 "허브 없음"은 불완전했다. 추천은 새 URL 없이 `/fortune/2027/`로 가는 내부 링크 보강.
- **2-1 끝**: `c678fd32a`(lib/seo.ts), `affc25bbe`(lastmod 54쪽). 색인 대상 설명 중 "…"로 끝나는 쪽 229 → **151**. 78쪽이 온전한 문장으로 끝나게 됐다(가장 짧은 것 52자). 남은 151쪽(/en 100, /ja 36, /fortune 9, /insights 2, /manse·/saju/free·/recipes·/tarot 각 1)은 한계 안에 문장 경계가 없거나 첫 문장이 너무 짧은 경우라 **문구를 새로 써야만** 없앨 수 있다(승인 필요, `meta-table.md` §4-1에 /manse/·/saju/free/ 제안 있음).
  - 실패와 원인: 처음에는 하한을 폭 40으로 잡았더니 "…"는 109까지 줄었지만 42쪽의 설명이 50자 미만이 되어 `scripts/verify-adsense-readiness.mjs`("meta description is too thin", 50자 미만은 빌드 실패)에 걸렸다. 하한을 "폭 80 이상이고 50자 이상"으로 올렸다. 이 하한을 낮추지 말 것.
  - `/saju/compatibility/`는 이제 첫 문장에서 끝나 "볼 때마다 결제하는 분석" 안내가 설명에서 빠진다(본문에는 그대로 있다). `meta-table.md` §4-1 제안 문구를 승인받아 넣으면 해결된다.
  - `app/nakshatra/codex/[index]/page.tsx`의 "공용 함수를 고치지 않는다" 주석은 사실에 맞게 고쳤다. 그 라우트의 자체 함수는 그대로다.
- **검증(rebase 뒤 + 2-1 뒤)**: typecheck, lint, i18n:check, verify-sitemap-integrity(1,072 URL), verify-home-identity, `check-changed --profile=fast --skip-build --base=origin/main`(jest 478 스위트 7,987 통과·1 건너뜀), `npm test`(같은 수치, exit 0), `npm run build`(`ALLOW_DEV_SERVER_DURING_BUILD=1`, 다른 체크아웃의 dev 서버는 건드리지 않음), `node --test scripts/seo/*.test.mjs` 모두 통과. `npm test`는 2-1 첫 판(하한 40)이 작업 트리에 있는 상태로 돌았고, 하한을 올린 최종본으로는 check:fast·빌드만 다시 돌렸다. 못 돌린 것: `scripts/verify-home-entry-locale.cjs`(로컬 서버 필요), Lighthouse.

### 1-2 재확인 — C2가 사실인지 (2026-11-14, `a81318f81`)
방법: 코드 추적 + 이전 빌드 산출물(`dist/`)을 로컬 정적 서버로 띄워 Playwright(로그인하지 않은 새 브라우저, 외부 요청 차단, `/api/*`는 401 응답으로 대체)로 확인. 운영 서버·실제 로그인·결제는 쓰지 않았다. **로그인한 뒤의 화면은 브라우저로 보지 못했다**(코드 추적만).

| 도착지 | 로그인 없이 | 로그인 뒤 | 확인 방법 |
|---|---|---|---|
| `/saju/free/` | 생년월일을 넣으면 네 기둥(년·월·일·시주)과 오행 균형 한 줄이 그 자리에 나온다. API 호출 0건. 십신·대운·풀이 본문은 없다 | 같은 화면. 사주 기본 풀이는 `/saju` → 셸에서 로그인 뒤 무료 | 브라우저 + 코드 |
| `/ziwei/chart/` | 명반과 규칙 기반 긴 풀이(총론·질문별·명반·오늘의 조언)가 나온다. 출생시간 미상으로 확인 | 같은 화면. 30,000원 PDF 상담서만 유료(회당 결제) | 브라우저 + 코드 |
| `/love/` 폼 → 셸 | 개인정보 동의 창 → "동의하고 결과 보기" → **"로그인 필요" 창**. 결과 없음 | 사주 기본 풀이(명식·일주·십성·조후·억부)가 무료. 연애운 전용 구역이 있는지는 확인 못 함 | 브라우저(로그인 전) + 코드(로그인 뒤) |

- 문구 대조: 묶음 1이 넣은 "무료 · 가입 없이"(가이드 CTA 8곳)는 `/saju/free/`의 명식·오행 범위에서 사실이다. 유지했다. 기존부터 있던 `/ziwei/chart` "무료 · 가입 없이"도 사실이다.
- 고친 것(`a81318f81`): 도착지가 `/saju/free/`로 바뀌면서 사실보다 넓어진 문구.
  - `app/components/guide-cta-targets.js`: `/saju/ten-gods` 제목·본문(십신 배치 확인 → 일간 확인), `/saju/monthly/[month]/[stem]` 본문(오행과 십성 → 네 기둥과 오행), `/fortune/2027/[sign]` 본문(대운 언급 삭제).
  - 번역 키 `shellRuntime.f2228`·`f2272`를 12개 언어에서 같이 고쳤다(키 유지). 병합은 `node scripts/i18n-merge-authored.mjs --file shellRuntime-38.json`, `--file shellRuntime-40.json`.
  - `lib/seo-service-scope.js` `/saju` 무료 범위 문장: "명식과 오행은 가입 없이 바로, 십성 등 기본 풀이는 로그인 후 무료".
  - `lib/seo-landing-pages.js` `/love` 이용 순서 1번에 로그인 조건을 적었다.
  - 사이트맵 lastmod 58쪽 갱신.
- 고치지 않은 것(사용자 결정 대기 범위와 겹침):
  - `/love/` 제목·H1·설명·버튼의 "무료 연애운": 비용은 무료가 맞지만 로그인이 필요하고, 설명이 약속하는 "배우자궁이 올해 세운과 만나는 자리"가 무료 결과에 있는지 확인하지 못했다. meta 표 적용과 함께 결정.
  - `/ziwei/chart/` 제목·H1 "심화 자미두수 상담": 틀린 말은 아니지만 가입 없이 무료라는 점이 드러나지 않는다.
  - `/saju/free/` 설명: 사실과 맞다. 다만 이 페이지에서 바로 되는 명식 계산은 언급이 없다.
- 함정: `node scripts/i18n-merge-authored.mjs`를 인자 없이 돌리면 `i18n/authored/_moduleCopy-skeleton.json`의 누락 370건 때문에 실패하고 아무것도 쓰지 않는다(기존 문제). `--file`로 파일을 지정한다.
- 검증: typecheck, 바뀐 파일 eslint, i18n:check, node 테스트 31개(`organic-acquisition`·`saju-bundle-copy.static`·`sukuyo-landing-scope`), `verify-analytics-events` 통과. `check-changed --profile=fast --skip-build --base=origin/main`은 **끝내지 못했다**: 11:06에 시작해 jest 단계에서 25분 넘게 멈춰 있어 중단했다(같은 PC에서 다른 체크아웃의 검사가 함께 돌아 CPU 100%, jest가 14분 동안 CPU 2.7초만 썼다). 실패가 난 것은 아니고 결과가 없다. push 전에 다시 돌려야 한다. i18n:check는 번역 병합 뒤에도 다시 통과했다. 빌드는 다시 돌리지 않았다(문구만 바뀜, 브라우저 확인은 수정 전 빌드 기준).

### 문서 2종 (2026-11-14)
- `docs/seo/funnel-spec.md`(`d1fb4f1c4`): 단계별 현재 이벤트, 빈 구간, 제안 이벤트, UTM이 따라가는 범위.
- `docs/seo/payment-change-proposal.md`(`0cc130385`): F3·A1 제안. 0단계 보고서의 "복귀 티켓이 sessionStorage"는 결제 티켓에는 맞지 않는다(정본은 localStorage, `js/core/checkout-entry.js:1514-1528`). 로그인 직전 입력값 보관만 sessionStorage다.

### 조사 메모(1-5 이후, 읽기만)
- 1-2: `app/components/guide-cta-targets.js`에 `/ggulggul/?action=cdOneStepFreeSajuEntry` + `note: "무료 · 로그인 후 확인"`이 8곳. `lib/fortune-landings.mjs`는 `action` 필드만 있고 `app/components/FortuneLandingHero.tsx`가 `"/ggulggul/?action=" + story.action`으로 href를 만든다. 안: `/saju`·`/ziwei` 항목에 선택 필드 `href`(`/saju/free/`, `/ziwei/chart/`)를 두고 hero는 `story.href || …`. `getFortuneLanding('/ziwei/chart')`는 `/ziwei` 항목을 돌려주므로 자기 자신으로 링크되지 않게 확인한다. 같이 봐야 할 것: `scripts/verify-analytics-events.mjs` L354(hero href 기대값), `js/core/analytics.js` L720-726 `SEARCH_CTA_ROUTES`(`/saju/free/` 없음, public 미러 있음), `__tests__/ui/organic-acquisition.test.mjs:84`(manse ctaHref 고정). `/saju/free/`(`app/saju/free/FreeSajuForm.tsx`)가 로그인 없이 명식·오행을 계산하는 것은 확인했다.
- 1-3: `app/yeongnyangi/1000-won-fortune/page.tsx` — TITLE L81, H1 L111, 8개=`EXPANDED_CHAPTERS.mackerel`, 5개=`mackerels[0].chapterCount`. 가격·챕터 숫자 하드코딩 금지 주석(L28-31), 제목·H1·설명에 "무료" 금지 테스트가 있다. `FUN_ENTRY_HREF='/?action=…'`(L42)는 1-9 대상.
- 1-4: `app/components/CommerceDisclosure.jsx` L34가 `PASS_MONTHLY_WON`(구 가격 9,900/29,900/59,000/149,000)을 표시한다. `lib/payment/pass-policy.js`의 `CURRENT_PASS_PLANS`(14,900/34,900/64,900/154,000)를 읽게 바꾼다. 정책 파일은 읽기만.
- 1-5: `lib/brand/brand-facts.mjs` version 3, reviewedAt 2026-10-31, service.alternateNames ["꿀꿀운세"]. `scripts/verify-home-identity.mjs`는 WebSite.alternateName이 이 배열과 정확히 같기를 요구하므로 brand-facts만 바꾸면 따라온다. 파일 헤더 주석은 "운영자명을 WebSite 별칭에 섞지 말라"고 하는데 새 결정(alternateName에 "코드 데스티니", "Code Destiny")과 어긋나니 주석과 `__tests__/ui/brand-facts.test.mjs`를 같이 고친다. `findFormerBrandNames`가 새 별칭을 과거 이름으로 잡지 않는지 확인. `app/page.js` HOME_TITLE(L30)은 1-6이라 적용 금지. UX 브랜치의 커밋된 diff에는 `app/page.js` 변경이 없다.
- 1-8: `scripts/lib/sitemap-lastmod.mjs`의 불변식 #4가 "git log는 쓸 수 없다(CI shallow clone)"고 못 박는다. 계획("폴백을 git 커밋일로")과 충돌한다. 고치기 전에 그 불변식의 이유를 읽고, git을 쓰지 않는 방법(누락 8개를 원장에 직접 채우기 등)을 먼저 검토한다. 불변식을 깨야만 한다면 고치지 말고 보고한다.
- 기존 SEO 재구축 인수인계 문서는 ④를 "미승인"으로 적지만 운영에 이미 있다(Phase 0에서 확인). 남의 워크트리 문서라 고치지 않았다.

### 묶음 2 적용 — 2026-11-14 일괄 승인분 (2026-11-14)
사용자 답변 "결정에 대해서는 가장 추천되는 방식으로 진행해줘 seo에 유리하도록"에 따라 문서의 추천안으로 확정해 적용했다. push는 하지 않았다. 변경 전·후 표는 `docs/seo/bundle2-before-after.md`.

| # | 항목 | 커밋 |
| --- | --- | --- |
| 1 | 홈 title·description·H1 (meta-table §1 추천안) | `2bd7a928e` |
| 2 | 핵심 허브 description 6곳 (meta-table §4) | `bdaab95cb` |
| 3 | `/love/` "무료 연애운" → 실제 조건 | `aeb040ad3`, `a294eb64b` |
| 4 | `/ziwei/chart/` 제목·설명·H1 | `ba014b229` |
| 5 | `/saju/free/` description | `084ef94a8` |
| 6 | 신년운세(2027) 내부 링크 | `ba3269622` |
| 7 | 홈 이원화 B3 A안(hreflang 묶음을 `/`로) | `9dc6743e1` |
| 8 | `/compare/` 내부 링크 | `7241b2ba6` |
| 9 | about 정의 문장 + llms.txt | `7241b2ba6` |
| 10 | RSS pubDate = 최초 발행일 | `810c39752`, 재생성 `8e022d1d0` |
| 11 | 라이트 운세 혜택 문구 | `1782d0e2f` |

최종 문구
- 홈 `/`: title "꿀꿀 운세 | 사주·타로·자미두수 운세 상담" · description "꿀꿀 운세는 명리학자 박병하(네오)가 만든 운세 서비스예요. 사주·궁합·타로·자미두수를 살펴보고, 고민은 영냥이 상담에서 챕터별로 읽어 보세요." · H1 "꿀꿀 운세 — 사주·타로·자미두수 운세 상담"
- `/love/`: title "연애운 사주로 읽는 법 | 로그인 후 무료 기본 풀이" · description "연애운을 사주로 읽는 법을 안내해요. 관성·식상과 배우자 자리를 보는 법을 살펴보고, 로그인하면 명식·십성 중심의 사주 기본 풀이를 무료로 볼 수 있어요." · H1 "연애운 — 사주로 읽는 지금의 관계 흐름"
- `/ziwei/chart/`: title "자미두수 심화 풀이 | 가입 없이 무료로 보는 명반" · description "가입 없이 생년월일로 자미두수 명반을 세우고 총론·질문별 풀이와 오늘의 조언까지 무료로 읽어 보세요. 유료는 따로 선택하는 PDF 상담서뿐이에요." · H1 "자미두수 심화 풀이 — 가입 없이 무료로 보는 명반"
- `/saju/free/`: description "결제 없이 보는 무료 사주·운세를 한곳에 모았어요. 생년월일만 넣으면 이 페이지에서 네 기둥과 오행을 바로 확인하고, 사주 기본 풀이는 로그인 후 무료로 보세요."
- `/fortune/2027/`: 제목·설명·H1은 그대로 두었다(이미 "2027년 띠별 운세"로 맞음). 내부 링크만 보탰다.
- about 첫 문장 = llms.txt 첫 문단: "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요."
- 라이트 운세: "라이트 운세 {count}종 횟수 제한 없이 · 이 중 {free}종은 꿀단지 없이도 무료"(12개 언어)

구조 메모(다음 사람이 알아야 할 것)
- 항목 7: SEO 전용 묶음 `HOME_HREFLANG_ROUTES`(`lib/seo/hreflang.mjs`)를 새로 두었다. 화면 이동용 `I18N_ROUTE_MAP.home`(ko=`/ggulggul`)은 그대로다. 소스 `index.html`·`public/` 셸의 hreflang은 고치지 않았다. 배포 산출물 `dist/`에서만 `scripts/promote-static-shell-to-root.mjs`가 갈아 끼운다(기존 설계). `/ggulggul/`은 hreflang이 없어지고, `/en/`·`/ja/` 등은 ko 대응이 `/`가 된다. `/en/` 등은 꽃돼지 홈의 번역이라 `/`의 정확한 번역은 아니다(승인된 A안의 알려진 한계).
- 항목 10: 최초 발행일은 별도 데이터 파일에서 읽는다. 날짜는 git 커밋일 기준으로 채운 값이라 실제 공개일과 하루쯤 다를 수 있다(추정). 부수 효과로 JSON-LD `datePublished`, 허브 정렬, RSS 60건 선정이 같은 날짜를 쓴다.
- 항목 11: `lib/marketing/pass-benefits.mjs`의 한국어 문구와 i18n ko 문자열이 글자까지 같아야 `scripts/design/build-home-funnel.mjs`가 번역 속성을 붙인다. 한쪽만 고치면 번역이 빠진다.
- `i18n-merge-authored`는 homeOverseas 키에 `--core --file homeOverseas-09.json`으로 돌린다. `--core` 없이 돌리면 추적되지 않는 `public/i18n/<lang>/homeOverseas.json` 12개가 생긴다(지우면 됨).
- 테스트 파일은 `.static.test.js`도 `node --test`로 돌린다. jest 러너로는 찾지 못한다.

계획과 다르게 처리했거나 손대지 않은 것
- `/love/`: 제목·H1·설명 말고도 같은 페이지의 단계·결과 항목·FAQ·keywords와 다른 화면의 "무료 연애운" 라벨 3곳을 함께 고쳤다. `entity-registry`의 "무료 연애운" 항목과 shell-05 검색 예시는 그대로다.
- `/ziwei/chart/`: ko만 고쳤다. en·ja·zh 메타와 버튼 문구는 그대로다.
- 인사이트 본문 2건을 고쳤고 `updatedAt`도 함께 올렸다(항목 6).
- 라이트 운세 배너 "작은 꿀단지 하나면 라이트 운세 66종이 모두 열려요."(`lib/marketing/pass-benefits.mjs:29`, `home.benefitsCopy.lightBanner`)와 `app/points/PointsClient.tsx`의 passLightLine은 그대로다. 필요하면 다음에 같은 방식으로 맞춘다.
- about 신규 문구는 ko 키만 있다(about 본문은 ko만 렌더하는 기존 규칙). `service.summary`와 about의 기존 소개 문장은 그대로다.
- `/consultations/` noindex, "운세보는 영냥이" 설명 문장 3곳, C5 이용권 이름, 번역 페이지 색인은 유지로 확정했다. 검수 원장은 비워 둔 그대로다.
- `sitemap:generate`를 돌릴 때마다 lastmod 원장이 28~35건 갱신된다. 이번 커밋들의 내용 변경이 반영된 것으로 보이나 건별로 확인하지는 않았다(추정).

push 전에 할 일
- origin/main이 이 브랜치보다 116커밋 앞서 있고 UX 브랜치(`wt/ux-conversion-20261113-215142`)는 아직 main에 없다. push 전에 rebase가 필요하다. UX 브랜치와 인접한 줄: `app/page.js`의 `HOME_TITLE` 위, `scripts/generate-sitemap.mjs` coreRoutes `/` 주석 위.

검증(2026-11-14, 코드 마지막 커밋 `8e022d1d0` 기준, 모두 직접 실행)
- `npm run typecheck` 0 · `npm run lint` 0 · `npm run i18n:check` 0 · `node scripts/verify-sitemap-integrity.mjs` OK(1,072 URL)
- `npm run build` 0. 다른 체크아웃의 dev 서버 때문에 가드에 막혀 `ALLOW_DEV_SERVER_DURING_BUILD=1`로 돌렸다.
- `node scripts/verify-home-identity.mjs` OK(`/`, `/ggulggul/`, `/about/`, `/faq/`) · `node --test scripts/seo/*.test.mjs` 0
- `npm test` 0(5,036개 통과, 실패 0)
- `node scripts/check-changed.mjs --profile=fast --skip-build --base=origin/main` 0(끝까지 실행. jest 478개 스위트 통과, 1개 건너뜀, 7,987개 통과)
- `dist/` 확인: `/`에 hreflang 9개(ko·x-default=`/`), `/ggulggul/`에 hreflang 없음, `/en/`의 ko·x-default=`/`, `/about/`에 정의 문장. 표는 `docs/seo/bundle2-before-after.md`.
- 스테이징·운영 확인은 하지 않았다(push 없음).

### 두 번째 rebase 뒤 검증 r1 (2026-11-14, HEAD `1614207ff`, 구현 전, 모두 직접 실행)
- `npm run typecheck` 0 · `npm run lint` 0 · `npm run i18n:check` 0 · `node scripts/verify-sitemap-integrity.mjs` 0 · `node scripts/verify-analytics-events.mjs` 0
- `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build` **1**. Next 컴파일·정적 페이지 생성·dist 승격은 끝났고, postbuild의 `scripts/verify-adsense-readiness.mjs`(`verifyIndexableTitleWidth`)가 `out/saju/lotto-ritual`의 title 폭 61 > 60으로 실패했다. 제목은 `lib/marketing/free-feature-details.mjs:141`("사주 로또 리추얼 — 오늘의 일진으로 뽑는 상징 번호 | 꿀꿀 운세")이고, 이 제목·검사 스크립트·페이지·사이트맵 등재는 `git diff origin/main`으로 보면 이 브랜치와 origin/main이 같다. **이 브랜치 탓이 아닌 upstream 실패로 판단**했다(origin/main을 따로 빌드해 보지는 않았다). 범위 밖이라 고치지 않았다. 사용자에게 보고할 것.
- `node scripts/verify-home-identity.mjs` 0 · `node --test scripts/seo/*.test.mjs` 0 · `npm test` 0
- `node scripts/check-changed.mjs --profile=fast --skip-build --base=origin/main`: 0(끝까지 실행. jest 479개 스위트 통과, 1개 건너뜀, 8,004개 통과)
- 검증 묶음 스크립트는 세션 스크래치패드에 있어 다음 세션에는 없다. 위 명령을 순서대로 돌리면 된다. check-changed는 30분 넘게 걸린다(백그라운드로 돌리고 완료 알림을 기다린다).

### 5-1·A1·배너 문구 — 설계 확정, 구현 전 (2026-11-14)
읽기 조사만 끝냈고 소스는 건드리지 않았다. 줄 번호는 `1614207ff` 기준이니 고치기 전에 `rg`로 다시 확인한다. 고친 뒤 `scripts/verify-analytics-events.mjs`(이벤트 이름을 `js`·`app`·`lib`·`index.html`에서 자동 수집)와 `docs/analytics-kpi.md` §1 표를 함께 갱신한다. `js/` 파일을 고치면 `npm run sync:public`으로 public 미러·`index.html` 해시를 다시 만든다.

① 측정 이벤트(React 쪽은 `import {trackEvent} from "@/lib/analytics"`, 생년월일·이름 등은 값에 넣지 않는다)

| 이벤트 | 발화 위치 | 값 |
|---|---|---|
| `free_saju_chart_started` / `free_saju_chart_completed` | `app/saju/free/FreeSajuForm.tsx` `submit()` — 계산 호출 앞 / `setReading(...)` 뒤 | `surface: "saju_free"`, `time_known: Boolean(time)` |
| `free_ziwei_chart_started` / `free_ziwei_chart_completed` | `app/components/AdvancedZiweiSectionV2.tsx` `handleCompute` — 입력 검증 통과 뒤 `setStep("computing")` 부근 / 성공 경로 `setStep("result")` 부근. `restoreCachedResult`(캐시 복원)에서는 쏘지 않는다 | `surface: "ziwei_chart"`, `time_known: !form.unknownHour` |
| `landing_form_submit` | `app/components/SeoLandingBirthForm.tsx` `handleSubmit`, `window.location.assign(submitHref)` 직전 | `from_service: window.location.pathname`, `to_action`: `?action=` 값이 `/^[A-Za-z0-9_]{1,64}$/`에 맞을 때만(아니면 대상 pathname) |
| `login` `{method: "social"}` | `app/auth/_components/StaticOAuthCallbackRedirect.tsx` 인라인 스크립트, `persistAuthFromCallback(payload);` 뒤. 인라인 스크립트라 TS 타입 금지, `try { if (typeof window.cdTrack === "function") window.cdTrack("login", { method: "social" }); } catch (e) {}` | `method: "social"` |
| `free_saju_submitted`(A2, 게이트 앞) | `js/saju-engine.js` 계산 시작 함수에서 `if (!await _sajuCalculationWait(ensureSajuResultSession(run), run)) return;` **앞 줄**(게이트 호출문 밖)에 한 줄 추가. 기존 `free_saju_started`는 옮기지 않는다 | `signed_in`: `window.__dpHasLoginSession()` 결과(불리언) |
| `cross_sell_click`의 `placement: "free_result"` | `js/core/analytics.js` `searchCtaPayload`의 placement 허용 목록(`primary|related|directory|next_step`)에 추가, verify 스크립트의 placement 루프에도 추가 | 허용값만 |

- funnel-spec은 소셜 로그인 이벤트 위치를 "AuthShell 소셜 복귀 처리부"라고 했지만 실제 복귀 처리는 `StaticOAuthCallbackRedirect.tsx`다. 저장소에서 `login` 발화는 `AuthShell.tsx`의 비밀번호 로그인 하나뿐이다. 신규 소셜 가입은 `/signup`으로 가서 기존 `signup` 이벤트가 쏘이므로 중복은 없다. `analytics.js`가 afterInteractive라 콜백 페이지가 바로 이동하면 유실될 수 있다(추정) → 하한값으로 본다.
- A2: `ensureSajuResultSession`(게이트)과 그 호출문은 한 글자도 바꾸지 않는다. 추가 줄은 try/catch로 감싼 순수 추가다. `__tests__/ui/saju-loading-flow.behavior.test.js`, `saju-result-login.test.mjs`가 이 파일을 vm으로 돌리니 추가 뒤 둘 다 확인한다. 게이트 블록 안을 건드려야 하는 상황이면 하지 말고 보고한다.
- `free_result` placement: 무료 결과 화면(무료 사주 결과, 자미두수 결과)에는 상품으로 가는 앵커가 없고 버튼뿐이라 표식을 달 곳이 없다. 허용값만 준비하고, CTA 추가는 묶음 4-1 몫으로 남긴다.
- 관련 테스트: `__tests__/ui/seo-landing-entry-handoff.static.test.js`, `__tests__/ui/custom-event-wiring.static.test.js`.

② A1 유입 분류(결제 실행 파일·`worker/payments/`는 고치지 않는다)
- `js/core/analytics.js`의 `growthAttribution()` 앞에 `entrySourceLabel()`을 추가한다. 동의(`analyticsStorageState() === "granted"`)가 없으면 `sessionStorage`의 `cd:entry:source`를 지우고 null. 고정 코드 8개만 쓴다: `organic_naver|organic_google|organic_daum|organic_bing|paid_search|social|email|ai`. 자유 문자열 UTM은 저장하지 않는다.
- 분류 순서: `utm_medium=cpc` 또는 클릭 ID(`gclid`, `gbraid`, `wbraid`, `n_media`, `n_ad_group` — 네이버 파라미터 이름은 추정이니 확인) → `paid_search` / `utm_medium` email·newsletter → `email` / social·organic_social·share·channel → `social` / 리퍼러 호스트 정확 일치(`search.naver.com`·`m.search.naver.com`, `www.google.com`·`google.com`·`www.google.co.kr`, `search.daum.net`·`m.search.daum.net`, `www.bing.com`·`cn.bing.com`, 기존 `aiSourceLabel`의 AI 호스트 → `ai`). 직접 유입·미분류는 라벨 없음. 분류되면 `{value, until: 지금+30분}`으로 저장하고, 분류 안 되는 진입(로그인·PG 복귀)은 기존 값을 지우지 않는다.
- `growthAttribution()`에서 캠페인이 없어 `paidCampaignCookie(null)`을 부르는 한 지점만 바꾼다: 유입 라벨이 있으면 `paidCampaignCookie({campaignId: 라벨, consent: true, version: "entry-20261114-v1", device}, until)`을 쓰고 함수는 그대로 `null`을 돌려준다. 그래서 `growth_campaign` 이벤트 값, `cdReadGrowthAttribution()` 반환, 광고·명시 캠페인 우선순위는 그대로다.
- `lib/marketing/growth-attribution.mjs`의 `normalizeGrowthAttribution`에 허용 규칙 추가: `version === "entry-20261114-v1"`이고 `campaignId`가 위 8개 중 하나면 `{campaignId, version, consent: true, device}`.
- "포맷 불변" 근거(코드로 확인): 주문에는 기존 `metadata.growthAttribution`(Mongoose Mixed)에 기존 필드 `{campaignId, version, consent, device}`가 그대로 들어가고 값만 새로 생긴다. 읽는 쪽은 `worker/payments/index.js`의 `readCheckoutAttribution(request, body.growthAttribution)` 2곳, `worker/payments/orders.js`, `worker/yeongnyangi/service.ts`이고 모두 `normalizeGrowthAttribution`을 거친다. `lib/marketing/growth-metrics.mjs`는 campaignId를 그룹 키로만 쓴다. `worker/ops-hq/revenue-facts.js`와 `scripts/report-revenue-funnel.mjs`는 이 필드를 쓰지 않는다. `growth-attribution.mjs`는 `config/payment-freeze.json`에 없다.
- 덮지 않는 것: 영냥이 결제 경로는 `app/yeongnyangi/_lib/api.ts`가 본문에 null을 넣어 쿠키를 읽지 않는다. 이번 범위 밖으로 두고 보고한다.
- 테스트는 `__tests__/ui/purchase-analytics.test.mjs`에 같은 방식으로 추가한다(`bootFrom(url, referrer, {consent, session})`): 네이버 리퍼러+동의 → 쿠키에서 `organic_naver`/`entry-20261114-v1`, 동의 없음·임의 값 → 없음, 유료 캠페인이 있으면 그쪽 우선, `cdReadGrowthAttribution()`은 null 유지. 이 파일의 기존 단언(`utm_medium=organic` 뒤 null, 동의 철회 뒤 `cd_paid_campaign=` 없음)이 그대로 통과해야 한다. `organic-acquisition.test.mjs`, `consultation-discovery.test.mjs`도 analytics.js를 읽는다.

③ 배너 문구
- `lib/marketing/pass-benefits.mjs`의 연이 대사 "작은 꿀단지 하나면 라이트 운세 ${count}종이 모두 열려요."는 바로 아래 "이 중 N종은 꿀단지 없이도 무료"와 나란히 보면 사야 열리는 것처럼 읽힌다 → `작은 꿀단지에도 라이트 운세 ${count}종이 들어 있어요.`로 바꾼다(영냥이 쪽 대사는 이미 이 뜻이라 그대로). 동결 파일이 아니다.
- `i18n/authored/homeOverseas-09.json`의 `home.benefitsCopy.lightBanner` 12개 언어도 같은 뜻으로 맞춘다(`{count}` 유지, ko는 기존처럼 쉼표를 둔 "작은 꿀단지에도, 라이트 운세 {count}종이 들어 있어요."). en "Even the Small Honey Jar includes all {count} Light Readings." / ja "小さなはちみつ壺にも、ライト占い{count}種が含まれています。" / zh-CN "小蜜罐里也包含全部{count}种轻量运势。" / zh-TW "小蜜罐裡也包含全部{count}種輕量運勢。" / vi "Hũ Mật Ong Nhỏ cũng đã bao gồm toàn bộ {count} bài xem nhẹ." / hi "छोटे हनी जार में भी सभी {count} लाइट रीडिंग शामिल हैं।" / es "El Tarro de Miel Pequeño también incluye las {count} Lecturas Ligeras." / fr "Le Petit Pot de Miel comprend lui aussi les {count} Lectures Légères." / de "Auch der kleine Honigtopf enthält alle {count} leichten Deutungen." / nl "Ook de kleine honingpot bevat alle {count} lichte duidingen." / ms "Balang Madu Kecil juga merangkumi kesemua {count} Bacaan Ringan." 상품 이름 표기는 같은 파일의 기존 번역과 맞는지 확인하고 쓴다. 그 뒤 `node scripts/i18n-merge-authored.mjs --core --file homeOverseas-09.json` → `node scripts/design/build-home-funnel.mjs` → `npm run sync:public`. `__tests__/ui/pass-benefits-light.test.mjs`가 12개 언어·placeholder를 검사한다.
- `app/points/PointsClient.tsx`의 passLightLine("라이트 운세 N종 횟수 제한 없이 · 지금 유료인 운세 기준 … 상당")은 "지금 유료인 운세 기준"으로 한정돼 있어 사실과 어긋나지 않는다. 이용권 결제 화면 파일이라 고치지 않고 보고만 한다.

### 5-1·A1·배너 문구 — 구현·검증 끝 (2026-11-14)
SHA는 네 번째 rebase 뒤 기준이다. 모두 로컬 커밋이고 push하지 않았다.

- rebase: 작업 중 origin/main이 세 번 움직였다. `0a2561b26`(충돌 없음) → `eeebfadaf`(`config/sitemap-lastmod.json`만 3번 충돌, upstream 채택 뒤 `npm run sitemap:generate`로 재생성. 재생성 결과는 rebase 전 브랜치 원장과 lastmod 0건·서명 10건 차이, `sitemap.xml`은 같음) → `b67b027f3`(충돌 없음, upstream 변경은 docs/toss·테스트 7개 파일뿐).
- ① 측정 이벤트 `5bad8b321`: 설계 표 그대로. `free_saju_chart_started/completed`(`app/saju/free/FreeSajuForm.tsx:20,22`), `free_ziwei_chart_started/completed`(`app/components/AdvancedZiweiSectionV2.tsx:508,576`), `landing_form_submit`(`app/components/SeoLandingBirthForm.tsx:227`), `login {method:"social"}`(`app/auth/_components/StaticOAuthCallbackRedirect.tsx:424`), `free_saju_submitted {signed_in}`(`js/saju-engine.js:4775`, 게이트 호출문 앞 순수 1줄 추가), `cross_sell_click` placement `free_result` 허용(`js/core/analytics.js:766`). `calculate()` 안의 두 번째 게이트 호출에는 넣지 않았다(중복 방지). `free_result`를 쓰는 CTA는 아직 없다.
- ② A1 `a7d8554f9`: `js/core/analytics.js:267` `entrySourceLabel()`(세션 키 `cd:entry:source`, 고정 코드 8개, 30분, 동의 없으면 삭제), 캠페인 없는 분기(`:334`)에서만 쿠키에 `{campaignId: 코드, version: "entry-20261114-v1", consent, device}`. `lib/marketing/growth-attribution.mjs:17` 허용 규칙 추가. `worker/payments/`·결제 실행 파일은 고치지 않았다. `n_media`·`n_ad_group`은 저장소 근거가 없어 쓰지 않았고, 근거가 있는 `NaPm`(`js/core/naver-conversion-frame.js`)과 `gclid|gbraid|wbraid`만 썼다. "NaPm이 광고 클릭에만 붙는다"는 저장소가 말해 주지 않는 추정이다.
  - 알아 둘 것: 캠페인 없던 주문에도 이제 `metadata.growthAttribution`이 생길 수 있다(기존 선택 필드). `lib/marketing/growth-metrics.mjs`가 campaignId로 묶으므로 캠페인 집계에 `organic_naver` 같은 그룹이 새로 보인다. 영냥이 결제 경로는 쿠키를 읽지 않아 유입 코드가 실리지 않는다. 새 탭 복귀 때 sessionStorage가 비면 라벨이 없다(하한값).
- ③ 배너 문구 `d78d7f21e`: `home.benefitsCopy.lightBanner` 12개 언어와 `lib/marketing/pass-benefits.mjs:29` 연이 대사. `app/points/PointsClient.tsx`는 그대로.
- 원장 재생성 `b3fe6bf5e`.
- 로또 리추얼 제목 폭: `0a2561b26` 기준에서는 origin/main 제목 문자열에 같은 폭 계산을 적용해 61(직접 확인)이라 upstream 실패였고, upstream `65d8accfe`가 고쳤다. 그 뒤 rebase한 브랜치에서 빌드가 통과한다.
- 검증(직접 실행, HEAD `7bb177de4` = origin/main `eeebfadaf` 위): `npm run typecheck` 0 · `npm run lint` 0 · `npm run i18n:check` 0 · `verify-sitemap-integrity` 0(1,081 URL) · `verify-analytics-events` 0 · `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build` 0(postbuild 끝까지) · `verify-home-identity` 0 · `node --test scripts/seo/*.test.mjs` 0(67) · `npm test` 0(5,074) · `check-changed --profile=fast --skip-build --base=origin/main` 0(jest 479 스위트, 8,004 통과, 1 건너뜀).
- 네 번째 rebase(`b67b027f3` 위) 뒤에는 typecheck·verify-analytics-events·verify-sitemap-integrity만 다시 돌렸다(모두 0, 원장 갱신 0). 전체 검증은 다시 돌리지 않았다.

### 묶음 3 진행 (2026-11-14)
- 다섯 번째 rebase: origin/main `e1fc882d7`(1커밋 앞, `scripts/lib/yeongnyangi-mobile-payment.mjs`만 변경) 위로 56커밋, 충돌 없음.
- 3-1 `936a818aa` (`app/components/SeoLandingTemplate.jsx`만):
  - T2의 정체는 `service-scope` 절 끝의 공통 문단 3개였다(10개 허브가 같은 문장). 1개로 줄였다. 지금 문구: "계산 엔진이 근거를 만들고 AI는 선택한 상담의 해설을 씁니다. 결제 조건은 선택한 상품에서 확인하세요. [계산·해석 기준] · [운영자 박병하·네오의 공개 활동]". 비공개 경로 `/yeongnyangi/library/` 링크 10개가 빠졌다(K4와 같은 방향). 면책 절과 `ContentIntegrityNote` 고지는 그대로다.
  - `mergeFaqs`: 고유 FAQ가 3개 이상이면 `DEFAULT_FAQS`를 붙이지 않는다(이전 기준 5). 변경 전 기본 FAQ가 붙던 곳은 nakshatra 1곳뿐이었고(4+1), 지금은 0곳이다(nakshatra FAQ 5→4). 화면 FAQ와 FAQ JSON-LD는 같은 배열을 쓴다.
  - 함정: `__tests__/ui/organic-acquisition.test.mjs`가 `mergeFaqs` 본문만 잘라 vm에서 돌린다. 상수 `MIN_FAQS_BEFORE_DEFAULTS`는 함수 안에 있어야 한다.
  - 함정: 소스가 CRLF라 스크립트로 여러 줄 치환하면 일치하지 않는다. Edit 도구를 쓴다.
- 3-2 설계(구현 전): vedic 선례(`seoLanding.vedic.comparison.*`)대로 `lib/seo-landing-pages.js`의 `SEO_LANDING_TEXT_TRANSLATIONS.ko`에 키를 추가하고, 허브 `sections` 맨 앞에 질문형 heading + 결론 문단(답 먼저) section을 넣는다. 사실 근거는 `lib/seo-service-scope.js`의 `free/paid`. 가격 숫자는 정본(`PIG_COIN_UNLOCK_PRODUCTS`)에서 읽거나 쓰지 않는다. 신년운세 허브(`app/new-year-ai-consultation/page.tsx`, `app/fortune/2027/page.tsx`)는 이 데이터 파일을 쓰지 않는다.
- 3-3 설계(구현 전): `lib/seo-service-scope.js`에 범위 데이터 기준일 상수 하나를 두고 템플릿 범위 절에 "…기준"으로 렌더. 날짜 하드코딩은 그 한 곳만.
- 사이트맵 원장은 묶음 3 끝에 한 번 재생성한다(3-1 뒤 아직 안 함).
