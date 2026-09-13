---
status: active
updated: 2026-09-13
next: Phase 4(권한·세션 계층 — TOP 3·4·5·6·15). 그 전에 🔴 shadow 41개 차단 승격 결정이 사용자 승인만 남아 있다(아래 "올려야 할 결정").
---

# 점진 구조 개선 Phase 3 인수인계

작업 규칙·금지 영역·왜 이 리팩터링을 하는가의 정본은
[refactor-phase0-2026-09-13.md](refactor-phase0-2026-09-13.md) 다. Phase 1·2 의 결과는
[refactor-phase1-2026-09-13.md](refactor-phase1-2026-09-13.md) ·
[refactor-phase2-2026-09-13.md](refactor-phase2-2026-09-13.md). **여기서는 반복하지 않는다.**

## 완료한 것 — Phase 3

대상은 TOP20 의 **18·19**(안전망 보강)였다. 재측정 근거표는
[원장의 "18·19 재측정" 절](../refactor/structural-issues-top20.md#1819-재측정-2026-09-13-phase-3)에 있다.

| 커밋 | 내용 |
|---|---|
| `53536305b` | 필수 게이트 `ci-required` 가 `skipped` 를 통과로 인정하던 구멍을 닫는다 — 선언(`runs_*`) 대 실행(`result`) 대조 |
| `ea63cd451` | `no-undef` 그물을 `lib/` 로 넓히고, 파싱 실패를 "위반 0" 으로 세던 fail-open 을 막는다 |

### 19 — `skipped` 가 통과로 세지던 구멍 (`53536305b`)

**무엇이 문제였나.** `pr-ci.yml` 의 lane 4개(`fast`·`guards`·`build`·`critical`)는 전부
`if: needs.classify.outputs.runs_X == 'true'` 로 돈다. `ci-required` 는 `if: always()` 로 모아서
"`failure`·`cancelled` 가 없으면 통과"였다. 즉 `classify` 가 **성공하면서 출력을 비우면**
(출력 키 오타, `steps.tier` id 드리프트, `GITHUB_OUTPUT` 쓰기 실패) 4개 lane 이 전부 skip 되고
룰셋의 **유일한 필수 체크가 검사 0건으로 초록**이 된다. 진짜 통과와 구분되지 않는다.

**어떻게 고쳤나.** 인라인 bash 루프를 `scripts/verify-ci-required-lanes.mjs` 로 교체했다.

- 판정 기준이 "not-failure ⇒ 통과" → **"선언과 실행이 일치하는가"** 로 바뀌었다.
  `classify` 자신이 `success` 인가 → `tier` 가 아는 값인가 → `runs_build`/`runs_critical` 이 티어
  매핑과 맞는가 → `runs_X=true` 인 lane 이 실제 `success` 인가 / `false` 인 lane 이 실제 `skipped` 인가.
- 티어→lane 매핑은 **다시 적지 않는다.** `scripts/resolve-ci-tier.mjs` 의 `TIERS` 를 export 로 바꿔
  그걸 import 한다. 게이트 안에 값을 복사하면 고치려던 드리프트를 게이트가 재현한다
  (Phase 1 의 `verify-payment-policy-md` 가 정확히 그 실패였다).
- 미분류·빈 값은 **전부 실패**다(코딩 원칙 10). `"True"` 같은 대소문자 변형도 실패한다.
- CI 안에서 `--self-test`(17케이스)를 먼저 돌린 뒤 실판정한다. 게이트가 망가진 채로 판정하지 않게.

**건드리지 않은 것.** `if: ${{ always() }}` 와 `needs:` 목록은 그대로다 —
`scripts/verify-worker-single-deploy-guard.mjs:335-338` 이 둘 다 단언한다. 의존성이 없는 순수
모듈이라 `npm ci` 도 돌리지 않는다(`classify` 잡과 같은 이유).

### 18 — 타입·린트 사각지대 (`ea63cd451`)

원장의 네 축 중 **셋이 오진**이었다(근거는 원장 표). 요약하면:

- `worker/` 는 73파일이 아니라 **309**파일이고, `verify:worker-no-undef` 로 **이미 덮여 있었다**.
- `tsconfig` 에 `checkJs` 를 켜는 건 답이 아니다 — worker/ 하나만 켜도 **2,734 에러**다.
- `next.config.mjs` 의 `ignoreBuildErrors`/`ignoreDuringBuilds` 는 구멍이 아니다. typecheck·lint 는
  `fast` lane 의 `ci:fast` 가 **따로** 돌린다. 빌드 단계에서 또 돌리지 않는 건 중복 제거다.
- `eslint --quiet` 는 **잠긴 계약**이다. `scripts/deploy-safe.mjs:702` 가 인자를 만들고 `:1248` 이
  `--quiet` 가 빠지거나 `--max-warnings=0` 이 붙으면 릴리스를 실패시킨다. 현재 **에러 0 / warn 793**.
  풀려면 793건을 먼저 처리해야 하므로 별도 과제다.

**진짜 사각지대는 `lib/` 였다**(89파일). `next lint` 의 대상 디렉터리에는 들어 있지만
`.eslintrc.json` 이 `next/*` 만 extend 해서 `no-undef` 가 프로젝트 전역에서 꺼져 있고,
`.js`/`.mjs` 라 tsc 도 보지 않는다. 그 안에 **유료 경로**가 있다 —
`lib/tarot/{mindscan-reading,love-reading-llm}.mjs` · `lib/payment/*`.

- 새 가드를 만들지 않고 `verify-worker-no-undef.mjs` 를 `SURFACES` 테이블(`worker`/`lib`)로 넓혔다.
  **파일명은 바꾸지 않았다** — 배선 3곳(`deploy:critical`·`check:critical`·`pr-ci.yml:900`)이 경로
  모양에 묶여 있어서 옮기면 조용히 꺼진다(Phase 0 의 "파일을 옮기지 않는다").
- 전역 집합은 표면마다 **필요한 것만** 준다. `lib` 추가분은 `window`·`document` + CJS 3종뿐이다.
  넉넉히 주면 오타가 전역 이름과 겹칠 때 조용히 통과한다.
- 같은 커밋에서 **fail-open 하나를 막았다**: 문법이 깨진 파일은 `no-undef` 메시지를 만들지 않으므로,
  `message.fatal` 을 세지 않으면 "위반 0" 으로 통과한다. 검사되지 않은 것과 통과한 것을 구분한다.
- 결과: **390파일 0위반**(기지 데드코드 3건 제외).

## 변이 검증 — 도는 가드가 아니라 무는 가드인가

| 변이 | 결과 |
|---|---|
| 19-A: `classify` 출력을 전부 비움(4개 lane 전부 skip) | 탐지 |
| 19-B: 티어는 `critical` 인데 `runs_critical=false` | 탐지 |
| 19-C: `classify !== "success"` 검사 제거 | 🔴 **처음엔 16케이스 전부 통과**(미탐) → 케이스 추가 후 탐지 |
| 18-A: `lib/tarot/mindscan-reading.mjs` 에 미선언 식별자 주입 | 탐지 |
| 18-B: 같은 파일 문법 파괴 | 탐지(수정 전에는 "위반 0" 으로 통과했다) |

🔴 **변이 C 가 이번 Phase 의 교훈이다.** `classify` 성공 검사를 지워도 16케이스가 전부 통과했다 —
기존 실패 케이스가 전부 하류 규칙에도 걸렸기 때문이다. 그런데 실재하는 시나리오가 있다:
**문서 전용 PR** 에서 `verify:doc-freshness`(`runs_fast != 'true'` 일 때만 `classify` 안에서 돈다)가
실패하면, 4개 lane 이 정당하게 skip 된 채로 선언과 실행이 **완벽히 일치**한다. 그 케이스를
17번째로 추가해 탐지시켰다. 자기검사 케이스가 많다고 변이가 잡히는 게 아니다.

## 검증 명령

```bash
npm run verify:ci-required-lanes -- --self-test   # 17케이스, CI 안에서도 먼저 돈다
npm run verify:worker-no-undef                    # worker·lib 390파일, ~5초
npm run check:fast                                # 33스텝 EXIT=0 (두 커밋 각각에서 확인)
node scripts/verify-guard-wiring.mjs --report     # 새 verify 가 배선됐는지
```

`verify:ci-required-lanes` 를 인자 없이 로컬에서 돌리면 `CLASSIFY_RESULT` 등이 비어 있어
**실패하는 것이 정상**이다(fail-closed). 실판정은 CI 의 env 주입이 있을 때만 의미가 있다.

## 🔴 올려야 할 결정 — shadow 41개 차단 승격

Phase 2 가 다음 세션에 넘기라고 명시한 건이다. **코드 작업이 아니라 사용자 승인 건이다.**

- `.github/workflows/guards-shadow.yml` 의 가드 41개가 **12/10 관측, 오탐 0** 으로 끝났다
  (`7c6af0e9d`). CLAUDE.md 의 "10회 push 비교 전까지 shadow" 조건은 충족됐다.
- 남은 건 **차단으로 올릴지에 대한 사용자의 명시적 승인 하나**다. CI 축이라 RED 이고,
  다음 세션이 대신 판단할 수 없다.
- 승격하면: 41개가 `UNWIRED_BY_DESIGN`/`SHADOW_OBSERVING` 에서 실제 게이트로 이동한다.
  롤백은 `SHADOW_OBSERVING` 복귀 커밋 하나로 끝난다.
- 이 건은 원장 **TOP 20** 의 나머지 절반이며, 승인이 나면 Phase 9 를 기다리지 않고 바로 닫을 수 있다.

## 남은 위험·후속 과제 (이번에 **안** 한 것)

전부 보고만 한다 — 범위 밖 결함은 고치지 않는다(코딩 원칙 14).

1. **`scripts/` no-undef 미덮임** — 750위반. 전수 확인 결과 **전부** `page.evaluate()` 본문의
   브라우저 전역이다(Playwright 스크립트가 노드 파일 안에 브라우저 코드를 문자열로 들고 있다).
   node+browser 합집합 전역으로 `SURFACES` 에 한 줄 더하면 깨끗해질 가능성이 높다. 실제 결함 없음.
2. **`js/` no-undef 미덮임** — 480위반 / 120이름. 112종은 크로스-`<script>` 전역이라 정상이다.
   "어디에도 선언 없음" 으로 뜬 8종은 **전부 오탐**이었다: `CURRENT_AGE` 는 `js/saju-engine.js:2586`
   의 다중 선언자 `var`, `G_JONG`·`G_JOHU`·`G_NATAL`·`G_BAZI` 는
   `js/saju-engine-continuation.js:110` 의 암묵 전역 할당(읽기는 `window.G_*`),
   `google`·`Chart`·`NodeFilter` 는 외부/브라우저 전역. 🔴 **프로덕션 결함은 0건.**
   이 표면을 덮으려면 파일 간 최상위 선언을 모으는 패스가 필요하다 — 그 자체가 한 세션 작업이다.
3. **`eslint --quiet` 로 warn 793건 비가시** — 푸는 건 `deploy-safe.mjs` 의 잠금을 함께 바꾸는
   일이라 RED 다. 793건을 분류(`no-explicit-any` 위주)한 뒤에야 의미가 있다.
4. **`**/*.ts` include 가 `.d.mts` 6개를 안 잡는다** — 선언 파일이라 피해가 작다.
5. **TOP 10 우회 2곳**(Phase 2 에서 폐기 판정) — Phase 6 에서 LLM 코어와 함께.
6. **`scripts/verify-ci-required-lanes.mjs` 가 `change-risk.mjs` 에서 미분류다** — push 후 실측:
   shadow 비교가 `unclassified source/config change` 로 찍었고, 그건 `change-risk.mjs:166` 의
   기본값 **medium**(= standard 티어)이다. 구멍은 아니다 — `ci-required` 는 `if: always()` 라
   이 게이트의 17케이스 자기검사가 **모든 main push 에서 무조건** 먼저 돈다. 분류 규칙을 더할지는
   `scripts/verify-*` 전체를 어느 등급으로 볼 것인가의 문제라 이 Phase 범위 밖이다.

## 다음 세션의 첫 문장

> `docs/handoff/refactor-phase3-2026-09-13.md` 를 읽었다. Phase 3(TOP 18·19)은 닫혔고,
> shadow 41개 차단 승격이 **사용자 승인 대기** 상태다. 이 결정부터 확인한 뒤
> Phase 4(권한·세션 계층 — TOP 3·4·5·6·15)를 시작한다.
