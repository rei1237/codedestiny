# 인프라 감사: 기준선과 이슈 현황 (2026-10-31)

- **측정 시각:** 2026-10-31 15:06~19:02 KST. 운영은 읽기 전용으로만 측정했다(GET·tail·Atlas Admin GET·읽기 전용 DB 프로브). 항목별 시각은 [출처 목록](#출처-목록)에 있다.
- **출처:** [출처 목록](#출처-목록). 원본은 모두 리포 밖 `D:\Development\code-destiny-backups\` 아래에 있고 커밋하지 않는다. IP·헤더·식별자가 들어 있기 때문이다.
- **기준 커밋:**
  - 작업 기준: origin/main `f4c5458a0`
  - 작성 시점 브랜치 HEAD: `35be53295`(브랜치 `wt/infra-optimization-20261031-150228`)
  - **운영 미배포.**
- **함께 보는 문서:**
  - 같은 보고서 묶음: [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md) · [SECURITY-AUDIT](SECURITY-AUDIT.md) · [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md) · [COST-OPTIMIZATION](COST-OPTIMIZATION.md) · [DISASTER-RECOVERY](DISASTER-RECOVERY.md) · [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md)
  - 실행 계획: [2026-10-31-infra-db-optimization](../superpowers/plans/2026-10-31-infra-db-optimization.md)
  - 인수인계: [2026-10-31-infra-db-optimization](../handoff/2026-10-31-infra-db-optimization.md)

## 결론

- **이슈 상태:** 감사에서 찾은 21건은 해결 10, 완화 6, 잔여 5다. P0 2건(F3·L1)은 모두 해결했다. 다만 모두 브랜치 커밋일 뿐 **운영 미배포**라서, 운영에 아직 효과가 없다.
- **연결 지연:** ICN 고정 뒤 공유 DB 연결 중앙값은 87ms다(n=745). DO 연결 프록시는 **도입하지 않음**으로 판정했다.
  - 이 값과 판정은 피크를 뺀 중간 tail 기준이라 **중간 판정(피크 미포함)**이다.
  - 남은 성능 위험은 연결 꼬리다(p95 2,351ms, p99 4,643ms). 자세한 내용은 [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md)에 있다.
- **등급:** M10을 유지한다. 2026-10 청구액 $80.65는 크레딧으로 전액 상쇄돼 현금 지출이 $0이다. [COST-OPTIMIZATION](COST-OPTIMIZATION.md) 참고.
- **보안:** 접근망은 사용자 결정대로 `0.0.0.0/0`을 유지하고, 보완 통제로 런북 3종을 마련했다. 가장 큰 잔여 위험은 앱 연결이 클러스터 관리자 권한(atlasAdmin)을 쓰는 점이다. [SECURITY-AUDIT](SECURITY-AUDIT.md) 참고.
- **백업:** PITR 7일과 스냅샷 정책이 켜져 있다.
  - 실측한 것: 덤프와 오프라인 무결성 검증
  - **미측정:** 실제 mongorestore 복원에 걸리는 시간
  - [DISASTER-RECOVERY](DISASTER-RECOVERY.md) 참고.
- **측정 중 새로 찾은 것 4건:**
  1. 스테이징 스모크 요청이 운영 Worker로 들어왔다.
  2. exceededResources가 7일에 50건 있었다.
  3. 프라이머리 연결이 17,523건 거부됐다. 관측 구간에는 0건이다.
  4. 느린 fetch 연결이 10분 크론 직후 분에 몰렸다.
  - [아래 절](#측정-중-새로-발견한-것) 참고.

## 출처 목록

경로는 `D:\Development\code-destiny-backups\` 기준이다. tail 원본 줄에는 IP·헤더가 있어 문서에 옮기지 않았다. 문서에 쓴 것은 집계값뿐이다.

| ID | 원본(리포 밖) | 시각·창 | 표본 | 도구 |
|---|---|---|---|---|
| T-INT | `tail\report-interim-20261031-1902.txt`(관심 라우트), `tail\report-interim-20261031-1902-all.txt`(같은 원본에 `--all`). 원본은 `tail\` 아래 세그먼트 jsonl을 19:02 KST에 떠 둔 사본 | 2026-10-31 06:09:28Z~09:59:05Z (15:09~18:59 KST), **피크 미포함** | 이벤트 1,855 | `npm run report:worker-tail-latency -- <파일> [--all]` |
| T-KIND | T-INT와 같은 tail 원본의 보조 집계: fetch/scheduled 분해, DB 사용 비중, 느린 연결 단계 | 같은 창 | 이 파서 기준 이벤트 1,857(T-INT보다 2건 많음) | 세션 스크래치 스크립트(리포 밖, 수치만 출력) |
| T-EARLY | tail 초기 66건 집계(원장 기록) | 06:09~06:47Z | 이벤트 66 | 위 두 도구 |
| CF-7D | `cf-analytics\20261031-1510-7d.json` | 2026-10-24~10-31 UTC(10-31은 부분일), measuredAt 06:07Z | 일별 8행 | CF GraphQL `workersInvocationsAdaptive` |
| CF-PATH | `cf-analytics\20261031-paths-7d.json` | 같은 7일 | 경로별 | CF GraphQL |
| CF-COLO | `cf-analytics\20261031-colo-by-date-7d.json` | 같은 7일 | 일별 | CF GraphQL(실행 colo) |
| CF-CRON | `cf-analytics\20261031-cron-status-7d.json` | 같은 7일 | **0행** | CF GraphQL |
| LAT | `latency\20261031-1512-prod.txt` | 2026-10-31T06:11Z | 10회(warmup 2) | `npm run measure:post-deploy-latency -- --base https://code-destiny.com --iterations 10` |
| ATL | `atlas-snapshots\20261031-1659\summary.json` | 2026-10-31T07:59:58Z, 부하 지표 PT1H·P30D | 연결 724표본, 네트워크 29일 | `npm run audit:atlas-readonly` |
| INV | ATL의 invoices 섹션(원장 measurements.md §청구서) | 2026-08~10 | 청구서 3건 | 같은 도구 |
| MDB | `mongodb-readonly\20261031-1542-offpeak.json` | 2026-10-31T06:42Z(15:42 KST), 60초 표본 | 1회 | 읽기 전용 프로브(serverStatus·dbStats·$collStats) |
| MDB2 | `mongodb-readonly\20261031-conn-counters.jsonl` | 17:12 KST | 1회 | serverStatus 1회 읽기 |
| IDX | `mongodb-readonly\20261031-index-drift-check.txt` | 17:06 KST | 모델 58 | `npm run migrate:reconcile-index-drift -- --check`(읽기 전용) |
| LST | `mongodb-readonly\20261031-list-indexes.json` | 08:06:49Z | 컬렉션 99 | listIndexes 전수(읽기 전용) |
| DR | `mongodb-readonly\20261031-1710-dump-verify.json`, 덤프 디렉터리의 manifest(건수만 읽음) | 17:10 KST | 컬렉션 99 | `npm run backup:mongo` + 오프라인 검증 |
| LEDGER | `.superpowers/sdd/2026-10-31-infra-db-optimization/measurements.md`, `progress.md` | 작업 원장 | — | 로컬 원장(gitignore 대상, 커밋 안 됨) |

## 기준선

Task 2 Step 3의 측정 항목이다.

- **중간 tail 값:** T-INT·T-KIND에서 온 값은 모두 **중간 판정(피크 미포함)**이다. 전체 tail이 끝나면(2026-11-01 00:40 KST) 같은 명령으로 다시 뽑아 이 표의 해당 행을 바꾼다.
- **after 열:** 운영 승격 뒤 같은 절차로 다시 잰다. 지금은 **운영 미배포로 after 미측정**이다.

| 항목 | before 값 | 측정 시각·창 | 도구(출처) | 표본 | after |
|---|---|---|---|---|---|
| 실행 위치(`cf-placement`) | remote-ICN 3/3 | 2026-10-31 (LEDGER §Workers) | `curl -D -` `/api/health` | 3 | 운영 미배포로 after 미측정 |
| 실행 colo ICN 비율 | 10-24 88%, 10-25~10-30 0.02~44%(일별 편차 큼. 10-27 0.02%, 10-29 3.4%. 일별 값은 [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#측정-조건)), 10-31 99%(3,966/4,007) | 2026-10-24~10-31 UTC | CF-COLO | 일별 | 운영 미배포로 after 미측정 |
| 라우트 wallTime p50/p95/max(ms), 상위 4개 | `GET /api/auth/me` 2/176/4,992 (n=594), `GET /api/honey/attendance` 150/482/6,775 (n=512), `GET /api/profile` 5/201/4,538 (n=294), `GET /api/rpg/characters` 1,043/6,467/6,964 (n=93) | T-INT 창 | T-INT `--all` | 이벤트 1,855 | 운영 미배포로 after 미측정 |
| 라우트 wallTime p99 | 미측정. 리포트가 p50/p95/max만 출력한다. 측정 방법: 같은 원본에 p99 열을 추가해 다시 집계 | — | — | — | — |
| DB 연결 shared p50/p95/p99(ms) | 87 / 2,351 / 4,643 | T-INT 창 | T-INT | n=745 | 운영 미배포로 after 미측정 |
| DB 연결 payment p50/p95/p99(ms) | 389 / 2,374 / 2,533 | T-INT 창 | T-INT | n=49 | 운영 미배포로 after 미측정 |
| 요청당 연결 수 | p50 1, max 2 | T-INT 창 | T-INT | 연결 있는 이벤트 | 운영 미배포로 after 미측정 |
| DB 오류 카운터 | `db-connect-error` 0, `db-op-timeout` 0, `db-op-admission` 0, `db-ping` 0, EventEmitter 누수 0 | T-INT 창 | T-INT | 이벤트 1,855 | 운영 미배포로 after 미측정 |
| 공개 GET 지연(클라이언트 측, ms) | `/api/health` p50 311.9 / p95 326.3 / max 326.3, 오류 0/10. 측정 PC↔엣지 왕복 포함. 같은 라우트의 Worker 안 wallTime은 p50 1ms(T-INT, n=19) | 2026-10-31T06:11Z | LAT | 10 | 운영 미배포로 after 미측정 |
| 인증 GET 지연 | 미측정. `CD_LATENCY_COOKIE`가 없어 `/api/payments/me`·`/api/subscription/status`를 SKIP했다. 측정 방법: 테스트 계정 쿠키를 설정하고 같은 명령 재실행 | — | LAT | — | — |
| CF 요청 수(7일) | 합계 174,639. 일별 12,942~49,822(10-31 부분일 3,859 제외) | 2026-10-24~10-31 UTC | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF CPU p50 / p99(일별 범위) | p50 9.6~31.2ms / p99 233.4~847.4ms | 같은 7일 | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF wall p50 / p99(일별 범위) | p50 30.2~653.6ms / p99 3,347.6~25,505.3ms. 장시간 스트림 응답을 따로 분리하지 않은 값 | 같은 7일 | CF-7D | 일별 8행 | 운영 미배포로 after 미측정 |
| CF 서브요청(7일) | 998,868 | 같은 7일 | CF-7D | — | 운영 미배포로 after 미측정 |
| CF 오류율(7일) | errors 50/174,639 = 0.029%(전부 exceededResources). clientDisconnected 1,385(0.79%)는 오류로 세지 않음 | 같은 7일 | CF-7D | — | 운영 미배포로 after 미측정 |
| 크론 연결(shared) p50/p95(ms) | 1,865 / 2,424. 같은 창 fetch shared는 85 / 2,338 | T-INT 창 | T-KIND | scheduled 23, fetch 722 | 운영 미배포로 after 미측정 |
| 크론 실행 colo | 미측정. tail의 scheduled 이벤트에는 colo가 없고, CF scheduled 데이터셋은 0행이다(CF-CRON). 측정 방법: 사용자가 대시보드 Cron 이벤트 화면에서 확인 | — | — | — | — |
| 큐 실행 colo | 미측정. 창 안에 queue 이벤트가 0건이다 | T-INT 창 | T-INT 원본 | 0 | — |
| Gemini 위치 오류(`User location is not supported`) | 0건 | T-INT 창 | T-INT 원본 건수 grep | 이벤트 1,855(scheduled 23) | 운영 미배포로 after 미측정 |
| DB 사용 요청 비중 | 748/1,834 = 40.8%(fetch 이벤트 중 연결 완료 줄이 있는 비율) | T-INT 창 | T-KIND | fetch 1,834 | 운영 미배포로 after 미측정 |

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
| Q1 | P2 | 매 요청 새 MongoClient를 만든다(결제 요청은 둘) | 잔여(측정 완료, 코드 변경 없음, DO 도입 안 함) | — | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#판정-규칙과-중간-판정) |
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
| exceededResources 50건/7일 | CF-7D, LEDGER | 해당 요청의 연결이 끊긴다 | 잔여(경로 미특정) | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#exceededresources-50건7일) |
| 프라이머리 연결 거부 17,523건 | MDB, MDB2 | 연결 생성률 제한(M10 노드당 15/초, Atlas 문서 2026-10-31 조회)에 걸리면 요청이 늦어지거나 실패한다 | 관측 구간(15:42~17:12) 증가 0 | [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결) |
| 느린 fetch 연결이 10분 크론 직후 분에 몰림 | 느린 연결 73건 중 52건이 분 ≡ 1(mod 10)에 있다(T-KIND) | 연결 꼬리 지연 | 원인 미확인 | [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md#꼬리-지연-위험) |

## 전후 비교

before는 위 [기준선](#기준선) 값이다. after는 모든 행이 **운영 미배포로 after 미측정**이다. 운영 승격 뒤 Task 2 Step 3을 같은 명령으로 다시 재서 채운다.

| 지표 | before | after |
|---|---|---|
| shared 연결 p50/p95/p99 | 87 / 2,351 / 4,643ms (T-INT, n=745) | 운영 미배포로 after 미측정 |
| payment 연결 p50/p95/p99 | 389 / 2,374 / 2,533ms (T-INT, n=49) | 운영 미배포로 after 미측정 |
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
| 7 | 등급 변경(M10 → 다른 등급), DO 파일럿 착수 | 해당 없음(판정상 불필요) | [COST-OPTIMIZATION](COST-OPTIMIZATION.md), [SERVER-PERFORMANCE](SERVER-PERFORMANCE.md) |
| 8 | 사용자 조치: Gemini 키 교체, 스테이징 `WORKER_ROUTE_METRICS_TOKEN` 설정, Atlas 읽기 전용 API 키 삭제 | 미실행 | [SECURITY-AUDIT](SECURITY-AUDIT.md#잔여-위험-10f) |
| 9 | 운영 배포 | **운영 미배포** | [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md) |

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
14. exceededResources 경로를 특정한다. 대시보드 Workers Logs에서 `outcome=exceededCpu`로 필터한다.

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
7. 크론·장기 연결의 exceededResources 경로.
8. 해지 링크 서명 토큰과 더블 옵트인. 10B에서 의도적으로 뺐다.
9. compass 전역 카운터를 LLM 경로에 도달한 요청만 세도록 옮긴다. [SECURITY-AUDIT](SECURITY-AUDIT.md#task-10-잔여-위험) 참고.

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
