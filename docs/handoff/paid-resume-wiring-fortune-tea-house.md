---
status: active
updated: 2026-09-07
next: 이미 결제하고 결과를 못 받은 사용자 구제 방식을 사용자에게 물어 결정한다(환불 vs 이용권 지급) — 절대 규칙 2
---

# 모바일 결제 후 결과 미생성 — 재개(resume) 배선

## 왜

> "모바일에서 결제 이후에 메인 화면으로 갔다가 결과는 생성되지 않고 돈은 냈는데 결과는 볼 수 없는 치명적인 버그"

회당 ₩5,000~₩20,000. 재클릭하면 **또 결제된다**.

## 원인 (실측)

모바일 PortOne 은 상위 프레임을 리다이렉트한다 → 게이트의 `await` 가 문서와 함께 죽는다 → 게이트 **이후** 같은 클로저에 있던 생성 호출이 영영 실행되지 않는다. 복귀 문서가 기능을 다시 열려면 결제 **전에** 저장된 재개 서술자(`resume: { kind, action, args }`)와 그 kind 로 등록된 핸들러가 있어야 한다.

## 지금 상태 (2026-09-07)

배선 축은 **끝났다.** `verify:paid-resume-wiring` 기준 React 40/40 · 정적 46/46 · kind 43개가 핸들러와 짝을 이룬다.

- **A. 운명 찻집** — 완료(PR #1740). `FortuneTeaHousePage.tsx` 가 `usePaidResume` 로 등록되어 있고 `attemptId`·`cupId`·`questionInput`(packPaidResumeArg)을 서술자에 싣는다.
- **B. 마스터 러브 코덱스** — 완료(PR #1733). **관상·전생 관상** — 완료(이 브랜치 `fix/paid-resume-physiognomy`).
- **C. 가드** — `scripts/verify-paid-resume-wiring.mjs` 존재(PR #1727). 이 브랜치에서 **fail-open 구멍을 막았다**(아래).

### 이 브랜치가 고친 것

1. **가드가 루트 `*.js` 를 아예 안 읽고 있었다.** 정적 축 수집이 `루트 *.html + js/**` 뿐이라, 셸이 `data-action` 으로 지연 로드하는 루트 자산 `PhysiognomyUI.js`·`PastLifeFaceUI.js` 가 사각지대였다. 그 안에 `resume` 없는 `_cdCoinGatePerUse` 3건이 살아 있는데도 가드는 **PASS** 를 냈다(원칙 10 위반 — 대상이 안 걸리면 통과시키는 fail-open). 루트 `*.js` 를 정적 축에 편입하고 두 파일을 `MECHANISM_FILES` 와 `paid-flow-gates.yml` 트리거 `paths`(미러 포함)에 등재했다. 변이 테스트로 무는 것을 확인했다.
2. **관상 3건 배선.** 오관·점 정밀 분석 · 관상 궁합 · 전생 관상 궁합.

🔴 **관상 축의 고유 제약**: `PhysiognomyUI.js` 에는 `fetch(` 가 **한 건도 없다**. 분석 결과가 서버에 전혀 안 남는 순수 클라이언트 상태(`firstAnalysisResult` / `plfSelfResult`)라, 리다이렉트로 문서가 죽으면 복원할 재료 자체가 없다. 그래서 **결제 직전 localStorage 스냅샷**(`cd_physiognomy_resume_snapshot` / `cd_pastlife_face_resume_snapshot`, TTL 30분, 512KB 상한)을 굳히고 재개 시 되살린다. sessionStorage 가 아닌 이유는 카카오페이가 안드로이드에서 **새 탭**으로 복귀하기 때문이다. 스냅샷이 없으면 핸들러가 `false` 를 반환해 기존 "지금 열기" 카드로 떨어지고, 재과금은 유료 개방 영수증이 막는다.

## 남은 것 (전부 보고만 된 상태 — 코드 변경 없음)

- 🔴 **이미 돈을 내고 결과를 못 받은 기존 사용자 구제.** 서버가 입력을 보관하지 않아 재생성이 불가능하다. 수동 환불인지 이용권 지급인지 **사용자 결정 필요**. 환불 실행은 절대 규칙 2.
- 손금·운명 나침반은 배선돼 있지만 재개 데이터가 **sessionStorage** 라 카카오페이 새 탭 복귀에서 사라진다(별건).
- 운명 찻집은 자동 환불 경로(`worker/lib/payment-refund.js:416`)에 배선돼 있지 않다 — "결제만 되고 이용은 미확정" 상태가 남는다.

## 함정

- 🔴 **`attemptId` 를 복귀 문서에서 재계산하면 안 된다** — `src/features/fortune-tea-house/lib/honeyDrops.ts:28-41` 이 `Date.now()+Math.random()` 기반이고 서버가 이 값으로 결제 증빙을 매칭하므로(`worker/routes/fortune-tea-house.js:1234-1315`) 402 로 떨어진다. 반드시 서술자에 싣는다.
- 🔴 핸들러는 **게이트 없는 코어**를 불러야 한다(`app/hooks/usePaidResume.ts:15-16`). 공개 진입점을 재호출하면 게이트를 또 타서 재과금된다.
- 서술자 `args` 는 **원시값만 살아남는다** → `packPaidResumeArg` 로 접는다.
- `invokePaidResumeHandler` 는 `!== false` 를 전부 성공으로 본다 → 복원 실패 시 **명시적으로 `false`** 를 반환해야 "지금 열기" 카드가 뜬다.
- 재개 핸들러에서 file input `.click()` 을 부르지 않는다 — 사용자 제스처가 없어 브라우저가 조용히 막는다(전생 관상은 `plfBeginCompat(false)` 로 등록하고 보이는 버튼에 맡긴다).
- 루트 자산을 고쳤으면 `npm run sync:public` 으로 미러·캐시버스트 해시를 재생성해 **같은 커밋에** 담는다.

## 검증

```
npm run verify:paid-resume-wiring
npm run verify:static-asset-cache-keys && npm run verify:guard-wiring
node --test __tests__/ui/paid-resume-unlock-wiring.static.test.js __tests__/ui/direct-payment-resume.behavior.test.js
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

🔴 `check:quick` 은 이 변경에서 `risk=high` 로 판정돼(CI 워크플로 파일 포함) deep 체인을 돌리는데, 그 안의 `npm run build:worker` 는 **로컬에서 항상 실패한다** — `workers-og` 가 `package.json:543` 에 선언만 돼 있고 설치돼 있지 않다(레포 전역 사전 결함, 이 변경과 무관). CI 가 검증한다.
