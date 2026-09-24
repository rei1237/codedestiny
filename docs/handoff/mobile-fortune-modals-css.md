---
status: active
updated: 2026-09-24
next: 운영 승격은 사용자 1회 명시 승인 대기(범위 c255916e2..main, 이니시스 2차 재실사 결제 커밋 포함). 승인 없으면 아래 후속 과제 중 하나를 고른다
---
# 기본 운세 모달 모바일 CSS 최적화 (2026-09-24)

## 결과

- 커밋: `f67733823` (CSS), `a46978945` (sync 캐시 키 수렴). 워크트리 `wt/mobile-fortunes-css-20260924-080219` 에서 origin/main 머지 후 main 으로 fast-forward push.
- 후속 커밋(같은 날, main 직접): `861dbd68b` (주역 모달 CSS 확장), `1c41144ba` (sync 캐시 키 수렴).
- 범위: 숙요점·자미두수·점성술·거북점(주역) 모달의 모바일 조작 하한만. 색·서체·배치 재설계 없음, 데스크톱 무변경(모두 기존 모바일 미디어쿼리 안).

| 결함(360px 실측) | 수정 | 위치 |
|---|---|---|
| 헤더 제목·닫기 8.7px, 홈 10px | 0.86rem(12px) | `styles/core-ui.css` 모바일 헤더 블록 |
| 숙요 기본 요약 탭 3개가 2+1 줄 | 한 줄 레일(14px·44px), 360 미만만 가로 스크롤 | `styles/basic-fortune-library.css` 끝 |
| 자미 흐름 탭 4개가 3+1 줄 | 2×2 균등 | 같은 블록 |
| 자미 간소/상세 칩 34px·라벨 9.8px | 44px·12px | 같은 블록(엔진 주입 규칙 이기려 ID 2개) |
| 27숙 달력 월 입력이 “2026년 0” 으로 잘림 | 104→140px | `index.html` `#sukuyo-basic-calendar-style` 480px 블록 |
| 달력 이전/다음 32px | 44px | 같은 블록 |
| 오늘 숫자 대비 ≈1.2:1 | #161a33, 9.5~15.5:1 | 같은 블록 |
| 주역 헤더 제목·닫기·홈 10.08~11.62px(다른 3개 모달과 그리드 불일치) | 0.86rem(12px), grid 레이아웃 통일 | `styles/core-ui.css` 기존 9곳 선택자 목록에 `#juyukNavBar` 추가 |
| 주역 배지·질문 라벨·상태문구 10.08~11.62px | 0.86rem(12px) | `styles/fortune-ui.css` `.tc-header-badge`/`.tc-question-label`/`.tc-status-msg` 모바일 규칙 신설 |

검증: 로컬 정적 서버 감사(가로 넘침 0 유지, 헤더 소형 글자 3건 해소, 숙요 탭 rows=1 sw=cw), visual-checker 6컷 PASS,
check:fast 의 paid-gate 88/88, sitemap-drift·mobile-detail-nonintrusive·mobile-detail-render·paid-gate-ui·entry-encoding·test:node 통과.
주역 후속 검증: `window.__cdMobileHomeLazyMount.mount()` 로 강제 재마운트 후 360/390px 실측 — 네비바 4종 동일 12.04px·대비 13.23:1(grid 정렬 다른 3개와 일치), 배지·라벨·상태문구 12.04px(수정 전 10.08~11.62px), 입력창 16px(iOS 확대 방지 유지)·셸 버튼 180×180px 터치 타겟, 360/390px 가로 오버플로 0. visual-checker 4컷 중 3 PASS, 1건은 아래 후속 과제로 분리(오늘 수정과 무관한 기존 결함으로 확인).

## 남은 것 (후속 과제, 이번 범위 밖)

- 결제 축이라 미수정: 숙요 연간 운세 “보기”(56x34, JS 인라인 스타일, 코인 게이트 진입점), 자미 `.cd-section-gate__btn`(36px). payment-gating 절차로 따로.
- 숙요·자미 본문 차트 내부 글자(명반 셀·27숙 원형 차트 칩 등 9~11px)는 도표 밀도라 손대지 않음.
- 헤더 제목의 💫/🌌 이모지가 `background-clip:text` 그라데이션에 먹혀 단색으로 보임(기존 동작).
- 달력 제목이 로컬에서 serif 폴백으로 보임 — 로컬 폰트 환경 가능성, 미확인.
- `styles/fortune-ui-home.css`(크리티컬 CSS 스냅샷)가 이번 주역 수정으로 `styles/fortune-ui.css`(원본)와 더 벌어짐 — `npm run build` + `node scripts/build-fortune-ui-critical.mjs` + `npm run sync:public` 로 재생성 필요. 다만 `js/noncritical-defer-loader.js` 가 기능 타일 탭 즉시 전체 `fortune-ui.css` 를 로드하므로(45초는 무상호작용 폴백일 뿐) 실사용 드리프트는 낮은 우선순위.
- `.tc-question-inp`(주역 질문 입력창) 플레이스홀더가 360/390px 에서 끝부분("?" 등)이 잘림 — `styles/fortune-ui.css:13333` 에 `text-overflow`/`white-space` 처리가 없고, 사이트 전역 iOS 확대 방지 규칙이 `.92rem` 대신 16px 로 강제 렌더해 악화. 오늘 diff 와 무관한 기존 결함(확인됨) — 별도로 조사·수정.
- 모든 운세 오버레이의 빈 컬렉션은 다른 세션 담당.
- 운영 승격: 사용자 1회 명시 승인 필요. main 에는 이니시스 재감사 결제 수정 등 다른 세션 커밋이 함께 실려 있으니 승격 범위를 다시 알리고 승인받는다. 롤백 대상 `c255916e2`.

## 다음 세션 첫 문장

“docs/handoff/mobile-fortune-modals-css.md 를 읽고, 운영 승격 승인 여부를 확인한 뒤 남은 후속 과제 중 하나를 고른다.”
