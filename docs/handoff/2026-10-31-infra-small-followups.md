---
status: active
updated: 2026-10-31
next: "A1(alertError → tickFailed)부터. 각 항목은 독립이며 하나씩 작업 트리·커밋으로 처리"
---

# 인프라 최적화 브랜치의 작은 후속 묶음

색인: [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md) (3순위)
출처: SDD 진행 원장(`.superpowers/sdd/2026-10-31-infra-db-optimization/progress.md`, git 무시라 이 문서로 옮겼다)의 "minor (deferred)"와 최종 리뷰 Minor, fix wave 재리뷰의 신규 Minor, Task 11·12 문서의 발견이다.

공통 규칙:
- 줄 번호는 배포 트리 `794eca3de` 기준이다. 밀렸으면 따옴표 안의 문자열로 찾는다.
- 분류 열의 RED는 착수 전에 위험·검증·롤백을 보고하고 승인을 받는다.
- 이 문서의 어떤 항목도 운영 DB 쓰기, 인덱스 생성, 실결제를 요구하지 않는다. 그런 단계가 필요하면 색인 문서의 승인 항목으로 올린다.

## A. 알림·크론

| # | 분류 | 내용 | 위치 | 고치는 법 |
|---|---|---|---|---|
| A1 | RED(결제 파일) | 결제 이상 알림(`alertPaymentAnomalies`)이 실패해도 로그로만 끝나고, 10분 크론 실패 알림(T5 `tickFailed`)에 닿지 않는다. 표식이 없어 다음 틱이 다시 알리므로 알림이 사라지지는 않는다 | `worker/payments/index.js:2284-2291` | `runPaymentsV2Reconcile` 반환값에 `alertError`를 싣고 `worker/index.js` 크론 분기에서 `tickFailed`로 넘긴다. 결제 동결 파일 diff를 0으로 유지하려고 미뤘다. 고칠 때 `config/payment-freeze.json` 대상이 아님을 확인한다 |
| A2 | 공유 동작 | 8분 마감(`TICK_ALERT_DEADLINE_MS`) 뒤에 실패한 태스크는 "timeout"으로만 알리고, 실제 실패 사유는 로그에만 남는다 | `worker/index.js:2154-2161` | 마감 뒤 실패는 다음 틱 알림에 실을지, 로그로 충분한지 정한다. 시간당 1회 억제 키(`cron10-failure-alert`)를 그대로 쓴다 |
| A3 | 공유 동작 | 6B 초융합 알림이 이미 환불된 건(`PURCHASE_REFUNDED`·환불 시각 있음)도 고른다. 운영자 소음이다 | `worker/lib/delivery-review-alert.js:41-61` `key: 'fusion'` | find 조건에 환불 완료 제외를 더한다. 조회 모양이 바뀌면 `verify:mongo-query-index-shapes` allowlist 근거를 갱신한다 |
| A4 | 공유 동작 | 6B 코덱스 알림도 환불이 끝난 세션을 제외하지 않는다 | 같은 파일 `:102-111` `key: 'codex'` | A3와 같다 |
| A5 | GREEN(문구) | 6B 본문 머리 "환불·복원은 자동으로 하지 않았습니다"가 카드 초융합에는 틀리다. 카드 초융합은 24시간 뒤 자동환불될 수 있다 | `delivery-review-alert.js` `buildMessage` | 종류별 문구로 나눈다 |
| A6 | 성능 | 6A 섹션 C 조회에 projection이 없다. 서사형 `metadata.paidNarrative.parts`까지 최대 20건을 통째로 읽는다 | `worker/payments/reconcile.js` 섹션 C `find` | 알림에 쓰는 필드만 `select`한다 |
| A7 | 공유 동작 | destiny-compass 전역 카운터(`GLOBAL_DAILY_MAX = 300`)가 본문 검증·`NO_BASE_TEXT` 검사 전에 센다. 한 IP(30/분)가 약 10분에 300을 소진하면, 그날 다른 사용자는 결정론 템플릿 폴백을 본다. 화면은 유지된다 | `worker/routes/destiny-compass.js:20-21,99` | LLM 호출에 도달하는 요청만 센다. 전역 429의 `Retry-After 60`이 일 창과 맞지 않는 것(원장 172)도 함께 정리한다 |
| A8 | 기록만 | 10분 크론 실패 알림(T5)은 전달에 실패하면 DB claim은 지운다(`releaseClaims`). 하지만 isolate-local 억제 버킷(`localBuckets`)은 풀지 않는다. DB 장애 중 소음 상한을 지키려는 의도된 동작이고, 그 isolate에서는 그 시간 동안 같은 태스크 알림이 묵음이 된다 | `worker/lib/cron-tick-failure-alert.js:95-104` | 바꾸지 않는다. 바꾼다면 DB를 못 쓰는 상황의 중복 발송 상한을 함께 다시 정한다 |

## B. 도구·마이그레이션 스크립트

| # | 분류 | 내용 | 위치 | 고치는 법 |
|---|---|---|---|---|
| B1 | 도구 | `HOST_PORT` 정규식이 역슬래시를 잃었다(`.`→`\.`, `d`→`\d`). 호스트 마스킹은 유지되지만, 일부 비호스트 `id` 값이 잘못 가려진다 | `scripts/lib/atlas-readonly-client.mjs:149` | `/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(:\d{1,5})?$/`로 고치고 테스트 1건을 추가한다 |
| B2 | 도구 | Atlas 감사 도구의 남은 문제: invoice 상세가 실패하면 표가 빈 채로 남는다. 모든 섹션이 실패해도 exit 0이라 자동화가 성공으로 오인한다(우선). 429 백오프가 없다. `dailyGb`가 null 1개면 그날 전체가 빠진다. 콘솔 표에 snapshotPolicy·restoreWindowDays가 없다. accessList comment를 마스킹하지 않는다. Digest 파서가 algorithm·stale을 무시한다 | `scripts/audit-atlas-readonly.mjs`, `scripts/lib/atlas-readonly-client.mjs` | exit 코드부터 고친다. 나머지는 다음에 손볼 때 처리한다 |
| B3 | 도구 | `summary.json` redaction이 hostname·groupId·orgId를 가리지 않는다. fix wave에서 일부 확장했으니 현재 상태를 확인한다. 파일은 저장소 밖이지만, 문서에 붙이면 공개 저장소로 샌다 | 같은 파일 `redactAtlasSnapshot` | 문서에 붙이지 않는다는 규칙을 README나 도구 출력 머리에 적는다 |
| B4 | RED(인덱스) | drift 점검: TTL 값만 다르고 키가 같은 실물 인덱스는 create로 판정되지만, `createIndex` 옵션 충돌이 난다. `collMod`로 갈지 drop+create로 갈지 결정이 필요하다. 지금 메인 흐름은 sameKey 필터 때문에 이 분기에 닿지 않는다 | `scripts/migrations/20260906-reconcile-index-drift.mjs` | 결정을 문서로 남긴다. 운영 실행은 색인 문서의 승인 항목 1이다 |

## C. 스테이징 확인 (스테이징 배포가 된 뒤)

스테이징 릴리스는 2026-10-31 기준 다른 세션 커밋 때문에 막혀 있다(색인 문서 참고). 배포가 되면 아래를 확인하고 [DEPLOYMENT-REPORT.md](../infrastructure/DEPLOYMENT-REPORT.md) "Task 13 스테이징 확인 항목"을 채운다.

| # | 확인 | 근거 |
|---|---|---|
| C1 | 로그인, 보관함 열람, `/api/health`, 지연차감 상품 취소 → 같은 requestId 재시도에서 결제창이 뜨지 않음(Task 3) | DEPLOYMENT-REPORT §Task 13 |
| C2 | 이용권 영구 해금 경로(Task 7)의 커밋 왕복 +1이 지연에 주는 영향. 카운팅 어댑터·ops 단언에 보이지 않는다 | 원장 144 |
| C3 | 실제 레플리카셋에서 트랜잭션 안의 `grantEntitlement` E11000 → `findOne`이 NoSuchTransaction을 내는지, `withTransaction` 재시도로 풀리는지. 동시 요청 2건으로 본다 | 원장 146 |
| C4 | ops-hq XP `$group` 결과가 이전 루프 결과와 같은지 스테이징 원장으로 대조한다 | Task 8 |
| C5 | 운영자 알림 실발송 1회. 10분 크론 실패 알림, 6A, 6B 중 하나를 스테이징 채널로 받아 본다. 본문에 userId·이메일이 없는지 확인한다 | Task 5·6 |
| C6 | 스테이징 `WORKER_ROUTE_METRICS_TOKEN` 미설정이라 `/api/health/route-metrics`가 닫혀 있다(W-6). 사용자 조치 뒤 `measure:post-deploy-latency`로 확인한다 | 색인 문서 사용자 조치 |

## D. 테스트·코드 위생 (런타임 영향 없음)

- T3: `__*TestUtils` export 3줄이 범위 밖에 추가됐다. (d) 단언이 null과 ok:false를 구분하지 않는다. love-secret paymentId 분기 fixture가 없다.
- T4: `llm-client.ts:1305`의 `|| ""` 중복 검사. (d) 정적 단언의 한계.
- T5: `notifyOperatorsLazily`가 `ops-alert.js`의 사본이다. `notify: undefined`·`deps.now` 잔재가 있다. `scheduled()` 결선과 `tickFailed` 이름↔로그 태그 대응을 자동으로 검사하지 않는다.
- T6: 제목 건수가 조회 총수다(잘림은 "(외 N건)"으로 보충). 6A 테스트가 `reconcile.test`가 아니라 `fulfillment-alert.test`에 있다.
- T7: 재생 분기 증빙 upsert가 DB 쓰기 장애 때 재열람을 오류로 바꾼다. 레거시 잔재 `monthlySpendUsed` 이중 가산은 기존 동작이고 감사 메타에만 영향이 있다.
- T8:
  - `access.route.test.js:205-214`는 쿼리 상태 필터상 실제로 나올 수 없는 모양을 테스트한다(방어 분기 주석 필요).
  - `achievements.js:61` `LEDGER_TIMELINE_KEYS`와 `:49` 레벨 업적 목록이 이중으로 정의돼 있다.
  - `xp.js` `$sum`은 숫자 문자열 delta를 0으로 본다. 원장은 항상 숫자라 영향이 없다.
- T10:
  - IP 한도로 막힌 요청이 이메일 버킷을 소모하지 않음을 고정하는 단언이 없다.
  - IP 헤더가 없으면 "unknown" 공유 버킷을 쓴다(운영은 항상 cf-connecting-ip).

## E. 문서 정밀도 (GREEN)

이 세션이 2026-11-01 00:40 KST tail 종료 뒤 문서 커밋에서 처리할 예정이다. `git log --oneline -- docs/infrastructure`에서 "최종 tail"이 들어간 커밋이 있으면 처리된 것이니 이 절을 지운다.

- `docs/infrastructure/MONGODB-OPTIMIZATION.md:88-90`: 파생 uptime을 136,450초에서 실측 136,480초로 고친다(결론 불변).
- 같은 파일 `:127`: COLLSCAN 54건 중 49건이 원장 밖 컬렉션이므로 "규모 미확인"을 붙인다.
- `COST-OPTIMIZATION.md`: 표에 "항목" 열을 추가하고 머리글을 계약 열 이름에 맞춘다. `:118` "12,942로 7일 중 가장 적다"에 "10-31 부분일 제외"를 붙인다.
- `SERVER-PERFORMANCE.md`: T-1 제목을 "선별 경로"로 바꾼다. T-KIND와 DB 사용 요청 비율의 재현 방법을 한 줄 적는다(DO 50% 규칙의 입력).
- `INFRASTRUCTURE-AUDIT.md:223`: "카드 초융합" 깨진 문구를 고친다.
- `docs/context/ai-and-db.md:20`, `docs/DEBUGGING_GUIDE.md:54`: "M30 이상 제한 없음"에 "MongoDB 9.0 미만" 단서를 붙인다(9.0+ M30은 24/초, 운영은 8.0.34).
- `docs/context/ai-and-db.md:74-79`: Cloudflare anycast IP와 `*.workers.dev` 서브도메인(계정 식별자)을 일반화한다. 공개 저장소이며, 2026-08-21 `53a26039ef`부터 있던 줄이다.
- tail 중간 수치: `INFRASTRUCTURE-AUDIT.md:18,39,60`, `SERVER-PERFORMANCE.md:15,61,148,172,200,230,246`, `docs/context/ai-and-db.md:38`의 "중간 판정(피크 미포함)" 값을 최종 수치로 바꾼다. 방법은 색인 문서 "이 세션이 못 끝낸 것"에 있다.

## F. DR 후속

근거: [DISASTER-RECOVERY.md](../infrastructure/DISASTER-RECOVERY.md).

| # | 분류 | 내용 |
|---|---|---|
| F1 | 확인 | 스테이징이 `MONGO_DB_NAME`/`MONGO_NAME` 재정의로 운영과 다른 DB를 쓰는지 아직 확인하지 못했다. 이름만 확인한다(`wrangler secret list`, `[vars]`) |
| F2 | 도구 | EJSON 덤프를 복원하는 저장소 도구가 없다. `mongorestore` 대체 스크립트가 필요한지 정한다 |
| F3 | 알림 | `[db-connect-error]` 급증 알림이 없다. 지금은 런북 1(로그 검색)뿐이다 |
| F4 | 확인 | 이전 Worker 버전으로 롤백할 때 secret이 어떻게 동작하는지 미확인이다 |
| F5 | 절차 | 운영 롤백은 CI `mode=rollback` 또는 break-glass뿐이다. 런북 4에 이미 있고, 연습한 적이 없다 |
| F6 | RED(라우팅) | 스테이징 Pages의 `API_WORKER_ORIGIN` 기본값이 운영 Worker로 향한다(`public/_worker.js:347`). 스테이징 화면이 운영 API를 칠 수 있다 |
| F7 | 사용자 결정 | DR 리허설 덤프(`D:\Development\code-destiny-backups\mongodb\`, 약 83MB, 개인정보 포함)의 보관 기간. 열지 않는다 |
| F8 | 승인 | Atlas 스냅샷 복원 시험(임시 클러스터 약 $0.096/시간), 로컬 mongod 복원 RTO 실측(이 세션에서는 권한 분류기가 mongod 실행을 거부했다) |

## G. 보안 잔여

전체 표와 위험도는 [SECURITY-AUDIT.md](../infrastructure/SECURITY-AUDIT.md) "Task 10 잔여 위험"·"잔여 위험 (10F)"에 있다. 다음 세션이 먼저 볼 것:

- HIGH:
  - Atlas 접근 목록 0.0.0.0/0. 사용자 결정으로 유지하고 보완 통제를 쓴다.
  - 앱 DB 사용자가 `atlasAdmin`이다. 런북 2는 사용자가 Atlas UI에서 실행한다.
  - 스테이징·운영이 DB 자격을 공유할 수 있다(F1과 같이 확인).
  - Capacitor 8.4.3(N-01, Android 재출시 필요).
- MED:
  - Gemini 키 교체(노출 이력).
  - next 권고(N-02).
  - 관리자 MFA·개별 폐기 없음(M2, `worker/routes/admin.js:2730`).
  - 탈퇴자 토큰 30분 유효(R-01).
- LOW:
  - 구독 해지 링크 서명 토큰, 더블 옵트인(제품 결정).
  - 남이 같은 이메일로 하루 3회 제출하면 주인이 그날 구독할 수 없다.
  - fortune-chat 세션에 TTL이 없다(`worker/lib/models.js:1813-1827`).
  - 가입 레이트리밋.
