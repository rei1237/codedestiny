---
status: in-progress
updated: 2026-09-13
next: Phase 4 의 다음 단계는 **TOP 4 수렴 설계**다. 보호 테스트는 끝났다(`__tests__/ui/permission-writer-divergence.behavior.test.js`, 4/4 · 변이 5/5). 이 문서의 "다음 세션이 할 일"부터 읽는다. 계획 정본은 docs/refactor/phase-plan.md.
---

# Phase 4 — 권한·세션 계층 (TOP 4·5·15)

## 왜 이 범위인가

원장의 Phase 4 는 TOP 3·4·5·6·15 였다. 착수 전 재측정에서 **3 과 6 은 이미 닫혀 있었다**
(`73ce8327f`). 실작업은 **4·5·15** 뿐이다. 근거는
[structural-issues-top20.md](../refactor/structural-issues-top20.md) 의 `## 3·4·5·6·15 재측정`.

## 지금 상태

**보호 테스트 완료.** 프로덕션 코드는 한 줄도 고치지 않았다.

계획서의 고정 작업 루프가 "보호 테스트 먼저"이고, 그 루프가 물은 질문은
*"TOP 4 의 엇갈림이 실제로 재현되는가, 아니면 3·6 처럼 재판정 대상인가"* 였다.
답: **재현된다.** TOP 4 는 수렴 대상으로 확정됐다.

커밋 3개, main 에 머지 완료(머지 커밋 `--no-ff`):

| 커밋 | 내용 |
|---|---|
| `73ce8327f` | 착수 전 재측정 — 3·6 은 이미 닫혀 있었다 |
| `94e08631b` | 보호 테스트 신설 (324줄) |
| `f1033ec8d` | 재현 결과를 원장·계획서에 기록 |

🔴 **아직 push 하지 않았다.** 이유는 아래 "왜 push 를 미뤘나".

## 재현된 엇갈림 4종

전부 **같은 사용자·같은 기능·같은 순간**에 답이 갈린다. 상세 표와 원인은 원장의
`### 4 는 재현된다: 엇갈림 4종` 절에 있다. 요약만 적는다.

| 축 | 엇갈림 |
|---|---|
| W1 × W4 | 서버가 권한을 회수하면 **셸은 즉시 잠그고 React 는 60초 열어 둔다** |
| W1 × W3 | 결제 실패 롤백이 access-store 만 비우고 **원장은 남는다** → 셸 잠금 / React 열림 |
| W1 × W2 | 이용권 만료 직후 한 화면이 **세 답**을 쥔다 (`isUnlocked=true` · `tier='free'` · `coversNow=false`) |
| W1 × W3 수명 | 원장 `legacy_verified` 는 +72h 에 죽고, `confirmed` 는 **+365일에도 산다** |

writer 4개의 이름은 테스트 파일 머리말에 W1~W4 로 적어 뒀다.

## 🔴 이 작업의 고유한 함정

**1. 테스트 하네스가 가짜 시계 없이는 성립하지 않는다.**
TTL 자체가 관측 대상이라 `Date` 를 `Proxy` 로 감싸 `now` 를 손으로 돌린다. 네 writer 중
둘은 classic script(`js/core/*.js`), 둘은 TS 다 — 한 `node:vm` 컨텍스트에 같이 올리려고
TS 쪽만 `ts.transpileModule` 로 CJS 변환한다(선례: `scripts/lib/load-ts-module.mjs`).
**로드 순서가 중요하다**: `pass-verdict.js` 를 먼저 올려야 한다. `access-store` 의
`syncPassVerdictSnapshot` 이 전역을 찾는다.

**2. 미탐지 변이가 "단언이 약하다"는 뜻이 아니다.**
1차 변이 검증에서 2/4 만 잡혔는데, 두 미탐은 전부 **변이가 무효**였다.
TTL 을 `0` 으로 바꿔도 시계가 안 움직이는 테스트에서는 `now - ts === 0` 이고 `0 > 0` 은
거짓이다(→ `-1` 로 교체). pass-verdict 의 만료 폐기(`:186`)만 꺼도 `stale` 판정(`:503`)이
독립적으로 `coversNow=false` 를 만든다(→ `ACTIVE_TTL` 까지 같이 올려야 유효).
유효한 변이로 바꾼 뒤 **5/5**. 미탐지를 보면 단언을 의심하기 전에 변이부터 의심한다.

**3. 원장이 암시한 수명 방향이 반대였다.**
"access-store 가 24h GRACE 로 먼저 닫히고 원장이 72h 로 버틴다"고 읽었는데, `ensureLoaded`
로 컨텍스트를 세우고 재면 access-store 는 +73h 에도 열려 있다. **먼저 죽는 쪽은 원장이다.**
가설을 적지 말고 측정을 적는다.

**4. 낙관 TTL 불일치는 없다.** access-store `:996-1010` 도 원장도 10분이다. 기각된 가설.

**5. 4 와 5 는 같은 사건이다.** W1 × W4 축이 TOP 4 의 몸통이자 TOP 5 그 자체다.
몽키패치 유무에 따라 **같은 `access-store.js` 의 같은 호출이 다른 답을 받는다.**
수렴 설계에서 두 행을 따로 다루면 안 된다.

## 왜 push 를 미뤘나

머지 시점 main 에 **다른 세션의 미푸시 커밋 13개**가 쌓여 있었다(share·sitemap 축, 마지막
커밋이 5분 전 — 활성 세션). push 하면 그쪽 작업 단위까지 같이 스테이징에 올라간다.
내 3커밋은 신규 테스트 1개 + 문서 2개라 런타임 영향이 0 이므로, **push 판단을 그 세션에
넘겼다.** 그 세션이 push 하면 같이 올라간다. 급하면 따로 push 해도 무방하다.

머지 전에 겹침을 확인했다: 그쪽 13커밋이 건드린 `__tests__/ui/` 파일 2개는
share 축이고, 내 writer 4개 파일·`docs/refactor/` 와는 **교집합 0**이다.

작업 워크트리 `phase4-permission-20260913-112733` 은 제거했다(공유 `node_modules` junction 을
먼저 끊고 지웠다 — 그냥 지우면 공유 `node_modules` 가 딸려 간다). 브랜치
`wt/phase4-permission-20260913-112733` 은 **남겨 뒀다**: origin/main 에 아직 안 올라간
커밋이라 복구 지점으로 쓴다. push 후에 `git branch -d` 로 지우면 된다.

## 검증

- `node --test __tests__/ui/permission-writer-divergence.behavior.test.js` → **4/4**
  (머지 후 main 에서 재확인)
- 변이 검증 **5/5 탐지**, 원복 후 `git status` 깨끗
- `npm run check:fast` — 문서 커밋에서 `whitespace`·`verify:doc-freshness` 통과
- 테스트 배선은 불필요하다. `jest.config.cjs:45` 가 `__tests__/ui/` 를 제외하고,
  `scripts/lib/mock-test-config.mjs` 의 `NODE_TEST_PATTERNS` 가 `__tests__/ui/*.test.js`
  를 자동으로 집는다 → `npm run test:node` 가 이미 돌린다.

## 다음 세션이 할 일

1. **TOP 4 수렴 설계.** 서버 정본 하나에 묻는 형태를 정한다. 네 writer 를 지우는 게 아니라
   **답의 출처를 하나로** 만드는 일이다. 설계 시 반드시 같이 볼 것:
   - `app/_lib/use-content-unlock.ts:66` 의 `||` 합류 — React 의 답은 access-store ∪ 원장이다
   - `unlockedFeatureIds` 에 **출처(provenance)가 없다** — 이용권으로 열린 것과 따로 산 것을
     구분 못 하는 게 W1 × W2 의 뿌리다. 여기가 스키마 변경 지점이 될 수 있다
   - 동결 파일 `app/_lib/billing-client.ts`·`app/hooks/useCoinGate.ts` 를 건드리면
     `config/payment-freeze.json` 절차
2. **TOP 5**(몽키패치 범위)를 4 와 **같은 설계 안에서** 처리한다. 위 함정 5 참조.
3. **TOP 15**(fetch 래퍼·재시도 정책 수렴) — 아직 손대지 않았다. 경로는
   `lib/http-client.ts` 가 아니라 `app/_lib/http-client.ts` 다.
4. 수렴이 끝나면 **보호 테스트를 뒤집는다.** 그 파일은 옳은 동작이 아니라 수렴 전 실측을
   고정한 것이라, 수렴 커밋에서 단언이 깨지는 게 정상이다. 머리말에 그렇게 적어 뒀다.

## 범위 밖 결함 (코딩 원칙 14 — 보고만)

1. **`app/_lib/optimistic-unlock-ledger.ts:42` 가 `confirmed` 엔트리를 영원히 만료시키지
   않는다.** `entry.mode !== "confirmed" && ...` 조건 탓이다. 같은 파일 `:13` 주석은 만료된다고
   적혀 있다 — 코드와 문서가 어긋난다. 실측으로 +365일 뒤에도 `true`.
2. **`js/core/access-store.js` 의 `confirmedUnlocks` 는 서버가 "안 열렸다"고 답해도 회수되지
   않는다.** 명시적 `revokedFeatureIds` + `source.version` 페이로드(`:643-650`)가 있어야만
   지워진다. 환불·권한 취소 경로가 이 페이로드를 보내는지는 이번에 확인하지 않았다.
3. **`verify:sitemap-drift` 선행 실패** — 내 변경과 무관하다. 변경 0인 트리에서 동일하게
   실패함을 확인했다(13개 sitemap 파일, "URL 집합은 같지만 lastmod·priority 가 다르다").
   그 뒤 다른 세션이 `1524ecc01`·`18643bdd8` 로 sitemap 원장을 손댔으니 이미 닫혔을 수 있다.
