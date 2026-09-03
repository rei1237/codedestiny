---
status: done
updated: 2026-09-03
next: PR #1506 머지됨. 후속은 home-yehwa-motifs-pr3.md 로 — 이 문서는 함정 절 참조용으로만 남긴다.
---

# 달빛 예화(月花) 모티프 — PR-2 카드 인장·스파클

## 지금 상태

PR-2 구현 완료 → **PR #1506 (`worktree-home-yehwa-pr2`) 사용자 머지 대기**. PR 본문에 실측 표와 검증 목록이 있다.

- 인장 6개: 운명의 문 1(좌하 88px / 모바일 64px) + 대표 상담 5(우하 88px). 모서리 밖으로 걸쳐 `overflow:hidden` 으로 잘라 호만 남긴다.
- 스파클 3개: 연이 일러스트 상자 안에만.
- **빠른 서비스 카드(`.cd-quick-card`)에는 인장 없음 — 2026-09-03 사용자 결정.** 사유는 `scripts/design/gen-yehwa-motifs.mjs` 의 🔴 주석과 `__tests__/ui/home-yehwa-motifs.static.test.js` 의 음성 단언(`quick.length === 0`)이 정본. 그 용도로 넣었던 `styles/fortune-gateway.css` 담기 CSS 는 되돌렸다.

## 남은 작업

- [ ] PR #1506 머지 확인. CI 는 push 직후 "no checks reported" 였으니 `gh pr checks 1506` 로 다시 볼 것.
- [ ] **미검증 · PR-2 범위 밖**: 모바일 `#cdSignatureConsult` 에서 (a) 스티키 헤더의 달 토글/`KR` 칩이 "대표 운명 상담" 마지막 글자를 덮고 (b) 하단 스티키 CTA 가 editor-notes 문구를 가린다는 visual-checker 지적 2건. 캡처 아티팩트일 가능성이 크고 **조사하지 않았다**. 손대려면 실기기/에뮬레이션으로 재현부터.
- [ ] `verify:public-mirror-fresh` 는 로컬에서 `.ignore` 하나로 FAIL 하지만 `git diff` 내용 차이 0(LF→CRLF 경고뿐)인 알려진 윈도우 위양성 — CI 결과를 따른다.

## 함정 (다음에 이 시트를 건드릴 때)

- 정본은 생성기다. `styles/yehwa-motifs.css` 를 직접 고치면 `--check` 가 실패한다 — 배치 규칙도 템플릿에 넣고 재생성.
- 🔴 인장은 `::before/::after` 로 바꾸지 말 것 — `.cd-sig-card` 는 `animation-fill-mode: backwards` 인 `cdSigRise` 를 돌아 의사요소가 시작 프레임에 붙들린다.
- 🔴 겹침 판정은 **박스가 아니라 칠해지는 고리**로. 박스 교차로 재면 빈 내부·모서리를 세어 43건으로 부푼다(고리 판정 후 9건 → 기하 정정 후 0건).
- 🔴 대비는 **A/B 픽셀 diff**(모티프 `opacity:0` vs 실제)로. 64px 에서 stroke 가 0.48px 이라 안티에일리어싱이 알파를 반쯤 먹어 데스크톱과 같은 값이 안 나온다 — 그래서 모바일만 `.5→.6`(네오 `.26→.31`).
- hover 하네스는 `<a>` 라 클릭이 이동한다 — `addInitScript` 로 click 을 capture 단계에서 preventDefault.
- `?v=build-` 핀은 손대지 말고 `sync:public` 이 회전시키게 둔다.
