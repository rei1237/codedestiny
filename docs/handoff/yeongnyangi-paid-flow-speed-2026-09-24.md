---
status: active
updated: 2026-09-24
next: "U6(영냥이 브라우저 섀도 CI) 배선부터 한다. 그다음 계측(report-pg-window-latency) → 후보 ①② 순. 결제 단계 변경(⑤⑥)은 RED 라 위험·검증·롤백을 먼저 보고한다."
---

# 영냥이 유료 흐름 속도 개선 — 인수인계

다음 세션 첫 문장: "docs/handoff/yeongnyangi-paid-flow-speed-2026-09-24.md 를 읽고 '1단계 U6 배선'부터 해."

## 요구(사용자 원문, 2026-09-24)
> 영냥이 유료 서비스는 결제 관련해서 너무 단계가 느리고 로그인 확인이라든지 너무 느린데 이 과정을 빠르게 가능해주면 좋겠다.

- 같은 날 이니시스 보안 권고 세션(`docs/handoff/inicis-security-advisory-2026-09.md`)이 "보안 먼저, 속도는 인수인계"로 결정해 여기로 넘어왔다. 로드맵 S13(`competitiveness-roadmap-20260923.md`)과 같은 축이다.

## 1단계 — U6 배선(승인 2026-09-24)
- 사용자 승인: `scripts/verify-yeongnyangi-browser.mjs` 를 **결제 파일 경로 한정 섀도 CI 잡**으로 붙인다. 속도 변경보다 먼저 한다 — 결제 단계를 줄이는 변경의 회귀를 이 잡이 잡는다.
- 현재 상태(실측): CI·`package.json` 어디에도 배선돼 있지 않다. 루프백 목 서버 또는 `--build-static` 이 있어야 돈다.
- 섀도 = 실패해도 `CI required` 를 막지 않는다. 기존 검사 삭제 금지, 10회 push 비교 전까지 섀도 유지(CLAUDE.md 탐색·검증 절).
- 실PG·유료 LLM 호출 0 이어야 한다. `verify-pg-window-live-e2e.mjs` 는 실PG 라 쓰지 않는다.

## 지연 지도(HEAD 7d1989347 기준 코드 조사 — 시간 값은 추정, 실측 아님)
- 첫 장까지 전체 페이지 이동: 데스크톱 2회, 모바일 3회.
- PG 창 전 직렬 서버 단계 3개: ① `/me` ‖ 청크 ② `Promise.all(GET 상담, GET 상품)` ③ 결제 클릭 뒤 activate(402) → 선택 모달 → checkout.
- 결제 버튼은 플래그 4개가 모두 서야 켜진다(`app/checkout/CheckoutClient.tsx:246-251`).
- 포트원 SDK 는 선택 모달에서야 로드된다. `cdn.portone.io` preconnect 없음.
- 인증 호출: PG 전 약 5회, 후 3-4회. 서버 캐시 30초, 클라이언트 캐시 300초는 페이지 이동마다 소실.
- activate 1회에 Mongo 왕복 약 6-7회. 콜드 핸드셰이크 중앙값 1,497ms(`worker/lib/db.js:615` 주석 실측값).
- 결과 화면의 첫 재확인은 5초 뒤.
- 로컬 힌트가 없으면 로그인 상태여도 게스트로 보일 수 있다(`app/_lib/user-session-cache.ts:582-584` — 힌트가 없으면 `/api/auth/me` 를 부르지 않고 게스트 응답을 돌려준다).
- bc2c873d0(Family 이용권 복원)의 `skipPassProbe` 제거로 이용권 조회가 늘었을 가능성 — 미실측.

## 후보(권장 순서)
0. **먼저 계측**: `node scripts/report-pg-window-latency.mjs --days 7`(읽기 전용) + 성공 경로 단계별 타이밍 로그. 추정을 실측으로 바꾼 뒤 고른다.
1. 결과 화면: 즉시 재조회 후 1-2초 간격(GREEN). `app/yeongnyangi/_components/Result.tsx` 는 영냥이 복구 세션이 만든 파일이라 소유 세션을 먼저 확인한다.
2. `cdn.portone.io` preconnect + `/checkout/` 진입 때 SDK 선로드(GREEN/AMBER — CSP 확인).
3. 결제 청크 prefetch.
4. 로컬 힌트가 있으면 GET 을 `/me` 와 병렬(AMBER).
5. 클릭 전 activate 를 결제창 단계로 옮김(RED — 결제 게이트 순서 변경).
6. 비Family 스냅샷이면 선택 모달 생략(RED — 결제 선택 정책).
7. 큐 동시성·1장 전용 레인·DLQ(AMBER).

## 함께 볼 결함(보고만, 이 세션 범위 밖)
- B-2: Family 이용권이 클릭 없이 차감될 가능성 — 의도인지 제품 결정 필요.
- B-3 🔴: 중복 결제 주문이 소비되지 않고 복구 크론이 굶는다(`worker/yeongnyangi/repository.js:122`).
- B-4·5·6: 큐 DLQ 없음, 복구 처리량, 오도하는 로그.
- B-9: 결과 실패 시 자동 환불 없음.

## 지키는 것
- 결제 진입은 로컬 스냅샷, 서버 이용권 판정은 결제창에서(CLAUDE.md). 단건은 사용자 선택 뒤에만.
- 결제 동결 파일(`lib/payment/portone.ts`·`app/_lib/billing-client.ts`·`app/hooks/useCoinGate.ts`)을 건드리면 payment-freeze 절차.
- 검증은 전부 mock. 스테이징 확인은 결제·로그인 대형 변경 뒤 1회.
