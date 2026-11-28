# AI 고객지원 설계 (AI_SUPPORT_ARCHITECTURE)

상태: **설계만. 구현은 다음 묶음(S9).** 전 항목 NOT_TESTED. 2026-11-28 사용자 결정: Workers AI 우선, Gemini flash 대체.

## 원칙

- LLM 은 MongoDB 와 관리자 API에 직접 닿지 않는다. 서버가 정한 도구만 부르고, 도구는 **로그인한 본인 데이터**만 읽는다.
- 결제 복구·환불은 LLM 판단으로 실행하지 않는다. 도구는 상태를 읽고 기존 사용자 경로(서사 재시도 라우트 등)로 안내만 한다.
- 규칙·FAQ 로 답할 수 있으면 LLM 을 부르지 않는다.

## 구성

1. 입구: 영냥이 HelpDesk(기존 `HelpDesk.jsx` 확장). LLM 이 꺼져도 동작하는 "결제했는데 결과가 없어요" 카드를 먼저 둔다.
2. 지식: `paid-feature-registry`, FAQ 문구, `lib/brand/brand-facts.mjs` 에서 빌드 때 생성. 하드코딩하지 않는다.
3. 도구(읽기 전용): 내 결제 목록(`/api/payments/me`), 내 기록(`/api/records`), 영냥이 요청(`/api/yeongnyangi/requests`), 서사 재시도 가능 여부.
4. LLM: 기존 `lib/llm-client.ts` cloudflare 공급자. 실패·상한 초과 시 Gemini flash, 그것도 실패하면 FAQ·사람 문의 안내.
5. 제한: 일·월 호출 상한, 사용자·IP 속도 제한(`worker/lib/security` 재사용).
6. 넘김: 해결 못 하면 결제 식별자 앞 12자와 상품 키만 붙여 운영자 문의로 넘긴다(검토 알림과 같은 마스킹 규칙).

## 검증 계획 (S9)

- mock LLM 으로 도구 권한 테스트(남의 데이터 접근 거부).
- 모바일 너비 실제 화면 캡처.
- Workers AI 실호출은 정확한 1회 승인 뒤.
