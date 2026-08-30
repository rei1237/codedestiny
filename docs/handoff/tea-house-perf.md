---
updated: 2026-08-30
status: 소스 수정·가드·확인 측정 완료 — PR 대기
---

# 찻집 렉 최적화 — 작업 상태

사용자 신고: 연이의 운명 찻집이 앱에서 렉. ① 프롤로그 ② 타로 앨범 스크롤.
범위(사용자 확정): **찻집 중심 · 확인된 공통 원인만 네오에 적용 · 감축은 앱/저사양에서만**(고사양·웹은 현행 유지).

🔴 계획 정본: `C:/Users/user/.claude/plans/worktree-app-login-completion-humming-neumann.md`

## 지금 어디까지

절제 실험으로 원인 2개를 확정하고 소스에 반영, 재발 가드(`verify:tea-house-perf-budget`)를 PR CI fast 잡에 배선했다. **원인·수치·재현 명령은 고친 코드의 주석에 함께 남겼다** — 여기 다시 적지 않는다.

1. **앨범** — `.cdShimmer` 애니메이션을 `.cdFlipInner.is-flipped` 로 한정. 안 보이는 카드 78장이 `background-position`(합성 불가·페인트 전용)을 매 프레임 움직이던 것.
2. **프롤로그** — `@keyframes petalFall` 의 `transform` 에서 `var()` 제거(`.petal` / `.petalInner` 두 겹으로 분리). var() 가 있으면 컴포지터가 그 애니메이션을 못 받아 메인스레드로 내려온다.
3. **프롤로그(저사양)** — `useLowEndPetalLimit()` 로 앱·저사양에서만 꽃잎 7 → 3장.

## 확인 측정 (2026-08-30 · Slow4G · 3회 중앙값)

| | 기준선 | 수정 후 |
|---|---|---|
| 앨범 끊긴 프레임(CPU 4x) | 32.6% (31.2–48.8) | **1.1% (0.0–2.2)** |
| 앨범 Task | 3134ms | **1641ms** |
| 앨범 레이어 / 카드 | 613 / 78 | **613 / 78** (불변) |
| 프롤로그 RecalcStyle(CPU 6x) | 1305ms | **806ms** |
| 프롤로그 Task | 5468ms | 4669ms |

🔴 **프롤로그 수치는 `var()` 제거분만이다.** 하네스가 12코어·16GB·Capacitor 없음이라 3번 감축이 발동하지 않는다. `window.Capacitor` 주입 시 7→3장 확인(하이드레이션 오류 0건)했지만 **실기기 발동은 미검증**.

## 하네스 함정 (다시 밟지 말 것)

1. 🔴 **측정용 dist 는 반드시 `npm run build:mobile:app`** — 앨범은 잔량 응답이 `tarotAlbumUnlocked:true` 여야 카드 78장을 그리는데, 하네스 스텁은 **외부 URL 에만** 걸리고 잔량 호출이 외부로 나가는 건 네이티브 브릿지가 주입됐을 때뿐이다. `NEXT_PUBLIC_RUNTIME_TARGET=mobile-app npm run build` 로는 안 된다(그건 SSR 분기만 바꾼다). 아니면 "앨범에 카드가 0장이다" 로 죽는다.
2. 🔴 **하이드레이션 전 클릭은 증발한다** — 서버 HTML 버튼은 보이지만 클라 번들이 아직 안 붙었다(`readyState:complete`·대기 요청 0이라 겉으론 멀쩡). `waitForHydrated()` 가 막는다. 스로틀을 끄면 우연히 통과한다.
3. `channel:"chromium"` 필수 — 기본 headless shell 은 합성기가 없어 프레임을 안 떨군다.
4. 랜딩 단계에서 `.petalsLayer` 는 `display:none` 이다. 꽃잎을 재려면 프롤로그로 진입하거나 인라인으로 되살려야 한다.
5. 🔴 **앨범 CSS 는 `<style>{\` … \`}</style>` 템플릿 리터럴 안이다** — 주석에 백틱을 쓰면 리터럴이 거기서 끝나 webpack 구문 오류가 나고, Next export 가 `dist/` 를 비운 뒤 실패한다. `typecheck` 가 `TS1005` 로 잡는다.
6. 입장은 CPU 4x 에서 프레임을 안 떨궈 판정이 안 된다 — 프롤로그 레버는 **CPU 6x 의 `RecalcStyle`·`Task`** 로 잰다.

## 다음 행동

1. **PR 머지**(사용자) → 스테이징 자동 배포.
2. **4단계: vc40 / 1.0.40 릴리스 빌드**를 바탕화면에 산출. 🔴 서명 설정은 `apps/mobile/android/release-signing.properties` 이고 **파일 내용을 출력하지 않는다**.
3. 기기에서 ① 프롤로그·앨범 체감 ② 꽃잎이 실제로 3장인지 확인.
4. 미착수: **네오 라우트에 같은 원인이 있는지** `perf:app-route` 로 점검(범위상 "확인된 공통 원인만" 적용).
5. 참고: `TalkingPigYeoni.tsx` 에 거의 같은 저사양 인라인 판정이 있다. 통합하면 좋지만 이번 범위 밖이라 손대지 않았다.

## 환경 상태

| | |
|---|---|
| 워크트리 | `.claude/worktrees/app-oauth-return-path` |
| 브랜치 | `worktree-tea-house-perf` |
| 측정 | `npm run perf:app-route -- --runs=3 --segments=album --passes=frames --net=slow4g --cpu=4` |
| `node_modules` | 워크트리에 링크 없음(빌드는 상위 설치본을 주워 쓴다). 레포 밖 스크립트에서 `playwright` 를 쓰려면 `createRequire(<레포>/package.json)` 로 해석할 것 |

## 사용자 쪽에 열려 있는 것

1. **`code-destiny-1.0.39-vc39.aab` 플레이 콘솔 업로드 미완료**(바탕화면). vc40 이 나오면 건너뛰어도 된다.
2. 🔴 **업로드 키스토어 비밀번호가 2026-08-30 세션 트랜스크립트에 평문으로 남았다.** 외부 전송·커밋은 없었고 파일은 gitignored 다. 로테이션 여부는 사용자 판단이며 **미결**.
3. **네오 결과 화면 하단 safe-area 수정(PR #1318) 미검증** — `?neoPreview=` 가 `NODE_ENV !== "production"` 전용이라 프로덕션 `dist/` 로 렌더 불가, `next dev` 는 깨져 있다. 기기에서 눈으로 확인해야 한다.
