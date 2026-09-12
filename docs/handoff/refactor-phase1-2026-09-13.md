---
status: active
updated: 2026-09-13
next: Phase 2 는 부분 완료다(refactor-phase2-2026-09-13.md). 다음 세션은 그 문서부터 읽는다.
---

# 점진 구조 개선 Phase 1 인수인계

Phase 0 인수인계는 [refactor-phase0-2026-09-13.md](refactor-phase0-2026-09-13.md) 다. **작업 규칙·금지
영역·왜 이 리팩터링을 하는가는 그 문서가 정본이며 여기서 반복하지 않는다.** 이 문서는 Phase 1 에서
바뀐 것과 Phase 2 가 알아야 할 것만 싣는다.

## 완료한 Phase

**Phase 1 — C급 중복 수렴.** 대상은 TOP20 의 16·17 이었다.

| 커밋 | 내용 |
|---|---|
| `dc93b4545` | `worker/lib/profile-limits.js` 의 `KRW_PER_COIN` 재선언 제거 → `billing-policy.js` 를 import 해 되내보낸다 (+ `config/sitemap-lastmod.json` 재생성) |
| `6559cb245` | 환산율을 **자기 안에 하드코딩**하던 가드 2개(`verify-payment-policy-md.mjs`·`verify-krw-copy-canonical.mjs`)를 정본 import 로 |
| `827248162` | `verify-krw-copy-canonical.mjs` 에 `lib/payment/coin-pricing.ts` 상수 대조 2건 추가(fail-closed) |
| `82a933f8d` | 원장 16·17 을 변이 검증 결과로 정정 + phase-plan 종료 보고 |

**검증된 마지막 코드 변경 = `827248162`** — `npm run check:payment` 전량(가드 20종 + jest 231 suites /
2,699 tests, EXIT=0)으로 확인했다. `82a933f8d` 는 문서뿐이다. 되돌릴 일이 생기면 문제를 만든 그
커밋 하나만 `git revert` 한다.

CI: `82a933f8d` 에서 10개 워크플로 전부 success(`CI required` 포함).

## 🔴 Phase 1 의 전제가 측정에서 깨졌다 — 다음 Phase 도 같은 위험이 있다

계획은 "네 축(상수·원화 포맷·`normalizeGender`·`Asia/Seoul`)을 기계적으로 수렴"이었다. 변이 검증까지
해 보니 **여섯 축 중 실제 작업은 둘뿐**이었다.

- pass 가격 4종 · worker 내 `KRW_PER_COIN` → **이미 가드가 묶고 있었다**(값을 틀어 확인).
- 원화 **포맷** 인라인 · `normalizeGender` → C급이 아니다. 벌끼리 **계약이 다르다**
  (`useServerPrice.ts:50` 은 `Math.floor`+`""`, 정본 `formatKrwAmount` 는 `Math.round`+`"0원"`).
  하나로 모으면 동작이 바뀐다 → **Phase 6** 으로 이관.
- `Asia/Seoul` 179파일 → 값이 하나뿐인 리터럴이라 드리프트가 성립하지 않는다. 상수화해도 얻는 보호가
  0 이다 → **이번 리팩터링에서 하지 않는다**. Julian day·`iana-offset` 도 같다(Phase 7 뒤에나 안전).

교훈: **"같은 값이 N벌"은 그 자체로 C급 근거가 아니다.** 이미 묶여 있는지(변이로 확인)와 벌끼리 계약이
같은지를 먼저 본다. 근거표는 [structural-issues-top20.md 의 "16·17 재측정"](../refactor/structural-issues-top20.md#1617-재측정-2026-09-13-phase-1).

## 계획에 없던 것을 하나 찾아 고쳤다 — 가드가 지킬 값을 자기 안에 적어 뒀다

`scripts/verify-payment-policy-md.mjs` 는 "PAYMENT_POLICY.md 의 KRW = cost × 100"을 단언하면서
`const KRW_PER_COIN = 100` 을 **자기 파일에** 두고 있었다. `billing-policy.js` 의 값을 120 으로 바꿔도
**PASS** 였다 — 환산율이 바뀌면 결제 정책 문서가 낡은 환율 기준으로 영원히 초록불이 된다.

`lib/payment/coin-pricing.ts`(화면 표시 원화 정본, `app/` 에서 20곳 넘게 쓴다)도 주석만
"`billing-policy.js` 와 반드시 일치해야 한다"였고 `scripts/**`·`__tests__/**` 참조가 **0** 이었다.
둘 다 `verify:krw-copy-canonical` 에서 묶었다(`.ts` 라 import 대신 소스 리터럴 추출, 못 찾으면 실패).

🔴 **다음 Phase 에서도 가드를 손댈 때는 "그 가드가 지키는 값을 그 가드가 다시 적고 있지 않은가"를 본다.**

## 관측 중 — shadow 4/10 (2026-09-13)

승격 조건은 여전히 **main push 10회 + 오탐 0 + 사용자의 명시적 승인**이다(Phase 9).

| # | 커밋 | run | 스텝 결과 |
|---|---|---|---|
| 1 | `c3aa60546` | `34715837924` | 41개 전원 success |
| 2 | `6a4ebccbd` | `34716138331` | 41개 전원 success |
| 3 | `15c2dae90` | `34716169426` | 41개 전원 success |
| 4 | `82a933f8d` | `34717452761` | 41개 전원 success |

**오탐 0 유지.** 워크플로 레벨 `success` 는 근거가 안 된다 — 스텝마다 `continue-on-error: true` 라
가드가 실패해도 잡은 초록이다. 반드시 스텝 결론을 본다:

```bash
gh run list --workflow=guards-shadow.yml --limit 15 --json databaseId,headSha,conclusion,event
gh run view <id> --json jobs --jq '.jobs[].steps[] | select(.conclusion != "success") | "\(.conclusion)\t\(.name)"'
```

## 다음 작업 — Phase 2 (LLM 경계 닫기)

> 🔴 **이 절의 전제 두 가지는 2026-09-13 실측에서 틀린 것으로 판명됐다** — TOP 11 은 "깊이가 다른
> 테스트" 문제가 아니었고(진짜 구멍은 실호출 차단이 러너에만 있던 것), TOP 10 의 우회는 3곳이
> 아니라 2곳이다. 결과는 [refactor-phase2-2026-09-13.md](refactor-phase2-2026-09-13.md) 를 본다.
> 아래는 Phase 2 **착수 시점의 계획**으로 남긴다.

대상은 TOP20 의 **10·11** 이다. 가치가 아니라 **사고 예방**이라 Phase 4(최고가치)보다 앞에 뒀다.

- **11 (🔴 먼저)**: `jest.config.cjs` 의 목 매퍼가 `^\.\./\.\./lib/llm-client\.ts$` 라는 **상대 깊이**에만
  걸린다. 깊이가 다른 테스트는 목을 못 받는다 = **테스트가 실과금 LLM 호출을 할 수 있다.**
- **10**: LLM 추상화 우회 3곳 — `lib/tarot/oracle-consultation.mjs:299`,
  `lib/tarot/mindscan-reading.mjs:841`, `lib/tarot/love-reading-llm.mjs:167`. mock 게이트 5벌 재구현.

Phase 2 를 시작할 때 확인할 것:

1. 줄번호는 2026-09-12 측정 기준이다. 해당 행만 재확인하고 원장 날짜를 갱신한다. **전수 재측정 금지.**
2. 실호출 차단은 fail-closed 여야 한다(코딩 원칙 10). "목이 있으면 쓴다"가 아니라 **"목이 없으면 실패"** 다.
3. 고친 뒤 반드시 **변이 검증**한다 — 목을 일부러 벗겨서 테스트가 실패하는지 본다. 통과하면 그 가드는
   무는 게 아니라 도는 것이다.
4. 로컬 실측 때만 `mock-network-guard.cjs` 를 켠다. CI 잡 `NODE_OPTIONS` 에 넣으면 `npm ci` 까지 막힌다.

## 작업 트리 상태 (2026-09-13 인계 시점)

내 커밋 4개는 전부 push 됐다. 남아 있는 미커밋 변경은 **옆 세션 것**이며 내가 건드리지 않았다:

```
app/components/auth/AuthShell.tsx
```

옆 세션은 이 인계를 쓰는 동안에도 커밋했다 — `47e8b88c9`·`280d3434b`(꽃돼지 로딩 스프라이트)는
**내 검증 범위 밖**이고, `index.html`·`public/**` 미러·`config/sitemap-lastmod.json` 의 변경분은
그쪽 커밋에 들어갔다.

🔴 이 레포는 main 체크아웃을 옆 세션과 공유한다. `reset --hard`·`stash`·`checkout --` 는 그 세션의
작업을 복구 불가로 지운다 — 쓰지 않는다. `git add .` 도 쓰지 않는다(내 파일만 명시적으로 스테이징).
`git log` 를 내 작업 목록으로 읽지 말고 위 표의 SHA 로 판단한다.

## 검증 명령

```bash
node scripts/verify-krw-copy-canonical.mjs      # coin-pricing.ts 대조 2건 포함
node scripts/verify-payment-policy-md.mjs       # 정본 import 로 환산율 확인
npm run check:payment                            # 결제 축 전량(가드 20종 + jest)
npm run check:fast                               # 변경 기반 1회
```

🔴 `check:fast`·`check:payment` 의 기본 베이스는 **작업 트리**다. 위의 옆 세션 미커밋 파일 때문에 검사
범위가 그쪽으로 넓어진다. 내 커밋만 보려면 `--committed-head --base=<sha> --head=<sha>` 를 쓴다.

## 함정 (이번에 실제로 밟은 것)

- `scripts/verify-*.mjs` 상당수가 **CRLF** 다. `Edit`·`sed` 가 EOL 을 떨구므로 node 패치로 고친다.
  패치 스크립트에 백틱(템플릿 리터럴·`String.raw`)이 있으면 `node -e "..."` 는 bash 가 망가뜨린다 —
  **파일로 써서 `node <파일>`** 로 실행한다.
- ESM `export { X } from "./y.js"` 는 **재수출이라 로컬 바인딩을 만들지 않는다.** 그 모듈이 `X` 를
  내부에서 쓰면 `undefined` 가 된다. `import` 후 `export { X }` 로 나눠 쓴다.
- `app/**` 를 건드리면 `config/sitemap-lastmod.json` 의 라우트 의존 서명이 무효화돼 `verify:sitemap-drift`
  가 막는다. `npm run sitemap:generate` 로 재생성해 **같은 커밋에** 넣는다(이번엔 유료 라우트 13개,
  lastmod 변화 없이 서명만).
- `worker/lib/billing-policy.js` 는 import·env·전역이 **하나도 없는** 순수 상수 모듈이라 클라이언트
  번들에 들어가도 안전하다(`AppPassStoreClient.tsx` 가 실제로 import 한다). 여기에 import 를 추가하면
  그 안전성이 깨진다.
- `worker/lib/app-store-pricing.js` 의 `amountKRW` ↔ `webAmountKRW` 중복은 **의도된 것**이다(10-18행).
  합치면 웹가를 고칠 때 Play Console 등록가가 조용히 따라 움직인다. 수렴 대상으로 착각하지 않는다.
