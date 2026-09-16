# /music/ 달빛 플레이리스트 성능 + 리디자인 (2026-09-16)

브랜치 `wt/music-lounge-perf-20260916-182234` → main 직접 머지. 계획 정본은 세션 플랜(측정→구현→회귀→재측정→보고→커밋·push).

## 다음 세션 첫 문장
"docs/handoff/music-lounge-perf-2026-09-16.md 의 '남은 과제' 를 읽고, push 된 커밋으로 프로덕션 AFTER Lighthouse(`node scripts/measure-home-lighthouse.mjs --runs=3 --preset=mobile --url=https://code-destiny.com/music/ --label=music-prod-after`)를 배포 후 1회 측정해 아래 표에 채운다."

## 무엇을 바꿨나 (커밋 순)
1. `perf(music): add --route option to measure-home-lighthouse` — `--route=/music/` 로 로컬 dist 라우트 측정.
2. `refactor(music): isolate progress into a zustand store, extract useMusicAccess` — `_stores/useMusicProgressStore.ts`(currentTime/duration 4Hz 격리), `_hooks/useMusicAccess.ts`(결제·접근 로직 원문 이동).
3. `feat(music): add lounge components and CSS module` — `_components/*` 8개, `_lib/musicCopy.ts`(5로케일), `_lib/musicFormat.ts`, `music-lounge.module.css`(13KB).
4. `feat(music): prerendered lounge shell, remove legacy panel/CSS/viewport hook` — `MusicPlayerExample.tsx` 재작성(~230줄), `page.tsx` 에서 Suspense/dynamic 제거, `MusicRouteClient.tsx`·`MusicPlaylistPanel.tsx`·`moon-music-player.module.css`(122KB)·`useIsMobileViewport.ts` 삭제.
5. `fix(music): clear the fixed feature-nav pill, opaque mini player, move payment review to useMusicAccess`.

사용자 확정 제거: 북마크, 앨범 모드 토글(인간 커버 있으면 인간, 없으면 원본), 곡별 공유(→ Now Playing 1개), 아티스트 4색 테마(→ 단일 달빛 팔레트). 유지: 가사(기본 닫힘·lazy import), 검색.

## 병목 (실측)
- 프리렌더 HTML 이 로딩 화면("여는 중")이었고 dynamic() 2단 → 플레이어 청크 73KB + 음악 CSS 127KB 워터폴 후 UI.
- LCP 요소 커버 이미지가 `loading="lazy"` + 900×900 원본 233KB → 356px 박스.
- `currentTime` useState 가 4회/초 전체 트리 리렌더.
- 장식 레이어(blur 38·backdrop-filter 19·애니메이션 34·box-shadow 96) 상시 합성.
- 전역 Tailwind CSS 550KB 렌더 차단 + 루트 레이아웃 `<Suspense>`(app/layout.js:291)가 본문을 `<div hidden id="S:0">` 로 내보내 CSS 도착 후 `$RC` 로 노출 — **범위 밖(전역)**, 아래 후속 과제.

## 성능 비교 (Lighthouse 13.1.0 mobile, 3회 중앙값)
| 지표 | BEFORE prod | BEFORE local dist | AFTER local dist | AFTER prod |
|---|---|---|---|---|
| Performance | 67 | 74 | **86** (71–86) | 배포 후 측정 |
| FCP | 3426 | 2252 | **2102** | |
| LCP | 7893 (커버 img) | 6520 | **3607** (h1 텍스트) | |
| TBT (INP 대리) | 122 | 108 | 152 | |
| CLS | 0.011 | 0.011 | **0.000** | |
| 초기 요청 수 | 71 | 65–71 | **57** | |
| 초기 다운로드 | 1387KB | 1201KB | **965KB** | |
| JS | 632KB | 721KB | 708KB (음악 청크 81KB→61KB, 전역이 대부분) | |
| CSS | 130KB | 119KB | **106KB** (음악 CSS 127KB→13KB) | |
| 이미지 | 233KB ×1 | 233KB | **11KB** (Cloudflare Image Resizing 192px) | |
| 초기 오디오 요청 | 0 | 0 | 0 | |
| Long Task | 7 (625ms) | 9 (688–814ms) | 7 (687–833ms; gtag·전역 레이아웃 몫) | |
| DOM | 1055 | 1055 | 889 | |
| measure:mobile-routes | OF-B 8–10, TT<44=3, IN<16=1 | 동일 | OF 0, TT<44 0, IN<16 0, SAgap 6px ⚠ | |

LHR JSON: `%TEMP%/code-destiny-perf/lhr-music-{prod-before,local-before,local-after2}-mobile-N.json`.
남은 LCP 3.6s 의 원인은 전역 CSS 550KB(느린 4G 에서 responseEnd 7.3s) + 루트 Suspense 노출 지연으로 실측(Playwright 프로브: JS-off 시 본문 높이 0, 무스로틀 시 FCP=LCP 628ms).

## 회귀 (Playwright iPhone 13 에뮬레이션, 로컬 dist, /api mock 404) — 56/56 PASS
셸 프리렌더·초기 오디오 0·콘솔/하이드레이션 에러 0·현재 곡 표시·홈 링크·곡 선택·Audio 1개·preload metadata·1곡만 요청·MediaSession·일시정지/재생/다음/이전·탐색·시간 표시·음소거/해제·모바일 볼륨 숨김·키보드 ↓·반복 3단·셔플·연속 재생(ended)·YEONI 필터 25행·ALL 복귀·검색 16px·검색 필터·스크롤 프레임 드랍 0/54·미니 플레이어 fixed/불투명/44px/재생/다음/탭 스크롤·가사 lazy 청크·Escape·공유 클립보드·다운로드 구매 버튼→`cd-direct-payment-modal`(mock) 열림·새로고침 복원·자동재생 없음·`?track=` 딥링크·뒤로가기·홈 이탈·visibilitychange·포커스 링·Space·44px 타깃·reduced-motion·backdrop-filter 0.
잠금 40초 미리듣기: `lib/music-access-policy.js` 가 전곡 free_full(다운로드만 구매)이라 N/A(잠금 곡 0).
스크립트는 세션 스크래치패드(`regress.mjs`)에만 있음 — 영구 테스트로 옮기지 않음.

가드: check:fast exit 0(jest 274/3807), 결제 verify 9종 exit 0, `node --test __tests__/release/payment-inventory.test.js` 11/11, verify:mobile-feature-coverage·music-track-count 통과. visual-checker 3차 판정 OK(대비 최저 5.7:1).

## 남은 과제 (범위 밖, 보고만)
1. 🔴 전역: `app/layout.js:291` 빈 `<Suspense>` 가 모든 App Router 라우트 본문을 `S:0` 은닉 블록으로 내보냄(JS 꺼지면 본문 안 보임) + Tailwind 전역 CSS 550KB 렌더 차단 → 남은 LCP 의 대부분. 별도 RED 작업.
2. `paid-flow-gates.yml` 트리거에 `app/music/**` 없음 → 로컬 verify 로만 확인.
3. `docs/payments/payment-p0-inventory.{json,md}` 재생성 시 다른 세션의 상품 변동(영냥이 27개 추가 등)이 함께 들어옴 → 머지 후 main 에서 별도 docs 커밋.
4. `verify:mobile-runtime-readiness` 2건 실패("bottom navigation …")는 main 에서도 동일(선행 결함).
5. 워크트리에서 stale `.next` 가 있으면 `next build` 가 멈춤 → `rm -rf .next` 후 재실행(2회 재현).
6. 커버 원본이 `cf-cache-status: DYNAMIC`(엣지 미캐시); `docs/music-player.md` .wav 언급 낡음; impeccable "[broken-image]" 오탐(`musicFormat.ts:78`); gtag 롱태스크 177ms; SAgap 6px 경고(미니 플레이어 하단 패딩 6px+safe-area).
7. Git Bash 가 `--route=/music/` 를 `C:/Program Files/Git/music/` 로 변환 → 측정 스크립트는 PowerShell 에서.
