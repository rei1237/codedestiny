---
status: active
updated: 2026-09-13
next: Phase 3 은 끝났다(refactor-phase3-2026-09-13.md). 다음 세션은 그 문서부터 읽는다 — shadow 41개 차단 승격이 사용자 승인 대기 상태로 넘어가 있다.
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

## 🔴 착수 전 실측 (2026-09-13) — 리터럴 이관은 지금 하면 안 된다

위 3항목을 실측한 결과, **어댑터가 값을 바꾸지 않는지**(합격 기준 1)가 **불합격**이다. oracle
어댑터를 그대로 갖다 쓰면 유료 기능 2개의 생성 파라미터가 8축에서 달라진다.

| 축 | 현재 (love·mindscan 직접 fetch) | oracle 어댑터 경로 | 판정 |
|---|---|---|---|
| 전송 시도 | 3회 — `love-reading-llm.mjs:304` · `mindscan-reading.mjs:911` | `TRANSPORT_ATTEMPTS = 2` (`tarot-oracle-llm.js:23`) | 3→2 감소 |
| 잘림 토큰 증폭 | `×(1+0.4·n)` cap 24000 (`:311` · `:918`) | `×(1+0.3·n)` cap=`capTokens` (`structured-consultation.js:73`) | 계수 변경 |
| 총 데드라인 | `*_TOTAL_TIMEOUT_MS` 기본 42000, 남은 예산을 per-call timeout 으로 넘기고 1500ms 미만이면 중단 (`:299`·`:305-310`) | **없다.** 어댑터에 총 상한 루프가 없다 | 🔴 전체 상한 소실 |
| topP | `*_GEMINI_TOP_P` 0.92 (`:167`) | `lib/llm-client.ts` 에 `topP` 가 **없다**(git grep 0건). `callGeminiText` 화이트리스트에도 없다 | 🔴 **조용히 사라진다** |
| thinkingBudget | `*_GEMINI_THINKING_BUDGET` 기본 **0** (`:171`) | `callGeminiText:130` 은 지원하지만 **어댑터가 안 넘긴다** | 🔴 thinking 토큰이 maxOutputTokens 를 잠식 → 잘림 증가 |
| temperature | `*_GEMINI_TEMPERATURE` 0.7 | 어댑터가 안 넘긴다 | 기본값으로 바뀜 |
| Workers AI 폴백 | **없다** (Gemini 실패 → 로컬 룰엔진) | `fallbackToWorkersAI` 기본 on + `fallbackMinChars` 필수 | 🔴 유료 2기능에 **새 공급자 경로**. 두 기능엔 `targetChars` 개념이 없어 문턱을 정할 근거가 없다 |
| 토큰 로깅 | 없다 | `logContext.featureKey`/`serviceId` 필요 | 결제 리포트에 신규 키 등장 |

**결정적 근거 — env 계약.** `config/env.contract.json` 이 선언한 `LOVE_READING_*`·`MINDSCAN_*`
**12개 키의 `consumers` 가 정확히 이 두 파일뿐**이다(`:1054-1219`). 어댑터로 옮기면 소비자가
사라져 `scripts/env-parity.mjs` 가 깨지거나, 더 나쁘게는 **노브가 선언만 남고 아무 데도 안 걸린다.**

**보호막 실측.** `scripts/verify-mindscan-reading.mjs` 는 실재하지만 `package.json` 에 **항목이 0개**다
(`node -e` 로 키·값 양쪽 grep 확인). 즉 mindscan 이관은 지금 **보호 테스트가 아예 없는 상태**에서
유료 경로를 바꾸는 일이다.

> 🔴 교훈: "같은 패턴으로 옮긴다"는 **패턴이 같을 때만** 무해하다. oracle 은 총 데드라인도
> 노브도 없이 태어난 라우트라 어댑터가 그 계약을 안 갖는다. love·mindscan 은 둘 다 갖고 있다 —
> 이관은 수렴이 아니라 **기능 축소**가 된다.

### 그래서 선택지는 셋

| 안 | 내용 | 비용·위험 |
|---|---|---|
| **A (권장)** | 이관 보류. 보호막만 먼저 — `verify-mindscan-reading` 배선 + mindscan staging-mock 등가 단언. 원장에 우회 2곳을 `미해소(Phase 6)` 로 확정 | 낮음. 유료 실행 경로 무변경 |
| B | 값 보존 이관 — `llm-client` 에 `topP` 추가 + 어댑터에 총 데드라인·노브 3개 전달 | 🔴 LLM 코어 변경이라 8개 AI 라우트 전체가 폭발 반경 |
| C | Phase 3(TOP 18·19 안전망)으로 이동. 우회 2곳은 Phase 6 에서 라우트 8개와 함께 | 낮음. 단 보호막은 여전히 없음 |

A → C 가 권장 순서다. A 는 B·C 어느 쪽으로 가든 **먼저 필요한 선행 작업**이라 버려지지 않는다.

### 판정 — A 채택, 보호막 배선 완료 (2026-09-13)

사용자가 A 를 선택했다. 이관은 폐기하고 보호막만 만들었다. **유료 실행 경로는 한 줄도 안 바뀌었다** —
`worker/routes/tarot.js`·`lib/tarot/*.mjs` 의 생성 코드는 무변경이고, 바뀐 것은 검증기·배선뿐이다.

| 파일 | 무엇 |
|---|---|
| `package.json` | `verify:mindscan-reading` 신규 배선 |
| `scripts/run-paid-gate-suite.mjs` | 유료 게이트 스위트에 항목 추가(oracle 2개 바로 아래) |
| `.github/workflows/paid-flow-gates.yml` | 트리거 `paths:` 에 검증기 경로 추가 — paths 는 깨어날 조건, 스위트가 실행 |
| `scripts/verify-mindscan-reading.mjs` | 케이스 6(staging mock) 추가 + 케이스 5 낡은 단언 정정 |
| `scripts/verify-staging-llm-mock.mjs` | love 와 등가인 mindscan 폴백 단언 추가 |

**🔴 배선하자마자 낡은 단언이 하나 터졌다.** 케이스 5 는 "locale 미지정 시 출력 언어 지시문이
없어야 한다"였는데, `2026-09-09` `a1e9b397b`(fix(i18n): preserve LLM request language)가 `ko` 에도
명시 출력 계약을 넣으면서 의도적으로 바뀌었다. 검증기의 마지막 수정은 `2026-08-21` `6e63ca1da` —
**19일 동안 아무도 몰랐다. 배선이 없었기 때문이다.** 제품 버그가 아니라 단언이 낡은 것이라,
잡으려는 회귀(locale 미지정이 엉뚱한 언어로 새는 것)는 유지한 채 현재 계약으로 고쳤다.

**변이 검증 2/2 탐지.** `mindscan-reading.mjs` 의 staging mock 분기를 `if (false && …)` 로 죽이자:

| 가드 | 결과 |
|---|---|
| `verify:mindscan-reading` 케이스 6 | 탐지 — `source가 staging_mock_local_fallback — source=rule-engine` |
| `verify:staging-llm-mock` 의 mindscan 단언 | 탐지 — `AssertionError` |

배선 메타 가드도 새 검증기를 배선된 것으로 센다(`verify:* 317개 중 255개 배선`).
`node scripts/run-paid-gate-suite.mjs --only mindscan` 으로 스위트가 실제로 집어 실행하는 것까지 봤다.

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

## 관측 완료 — shadow 12/10, 오탐 0 (2026-09-13) · 남은 건 사용자 승인뿐

승격 조건은 **main push 10회 + 오탐 0 + 사용자의 명시적 승인**이다(Phase 9).
앞의 둘은 충족됐다 — 12회 관측 전부 비성공 스텝 0. **승격은 사용자가 승인할 때만 한다.**

| # | 커밋 | run | 스텝 결과 |
|---|---|---|---|
| 1 | `c3aa60546` | `34715837924` | 41개 전원 success |
| 2 | `6a4ebccbd` | `34716138331` | 41개 전원 success |
| 3 | `15c2dae90` | `34716169426` | 41개 전원 success |
| 4 | `82a933f8d` | `34717452761` | 41개 전원 success |
| 5 | `280d3434b` | `34718114019` | 비성공 스텝 0 |
| 6 | `1ac30cd88` | `34718213041` | 비성공 스텝 0 |
| 7 | `22910230f` | `34718236946` | 비성공 스텝 0 |
| 8 | `29d723776` | `34721849384` | 스텝 48개 중 비성공 **0** (2026-09-13 확인) |
| 9 | `ef740fb91` | `34722043065` | 스텝 48개 중 비성공 **0** |
| 10 | `1ed96fd78` | `34723526476` | 스텝 48개 중 비성공 **0** |
| 11 | `083443cdb` | `34724323836` | 스텝 48개 중 비성공 **0** (옆 세션 커밋) |
| 12 | `455026d4e` | `34724385593` | 스텝 48개 중 비성공 **0** |

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
npm run verify:staging-llm-mock                  # 게이트 4케이스 + 진리표 224 + love·mindscan 폴백 + fetch 0
npm run verify:mindscan-reading                  # 마인드스캔 6케이스 (2026-09-13 배선)
npm run verify:guard-wiring                      # 새 검증기가 게이트에서 도달 가능한지 (fail-closed)
node scripts/run-paid-gate-suite.mjs --only mindscan  # 유료 게이트가 실제로 집는지
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

## 남은 위험 · 후속 과제 (이번 범위 밖, 보고만)

1. **`guards-shadow.yml` 에는 `verify:mindscan-reading` 을 넣지 않았다.** 보류 사유였던
   "관측 진행 중"은 **해소됐다** — 12/10, 오탐 0(위 표). 다만 마인드스캔 가드는 이미
   `paid-flow-gates.yml` 에서 **무는 가드로** 돌고 있으므로, shadow(관측 전용, 전 스텝
   `continue-on-error: true`)에 굳이 넣을 실익이 없다. 넣는다면 승격 결정과 함께 판단한다.
2. **love 쪽 회귀 검증기는 여전히 없다.** `verify:staging-llm-mock` 이 게이트 폴백 3단언만
   묶고 있고, mindscan 같은 6케이스 스위트는 없다. 우회 2곳 중 한쪽만 덮인 상태다.
3. **`LOVE_READING_*`·`MINDSCAN_*` 12키는 아무 가드도 값 범위를 안 본다.** `env-parity` 는
   consumers 문자열 포함만 본다(`scripts/env-parity.mjs:254`). 노브가 조용히 죽어도 모른다.

## 다음 세션의 첫 문장

> `docs/handoff/refactor-phase2-2026-09-13.md` 를 읽고 Phase 3(안전망 보강 — `tsconfig` 범위·
> eslint 가시화·CI `skipped` 구멍, TOP 18·19)를 시작한다. TOP 10 이관은 실측으로 폐기됐고
> 우회 2곳은 원장에 `미해소(Phase 6)` 로 확정돼 있으니 다시 열지 않는다.

Phase 2 는 여기서 닫는다. 우회 2곳은 Phase 6(라우트 공통화)에서 AI 상담 라우트 8개와 함께
다룬다 — 값 보존 이관은 라우트 2개가 아니라 `lib/llm-client.ts` 쪽 문제라서다.

🔴 **시작 전에 사용자에게 한 번 물을 것:** shadow 관측이 12/10·오탐 0 으로 끝나 CI 선택 실행
승격의 기계적 조건이 모두 충족됐다. 남은 건 **사용자의 명시적 승인 하나뿐**이고, 이건 다음
세션이 대신 판단할 수 없다. Phase 3 을 시작하면서 이 결정을 같이 올린다.
