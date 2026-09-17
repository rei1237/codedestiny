---
status: active
updated: 2026-09-17
next: 3단계 운영 승격 완료(2026-09-17 10:4x KST, 2430f228). 남은 일은 첫 온전한 날(09-18) 08:30·12:00·16:00·20:30 발행과 07:00 threads_split_active skip 을 관리자 status 로 확인하는 것뿐이다.
---

# Threads 오늘의 운세 유형별 분할 발행 — 인수인계 (2026-09-17)

## 3단계 — 운영 승격 (2026-09-17 완료)

- 사용자 명시 승인 1회로 `workflow_dispatch mode=production` 실행: run 35171647118 success. 프로덕션 Pages·Worker 모두 `2430f228e093` PASS(`verify-deployed-sha`).
- 승격 전 확인: main PR CI(12e62a0) success · `npm run verify:release` exit 0 · 스테이징 SHA PASS · 스테이징 `/today?tab=number` 실화면(모바일 390·데스크톱 1280, 비회원 폼 제출) 통과. 12e62a0→2430f228 사이 추가분은 문서 3개뿐.
- 함께 나간 것: 이전 프로덕션 77007dc4c1c9 이후 37커밋(결제 퓨전·자미 복구, 루트 Suspense 제거, 상세창 CTA 등). 마이그레이션 없음.
- **승격 당일(09-17)은 부분 운영**: 승격이 10:4x KST 라 07:00 체인은 기존 방식으로 이미 Threads 를 냈고, 08:30 사주 창은 닫혀 오늘 사주 분할 발행은 없다. 12:00 자미·16:00 베다·20:30 수비학부터 분할 발행.
- 롤백: Actions → Release → `mode=rollback`(Pages/Worker ID), Threads 만 되돌리려면 `SNS_THREADS_POST_ENABLED = "1"` 커밋 후 재승격(1회 승인 필요).
- 관리자 status 조회는 관리자 인증이 필요해 이번 세션에서 미실행 — **미검증**.

## 현재 상태 (1·2단계 완료)

- 사주 08:30 · 자미두수 12:00 · 베다 16:00 · **수비학 20:30** (Asia/Seoul) 을 Threads 에 **각각 1건** 발행하는 Job 이 main 에 있다.
- 켜는 법: `SNS_THREADS_POST_ENABLED = "split"` (두 wrangler toml 에 이미 이 값). `"1"` = 기존 07:00 체인, `"0"` = 끔.
  - 🔴 별도 `SNS_THREADS_SPLIT_ENABLED` 를 만들지 않은 이유: 워커 텍스트 바인딩 예산 126/128(여유 2 유지, `scripts/lib/worker-binding-budget.mjs`)이 이미 꽉 차 있다. 새 `[vars]` 한 줄이면 릴리스 가드가 막는다.
  - 시각은 코드 기본값. `THREADS_SAJU_TIME` · `THREADS_ZIWEI_TIME` · `THREADS_VEDIC_TIME` · `THREADS_NUMEROLOGY_TIME` 은 덮어쓰기용 선택 변수(바인딩 예산을 먼저 확보할 것).
- **수비학 게이트 결정**: 새 var 없이 코드 기본 켜짐(`defaultEnabled: true`, `isJobEnabled`). 급하게 수비학만 끄려면 `THREADS_NUMEROLOGY_ENABLED = "0"` 을 넣는다(그때 바인딩 1칸을 쓴다). 사주·자미·베다는 게이트 var 가 없다.
- 텔레그램 07:00 발행은 무변경.
- 운영 반영 완료(위 3단계). 07:00 Threads 체인은 멈췄고 분할 발행이 켜져 있다.
- 스테이징은 `crons = []` + Threads 토큰 없음 → 발행 0.

## 2단계 — 수비학 (완료 내용)

- 계산 정본 `lib/numerology/personal-day.mjs`: 평탄 누적합을 한 번 축약, 11/22/33 에서 멈춤. 연도수는 마스터 없이 축약. UD = reduce(UY + 월 + 일). 예: 2026-09-17 → UY 1 · UM 1 · UD 9, 2026-09-01 → UD 11(마스터).
- today 허브(`worker/routes/fortune-today.js` + `worker/lib/today-number-detail.js`): `systems.number` 카드. 생년 없으면 보편일수(공개 캐시), 있으면 개인일수(private). 음력 프로필은 양력 생월·생일로 환산.
  - `only=number` 는 **birth 가 있을 때만** 수비학 한 장으로 응답(private). birth 없는 only 는 무시 → 공개 캐시 키가 한 장짜리로 굳지 않는다.
- `/today?tab=number` (`app/today/TodayHubClient.tsx`): 4번째 탭 🔢. 프로필이 있으면 기존 허브 호출로 자동 개인일수, 없으면 탭 안 생년월일 입력 폼 → `only=number` 서버 계산. 입력은 텍스트+자동 하이픈(`maskBirthDateInput`, 달력 피커 금지 가드 준수), 저장하지 않는다. 폼 문구는 ko/en/ja/zh-CN/zh-TW 저작, 나머지 로케일은 영어.
- Threads provider `worker/lib/threads-daily-providers/numerology.js`: 공개 계정이라 **보편일수**만 쓴다(개인일수는 링크에서). 문장 검증은 facts 밖 숫자·개인일수/라이프 패스/타로/카드·마스터 아닌 날의 "마스터" 를 필드 단위로 버리고 결정론 문안으로 폴백. 수의 성격 문장은 허브 카드와 같은 `getNumberVoice`.
- 타로는 실제 사용자 선택 데이터가 없어 자동 발행하지 않는다(금지어).

## 구조

| 역할 | 파일 |
| --- | --- |
| Job 정의·발행 창·잠금·알림·게이트 | `worker/lib/threads-daily-jobs.js` (`isJobEnabled`, `DEFAULT_PROVIDERS`) |
| facts → 문장(검증·폴백) → formatter | `worker/lib/threads-daily-providers/{shared,saju,ziwei,vedic,numerology}.js` |
| 수비학 계산 정본 | `lib/numerology/personal-day.mjs` |
| 체인 skip 게이트 · 잠금(runChannel) | `worker/lib/sns-daily-post-task.js` (`getThreadsPostMode`, `getDailyChainThreadsSkipReason`) |
| 크론 호출 | `worker/index.js` `*/10` 분기 |
| 수동 실행·상태 | `worker/routes/admin-sns.js` `channel=threads-job&type=saju|ziwei|vedic|numerology` |
| 검증 | `npm run verify:threads-daily-jobs` (pr-ci 배선), `__tests__/worker/fortune-today-hub.route.test.js`, `__tests__/fortune/numerology-personal-day.test.js` |

- 잠금: `IdempotencyKey` endpoint `cron:sns-threads-daily`, key `YYYY-MM-DD:threads:<type>`. 성공이면 같은 날 재발행 없음, 실패+발행 0건만 다음 틱 재선점.
- 창: `[설정 시각, +60분)` 동안 10분 틱 최대 6회가 곧 재시도. 알림은 마지막 틱(+50분) 실패 때만 1통.

## 다음 세션

1. 09-17 12:00·16:00·20:30, 09-18 전 슬롯 발행과 07:00 Threads skip(`threads_split_active`), 텔레그램 정상 발행을 관리자 `GET /api/admin/sns-daily-post/status` 로 확인(관리자 인증 필요 — 사용자 또는 관리자 세션).
2. (완료) `/today?tab=number` 스테이징 실화면. 남은 사소한 점: 자리표시자 "YYYY-MM-DD" 대비 약 2.9:1, 보편일수≠개인일수인 생년월일로의 화면은 미확인.

## 범위 밖 결함 (보고만, 미수정)

- `worker/wrangler.toml` `SNS_THREADS_POST_ENABLED` 주석이 사주·자미·베다 3개만 적고 수비학 20:30 을 빠뜨림(동작 무관).

- `daily-fortune-task.js` `getTodayPillars` 연주가 입춘을 무시.
- `numerology-tarot.mjs` `calculatePersonalDay` 가 UTC 기준(KST 00~09시 전날 값)이고 연도를 반영하지 않음 — 새 정본(`lib/numerology/personal-day.mjs`)과 값이 다를 수 있다.
- `today-vedic-detail.js` `YOGA_CAUTION` 에 0번(비슈캄바)이 빠져 있음 — 전통 흉 요가 목록과 불일치 가능.
- 오늘 베다 Rahu Kalam 이 고정 일출 가정.
- `nakshatra-expert-prose` 확장자 없는 import.
- 외부 Codex 브라우저 자동화(07:10 띠별 운세)와 아침 발행 시간대 중복 가능.
- 로컬 `verify:today-hub-gate` 가 main 에서도 21건 실패(이번 변경 전과 동일) — 로컬 환경 문제인지 미확인.
- `config/sitemap-lastmod.json` 의 `/neo-operation-room/` 원장이 이전 커밋 뒤 갱신되지 않은 채 main 에 있었다 — 이번 사이트맵 재생성에 함께 실렸다(원인 커밋 미조사).
