# Code Destiny UI/UX & Bottleneck Audit

## 1. 전체 구조 요약
- 주요 라우트: `app/page.js`, `app/saju/**`, `app/tarot/**`, `app/astrology-ai/**`, `app/vedic-ai/**`, `app/ziwei-ai/**`, `app/sukuyo-compatibility-ai/**`, `app/life-book-ai/**`, `app/love-secret-ai/**`, `app/karma-destiny-ai/**`, `app/new-year-ai-consultation/**`, `app/me/**`, `app/points/**`, `app/premium/**`, `app/login/**`, `app/signup/**`, `app/pdf/**`, `app/insights/**`
- 주요 컴포넌트: React 홈은 `app/page.js`, 공통 SNS 푸터는 `app/_components/SocialFooter.js`, 기능별 화면은 각 route page/client와 CSS module에 분산되어 있다.
- 정적 메인 / React 메인 차이: 최초 정적 셸은 `index.html`이 source of truth이고 `public/**/index.html`은 sync 산출물이다. React 홈은 `/` route의 SEO와 서비스 카드/결제 안내를 담당한다.
- 결제 관련 파일: `app/_lib/billing-client.ts`, `worker/routes/billing.js`, `worker/routes/payments.js`, `worker/lib/billing-feature-registry.js`, `worker/lib/billing-policy.js`
- 생성 관련 파일: `worker/routes/*-ai.js`, `worker/lib/*-prompt*.js`, `app/*-ai/**`, `app/*-ai/result/**`
- 공통 UI 관련 파일: `app/home-cosmic.module.css`, `styles/**`, `components/**`, 기능별 CSS module, 정적 셸 스타일 `styles/**`와 synced `public/styles/**`

## 2. 가장 심각한 문제 TOP 10
1. 정적 메인과 React 홈이 동시에 존재해 같은 UX/SEO 변경이 한쪽에만 반영될 위험이 높다.
2. 현재 worktree에 병렬 변경이 많아 결제, Worker, 정적 미러를 함께 건드리면 회귀 추적이 어려운 상태다.
3. React 홈 서비스 카드가 동일 `href`를 key로 사용해 중복 key 경고와 카드 재사용 오동작 가능성이 있었다.
4. 기능별 AI 상담 화면이 `prepare/ensure-access/generate/start/message` 흐름을 각자 구현해 상태 문구와 버튼 잠금 UX가 불균일하다.
5. 결제 UX는 Worker 정책상 `pass`, `one_time`, `monthly` 경로가 준비되어 있으나 화면별 안내 밀도와 CTA 강도가 다르다.
6. 결과 화면의 PDF/공유/재방문 CTA가 기능마다 위치와 스타일이 다르다.
7. 긴 결과 화면은 카드형 섹션이 있는 곳과 텍스트 중심인 곳이 섞여 핵심 요약을 찾는 시간이 길어질 수 있다.
8. 일부 기능은 scoped style block, Tailwind class, CSS module이 혼재해 버튼/카드/입력 폼 톤이 계속 벌어질 수 있다.
9. 이미지/R2 asset 경로는 기능별로 분산되어 있어 실패 fallback과 모바일 payload 점검이 필요하다.
10. `next dev`와 `next build`가 같은 `.next`를 동시에 쓰면 전체 build 검증이 불안정해질 수 있다.

## 3. 사용자 이탈 가능성이 높은 구간
- 기능 선택 후 결제 전: 이용권, 단건 결제, 월정석의 차이가 화면마다 같은 깊이로 설명되지 않는다.
- 생성 대기 중: 실제 진행률을 모르는 화면은 단계형 상태 문구가 없으면 멈춘 것처럼 보일 수 있다.
- 결과 확인 후: PDF, 공유, 다른 상담 이동 CTA가 기능마다 달라 다음 행동이 약해질 수 있다.
- 모바일 입력: 생년월일, 시간, 장소, 관계 정보가 긴 화면은 하단 CTA가 멀어질 수 있다.

## 4. 성능 병목 가능성이 높은 구간
- 기능별 hero 이미지와 R2 asset이 많은 화면은 LCP와 모바일 데이터 사용량 점검이 필요하다.
- AI 상담 화면은 큰 결과 데이터를 한 번에 렌더링하는 구조가 있어 섹션 접힘과 요약 카드 우선 렌더링을 검토할 만하다.
- 정적 셸 asset은 cache key 규칙을 지키지 않으면 production 반영 확인이 어려워진다.

## 5. 결제/생성 플로우 리스크
- Worker billing route는 `ACCESS_METHOD_ORDER = ["pass", "one_time", "monthly"]`로 정책 축이 있다.
- 프론트 공통 클라이언트는 `runBillingCoinGate`로 `/api/billing/coin-gate`를 호출한다.
- 각 AI 화면은 idempotency key와 `prepare/ensure-access/generate` 단계를 자체 구현하므로 중복 클릭 방지, 실패 문구, 재시도 안내를 화면별로 비교해야 한다.
- 서버 registry 기반 가격 해석은 확인되므로 가격 하드코딩 수정은 이번 범위에서 건드리지 않는다.

## 6. 모바일 UX 문제
- 주요 AI 입력 화면은 `min-h-11/12` 버튼을 다수 사용해 터치 크기는 대체로 확보되어 있으나, 하단 CTA 고정 여부는 화면별 검증이 필요하다.
- 카드, hero, form이 기능별로 개별 설계되어 360px/390px/430px에서 줄바꿈과 CTA 위치가 다르게 나타날 수 있다.
- 긴 결과 페이지는 상단 요약과 하단 CTA가 같은 패턴으로 유지되지 않는다.

## 7. 디자인 일관성 문제
- 버튼 radius, gradient, gold/pink/violet 톤, card opacity가 기능별로 다르다.
- 공통 `DestinyButton`, `DestinyCard`, `DestinyLoadingState`, `DestinyErrorState`, `DestinyPaymentNotice` 후보가 있으나 현재는 최소 침습이 우선이다.
- React 홈 SNS 푸터는 기준 링크와 새 창 속성이 맞지만, 정적 메인 푸터와 같은 수준인지 별도 확인이 필요하다.

## 8. 즉시 수정할 항목
- React 홈 카드 key를 고유 `id`로 전환해 중복 key 리스크를 제거했다.
- 사주 가디언 결과의 그림 주문 복사 버튼에 `role="status"` 기반 성공 알림을 추가했다.
- 다음 즉시 후보는 생성 대기 UI의 단계 문구 표준화와 결과 하단 CTA 표준화다.

## 9. 추후 리팩토링 권장 항목
- 공통 결제 안내 컴포넌트를 만들되 Worker policy와 registry 응답을 그대로 소비한다.
- 생성 단계 UI를 실제 backend 단계와 맞는 stepper로 통일한다.
- 결과 화면에 요약, 근거, 실행 전략, PDF/공유 CTA 순서를 표준화한다.
- R2 이미지 fallback과 width/height/alt 점검 스크립트를 추가한다.
- 정적 메인과 React 홈의 SEO/CTA 차이를 체크하는 report를 별도 유지한다.

## 10. 이번 감사 근거
- 검색 키워드: `app/**/page.*`, `worker/routes/**`, `runBillingCoinGate`, `prepare`, `ensure-access`, `generate`, `aria-live`, `role="status"`, `metadata`, SNS URL
- 직접 확인 파일: `package.json`, `next.config.mjs`, `app/page.js`, `app/saju-guardian/page.tsx`, `app/_components/SocialFooter.js`, `worker/routes/billing.js`, `worker/lib/billing-feature-registry.js`, `app/_lib/billing-client.ts`
