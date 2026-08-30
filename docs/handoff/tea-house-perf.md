---
status: active
updated: 2026-08-30
next: 네오 라우트 점검 끝 — 공통 원인 0건이라 적용할 것이 없다. 남은 것은 사용자의 기기 확인과 release-signing.properties 41 올리기.
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
4. **네오 작전실 점검 — 공통 원인 0건이라 코드는 안 고쳤다**(2026-08-30). 하네스에 `--segments=neo-prologue` 를 붙여 실제로 쟀다.
   - 원인 ②(`@keyframes` `transform` 안의 `var()`): **전수 0건** — `git grep "transform:[^;]*var(" -- src/features/neo-war-room app/neo-operation-room` 은 2건이지만 둘 다 스프라이트 크롭용 **정적 규칙**이고 `@keyframes` 밖이다(찻집은 같은 패턴 19건).
   - 원인 ①(안 보이는 다수 요소의 페인트 전용 무한 애니메이션): 네오의 페인트 전용 무한 애니메이션은 `neoLionSneeze`(filter) 하나뿐인데 `data-scene="lionGlitch"` 전용이고 **그 씬은 프롤로그 20줄 어디에도 배정돼 있지 않다**(배정: hidden×2·shadow×2·lion×9·morph×2·humanNeo×5). 로딩 화면의 `neoLoadingSealReveal`(filter, 무한)은 `showOperationMap` 조건부 마운트라 생성 중에만 존재한다.
   - 실행 중 애니메이션은 **한 장면 최대 11개**(무한은 4개)이고 전부 요소 1개씩 — 찻집 앨범의 "안 보이는 카드 78장" 같은 형태가 없다.
5. **vc40 / 1.0.40 릴리스 빌드**(2026-08-30) — 머지된 `origin/main` `64d4a9dbe` 에서 산출해 바탕화면에 뒀다. 서명 인증서 SHA-256 이 vc39 와 같은 것을 `apksigner verify --print-certs` 로 확인했다(업로드 키 불변). 앱 번들의 CDN 재작성도 살아 있다 — `assets.code-destiny.com` 참조 **56개 파일**로, 계획 0단계가 의심하던 fail-open 무동작은 아니다.

## 확인 측정 (2026-08-30 · Slow4G · 3회 중앙값)

| | 기준선 | 수정 후 |
|---|---|---|
| 앨범 끊긴 프레임(CPU 4x) | 32.6% (31.2–48.8) | **1.1% (0.0–2.2)** |
| 앨범 Task | 3134ms | **1641ms** |
| 앨범 레이어 / 카드 | 613 / 78 | **613 / 78** (불변) |
| 프롤로그 RecalcStyle(CPU 6x) | 1305ms | **806ms** |
| 프롤로그 Task | 5468ms | 4669ms |

네오 프롤로그(16단계 × 3초 = 48초 표본, 같은 조건 3회 중앙값). 찻집은 5단계 = 15초 표본이라 **초당으로 환산해야 나란히 읽힌다.**

| | 끊긴 프레임 | 최악 프레임 | RecalcStyle | Task | 초당 Task |
|---|---|---|---|---|---|
| 네오 CPU 4x | **0.0%** (0.0–0.0) | 16.9ms | 1212ms | 6401ms | 133ms/s |
| 네오 CPU 6x | **0.0%** (0.0–0.0, 놓친 vsync 총 1회) | 33.3ms | 2810ms | 12050ms | 251ms/s |
| (참고) 찻집 프롤로그 CPU 6x 수정 후 | — | — | 806ms | 4669ms | 311ms/s |

🔴 **미검증**: 하네스가 `assets.code-destiny.com` 을 차단하므로 **캐릭터 이미지의 최초 래스터 비용은 이 수치에 없다**. 그리고 커맨드덱·결과 화면은 AI 실호출이 있어야 도달해 **안 쟀다** — 다만 그쪽 CSS 모듈의 무한 애니메이션 2종(`neoResultSpin`·`neoStatePulse`)은 둘 다 `transform` 전용이라 정적으로는 원인 ①에 안 걸린다.

🔴 **프롤로그 수치는 `var()` 제거분만이다.** 하네스가 12코어·16GB·Capacitor 없음이라 3번 감축이 발동하지 않는다. `window.Capacitor` 주입 시 7→3장 확인(하이드레이션 오류 0건)했지만 **실기기 발동은 미검증**.

## 하네스 함정 (다시 밟지 말 것)

1. 🔴 **측정용 dist 는 반드시 `npm run build:mobile:app`** — 앨범은 잔량 응답이 `tarotAlbumUnlocked:true` 여야 카드 78장을 그리는데, 하네스 스텁은 **외부 URL 에만** 걸리고 잔량 호출이 외부로 나가는 건 네이티브 브릿지가 주입됐을 때뿐이다. `NEXT_PUBLIC_RUNTIME_TARGET=mobile-app npm run build` 로는 안 된다(그건 SSR 분기만 바꾼다). 아니면 "앨범에 카드가 0장이다" 로 죽는다.
2. 🔴 **하이드레이션 전 클릭은 증발한다** — 서버 HTML 버튼은 보이지만 클라 번들이 아직 안 붙었다(`readyState:complete`·대기 요청 0이라 겉으론 멀쩡). `waitForHydrated()` 가 막는다. 스로틀을 끄면 우연히 통과한다.
3. `channel:"chromium"` 필수 — 기본 headless shell 은 합성기가 없어 프레임을 안 떨군다.
4. 랜딩 단계에서 `.petalsLayer` 는 `display:none` 이다. 꽃잎을 재려면 프롤로그로 진입하거나 인라인으로 되살려야 한다.
5. 🔴 **앨범 CSS 는 `<style>{\` … \`}</style>` 템플릿 리터럴 안이다** — 주석에 백틱을 쓰면 리터럴이 거기서 끝나 webpack 구문 오류가 나고, Next export 가 `dist/` 를 비운 뒤 실패한다. `typecheck` 가 `TS1005` 로 잡는다.
6. 입장은 CPU 4x 에서 프레임을 안 떨궈 판정이 안 된다 — 프롤로그 레버는 **CPU 6x 의 `RecalcStyle`·`Task`** 로 잰다.
7. 🔴 **네오 프롤로그는 버튼을 눌러 들어가는 게 아니라 스스로 열린다** — 마운트 훅이 localStorage 의 "봤음" 표식이 없으면 그 자리에서 켠다. 랜딩 입장 버튼(`vnStartButton[data-phase="landing"]`)은 **이미 본 방문자에게만** 뜨므로, 그걸 기다리면 240초를 다 쓰고 죽는다(2026-08-30 에 두 번 밟았다). 게이트는 `[class*="heroSection"][data-phase="prologue"]`.
8. 🔴 **`--advances` 기본값 4는 네오에서 오판을 만든다** — 대사 20줄 중 연출이 붙은 장면이 뒤쪽이라 앞 2장면만 보고 "애니메이션 0개"가 나온다. `--advances=15` 로 끝까지 간다.

## 다음 행동

1. **기기 확인**(사용자) — `code-destiny-1.0.40-vc40.apk` 로 ① 프롤로그·앨범 체감 ② 꽃잎이 실제로 3장인지 본다. 🔴 기기에 깔린 것이 디버그 서명본이면 릴리스 APK 가 안 덮인다(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) — 그때는 `assembleDebug` 로 뽑아 `adb install -r`.
2. 🔴 **루트 `apps/mobile/android/release-signing.properties` 가 아직 vc40 이다** — 다음 빌드가 번호를 재사용하지 않도록 41 / 1.0.41 로 올려야 한다. 워크트리 격리 세션에서는 레포 루트 쓰기가 차단돼 **못 올렸다**. 🔴 파일 내용은 출력하지 않는다.
3. 참고: `TalkingPigYeoni.tsx` 에 거의 같은 저사양 인라인 판정이 있다. 통합하면 좋지만 이번 범위 밖이라 손대지 않았다.
4. 참고(안 고침): `neoLionSneeze`(페인트 전용 무한 애니메이션)와 `neoSealGlow` 는 **도달하는 마크업이 없다**. 지우면 좋지만 이번 범위 밖이라 언급만 한다.

## 환경 상태

| | |
|---|---|
| 워크트리 | `.claude/worktrees/app-oauth-return-path` |
| 브랜치 | `worktree-tea-house-vc40` (perf 수정은 PR #1333 로 머지됨) |
| 측정(찻집) | `npm run perf:app-route -- --runs=3 --segments=album --passes=frames --net=slow4g --cpu=4` |
| 측정(네오) | `npm run perf:app-route -- --runs=3 --segments=neo-prologue --passes=frames --advances=15 --net=slow4g --cpu=6 --dump-animations` |
| `node_modules` | 2026-08-30 기준 이 워크트리에는 **심링크가 있다**(전체 앱 빌드가 그대로 돌았다). 레포 밖 스크립트에서 `playwright` 를 쓰려면 `createRequire(<레포>/package.json)` 로 해석할 것 |

## 사용자 쪽에 열려 있는 것

1. **플레이 콘솔 업로드 미완료** — 바탕화면에 `code-destiny-1.0.40-vc40.aab` 가 있다. vc39 는 건너뛴다.
2. 🔴 **업로드 키스토어 비밀번호가 2026-08-30 세션 트랜스크립트에 평문으로 남았다.** 외부 전송·커밋은 없었고 파일은 gitignored 다. 로테이션 여부는 사용자 판단이며 **미결**.
3. **네오 결과 화면 하단 safe-area 수정(PR #1318) 미검증** — `?neoPreview=` 가 `NODE_ENV !== "production"` 전용이라 프로덕션 `dist/` 로 렌더 불가, `next dev` 는 깨져 있다. 기기에서 눈으로 확인해야 한다.
