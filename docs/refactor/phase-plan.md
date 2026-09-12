# 리팩터링 Phase 계획

작성일 **2026-09-12**. 번호는 고정이다 — 순서를 바꾸면 번호를 재사용하지 않고 근거를 적는다.

## 진행 상태

| Phase | 내용 | 대상 TOP20 | 상태 |
|---|---|---|---|
| 0 | 감사 문서 + 가드 shadow 배선 + guardian 가드 현행화 | 20 | **완료 (2026-09-13)** — `517939421` · `ecc17b406` · `9163a7dac` + 이 문서 커밋 |
| 1 | C급 중복 수렴: 환산 상수 5벌 → 정본 1개 (원화 포맷·`normalizeGender`·`Asia/Seoul` 은 재분류) | 16, 17 | **완료 (2026-09-13)** — `dc93b4545` · `6559cb245` · `827248162` + 이 문서 커밋 |
| 2 | LLM 경계 닫기: 실호출 차단을 설정으로 + mock 게이트 정본 수렴 | 10, 11 | **부분 완료 (2026-09-13)** — `817161297` · `85fa2d10a` + 이 문서 커밋. 우회 2곳은 RED 선보고 대기 |
| 3 | 안전망 보강: `tsconfig` 범위·eslint 가시화·CI `skipped` 구멍 | 18, 19 | 대기 |
| 4 | 권한 판정 단일화: writer 4개 → 서버 SoT 하나에 묻기 | 3, 4, 5, 6, 15 | 대기 |
| 5 | 정적 셸 추출: `js/inline/` 패턴으로 12,721줄 블록 단계 분리 | 1 | 대기 |
| 6 | repository 계층: projection·모델 접근 수렴 | 7, 8, 9 | 대기 |
| 7 | 엔진 단일화: characterization 고정 후 계산·표현 분리 | 2 | 대기 |
| 8 | 결제 스택 수렴: 상태기·resume·환불 경로 | 12, 13, 14 | 대기 |
| 9 | cleanup + 최종 구조 검증 + shadow→차단 승격 | — | 대기 |

## 순서 근거

기본값은 **C → B → A → S** 다. 여기서 딱 하나를 비틀었다: **안전망 성격의 Phase 2·3 을 앞으로 당겼다.**

- Phase 4(권한 판정 단일화)가 "결제한 고객에게 서비스가 제공되지 않는 상태"를 직접 없애는 **최고가치** 작업이다. 그런데 동결 파일 2개(`billing-client.ts`, `useCoinGate.ts`)를 건드린다.
- Phase 2 는 **지금 테스트가 실과금 LLM 호출을 할 수 있는 상태**를 닫는다(TOP 11). 이건 가치가 아니라 사고 예방이다.
- Phase 3 은 `worker/`(73파일)를 타입 검사 밖에 두고 CI 가 `skipped` 를 통과로 인정하는 상태를 닫는다. **Phase 4 이후의 모든 작업이 이 안전망을 쓴다.**

즉 1순위(회귀 방지)를 위해 최고가치 작업을 세 번째로 미룬 것이다.

## 각 Phase 의 작업 루프 (고정)

```
분석 → 영향 범위 확인 → 보호 테스트 → 작은 리팩터링 → 관련 테스트
     → build/typecheck → 정상 확인 → 마이크로 커밋
```

보호 테스트가 **먼저** 온다. 테스트 없이 고친 것은 "고쳤다"가 아니다.

마이크로 커밋의 기준: **이 커밋 하나를 되돌려도 다른 기능이 거의 흔들리지 않는가.** 서로 무관한 변경을 한 커밋에 섞지 않는다.

## Phase 종료 보고 형식 (고정)

```
[Phase N 완료]
- 변경: …
- 삭제: …
- 추가: …
- 테스트: PASS / FAIL
- 회귀: 없음 / 있음(무엇)
- 다음 작업: …
```

테스트가 FAIL 인 상태로 다음 Phase 에 들어가지 않는다.

## Phase 0 의 내용 (이번 세션)

마이크로 커밋 4개:

1. **guardian 가드를 정책 정본에 묶는다** — `scripts/verify-guardian-fortune-failure-contract.mjs` 가 2026-08-17 정책 변경(계정 3회→1회, 게스트 1회→0회) 전의 숫자 3·2·1 을 하드코딩한 채 7건 실패로 방치돼 있었다. 기대값을 `guardian-fortune-usage.js` 의 상수에서 유도한다. 운영 코드 0줄.
2. **`verify-guard-wiring.mjs` 에 `SHADOW_OBSERVING` 버킷 + 양방향 축** — `isWired()` 는 도달 가능성만 보므로, shadow 에 올린 것을 기존 버킷에서 지우면 감사가 "없는 보호를 있다"고 단언한다. shadow 항목은 전체 기준으로는 배선돼 있고 shadow 워크플로를 제외하면 미배선이어야 한다.
3. **`.github/workflows/guards-shadow.yml` + 통과 가드 41개 이관** (`9163a7dac`) — 44개 전수 실측(2026-09-13, mock 네트워크 가드 on) 결과 41 통과 / 3 실패. 통과분만 `SHADOW_OBSERVING` 으로 옮겼다. `ci-required` 의 `needs` 에 넣지 않고 가드 스텝마다 `continue-on-error: true` — 차단력 0.

   🔴 계획과 다른 점: **잡 레벨에는 `continue-on-error` 를 걸지 않았다.** 걸면 `npm ci` 가 깨진 런도 초록이라 "41개 전부 통과" 와 "한 번도 안 돌았다" 가 구분되지 않는다 — 이 버킷이 막으려던 실패 모양이 바로 그것이다. 셋업이 깨지면 워크플로가 빨갛게 보이되 막는 것은 없다(`needs` 에 없으므로).

   실패 3개는 `UNWIRED_BY_DESIGN` 에 그대로 뒀다. 통과하지 않는 것을 관측에 넣으면 승격 조건의 "오탐 0" 기준이 처음부터 무의미해진다. 원인은 범위 밖이라 보고만 한다(코딩 원칙 14) — `verify:no-timestamp-conflict`($setOnInsert ↔ timestamps 충돌 3건) · `verify:today-hub-gate`(부분 실패 안내·지연 공개 계산 누락) · `verify:animal-totem-reading`(five 티어 판정 1건).
4. **감사 문서 4종** — 이 폴더.

### 왜 shadow 부터인가

CLAUDE.md: "CI 선택 실행은 10회 push 비교 전까지 shadow다. 기존 검사를 삭제하지 않는다." 차단 게이트에 바로 넣으면 오탐 하나가 main 을 세운다. 오탐 여부는 관측으로만 안다.

### shadow → 차단 승격 조건

- main push **10회** 이상 관측 (관측시작일 **2026-09-13**, 대상 41개)
- 그 기간 오탐 0
- **사용자의 명시적 승인** (게이트 추가는 승인 사항 — CLAUDE.md CI gate scope)

Phase 9 에서 제안한다. 승격 제안 시 관측시작일과 관측 횟수를 함께 보고한다.

관측 집계: `gh run list --workflow=guards-shadow.yml -R <repo>` → `gh run view <id> --json jobs` 의 `steps[].conclusion`.

## Phase 1 의 내용 (2026-09-13)

```
[Phase 1 완료]
- 변경: worker/lib/profile-limits.js(KRW_PER_COIN 재선언 제거 → billing-policy.js import 후 되내보내기),
        scripts/verify-payment-policy-md.mjs · scripts/verify-krw-copy-canonical.mjs(하드코딩 환산율 → 정본 import),
        scripts/verify-krw-copy-canonical.mjs(lib/payment/coin-pricing.ts 상수 대조 + 게이트 커버리지 추가),
        config/sitemap-lastmod.json(유료 라우트 13개 의존 서명 재생성 — lastmod 변화 없음)
- 삭제: 없음
- 추가: coin-pricing.ts ↔ billing-policy.js 상수 대조 2건(fail-closed)
- 테스트: PASS — npm run check:payment(guard 20종 + jest 231 suites / 2,699 tests), 변이 검증 7건 전부 탐지
- 회귀: 없음
- 다음 작업: Phase 2(LLM 경계 닫기 — TOP 10·11)
```

계획과 다른 점: **Phase 1 의 네 축 중 실제 작업은 하나였다.** pass 가격과 worker 내 `KRW_PER_COIN` 은 이미 가드가 묶고 있었고(변이로 확인), 원화 포맷과 `normalizeGender`·`Asia/Seoul` 은 C급이 아니었다. 근거와 이관처는 [structural-issues-top20.md 의 "16·17 재측정"](structural-issues-top20.md#1617-재측정-2026-09-13-phase-1) 에 적었다.

대신 계획에 없던 것을 하나 찾아 고쳤다: **가드 2개가 지켜야 할 환산율을 자기 안에 하드코딩**하고 있었다. `verify-payment-policy-md` 는 `billing-policy.js` 의 `KRW_PER_COIN` 을 120 으로 바꿔도 PASS 였다 — 환산율이 바뀌면 결제 정책 문서가 낡은 환율 기준으로 계속 초록불이 된다.

🔴 이 Phase 에서 "보호 테스트 먼저"는 **변이 검증**으로 대신했다. 상수 수렴은 새 동작을 만들지 않으므로 새 테스트를 남기지 않고, 대신 기존 가드가 실제로 무는지를 값을 틀어서 확인했다(코딩 원칙 10, 도는 가드 ≠ 무는 가드).

## Phase 2 의 내용 (2026-09-13) — 부분 완료

```
[Phase 2 부분 완료]
- 변경: jest.config.cjs(실네트워크 가드를 setupFiles 로, 목 매퍼를 상대 깊이 → 대상 기준),
        lib/llm-client.ts · lib/tarot/mindscan-reading.mjs · lib/tarot/love-reading-llm.mjs
        (staging mock 게이트 재선언 제거 → worker/lib/staging-llm-mock.js import),
        worker/lib/staging-llm-mock.js(정본 표기 + 재구현 금지 주석)
- 삭제: 게이트 재구현 3벌(같은 파일 안에서 import 로 대체. 외부 계약 변화 없음)
- 추가: __tests__/ui/mock-test-runner.test.mjs 정적 가드 2축(setupFiles 실재+실제로 무는지,
        llm-client 임포터 전수 ↔ 매퍼 커버리지),
        scripts/verify-staging-llm-mock.mjs 진리표 224 케이스(jest 목 ↔ 정본)
- 테스트: PASS — check:fast 33스텝 EXIT=0 (typecheck · build:worker · jest 231 suites / 2,699 tests),
          변이 7건 전부 탐지
- 회귀: 없음
- 다음 작업: TOP 10 의 나머지 — 우회 2곳(mindscan · love) 어댑터 이관. **RED 선보고 후**
```

계획과 다른 점: **Phase 2 의 제목이 틀렸다.** TOP 11 은 "경로 의존 목" 문제가 아니었고(매퍼는 임포터 문자열에 걸린다 — 테스트 깊이와 무관), 진짜 구멍은 **실호출 차단이 러너에만 있었던 것**이다. `npx jest <파일>` 한 번으로 보호가 통째로 사라져 요청이 실제 공급자까지 나갔다. TOP 10 의 우회도 3곳이 아니라 2곳이었다 — oracle 은 이미 어댑터 주입으로 닫혀 있다. 근거는 [structural-issues-top20.md 의 "10·11 재측정"](structural-issues-top20.md#1011-재측정-2026-09-13-phase-2).

🔴 **가드는 러너가 아니라 설정이 져야 한다.** 러너에만 있는 보호는 "러너를 안 쓰면 없는 보호"다. 단 `mock-network-guard` 를 CI 잡의 `NODE_OPTIONS` 로 올리지는 않는다 — `npm ci` 까지 막힌다.

우회 2곳을 남긴 이유: `worker/routes/tarot.js:2020`(love)·`:2109`(mindscan)을 oracle 패턴으로 옮기면 재시도 소유권·Workers AI 폴백·토큰 로깅·타임아웃이 어댑터 계약으로 넘어가 **유료 기능의 실행 경로가 바뀐다**. 코딩 원칙 7 의 RED 선보고 대상이다.

## 이번 리팩터링에서 하지 않는 것

- 전체 재작성(Big Bang Rewrite) — 가장 금지하는 것
- 파일·폴더 이동 ([architecture-map.md](architecture-map.md) 6절)
- PR 생성 — 이 레포는 main 직접 개발이다
- 실 LLM 호출 · 실결제 · 운영 DB 쓰기
- legacy 로 보인다는 이유만의 삭제
- 범위 밖 결함의 수정(보고만 — 코딩 원칙 14)
