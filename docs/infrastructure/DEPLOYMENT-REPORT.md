# 배포 보고서: 변경 목록·배포 경로·롤백·검증 (2026-10-31)

- **측정 시각:** 2026-10-31 작성. 검증 수치는 SDD 원장(LEDGER)에 기록된 시점의 값이다.
- **출처:**
  - `git log f4c5458a0..6d92e96f5`(커밋 본문의 위험·롤백 메모)
  - LEDGER(Task별 검증, Task 13 Step 1 실측)
  - `.github/workflows/cloudflare-pages-deploy.yml`, `scripts/deploy-safe.mjs`, `scripts/lib/production-deploy-guard.mjs`
- **기준 커밋:** origin/main `f4c5458a0`. 처음 작성할 때 브랜치 HEAD는 `35be53295`였다. 검증 결과를 채운 시점(2026-10-31 22시) HEAD는 `6d92e96f5`(46커밋)다.
- **상태: 운영 미배포.** 스테이징 push도 하지 않았다. 보류 이유는 [배포 경로](#배포-경로) 2에 있다.
- **함께 보는 문서:**
  - 이슈 현황·승인 항목: [INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md#승인-필요-항목)
  - 장애 시 롤백 절차: [DISASTER-RECOVERY 런북 4](DISASTER-RECOVERY.md#런북-4-배포-롤백)
  - 배포 뒤 연결 확인: [SECURITY-AUDIT](SECURITY-AUDIT.md#기존-서비스-연결-유지-확인)

## 결론

- 코드 변경은 Task 1~8과 Task 10의 23개 커밋에, 최종 리뷰 fix wave 8개 커밋과 주석 정정 1개를 더한 것이다. RED(결제 경로)는 Task 3과 Task 7 두 건이다. 둘 다 2026-10-31에 **테스트 → 스테이징까지** 승인됐다.
- 운영 DB 데이터·인덱스를 바꾸는 커밋은 없다. 운영 인덱스 생성은 승인 항목이며 실행하지 않았다.
- 배포 경로는 하나다.
  - 스테이징: origin/main 위에 이 브랜치 커밋만 cherry-pick해 push한다.
  - 운영: 사용자의 1회성 명시 요청이 있을 때만 GitHub Actions에서 승격한다.
- **운영 미배포.** 그래서 모든 전후 비교의 after는 "운영 미배포로 after 미측정"이다([INFRASTRUCTURE-AUDIT 전후 비교](INFRASTRUCTURE-AUDIT.md#전후-비교)).
- Task 13은 Step 1(배포 트리 검증)까지 했다. Step 2(스테이징 push)는 보류했고, Step 3·4는 하지 않았다. [검증 결과](#검증-결과) 참고.

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
| 13 fix wave | 최종 리뷰 반영. 10분 분기 모듈 로드를 태스크 안으로, 알림 대기 8분 상한, 전달 안 된 크론 실패 알림의 claim 해제, 검토 필요 유료 의도·마스터 러브 코덱스 알림 종류 추가, Atlas redact 범위 확대, 구독 한도 집계를 400 검증 뒤로, cron op 커버리지 분석기 보강, 테스트 결정화, 롤백된 이용권 소비 재시도 조합 고정, TTL 주석 정정 | `b7a20cada`, `6fb191636`, `868acb47e`, `734201a4a`, `9f9ae9d5e`, `746fa3ae5`, `f2e97c2f8`, `f947073ef`, `25729b770` (문서 `da47f58b1`, `da0ef635a`, `6d92e96f5`) | GREEN | Worker 10분 크론·운영자 알림·구독 라우트 |

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
| 13 fix wave | 리뷰에서 막은 결함이 돌아온다. 원래 Task 커밋과 함께 되돌린다 | `idempotency_keys`의 선점 행 | 원래 Task를 되돌릴 때만 |

## 배포 경로

1. **배포 트리를 만든다.** origin/main 최신 위에 이 브랜치 커밋(`f4c5458a0..HEAD`)만 cherry-pick한다.
   - 공유 체크아웃의 로컬 main은 쓰지 않는다. 남의 미push 커밋이 섞일 수 있다.
   - 배포 트리는 `D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620`(브랜치 `wt/infra-deploy-20261031-190620`)이다. origin/main `c110fc2f1` 위에 46개를 무충돌로 올렸고 HEAD는 `2d56489bd`다. 처음에는 `1592b6013` 위 33개로 만들었다(LEDGER).
   - 2026-10-31 21:35에 origin/main이 `1b262f31c`("fix: recover CI and separate SNULIFE review codes")로 움직였다. 이 커밋과 46개 커밋이 함께 바꾼 파일은 0개다. push 전에 그 위로 다시 올리고 `npm run check:fast -- --base=origin/main`을 다시 돌린다.
2. **스테이징.** `git push origin main` → main CI(`pr-ci.yml`, "CI required") → `workflow_dispatch(mode=staging)` 예약 → staging.code-destiny.com.
   - 스테이징은 RED 변경의 승인 한계다.
   - **main push는 곧 다음 운영 승격의 대상이 된다.** 운영 승격(`mode=production`)은 main HEAD(`github.sha`)를 배포한다(`cloudflare-pages-deploy.yml:14`, `:265`). push한 뒤 누구든 운영 승격을 누르면 Task 3·7의 RED 변경이 스테이징 확인 전에 운영으로 나간다. 다른 세션도 같은 main으로 운영 승격을 한다.
   - 그래서 이 브랜치는 push하지 않고 멈췄다. push는 사용자 확인 뒤에 한다. push했으면 Step 3 스테이징 확인이 끝날 때까지 운영 승격을 하지 않도록 사용자에게 알린다.
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

Step 1만 실행했다. 이 브랜치 때문에 생긴 실패는 없다. 남은 실패는 모두 merge-base(origin/main `c110fc2f1`)에서도 똑같이 실패한다. Step 2~4는 하지 않았다.

| 대상 | 결과 | 출처 |
|---|---|---|
| 배포 트리 `794eca3de`(`c110fc2f1` + 44) `check:fast -- --base=origin/main` | EXIT=1. 실패 3건(`npm test`, `verify:payment-copy-dictionary`, `verify:i18n-price-drift`)이 merge-base `c110fc2f1`에서도 실패한다. `npm test` ✖ 목록(일일 타로·모자 이야기 브라우저 테스트, shell-dictionary-parity "ko.json 값이 셸 마크업 문구와 같다")도 base와 같다. `test:jest` 452 suites / 7,360 tests PASS | LEDGER t13c, `scratchpad/t13c-check-fast.log` |
| `794eca3de` → `2d56489bd` | 문서 2개와 주석 1개만 바뀌었다(`25729b770`, `6d92e96f5`). `check:fast`는 다시 돌리지 않았다 | `git diff --stat` |
| `2d56489bd` `verify:worker-size` | EXIT=0. 4파일, raw 21.80 MiB, gzip 5.59 MiB / 예산 10 MiB(55.9%) | 21:38 실행 |
| `2d56489bd` `verify:mongo-query-index-shapes` | EXIT=0 | 21:38 실행 |
| `2d56489bd` `check:payment`(paid-gate-suite 90개) | ok 87, FAIL 3: `verify:payment-copy-dictionary`, `verify:i18n-price-drift`, `npm test`. 위 `check:fast`의 실패 3건과 이름·내용이 같다. 둘 다 이 브랜치가 건드리지 않은 문구 때문이다(월정석 500개 안내 문구와 `auth.guestMoonstoneTeaser` 10000). 46개 커밋 중 i18n·문구 파일을 바꾼 것은 0개다. 스위트의 자체 재실행은 base를 HEAD(`2d56489bd`)로 잡아서 귀책 판정에 쓰지 않았다 | 21:38~ 실행 |
| `2d56489bd` `verify:phone-encryption` | EXIT=1 `/onboarding must stay removed`(`scripts/verify-phone-encryption.mjs:236`). `app/onboarding/page.tsx`는 다른 세션 커밋 `bea087f4c`가 되살렸고 `c110fc2f1`·`1b262f31c`에 모두 있다. 46개 커밋 중 onboarding 파일을 바꾼 것은 0개다 | 21:50 실행 |
| 이전 기록 | Task 10 작업 트리 `test:jest` 421 suites / 6,884 tests PASS. 첫 배포 트리(`1592b6013` + 33) 개별 게이트 32단계 전부 EXIT=0(`test:jest` 447 / 7,297) | Task 10 보고서, LEDGER |
| origin/main 스테이징 릴리스(이 브랜치 미포함) | `c110fc2f1`: 런 41195463516·41196675384·41198056546이 adsense-readiness(`out/onboarding` description)에서 실패. `1b262f31c`: 런 41201869815가 adsense는 통과했지만 "Deploy staging Pages and Worker at the exact SHA" 단계의 고위험 mock 게이트에서 `verify:phone-encryption`으로 실패(`scripts/deploy-safe.mjs:257`) | `gh run view`, `scratchpad/run-41201869815-failed.log` |
| CI "CI required", `verify:staging`, 스테이징 수동 확인 | 미실행. push하지 않았다([배포 경로](#배포-경로) 2) | — |

**지금 push해도 스테이징에 올라가지 않는다.** origin/main 자체가 `verify:phone-encryption`에서 막혀 있다. `app/onboarding`을 되살린 세션이 그 단언과 화면 중 하나를 정리해야 풀린다. 이 브랜치가 고칠 일이 아니다.

## 운영 상태

**운영 미배포.** 운영 Worker·Pages·DB에 이 브랜치의 변경은 하나도 나가지 않았다. 측정 중 운영에 한 일은 tail, 공개 GET, Atlas Admin GET, 읽기 전용 DB 조회(serverStatus, 인덱스 목록, 인덱스 드리프트 dry-run, 전량 덤프)뿐이다. 운영 DB 쓰기·실결제·유료 LLM 호출은 0회다.
