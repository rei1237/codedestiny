---
status: active
updated: 2026-09-02
next: PR-A 머지 후 PR-B(가드·파이프라인·문서)를 새 세션에서 착수한다
---

# VN 44화 전수 검수 캠페인 (PR-A ~ PR-F)

## 왜

"라이트 노벨 스토리를 처음부터 끝까지 검수해 자연스럽게 잇고, 버그·성능 문제를 없애고,
더 재밌고 모순 없게 하고, 효과·기술을 배우는 계기도 개선하라."
계획 정본: `C:\Users\user\.claude\plans\synthetic-booping-sketch.md` (승인됨).

## 지금 상태

- PR-A(플레이어 안정성·성능) — 브랜치 `worktree-novel-player-stability`, 정본 무접촉.
- PR-B~PR-F 미착수. **한 세션 = 한 PR**, C~F 는 전부 같은 정본 파일을 만져 순차 진행이 강제된다.

## 남은 작업

- [ ] **PR-B 가드·파이프라인·문서** — `verify:vn-override-safety` CI 배선 · `lunaGuest` 트랙을
      `fetch-novel-assets.mjs` 미러와 플레이어 `RIVER_FALLBACK` 양쪽에 추가 · 「전 화 `beats[0]` 에
      bg·bgm 존재」 단언 신설 · `emotionPath` fail-open 뒤집기 · 길이 상한 260/250 통일 ·
      문서 드리프트 6곳(계획 S6). 판정: 새 단언이 **변이로 실제 실패**해야 한다.
- [ ] **PR-C 사실 모순 3묶음** — EP.12 #0~19 되감기 · EP.29 #150~158 이중 원고 · EP.30 시간/손수건/조약돌.
- [ ] **PR-D 기술 습득 계기** — 모카 24화 공백 · 루나 하위 단 부재 · 연이 이의/삼의 결 이름 출처 ·
      EP.14 #327 skill 카드 누락 · EP.31 #6 무효 bg 큐.
- [ ] **PR-E/PR-F 페이싱·재미** — 계획의 표 그대로.

## 정본 예시

`content/novel/episodes.source.json` (44화 8,844비트, 유일한 손편집 대상)

## 함정

- 🔴 **총 8,844비트 불변 — 같은 자리 교체만.** 추가·삭제하면 `verify-novel-runtime.mjs:94` 의
  `EXPECTED_BEAT_COUNT` 가 문다. 화당 200±4 는 **EP.17 이후에만** 성립한다.
- `expectedVisualCues` 3튜플이 `verify-novel-runtime.mjs:133-137` 과
  `verify-novel-player-start.mjs:107-109` **두 곳에 중복**돼 있다 — bg/bgm 을 바꾸면 둘 다.
- PROLOGUE 는 한글 2,041자로 하한 1,800자까지 여유가 241자뿐이다.
- 계획의 반박 검증 24건은 세션 한도로 못 돌았다. **CONFIRMED 표기 4건 외에는 착수 전 본문 대조 필수.**

## 검증

```
npm run novel:build && npm run verify:story-sync && npm run verify:novel-runtime
npm run verify:novel-player-start && npm run verify:vn-override-safety
npm run sitemap:generate && npm run verify:sitemap-drift
```

## 모르는 것

- 사자 색 정본 — 가이드라인 '금빛' · 바이블 '흰' · 본문 '은빛'. **사용자 판단 필요.**
- 텍스트 리더가 `readerPayload` 의 `im`(579비트)·`skill`(43비트)을 안 그린다. 렌더 추가인지
  명세 축소인지 미정 — 이번 캠페인 범위 밖.
- 죽은 자산(remaster webp 3종 ~343KB, BG 키 `siksang5`·`bigeopIn5`)은 절대 규칙 6 때문에 보고만 했다.
