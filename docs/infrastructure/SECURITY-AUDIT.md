# 보안 감사: 이슈 현황·보완 통제 런북·잔여 위험 (2026-10-31)

- **측정 시각:**
  - Atlas 접근 목록·DB 사용자: 2026-10-31T07:59:58Z(16:59 KST) 읽기 전용 스냅샷(ATL)
  - Worker 시크릿 이름 수: 같은 날 `wrangler secret list` 이름만(LEDGER `progress.md` 10A Step 1 사전 측정, 시각 미기록)
  - 코드 근거: 작성 시점 브랜치 HEAD
- **출처:** [INFRASTRUCTURE-AUDIT 출처 목록](INFRASTRUCTURE-AUDIT.md#출처-목록)의 ATL·LST·LEDGER와 코드 줄 번호. 접근 목록 항목, DB 사용자명, 클러스터 이름은 공개 리포라 적지 않는다.
- **기준 커밋:** origin/main `f4c5458a0`. 작성 시점 브랜치 HEAD는 `35be53295`다. **운영 미배포.** 아래 "해결"은 브랜치 기준이며 운영에는 아직 없다.
- **함께 보는 문서:**
  - 이슈 전체와 승인 항목: [INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md)
  - 결제 멱등 인덱스 실물(S5): [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#결제-멱등-unique-인덱스와-ttl-10d)
  - 장애 대응과 알림 채널: [DISASTER-RECOVERY](DISASTER-RECOVERY.md)
  - 배포·롤백: [DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md)
  - 2026-10-18 애플리케이션 보안 감사: [application-security-20261018](../security/application-security-20261018.md)
  - 2026-10-13 보안 후속: [security-followups-codex-2026-10-13](../handoff/security-followups-codex-2026-10-13.md)
  - 2026-09 이니시스 보안 권고: [inicis-security-advisory-2026-09](../handoff/inicis-security-advisory-2026-09.md)

## 결론

- HIGH 4건 중 S1은 해결했고 S2는 완화했다. S3·S4는 잔여다.
  - S3: 접근 목록 `0.0.0.0/0`은 사용자 결정으로 유지한다. 대신 보완 통제 런북 3종을 아래에 둔다. 실행은 사용자가 Atlas UI에서 한다.
  - S4: Capacitor 권고(N-01)는 Android 재출시가 필요해 별도 릴리스로 뺐다.
- MED 4건 중 S5는 해결(결제 unique 누락 0, 읽기 전용 확인)했다. S6·S7은 완화, S8은 잔여다.
- 가장 큰 잔여 위험은 앱 DB 사용자의 권한이다.
  - 앱 연결이 `atlasAdmin`을 포함한 클러스터 관리자 권한을 쓰고 있다.
  - 접근 목록이 열려 있으니 DB 비밀번호 한 개가 클러스터 전체를 지킨다.
  - [런북 2](#런북-2-앱-사용자-최소-권한)를 [런북 1](#런북-1-db-비밀번호-교체)보다 먼저 하면 교체도 함께 끝난다.
- 이번 작업은 코드 4건(W-1·W-6·W-10·E-1)과 레이트리밋 2건(10B·10C)만 바꿨다. 나머지는 [잔여 위험 표](#잔여-위험-10f)에 위험도·권장 조치·필요 승인과 함께 적었다.

## 현재 상태 (10E Step 1)

출처는 ATL과 LEDGER `measurements.md` §보안 표면이다. 개별 값은 공개 리포라 적지 않고 개수와 종류만 적는다.

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| Atlas 접근 목록 | 3개: 단일 호스트 2개 + `0.0.0.0/0` | `0.0.0.0/0`이 있으니 나머지 2개는 실효가 없다. Workers 아웃바운드 IP가 고정되지 않아 좁히면 운영 연결이 끊길 수 있다 |
| DB 사용자 | 2명 | 한 명은 `atlasAdmin`(admin DB), 다른 한 명은 `readWriteAnyDatabase`(admin DB) |
| 앱 연결의 실효 역할 | `atlasAdmin`, `backup`, `clusterMonitor`, `dbAdminAnyDatabase`, `enableSharding`, `readWriteAnyDatabase` | 로컬 운영 URI로 `connectionStatus`를 읽은 값이다. Worker 시크릿이 같은 사용자인지는 값을 볼 수 없어 **미확인**이다. 리포 관례상 같다고 추정한다 |
| 스테이징과 운영의 DB 자격 | 같은 자격일 가능성이 높다 | 근거: `scripts/sync-cloudflare-worker-secrets.mjs:31-32` 주석 "같은 MONGO_URI, 다른 결제 자격증명". DB 이름만 vars로 다르다(`worker/wrangler.toml:156` `code_destiny`, `worker/wrangler.staging.toml:235` `code_destiny_staging`). 실제 시크릿 값 비교는 **미확인** |
| Worker 시크릿 | 운영 54개(`WORKER_ROUTE_METRICS_TOKEN` 있음), 스테이징 26개(없음) | 이름만 셌다 |
| 인덱스 자동 생성 | 꺼짐(`autoIndex:false`, `autoCreate:false`, `worker/lib/db.js`) | 런타임 `createIndex`는 1곳뿐이다(`worker/routes/ziwei-daehan.js:31-43`, `daehan_purchases`). 앱 사용자에게 인덱스 관리 권한을 따로 줄 필요가 없다 |

## 보안 이슈 현황

- 상태 정의는 [INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md#이슈-현황-위험도별)와 같다.
- 감사 원문과 근거 줄 번호는 실행 계획 Context 표에 있다.

| # | 위험도 | 요약 | 상태 | 커밋 | 남은 것 |
|---|---|---|---|---|---|
| S1 | HIGH | 구독 해지 페이지 반사형 XSS | 해결 | `83c7e699a` fix(security): escape email on daily-fortune unsubscribe page (W-1) | 없음(운영 미배포) |
| S2 | HIGH | 일일운세 구독 POST에 인증·레이트리밋 없음 | 완화 | `e0f276362` IP 5회/시간, 이메일 3회/24시간 | 해지 링크 서명·더블 옵트인 없음. [Task 10 잔여 위험](#task-10-잔여-위험) |
| S3 | HIGH | 접근 목록 `0.0.0.0/0`, DB 비밀번호가 유일한 장벽 | 잔여(유지 결정) | — | [보완 통제 런북](#보완-통제-런북-10e) 3종. 실행은 사용자 |
| S4 | HIGH | Capacitor 8.4.1 critical 권고 | 잔여 | — | N-01(8.4.3 + Android 재출시) 별도 릴리스 |
| S5 | MED | 운영 unique·TTL 인덱스 실물 미확인 | 해결 | — (listIndexes 읽기 전용, LST) | 결제 unique 누락 0. 비결제 소형 인덱스 생성은 승인 항목 |
| S6 | MED | 무로그인 LLM 라우트에 전역 한도 없음 | 완화 | `014703a08` 전역 일일 300 | 카운터 위치. [Task 10 잔여 위험](#task-10-잔여-위험) |
| S7 | MED | 미병합 보안 커밋 W-6·W-10·E-1·N-02 | 완화 | `9872dd9a8` (W-6), `4aef96200` (W-10), `4aedaf1a8` (E-1), `04326da13` CORS 허용 목록 고정 테스트 | N-02(next 권고 2건) 잔여 |
| S8 | MED | Gemini 키 미교체, 관리자 MFA 없음(M2), 탈퇴자 토큰 30분(R-01) | 잔여 | — | [잔여 위험 표](#잔여-위험-10f) |

검증(LEDGER, Task 10 보고):

- `npm run test:jest -- __tests__/worker`: 421 suites / 6884 tests PASS.
- `npm run check:fast`: BLOCKED. `test:node`에 origin/main부터 있던 실패 14건이 있다. 이번 변경과 무관한 파일이다([INFRASTRUCTURE-AUDIT 코드 후속](INFRASTRUCTURE-AUDIT.md#코드-후속이번-범위-밖) 1번).

## 보완 통제 런북 (10E)

접근 목록을 `0.0.0.0/0`으로 두는 대신 아래 세 가지를 쓴다. 이 작업의 Atlas 키는 읽기 전용이라 실행할 수 없다. 사용자가 Atlas UI에서 실행하고, 실행 뒤 연결 유지는 아래 확인 단계로 본다.

### 공통 규칙

- 비밀번호·URI는 채팅, 문서, 커밋, 명령 인자에 쓰지 않는다. `wrangler secret put`은 값을 프롬프트로 받는다.
- 로컬 `.env.local`·`.env.staging.local`도 함께 바꾼다.
  - `npm run secrets:cf:worker`(`scripts/sync-cloudflare-worker-secrets.mjs`)는 이 파일들의 값을 Worker 시크릿으로 덮어쓴다.
  - 옛 값이 남아 있으면 나중에 동기화할 때 폐기된 자격이 다시 들어간다.
- Worker는 Mongo URI를 `MONGO_URI` → `MONGODB_URI` → `MONGO_URL` 순으로 읽는다(`worker/lib/db.js:472-474`). 먼저 `wrangler secret list`로 셋 중 어느 이름이 설정돼 있는지 보고, 설정된 이름을 모두 바꾼다.
- Worker는 요청마다 새 MongoClient를 만든다(Q1). 시크릿을 바꾸면 다음 요청부터 새 자격으로 접속한다.
- 스테이징 확인 요청이 스테이징 Worker에 닿는지 반드시 본다.
  - 스테이징 Pages는 `API_WORKER_ORIGIN`이 없으면 운영 Worker로 떨어진다(`public/_worker.js:347`).
  - 이번 측정에서 스테이징 스모크가 운영에 닿은 기록이 있다([INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md#측정-중-새로-발견한-것)).

### 기존 서비스 연결 유지 확인

각 런북의 "확인" 단계는 이 절차를 가리킨다.

| # | 확인 | 통과 기준 |
|---|---|---|
| C1 | 대상 Worker의 tail을 연다. 스테이징은 `wrangler tail --config worker/wrangler.staging.toml`, 운영은 `wrangler tail --config worker/wrangler.toml` | 아래 C2 요청이 이 tail에 찍힌다(다른 환경에 닿지 않았다) |
| C2 | DB를 읽는 무로그인 GET: `GET /api/insights`(공개 목록 집계, Q3) | 200. `GET /api/health`는 DB를 읽지 않아(`worker/index.js:1082-1100`) 연결 확인이 안 된다 |
| C3 | 로그인 상태 GET: `GET /api/auth/me`(테스트 계정) | 인증됨으로 응답한다 |
| C4 | C1 tail을 10분 저장해 `npm run report:worker-tail-latency -- <파일>` | counters의 `db-connect-error=0`, HTTP 503 0건 |
| C5 | 운영만: `npm run measure:post-deploy-latency -- --base https://code-destiny.com --iterations 10` | 오류 0. 기준선은 LAT([SERVER-PERFORMANCE](SERVER-PERFORMANCE.md)) |

### 런북 1. DB 비밀번호 교체

목적은 이력에 노출된 사용자명과 짝을 이루는 비밀번호를 바꾸는 것이다.

- 기존 사용자의 비밀번호를 그 자리에서 바꾸지 않는다. 바꾸는 순간 옛 비밀번호로 접속하는 운영 Worker의 인증이 모두 실패한다.
- 그래서 새 사용자를 만들어 옮긴 뒤 옛 사용자를 지운다.
- [런북 2](#런북-2-앱-사용자-최소-권한)를 실행하면 이 런북은 거기에 포함된다.

| 단계 | 할 일 | 확인 |
|---|---|---|
| 0 | 기준선을 잡는다. 운영에서 C2~C5를 한 번 돌려 결과를 남긴다 | 기준선 기록 |
| 1 | Atlas UI → Database Access → 새 DB 사용자를 만든다. 이름은 옛 사용자와 다르게, 비밀번호는 자동 생성, 역할은 런북 2의 운영 앱 역할(런북 2를 미루면 현행과 같은 역할) | UI에서 변경 배포 완료 표시 |
| 2 | 새 URI를 만든다. 기존 URI에서 사용자·비밀번호 부분만 바꾸고, 특수문자는 퍼센트 인코딩한다 | 로컬에서만 보관 |
| 3 | 스테이징 시크릿을 바꾼다: `wrangler secret put MONGO_URI --config worker/wrangler.staging.toml`(설정된 다른 이름도 같은 방식). `.env.staging.local`도 바꾼다 | 스테이징에서 C1~C4 통과 |
| 4 | 운영 시크릿을 바꾼다: `wrangler secret put MONGO_URI --config worker/wrangler.toml`. `.env.local`도 바꾼다 | 운영에서 C1~C5 통과 |
| 5 | 관찰한다. 크론(`0 22 * * *`, `*/10 * * * *`, `worker/wrangler.toml:291`)이 최소 한 바퀴 돌 때까지 둔다. 다음 날 22:00 UTC 일일 크론을 넘기는 것을 권장한다 | C4를 다시 돌려 `db-connect-error=0` |
| 6 | 옛 사용자를 Atlas UI에서 삭제한다 | 삭제 직후와 10분 뒤에 운영 C2~C4 통과 |
| 7 | 로컬 도구를 확인한다. `npm run backup:mongo`, 감사·복구 스크립트가 새 URI로 동작하는지 본다(읽기 전용 명령으로) | 백업 1회 성공 |

롤백:

- 5단계까지: 바꾼 시크릿을 옛 URI로 다시 `wrangler secret put`한다. 옛 사용자가 살아 있으니 다음 요청부터 복구된다.
- 6단계 뒤: 같은 이름·같은 비밀번호로 옛 사용자를 다시 만든다. 그러려면 교체가 끝날 때까지 옛 URI를 로컬 안전한 곳에 둔다. 롤백한 경우에는 이 런북을 처음부터 다시 한다.
- `npm run deploy:rollback`으로 옛 Worker 버전으로 돌아갈 때 시크릿이 어떻게 붙는지는 이 문서에서 확인하지 않았다(미확인). 옛 사용자 삭제(6단계) 전에 배포 롤백이 필요하면 C2로 연결부터 본다.
- 리포 밖에서 같은 자격을 쓰는 소비자가 있는지는 미확인이다. 6단계 뒤 문제가 생기면 그 소비자부터 찾는다.

### 런북 2. 앱 사용자 최소 권한

현재 앱 연결에는 `atlasAdmin`이 있다(현재 상태 표). 앱에 필요한 것은 자기 DB의 읽기·쓰기다.

| 사용자(이름은 사용자가 정함) | 권한 | 용도 |
|---|---|---|
| 운영 앱 | DB `code_destiny`의 `readWrite` | 운영 Worker `MONGO_URI` |
| 스테이징 앱 | DB `code_destiny_staging`의 `readWrite` | 스테이징 Worker `MONGO_URI`. 운영과 분리해 스테이징 자격이 새도 운영 DB에 닿지 않게 한다 |
| 운영자 도구 | 두 DB의 `readWrite`·`dbAdmin` + `clusterMonitor` | `npm run backup:mongo`, 인덱스 마이그레이션, 읽기 전용 프로브(serverStatus), `recover-*` 스크립트. 로컬 `.env.local`에만 둔다 |

`readWrite`로 충분하다는 근거:

- 앱은 `code_destiny` 밖의 DB를 열지 않는다. `useDb`·`client.db("...")` 호출이 없다(`worker/` 검색).
- 관리 명령은 `ping`뿐이다(`worker/lib/db.js:823`).
- 런타임 `createIndex` 1곳(`worker/routes/ziwei-daehan.js:31-43`)은 `readWrite`에 포함된 동작이다.
- 결제 트랜잭션도 `readWrite`로 된다.

| 단계 | 할 일 | 확인 |
|---|---|---|
| 0 | 스테이징 Worker가 실제로 `code_destiny_staging`을 쓰는지 확인한다. `resolveMongoDbName`(`worker/lib/db.js:462-468`)은 시크릿 `MONGO_DB_NAME`·`MONGO_NAME`을 vars `MONGODB_DB_NAME`보다 먼저 본다. 스테이징 시크릿 이름 목록에 이 둘이 있는지는 **미확인**이다 | 둘 다 없거나, 있다면 값이 `code_destiny_staging`. 아니면 스테이징 사용자 권한 대상 DB를 실제 값에 맞춘다 |
| 1 | Atlas UI에서 위 표의 세 사용자를 만든다. 역할 이름은 Atlas UI의 Specific Privileges 표기로 확인한다 | UI에서 변경 배포 완료 표시 |
| 2 | 스테이징 앱 URI를 스테이징 시크릿과 `.env.staging.local`에 넣는다 | 스테이징 C1~C4 통과. 추가로 스테이징에서 로그인 → 보관함 열람 → `/api/health`([DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md) Task 13 수동 확인과 같은 경로) |
| 3 | 운영 앱 URI를 운영 시크릿에 넣는다 | 운영 C1~C5 통과. tail에 권한 오류(`not authorized`) 0건 |
| 4 | 운영자 도구 URI를 `.env.local`에 넣는다(운영 Worker 시크릿에는 넣지 않는다) | `npm run backup:mongo` 1회, `npm run migrate:reconcile-index-drift -- --check` 1회 성공(둘 다 쓰기 없음) |
| 5 | 관찰한다. 일일 크론 한 바퀴 이상. 결제가 있었다면 `[pay]` 줄에 권한 오류가 없는지 본다 | C4 재실행 |
| 6 | 옛 두 사용자를 삭제한다 | 런북 1의 6단계와 같다 |

롤백:

- 6단계 전: 해당 환경 시크릿을 옛 URI로 되돌린다. 권한 오류는 다음 요청부터 사라진다.
- 6단계 뒤: 런북 1의 롤백과 같다.
- 권한 부족이 특정 기능에서만 나면 운영 앱 사용자에 필요한 동작만 더한다. `atlasAdmin`으로 되돌리지 않는다.

### 런북 3. Atlas 경보 권장 목록

경보는 연결에 손대지 않는다. 다만 감사 로그를 켜는 경우에는 C2·C5로 지연이 기준선과 같은지 본다.

- 임계값의 "제안"은 측정값이 아니라 정책 값이다. 30일 실측 최대치의 배수로 계산했다(ATL).
- Atlas 경보 유형의 정확한 이름은 UI에서 확인하지 않았다(미확인).
- 프로젝트에는 경보 설정이 이미 53개 있다(ATL `alertConfigCount`). 스냅샷에는 개수만 있어 어떤 유형이 켜져 있는지는 미확인이다. 추가하기 전에 UI에서 중복부터 본다.
- 감사 로그 설정은 읽기 전용 키로 읽히지 않았다(ATL `auditLog`: HTTP 401). 데이터베이스 감사가 켜져 있는지는 미확인이다.

| 경보 | 대상 | 제안 임계값 | 근거 | 대응 |
|---|---|---|---|---|
| 연결 수 급증 | 각 노드의 현재 연결 수 | 300 이상 5분 지속 (= 30일 노드 max 100 × 3) | ATL 30일 max 100, 노드 한도 1,500(MDB). 300은 한도의 20% | [DISASTER-RECOVERY](DISASTER-RECOVERY.md#런북-1-db-connect-error-급증)와 [SERVER-PERFORMANCE 확장 계획](SERVER-PERFORMANCE.md#확장-계획-임계값--단계) |
| 인증 실패 | 클러스터 인증 이벤트 | 평시 0 기준, 1건 이상이면 알림 | 비밀번호가 유일한 장벽(S3) | 실패 원천 확인. 계속되면 런북 1 |
| 접근 목록 변경 | 프로젝트 이벤트 | 변경 1건 | `0.0.0.0/0` 유지 결정의 감시 | 본인 변경인지 확인 |
| DB 사용자 생성·삭제·역할 변경 | 프로젝트 이벤트 | 변경 1건 | 런북 2 이후 권한 유지 감시 | 본인 변경인지 확인 |

- 인증 실패를 바로 세는 기본 경보가 UI에 없으면 데이터베이스 감사(Database Auditing)로 인증 이벤트를 남기는 방법이 있다. 감사는 추가 비용이 있을 수 있고 단가는 청구서에 없어 미측정이다.
- 수신처: Atlas 프로젝트 소유자 이메일. 앱 쪽 운영 알림 채널은 [DISASTER-RECOVERY 알림 채널](DISASTER-RECOVERY.md#알림-채널-목록)에 있다.
- 롤백: 경보를 끄거나 지운다. 감사를 켰다면 끈다.

## Task 10 잔여 위험

| 위험 | 영향 | 현재 완화 | 권장 조치 | 필요 승인 |
|---|---|---|---|---|
| compass 전역 카운터가 본문 검증보다 먼저 센다 | IP 한도는 30/분이라, IP 하나로 300/일을 약 10분(= 300 ÷ 30)에 소진할 수 있다. 소진되면 그날 나머지는 모든 사용자가 결정론 템플릿 문장을 본다(`worker/routes/destiny-compass.js:19`). 화면은 비지 않는다(graceful) | 유료 생성과 Gemini 지출은 이 한도로 보호된다 | 전역 카운터를 LLM 호출 직전(검증 통과 뒤)으로 옮긴다. IP별 일일 상한을 더한다 | 코드 변경(새 범위) |
| 남의 이메일로 하루 3회 구독 POST | 그 주소의 주인이 그날(24시간 창) 구독하지 못한다(429) | IP 5회/시간 | 더블 옵트인 도입 뒤 이메일 한도를 확인 메일 발송에만 적용 | 코드 변경 |
| 해지 링크 서명·더블 옵트인 없음 | 주소만 알면 남을 구독시킬 수 있다. 주소당 하루 3통까지 실메일이 간다 | 10B 레이트리밋 | 서명된 해지 토큰, 더블 옵트인. 10B에서 의도적으로 뺐다 | 코드 변경 |
| 클라이언트 IP가 없는 요청이 버킷 하나를 공유 | IP 없는 요청끼리 시간당 5회를 나눠 쓴다 | 운영은 항상 `cf-connecting-ip`가 있어 영향이 낮다 | 없음(관찰) | — |
| 스테이징 `/api/health/route-metrics` 닫힘 | W-6 뒤 스테이징에 `WORKER_ROUTE_METRICS_TOKEN`이 없어 지표를 못 본다. 고객 경로 영향 없음 | 운영에는 토큰이 있다 | 사용자: `wrangler secret put WORKER_ROUTE_METRICS_TOKEN --config worker/wrangler.staging.toml` | 사용자 조치 |
| `measure:post-deploy-latency`의 route-metrics 단계 | 측정하는 셸에 `CD_ROUTE_METRICS_TOKEN`이 있어야 한다 | — | 측정 시 환경변수로만 주고 저장하지 않는다 | — |

## 잔여 위험 (10F)

이번 범위에서는 코드를 바꾸지 않았다. 위험도는 감사 원문 등급을 따른다. 원문 등급이 없는 항목은 이 문서의 판단이고 "판단"이라고 적었다.

| 항목 | 위험도 | 내용 | 권장 조치 | 필요 승인 |
|---|---|---|---|---|
| S3 접근 목록 `0.0.0.0/0` | HIGH | DB 비밀번호가 유일한 장벽이다 | 유지(사용자 결정). 런북 1~3으로 보완 | 승인 3(런북 실행) |
| 앱 사용자 `atlasAdmin` | HIGH(판단, S3의 일부) | 앱 자격이 새면 클러스터 관리까지 넘어간다 | [런북 2](#런북-2-앱-사용자-최소-권한) | 승인 3 |
| 스테이징·운영 DB 자격 공유 가능성 | MED(판단) | 스테이징 자격이 새면 운영 DB에도 닿는다 | 런북 2에서 환경별 사용자로 분리 | 승인 3 |
| Gemini 키 노출(S8) | MED | 키가 도구 응답에 한 번 노출됐고 교체되지 않았다 | 순서: 새 키 발급 → `wrangler secret put`(스테이징 → 운영) → 스테이징 생성 확인(mock 아님, 운영 승격 승인 범위 안에서) → 구 키 폐기. Worker는 `GEMINIF_API_KEY`·`GEMINI_API_KEY`·`GOOGLE_GEMINI_API_KEY`를 본다(`worker/lib/gemini.js:38-44`). 설정된 이름을 모두 바꾸고 `.env.local`도 바꾼다 | 사용자 조치. 스테이징 실생성 확인은 운영 승격 승인 범위 |
| N-01 Capacitor 8.4.3(S4) | HIGH | Capacitor 8.4.1 critical 권고 | 별도 릴리스로 8.4.3 반영 + Android 재출시 | 승인 4(`package-lock.json` 변경) + 스토어 출시 |
| N-02 next 권고 2건(S7) | MED | next 15.5.15 권고 | 별도 브랜치에서 승격 | 승인 4 |
| M2 관리자 인증(S8) | MED | 관리자 공용 비밀번호에 MFA·개별 폐기가 없다(`worker/routes/admin.js:2730` 부근) | 관리자별 계정과 MFA, 개별 세션 폐기. 또는 관리자 경로 앞단 접근 통제 | 코드·인프라 변경(새 범위) |
| R-01 탈퇴자 토큰(S8) | MED | 결제·선물은 서명·만료만 본다. 탈퇴 뒤에도 남은 access token 수명(기본 30분) 동안 유효하다([application-security-20261018 §3 A](../security/application-security-20261018.md#a-인증세션)) | 결제·선물 경로에 탈퇴 상태 확인 추가 | 코드 변경 |
| 스테이징 Pages `API_WORKER_ORIGIN` 폴백 | MED(판단) | 미설정이면 스테이징 화면의 API 호출이 운영 Worker로 간다(`public/_worker.js:347`). 스테이징에서 로그인·결제하면 운영 DB에 닿을 수 있다 | 사용자: 스테이징 Pages 변수 확인. 후속: 스테이징에서 미설정이면 실패하도록(fail-closed) | 사용자 조치 + 코드 변경 |
| DR 덤프의 개인정보 | MED(판단) | `npm run backup:mongo` 전량 덤프(83MB)가 리포 밖 로컬 디스크에 있다 | 보관 기간을 정하고, 보관하면 암호화, 아니면 파기 | 사용자 결정 |
| Atlas 읽기 전용 API 키 | LOW(판단) | 측정용 키가 남아 있다 | 측정이 끝나면 삭제 | 사용자 조치 |
| fortune-chat 세션 증가 | LOW | `fortuneChatSessions` 스키마에 TTL 인덱스가 없다. 비회원 bootstrap도 세션을 만든다(`worker/lib/models.js:1813-1827`). 현재 건수·증가율은 미측정 | `$collStats`로 건수·증가율을 잰 뒤 TTL 또는 사용자별 상한 | 코드 변경 |
| 가입 레이트리밋 | LOW | 감사에서 가입 경로 레이트리밋 보강이 LOW로 분류됐다. 현행 한도의 세부는 이 문서에서 다시 확인하지 않았다 | 10B와 같은 IP·식별자 레이트리밋 | 코드 변경 |
| 웹훅 타임스탬프 창 | LOW | 24시간 창과 관대한 파싱. 재전송 지평에 맞춘 의도적 설계다([inicis-security-advisory-2026-09](../handoff/inicis-security-advisory-2026-09.md)) | 유지. 1차 방어인 `{provider,eventId}` unique는 운영에 있다([MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#결제-멱등-unique-인덱스와-ttl-10d)) | — |
| `workers_dev = true` | LOW | `worker/wrangler.toml:10`. Worker가 workers.dev 주소로도 열려 있어 커스텀 도메인 앞단 규칙을 우회할 수 있다 | workers.dev 주소를 쓰는 도구·측정이 없는지 확인한 뒤 끈다 | 설정 변경 + 배포 |
| CSP `unsafe-inline`·`unsafe-eval` | LOW | 레거시 연동 때문에 남아 XSS 방어 심도가 제한된다([application-security-20261018 §3 G](../security/application-security-20261018.md#g-인프라공급망ci)) | nonce·hash 기반으로 단계적 전환 | 코드 변경 |
| Actions SHA 고정 | LOW | 외부 Action이 태그(`@v4`) 참조다(같은 §3 G) | 커밋 SHA로 고정 | CI 설정 변경 |
