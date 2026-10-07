---
status: done
followup_status: server_readonly_audit_pending
updated: 2026-10-08
---

# 유료 상담 서버 설정·복구 점검 인수인계

계획 작성은 완료했다. 운영 설정 변경 및 고객별 실측 진단은 아직 하지 않았다. 다음 세션은 아래 읽기 전용 점검부터 진행한다.

## 사용자 요청과 승인 경계

- 패밀리 이용권 고객의 신년운세 화면에 “이용권 확인 실패 / 상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.”가 표시됐다. 고객의 주문번호·발생 시각·서버 오류 코드는 아직 없다.
- 신년운세·인생의 책·연애 비책·다른 전문가 상담에서 결제 후 결과 누락을 줄이고, 서버 생성·재개·재시도를 안정화하라는 요청이다.
- 신년운세는 질문의 직접 답변을 먼저, 이어서 타고난 성향·사용자가 표현한 어려움에 대한 공감·명리 근거·연간 흐름·현실적인 행동을 다룬다. 불명확한 운세 해석 규칙은 반드시 사용자에게 묻는다.
- 읽기 전용 설정/오류 분석과 mock 검증은 진행한다. 실 LLM·실결제·환불·운영 DB 쓰기·운영 설정 변경/승격은 구체적 변경안과 검증을 준비한 뒤 별도 승인을 받는다. 재시도를 위해 결제 권한을 새로 만들거나 기존 결과를 삭제하지 않는다.
- 새 채팅 생성·타 세션 메시지 발송은 요청되지 않았다. 이 문서를 다른 세션에 전달해 이어간다.

## 확인된 코드 원인과 수정

1. `new-year-ai`, `love-secret-ai`, `life-book-ai`의 이용권 판정 값 `family`/`membership_pass`가 상담 저장 enum의 `pass`와 달라 저장 실패 가능. 공용 정규화 적용. 원본 수정 커밋: `5b1a4bffe909b630cf2efef7b7703be4211bcf47`.
2. 직접 이용권 경로 일부가 사용 표시만 저장하고 실제 금액 한도를 차감하지 않았다. 공용 `consumePassForFeature`의 원자적 차감과 원래 requestId의 재사용 계약에 연결했다. 신년운세·연애 비책·인생의 책 외 점성술·베다·나크샤트라·카르마도 점검/보완했다. 자미두수 섬의 잘못된 grant 타입도 정규화했다.
3. 베다 ensure-access는 클라이언트가 pass라는 값을 보내야만 서버 이용권을 확인했다. 서버에서 기존 결제 증빙을 우선 확인한 뒤 보유 이용권을 독립 판정하도록 수정했다.
4. 신년운세 ensure-access의 일시적 네트워크/503 오류를 공용 제한 재시도로 감싼다. 생성 단계 오류를 이용권 확인 오류로 오표시하지 않는다.
5. 신년운세 목표는 6분야 28,500~32,000자. 정상 응답을 분량만으로 버리지 않도록 전체 수용 하한 20,000자는 유지한다. 요청당 1분야, 호출당 52초, 최대 출력 12,000토큰과 기존 부분별 시도 제한을 유지한다. 실제 생성 분량·품질은 실 LLM 미호출로 미검증이다.
6. 기존 CI에서 타로 `여황제`를 `황제`까지 인식하는 접미어 오탐 발견. 카드 이름 경계를 적용했으며 78개 카드의 허용/잘못된 방향/미추첨 카드 거절을 검증했다. 해석 규칙 변경 없음.

이는 코드/mock으로 재현한 원인이다. 고객 사건이 위 원인인지 특정하는 로그 대조는 남았다.

## 유지하는 결제 정책

정본: `lib/payment/pass-policy.js`, `worker/lib/billing-feature-registry.js`, `worker/lib/pass-consumption.js`.

- 현재 Family: 구매 149,000원, 30일, 사용 한도 350,000원(`flower-20260930`).
- 종전 `flower-cost-20260921`/legacy 구매에 저장된 500,000원 한도는 해당 구매 버전대로 보존한다.
- 신년운세/연애 비책 각각 30,000원, 인생의 책 10,000원. 가격 변경 없음.
- 이용권/월정석/단건 결제 구조, 소유자·취소/환불에 따른 접근 회수, 완료 원본 재열람, 저장 스키마를 유지한다.
- 동일 requestId의 재시도/완료 결과 재열람에서 중복 차감·재생성하지 않는다. 다른 요청은 별도로 한도를 판정한다.

## 코드 설정 스냅샷 — 운영 실측값 아님

| 영역 | 현재 저장소 값/동작 | 운영에서 확인할 것 |
|---|---|---|
| 복구 스케줄 | `worker/wrangler.toml`: `*/10 * * * *`; `worker/index.js`에서 상담 복구 실행 | 실제 활성 Worker 버전의 schedules 및 최근 scheduled 실행 로그 |
| 공용 상담 복구 | `worker/lib/consultation-recovery-task.js`: 5분 idle, 최근 7일 문서, 4분 실행 예산, 다음 wave용 65초 여유 | 서비스별 대상 수/가장 오래된 대기 시간/복구 성공률 |
| 복구 처리량 | 18 adapter 순서를 회전, 서비스당 오래된 문서 1개, serial resume | 트래픽 대비 처리량 부족 여부. 브라우저가 없으면 여러 분야에 여러 cron 회차가 필요할 수 있음 |
| 대상 상태 | generating/partial/delivery_pending; 일부 pending. generation_failed는 자동 복구 대상 아님 | 예산 소진 실패는 원인별 지원 처리. 무한 재시도로 편입하지 않음 |
| Mongo 일반 풀/결제 풀 | maxPoolSize 10 / 6, minPoolSize 0, maxConnecting 2 | 실제 Atlas 연결 한도와 isolate 수, 연결 수 피크, 풀 checkout 지연 |
| DB 동시 작업 | 일반 24 / 결제 12, admission 대기 2,500ms 기본 | MONGO_OPERATION_ADMISSION_TIMEOUT 빈도 및 해당 경로 |
| DB 시간 제한 | serverSelection 3,000 / connect 5,000 / socket 7,000 / waitQueue 4,000ms | P50/P95/P99 쿼리·연결·대기 시간, 타임아웃 종류별 비율 |
| 관측 | wrangler observability enabled=true | 실제 버전의 활성 설정, 샘플링·보존 기간·로그 누락 |

저장소의 `EDGE_RESPONSE_DEADLINE_MS=100000`은 앱의 보수적 요청 예산이다. 모든 Cloudflare HTTP 요청에 공통인 100초 제한이라고 단정하지 않는다. Cloudflare 문서는 연결 유지 중 HTTP wall time에 고정 제한이 없고, 연결 종료 후 waitUntil 연장은 최대 30초, Cron wall time은 15분이라고 설명한다. CPU 제한은 별도이며 플랜·설정에 따라 확인해야 한다. [공식 Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [scheduled handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/).

Mongo 풀의 waitQueueTimeoutMS는 소켓 대기에 대한 한도다. 풀을 키우면 프로세스/서버별 전체 연결 수도 늘어나므로 Atlas 여유를 확인하기 전에 일괄 증설하지 않는다. [공식 Node driver 연결 풀 문서](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/).

## 다음 세션 실행 순서

1. `CLAUDE.md`를 읽고 `git status --short`, 최신 main 확인. 동시 작업이면 `scripts/create-safe-worktree.ps1` 사용. 이 문서와 관련 심볼만 읽는다.
2. 읽기 전용으로 운영 `/api/version`, `/version.json`, 실제 Worker 버전/route/binding/cron 목록을 대조한다. 이번 조사 중 앞서 조회한 운영 SHA는 `c4465b9ec3e9f58ffc1fae07ca5ee975b4cabbb4`였지만 이후 바뀔 수 있다. 현재 SHA로 간주하지 않는다.
3. 최근 24시간과 직전 7일의 비교 수치를 모은다: 서비스별 ensure-access/start/result 상태코드, DB_DEGRADED·admission/checkout/selection timeout, 제공사 429/5xx/timeout, 저장 실패, 생성 partial/완료 수, 복구 대상 최고 대기시간과 회차별 진행 수. 고객 주문/개인정보/원문/토큰을 로그 산출물에 넣지 않는다.
4. 가능하면 고객 주문번호·발생 시각을 보안 관리 화면에서 확인하고, 소유자 범위의 주문 → 구매 시점 이용권 버전/잔액 → 사용 증빙 → 상담 상태/저장 파트를 연결한다. 데이터가 없으면 추측을 고객 원인으로 확정하지 않는다.
5. Worker Cron 과거 실행, `[consultation-recovery]` outcome, CPU/wall time/예외 상태를 확인한다. HTTP `waitUntil`만으로 장문 생성 전체가 계속된다고 가정하지 않는다. `resumeConsultationOnServer`가 원본 요청과 저장 파트를 사용하고 동시 lease를 존중하는지 대조한다.
6. 인증/권한 비밀값은 출력하지 않고 존재·binding 대상만 확인한다. Worker와 프런트 버전 불일치, 필수 LLM 자격 증명 누락, CMS 모델/토큰 설정 override, model quota, Atlas region/plan/연결 수를 확인한다. 실 LLM·실결제 테스트로 진단하지 않는다.
7. 아래 원인별로 최소 수정안을 작성하고 mock 장애 주입 후 commit → main push → 정확한 SHA의 `CI required` 성공 확인. 운영 적용안에 설정 전후 diff, 예상 비용, 관측 지표, 되돌릴 버전을 적어 최종 승인받는다.

## 원인별 설정/구조 변경 후보

| 확인된 증거 | 우선 조치 | 보존/롤백 |
|---|---|---|
| cron 미등록·잘못된 Worker에 연결 | 승인 후 정본 schedule/binding 복원 | 기존 설정 스냅샷으로 복원 |
| 복구 backlog 증가, 제공사·DB 여유 있음 | 기존 lease/idempotency 기반 전용 queue/workflow에서 1부분씩 이어 처리하는 안을 우선 검토. 단순 cron 단축은 처리량·과금 영향 계산 후 결정 | 기존 cron은 잃어버린 작업 탐색용으로 유지, dispatch를 꺼도 저장 파트 보존 |
| DB checkout/admission 포화 | 중복 조회/불필요한 왕복 제거, 현재 결제 전용 풀 분리 확인. Atlas 연결 여유와 실측을 기준으로 한 항목씩 조정 | 요청 예산·pool 이전 값 복원, 재시도 폭증 금지 |
| 제공사 429/timeout | Retry-After·지터·전역 동시성 제한, 이미 생성된 부분 즉시 저장. 제공사 변경/추가 비용은 별도 결정 | 부분별 시도 한도 유지. 새 요청 생성으로 우회 금지 |
| DB 저장 실패 뒤 재생성 | 생성 원문 checkpoint를 먼저 재저장/재전달하고 LLM은 호출하지 않음 | 기존 결과·구매 증빙 보존 |
| 시도 한도 소진 또는 7일 초과 미완료 | 운영자 확인 목록과 명시적 복구/환불 절차로 연결. 정책·DB 작업은 승인 후 | 자동 소급 차감, 일괄 환불, 원문 삭제 금지 |

완료 기준: mock에서 네트워크 끊김/새로고침/중복 전송/DB 저장 실패/제공사 실패/브라우저 종료 후 서버 복구를 재현하고, 완료 원문·한 번의 차감·잔액 부족 거절·원본 재열람 무과금·취소 권한 회수를 확인한다. 운영 적용 후에는 실제 오류율과 대기열이 개선된 관측을 별도 보고한다. “절대 실패하지 않는다” 또는 “고객 복구 완료”는 실측 없이 보고하지 않는다.

## 재현 명령과 확인 범위

```powershell
npm run check:fast -- --plan
npm run verify:billing-pass-policy
npm run verify:paid-feature-billing-policy
npm run verify:worker-no-undef
npm run verify:ai-consultation-flows
node --test __tests__/ui/new-year-question-answer.behavior.test.js __tests__/ui/new-year-paid-delivery.behavior.test.js __tests__/ui/love-secret-paid-delivery.behavior.test.js __tests__/ui/life-book-paid-delivery.behavior.test.js __tests__/ui/yeongnyangi-tarot-spread-v3.test.mjs
$env:NODE_OPTIONS='--experimental-vm-modules'
node node_modules/jest/bin/jest.js --runInBand __tests__/worker/saju-consultation-pass-access.test.js __tests__/worker/astrology-paid-delivery.test.js __tests__/worker/nakshatra-paid-delivery.test.js __tests__/worker/vedic-paid-delivery.test.js __tests__/worker/karma-paid-delivery.test.js __tests__/worker/ziwei-island-paid-delivery.test.js __tests__/worker/new-year-length-repair.test.js __tests__/worker/consultation-recovery-task.test.js __tests__/worker/paid-llm-sequential.test.js
```

위 검사는 모두 로컬/mock이며 CI 및 운영 설정 검증을 대신하지 않는다. `check:fast -- --plan`은 위험 변경의 전체 CI 승격을 확인하는 용도이며 로컬 전체 preflight 반복을 뜻하지 않는다.
