---
status: active
updated: 2026-11-07
next: "1단계 — 숙요 provider가 검증 구간 밖·경계 입력을 503 대신 기존 계산으로 넘기게 고치고, 실제 고객 출생 연대 표본 테스트를 통과시킨 뒤 SUKUYO_IMD_NEW_ORDERS_V1을 운영에서 다시 켠다"
---

# 보류 상품의 새 천문 공급자 전환 인수인계 (휴먼디자인 제외)

## 1. 사용자 요청과 결정

> 새 엔진 전환 보류한 상품들 중 휴먼 디자인 제외하고 새롭게 적용해줘 새 세션에서 진행가능하도록 하는게 좋겠다

2026-11-07 사용자 결정. 다시 묻지 않는다.

| 질문 | 결정 |
| --- | --- |
| 대상 | 서양 전체 명반, 베다 전체 명반, 숙요 궁합·연간·찻집 월간, 융합의 베다·숙요·서양 장, 오늘의 하늘. **휴먼디자인은 제외**한다. |
| 검증 범위 밖 입력 | **기존 계산을 그대로 쓴다.** 검증된 입력만 새 공급자로 계산한다. 결과마다 어느 공급자·버전으로 계산했는지 저장한다. 범위 밖이라는 이유로 결제 전 차단이나 503을 내지 않는다. |
| 운영 반영 | **검증을 통과한 상품은 운영까지 반영한다.** 절차는 main push → CI → 운영 배포 → SHA 확인이다(5절). 통과하지 못한 상품은 꺼 둔 채 사유와 함께 보고한다. |

목표: 위 상품의 신규 계산이 Swiss Ephemeris 대신 독립 검증된 허용 라이선스 공급자(`astronomy-engine@2.1.19`, MIT, 이미 운영 의존성)를 쓰게 한다. 검증 범위 안에서만 그렇게 하고, 기본 결과·LLM 상담·결제 후 생성·재열람·PDF가 같은 고정 명반을 읽게 한다.

## 2. 먼저 알아야 할 사고 (2026-11-07)

`SUKUYO_IMD_NEW_ORDERS_V1`을 운영 표(`worker/lib/engine-rollout.js`)에서 켠 배포 `05e03a0ed`부터 롤백 배포 전까지 사고가 있었다. 대부분의 실제 고객은 출생이 검증 구간 밖이다. 이 고객들에게 영냥이 숙요 **무료 운세**와 **숙요 개인 질문 주문**이 `PRECISION_UNAVAILABLE` 503으로 실패했다.

- 원인 1: `worker/yeongnyangi/fortune/sukuyo/provider.ts`는 `verifiedSukuyoForCivilTime()`이 `null`을 돌려주면 그대로 503을 던진다. 이 함수는 검증 구간 밖이거나 27숙 경계 2′ 이내일 때 `null`을 돌려준다. 검증 구간은 UTC 2024-01-01~01-30 23시, 2025-01-01~01-30 23시, 2026-03-23~2027-03-20이다.
- 원인 2: 무료 운세 `worker/yeongnyangi/fortune/free/readings.ts`가 `verifiedSukuyo: d==='sukuyo'`로 같은 경로를 탄다. 33번 문서는 개인 질문 주문만 대상으로 적었다.
- 놓친 이유: 테스트가 검증 구간 안의 합성 출생만 썼다. 1990년생 같은 실제 고객 입력을 플래그 ON 상태에서 돌린 테스트가 없었다.
- 조치: 커밋 `7c5b33403`이 운영 표에서 그 줄을 지웠다. 롤백은 운영에 반영됐다: main CI run 42309310877 통과, 릴리스 run 42312013253, `verify-deployed-sha` PASS(Pages·Worker `7c5b33403`). 이미 준비된 주문은 저장된 핀을 그대로 쓴다.

**재발 방지 규칙.** 이 인수인계의 모든 상품은 플래그 ON 테스트에서 다음 출생 표본을 반드시 넣는다: 1950-06-15, 1975-03-02, 1990-05-15, 2005-11-30, 그리고 검증 구간 안의 한 날짜(각각 KST 정오와 시간 미상). 다섯 표본 모두 오류 없이 결과를 내야 하고, 검증 구간 밖 표본은 기존 계산의 버전으로 기록되어야 한다.

## 3. 작업 위치와 첫 행동

- main 체크아웃 `D:/Development/code-destiny`는 다른 세션이 `feat/world-cast-page`에서 미커밋 작업 중이다. **건드리지 않는다.** 다른 세션도 main에 push하고 테스트를 돌린다. 그 프로세스를 끄지 않는다.
- 새 워크트리: PowerShell에서 `Set-Location D:\Development\code-destiny; powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create-safe-worktree.ps1 -Slug engine-hold-providers`. 출력된 경로에서만 작업한다.
- 처음 읽을 문서: [32 천문 공급자 검증](../engine-audit/32-ephemeris-provider-evaluation.md), [33 상승점·하우스·파다·다샤](../engine-audit/33-angles-padas-and-new-order.md), [34 질문 직답과 운영 반영](../engine-audit/34-answer-voice-and-release.md), [CR-011](../engine-audit/change-requests/CR-011.md), [CR-010](../engine-audit/change-requests/CR-010.md), [29 롤아웃](../engine-audit/29-production-rollout.md), [25 소비자 행렬](../engine-audit/25-all-engine-consumer-matrix.md), [`tools/oracle/ephemeris-candidate/README.md`](../../tools/oracle/ephemeris-candidate/README.md).
- 첫 명령: `git status`, `git log -5 --oneline`, `git fetch origin`, `git log --oneline -3 origin/main`.

## 4. 지킬 경계 (원 지시 그대로 유지)

1. **Swiss Ephemeris와 그 래퍼를 로컬에서 설치·실행하지 않는다.** WASM·CDN·간접 fallback도 막는다. 운영 CI·릴리스가 `sweph-wasm`을 설치하는 것은 CR-010의 사용자 결정 예외다. 로컬에서 Swiss에 닿는 테스트는 돌리지 않고 main CI에 맡긴다.
   - "범위 밖은 기존 계산" 경로 = Swiss 경로다. 로컬 테스트에서는 기존 계산 모듈(`sukuyo-astronomy.js`, `swiss-ephemeris.js` 등)을 **스텁으로 대체**하고, 호출 여부와 인자만 단언한다. 선례는 `__tests__/ui/yeongnyangi-natal-profile.test.mjs`의 esbuild guard 플러그인이다.
2. 6개 엔진 내부는 읽기 전용이다. 새 공급자는 `worker/lib/*-verified-provider.js` 같은 **새 어댑터 파일**로 만든다. 선례는 `worker/lib/sukuyo-verified-provider.js`와 `imd-sidereal-profile.js`다. 엔진 내부 변경이 꼭 필요하면 `docs/engine-audit/change-requests/CR-0xx.md`로 제안만 하고 멈춘다.
3. `sajuAdapter.ts`의 `calculateLocalResult()` 수정 금지. KASI prefetch timezone 주입 금지. `normalizeSaju.ts`에 timezone 추가 금지.
4. 기존 저장·유료 결과의 문장·명반·카드·버전을 재계산하거나 덮어쓰지 않는다. 재열람은 저장 원문을 읽는다. 완료본 재열람에서 공급자 호출은 0회여야 한다.
5. PortOne/Inicis 실행 파일, 가격·정책, 이용권·월정석·단건 결제 구조, 인증, KV/R2·사용자 자산 스키마는 바꾸지 않는다.
6. 로컬에서 실제 PG·LLM·DB를 부르지 않는다. mock 실패 시 실제 서비스로 넘어가는 fallback도 금지한다. 공개 천문 자료(JPL Horizons, USNO, IMD/IAE) 수집은 허용한다. 수집한 원자료는 `tools/oracle/ephemeris-candidate/`에 요청 URL·해시와 함께 고정하고 검증은 오프라인으로 한다.
7. 후보·보류·pending 값을 확정값으로 올리지 않는다. 숙요와 베다를 독립된 두 증거로 세지 않는다. 궁합은 두 사람의 역할을 바꾸지 않는다. 학파 선택(하우스 체계, 노드 mean/true, 숙요 원점 보정 16, 다샤 연수)은 **현재 서비스의 선택을 유지**하고, 다수결로 바꾸지 않는다.
8. 960px 데스크톱 레이아웃 유지. 새 고객 문구는 기존 i18n 키 체계(12개 로케일)를 따른다.
9. 새 플래그는 Worker `[vars]`에 올리지 않는다. 바인딩 예산이 꽉 차 있다. `engine-rollout.js` 표에서 켜고, `config/env.contract.json`에 `consumers`와 함께 등록한다(env-parity).

## 5. 설계 — 모든 상품 공통

```
신규 준비(결제 전)
  ├─ 입력이 검증 범위 안이고 경계 여유를 넘는가? → 새 공급자 계산, providerVersion = <새 버전>
  └─ 아니면 → 기존 계산 그대로, providerVersion = <기존 버전>   ← 503·결제 차단 금지
  → 명반 스냅샷 + providerVersion + digest를 준비 기록에 원자적으로 고정
결제 복귀·재시도·동시 생성·장 생성·PDF → 고정 스냅샷만 읽는다 (플래그가 꺼져도 동일)
완료 재열람 → 저장 원문, 공급자 호출 0회
```

- 지원 범위 판정은 공급자 어댑터 한 곳에서 한다(`supports(input) → {ok, reason}`). 이유(`out-of-range-date`, `boundary-margin`, `polar-latitude`, `time-unknown` 등)를 결과 메타에 남긴다.
- 상품별 플래그는 따로 둔다(예: `ASTROLOGY_VERIFIED_NEW_ORDERS_V1`, `VEDIC_VERIFIED_NEW_ORDERS_V1`, `SUKUYO_IMD_NEW_ORDERS_V1`, `TODAY_SKY_VERIFIED_V1`). 하나가 실패해도 다른 상품을 켤 수 있게 한다. 기존 `*_CONSUMER_FACTS_V1`은 사실 고정용이며 공급자를 바꾸지 않는다. 함께 켤지는 상품별로 판단한다.
- 두 사람 상품(궁합·synastry)은 사람마다 따로 판정한다. 한 사람만 범위 안이면 그 사람만 새 공급자를 쓰고, 두 버전을 각각 기록한다. 이렇게 섞는 것이 해석에 문제가 되는 상품이면 둘 다 기존 계산으로 둔다(어느 쪽인지 문서에 적는다).
- "현재 시각" 기반 값(오늘의 하늘, 숙요 연간·찻집 월간의 기간 값, 프라슈나, 무후르타)은 지금이 2026-03-23~2027-03-20 IMD 검증 구간 안이라 먼저 전환할 수 있다. 본명(출생) 값은 출생 연대 검증이 필요하다.

## 6. 단계

각 단계: 구현 → 2절 표본 포함 mock 회귀 → 정적 검사 → 커밋 → push → CI → (통과 시) 운영 배포·SHA 확인 → 문서에 SHA 기록.

**1단계. 숙요 fallback 수정과 재활성화 (가장 먼저)**
- `worker/yeongnyangi/fortune/sukuyo/provider.ts`: `verifiedSukuyoForCivilTime()`이 `null`이면 503 대신 기존 `calculateSukuyoForMoment(env, moment, {strictSwiss:true})`를 쓴다. 결과의 `astronomyVersion`으로 어느 쪽인지 구분된다. 무료 운세의 "오늘 정오 숙"도 같은 규칙을 따른다.
- `worker/yeongnyangi/fortune/sukuyo/index.ts`의 `natal.engineVersion = a.astronomyVersion` 조건이 기존 계산 결과에도 맞는지 확인한다.
- `worker/yeongnyangi/service.ts`의 결제 전 검사가 범위 밖에서 준비를 거절하는지 확인하고, 거절하면 기존 계산으로 진행하게 바꾼다(33번 문서의 "결제 준비를 진행하지 않는다"를 뒤집는 사용자 결정).
- `__tests__/ui/sukuyo-verified-order.test.mjs`에 2절 표본을 추가한다. 기존 계산 모듈은 스텁으로 둔다. 범위 밖 표본이 503 없이 기존 버전으로 고정되는지, 구간 안 표본이 IMD 버전으로 고정되는지, 무료 운세도 같은지 확인한다.
- 통과하면 `engine-rollout.js`에 `SUKUYO_IMD_NEW_ORDERS_V1: 'true'`를 되살리고, `__tests__/ui/engine-rollout.test.mjs`의 기대값도 되돌린다.

**2단계. 현재 시각 기반 값 전환 (IMD 2026-27 구간 안)**
- 오늘의 하늘(`worker/lib/today-sky.js`, `worker/routes/fortune-today.js`): 태양·달 별자리는 248건이 검증됐다. 위상·삭망 시각과 다른 행성의 별자리 경계는 JPL 표본을 더 받아 검증한다. 경계 여유 안이면 기존 계산을 쓴다.
- 숙요 연간·찻집 월간의 기간 값(`worker/lib/tea-sukuyo-monthly.js`, `worker/routes/sukuyo.js`, `worker/routes/fortune-tea-house.js`): 기간 쪽 달 경도는 IMD 구간 안이면 새 공급자를 쓴다. 본명숙은 1단계 규칙을 따른다.
- 베다 프라슈나·무후르타·오늘의 베다(`vedic-prashna-prompt.js`, `nakshatra-muhurta.js`, `today-vedic-detail.js`, `threads-daily-providers/vedic.js`): 질문 시각 기준 값만 해당한다. 라그나가 필요하면 3단계 검증을 기다린다.

**3단계. 출생 연대 검증 확장 (tools/oracle/ephemeris-candidate)**
- 서양: 10개 천체 열대 황경은 1900~2050년 표본에서 별자리 불일치 0이다. 더 검증할 것:
  - ASC·MC를 출생 연대(1940~2026) 날짜로 넓힌다. 지금 표본은 2000·2024·2025년뿐이다.
  - 민간 시각→UT 변환. 한국 1948~88년 서머타임, 1954~61년 UTC+8:30 같은 과거 시간대를 포함한다.
  - 역행·정지, 서비스가 쓰는 노드 종류(mean/true), 행성의 하우스 배정 경계, 시간 미상 처리.
  - Placidus는 위도 0~±65°만 검증됐다. 극권은 기존 계산으로 둔다. 등분 하우스로 바꾸지 않는다.
- 베다:
  - 출생 연대별 Lahiri 아야남사의 공식 값(IAE 과거 연도 발표값)을 확보한다. 구하지 못한 연대는 범위 밖, 즉 기존 계산이다.
  - 108파다는 2024·2025년 1월에만 검증됐다. 다른 달로 넓힌다.
  - 그 밖에 라그나(항성 ASC), 라후·케투(서비스 정의대로), 행성 항성 배치, 빔쇼타리 대·소 다샤를 검증한다. 하위 다샤는 아직 검증되지 않았다.
- 숙요 본명: 출생 연대별 달 경도 + 아야남사 기준을 베다와 공유한다. 이것을 숙요와 베다의 독립 증거 둘로 세지 않는다.
- 검증 결과로 각 공급자 어댑터의 지원 범위 표를 만든다. 표 밖은 기존 계산이다.

**4단계. 서양·베다 전체 명반과 숙요 궁합 연결**
- 서양 Placidus 후보 구현은 지금 `tools/oracle/ephemeris-candidate/verify-houses.mjs` 안에만 있다. Worker용 새 어댑터(예: `worker/lib/astrology-verified-provider.js`)로 옮기고, 검증기가 그 어댑터를 import해 같은 코드를 검사하게 한다.
- 호출 경로(Swiss를 직접 import하는 곳):
  - 서양: `worker/routes/astrology-ai.js`, `worker/routes/astro.js`, `worker/lib/guardian-fortune/adapters/astrology.js`, `worker/lib/neo-synastry.js`, `worker/lib/neo-operation-room-compat.js`, `worker/lib/astro-premium-generator.js`, `worker/lib/astro-section/yearly.js`, `worker/yeongnyangi/fortune/astrology/index.ts`·`derived.ts`, `worker/yeongnyangi/fortune/question-sky.ts`, `worker/yeongnyangi/fortune/relationship-calculation.ts`.
  - 베다: `worker/lib/vedic-ai-chart.js`, `worker/routes/vedic-ai.js`, `worker/routes/nakshatra-ai.js`, `nakshatra-premium.js`, `nakshatra.js`, `worker/lib/nakshatra-birth-evidence.js`, `nakshatra-codex.js`.
  - 숙요 궁합: `worker/routes/sukuyo-compatibility-ai.js`, `worker/routes/sukuyo-archive.js`, `worker/lib/saju-section/paid-sukuyo-compat.src.js`(생성물 `runtime.generated.mjs`는 생성기로만 갱신).
  - 단독 낙샤트라 상담은 `buildNakshatraBirthEvidence`에 원차트 전체가 필요하다. 달 하나만 채워서 완료 처리하지 않는다.
- 결제 준비 경계에 스냅샷 고정이 없는 상품은 기존 저장 계약(seed·`llmMeta`·`generationSnapshot`)에 `providerVersion`과 명반을 함께 넣는다. 새 저장 스키마가 필요하면 CR-009처럼 제안만 한다.

**5단계. 융합의 세 장**
- `worker/routes/fusion-fortune.js`, `worker/lib/fusion-fortune-prompt.js`, 영냥이 융합(`relationship-calculation.ts`): 각 장은 해당 체계의 공급자 결정을 그대로 따른다. 필수 장의 입력이 없으면 완료 처리하지 않는다. 장마다 `providerVersion`을 `generationSnapshot`에 고정한다.

**운영 승격 (상품마다)**
1. `git fetch origin && git rebase origin/main` → `npm run check:pre-push`.
   - 공개 미러가 낡았다고 나오면 `npm run sync:public`.
   - 사이트맵 드리프트가 나오면 `npm run sitemap:generate`.
   - 둘 다 결과를 같은 커밋에 담는다. `engine-rollout.js`를 바꾸면 `js/core/saju/reading-depth.generated.js`와 public 미러도 바뀐다.
2. `git push origin HEAD:main`. 거절되면 다른 세션이 push한 것이므로 rebase 후 다시 push한다.
3. PR CI 완료까지 대기: `gh run watch <id> --repo rei1237/codedestiny --exit-status`(백그라운드). 실패 로그: `gh api repos/rei1237/codedestiny/actions/jobs/<id>/logs`.
4. 운영: `gh workflow run "Release Cloudflare Pages and Worker" --repo rei1237/codedestiny --ref main -f mode=production` → `node scripts/verify-deployed-sha.mjs --sha=<전체 SHA>`.
5. 롤백: 해당 플래그 줄을 revert하고 재배포한다. 긴급하면 `-f mode=rollback`. 준비된 주문은 고정값으로 끝까지 간다.

## 7. 테스트 실행 함정 (지난 세션에서 실제로 겪음)

- **`scripts/run-mock-tests.mjs node <파일>`로 파일 하나를 돌리지 않는다.** 지정 파일만이 아니라 `test:node` 전체 패턴을 guard 없이 돌린다. 지난 세션에서 이 때문에 Swiss 모듈이 로드됐을 수 있다.
- 단일 파일은 Git Bash에서 아래처럼 돌린다(`pwd -W`로 Windows 경로를 써야 한다).
  ```sh
  R=$(pwd -W); NODE_OPTIONS="--require=$R/tools/oracle/next-delivery/guard.cjs --experimental-vm-modules --require=$R/scripts/lib/mock-network-guard.cjs" LLM_DRY_RUN=true WORKERS_AI_ENABLED=false TZ=UTC node --test --test-timeout=30000 <파일>
  ```
- 돌리기 전에 그 테스트의 import 그래프가 Swiss(`swiss-ephemeris.js`, `sweph-wasm`)에 닿는지 확인한다.
  - 지난 세션의 정적 검사기: `D:/Development/Temp/claude/ec29f026d20d029c/3ba92947-9b54-4b0f-8486-21353c91b89b/scratchpad/swissgraph.cjs`. 사용법은 `node <검사기> <테스트 파일>`이고 `clean`이면 돌려도 된다.
  - Swiss에 닿는다고 확인된 테스트: fusion-schema-transmission, human-design-report.static, neo-consultation, non-saju-consumer-rollout, saju-authority-consumers-b, saju-authority-new-year, saju-service-analysis, saju-temperament-prompts, signature-detail-chapters, yeongnyangi-reading-v7-ledger, ziwei-deep-paid-delivery.behavior, saju-compat-basic-delivery, saju-authority-consumers-a.
- 목 러너는 `LLM_DRY_RUN=true`를 설정한다. LLM 요청 조립까지 확인하는 테스트는 env에 `LLM_DRY_RUN:'false'`를 명시한다. 예: `sukuyo-verified-order`, `yeongnyangi-engine-fact-seal`.
- VM에 함수를 주입해 돌리는 하네스는 새로 쓰는 모듈 함수도 컨텍스트에 넣어야 한다. 빠지면 CI가 멈춘다. 지난 세션에서 `ziwei-execution-lifecycle`이 24분 동안 멈췄다.
- 새 provider 모듈을 import하는 테스트는 `yeongnyangi-natal-profile.test.mjs` 같은 esbuild guard 하네스에 스텁을 추가해야 한다(`astronomy-engine` 차단).
- 전체 Jest·`check:fast` critical·전체 빌드는 Swiss 때문에 로컬에서 돌리지 않는다. main CI 결과로 판정한다.

## 8. 완료 기준과 보고

- 상품마다 다음 표를 `docs/engine-audit/35-hold-products-verified-provider.md`에 남긴다: 검증 범위, 범위 밖 처리(기존 계산), 2절 표본 결과, 결제 준비→복귀→동시 요청→재시도→장 생성→PDF→재열람 결과, 완료본 공급자 호출 0회, 운영 SHA·플래그 상태.
- 25번 행렬의 ①②③ 분류와 29번 롤아웃 표를 갱신한다.
- 통과하지 못한 상품은 플래그를 꺼 둔 채 정확한 사유를 적는다.
- 끝나면 이 문서를 `status: done`으로 바꾸고 결과 SHA를 적는다. `npm run worktree:remove -- <경로>`로 워크트리를 정리한다(`git worktree remove`는 긴 경로에서 고아 폴더를 남긴다). `.tmp`를 지운다.
