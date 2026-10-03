---
status: done
updated: 2026-10-03
next: "docs/handoff/2026-10-03-yeoni-garden-ci-guard-wiring.md 대로 main CI(Verify guard wiring) 복구를 진행해줘"
---

# 연이 정원 개편 뒤 main CI 복구 — guard wiring 선언 2줄

## 왜

꽃돼지 연이의 운세 정원(꿀꿀 운세 셸 `/ggulggul/`) 개편을 main 에 반영·push(d0a352526)했는데 main CI 의 `CI required` 가 빨갛다.
사용자 원문: "CI 복구는 별도 세션으로 하기 위해서 인수 인계 문서 만들어" → 방식은 "추천사항으로"(아래 ① 승인).

## 지금 상태

- main = origin/main = `d0a352526455893056d0dc106b43d6dbd4fb3835` (개편 29커밋 + origin/main 병합 44eb28c52 + 사이트맵 원장 d0a352526). 스테이징 배포는 성공, 운영 승격 없음.
- CI 실행 37062244039: 실패는 **Static guards → "Verify guard wiring" 한 스텝**뿐. Paid Flow Gates·AI Locale·Secret Scan·Release(스테이징) 등 나머지 성공. `CI required` 는 이 한 레인 때문에 실패.
- 실패 원문:
  ```
  [verify-guard-wiring] FAIL
    아무 게이트도 부르지 않는데 사유 선언도 없는 검증기 2개:
      - verify:account-sheet
      - verify:all-fortunes-journey
    → 게이트에 배선하거나(사용자 승인 필요), 지우거나, UNWIRED_BY_DESIGN 에 사유와 함께 선언하세요.
  ```
- 두 검증기는 이번 개편에서 새로 만든 Playwright 실렌더 검사다(`scripts/verify-account-sheet-bounds.mjs`, `scripts/verify-all-fortunes-journey.mjs`, package.json 에 등록). 로컬에선 둘 다 통과(account-sheet 12회 OK, journey 4폭 OK).

## 할 일 (사용자 승인: ① 사유 선언)

- [x] `scripts/verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN` 배열, "실네트워크·실브라우저" 구역(현재 `["verify:i18n-rendered-korean", …]` 줄 바로 위)에 두 줄 추가:
  ```js
  ["verify:account-sheet", "playwright 실렌더(6폭·로그인/비로그인 stub) — 셸 계정 시트 위치·스크롤 잠금을 고쳤으면 손으로 돌린다. 게이트 승격은 사용자 승인 사항"],
  ["verify:all-fortunes-journey", "playwright 실렌더(4폭 검색·필터·복원·요청 감시) — 모든 운세 화면·finder 를 고쳤으면 손으로 돌린다. 게이트 승격은 사용자 승인 사항"],
  ```
  CRLF 파일이면 줄 끝을 맞출 것(Edit/sed 가 CRLF 를 떨굴 수 있음 — node 로 패치).
- [x] 검증: `node scripts/verify-guard-wiring.mjs --self-test` → `node scripts/verify-guard-wiring.mjs` (OK 확인) → `npm run check:fast`.
- [x] 커밋(이 파일 하나 + 이 문서 status 갱신) → push → main CI `CI required` success 확인. 스테이징 검증은 하지 않는다.
- [x] 끝나면 이 문서 `status: done`, 커밋 SHA 기록.

## 결과 (세션 9e2a4882)

- 워크트리 `wt/ci-guard-wiring-20261003-092458`(base e26488e65)에서 2줄 추가 — 이 문서를 `status: done` 으로 바꾼 커밋과 같은 커밋이다. 분류기 거부 없음.
- `--self-test` OK(24 케이스), 본 검사 OK(verify:* 330 중 266 배선, 64 사유 선언).
- `check:fast` 의 `npm test` 실패 3건(payments-v2.pass-check·subscription, yeongnyangi-service-packs)은 공유 node_modules 읽기 `UNKNOWN: unknown error, read` 헛실패 — 단독 재실행 3 스위트 136/136 통과.

## 🔴 실패한 시도·주의

- 이전 세션(0b539919)에서 위 편집을 자동 모드에서 시도했다가 분류기가 **"CI Bypass"** 로 거부했다. 이번엔 사용자가 ①을 승인했으니, 같은 거부가 나면 **우회하지 말고** 사용자에게 이 편집 권한 허용(또는 직접 승인)을 요청한다.
- 하지 말 것: CI 워크플로에 두 검증기를 배선(②, 게이트 추가는 별도 승인·PR 마다 브라우저 비용), package.json 에서 두 스크립트 삭제나 이름 변경(③ — 회귀 장치를 잃고, 이름 바꾸기는 검사 회피다).
- 사이트맵: 개편이 `public/i18n/*.json` 키를 늘려 주간 라우트 서명이 바뀌었고 d0a352526 에서 원장을 재생성했다. 이후 i18n 을 또 건드리면 `npm run sitemap:generate` 후 `config/sitemap-lastmod.json` 을 같은 커밋에 담는다.

## 참고 (범위 밖, 손대지 않음)

- 개편 관련 남은 결함 목록과 App Router 후속은 `docs/design/yeoni-garden-app-router-followup-2026-10-02.md` 및 세션 0b539919 최종 보고 참고: runtime-readiness 3건, mobile-cdp-smoke `#cdhMore`(base 동일), 768 대표 상담 카드 빈 띠, 1280 탭바가 출생시간 입력 가림, `/ggulggul/` 홈 탭 비활성(PATH_RULES).
- 병렬 세션 c064ff7f 는 2~5단계를 건너뛰어야 한다(사용자가 전달).
