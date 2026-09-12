---
status: active
updated: 2026-09-13
next: TOP 10 의 남은 절반 — worker/routes/tarot.js 의 love(:2020)·mindscan(:2109) LLM 우회를 oracle 어댑터 패턴으로 옮긴다. RED 라 위험·검증·롤백 선보고 후 착수한다.
---

# 점진 구조 개선 Phase 2 인수인계

작업 규칙·금지 영역·왜 이 리팩터링을 하는가의 정본은
[refactor-phase0-2026-09-13.md](refactor-phase0-2026-09-13.md) 다. Phase 1 의 결과는
[refactor-phase1-2026-09-13.md](refactor-phase1-2026-09-13.md). **여기서는 반복하지 않는다.**

## 완료한 것 — Phase 2 (부분)

대상은 TOP20 의 **10·11**(LLM 경계 닫기)이었다.

| 커밋 | 내용 |
|---|---|
| `817161297` | 실네트워크 차단을 러너에서 **jest 설정**으로 옮긴다(`setupFiles`) + 목 매퍼를 상대 깊이 → 대상 기준 + 정적 가드 2축 |
| `85fa2d10a` | staging mock 게이트 재선언 3벌 제거 → `worker/lib/staging-llm-mock.js` 정본 import + jest 목 사본을 진리표로 대조 |

**검증된 마지막 코드 변경 = `85fa2d10a`** — `npm run check:fast` 33스텝 EXIT=0
(typecheck · `build:worker` · jest 231 suites / 2,699 tests · `test:node` 포함).
되돌릴 일이 생기면 문제를 만든 커밋 하나만 `git revert` 한다. 두 커밋은 서로 독립이다.

두 커밋 모두 origin/main 에 있다(옆 세션이 `29d723776` 을 push 하면서 함께 올라갔다).

## 🔴 원장의 10·11 도 절반이 오진이었다 — Phase 1 과 같은 패턴

Phase 1 의 교훈이 그대로 반복됐다. **원장의 "N벌·N곳"은 가설이다.** 이번에도 네 축 중
원장 그대로였던 것은 하나뿐이다. 근거표는
[structural-issues-top20.md 의 "10·11 재측정"](../refactor/structural-issues-top20.md#1011-재측정-2026-09-13-phase-2).

가장 중요한 정정 두 가지만 다시 싣는다.

**1. TOP 11 은 "경로 의존 목" 문제가 아니었다.** `moduleNameMapper` 는 **임포터가 소스에 적은
문자열**에 걸린다 — 테스트 파일의 깊이와 무관하다. 현재 `llm-client` 임포터 2개는 둘 다 깊이 2라
이미 덮여 있었다. 게다가 매핑을 못 받은 `.ts` 는 조용히 실호출하는 게 아니라 babel 파싱에서
**크게 실패**한다(이 레포의 jest 에는 TS 프리셋이 없다).

**진짜 구멍은 따로 있었다.** 실호출 차단이 `scripts/run-mock-tests.mjs` 의
`NODE_OPTIONS --require` 에만 있어서, `npx jest <파일>` 로 러너를 우회하면 보호가 통째로
사라졌다. 실측으로 그 상태의 jest 안에서 요청이 `generativelanguage.googleapis.com` 까지
실제로 나갔다(status 400 — 키가 없어서 났을 뿐, env 에 키가 있었으면 **과금됐다**).

> 🔴 **가드는 러너가 아니라 설정이 져야 한다.** 러너에만 있는 보호는 "러너를 안 쓰면 없는
> 보호"다. 다음 Phase 에서 새 가드를 붙일 때도 "이 보호를 우회하는 가장 쉬운 호출 방법이
> 무엇인가"를 먼저 묻는다.

**2. TOP 10 의 우회는 3곳이 아니라 2곳이다.** oracle 은 이미 닫혀 있다 —
`worker/routes/tarot.js:1853-1860` 이 `worker/lib/tarot-oracle-llm.js` 의 어댑터를 `callJson` 으로
주입하고, `oracle-consultation.mjs:299` 의 raw fetch 는 **어댑터가 없을 때만** 쓰는 폴백이다.

## 남은 것 — TOP 10 의 절반 (RED, 선보고 필요)

`worker/routes/tarot.js` 의 두 호출부가 어댑터 없이 `env` 만 넘기고, 모듈 안에서 Gemini 를
직접 친다.

| 호출부 | 대상 | 현재 |
|---|---|---|
| `worker/routes/tarot.js:2020` | `enhanceLoveReadingWithLlm(payload.reading, { locale, env, userQuestion })` | 어댑터 없음 |
| `worker/routes/tarot.js:2109` | `buildMindscanReadingPayload(pairs, { question, env, locale })` | 어댑터 없음 |

옮길 목표 패턴은 oracle 과 동일하다 — `worker/lib/tarot-oracle-llm.js` 의
`createOracleConsultationLlm(env, { locale, requestId, targetChars })` 를 읽고 그대로 따른다.

**왜 이번에 안 했나 (RED 사유).** 이관하면 유료 기능의 실행 경로가 바뀐다:
재시도 소유권(`TRANSPORT_ATTEMPTS`), Workers AI 폴백(`fallbackMinChars` 가 필요하다 —
[ai-and-db.md](../context/ai-and-db.md) 참조), 토큰 로깅(`logContext.featureKey`/`serviceId`),
타임아웃이 전부 어댑터 계약으로 넘어간다. 코딩 원칙 7 에 따라 **위험·검증·롤백을 먼저 보고**한 뒤
착수한다. 게이트 수렴은 그 앞의 무해한 절반이라 먼저 끝냈다.

착수 전에 확인할 것:

1. 두 기능의 현재 재시도 횟수·타임아웃·폴백 임계를 먼저 실측해 적는다. 어댑터가 그 값을
   **바꾸지 않는지**가 이관의 합격 기준이다.
2. `scripts/verify-mindscan-reading.mjs` 는 실재하지만 **npm 스크립트에 배선돼 있지 않다**
   (`package.json` 에 항목 없음). 이관의 보호 테스트로 쓰려면 먼저 배선한다 —
   새 verify 는 배선하지 않으면 아무것도 지키지 않는다.
3. love 쪽은 `verify:staging-llm-mock` 이 이미 폴백 동작(`source === "local_fallback"`,
   `llmFailReason === "staging_mock"`, `fetchCalls === 0`)을 묶고 있다. mindscan 은 **안 묶여
   있다** — 이관 전에 등가 단언을 만든다.

## 게이트 정본 구조 (지금 상태)

```
worker/lib/staging-llm-mock.js   ← 판정 정본 (유일)
  ├─ worker/routes/*.js 13개      import
  ├─ lib/llm-client.ts            import 후 export (callLLM 이 내부에서 쓴다)
  ├─ lib/tarot/mindscan-reading.mjs   import
  └─ lib/tarot/love-reading-llm.mjs   import

__tests__/__mocks__/llm-client.js  ← 수렴 불가(CJS). 진리표로만 묶인다
```

🔴 jest 목의 사본은 **지우지 않는다.** 임포터는 0 이지만 export 를 지우면
`worker/lib/gemini.js` 의 named import 가 파싱 단계에서 깨져 스위트가 무더기로 넘어간다
(과거 19개). 대신 `scripts/verify-staging-llm-mock.mjs` 가 4×8×7 = 224 케이스 진리표로
정본과 대조한다 — 갈라지면 `verify:staging-llm-mock`(차단 가드) 이 실패한다.

## 변이 검증 결과 (7건 전부 탐지)

`817161297`:

| 변이 | 결과 |
|---|---|
| `jest.config.cjs` 의 `setupFiles` 제거 | 탐지 |
| `setupFiles` 를 무해한 다른 파일로 교체 | 탐지 |
| 목 매퍼를 다시 상대 깊이로 되돌리기 | 탐지 |

`85fa2d10a`:

| 변이 | 결과 |
|---|---|
| 정본의 `appEnv === "staging"` 완화 | 탐지 — `production must never enable staging mock` |
| 정본의 Workers AI 조건 제거 | 탐지 — `Workers AI must be off for staging mock` |
| jest 목에서 `.trim()` 제거 | 탐지 — 진리표 `" Staging "` 케이스 |
| jest 목에서 허용값 `yes` 제외 | 탐지 — 진리표 `flag="yes"` 케이스 |

추가 배선 실측: 정본을 비틀자 **마인드스캔의 결과가 따라 바뀌었다**
(`APP_ENV=production` 에서 `source: "rule-engine"` → `"staging_mock_local_fallback"`).
사본을 지운 뒤 정말 정본을 무는지까지 본 것이다 — import 문만 보고 "묶였다"고 하지 않는다.

## 관측 중 — shadow 7/10 (2026-09-13)

승격 조건은 여전히 **main push 10회 + 오탐 0 + 사용자의 명시적 승인**이다(Phase 9).

| # | 커밋 | run | 스텝 결과 |
|---|---|---|---|
| 1 | `c3aa60546` | `34715837924` | 41개 전원 success |
| 2 | `6a4ebccbd` | `34716138331` | 41개 전원 success |
| 3 | `15c2dae90` | `34716169426` | 41개 전원 success |
| 4 | `82a933f8d` | `34717452761` | 41개 전원 success |
| 5 | `280d3434b` | `34718114019` | 비성공 스텝 0 |
| 6 | `1ac30cd88` | `34718213041` | 비성공 스텝 0 |
| 7 | `22910230f` | `34718236946` | 비성공 스텝 0 |
| 8 | `29d723776` | `34721849384` | **진행 중** — 내 커밋 2개가 이 push 에 실려 있다. 다음 세션이 확인해 기록한다 |

**오탐 0 유지.** 워크플로 레벨 `success` 는 근거가 안 된다 — 스텝마다 `continue-on-error: true`
라 가드가 실패해도 잡은 초록이다. 반드시 스텝 결론을 본다:

```bash
gh run list --workflow=guards-shadow.yml --limit 15 --json databaseId,headSha,conclusion,event
gh run view <id> --json jobs --jq '.jobs[].steps[] | select(.conclusion != "success") | "\(.conclusion)\t\(.name)"'
```

## 작업 트리 상태 (2026-09-13 인계 시점)

내 커밋 2개는 push 됐다. 남아 있는 미커밋 변경은 **전부 옆 세션 것**이며 내가 건드리지 않았다
(`index.html`·`public/**` 미러·`config/sitemap-lastmod.json`·꽃돼지 스프라이트 자산).

🔴 이 레포는 main 체크아웃을 옆 세션과 공유한다. `reset --hard`·`stash`·`checkout --` 는 그
세션의 작업을 복구 불가로 지운다 — 쓰지 않는다. `git add .` 도 쓰지 않는다(내 파일만 명시적으로
스테이징). `git log` 를 내 작업 목록으로 읽지 말고 위 표의 SHA 로 판단한다.

## 검증 명령

```bash
npm run verify:staging-llm-mock                  # 게이트 4케이스 + 진리표 224 + love 폴백 + fetch 0
node --test __tests__/ui/mock-test-runner.test.mjs   # setupFiles 실재·실제로 무는지 + 매퍼 커버리지
npm run check:fast                                # 변경 기반 1회
```

🔴 `check:fast` 의 기본 베이스는 **작업 트리**다. 옆 세션의 미커밋 파일 때문에 검사 범위가
그쪽으로 넓어진다. 내 커밋만 보려면 `--committed-head --base=<sha> --head=<sha>` 를 쓴다.

## 함정 (이번에 실제로 밟은 것)

- **`npx jest <파일>` 은 보호를 끈다.** 로컬에서 테스트 하나만 돌릴 때도 `npm run test:jest` 를
  쓴다. 지금은 `setupFiles` 가 막지만, 그건 **이번에 넣은 것**이다.
- `mock-network-guard.cjs` 를 CI 잡의 `NODE_OPTIONS` 로 올리지 않는다 — `npm ci` 까지 막힌다.
  `setupFiles` 는 jest 안에서만 도므로 안전하다.
- ESM `export { X } from "./y.js"` 는 **재수출이라 로컬 바인딩을 만들지 않는다.** `lib/llm-client.ts`
  는 `callLLM` 안에서 `isStagingLlmMockEnabled` 를 쓰므로 `import` 후 `export { X }` 로 나눠 적었다.
- `lib/tarot/*.mjs`·`scripts/verify-*.mjs` 는 **CRLF** 다. `Edit`·`sed` 가 EOL 을 떨구므로 node 패치
  스크립트를 파일로 써서 실행한다. 블록을 지울 때는 **앞의 빈 줄까지 패턴에 포함**해야 빈 줄이
  겹치지 않는다.
- `spawnSync("npm.cmd", ...)` 는 이 환경에서 `stdout` 이 `null` 로 온다. 검증 스크립트를 부를 때는
  `process.execPath` 로 직접 실행한다.
- `config/env.contract.json` 의 `consumers` 는 그 파일이 **키 이름을 문자열로 포함**하는지까지
  본다(`scripts/env-parity.mjs:254`). `lib/llm-client.ts` 에서 함수를 빼도 `CloudflareEnv` 의
  `STAGING_LLM_MOCK_ENABLED?: string` 선언이 남아 있어 통과했다 — 그 줄을 지우면 깨진다.

## 다음 세션의 첫 문장

> `docs/handoff/refactor-phase2-2026-09-13.md` 를 읽고, TOP 10 의 남은 절반(tarot 라우트의
> love·mindscan LLM 우회 → oracle 어댑터 패턴 이관)의 **위험·검증·롤백을 먼저 보고**한다.

Phase 2 를 여기서 닫고 Phase 3(안전망 보강 — `tsconfig` 범위·eslint 가시화·CI `skipped` 구멍,
TOP 18·19)로 넘어가는 선택도 가능하다. 그 경우 우회 2곳은 원장에 `미해소` 로 남기고 Phase 6
(라우트 공통화)에서 함께 다룬다 — 어차피 AI 상담 라우트 8개가 같은 문제를 갖고 있다.
