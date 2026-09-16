---
status: active
updated: 2026-09-17
next: 1b(라우트 그룹별 Tailwind 분할) 파일럿 — 설계·검증 기준을 RED 로 보고한 뒤 착수
---

# 전역 렌더 차단: 루트 Suspense(완료) + 전역 Tailwind CSS(남음)

출발점: `docs/handoff/music-lounge-perf-2026-09-16.md` 남은 과제 1번.

## 다음 세션 첫 문장
"docs/handoff/global-css-render-blocking-2026-09-17.md 의 1b(라우트 그룹별 Tailwind 분할)를 RED 로 위험·검증·롤백부터 보고한 뒤 saju 그룹 파일럿으로 착수한다. 1a(루트 Suspense 제거)는 끝났다."

## 1a 루트 Suspense 제거 — 완료 (`28b88e330`, push 됨)

원인(실측): `app/layout.js` 의 `<Suspense>` 는 프리렌더에서 멈추지 않지만, React Fizz 가 12.8KB(progressiveChunkSize)
넘는 경계를 떼어 내보내 본문 전체가 `<div hidden id="S:0">` 로 나갔다. 인라인 `$RC` 가 돌아야 보였고
(JS 꺼지면 본문 0px), React 19.2 노출 스로틀(`$RT+300ms`)에 걸릴 수 있었다.
경계에 기대던 곳은 `/fortune-chat/`(page 가 `useSearchParams` 클라이언트를 바로 렌더) 하나 — page 에 자기 경계를 달았다.
나머지 `useSearchParams` 5곳은 이미 자기 경계가 있거나 useEffect 동적 import.

검증(같은 HEAD 로 BEFORE/AFTER 전체 빌드, 로컬 dist, iPhone 13, 스크래치 `probe-suspense.mjs`):

| 라우트 | S:0 | JS-off 본문 텍스트 | 에러 |
|---|---|---|---|
| /music/ | 1→0 | 0→627 | 0 |
| /saju/ | 1→0 | 0→4058 | 0 |
| /tarot/ | 1→0 | 0→3795 | 0 |
| /share/ · /fortune/share/ | 1→0 | 0→1079 | 0 |
| /points/ | 1→0 | 0→189 | 0 |
| /insights/ | 1→0 | 0→7836 | 0 |
| /fortune-chat/ · /login/ · 결과 페이지 2종 | 0→0 | 변화 없음(자체 CSR) | 0 (login 1회 `Event` 는 3회 재실행에서 0 — 흔들림) |

클라이언트 이동 /saju/→/tarot/ 정상. 빌드 1637/1637 페이지 생성, `useSearchParams` 빌드 오류 없음.
Lighthouse mobile 3회 중앙값(perf:home --route, 옆 세션 dev 서버 2개 가동 중이라 편차 큼):

| | Perf | FCP | LCP | TBT |
|---|---|---|---|---|
| /music/ BEFORE | 85 (70–86) | 2118 | 3755 | 175 |
| /music/ AFTER | 88 (88–88) | 2103 | 3460 | 134 |
| /saju/ BEFORE | 67 (67–85) | 3097 | 7667 | 111 |
| /saju/ AFTER | 67 (66–69) | 3383 | 7882 | 71 |

시뮬 LCP 는 네트워크 그래프로 계산되고 이 변경은 그래프를 바꾸지 않으므로 차이는 노이즈 범위다.
확정 효과는 JS 없는 본문 노출과 `$RC` 대기 제거. 남은 LCP 는 아래 CSS 가 잡는다.
check:fast exit 0(jest 276 스위트/3873). 롤백: `git revert 28b88e330`.

선행 결함(범위 밖): 로컬 `npm run build` 후처리 `verify:adsense-readiness` 가
`out/fortune/date/2026-09-15/dog: 사이트맵 URL 의 HTML 이 산출물에 없다` 로 실패(BEFORE 에서도 동일, 날짜 의존).
빌드 가드 `[no-dev-server]` 는 다른 워크트리의 dev 서버도 잡는다 — 그 `.next` 가 다른 체크아웃이면 `ALLOW_DEV_SERVER_DURING_BUILD=1`.
빌드는 `rss.xml`·`insights/rss.xml`·`public/{,insights/}rss.xml` 4개를 고친다 — 커밋하지 말고 되돌린다.

## 1b 전역 Tailwind CSS — 남음 (RED)

실측(music 워크트리 dist, `8f2b1a38…css` 563KB, br 70KB):
- Tailwind 유틸리티가 약 450KB(이스케이프 선택자 규칙만 402KB/3814개). 나머지는 globals.css 본문·preflight.
- 다른 전역 시트: `05b29…`(98KB, @font-face 189개), `12508…`(59KB, theme-tokens·feature-marketing-detail·mobile-bottom-nav·yehwa-motifs-nav), `771df…`(20KB, GlobalHeader 모듈).
- content 글롭별(Tailwind CLI, utilities 만): 전체 522KB · app 만 451KB · src 만 96KB · src 제외 451KB. src/** 는 실사용(샘플 173/173 이 번들에 있음) — 글롭 축소로는 못 줄인다.
- **한 라우트 그룹만 쓰는 유틸리티 바이트(클래스 토큰 포함 검색, 스크래치 `tw-route-rank.cjs`)**: 공유 101KB · 미매칭 10KB · 그룹 전용 합계 약 410KB.
  saju 109KB · app/components 59KB(공유 컴포넌트라 전역 유지) · src/features/fortune-tea-house 48KB · src/components 21KB · points 17KB · tarot 15KB · fortune 14KB · palm-reading 13KB · oracle 13KB · admin 12KB · fusion-fortune 9KB · insights 8KB · feedback 7KB · naming-ai 7KB · life-book-ai 7KB …
  → 라우트 그룹 전용분을 빼면 전역 유틸리티는 이론상 약 450→170KB.

설계안(미검증):
- 그룹별 CSS `app/<group>/<group>-utilities.css` = `@config "<그룹 전용 tailwind config>"; @tailwind utilities;` 를 그 그룹 layout 에서 import.
  그룹 config 의 content 는 그 그룹 파일(+그 그룹이 쓰는 src/features/*), 전역 config 는 그 그룹을 제외. 겹치는 클래스는 양쪽에 생성돼도 무해.
- 🔴 캐스케이드 위험: 지금은 유틸리티가 globals.css 사용자 규칙·CSS 모듈보다 **앞**에 있다. 그룹 시트는 전역 시트 **뒤**에 오므로,
  같은 요소에서 같은 속성을 두고 겹치던 사용자 규칙(`.cd-*` 등)·preflight 보다 유틸리티가 이기게 뒤집힌다.
  native `@layer` 로 감싸면 비레이어 preflight(요소 선택자)에 져서 더 크게 깨진다 — 쓰지 말 것.
- 검증 기준: 그룹 내 전 라우트, 모바일·데스크탑, 모든 요소의 computed style BEFORE/AFTER diff 0(A-vs-A 노이즈 대조군 먼저 —
  메모리 css-move-regressions-need-a-computed-style-diff). 전역에서 빠진 클래스를 쓰는 그룹 밖 파일이 없는지(미매칭 10KB 확인).
  클라이언트 이동 시 그룹 시트 로드 전 FOUC 여부(다른 그룹 → saju 이동).
- 파일럿: saju(109KB) 하나로 효과(전역 시트 br 크기·/music/ LCP)와 diff 를 먼저 잰다. diff 가 0 이 아니면 되돌리고 보고.
