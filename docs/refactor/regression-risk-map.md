# 회귀 위험도 Map

측정일 **2026-09-12**. 등급은 "고쳤을 때 조용히 깨질 확률 × 깨졌을 때의 피해"다. **파일 수나 줄 수는 등급 기준이 아니다.**

기본 리팩터링 순서는 **C → B → A → S**. 안전망 성격의 작업만 예외로 앞으로 당긴다([phase-plan.md](phase-plan.md) 참조).

## S — 보호 테스트 없이 구조 변경 금지

| 영역 | 왜 S 인가 | 선행 조건 |
|---|---|---|
| `worker/payments/**`, `worker/lib/billing.js`·`payments.js`, `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts` | 실결제·PG·권한 부여 경로. `config/payment-freeze.json` 이 함수 본문 4 + 파일 3 + LOC 상한으로 동결 | payment-freeze 절차. 변경 전 `check:payment` |
| `worker/routes/auth.js`, `worker/lib/auth.js` | 로그인·세션·개인정보 | 인증 Jest + `verify:auth-session-stability` |
| `js/saju-engine.js` `calculate()` | 34,129줄, 단위 테스트 **0**, `innerHTML` 103곳, 엔진 5벌 중 정본 | characterization 테스트로 현재 출력을 먼저 고정 |
| Mongo 트랜잭션 경로 | 결제된 고객에게 서비스가 안 가는 상태를 만들 수 있는 유일한 지점 | 실 DB 쓰기 금지. mock 으로만 |

> **결제된 고객에게 서비스가 제공되지 않는 상태는 시스템적으로 최대한 불가능하게 만든다.** S 등급 작업의 판정 기준은 이것 하나다.

## A — 판정 수렴만. 파일 이동 금지

| 영역 | 왜 A 인가 |
|---|---|
| `worker/routes/**` 72파일, `worker/lib/models.js`, `entitlement-policy.js`, `profile-limits.js` | **타입 검사 대상이 아니다** — `tsconfig` include 가 `**/*.ts(x)` 뿐이다. 오타가 런타임까지 간다 |
| `js/core/access-store.js`, `app/_lib/user-session-cache.ts`, `optimistic-unlock-ledger.ts` | 권한 상태 writer 4개 × TTL 4종. 화면마다 잠금이 보였다 안 보인다 |
| `lib/llm-client.ts` + 우회 3곳 | jest 목 매퍼가 경로 깊이에 의존 → **테스트가 실과금 호출을 할 수 있다** |
| 로케일 | 저작은 en·ja·zh-CN·zh-TW 4개, 나머지 7개는 영어 복사. ko 는 사전을 건너뛴다 |

## B — 페이지 컨트롤러·상태

| 영역 | 120일 커밋 | 테스트 | 취급 |
|---|---:|---:|---|
| `index.html` 인라인 블록 | 1,525 | 0 | `js/inline/` **기존 패턴**으로 단계 추출. CLS·CSP·실행순서 가드 동반 |
| `js/core/index-inline-runtime.js` | 1,371 | | 같음 |
| `js/core/uiBindings.js` | 1,280 | 1 | 같음 |
| `js/mobile-interaction-patch.js` | 1,133 | 0 | 같음 |

🔴 인라인 스크립트는 CSP 해시 청크다. 추출 순서를 바꾸면 해시가 깨지고, 늦게 도는 CSS 는 CLS 가 된다. 줄 수만으로 분할하지 않는다([ARCHITECTURE.md:40](../../ARCHITECTURE.md)).

## C — 가장 먼저, 가장 안전

동작 경계가 바뀌지 않는 것만 여기 온다: `lib/payment/coin-pricing.ts`, `lib/date/**`, `normalizeGender` 31벌, 원화 포맷 ~25곳, `Asia/Seoul` 121파일.

이것들은 **정본을 하나 고르고 호출부를 돌리는** 작업이다. 새 giant util 을 만들지 않는다.

## 공통 금지

- 테스트 없이 결제 로직 변경 · UI 와 domain logic 을 더 강하게 결합
- 실제 LLM 호출 테스트(mock·fixture·stub 만. 실호출은 사용자 1회 승인)
- 줄 수 감소를 위한 파일 분할 · giant common/utils 생성
- 오류를 try/catch 로 숨기기 · 결제 오류를 성공 처리 · Mongo 오류를 무조건 재시도로 덮기
- 타입 오류를 `any` 로 해결 · 기존 테스트를 삭제해 CI 통과
- 회귀가 난 상태에서 신규 코드 덧붙이기(→ 되돌린 뒤 다르게 구현)
- 사용 여부 확인 없이 legacy 삭제(소스·테스트·verify 3면 grep 먼저)
