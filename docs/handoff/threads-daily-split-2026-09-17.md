# Threads 오늘의 운세 유형별 분할 발행 — 인수인계 (2026-09-17)

## 현재 상태 (1단계 완료)

- 사주 08:30 · 자미두수 12:00 · 베다 16:00 (Asia/Seoul) 을 Threads 에 **각각 1건** 발행하는 Job 이 main 에 있다.
- 켜는 법: `SNS_THREADS_POST_ENABLED = "split"` (두 wrangler toml 에 이미 이 값). `"1"` = 기존 07:00 체인, `"0"` = 끔.
  - 🔴 별도 `SNS_THREADS_SPLIT_ENABLED` 를 만들지 않은 이유: 워커 텍스트 바인딩 예산 126/128(여유 2 유지, `scripts/lib/worker-binding-budget.mjs`)이 이미 꽉 차 있다. 새 `[vars]` 한 줄이면 릴리스 가드가 막는다.
  - 시각은 코드 기본값. `THREADS_SAJU_TIME` · `THREADS_ZIWEI_TIME` · `THREADS_VEDIC_TIME` · `THREADS_NUMEROLOGY_TIME` 은 덮어쓰기용 선택 변수(바인딩 예산을 먼저 확보할 것).
- 텔레그램 07:00 발행은 무변경.
- **운영 반영은 아직 안 됨.** 프로덕션 승격은 사용자의 명시적 1회 승인 때만. 승격하는 순간 07:00 Threads 체인이 멈추고 분할 발행이 시작된다.
- 스테이징은 `crons = []` + Threads 토큰 없음 → 발행 0.

## 구조

| 역할 | 파일 |
| --- | --- |
| Job 정의·발행 창·잠금·알림 | `worker/lib/threads-daily-jobs.js` |
| facts → 문장(검증·폴백) → formatter | `worker/lib/threads-daily-providers/{shared,saju,ziwei,vedic}.js` |
| 체인 skip 게이트 · 잠금(runChannel) | `worker/lib/sns-daily-post-task.js` (`getThreadsPostMode`, `getDailyChainThreadsSkipReason`) |
| 크론 호출 | `worker/index.js` `*/10` 분기 |
| 수동 실행·상태 | `worker/routes/admin-sns.js` `channel=threads-job&type=saju|ziwei|vedic` |
| 검증 | `npm run verify:threads-daily-jobs` (pr-ci 배선) |

- 잠금: `IdempotencyKey` endpoint `cron:sns-threads-daily`, key `YYYY-MM-DD:threads:<type>`. 성공이면 같은 날 재발행 없음, 실패+발행 0건만 다음 틱 재선점.
- 창: `[설정 시각, +60분)` 동안 10분 틱 최대 6회가 곧 재시도. 알림은 마지막 틱(+50분) 실패 때만 1통.

## 다음 세션

1. **2단계 — 수비학 Personal Day (저녁 20:30)**
   - `lib/numerology/` 에 공유 계산(PY = 생월+생일+당해연도 축약 → PM → PD, Universal Day). 마스터 넘버 정책은 기존 사이트 계산을 조사해 맞춘다(임의 결정 금지).
   - `/today?tab=number` 섹션: 회원은 프로필 자동, 비회원만 입력. 서버 계산.
   - `threads-daily-providers/numerology.js` 추가 → `DEFAULT_PROVIDERS` 등록 → Job 의 `THREADS_NUMEROLOGY_ENABLED` 게이트를 어떻게 켤지 결정(바인딩 예산 주의: 새 var 대신 코드 기본값 전환 검토).
   - 타로는 실제 사용자 선택 데이터가 없어 자동 발행하지 않는다.
2. **3단계 — 운영 승격**: 명시적 승인 1회 후. 승격 후 첫날 08:30·12:00·16:00 발행과 07:00 Threads skip(`threads_split_active`), 텔레그램 정상 발행을 관리자 status 로 확인.

## 범위 밖 결함 (보고만, 미수정)

- `daily-fortune-task.js` `getTodayPillars` 연주가 입춘을 무시.
- `numerology-tarot.mjs` `calculatePersonalDay` 가 UTC 기준(KST 00~09시 전날 값)이고 연도를 반영하지 않음.
- `today-vedic-detail.js` `YOGA_CAUTION` 에 0번(비슈캄바)이 빠져 있음 — 전통 흉 요가 목록과 불일치 가능.
- 오늘 베다 Rahu Kalam 이 고정 일출 가정.
- `nakshatra-expert-prose` 확장자 없는 import.
- 외부 Codex 브라우저 자동화(07:10 띠별 운세)와 아침 발행 시간대 중복 가능.
- 로컬 `verify:today-hub-gate` 가 main 에서도 21건 실패(이번 변경 전과 동일) — 로컬 환경 문제인지 미확인.
