---
status: active
updated: 2026-09-03
next: PR-3 머지 확인 뒤 "남은 작업"의 후보 자리를 이어갈지 사용자에게 묻는다. 새 자리는 반드시 폭 스윕 + A/B 대비 + visual-checker 를 다시 돈다.
---

# 달빛 예화(月花) 모티프 — PR-3 섹션 가지·고민 인장·모란

## 왜

"메인 화면의 다른 부분에도 달빛 예화로 아름답게 꾸며줘" — PR-1(#1500 히어로·구분선)·PR-2(#1506 카드 인장·스파클) 뒤 남은 홈 섹션.

## 지금 상태

PR-3 구현 완료 → **사용자 머지 대기**(PR #1521, CI 통과). 새 자리 5곳:

- 왜 우리 섹션 상단 좌우 가지 200x154 (카드 뒤로 절반 숨김) · AI 카드 상단 좌우 가지 240x185 (≤1200 170x131, ≤900 우상단 100x77 만)
- 고민 활성 카드 **우상단** 인장 88px(≤680 60px) — `aria-expanded="true"` 카드에서만 켜져 선택을 따라 옮겨 간다
- 피드백 카드 가운데 열 우측 모란 140px · 푸터 링크 허브 2행 우하단 모란 220px (둘 다 ≤900 숨김)
- **파인더 필터 행 가지는 넣었다가 뺐다** — 구분선 마스크의 미러 쌍이 방식/가격 행 사이 거터에 떠 "나눌 것 없는 구분선"으로 읽혔다(visual-checker 3차). 정적 테스트가 재삽입을 막는다.

## 남은 작업

- [ ] PR #1521 머지 확인(CI 는 2026-09-03 통과).
- [ ] 후보 자리(미착수, 사용자 결정 필요): 파인더 가지를 살리려면 **단방향 가지 마스크**(현재 `branch-h` 는 좌우 대칭 구분선)를 생성기에 추가하고 가격 행 baseline 에 앉혀야 한다. 제외한 곳: `#moonMusicEntry`·`#cdFortunePick`(결과 영역이 동적)·`.cd-quick-card`(PR-2 결정).
- [ ] 미검증: 390px AI 카드 가지의 A/B 대비 — 고정 테마 토글이 같은 자리에 겹쳐 측정이 오염된다. 같은 규칙인 480px 값(pig p90 1.60 / neo 1.38)으로 갈음했다.
- [ ] 사용자 판단 필요: visual-checker 4차는 **≤480 AI 우상단 가지 제거**를 추천했다(보이는 77x60 중 위 40px 가 고정 테마 토글 밑). 그 판정은 카드 상단이 뷰포트 상단에 맞춰진 캡처 기준이라 스크롤 중 잠깐만 그렇다고 보고 **남겼다** — 실기기에서 보고 거슬리면 900px 블록의 `--tr` 규칙 하나를 `display:none` 으로.

## 정본 예시

`scripts/design/gen-yehwa-motifs.mjs` 의 `/* ── PR-3:` 블록(배치 근거·실측 주석 포함) → `npm run` 없이 `node scripts/design/gen-yehwa-motifs.mjs` 로 재생성.

## 함정

- PR-2 문서의 함정 전부 유효: [home-yehwa-motifs-pr2.md](home-yehwa-motifs-pr2.md).
- 🔴 `.cd-ai-feats > .cd-yehwa-sprig` 의 1200px 축소 블록은 900px 블록보다 **앞에** 있어야 한다 — `--tr` 규칙과 특이도가 같아 순서로 이기고, 뒤집히면 모바일에 170x131 이 남아 제목과 겹친다(이번에 한 번 실제로 뒤집혔다). 정적 테스트가 순서를 단언한다.
- 🔴 820px 아래에서 AI 카드 헤더가 가운데→왼쪽 정렬로 바뀌고 네오는 390px 에서 눈썹 라벨이 가운데 정렬이다 — 모바일 가지 자리는 두 테마를 따로 재야 한다.
- 겹침 판정은 폭 12단계(1350→390) 스윕으로 글자 잉크 상자와 교차 면적을 잰다. 왜 우리 가지는 카드 아이콘과 ~800px² 겹치는 것으로 나오지만 불투명(.96) 카드 **아래**라 픽셀 편차 ≤14/255 로 확인됨 — 그 항목만 예외.
- 고민 카드에 `overflow:hidden` 을 새로 걸었다 — 포커스 링은 `outline` 이라 잘리지 않는 것을 확인했지만 hover 확대(transform)와 인장이 함께 움직이는지는 데스크톱만 봤다.

## 검증

```
node scripts/design/gen-yehwa-motifs.mjs --check
node --test __tests__/ui/home-yehwa-motifs.static.test.js
npm run verify:hero-firstpaint-lock && npm run verify:home-service-registry && npm run verify:mobile-detail-nonintrusive && npm run verify:hero-contrast
```

## 모르는 것

없음(위 "미검증" 1건 외).
