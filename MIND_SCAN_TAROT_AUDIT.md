# Mind Scan Tarot Audit

## 1. 실제 라우트

- route: `/tarot/mindscan`
- page file: `app/tarot/mindscan/page.tsx`
- component file: `app/components/MindScanTarot.tsx`, `app/tarot/mindscan/MindScanTarotRouteClient.tsx`
- layout file: 별도 route layout 없음. `app/layout.js`가 `AppChrome`으로 children을 감싼다.

## 2. Header/Footer 주입 구조

- Header 위치: `app/components/AppChrome.tsx`의 `GlobalHeader`
- Footer 위치: `app/components/AppChrome.tsx`의 `SiteFooterHub`
- 전역 layout 여부: `app/layout.js`의 공통 `AppChrome`을 통한 전역 주입
- route별 제외 가능 여부: 기존 `CHROMELESS_ROUTES`에 `/tarot/mindscan`을 추가하는 방식으로 가능
- 적용 방식: 해당 route에서 Header, DisclaimerBanner, SiteFooterHub만 숨기고 기존 `FeatureBackHomeNav`와 모바일 `MobileBottomNav`는 유지한다.

## 3. 결과 생성 방식 판별

- LLM 기반 / 정적 기반 / 하이브리드: 하이브리드
- 근거 파일: `lib/tarot/mindscan-reading.mjs`, `app/api/tarot/mindscan/route.js`, `worker/routes/tarot.js`
- 호출 흐름: 카드 5쌍을 정규화한 뒤 로컬 rule-engine으로 7개 section을 구성하고, Gemini 키가 있으면 Gemini JSON 결과를 검증·보강한다. 호출 실패나 유효하지 않은 응답은 로컬 결과로 폴백한다.
- 외부 API 호출 여부: 환경 변수에 Gemini 키가 있을 때만 Gemini REST API를 호출한다. 이번 검증에서는 mock fetch만 사용했고 실제 LLM은 호출하지 않았다.
- mock 테스트 가능 여부: `buildMindscanReadingPayload`가 `fetchImpl`을 주입받으므로 가능하다.
- 배포 라우팅: 개발 환경에서는 `/api` rewrite가 Worker로 연결될 수 있고 App API와 Worker route 모두 동일한 공유 builder를 호출한다. 운영 배포에서 최종 dispatch 경로가 어느 쪽인지와 우선순위는 배포 설정 확인이 필요하다.

## 4. 권한/이용권 관련 흐름

- 인증 필요 여부: 화면의 `useCoinGate`가 기존 로그인·접근 확인 흐름을 수행한다. mindscan API 분기 자체에는 별도 `requireAuth` 호출이 없다.
- 이용권 차감 여부: `featureKey: "tarot-mindscan"`와 기존 `useCoinGate` 정책을 사용하며, 이번 작업에서 차감 시점·실패 환불·requestId 처리는 변경하지 않았다.
- 월정석 여부: 공통 access gate의 기존 이용권·월정석·단건 결제/크레딧 적용 정책을 그대로 사용한다.
- 저장·히스토리·공유 여부: 서버 결과 저장·히스토리·재조회 기능은 확인되지 않았다. 클라이언트에는 현재 결과 공유·저장·복사·홈 이동 UI가 있으나 새 저장 기능은 추가하지 않았다.

## 5. 수정 범위 제안

- 헤더/푸터 제거 방식: 기존 `CHROMELESS_ROUTES`에 `/tarot/mindscan`만 추가
- 상담 품질 개선 방식: 공유 rule-engine 폴백에 메인/보조 카드 조합, 포지션별 관계 렌즈와 오해 방지 문장을 반영하고, Gemini prompt에 역할 분리·반복 방지·비결정론·실행 가능한 대화 조언 규칙을 추가
- 회귀 위험: `AppChrome` 라우트 목록 오기입, 기존 모바일 하단 네비게이션의 노출 변경, 공유 생성 함수의 7개 section schema 변경
- 검증 방법: UI 정적 테스트, mock 기반 생성 함수 테스트, lint/typecheck/build 및 Worker build

