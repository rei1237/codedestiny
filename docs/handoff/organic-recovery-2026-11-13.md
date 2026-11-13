---
status: in-progress
updated: 2026-11-13
next: 단계 1 GA4 정확도 수정
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
- [ ] 1. GA4 정확도: `js/core/analytics.js`(및 React 라우트 쪽 계측·쿠키 정책 `CodeDestinyCookiePolicy`) — 지역별 consent default(`gtag('consent','default',{analytics_storage:'denied', region:[EEA+UK+CH]})` + 기본 granted, 명시 '필수만'은 denied), 태그 로드를 앞당기되 LCP 영향 측정(예: DOMContentLoaded 직후 또는 짧은 타이머, pagehide 전 손실 최소화), SPA 라우트 page_view 중복·누락 확인, 네이버 유입이 Unassigned/Direct로 빠지는 원인(리퍼러 정책·인앱 브라우저·302) 조사, 개인정보처리방침 GA 고지 확인·보강. 실제 브라우저로 쿠키 배너 미클릭 상태에서 collect 요청 발생 확인.
- [ ] 2. 오늘/내일 차별화: 묶음 ⑤ 남은 것 구현 — 내일 페이지에서 '오늘' 표현·오늘 문장 제거, 대상일 기준 원고 풀 분리, 관계 마커·준비 문구. 목표: today/tomorrow 24쌍 5단어 Jaccard 최대 < 30%(측정 스크립트로 전후 기록). 번역 noindex는 범위 판단 후 별도 커밋.
- [ ] 3. 노출 감소 원인 정리: 해외 리다이렉트 부재를 워커 테스트와 실제 요청으로 재확인(남은 국가·언어 기반 리다이렉트 전수 grep, `/?lang=en` 302의 필요성 판단), 10/08 변경 3가지의 영향 근거 문서화, `/fortune/date/*` noindex 재검토 권고(실행 X, 근거·선택지만), 결과를 `docs/seo/organic-drop-analysis-20261113.md`로.
- [ ] 4. 반영: 관련 검사·check:fast·pre-push, Toss 상태 확인, main push, CI 확인, 운영 릴리스(기존 Release Cloudflare Pages and Worker 워크플로 방식), 운영 실측(GA4 collect, 내일 페이지 문구, 해외 리다이렉트 없음), 바뀐 URL IndexNow 제출, 결과 기록.

## 결과 기록
