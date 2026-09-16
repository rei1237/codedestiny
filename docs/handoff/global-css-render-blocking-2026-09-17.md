---
status: active
updated: 2026-09-17
next: 1b 는 saju 파일럿에서 회귀 실측으로 기각. /saju/ LCP 를 CSS·폰트·이미지·JS 몫으로 분해한 뒤 다음 수단을 고른다
---

# 전역 렌더 차단: 루트 Suspense(완료) + 전역 Tailwind CSS(남음)

출발점: `docs/handoff/music-lounge-perf-2026-09-16.md` 남은 과제 1번.

## 다음 세션 첫 문장
"docs/handoff/global-css-render-blocking-2026-09-17.md 를 읽고, 1b(라우트 그룹별 Tailwind 분할)는 기각됐으니 /saju/ 모바일 LCP(약 7.7초)를 CSS·폰트·이미지·JS 몫으로 실측 분해해 다음 수단을 추천부터 보고한다. 코드는 아직 고치지 않는다."

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

## 1b 전역 Tailwind CSS — saju 파일럿 결과 기각 (코드 변경 없음, 되돌림)

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

### 파일럿 결과(2026-09-17, 1a `28b88e330` 이후 main 소스) — 기각

구현: `app/saju/layout.js`(통과 레이아웃) → `app/saju/saju-utilities.css`(`@config` + `@tailwind utilities`),
`tailwind.saju.config.js`(content=app/saju, **blocklist=전역 content 후보 전부**라 saju 전용 클래스만 생성),
전역 config content 에 `!./app/saju/**`. 커밋하지 않고 되돌렸다.

좋았던 것(실측):
- 규칙 분할은 정확했다: 옛 유틸리티 5496 규칙 = 새 전역 4588 + saju 908, 잃음 0·추가 0·겹침 0(postcss 로 직접 생성해 대조).
- 전역 Tailwind 시트 563KB/br 59.5KB → 447KB/br 49.4KB(**-10KB br**), saju 시트 117KB/br 13.2KB. /music/·/tarot/·/saju/ computed style 차이 0.
- saju 시트는 전역 시트 4개 뒤에 링크된다(예상대로).

🔴 기각 이유 — **유틸리티끼리의 순서가 뒤집힌다**(핸드오프가 걱정한 사용자 CSS 역전이 아니라 다른 축):
Tailwind 는 한 시트 안에서 기본 → 반응형/상태 변형 순으로, 같은 CSS 변수를 쓰는 from/via → to 순으로 규칙을 정렬해 승자를 정한다.
saju 전용 클래스만 뒤 시트로 빼면, 전역에 남은 짝(`sm:w-auto`·`to-*`)보다 뒤에 와서 이긴다.
- 런타임(iPhone 13·1366px, A-vs-A 노이즈 차감): `/saju/destiny-meeting-place/` 데스크탑 48건 — `h-[220px] sm:h-[300px]` 에서 220 이 이겨 main 1104→1024px.
  `/saju/love-simulation/` 10/20건 — `via-*` 가 `to-*` 의 `--tw-gradient-to` 를 덮어 그라디언트 끝 색 소실. `/saju/destiny-bias/stage/` 구분선 그라디언트 동일.
- 정적(옛 시트 순서+명시도로 승자 비교, 같은 문자열 공출현 근사): 20쌍 — `w-[190px] sm:w-auto`, `leading-[1.02] sm:text-6xl`, `hover:scale` vs `active:scale`, 그라디언트 11쌍 등.
- "뒤로 옮겨도 승자가 안 바뀌는" 클래스만 고르면(공출현 근사 없이 보수적으로) **0개**다 — 명시도 (0,1,0) 이 같은 전역 사용자 규칙·유틸리티가 뒤에 너무 많다.
- blocklist 를 빼고 saju 가 쓰는 유틸리티 전부를 saju 시트에 두면 saju 파일 안 순서는 보존되지만, (1) 공유 컴포넌트 내부 클래스와의 순서, (2) 공용 유틸리티가 루트 사용자 CSS 뒤로 가는 역전, (3) 클라이언트 이동 후 남는 시트가 다른 라우트에 번지는 문제가 생긴다 — 미측정, 권장하지 않음.
- 순서를 제대로 지키려면 Tailwind 산출물 전체를 native `@layer` 로 재구성해야 하는데, 비레이어 사용자 CSS·CSS 모듈과의 승자가 광범위하게 바뀌는 대형 RED 다.

효과 상한: saju 전용 규칙 전체가 br 약 15KB(전역 Tailwind br 59.5KB 의 약 1/4). 그룹 전용 합계 410KB(원본)를 전부 빼도 br 수십 KB 수준이다.
→ /saju/ LCP 7.7초(시뮬)에 비해 작을 가능성이 크다. 다음은 LCP 분해 실측이 먼저다.

재현 도구(스크래치, 커밋 안 함): computed style 전수 대조(A 두 번+B, `MSYS_NO_PATHCONV=1` 필요 — Git Bash 가 `/saju/` 인자를 경로로 바꾼다),
라우트별 CSS 규칙 집합 대조(Next 최적화기가 선언이 같은 규칙을 다르게 묶어 `transform`/`filter` 묶음 49건은 의미 없는 차이), 승자 역전 정적 검사.
빌드는 두 번 모두 1637/1637 생성 후 선행 결함 `verify:adsense-readiness`(날짜 의존)에서 멈췄다 — dist 는 CSS minify 전 단계, 비교 조건은 동일.
로컬 `out/`·`.next/` 는 파일럿 빌드 산출물이다(dist 는 HEAD 빌드로 복원). 가드가 out/ 을 읽는 작업 전에는 다시 빌드할 것.
