---
status: active
updated: 2026-09-11
next: PR(#1916) 필수 CI 통과·사용자 머지를 확인한 뒤, 스테이징에서 시나리오 B(아래)로 결과 화면 터치 스크롤이 되는지 확인한다.
---

# 마스터 인연의 서 — 모바일 결과 화면 스크롤 불가

## 왜

스테이징에서 결과 화면(/master-love-codex/result)까지 진행하면 모바일에서 스크롤이 전혀 되지 않아 결과를 볼 수 없었다(사용자 보고).

## 원인 (실측)

- 결과 화면에 도착했을 때 `body.style.overflow="hidden"` 이 남아 있었다. 결과 화면은 window 스크롤을 쓰므로 모바일 터치 스크롤이 0px 로 막힌다(iPhone 13 에뮬레이션, 정상 495px).
- 이 값을 남긴 것은 서로 모르는 **스냅샷·복원식 바디 락 두 개**다. 해제 순서가 LIFO 가 아니면 `"hidden"` 을 되살린다.
  - `CodexShell`(overlay 단계 동안 잠금)
  - `PaymentLoading`(모든 유료 기능의 결제 대기 화면)
- 재현 순서(시나리오 B):
  1. 결제 대기 화면이 열린다.
  2. 코덱스 오버레이가 마운트된다(`"hidden"` 스냅샷).
  3. 대기 화면이 먼저 닫힌다.
  4. 생성 완료 후 `router.replace` 로 오버레이가 언마운트되며 `"hidden"` 을 복원한다.
- 모바일 PortOne 리다이렉트 복귀 → 결제 확인 대기 화면 → resume → generating 경로가 이 순서다.
- 스테이징 재현: API 전부 로컬 fulfill(실결제·LLM 0), `cd:payment-loading-state`(mode `card`)로 대기 화면을 열고 닫는다. 결과 화면 scrollY 0 으로 재현됐다.

## 수정 (이 PR)

- `src/features/master-love-codex/components/CodexShell.tsx`, `app/components/common/PaymentLoading.tsx`
  - 직접 overflow 를 만지던 useEffect 를 정본 참조 카운트 락 `useBodyScrollLock`(`app/_lib/body-scroll-lock.ts`)으로 교체했다.
  - 🔴 둘 중 하나만 바꾸면 여전히 샌다. 둘 다 정본 락이어야 한다.
- `__tests__/ui/body-scroll-lock-owners.static.test.js`
  - 두 파일이 공용 락을 import 하고 `body.style.overflow` 를 직접 쓰지 않는지 단언한다.
  - 원본 코드에서 fail 2 가 나오는 것을 확인했다(무는 가드).
- 🔴 RED: PaymentLoading 공유. 대기 화면이 열린 동안 body 에 `data-cd-scroll-lock`·`paddingRight`(스크롤바 폭, 모바일 0)가 추가된다. 결제 로직·게이트·동결 파일은 무변경. 롤백은 커밋 revert.

## 검증

- 로컬 dev(패치본) mock Playwright 로 세 경로를 확인했다. 결과 화면 `overflow=""`, lock 속성 없음, 터치 scrollY 495.
  - 시나리오 B
  - 시나리오 A(오버레이 → 대기 열림 → 결과 → 대기 닫힘)
  - 무결제 통과
- 대기 화면·오버레이가 떠 있는 동안에는 여전히 잠긴다.
- 통과: typecheck, test:node(신규 포함), verify:paid-gate-ui, verify:portone-single-payment, 그 밖의 check:fast 단계(PR 본문 참조).
- 공유 node_modules 가 package-lock 과 어긋나 lint 파서 오류·jest `lru-cache` 누락·ci:preflight 드리프트 차단이 났다. 워크트리의 node_modules 정션을 떼고 격리 `npm ci` 후 재실행해 **변경 파일 eslint 통과, `test:jest` 228 스위트·2686 테스트 통과, `ci:preflight` PASS**.

## 후속 과제 (범위 밖, 보고만)

- `body.style.overflow` 를 직접 쓰는 곳이 더 있다. 같은 순서 문제를 일으킬 수 있는지는 미검증이다.
  - `src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`
  - `app/saju/destiny-bias/DestinyBiasClient.tsx`
  - `app/oracle/sikojen-povailu/SikojenpovailuApp.tsx`
  - `app/components/MindScanTarot.tsx`
- 메인 체크아웃의 공유 node_modules 가 package-lock 과 어긋나 있다(`npm ci` 필요). 다른 세션도 쓰므로 이번 작업에서는 건드리지 않았다.

## 전달 상태

- 브랜치 `fix/master-love-codex-result-scroll-lock`, PR https://github.com/rei1237/codedestiny/pull/1916 (Ready)
- 워크트리 `D:/Development/code-destiny/.claude/worktrees/codex-result-scroll-lock` — 스테이징 확인 후 제거한다.

## 다음 세션 첫 문장

"D:/Development/code-destiny 에서 docs/handoff/2026-09-11-master-love-codex-result-scroll-lock.md 를 읽고, PR #1916 머지 여부와 스테이징 SHA 를 확인한 뒤 모바일 결과 화면 스크롤(시나리오 B)을 스테이징에서 검증해줘."
