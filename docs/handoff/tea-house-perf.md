---
updated: 2026-08-30
status: 0단계 완료(베이스라인 확보) — 1단계 절제 미착수
---

# 찻집 렉 최적화 — 작업 상태

## 지금 어디까지

**0단계 완료. 제품 코드 변경 0건.** 측정 하네스 `scripts/measure-app-route-perf.mjs`(npm `perf:app-route`) 를 만들고 베이스라인 5회를 떴다.

🔴 **계획 정본은 여기다 — 먼저 읽는다:**
`C:/Users/user/.claude/plans/worktree-app-login-completion-humming-neumann.md`

## 베이스라인 (2026-08-30 실측)

```
npm run perf:app-route -- --runs=5 --segments=entry,album --passes=frames,pipeline --net=slow4g --label=baseline
```

조건: 로컬 `dist/` 정적 서빙 · 412x823@1.75 DPR · CPU 4x · Slow4G(150ms · 1.6Mbps/750kbps) · UA `SM-M156B` Android 16 Chrome 140 · `channel:"chromium"`. 값은 **5회 중앙값 (min–max 밴드)**.

| frames 패스 | A. 입장 스토리 (5단계×3초) | B. 타로 앨범 (스크롤 6회×800px) |
|---|---|---|
| 끊긴 프레임(>25ms) | **0.0% (0.0–0.0)** | **32.6% (31.2–48.8)** |
| 놓친 vsync | 0회 (0–1) | 47회 (46–64) · 15.0회/s |
| 프레임 p95 / 최악 | 16.8 / 16.9 (16.8–33.3) ms | 33.4 / 50.0 (49.9–66.7) ms |
| RecalcStyle | 677 (613–789) ms | 459 (446–464) ms |
| Layout | 260 (252–305) ms | 10 (10–11) ms |
| Script | 429 (414–487) ms | 50 (47–59) ms |
| Task(메인스레드 총) | 2837 (2765–3335) ms | 3134 (3129–3142) ms |
| DOM / 합성 레이어 | 248개 / **27개** | 2294개 / **613개** |
| 네트워크 | 1110KB · 외부 48건 | 1353KB · 외부 40건 |

| pipeline 패스 (Tracing ON · 🔴 위 표와 절대값 비교 금지) | 입장 | 앨범 |
|---|---|---|
| UpdateLayoutTree | **1086.5 (1071.5–1202.6) ms** | 395.0 ms |
| Layout | 365.7 ms | 12.5 ms |
| PrePaint | 400.2 ms | 166.0 ms |
| Paint | 292.8 ms | **1510.3 (1478.6–1545.7) ms** |
| Commit | 277.1 ms | 536.3 ms |
| 렌더 합계 | 2416.4 ms | 2628.2 ms |

읽는 법:

- **앨범 렉은 재현됐고 페인트/합성 축이다** — Paint 1510ms + Commit 536ms + 레이어 613개인데 Layout 10ms · Script 50ms 다. JS 축이 아니다. 카드 78장이 각각 `backdrop-blur-md` 와 `animate-moon-rise` 를 다는 것이 1순위 용의자지만 **1단계 절제 전에는 추정이다.**
- **입장은 CPU 4x 에서 프레임을 안 떨군다** — 대신 UpdateLayoutTree 1086ms 로 스타일 재계산이 지배적이다.
- 입장에서 외부 요청 48건(CDN 폰트/이미지 45 · BGM 1 · GTM 1)이 나가고 하네스가 전부 차단·계수한다. **실기기에는 이 네트워크·오디오 디코드 비용이 더 얹힌다.**

### 🔴 1단계 판정 지표 — 입장 구간은 프레임으로 못 잰다

- **앨범**: 그대로 `끊긴 프레임 비율`. 밴드 하한이 31.2% 이므로 **31.2% 미만으로 내려간 레버만** 2단계로 넘긴다.
- **입장**: 밴드가 [0.0, 0.0] 이라 개선을 판정할 수가 없다. **CPU 를 6x 로 올리지 않고, frames 패스의 `RecalcStyle`(밴드 613–789ms)과 `Task`(2765–3335ms)를 판정 지표로 쓴다.** 스로틀을 바꾸면 위 표 전체가 무효가 되고 계획이 못 박은 조건(4x)에서도 벗어난다. RecalcStyle 은 이미 밴드가 벌어져 있고 입장의 지배 비용(pipeline UpdateLayoutTree)과 같은 축이라 그대로 쓸 수 있다.
- 🔴 **4x 에서 프레임 0% 는 실기기가 매끄럽다는 증거가 아니다.** 사용자 신고는 실기기 체감이므로 입장 레버는 3~4단계에서 vc40 으로 기기 확인이 필요하다.

## 하네스 함정 (다시 밟지 말 것)

1. 🔴 **하이드레이션 전에 누른 클릭은 증발한다.** `waitForSelector` 는 **서버 HTML 이 그린 버튼**을 보고 곧장 통과하지만 Next 클라 번들은 `<script async>` 라 아직 안 붙어 있다(`readyState:complete` · 대기 요청 0건이라 겉으론 멀쩡). Slow4G 에서 240초를 통째로 날렸다. `waitForHydrated()` 가 `__reactProps$`/`__reactFiber$` 키로 막는다. **스로틀을 끄면 우연히 통과**하므로 조건을 바꾸면 결과가 갈린다.
2. 🔴 **앨범은 서버 잔량 응답이 `tarotAlbumUnlocked:true` 여야 카드 78장을 그린다** — 로컬 dist 에는 워커가 없어 0장이 된다. 하네스가 `/api/fortune-tea-house/honey-drops/balance` **하나만** 스텁한다(**하네스 전용이고 제품 게이팅은 무수정**, 사용 횟수를 리포트에 찍는다). `credentials:"include"` 로 나가므로 ACAO 는 `*` 가 아니라 요청 origin 이어야 하고 OPTIONS 도 답해야 한다.
3. `channel:"chromium"` 필수 — Playwright 기본 headless shell 은 합성기가 없어 프레임을 아예 안 떨군다.

## 환경 상태

| | |
|---|---|
| 워크트리 | `.claude/worktrees/app-oauth-return-path` |
| 브랜치 | `worktree-tea-house-perf` (base `2a81233c8`) |
| 미커밋 | `scripts/measure-app-route-perf.mjs`(신규) · `package.json`(`perf:app-route`) · 이 문서 |
| `dist/` | 2026-08-30 16:51 빌드(`2a81233c8` 기준). 1단계 절제는 **이 dist 의 CSS 를 직접 고쳐서** 한다 |
| `node_modules` | 워크트리에 링크 없음. 빌드하려면 정션 필요 |

## 다음 행동

계획 **1단계 절제 A~H**. dist CSS 를 임시로 고쳐 위 재현 명령을 다시 돌리고, **밴드를 벗어난 레버만** 2단계(제품 코드 수정)로 넘긴다.

🔴 **1단계 절제 전에는 제품 코드를 고치지 않는다.** [mobile-home-perf.md](mobile-home-perf.md) §3 에서 그럴듯한 레버 4개가 실측으로 죽었다.

## 사용자 쪽에 열려 있는 것

1. **`code-destiny-1.0.39-vc39.aab` 플레이 콘솔 업로드 미완료** (바탕화면에 있음). vc40 이 나오면 vc39 는 건너뛰어도 된다.
2. 🔴 **업로드 키스토어 비밀번호가 2026-08-30 세션 트랜스크립트에 평문으로 남았다.** 외부 전송·커밋은 없었고 파일은 gitignored 다. 로테이션(Play 앱 서명으로 업로드 키 교체) 여부는 사용자 판단이며 **미결**이다.
3. **네오 결과 화면 하단 safe-area 수정(PR #1318)은 미검증** — `?neoPreview=` 가 `NODE_ENV !== "production"` 전용이라 프로덕션 `dist/` 로 렌더 불가, `next dev` 는 이 레포에서 깨져 있다. 기기에서 눈으로 확인해야 한다.
