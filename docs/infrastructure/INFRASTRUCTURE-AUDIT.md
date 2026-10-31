# 인프라 감사: 기준선과 이슈 현황 (2026-10-31)

- **측정 시각:** 2026-10-31 15:06 KST~11-01 01:03 KST(Atlas 사건 목록만 11-01에 다시 조회해 파일로 남김). 운영은 읽기 전용으로만 측정했다(GET·tail·Atlas Admin GET·읽기 전용 DB 프로브). 항목별 시각은 [출처 목록](#출처-목록)에 있다.
- **출처:** [출처 목록](#출처-목록). 원본은 모두 리포 밖 `D:\Development\code-destiny-backups\` 아래에 있고 커밋하지 않는다. IP·헤더·식별자가 들어 있기 때문이다.
- **기준 커밋:**
  - 작업 기준: origin/main `f4c5458a0`
  - 작성 시점 브랜치 HEAD: `2a6039151`(브랜치 `wt/infra-optimization-20261031-150228`)
  - **운영 미배포.** 운영은 다른 세션이 2026-11-01 00:20 KST에 배포한 `4d58f3dc5`이고, 이 브랜치는 들어 있지 않다(DEP).
- **함께 보는 문서:**
  - 같은 보고서 묶음: [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md) · [SECURITY-AUDIT](SECURITY-AUDIT.md) · [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md) · [COST-OPTIMIZATION](COST-OPTIMIZATION.md) · [DISASTER-RECOVERY](DISASTER-RECOVERY.md) · [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md)
  - 실행 계획: [2026-10-31-infra-db-optimization](../superpowers/plans/2026-10-31-infra-db-optimization.md)
  - 인수인계: [2026-10-31-infra-db-optimization](../handoff/2026-10-31-infra-db-optimization.md)

## 결론

- **이슈 상태:** 감사에서 찾은 21건은 해결 10, 완화 6, 잔여 5다. P0 2건(F3·L1)은 모두 해결했다. 다만 모두 브랜치 커밋일 뿐 **운영 미배포**라서, 운영에 아직 효과가 없다.
- **P1 운영 장애(측정 중 발견, 잔여):**
  - 2026-10-31 21:59~22:10 KST 저녁 피크에 DB 연결이 무너졌다. 장애 창 tail 이벤트 2,561건 중 791건(30.9%)이 503이었다.
  - 원인 1순위는 M10의 신규 연결 생성률 제한이다. 같은 측정 구간에 serverStatus 연결 거부가 13,512 늘었다. 확정은 아니다.
  - CF 오류 수는 장애 내내 0이라 지금의 경보로는 보이지 않는다.
  - 장애 창에 생성된 결제 1건은 정상 완료됐다. 저장된 유료 결과 미전달은 새로 생기지 않았다. 다만 유료 결과 조회 28건이 503이었다.
  - 대응은 [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md)로 넘겼다. 근거는 [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#p1-장애-저녁-피크-db-연결-실패)에 있다.
- **연결 지연:** ICN 고정 뒤 공유 DB 연결 중앙값은 90ms다(n=7,239, 피크·장애 포함 최종 tail). DO 연결 프록시는 Task 9 규칙상 **도입하지 않음**이다.
  - 연결 꼬리는 p95 2,424ms, p99 5,600ms다. 장애 15분을 빼면 p95 1,100ms, p99 4,125ms다.
  - Task 9 규칙은 중앙값만 본다. 연결 생성률 위험은 장애 후속에서 다시 평가한다.
- **등급:** M10을 유지한다. 2026-10 청구액 $80.65는 크레딧으로 전액 상쇄돼 현금 지출이 $0이다. [COST-OPTIMIZATION](COST-OPTIMIZATION.md) 참고.
- **보안:** 접근망은 사용자 결정대로 `0.0.0.0/0`을 유지하고, 보완 통제로 런북 3종을 마련했다. 가장 큰 잔여 위험은 앱 연결이 클러스터 관리자 권한(atlasAdmin)을 쓰는 점이다. [SECURITY-AUDIT](SECURITY-AUDIT.md) 참고.
- **백업:** PITR 7일과 스냅샷 정책이 켜져 있다.
  - 실측한 것: 덤프와 오프라인 무결성 검증
  - **미측정:** 실제 mongorestore 복원에 걸리는 시간
  - [DISASTER-RECOVERY](DISASTER-RECOVERY.md) 참고.
- **측정 중 새로 찾은 것 5건:**
  1. 스테이징 스모크 요청이 운영 Worker로 들어왔다.
  2. exceededResources가 7일에 50건 있었다. tail 창 안 2건은 `POST /api/rpg/award`다.
  3. P1 운영 장애(위).
  4. 프라이머리 연결 거부가 누적 17,523에서 31,035로 늘었다.
  5. 느린 연결은 크론 직후 분이 아니라 몇 분짜리 에피소드로 몰린다. 중간 집계의 "크론 직후 분" 가설은 철회했다.
  - [아래 절](#측정-중-새로-발견한-것) 참고.

## 출처 목록

경로는 `D:\Development\code-destiny-backups\` 기준이다. tail 원본 줄에는 IP·헤더가 있어 문서에 옮기지 않았다. 문서에 쓴 것은 집계값뿐이다.

| ID | 원본(리포 밖) | 시각·창 | 표본 | 도구 |
|---|---|---|---|---|
| T-INT | (중간값, T-FINAL로 대체) `tail\report-interim-20261031-1902.txt`(관심 라우트), `tail\report-interim-20261031-1902-all.txt`(같은 원본에 `--all`). 원본은 `tail\` 아래 세그먼트 jsonl을 19:02 KST에 떠 둔 사본 | 2026-10-31 06:09:28Z~09:59:05Z (15:09~18:59 KST), **피크 미포함** | 이벤트 1,855 | `npm run report:worker-tail-latency -- <파일> [--all]` |
| T-KIND | (중간값, T-KIND-FINAL로 대체) T-INT와 같은 tail 원본의 보조 집계: fetch/scheduled 분해, DB 사용 비중, 느린 연결 단계 | 같은 창 | 이 파서 기준 이벤트 1,857(T-INT보다 2건 많음) | 세션 스크래치 스크립트(리포 밖, 수치만 출력) |
| T-EARLY | (중간값, T-FINAL로 대체) tail 초기 66건 집계(원장 기록) | 06:09~06:47Z | 이벤트 66 | 위 두 도구 |
| T-FINAL | `tail\report-final-20261101-all.txt`. 원본은 `tail\20261031-1506.jsonl`, `20261031-1529.jsonl`, `seg-20261031-163557.jsonl`, `seg-20261031-220705.jsonl` | 2026-10-31 06:09:28Z~13:36:22Z (15:09~22:36 KST), **피크·장애 포함** | 이벤트 15,972 | `npm run report:worker-tail-latency -- <파일들> --all` |
| T-KIND-FINAL | `tail\report-final-20261101-kind.txt`: fetch/scheduled 분해, 장애 15분 제외(calm), 느린 연결 단계, DB 사용 비중, 상태 코드 | 같은 창 | 이 파서 기준 이벤트 15,992(fetch 15,927, scheduled 45, queue 20) | 세션 스크래치 스크립트(리포 밖, 수치만 출력) |
| T-SLOW | `tail\report-final-20261101-slow-minutes.txt`: 느린 연결(≥1,000ms)의 분별 분포 | 같은 창 | 느린 연결 687 | 같음 |
| T-MIX | `tail\report-incident-20261031-2203-mix.txt`: 장애 전후 분별 CPU·wall, 라우트 구성, 크론 | 21:50~22:15 KST | 분별 | 같음 |
| T-SPLIT | `tail\report-incident-20261031-split.txt`: 장애 창 안팎의 503·연결 오류·op 타임아웃, 503 라우트 | 장애 창 21:59~22:10 KST와 그 밖 | 이벤트 2,561 / 13,431 | 같음 |
| T-CONN | `tail\report-incident-20261031-conn-attempts.txt`: 분별 연결 성공·오류, 초당 연결 시도 | 21:45~22:15 KST | 분별 | 같음 |
| CF-7D | `cf-analytics\20261031-1510-7d.json` | 2026-10-24~10-31 UTC(10-31은 부분일), measuredAt 06:07Z | 일별 8행 | CF GraphQL `workersInvocationsAdaptive` |
| CF-PATH | `cf-analytics\20261031-paths-7d.json` | 같은 7일 | 경로별 | CF GraphQL |
| CF-COLO | `cf-analytics\20261031-colo-by-date-7d.json` | 같은 7일 | 일별 | CF GraphQL(실행 colo) |
| CF-CRON | `cf-analytics\20261031-cron-status-7d.json` | 같은 7일 | **0행** | CF GraphQL |
| CF-INC | `tail\cf-incident-20261031-minute.txt` | 21:45~22:39 KST, 분 단위 | 분별 | CF GraphQL `workersInvocationsAdaptive`(분 집계) |
| CF-0018 | `tail\cf-0015-0050kst-minute.txt` | 2026-11-01 00:10~00:48 KST, 분 단위 | 분별 | 같음 |
| CF-WIN | `tail\cf-window-20261031-0812Z-1551Z.txt` | 08:12Z~15:51Z(MDB2와 MDB3 사이) | 운영 success 24,095 + clientDisconnected 34 + exceededResources 1 = 24,130, 스테이징 656 | 같음 |
| LAT | `latency\20261031-1512-prod.txt` | 2026-10-31T06:11Z | 10회(warmup 2) | `npm run measure:post-deploy-latency -- --base https://code-destiny.com --iterations 10` |
| ATL | `atlas-snapshots\20261031-1659\summary.json` | 2026-10-31T07:59:58Z, 부하 지표 PT1H·P30D | 연결 724표본, 네트워크 29일 | `npm run audit:atlas-readonly` |
| ATL-1M | `atlas-snapshots\20261031-incident-cpu-minute.txt` | 21:45~22:19 KST, PT1M, 3노드(lastPing 16:02:35Z) | 분별 | Atlas Admin API measurements GET(스크래치 스크립트) |
| ATL-EV | `atlas-snapshots\20261031-incident-events.txt` | 프로젝트 사건 20:30~22:45 KST, 2026-11-01에 다시 조회 | 3건 | Atlas Admin API events GET(스크래치 스크립트) |
| ATL-EV2 | `atlas-snapshots\20261101-events-2030-0130kst-and-tier.txt` | 프로젝트 사건 20:30~01:30 KST와 현재 등급 | 사건 3건(모두 시스템 사건, 사람 행위자 없음). 등급 M10, 컴퓨트 자동 확장 꺼짐 | Atlas Admin API events·clusters GET(스크래치 스크립트) |
| DEP | `tail\worker-deployments-20261101.txt` | 운영 Worker 배포 이력 2026-10-31 07:42Z~15:20Z와 릴리스 런 4건(운영 3, 스테이징 1) | 배포·secret 변경·롤백 10행 | `wrangler deployments list`(작성자 칸은 지움), `gh run view` |
| CF-MIX | `tail\cf-episode-mix-20261101.json` | 11-01 00:05~00:17, 00:17~00:26, 00:32~00:44 KST | 창마다 상위 경로 15개, UA 분류, 국가 | CF GraphQL `httpRequestsAdaptiveGroups`(스크래치 스크립트) |
| INV | ATL의 invoices 섹션(원장 measurements.md §청구서) | 2026-08~10 | 청구서 3건 | 같은 도구 |
| MDB | `mongodb-readonly\20261031-1542-offpeak.json` | 2026-10-31T06:42Z(15:42 KST), 60초 표본 | 1회 | 읽기 전용 프로브(serverStatus·dbStats·$collStats) |
| MDB2 | `mongodb-readonly\20261031-conn-counters.jsonl` | 17:12 KST | 1회 | serverStatus 1회 읽기 |
| MDB3 | `mongodb-readonly\20261031-conn-counters.jsonl` 2번째 줄 | 15:51:42Z(11-01 00:51 KST) | 1회 | serverStatus 1회 읽기 |
| DLV | `mongodb-readonly\20261101-paid-delivery-health-2d.json`, `20261101-consultation-delivery-health-2d.json` | 최근 2일 | 상품별 | `node scripts/report-paid-delivery-health.mjs --days 2`, `node scripts/report-consultation-delivery-health.mjs --days 2`(읽기 전용) |
| PAYW | `mongodb-readonly\20261101-incident-payments.json` | 장애 창 전후 결제 | 결제 행 | 읽기 전용 find(마스킹 출력) |
| IDX | `mongodb-readonly\20261031-index-drift-check.txt` | 17:06 KST | 모델 58 | `npm run migrate:reconcile-index-drift -- --check`(읽기 전용) |
| LST | `mongodb-readonly\20261031-list-indexes.json` | 08:06:49Z | 컬렉션 99 | listIndexes 전수(읽기 전용) |
| DR | `mongodb-readonly\20261031-1710-dump-verify.json`, 덤프 디렉터리의 manifest(건수만 읽음) | 17:10 KST | 컬렉션 99 | `npm run backup:mongo` + 오프라인 검증 |
| LEDGER | `.superpowers/sdd/2026-10-31-infra-db-optimization/measurements.md`, `progress.md` | 작업 원장 | — | 로컬 원장(gitignore 대상, 커밋 안 됨) |

## 기준선

Task 2 Step 3의 측정 항목이다.

- **tail 값:** 모두 최종 tail(T-FINAL·T-KIND-FINAL, 15:09~22:36 KST, 저녁 피크와 P1 장애 포함)에서 뽑았다. 중간 집계(T-INT, 피크 미포함)의 값은 이 표에서 모두 바꿨다.
- **calm:** 장애 15분(13:00~13:15Z = 22:00~22:15 KST)을 뺀 값이다. 평시 수준을 보려고 따로 적는다.
- **after 열:** 운영 승격 뒤 같은 절차로 다시 잰다. 지금은 **운영 미배포로 after 미측정**이다.

| 항목 | before 값 | 측정 시각·창 | 도구(출처) | 표본 | after |
|---|---|---|---|---|---|
| 실행 위치(`cf-placement`) | remote-ICN 3/3 | 2026-10-31 (LEDGER §Workers) | `curl -D -` `/api/health` | 3 | 운영 미배포로 after 미측정 |
| 실행 colo ICN 비율 | 10-24 88%, 10-25~10-30 0.02~44%(일별 편차 큼. 10-27 0.02%, 10-29 3.4%. 일별 값은 [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#측정-조건)), 10-31 99%(3,966/4,007) | 2026-10-24~10-31 UTC | CF-COLO | 일별 | 운영 미배포로 after 미측정 |
| 라우트 wallTime p50/p95/max(ms), 상위 4개 | `GET /api/auth/me` 5/170/42,122 (n=5,220), `GET /api/honey/attendance` 168/5,848/38,002 (n=3,517), `GET /api/profile` 6/210/41,855 (n=2,739), `GET /api/rpg/characters` 510/24,175/38,001 (n=2,473). max는 장애 창의 값이다 | T-FINAL 창 | T-FINAL | 이벤트 15,972 | 운영 미배포로 after 미측정 |
| 라우트 wallTime p99 | 미측정. 리포트가 p50/p95/max만 출력한다. 측정 방법: 같은 원본에 p99 열을 추가해 다시 집계 | — | — | — | — |
| DB 연결 shared p50/p95/p99(ms) | 90 / 2,424 / 5,600. calm 86 / 1,100 / 4,125 (n=6,423) | T-FINAL 창 | T-FINAL, T-KIND-FINAL | n=7,239 | 운영 미배포로 after 미측정 |
| DB 연결 payment p50/p95/p99(ms) | 141 / 2,297 / 3,547. fetch만 124 / 626 / 1,431 (n=232) | T-FINAL 창 | T-FINAL, T-KIND-FINAL | n=277 | 운영 미배포로 after 미측정 |
| 요청당 연결 수 | p50 1, max 2 | T-FINAL 창 | T-FINAL | 연결 있는 이벤트 | 운영 미배포로 after 미측정 |
| DB 오류 카운터 | `db-connect-error` 5,216(장애 창 5,039), `db-op-timeout` 896(장애 창 861), `db-op-admission` 1, `db-ping` 0, EventEmitter 누수 0 | T-FINAL 창 | T-FINAL, T-SPLIT | 이벤트 15,972 | 운영 미배포로 after 미측정 |
| 공개 GET 지연(클라이언트 측, ms) | `/api/health` p50 311.9 / p95 326.3 / max 326.3, 오류 0/10. 측정 PC↔엣지 왕복 포함. 같은 라우트의 Worker 안 wallTime은 p50 2ms(T-FINAL, n=20) | 2026-10-31T06:11Z | LAT | 10 | 운영 미배포로 after 미측정 |
| 인증 GET 지연 | 미측정. `CD_LATENCY_COOKIE`가 없어 `/api/payments/me`·`/api/subscription/status`를 SKIP했다. 측정 방법: 테스트 계정 쿠키를 설정하고 같은 명령 재실행 | — | LAT | — | — |
| CF 요청 수(7일) | 합계 174,639. 일별 12,942~49,822(10-31 부분일 3,859 제외) | 2026-10-24~10-31 UTC | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF CPU p50 / p99(일별 범위) | p50 9.6~31.2ms / p99 233.4~847.4ms | 같은 7일 | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF wall p50 / p99(일별 범위) | p50 30.2~653.6ms / p99 3,347.6~25,505.3ms. 장시간 스트림 응답을 따로 분리하지 않은 값 | 같은 7일 | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF 서브요청(7일) | 998,868 | 같은 7일 | CF-7D | — | 운영 미배포로 after 미측정 |
| CF 오류율(7일) | errors 50/174,639 = 0.029%(전부 exceededResources). clientDisconnected 1,385(0.79%)는 오류로 세지 않음 | 같은 7일 | CF-7D | — | 운영 미배포로 after 미측정 |
| 크론 연결 p50/p95(ms) | shared 1,956 / 2,772, payment 1,949 / 2,769. 같은 창 fetch shared는 89 / 2,381 | T-FINAL 창 | T-KIND-FINAL | scheduled 45, fetch shared 7,174 | 운영 미배포로 after 미측정 |
| 크론 실행 colo | 미측정. tail의 scheduled 이벤트에는 colo가 없고, CF scheduled 데이터셋은 0행이다(CF-CRON). 측정 방법: 사용자가 대시보드 Cron 이벤트 화면에서 확인 | — | — | — | — |
| 큐 실행 colo | 미측정. 창 안에 queue 이벤트가 20건 있지만 colo를 집계하지 않았다. 측정 방법: 같은 원본에서 queue 이벤트의 `event.colo`를 센다 | T-FINAL 창 | T-KIND-FINAL | 20 | — |
| Gemini 위치 오류(`User location is not supported`) | 0건 | T-FINAL 창 | T-KIND-FINAL | 이벤트 15,992(scheduled 45, queue 20) | 운영 미배포로 after 미측정 |
| DB 사용 요청 비중 | 7,406/15,927 = 46.5%(fetch 이벤트 중 연결 완료 줄이 있는 비율). calm 48.4% | T-FINAL 창 | T-KIND-FINAL | fetch 15,927 | 운영 미배포로 after 미측정 |
| 503 응답 수 | 823. 장애 창 791/2,561(30.9%), 그 밖 32/13,431 | T-FINAL 창 | T-KIND-FINAL, T-SPLIT | 이벤트 15,972 | 운영 미배포로 after 미측정 |
| 프라이머리 연결 거부 누적(`establishmentRateLimit.rejected`) | 17,523(MDB2, 17:12 KST) → 31,035(MDB3, 00:51 KST), +13,512. MDB와 MDB2 사이는 +0 | 15:42~00:51 KST | MDB, MDB2, MDB3 | 3회 읽기 | 운영 미배포로 after 미측정 |

## 이슈 현황 (위험도별)

상태 정의:

- **해결:** 브랜치 커밋으로 원인을 없앴다. 운영 미배포다.
- **완화:** 영향을 줄였거나 관측을 추가했다. 원인 일부가 남아 있다.
- **잔여:** 이번에 바꾸지 않았다.

| # | 위험도 | 요약 | 상태 | 커밋 | 상세 |
|---|---|---|---|---|---|
| F3 | P0 | 지연차감 취소 뒤 같은 requestId로 재시도하면 두 번째 결제를 요구했다 | 해결 | `4de80b27c` | [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md#변경-목록) |
| L1 | P0 | LLM in-flight dedup이 요청 사이에 Promise를 공유했다 | 해결 | `238ec6554` | 같음 |
| R3 | P1 | cancel이 환불된 기록을 되살렸다 | 해결 | `4de80b27c` | 같음 |
| C5 | P1 | 10분 크론 태스크가 실패해도 로그만 남았다 | 해결 | `7a40ea881` | 같음 |
| R1 | P1 | 카드 자동환불 5회 소진(`refund_failed`) 시 운영자 알림이 없었다 | 해결 | `fd6b578e4`, `c322f998f` | 같음 |
| P4 | P1 | 이용권 영구 해금 경로의 지급·소비·증빙이 트랜잭션 밖에서 따로 쓰였다 | 해결 | `14dfd4d17`, `927b56623` | 같음 |
| R2 | P1 | 유료 결과 "검토 필요"에 알림이 없었다 | 완화(알림만 추가. MasterLoveCodex·유료 intent `reviewRequired` 경로는 남음. 비카드 자동 복원은 채택 안 함) | `081f02e02`, `f81b7bf36` | 같음 |
| Q1 | **P1**(2026-10-31 장애 뒤 P2에서 올림) | 매 요청 새 MongoClient를 만든다(결제 요청은 둘). 저녁 피크에 연결 생성률 제한과 겹쳐 P1 장애의 유력 원인이 됐다 | 잔여(측정 완료, 코드 변경 없음, DO는 Task 9 규칙상 도입 안 함. 장애 대응은 [인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md)) | — | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#판정-규칙과-판정) |
| Q2 | P2 | `access.js` N+1 순차 왕복 | 해결 | `8ce66f1a0` | [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#쿼리-개선-q2q6) |
| Q3 | P2 | 인사이트 공개 목록에 재시도·캐시가 없었다 | 완화(재시도만 추가. 캐시는 의도적으로 넣지 않음) | `a9d025f93` | 같음 |
| Q4 | P2 | ops-hq 동기화가 10분마다 원장 전체를 2회 스캔했다 | 완화(`$group` 1회 + 남은 업적만 판정. 원장 증가에 따른 집계 비용은 남음) | `34f7ae386` | 같음 |
| Q5 | P3 | 인덱스 드리프트 스크립트가 TTL 선언을 잘못 판정했다 | 해결(TTL 값만 다른 경우는 후속) | `30ef0c7ac` | 같음 |
| Q6 | P3 | 가입 시 `users {referralCode}` COLLSCAN | 잔여(운영 인덱스 생성은 승인 항목) | — | 같음 |
| S1 | HIGH | 구독 해지 페이지 반사형 XSS | 해결 | `83c7e699a` | [SECURITY-AUDIT](SECURITY-AUDIT.md#보안-이슈-현황) |
| S2 | HIGH | 일일운세 구독 POST에 레이트리밋이 없었다 | 완화(IP·이메일 레이트리밋. 해지 링크 서명·더블 옵트인은 안 함) | `e0f276362` | 같음 |
| S3 | HIGH | Atlas 접근 목록 `0.0.0.0/0`, DB 비밀번호가 유일한 장벽 | 잔여(유지 결정, 보완 통제 런북) | — | 같음 |
| S4 | HIGH | Capacitor critical 권고(N-01) | 잔여(이번 범위 밖, 별도 릴리스) | — | 같음 |
| S5 | MED | 운영 unique·TTL 인덱스 실물 미확인 | 해결(listIndexes로 결제 unique 누락 0 확인. 소형 7건 생성은 승인 항목) | — (읽기 전용 확인) | [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#결제-멱등-unique-인덱스와-ttl-10d) |
| S6 | MED | 무로그인 LLM 라우트에 전역 한도가 없었다 | 완화(전역 일일 300. 잔여 위험 있음) | `014703a08` | [SECURITY-AUDIT](SECURITY-AUDIT.md#task-10-잔여-위험) |
| S7 | MED | 미병합 보안 커밋 W-6·W-10·E-1·N-02 | 완화(W-6·W-10·E-1 해결, N-02 잔여) | `9872dd9a8`, `4aef96200`, `4aedaf1a8`, `04326da13` | [SECURITY-AUDIT](SECURITY-AUDIT.md#보안-이슈-현황) |
| S8 | MED | Gemini 키 미교체, 관리자 MFA 없음(M2), 탈퇴자 토큰 30분 유효(R-01) | 잔여 | — | [SECURITY-AUDIT](SECURITY-AUDIT.md#잔여-위험-10f) |

감사 원문과 근거 줄 번호는 실행 계획 [Context](../superpowers/plans/2026-10-31-infra-db-optimization.md)에 있다.

## 측정 중 새로 발견한 것

| 발견 | 근거 | 위험 | 상태 | 다음 조치 |
|---|---|---|---|---|
| 스테이징 배포 스모크가 운영 Worker에 도달 | 06:29Z 7건, 06:47Z 7건, 전부 GET(LEDGER). 원인 후보: `public/_worker.js:347` `resolveApiWorkerOrigin`이 `API_WORKER_ORIGIN` 미설정 시 운영 기본값으로 떨어진다 | 스테이징 미리보기에서 로그인·결제하면 운영 DB에 닿을 수 있다 | 잔여(코드 변경 없음) | 사용자: 스테이징 Pages `API_WORKER_ORIGIN` 확인. [SECURITY-AUDIT](SECURITY-AUDIT.md#잔여-위험-10f) |
| exceededResources 50건/7일 | CF-7D, LEDGER. tail 창 안 2건은 `POST /api/rpg/award`(wall 22,723,598ms, CPU 32,500ms, 둘 다 503)다(T-FINAL) | 해당 요청의 연결이 끊긴다 | 잔여(tail 창 밖 48건의 경로 미특정) | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#exceededresources) |
| **P1 장애: 저녁 피크 DB 연결 실패** | 2026-10-31 21:59~22:10 KST. 장애 창 503 791건(30.9%), 연결 오류 5,039건, 초당 연결 시도 8.5~18.6(T-SPLIT, T-CONN). CF 오류 수는 0(CF-INC). 프라이머리 CPU 최대 25.2%(ATL-1M), 그 시각 Atlas 사건·배포 없음(ATL-EV, DEP) | 정상 고객의 출석·캐릭터·유료 결과 조회가 막힌다. 다음 피크에 다시 날 수 있다 | 잔여(원인 1순위 미확정, 코드 변경 없음) | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#p1-장애-저녁-피크-db-연결-실패), [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md) |
| 프라이머리 연결 거부 누적 17,523 → 31,035 | MDB, MDB2, MDB3. MDB→MDB2는 +0, MDB2→MDB3(17:12~00:51 KST)는 +13,512 | 연결 생성률 제한(M10 노드당 15/초, Atlas 문서 2026-10-31 조회)에 걸리면 요청이 늦어지거나 실패한다 | 잔여. 누적값이라 언제 늘었는지는 모른다(장애 창, 00:18 에피소드, 운영 Worker 변경 8번이 모두 구간 안. DEP) | [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결) |
| 느린 연결이 몇 분짜리 에피소드로 몰림 | 느린 연결 687건이 29분에 있고, 8건 이상인 18분에 642건이 몰린다(T-SLOW). 분 ≡ 1(mod 10) 쏠림은 최종 집계에서 보이지 않아(장애 제외 62/326) 중간 집계의 "크론 직후 분" 가설은 철회했다(T-KIND-FINAL) | 연결 꼬리 지연, 심하면 P1 장애 | 원인 미확인 | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#꼬리-지연-위험) |
| 2026-11-01 00:18~00:24 KST 지연 에피소드 | 분당 203~343건, wall p99 4.4~8.7초, 00:22 p50 13.9초, CF 오류 0, 00:25 회복(CF-0018). tail이 끝난 뒤라 연결 단계는 미측정. 요청은 P1과 경로 구성이 같은 고객 트래픽이다(KR 98.7%, CF-MIX). 다른 세션의 운영 릴리스 배포 단계(00:06~00:22, Worker 교체 00:20:29)와 겹친다. 원인으로 확정하지 않았다(DEP) | 장애 직전 수준의 꼬리 | 잔여 | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#꼬리-지연-위험) |

## 전후 비교

before는 위 [기준선](#기준선) 값이다. after는 모든 행이 **운영 미배포로 after 미측정**이다. 운영 승격 뒤 Task 2 Step 3을 같은 명령으로 다시 재서 채운다.

| 지표 | before | after |
|---|---|---|
| shared 연결 p50/p95/p99 | 90 / 2,424 / 5,600ms (T-FINAL, n=7,239). calm 86 / 1,100 / 4,125ms | 운영 미배포로 after 미측정 |
| payment 연결 p50/p95/p99 | 141 / 2,297 / 3,547ms (T-FINAL, n=277) | 운영 미배포로 after 미측정 |
| DB 연결 오류·503 | `db-connect-error` 5,216, 503 823 (T-FINAL, 대부분 장애 창) | 운영 미배포로 after 미측정 |
| `/api/health` 클라이언트 측 p50 | 311.9ms (LAT, n=10) | 운영 미배포로 after 미측정 |
| CF 오류율 | 0.029% (CF-7D) | 운영 미배포로 after 미측정 |
| 크론 태스크 실패 알림 | 없음(감사 C5) | 운영 미배포로 after 미측정 |
| 환불 실패·검토 대기 알림 | 없음(감사 R1·R2) | 운영 미배포로 after 미측정 |

## 승인 필요 항목

자동으로 실행하지 않는다. 각 항목은 사용자의 명시적 승인이 있어야 한다.

| # | 항목 | 상태 | 상세 |
|---|---|---|---|
| 1 | RED 결제 변경 Task 3·Task 7 | 2026-10-31 승인됨(테스트 → 스테이징까지) | [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md) |
| 2 | 운영 인덱스 `users {referralCode:1}`와 드리프트 dry-run의 소형 7건 생성 | 미승인 | [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#인덱스-생성-승인-항목) |
| 3 | DB 사용자 권한 축소와 비밀번호 교체(사용자가 Atlas UI에서 실행) | 미실행 | [SECURITY-AUDIT](SECURITY-AUDIT.md#보완-통제-런북-10e) |
| 4 | 보안 의존성 승격 N-01(Capacitor)·N-02(next) | 이번 범위 밖 | [SECURITY-AUDIT](SECURITY-AUDIT.md#잔여-위험-10f) |
| 5 | 비카드 미전달 자동 복원(환불 정책 변경) | 채택 안 함 | R2는 알림만 |
| 6 | Atlas 스냅샷 복원 시험(임시 클러스터 비용) | 미승인 | [DISASTER-RECOVERY](DISASTER-RECOVERY.md#승인-필요) |
| 7 | 등급 변경(M10 → 다른 등급), DO 파일럿 착수 | Task 9 규칙상 불필요. 다만 P1 장애 대응에서 M30 승격(8.0에서 연결 생성률 제한 없음)이나 연결 재사용을 검토할 수 있다. 미승인 | [COST-OPTIMIZATION](COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex), [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md) |
| 8 | 사용자 조치: Gemini 키 교체, 스테이징 `WORKER_ROUTE_METRICS_TOKEN` 설정, Atlas 읽기 전용 API 키 삭제 | 미실행 | [SECURITY-AUDIT](SECURITY-AUDIT.md#잔여-위험-10f) |
| 9 | 운영 배포 | **운영 미배포** | [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md) |
| 10 | P1 장애 대응 코드 변경(연결 실패 차단기·재시도 축소, 요청당 연결 수 축소, 연결 실패 경보) | 미승인. 결제·로그인 경로에 닿는 RED 변경이다 | [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md) |

## 후속 과제

### 사용자 조치

1. 스테이징 `WORKER_ROUTE_METRICS_TOKEN`을 설정한다. W-6 반영 뒤 스테이징 `/api/health/route-metrics`가 닫혀 있다. 운영에는 이미 있다.
2. Gemini API 키를 교체한다. 키가 도구 응답에 한 번 노출됐다.
3. 앱 DB 사용자의 `atlasAdmin` 권한을 줄인다. 최소 권한 런북을 따른다.
4. DB 비밀번호를 교체한다. 비밀번호 교체 런북을 따른다.
5. 스테이징 Pages의 `API_WORKER_ORIGIN`을 확인한다.
6. 운영 인덱스를 생성한다. 2번 승인 항목이며 순서는 backup → dry-run → 승인 → 실행 → explain이다.
7. Atlas 크레딧 만료일을 확인한다. 만료되면 [COST-OPTIMIZATION](COST-OPTIMIZATION.md#사용자-조치)에 적은 금액이 현금 비용이 된다.
8. 백업 보존 정책을 바꿀지 정한다. 축소는 승인 항목이고, 구매 데이터 복구 능력을 지키는 것이 전제다.
9. 로컬 mongod로 실제 복원 시험을 한다. [DISASTER-RECOVERY](DISASTER-RECOVERY.md#rto) 참고.
10. DR 덤프(개인정보 포함, 리포 밖)를 보관할지 파기할지 정한다.
11. 운영 배포를 한다. 1회성 명시 요청이 있을 때만 한다.
12. 측정이 끝나면 읽기 전용 Atlas API 키를 삭제한다.
13. 보안 브랜치 N-01·N-02를 반영한다. 이번 범위 밖이다.
14. exceededResources 경로를 특정한다. tail 창 안 2건은 `POST /api/rpg/award`로 확인했다. 나머지 7일치는 대시보드 Workers Logs에서 `outcome=exceededCpu`로 필터한다.
15. 남아 있는 `wrangler tail` 프로세스 트리를 종료한다. 이 세션의 종료 시도는 자동 모드에서 거부됐다. PID는 [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md)에 있다.

### 코드 후속(이번 범위 밖)

1. `test:node`에 origin/main에서부터 실패하던 14건이 있다.
   - home-overseas-runtime 11건
   - Playwright 브라우저 미설치 2건
   - shell-dictionary-parity 1건(홈 셸 ↔ ko.json 3키)
2. MasterLoveCodex·유료 intent `reviewRequired` 알림 경로가 없다. 6B 범위 밖으로 남았다.
3. 스테이징에서 확인할 것:
   - Task 7 이용권 unlock 트랜잭션의 레플리카셋 동시성
   - 트랜잭션 안 E11000의 재시도
4. 스테이징에서 확인할 것: ops-hq XP `$group`의 실제 집계 결과. 테스트는 가짜 aggregate를 쓴다.
5. `POST /coin-gate/moonstone`(`worker/payments/index.js:1630-1662`)에서 차감이 실패하면 `dropEntitlementByIdentity`가 REFUNDED 복원 행을 지울 수 있다. Task 7은 같은 문제를 unlock 분기에서만 고쳤다.
6. 드리프트 스크립트: TTL 값만 다르고 키가 같은 인덱스는 collMod로 처리할지 결정해야 한다.
7. `POST /api/rpg/award`(`awardRpgExp`)가 6시간 넘게 열려 있다가 exceededCpu로 끝나는 이유.
8. 해지 링크 서명 토큰과 더블 옵트인. 10B에서 의도적으로 뺐다.
9. compass 전역 카운터를 LLM 경로에 도달한 요청만 세도록 옮긴다. [SECURITY-AUDIT](SECURITY-AUDIT.md#task-10-잔여-위험) 참고.
10. **P1 장애 대응**(우선순위 높음). 첫 단계는 피크 시간 분 단위 serverStatus 표본(읽기 전용)이다. [장애 인수인계](../handoff/2026-11-01-db-connection-rate-limit-outage.md) 참고.

### 알려진 작은 결함(리뷰에서 넘긴 Minor)

- Task 1:
  - invoice 상세 조회가 실패하면 표가 빈 채로 남는다.
  - 모든 섹션이 실패해도 exit 0이다.
  - 429 백오프가 없다.
  - dailyGb에 null이 1개라도 있으면 그날 전체가 빠진다.
  - 콘솔 표에 snapshotPolicy·restoreWindowDays가 없다.
  - accessList comment를 마스킹하지 않는다.
  - Digest 파서가 algorithm·stale을 무시한다.
- Task 2:
  - 레거시 `db.js:1059` 줄의 shared 집계를 검증하는 테스트가 없다.
  - dbPing 집계에 경고 줄이 섞인다.
  - startsWith 매칭이 줄 앞에 공백이 없다고 가정한다.
  - payment 레인에서 elapsedMs를 읽지 못하는 경우의 테스트가 없다.
- Task 3:
  - `__*TestUtils` export 3줄이 범위 밖에서 추가됐다.
  - (d) 단언이 null과 ok:false를 구분하지 않는다.
  - love-secret paymentId 분기의 fixture가 없다.
- Task 4:
  - `llm-client.ts:1305`에 `|| ""` 검사가 중복된다.
  - (d)의 정적 단언에 한계가 있다.
- Task 5:
  - `notifyOperatorsLazily`가 ops-alert.js의 사본이다.
  - `notify: undefined`·`deps.now` 잔재가 남았다.
  - `scheduled()` 결선과 `tickFailed` 이름 ↔ 로그 태그 대응을 자동으로 검사하지 않는다.
  - 전달되지 않은 태스크가 sent에도 suppressed에도 들지 않는 제3의 상태가 된다.
- Task 6:
  - 6A의 `db.find`에 projection이 없다.
  - 6B 본문 머리말 "환불·복원은 자동으로 하지 않았습니다"는 카드 초융합에는 부정확하다.
  - 제목의 건수는 조회 총수다.
  - 6A 테스트가 엉뚱한 파일에 있다.
- Task 7:
  - 장애가 풀린 뒤 같은 requestId로 재시도하는 케이스(200·1회 과금·증빙 1행) 테스트가 없다.
  - unlock 경로의 커밋 왕복 +1이 지표에 보이지 않는다. 스테이징에서 지연을 재는 것을 권한다.
  - 재생 분기의 증빙 upsert가 DB 쓰기 장애 때 재열람을 오류로 바꾼다.
  - 트랜잭션 안 E11000 뒤의 findOne 동작을 스테이징에서 확인해야 한다.
  - check:payment 출력에 무관한 실패가 섞인다.
- Task 8:
  - access 테스트의 비성공 결제 행 건너뛰기 케이스는 실제로는 나올 수 없는 모양이다.
  - 업적 목록이 두 곳에 정의돼 있다.
  - `$sum`이 숫자 문자열 delta를 0으로 본다.
  - TTL 값만 다른 인덱스는 collMod 결정이 필요하다.
- Task 10:
  - 전역 한도 429의 Retry-After 60이 일 단위 창과 맞지 않는다.
  - IP 한도에 걸린 요청이 이메일 버킷을 소모하지 않음을 고정하는 단언이 없다.
  - IP 헤더가 없으면 "unknown" 공유 버킷에 들어간다.
  - 나머지 2건은 [SECURITY-AUDIT](SECURITY-AUDIT.md#task-10-잔여-위험)에 있다.
