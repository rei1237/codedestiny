# 배포 보고서: 변경 목록·배포 경로·롤백·검증 (2026-10-31)

- **측정 시각:** 2026-10-31 작성. 검증 수치는 SDD 원장(LEDGER)에 기록된 시점의 값이다.
- **출처:**
  - `git log f4c5458a0..35be53295`(커밋 본문의 위험·롤백 메모)
  - LEDGER(Task별 검증, Task 13 Step 1 부분 실측)
  - `.github/workflows/cloudflare-pages-deploy.yml`, `scripts/deploy-safe.mjs`, `scripts/lib/production-deploy-guard.mjs`
- **기준 커밋:** origin/main `f4c5458a0`. 작성 시점 브랜치 HEAD는 `35be53295`다.
- **상태: 운영 미배포.** 스테이징 push도 아직 하지 않았다.
- **함께 보는 문서:**
  - 이슈 현황·승인 항목: [INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md#승인-필요-항목)
  - 장애 시 롤백 절차: [DISASTER-RECOVERY 런북 4](DISASTER-RECOVERY.md#런북-4-배포-롤백)
  - 배포 뒤 연결 확인: [SECURITY-AUDIT](SECURITY-AUDIT.md#기존-서비스-연결-유지-확인)

## 결론

- 코드 변경은 Task 1~8과 Task 10의 23개 커밋이다. RED(결제 경로)는 Task 3과 Task 7 두 건이다. 둘 다 2026-10-31에 **테스트 → 스테이징까지** 승인됐다.
- 운영 DB 데이터·인덱스를 바꾸는 커밋은 없다. 운영 인덱스 생성은 승인 항목이며 실행하지 않았다.
- 배포 경로는 하나다.
  - 스테이징: origin/main 위에 이 브랜치 커밋만 cherry-pick해 push한다.
  - 운영: 사용자의 1회성 명시 요청이 있을 때만 GitHub Actions에서 승격한다.
- **운영 미배포.** 그래서 모든 전후 비교의 after는 "운영 미배포로 after 미측정"이다([INFRASTRUCTURE-AUDIT 전후 비교](INFRASTRUCTURE-AUDIT.md#전후-비교)).
- Task 13(검증 → 스테이징 → 운영)은 아직 끝나지 않았다. [검증 결과](#검증-결과)는 컨트롤러가 채운다.

## 변경 목록

분류: GREEN = 결제·DB 의미 변경 없음. RED = 결제 경로. docs = 문서만.

| Task | 내용 | 커밋 | 분류 | 런타임 |
|---|---|---|---|---|
| 0 | 실행 계획·인수인계 문서 | `b82ff0f3d` | docs | 없음 |
| 1 | Atlas Admin API 읽기 전용 감사 도구, 허용 목록 우회 차단 | `a452d553b`, `fa5156d3b` (문서 `ed5016461`) | GREEN | 없음(`scripts/`만) |
| 2 | tail 지연 리포트에 DB 연결 단계 집계 | `02441bcac` (문서 `2ddbdcfa1`) | GREEN | 없음(`scripts/`만) |
| 3 | 지연차감 cancel이 환불 기록을 되살리지 않음(R3), cancel 기록을 재시도 증빙으로 인정(F3) | `4de80b27c` (문서 `8afd81c2c`) | **RED** | Worker 결제 라우트 |
| 4 | LLM in-flight dedup을 요청 스코프로 한정 | `238ec6554` (문서 `9908587f5`) | GREEN | LLM 캐시(`lib/`) |
| 5 | 10분 크론 태스크 실패를 시간당 1회 운영자 알림으로(C5) | `7a40ea881` (문서 `84d4ce45a`) | GREEN | Worker 10분 크론 |
| 6 | 자동환불 소진(`refund_failed`) 알림(R1), 유료 결과 전달 검토 대기 알림(R2), null 부모 표식 보완 2건 | `fd6b578e4`, `081f02e02`, `f81b7bf36`, `c322f998f` (문서 `20b0c82f8`) | GREEN | Worker 10분 크론 |
| 7 | 이용권 영구 해금의 지급·소비·증빙을 단일 트랜잭션으로, CAS 패배 시 환불 이력 삭제 대신 abort | `14dfd4d17`, `927b56623` (문서 `00607599b`) | **RED** | Worker 결제 라우트 |
| 8 | 백필 증빙 N+1 → `$in` 1회, insights 집계 재시도, ops-hq XP `$group`, 드리프트 TTL 비교 | `8ce66f1a0`, `a9d025f93`, `34f7ae386`, `30ef0c7ac` (문서 `bb8f4e1ff`) | GREEN | Worker 라우트(`30ef0c7ac`은 마이그레이션 스크립트만) |
| 9 | Task 9 판정(코드 변경 없음) | 이 보고서 커밋에 포함 | docs | 없음 |
| 10 | W-1·W-6·W-10·E-1 반영(cherry-pick 4), CORS 단언, 일일운세 구독 레이트리밋(10B), 운명의 지도 전역 일일 한도(10C) | `83c7e699a`, `9872dd9a8`, `4aef96200`, `4aedaf1a8`, `04326da13`, `e0f276362`, `014703a08` (문서 `35be53295`) | GREEN | Worker 라우트·CORS |
| 11·12 | 오프라인 DR 리허설 기록, 이 보고서 묶음 | 이 보고서 커밋 | docs | 없음 |

- `081f02e02`은 원장에 `d8e0624cc`로 처음 기록된 커밋의 메시지 수정본이다(LEDGER).
- Task 6이 `config/mongo-query-index-allowlist.json`을 바꿨다(`081f02e02`). 인덱스를 만들지는 않는다.

### 변경별 롤백

스테이징에서는 해당 커밋을 `git revert <sha>`해 main에 push하면 된다. main push가 스테이징 배포를 예약한다. 운영 승격 뒤에는 두 방법이 있다.

- 릴리스 전체를 되돌린다: [DISASTER-RECOVERY 런북 4](DISASTER-RECOVERY.md#런북-4-배포-롤백)(`mode=rollback`).
- 한 변경만 뺀다: revert 커밋 → 스테이징 → 다시 운영 승격.

| Task | 되돌리면 | 남는 데이터 | 권고 |
|---|---|---|---|
| 1·2 | 운영자 도구만 사라진다 | 없음 | 언제든 가능 |
| 3 | cancel이 환불·취소 기록을 다시 `generation_failed`로 되살릴 수 있다. 재시도 증빙 불인정(이중 결제 요구)도 돌아온다 | 없음(스키마 변경 없음) | 회귀가 확인될 때만 |
| 4 | 요청 간 Promise 공유가 돌아온다 | 없음 | 회귀가 확인될 때만 |
| 5 | 10분 크론 실패 알림이 멈춘다 | `idempotency_keys`의 선점 행 | 가능 |
| 6 | R1·R2 알림이 멈춘다 | 이미 찍힌 표식 필드(`reviewAlertAt`, `refundFailureAlert`). 기준 커밋 `f4c5458a0`의 `worker/`에는 이 이름을 읽는 코드가 없다(`git grep` 0건) | 가능 |
| 7 | 해금 경로가 트랜잭션 없는 5단계 쓰기로 돌아간다. CAS 패배 시 환불 이력 행 삭제도 돌아온다 | 없음 | 회귀가 확인될 때만 |
| 8 | 쿼리 모양만 옛 것으로 돌아간다 | 없음 | 가능 |
| 10 W-1·W-6·W-10·E-1 | 보안 수정이 풀린다(W-6을 되돌리면 route-metrics가 다시 열린다) | 없음 | 권하지 않는다 |
| 10B·10C | 레이트리밋·전역 한도가 사라진다 | 카운터 행 | 가능 |

## 배포 경로

1. **배포 트리를 만든다.** origin/main 최신 위에 이 브랜치 커밋(`f4c5458a0..HEAD`)만 cherry-pick한다.
   - 공유 체크아웃의 로컬 main은 쓰지 않는다. 남의 미push 커밋이 섞일 수 있다.
   - 컨트롤러가 origin/main `1592b6013` 위에 33개를 무충돌로 올린 배포 트리를 만들었다. 겹치는 파일은 0이다(LEDGER).
   - 이 보고서 커밋이 34번째다.
   - 작성 시점 로컬 origin/main은 `c110fc2f1`이다. `1592b6013`보다 7커밋 앞서 있어, push 전에 다시 올려야 한다.
2. **스테이징.** `git push origin main` → main CI(`pr-ci.yml`, "CI required") → `workflow_dispatch(mode=staging)` 예약 → staging.code-destiny.com.
   - 스테이징은 RED 변경의 승인 한계다.
3. **운영.** 사용자의 1회성 명시 요청이 있을 때만 한다.
   - GitHub Actions `Release Cloudflare Pages and Worker` → Run workflow, `mode=production`.
   - 로컬 `npm run deploy:production`은 `scripts/lib/production-deploy-guard.mjs`가 막는다(CI 밖).
   - 승격 뒤에는 Task 2 Step 3을 같은 명령으로 다시 재서 [전후 비교](INFRASTRUCTURE-AUDIT.md#전후-비교)의 after를 채운다.
4. **배포 뒤 확인.**
   - `node scripts/verify-deployed-sha.mjs --sha=<배포 SHA> --origin=<대상 출처>`
   - [SECURITY-AUDIT 연결 유지 확인](SECURITY-AUDIT.md#기존-서비스-연결-유지-확인) C1~C5. C5 `measure:post-deploy-latency`는 운영 전용이고 `CD_ROUTE_METRICS_TOKEN`이 필요하다(W-6).

## Task 13 스테이징 확인 항목

| Step | 내용 | 통과 조건 |
|---|---|---|
| 1 | `npm run check:fast`, `npm run test:jest`, `npm run check:payment`, `npm run verify:worker-size`, `npm run verify:mongo-query-index-shapes`를 **배포 트리**에서 실행 | 전부 PASS. 사전 실패는 merge-base에서도 실패하는지로 가른다 |
| 2 | 배포 트리를 push(= 스테이징) → CI "CI required" green → `npm run verify:staging` | green, verify PASS |
| 3 | 스테이징 수동 확인(mock LLM, 테스트 결제 없음) | 로그인; 보관함 열람; 지연차감 상품 취소 → 재시도에서 결제창이 뜨지 않음(Task 3); `/api/health` 200 |
| 3+ | RED 추가 확인 | Task 7 이용권 unlock 트랜잭션의 레플리카셋 동시성과 트랜잭션 안 E11000 재시도. ops-hq XP `$group` 실제 집계 결과([INFRASTRUCTURE-AUDIT 코드 후속](INFRASTRUCTURE-AUDIT.md#코드-후속이번-범위-밖) 3·4) |
| 3+ | 스테이징 요청이 스테이징 Worker에 닿는지 | 스테이징 Pages `API_WORKER_ORIGIN` 미설정이면 운영 Worker로 떨어진다(`public/_worker.js:347`). 이 상태에서 로그인·결제 확인은 하지 않는다([SECURITY-AUDIT 잔여 위험](SECURITY-AUDIT.md#잔여-위험-10f)) |
| 4 | 운영 승격 | 사용자 요청이 있을 때만. 없으면 "운영 미배포" |

## 검증 결과

**Task 13은 아직 끝나지 않았다. 이 절은 컨트롤러가 채운다.** 스테이징(Step 2~3)과 운영(Step 4)은 실행 전이다.

작성 시점까지 원장에 기록된 값(참고용, 컨트롤러가 최종 출력으로 교체한다):

| 대상 | 결과 | 출처 |
|---|---|---|
| Task 10 작업 트리 `test:jest` | 421 suites / 6,884 tests PASS | Task 10 보고서 |
| 배포 트리(`1592b6013` + 33) `check:fast --base=origin/main` | BLOCKED(paid-gate-suite). `test:node` 4,013건 중 2건 실패. 둘 다 Playwright 브라우저 미설치 때문이고, merge-base `1592b6013`에서도 실패한다 | LEDGER |
| 배포 트리 개별 게이트 32단계 | 전부 EXIT=0: lint, typecheck, `verify:*` 24종, `build:worker`, `test:jest` 447 suites / 7,297 tests PASS | LEDGER |
| 배포 트리 `verify:worker-size` | gzip 5.59 MiB / 10 MiB(55.9%) | LEDGER |
| 배포 트리 `verify:mongo-query-index-shapes` | OK | LEDGER |
| `check:payment` | 배포 트리 기준 원장 기록 없음 | 컨트롤러 확인 |
| CI "CI required", `verify:staging`, 스테이징 수동 확인 | 미실행 | — |

## 운영 상태

**운영 미배포.** 운영 Worker·Pages·DB에 이 브랜치의 변경은 하나도 나가지 않았다. 측정 중 운영에 한 일은 tail, 공개 GET, Atlas Admin GET, 읽기 전용 DB 조회(serverStatus, 인덱스 목록, 인덱스 드리프트 dry-run, 전량 덤프)뿐이다. 운영 DB 쓰기·실결제·유료 LLM 호출은 0회다.
