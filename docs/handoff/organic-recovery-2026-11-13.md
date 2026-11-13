---
status: in-progress
updated: 2026-11-13
next: 단계 3 노출 감소 원인 정리
---
# 오가닉 회복: GA4 정확도 · 오늘/내일 운세 차별화 · 노출 감소 원인 정리

## 첫 행동
1. 이 워크트리에서 작업한다: `D:\Development\codedestiny-worktrees\organic-recovery-20261113` (브랜치 `wt/organic-recovery-20261113`, origin/main `a6158fde0`에서 분기). `node_modules`는 메인 폴더로 연결한 junction이다. package-lock이 다르면 `npm ci`가 아니라 차이를 보고하고, 필요하면 junction을 풀고(`cmd /c rmdir node_modules`) 이 워크트리에서 `npm ci`를 한다.
2. `git fetch origin` 뒤 origin/main이 앞서 있으면 rebase한다.
3. 아래 단계 중 `next`만 진행하고, 끝나면 체크박스·결과 기록을 갱신해 커밋한다.

## 지금 상태 (2026-11-13 확인)
- 메인 폴더 `D:\Development\code-destiny`는 다른 세션이 쓰고 있다(브랜치 feat/world-cast-page). 건드리지 않는다.
- 해외 302 리다이렉트는 SEO 묶음 ②(11/03 운영)에서 제거됐다. 현재 `public/_worker.js`는 국가를 `cd_geo_country` 쿠키와 결제 지역 표시에만 쓴다. `/?lang=en` 302는 남아 있다.
- 오늘/내일 운세 차별화는 SEO 묶음 ⑤로 일부만 main에 있다: `2d9042d91`(day-relation.ts·ko.json 관계 문구), `2dabfcdfc`(daily-copy.ts 대상일 인용 재사용). 남은 것: 관계 마커·준비 문구·본문 차별화·번역 noindex. 측정 근거(11/09 운영 SSR): today/tomorrow 24쌍 5단어 Jaccard 최대 56.30%, 10쌍 ≥50%, 내일 페이지에 '오늘 일진'과 오늘 문장이 노출된다. 경계 문서: `D:\Development\seo-audit\code-destiny-20261101\bundle-5\implementation-boundaries-20261109.md`, plan `2026-11-09-seo-bundle-5-daily-copy.md`(SEO 워크트리 `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`의 docs/superpowers/plans). SEO 인수인계 정본: 그 워크트리의 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`.
- 원자료: `D:\Development\seo-data\code-destiny\2026-11-09\` (README.md, manifest.csv). 네이버 28일 클릭 3,308·노출 523,428, 일 노출 10/07 45,458 → 10/08 26,944 → 이후 16k~21k. 상위 URL은 내일 운세(쥐 247·호랑이 168·뱀 159 클릭). GA4(10/10~11/06) 전체 815세션, 네이버 관련 ~107세션.

## 승인 상태
- 2026-11-13 사용자 원문: "GA4 유입을 정확하게 수정하도록 해주면 좋겠고 그 외에도 노출이 줄어든 원인을 분석해서 오늘, 내일 운세 글이 겹치지 않도록 해외 접속 리다이렉트를 없애거나 최적화시키도록해"
- 2026-11-13 선택: GA4 동의 = **"지역별 기본값"** (한국 등 대부분 지역은 기본 집계, 배너에서 '필수만' 고르면 중단, EU·영국·스위스는 동의 후 집계, 개인정보처리방침 GA 고지 확인·보강).
- 2026-11-13 선택: 운영 반영 = **"검증 통과하면 반영"** (전체 검사·CI 통과 시 main push와 운영 릴리스까지. Toss 실패가 아직 남아 있으면 멈추고 보고).
- 이전 기록 "Toss 실패 해소 전 push 보류"(11/09)는 위 선택으로 조건부로 대체된다: Toss 검사가 실패 중이면 push하지 않는다.
- 승인 밖: 361개 `/fortune/date/*` noindex 되돌리기, 유료 광고, 가격 변경. 필요하면 근거를 붙여 사용자에게 묻는다.

## 작업 규칙과 함정
- push 규칙: `git log origin/main..HEAD`로 내 커밋만 확인, fast-forward `git push origin HEAD:main`. 메모리 규칙 code-destiny-shared-main-push 참고.
- 빌드에 `ALLOW_DEV_SERVER_DURING_BUILD=1`이 필요할 수 있다(다른 세션 dev 서버).
- sitemap 서명 drift는 `sitemap:generate` 후 `verify:sitemap-drift`로 확인.
- 로컬 Jest 전체는 5분 넘게 요약 없이 돌 수 있다. 관련 테스트를 골라 돌리고 전체는 공식 CI를 최종 게이트로 쓴다. 성공으로 포장하지 않는다.
- GA4 태그 지연 로드는 2026-09-17 LCP 절충(사용자 승인, `docs/handoff/global-css-render-blocking-2026-09-17.md`)이다. 바꾸면 Lighthouse/LCP 전후를 측정해 기록한다.
- 사주 상품은 29,000원 묶음 전용. 운세 문구는 결과 보장·의료·금융 약속 금지.
- 사용자 안내는 한국어.

## 단계
- [x] 1. GA4 정확도: `js/core/analytics.js`(및 React 라우트 쪽 계측·쿠키 정책 `CodeDestinyCookiePolicy`) — 지역별 consent default(`gtag('consent','default',{analytics_storage:'denied', region:[EEA+UK+CH]})` + 기본 granted, 명시 '필수만'은 denied), 태그 로드를 앞당기되 LCP 영향 측정(예: DOMContentLoaded 직후 또는 짧은 타이머, pagehide 전 손실 최소화), SPA 라우트 page_view 중복·누락 확인, 네이버 유입이 Unassigned/Direct로 빠지는 원인(리퍼러 정책·인앱 브라우저·302) 조사, 개인정보처리방침 GA 고지 확인·보강. 실제 브라우저로 쿠키 배너 미클릭 상태에서 collect 요청 발생 확인.
- [x] 2. 오늘/내일 차별화: 묶음 ⑤ 남은 것 구현 — 내일 페이지에서 '오늘' 표현·오늘 문장 제거, 대상일 기준 원고 풀 분리, 관계 마커·준비 문구. 목표: today/tomorrow 24쌍 5단어 Jaccard 최대 < 30%(측정 스크립트로 전후 기록). 번역 noindex는 범위 판단 후 별도 커밋.
- [ ] 3. 노출 감소 원인 정리: 해외 리다이렉트 부재를 워커 테스트와 실제 요청으로 재확인(남은 국가·언어 기반 리다이렉트 전수 grep, `/?lang=en` 302의 필요성 판단), 10/08 변경 3가지의 영향 근거 문서화, `/fortune/date/*` noindex 재검토 권고(실행 X, 근거·선택지만), 결과를 `docs/seo/organic-drop-analysis-20261113.md`로.
- [ ] 4. 반영: 관련 검사·check:fast·pre-push, Toss 상태 확인, main push, CI 확인, 운영 릴리스(기존 Release Cloudflare Pages and Worker 워크플로 방식), 운영 실측(GA4 collect, 내일 페이지 문구, 해외 리다이렉트 없음), 바뀐 URL IndexNow 제출, 결과 기록.

## 결과 기록

### 단계 1 GA4 정확도 (2026-11-13 완료, 코드 커밋 `163b9e85e`, push·배포 안 함)
**바꾼 것**
- `js/core/analytics.js`: consent default 두 줄 — `{analytics_storage:'denied', region:[EEA 30 + GB + CH = 32]}` 다음 `{analytics_storage:'granted'}`. 명시 선택이 있으면 지역 없이 단일 default(동의=granted, 필수만=denied). `cdSyncConsent`는 명시 선택이 있을 때만 `consent update`. 1st-party 저장(캠페인 귀속·서버 동의·네이버 구매)은 여전히 명시 동의에서만. `ad_*`는 선언하지 않음(AdSense 동작 유지, 바꿀 구체적 근거 없음).
- 태그 주입: load 후 idle(기존) + `TAG_FALLBACK_MS = 3000` 타이머 + 탭 숨김(visibilitychange hidden) 시 즉시 주입, 가드로 1회만. 근거: 운영 실측에서 load가 55초, gtag 요청은 그 뒤 → 이탈 방문의 page_view 유실.
- 홈 퍼널 버그(기존): `#cdhCookieSlot:has([aria-hidden=true]){display:none}`가 배너 안 장식 달(`aria-hidden="true"`)에도 맞아 **홈에서는 쿠키 배너가 늘 숨겨져 '필수만'을 누를 수 없었다**. `:has(>#cdCookieConsent[aria-hidden=true])`로 좁힘(`styles/home-funnel.css`, public 셸 인라인 반영).
- 고지: 정적 셸 배너·설정 문구(i18n 12개 언어 키 교체), Next `AnalyticsConsent.tsx`, 개인정보처리방침 ko(`PrivacyPolicyContent.jsx`)·en/ja/zh/zh-TW(`lib/legal/legalContent.ts`)에 GA4 단락(수집 항목, Google 국외 이전, IP 미저장, 지역별 기본값, 거부 방법·gaoptout, 보관 최대 14개월).
- 테스트: `scripts/verify-analytics-events.mjs`(지역 default·필수만·무선택 update 없음·폴백 타이머·숨김 주입·중복 주입 없음), `__tests__/ui/analytics-consent.test.mjs`(지역 default, 홈 슬롯 선택자).

**LCP 전후** (Lighthouse 모바일, 로컬 서빙 gzip, 외부 출처 차단, 운영 gtag 사본, 변형 교차 실행; 스크립트 scratchpad `lcp/harness.mjs`)
- simulate 5회 중앙값: baseline 12,158ms / new 18,786ms / immediate 21,354ms — 그러나 모든 변형이 FCP 8초대·15초대로 갈리는 이봉 분포라 중앙값이 모드 표본 수에 좌우된다. 같은 모드끼리: 빠른 모드 baseline 11.1–12.2s, new 11.0–12.8s, immediate 11.0s / 느린 모드 baseline 20.3–20.7s, new 18.8–20.2s, immediate 21.1–21.8s → new ≈ baseline, 즉시 주입은 약 +1s.
- devtools 스로틀 4회 중앙값: LCP baseline 12,763 / new 12,145 / immediate 12,326ms; gtag 시작 baseline 21,021(load 20,083 뒤) / new 19,017(load 전, LCP 뒤). → 3초 폴백 유지, 회귀 없음. Next 라우트는 빌드가 없어 미측정.

**실브라우저 확인** (Playwright Chromium, 412px, 로컬 서버, 테스트 속성 G-TESTONLY00, collect는 로컬 204로 가로챔)
- 새 방문자(쿠키 없음, 배너 미클릭): gtag 2.1s 요청, dataLayer = 지역 denied(32) → granted, `page_view` collect `gcs=G1-1`, `_ga`·`_ga_TESTONLY00` 생성.
- 홈 배너 '필수만' 실제 클릭(수정 전엔 0×0이라 클릭 불가): `cd_cookie_consent=essential`, `consent update denied`, 이후 hit `gcs=G1-0`.
- `_ga` 지우고 재방문: 단일 default denied, hit 모두 G1-0, `_ga` 미생성.

**SPA page_view**: 운영 실측에서 SPA 이동 1회에 page_view 2건(수동 NavigationProvider + 향상된 측정 history 이벤트, dr=이전 페이지). 코드 쪽 수동 발화는 단일(검증 스크립트 통과). 중복 제거는 GA4 관리 설정 필요 → 사용자 결정.

**네이버 Direct/Unassigned 원인**
- 주원인: 기존 기본 denied → 쿠키 없는 핑이라 세션·소스 귀속이 무너짐(이번 수정으로 KR 기본 granted).
- 이미 수정됨: 옛 utm "cover"/"paid"(11/10 `64388836e`), nid.naver.com 로그인 복귀 `ignore_referrer`(11/10).
- 코드로 못 고침: 네이버 앱 인앱 브라우저의 리퍼러 제거. `m.search.naver.com/referral`은 Organic Search로 묶이는 게 정상. Referrer-Policy `strict-origin-when-cross-origin`은 나가는 요청에만 영향. `/?lang=en` 302는 리퍼러 유지.

**검사 결과(정직하게)**
- 통과: `verify:analytics-events`, `node --test` analytics-consent·static-css-cache-keys·account-sheet(15/15), `i18n:check`, verify-business-identity, verify-payment-legal-copy, Jest payments-v2.policy-versions(2), first-visit-guide(18).
- `check:fast`: 77개 ok 뒤 `verify:sitemap-drift`에서 BLOCKED — 원인은 날짜 기반 lastmod(주간 운세 11-12→11-13)로 이번 변경과 무관. `sitemap:generate` 결과는 되돌렸다(반영 단계에서 다시 생성해 함께 커밋). drift 이후 검사는 미실행.
- 미실행: `verify-adsense-readiness`(dist 필요), Next 라우트 LCP, EEA 동작은 단위 검증만(실제 지역 판정은 Google 쪽).

**사용자 결정 필요 / 남은 것**
- GA4 관리 > 데이터 스트림 > 향상된 측정 > 페이지 조회 > "브라우저 기록 이벤트 기반 페이지 변경" 끄기 권장(SPA page_view 중복 제거, 자동 이벤트가 원시 쿼리도 보냄).
- 개인정보처리방침 시행일(2026-10-10, `worker/routes/auth.js`·`worker/payments/policy-versions.js`와 연동)은 올리지 않았다. 고지 변경으로 개정일을 올릴지 결정 필요(올리면 재동의 흐름 영향 확인).
- 정적 셸에는 배너를 닫은 뒤 다시 여는 '쿠키 설정' 링크가 없다(Next 푸터에만 있음).
- '필수만'은 이미 생긴 `_ga` 쿠키를 지우지 않고, denied 상태에서도 쿠키 없는 핑(consent mode advanced)은 나간다.
- 홈 배너가 이제 퍼널 중간(412px 기준 y≈6600)에 인라인으로 보인다 — 위치 조정은 디자인 판단.

### 단계 2 오늘/내일 차별화 (2026-11-13 완료, 커밋 `f943630a0`·`f6fbd914a`, push·배포 안 함)
**바꾼 것**
- 대상일 원고 풀 회전 `f943630a0`: `lib/fortune/daily-pick.mjs`(`dayRotationPick`) — 풀 크기 n일 블록마다 키별 시드 순열, 블록 경계에서 앞 블록 마지막과 같으면 첫 두 칸 교환 → 이웃 날짜는 같은 칸에서 같은 문장을 받지 않는다(풀 ≥2). `scripts/gen-daily.mjs`의 `pickTone`·별자리 keyword/color/planet/overall에 적용. 재생성 실측: 이웃 날짜 반복 91/4,320칸 → 0(남은 건 띠 `overall` 고정 설계 360칸). 타로 카드(`yeongnyangi-daily-card.ts`)는 1/22 확률로 이웃 날짜가 겹칠 수 있음 — 손대지 않음.
- 한국어 내일 상세 전용 문구 `f6fbd914a`: `lib/fortune/tomorrow-sign-copy.ts` — 내일 고지(예고·건강·성과 보장 아님, 의료·법률·투자 판단 대체 아님), 관계 종류(비화·충·삼합·중립 / 태양 같음·달 통과·중립)별 준비 문장 + `11월 14일(내일) 준비` 마커(관계 섹션, `lang="ko" data-cd-no-trans`), 개인 풀이·분야별 조언 도입·궁합 도입 내일판, FAQ 활용 문답 내일판(화면·FAQPage 공용, 질문에 재물운 유지 — `sky-and-range` 테스트 조건). 웹툰 lead/note 내일판(`daily-webtoon.ts`). 내일 ko에서 상시 `essence`·`saju_insight` 숨김(오늘 페이지 링크는 유지). 다른 기간·sign 그리드·"하루 너머" 링크 목록을 `<section>`→`<nav>`(모든 기간·로케일). ko `narrative`·관계 `detail`·i18n 마커는 그대로.
- 측정 `scripts/measure-daily-overlap.mjs`(SSR `<main>`, script/style/svg/nav/template 제외, 5단어 shingle Jaccard), 결과 `docs/seo/2026-11-13-today-tomorrow-overlap-{before,after}.json`. 테스트 `__tests__/fortune/today-tomorrow-separation.test.mjs`.

**측정 (로컬 mock SSR, 2026-11-13/14, 24쌍)**
- 전: 최대 39.08%(aquarius), 평균 33.46%, ≥30% 16쌍, min-set 최대 57.0%. 후: 최대 18.05%(aquarius), 평균 13.84%, ≥30% 0쌍, min-set 최대 31.5%. 목표(<30%) 통과.
- `<nav>` 텍스트까지 넣어 재도 전 38.54% → 후 22.36%(≥30% 0쌍) — nav 전환이 목표 통과의 이유가 아님.
- 내일 본문 '오늘 일진' 0, '오늘'이 든 문단 0(전후 모두; 남은 '오늘'은 RSC payload·다른 기간 링크 라벨뿐). 내일 본문 최소 3,671자(애드센스 기준 1,200자 이상).
- 운영 수치(11/09 최대 56.30%)와 직접 비교는 아님 — 로컬 데이터 날짜·mock 기준. 운영 재측정은 단계 4에서.

**번역 noindex: 적용 안 함(판단)** — 경계 문서 `implementation-boundaries-20261109.md` 7항: "미완성 번역 noindex는 아직 적용하지 않는다… URL별 목록과 승인 패킷이 선행한다." 검증된 URL 목록이 없어 범위 밖. 별도 커밋 없음.

**검사 결과**
- 통과: `node --test` today-tomorrow-separation(4)·daily-webtoon·sky-and-range(합 23/23), `verify:fortune-period-axis`, `verify:fortune-marker-keys`, `verify:fortune-freshness`, `typecheck`, 변경 파일 eslint(오류 0, 기존 경고 4).
- 미실행: `next build`/`build:cf`, `verify:adsense-readiness`(dist 필요), `check:fast`(단계 4에서), 번역 로케일 내일 페이지 육안 확인.
- 데이터: `fortune/data`·`public/fortune/data`(gitignore)를 지우고 재생성했다. 배포 시 CI가 새 회전 규칙으로 생성하므로 운영의 이미 게시된 날짜 문구는 바뀔 수 있다(같은 날짜도 이전 hashPick과 다른 문장).
