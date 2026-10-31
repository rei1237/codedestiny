# 재해 복구: 백업 정책·RPO/RTO·복원 리허설·런북 (2026-10-31)

- **측정 시각:**
  - 백업 정책: 2026-10-31T07:59:58Z(16:59 KST), Atlas 읽기 전용 스냅샷(ATL)
  - 전량 덤프: 2026-10-31T08:10:15Z~08:10:31Z(17:10 KST)
  - 오프라인 검증: 2026-10-31T08:11:14Z(DR)
- **출처:** [INFRASTRUCTURE-AUDIT 출처 목록](INFRASTRUCTURE-AUDIT.md#출처-목록)의 ATL·INV·DR·LEDGER와 코드 줄 번호. 덤프 안의 컬렉션 파일은 개인정보가 있어 열지 않았다. 건수는 덤프 manifest와 검증 결과 JSON에서만 읽었다.
- **기준 커밋:** origin/main `f4c5458a0`. 작성 시점 브랜치 HEAD는 `35be53295`다. **운영 미배포.**
- **함께 보는 문서:**
  - 등급 판정(PITR 때문에 M10 유지): [COST-OPTIMIZATION](COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex)
  - 연결 한도·거부: [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결)
  - DB 자격 교체·권한·경보 런북: [SECURITY-AUDIT](SECURITY-AUDIT.md#보완-통제-런북-10e)
  - 변경별 롤백: [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md#변경-목록)

## 결론

- **RPO:** 최근 7일 안의 사고는 Atlas PITR로 사고 직전 시점까지 되돌릴 수 있다. PITR 복원 정밀도는 미측정이다. 7일이 지난 시점은 스냅샷 간격(주간 최대 7일, 월간 최대 약 1개월)이 RPO가 된다.
- **RTO:** 미측정이다. 실제 복원(Atlas 복원, 로컬 mongod 적재)을 한 번도 돌리지 않았기 때문이다.
  - 측정된 것은 덤프 생성 약 15.9초와 오프라인 무결성 검증 2,861ms뿐이다.
  - Atlas 스냅샷 복원 시험은 임시 클러스터 비용 때문에 [승인 항목](#승인-필요)이다.
- **오프라인 리허설:** 운영 전량 덤프(99개 컬렉션, 33,225건)를 DB 연결 없이 검증했다. sha256 불일치 0, 건수 불일치 0, `_id` 중복 0, unique 재구축 모의 중복 0이었다.
- **확인된 공백:**
  - 리포에 복원 도구가 없다. `npm run backup:mongo`는 EJSON으로 덤프하는데(`scripts/backup-mongo.mjs` 머리 주석), 이를 되돌려 넣는 스크립트는 리포에 없다.
  - DB 연결 오류 전용 앱 알림을 코드에서 찾지 못했다. 감지는 Atlas 경보와 사람의 tail 확인에 기대고 있다.

## 백업 정책 (실측)

출처: ATL.

| 항목 | 값 |
|---|---|
| 클러스터 등급 / MongoDB 버전 | M10 / 8.0.34 |
| 백업 | 켜짐(`backupEnabled`) |
| PITR | 켜짐(`pitEnabled`), 복원 창 7일(`restoreWindowDays`) |
| 스냅샷 수 | 33개 |

| 스냅샷 주기 | 보존 |
|---|---|
| 6시간마다 | 7일 |
| 매일 | 7일 |
| 매주(토요일) | 4주 |
| 매월(말일) | 12개월 |
| 매년(12월) | 1년 |

백업 저장 비용은 [COST-OPTIMIZATION](COST-OPTIMIZATION.md)의 PIT_RESTORE_STORAGE 행에 있다. 10월 청구액은 $4.93이다(INV).

## RPO

| 사고 시점 | 복원 수단 | RPO | 근거 |
|---|---|---|---|
| 지금부터 7일 안 | Atlas PITR | 사고 직전 시점. 실제 복원 정밀도는 미측정 | PITR 켜짐, 복원 창 7일 |
| 7일 안, PITR을 못 쓸 때 | 6시간 스냅샷 | 최대 6시간 | 6시간 주기, 7일 보존 |
| 7일~4주 전 | 주간 스냅샷 | 최대 7일 | 주간, 4주 보존 |
| 4주~12개월 전 | 월간 스냅샷 | 최대 약 1개월 | 월간, 12개월 보존 |
| Atlas 프로젝트 자체를 못 쓸 때 | 로컬 EJSON 덤프 | 마지막 수동 덤프 시점까지. 현재는 2026-10-31 17:10 KST 1회이고 정기 일정이 없다 | DR |

- Flex로 내리면 PITR이 없어 RPO가 24시간이 된다. 그래서 M10을 유지했다([COST-OPTIMIZATION](COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex)).

## RTO

RTO는 감지 → 판단 → 복원 → 앱 전환 → 확인을 합한 시간이다. 계획은 복원 시험의 실측 시간을 RTO로 쓰기로 했는데, 복원을 실행하지 못해 **RTO는 미측정**이다.

| 단계 | 실측 | 출처 / 측정 방법 |
|---|---|---|
| 감지 | 미측정 | DB 연결 오류 전용 앱 알림이 없다. Atlas 경보 권장안은 [SECURITY-AUDIT 런북 3](SECURITY-AUDIT.md#런북-3-atlas-경보-권장-목록) |
| 덤프 생성(로컬 PC ← Atlas 서울 프라이머리) | 약 15.9초 | DR: `startedAt` 08:10:15.137Z → `finishedAt` 08:10:31.028Z. 원장(LEDGER)에는 16.9초로 적혀 있어 1초 차이가 난다. 이 문서는 JSON 시각을 따른다 |
| 무결성 검증(오프라인) | 2,861ms | DR `verify.elapsedMs` |
| **실제 mongorestore 복원 소요(RTO의 복원 단계)** | **미측정** | 아래 [측정 방법](#복원-단계-측정-방법) |
| Atlas PITR·스냅샷 복원 소요 | 미측정 | [승인 필요](#승인-필요) 1번 |
| 앱 전환(복원된 DB로 URI 교체) | 미측정 | `wrangler secret put MONGO_URI`. Worker가 요청마다 새 MongoClient를 만들어 다음 요청부터 바뀐다(Q1). 교체 절차는 [SECURITY-AUDIT 런북 1](SECURITY-AUDIT.md#런북-1-db-비밀번호-교체) |

### 복원 단계 측정 방법

1. 외부 실행 파일 실행 승인을 받거나 사용자가 직접 실행한다.
   - 운영과 같은 버전인 MongoDB 8.0.34 휴대용 zip은 공식 배포처에서 받아 `D:\Development\Temp\mongodb-portable-dl`에 있다. sha256이 일치했다(LEDGER).
   - 이번에는 실행이 권한 분류기에서 거부됐다.
2. 임시 dbpath로 mongod를 루프백(localhost)에만 바인딩해 띄운다.
3. 덤프를 넣는다.
   - 덤프는 mongodump BSON이 아니라 EJSON이라 `mongorestore`로 바로 넣을 수 없다.
   - 세션 스크래치 스크립트 `restore-verify-local.mjs`(리포 밖)를 준비해 뒀다. 대상은 루프백(localhost)으로 고정했고 env 파일을 읽지 않는다. 컬렉션별 EJSON을 `insertMany`로 넣고 인덱스를 만든다.
4. 건수를 대조한다. 대상은 `payments`·`pointhistories`·`paid_execution_records`·`content_entitlements`·`monthly_credit_ledger`이고, 기준은 덤프 manifest(아래 표)다.
   - 계획 문구의 `monthly_credit_ledgers`는 실제 컬렉션 이름 `monthly_credit_ledger`와 다르다.
5. 적재 시작부터 인덱스 생성 끝까지의 시간을 RTO 복원 단계로 기록한다.
6. mongod를 끄고 임시 dbpath와 압축 해제본을 지운다.

## 오프라인 복원 리허설 (실측)

DB 연결 없이 덤프 파일만으로 검증했다. 운영 영향은 0이다. 덤프 자체는 읽기 전용(DB 쓰기 0)이다.

| 항목 | 결과 |
|---|---|
| 덤프 | `npm run backup:mongo`, 컬렉션 99개, 문서 33,225건, 83MB(LEDGER). **개인정보 포함**, 리포 밖 로컬 디스크 |
| sha256 불일치 | 0 |
| EJSON 파싱 후 건수 불일치 | 0 |
| `_id` 중복 | 0 |
| unique 인덱스 재구축 모의 | 부분 인덱스가 아닌 unique 64개, 중복 키 0. 부분 unique 6개는 모의에서 제외 |
| 문제 목록 | 0건 |

핵심 컬렉션 건수(덤프 manifest):

| 컬렉션 | 건수 |
|---|---|
| `payments` | 582 |
| `pointhistories` | 19,754 |
| `paid_execution_records` | 44 |
| `content_entitlements` | 1,493 |
| `monthly_credit_ledger` | 1,122 |
| `payment_webhook_events` | 660 |
| `serviceexecutiontransactions` | 17 |
| `users` | 932 |
| `idempotency_keys` | 69 |

이 리허설이 증명하는 것과 아닌 것:

- 증명: 덤프가 완전하고 손상되지 않았다. 적재하면 unique 제약(비부분 64개)에 걸리지 않는다.
- 증명하지 못함: 실제 적재 시간, 부분 unique 6개, TTL 동작, 복원 DB로 앱이 정상 동작하는지.

## 런북

### 런북 1. `[db-connect-error]` 급증

신호:

- Worker 로그의 `[db-connect-error]` 줄(`worker/lib/db.js:1061`, `:1069`)
- 사용자 쪽 503·지연
- 보안 가드가 enforce 모드면 DB 실패 시 503 `RATE_LIMIT_UNAVAILABLE`([SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#3-security_db_timeout_ms--1000))

| 순서 | 확인 | 판단 |
|---|---|---|
| 1 | 운영 tail 10분을 저장해 `npm run report:worker-tail-latency -- <파일>`로 counters를 본다(`db-connect-error`, `db-op-timeout`, `db-op-admission`). 레인(shared/payment)과 라우트 분포도 본다 | 평시 기준은 전부 0이다(T-INT 창) |
| 2 | 오류 메시지를 분류한다 | 인증 실패 → 3번. DNS·TLS·시간 초과 → 4번. 연결 거부 → 5번 |
| 3 | 직전에 DB 자격·시크릿을 바꿨는지 본다 | 바꿨다면 [SECURITY-AUDIT 런북 1](SECURITY-AUDIT.md#런북-1-db-비밀번호-교체)의 롤백 |
| 4 | Atlas UI에서 클러스터 상태를 본다(유지보수, 프라이머리 선출, 장애 표시). 접근 목록이 `0.0.0.0/0` 그대로인지도 본다 | Atlas 쪽 사건이면 상태 페이지·지원. 접근 목록이 바뀌었으면 원복 |
| 5 | 연결 수와 거부를 본다. 노드 한도는 1,500(MDB)이다. serverStatus `connections.rejected`가 늘었는지 읽기 전용으로 확인한다. M10은 새 연결 생성이 노드당 15/초로 제한된다([MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결)) | 트래픽 급증 출처를 찾는다. 크론 직후 분(분 ≡ 1 mod 10)에 몰리는지 본다([SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#꼬리-지연-위험)) |
| 6 | 오류 시작 시각을 최근 배포 시각과 대조한다 | 배포 뒤 시작이면 [런북 4](#런북-4-배포-롤백) |
| 7 | 데이터 손상이 의심되면 [RPO](#rpo) 표에 따라 PITR을 검토한다 | 운영 DB 쓰기이므로 사용자 명시 승인 뒤에만 한다 |
| 8 | 복구를 확인한다: [SECURITY-AUDIT 연결 유지 확인](SECURITY-AUDIT.md#기존-서비스-연결-유지-확인) C2~C5 | 오류 창 안의 유료 주문은 [런북 3](#런북-3-결제-미전달) |

### 런북 2. Gemini 장애 (provider-outage 알림 이후)

동작(`worker/lib/provider-outage-alert.js`):

- 요청 경로가 장애를 기록하고 알림을 한 번 보낸다. 코드는 `GEMINI_SPEND_CAP`(월 지출 한도 도달)과 `GEMINI_BILLING_DISABLED`(결제 계정 비활성)다.
- 10분 크론이 못 보낸 알림을 다시 보낸다. 같은 장애는 최대 시간당 1회 다시 알린다.
- 같은 오류가 20분간 없으면 "[복구 추정]" 알림을 보낸다.
- 생성을 재시도하지 않고, 주문을 붙잡지 않고, 환불 시점을 바꾸지 않는다.
- 알림 문구: 영냥이 결제 주문은 생성 실패 후 약 20분 뒤 자동 환불된다.

| 순서 | 할 일 | 확인 |
|---|---|---|
| 1 | 알림의 원인 코드를 본다 | — |
| 2 | `GEMINI_SPEND_CAP`이면 Google AI Studio·Cloud Billing에서 월 지출 한도를 올린다. `GEMINI_BILLING_DISABLED`이면 결제 계정 상태를 고친다 | — |
| 3 | 운영 tail에서 Gemini 오류 코드가 더 나오지 않는지 본다 | 20분 무오류 뒤 "[복구 추정]" 알림 |
| 4 | 장애 창(감지 시각 ~ 복구 추정 시각)에 실패한 유료 주문을 모은다 | 영냥이는 자동 환불 대상이다. 다른 상품은 [런북 3](#런북-3-결제-미전달)으로 하나씩 본다 |
| 5 | 키 노출이 원인 후보면 [SECURITY-AUDIT 잔여 위험](SECURITY-AUDIT.md#잔여-위험-10f)의 Gemini 키 교체 순서를 따른다 | — |

### 런북 3. 결제 미전달

신호:

- `refund_failed` 알림(R1, `worker/payments/fulfillment-alert.js`)
- 전달 검토 대기 알림(R2, `worker/lib/delivery-review-alert.js`)
- 고객 문의
- 런북 1·2의 장애 창

| 순서 | 할 일 | 비고 |
|---|---|---|
| 1 | 읽기 전용 추적: `node scripts/audit-paid-order-delivery.mjs --db code_destiny --order <주문 ID>` | PortOne → payment → 결과 → 보관함을 따라간다. DB 쓰기 0, LLM 0. 외부 호출은 해당 주문의 PortOne GET만 허용한다 |
| 2 | 상담형 상품이면 `node scripts/audit-paid-consultation-delivery.mjs --db code_destiny`도 본다 | 읽기 전용. 저장된 결과가 있어도 주인이 열어 봤다는 증거는 아니다 |
| 3 | 상품별 복구 스크립트를 **dry-run으로 먼저** 돌린다(아래 표) | 전부 기본이 읽기 전용이다 |
| 4 | dry-run 결과를 검토하고 사용자 승인을 받은 뒤 실행 플래그로 다시 돌린다 | 운영 DB 쓰기다. LLM 재호출이 생기는 옵션은 따로 승인받는다 |
| 5 | 1번 추적을 다시 돌려 전달을 확인한다 | — |
| 6 | 환불 여부를 개별로 판단한다 | 비카드 미전달 자동 복원은 채택하지 않았다(승인 5) |

| 상품 | 스크립트 | 실행 방법 | 주의 |
|---|---|---|---|
| 초융합 운세 주문 | `scripts/recover-fusion-fortune-order.mjs --db <DB> --order <ID>` | `--execute`에 `--plan-sha`·`--expected-owner`·`--reason`·`--operator`가 모두 필요하다. LLM 호출 상한은 `--max-provider-calls` | 공급자 호출 수를 승인한다 |
| 마스터 인연의 서 | `npm run recover:master-love-codex` | 기본 `--dry-run`, 쓰기는 `--apply` | `--reset-attempts`는 LLM을 추가로 부른다. `--metadata-only`는 LLM 재호출 0 |
| 유료 상담 | `scripts/recover-paid-consultation.mjs --db <DB> --order <ID>` | `--apply --generate`를 함께 준다. 하나만 주면 거부된다(작업을 세우면 크론이 깨어나기 때문) | 주문 1건에 작업 1건 |
| 관계 리포트 | `scripts/recover-relationship-report.mjs --db <DB> --session <ID>` | `--execute --plan-sha <dry-run 해시>` | HTTP 금지. 검토된 월정석 사건만 다룬다 |
| 영냥이 | `scripts/recover-yeongnyangi-request.mjs --db <DB> --request <ID>` | `--execute --plan-sha <해시> --reason <사건 참조> --operator <운영자 코드>`(개인 이름 금지) | 옛 플래그(`--apply` 등)는 막혀 있다. 기존 큐·크론에 맡길 뿐 PG나 다른 LLM 경로를 쓰지 않는다 |

- `<DB>`는 `code_destiny` 또는 `code_destiny_staging`만 받는다.
- 스크립트는 로컬 `.env.local`의 URI를 쓴다. [SECURITY-AUDIT 런북 2](SECURITY-AUDIT.md#런북-2-앱-사용자-최소-권한) 뒤에는 운영자 도구 사용자 URI가 있어야 한다.

### 런북 4. 배포 롤백

- 운영 롤백은 GitHub Actions에서만 한다.
  - `Release Cloudflare Pages and Worker` 워크플로를 Run workflow로 돌린다. `mode=rollback`에 `pages_deployment_id`·`worker_version_id`를 넣는다.
  - 로컬에서 운영을 바꾸는 명령은 `scripts/lib/production-deploy-guard.mjs`가 막는다.
- 대상 확인은 로컬에서 할 수 있다: `npm run deploy:rollback -- --list`(운영을 바꾸지 않는다).
- 실행 형식: `npm run deploy:rollback -- --yes [--to=<pagesDeploymentId>] [--worker-version=<id>]`.
  - CI 안에서만 실행된다.
  - 인자가 없으면 마지막 운영 배포가 기록한 직전 버전으로 돌아간다.
- 비상 탈출구: GitHub Actions 자체가 죽었을 때만 `CD_BREAK_GLASS=1`과 `--break-glass`를 함께 준다. 끝난 뒤 같은 내용을 PR로 main에 반영한다(가드 경고 문구, `scripts/lib/production-deploy-guard.mjs`).
- 스테이징 롤백: main에 revert 커밋을 push한다. main push가 스테이징 배포를 예약한다.
- 확인: `node scripts/verify-deployed-sha.mjs --sha=<되돌린 SHA> --origin=https://code-destiny.com`, 이어서 [SECURITY-AUDIT](SECURITY-AUDIT.md#기존-서비스-연결-유지-확인) C2~C5.
- 주의:
  - 코드 롤백은 데이터를 되돌리지 않는다. 이번 브랜치에는 운영 DB 데이터·인덱스 변경이 없다(인덱스 생성은 승인 항목, 미실행).
  - DB 시크릿을 바꾼 뒤 그 이전 Worker 버전으로 돌아갈 때 시크릿이 어떻게 붙는지는 확인하지 않았다(미확인). 롤백 직후 C2로 연결부터 본다.
  - 변경별 롤백 방법은 [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md#변경-목록)에 있다.

### 알림 채널 목록

채널별 운영 설정 여부(시크릿 값)는 확인하지 않았다. 운영 시크릿은 이름 수만 셌다(SECURITY-AUDIT 현재 상태).

| 채널 | 설정 이름 | 쓰는 곳 |
|---|---|---|
| 관리자 메일(Resend) | `ADMIN_FEEDBACK_EMAIL` | `notifyOperators`(`worker/lib/feedback-notify.js`) |
| Discord 웹훅 | `FEEDBACK_DISCORD_WEBHOOK_URL` | `notifyOperators`(선택) |
| Slack 웹훅 | `FEEDBACK_SLACK_WEBHOOK_URL` | `notifyOperators`(선택) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 일일 크론 태스크 실패(`worker/lib/cron-failure-alert.js`) |
| Atlas 경보 | Atlas 프로젝트 설정(경보 53개, ATL) | 클러스터 지표·이벤트. 유형별 구성은 미확인 |

`notifyOperators`로 가는 알림:

| 알림 | 모듈 | 계기 |
|---|---|---|
| Gemini 장애·복구 추정 | `worker/lib/provider-outage-alert.js` | `GEMINI_SPEND_CAP`, `GEMINI_BILLING_DISABLED` |
| 10분 크론 태스크 실패 | `worker/lib/cron-tick-failure-alert.js` | 시간당 1회(C5, `7a40ea881`) |
| 유료 결과 전달 검토 대기 | `worker/lib/delivery-review-alert.js` | R2(`081f02e02`, `f81b7bf36`) |
| 카드 자동환불 소진 | `worker/payments/fulfillment-alert.js` | `refund_failed`(R1, `fd6b578e4`, `c322f998f`) |
| 공용 래퍼 | `worker/lib/ops-alert.js` `sendOperatorAlert` | 위 알림들이 공유 |

C5·R1·R2 알림은 브랜치에만 있고 **운영 미배포**다.

## 승인 필요

| # | 항목 | 비용·위험 | 방법 |
|---|---|---|---|
| 1 | Atlas 스냅샷·PITR 복원 시험(INFRASTRUCTURE-AUDIT 승인 6) | 임시 M10 기준 시간당 3노드 × $0.032 = $0.096(INV 단가). 복원 전송비는 미측정 | Atlas UI → Backup → Restore. 대상은 **새 임시 클러스터**로 하고 운영 클러스터를 덮어쓰지 않는다. 건수 대조 → 소요 시간을 RTO 복원 단계로 기록 → 임시 클러스터 삭제 |
| 2 | 로컬 mongod 복원 시험 | 외부에서 받은 실행 파일 실행 | [측정 방법](#복원-단계-측정-방법). 사용자 승인 또는 사용자 직접 실행 |
| 3 | DR 덤프 보관·파기 | 개인정보 83MB가 로컬에 있다 | 보관 기간을 정한다. 보관하면 암호화, 아니면 파기 |
| 4 | 백업 보존 정책 변경 | 축소하면 RPO 표의 장기 행이 나빠진다 | 구매 데이터 복구 능력 유지가 전제다([COST-OPTIMIZATION](COST-OPTIMIZATION.md#사용자-조치)) |
| 5 | 실제 사고 시 PITR 복원 | 운영 DB 쓰기 | 사용자 명시 승인 뒤에만 |
| 6 | 리포에 복원 스크립트 추가 | 코드 변경(이번 범위 밖) | `backup:mongo`의 EJSON을 지정 대상에 적재하는 스크립트. 대상이 운영이면 거부하게 한다 |
