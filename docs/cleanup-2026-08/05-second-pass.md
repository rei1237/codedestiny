# 2차 감사 — 1차에서 손대지 않은 표면 (2026-08-09)

> 1차 감사([03-report.md](03-report.md))는 `app/` `lib/` `components/` `src/` `worker/` 의 **파일 단위**만 봤다.
> 이 문서는 그때 명시적으로 제외했던 표면을 판다: `server/` · `scripts/` · `__tests__` · `public/` 에셋 · `styles/` CSS · export 단위.
> **이번에도 아무것도 옮기거나 지우지 않았다.**

---

## 결론 요약

| 표면 | 원시 후보 | 오탐 제거 후 | 등급 |
|---|---:|---:|---|
| `public/` 에셋 | 197파일 / 48.28 MB | **18파일 / 25.90 MB** | **A** |
| `server/` 레거시 Express | 40파일 / 11,102 LOC | 40파일 / 11,102 LOC | **B** |
| `scripts/` 미참조 | 65파일 / 447 KB | 분류 필요 (아래) | **B/C** |
| 미사용 export | 185심볼 | 185심볼 | **C** (실익 없음) |
| 안 도는 테스트 | 1건 | 1건 (기보고 W-3) | — |
| `styles/*.css` | 22파일 | **0** | — |

---

## 1. `public/` 에셋 — 25.9 MB 가 확실히 죽어 있다

### 판별 규칙
`.png`/`.jpg` 인데 **같은 이름의 `.webp` 형제가 존재하고 그 webp 는 코드가 참조**하는 경우 → WebP 전환 후 남은 원본이다. 전환 도구도 레포에 있다(`scripts/rewrite-png-refs-to-webp.mjs`, 지금은 미참조 상태).

**해당: 18파일 / 25.90 MB — 전부 `public/images/fortune-tea-house/`**

| 크기 | 파일 |
|---:|---|
| 2,831.6 KB | `yeoni-sprite2-thanks-safe.png` |
| 2,633.6 KB | `yeoni-cup-pose-sprite-sheet-photoroom.png` |
| 2,623.6 KB | `tea-cups-corrected-photoroom.png` |
| 2,542.7 KB | `yeoni-sprite2-thanks-photoroom.png` |
| 2,511.2 KB | `yeoni-sprite7-tarot-photoroom.png` |
| 2,416.1 KB | `yeoni-tarot-card-back-photoroom.png` |
| 2,372.0 KB | `yeoni-sprite6-waiting-photoroom.png` |
| 2,346.9 KB | `tea-cups-labeled-photoroom.png` |
| 2,009.6 KB | `yeoni-tea-chat-loading-sprite.png` |
| 1,963.9 KB | `ten-gods-photoroom.png` |
| 1,608.7 KB | `flower-pig-5-sprite-safe.png` |
| 1,597.2 KB | `talking-flower-pig-yeoni3-sprite-safe.png` |
| 1,597.2 KB | `flower-pig-5-photoroom.png` |
| 1,514.7 KB | `talking-flower-pig-yeoni3-sprite-photoroom.png` |
| 1,255.9 KB | `yeoni-cup-pose-photoroom.png` |
| (외 3건) | |

> ⚠️ **연이 자산은 화면별 용도가 고정돼 있다**(CLAUDE.md). 여기서 지우는 것은 **`.webp` 가 이미 쓰이고 있는 `.png` 원본**뿐이고, 대응 `.webp` 는 전부 그대로 둔다. 화면에 보이는 그림은 하나도 바뀌지 않는다.

### 🔴 오탐으로 걸러낸 것 — 179파일 / 22.38 MB
이름 대조만 했으면 전부 "미참조"로 지웠을 것들이다. 각각 **참조 방식이 다를 뿐 살아 있다.**

| 군집 | 개수 | 실제 참조 방식 |
|---|---:|---|
| `public/sudda/hwatu/*.webp` | 40 | `HwatuFortune.js` 가 `` `sudda/hwatu/${month}_${index}.webp` `` 로 조립 |
| `public/neo-operation-room/sprites/transparent/*.webp` | 38 | `NeoOperationRoomPage.tsx` 가 `` `...neo-transparent-s${sheetNumber}-f${paddedFrame}.webp` `` 로 조립 |
| `public/images/guardian-fortune/yeoni/*` + 배경·버튼 | 20 | 아래 별도 항목 |
| `public/fuctionassets/*.webp` | 14 | 파일명에 공백이 있어 **URL 인코딩**으로 참조 (`ai%20animal.webp`) |
| `public/images/novel/remaster/yeon/*.webp` | 12 | `manifest.json` 이 `"path": "yeon/*.webp"` 글롭으로 선언 + `scripts/verify-novel-runtime.mjs:14` 가 **디렉터리 자체를 검사** |
| `public/images/fortune-chat/persona/*.webp` | 10 | `app/fortune-chat/personaSprite.ts:23` 이 `` `${persona}-${mood}.webp` `` 로 조립 |
| `apps/mobile/.../mipmap-*/` | 12 | Android 리소스 ID(`@mipmap/ic_launcher`)로 참조 — 파일명이 코드에 없다 |

### 별도 — `public/images/guardian-fortune/` 20파일 (0.4 MB)
디렉터리 전체가 코드에서 참조되지 않는다. 실제 guardian 화면은 `/images/fortune-tea-house/flower-pig-honey-hug.webp` 를 쓴다(`src/features/guardian-fortune/constants.ts:53`). `8b0d6bea5 feat: ship guardian fortune experience` 로 들어왔으나 코드가 다른 경로를 가리키게 됐다.

**그러나 지금 다른 세션이 guardian-fortune 을 활발히 작업 중**이다(오늘만 여러 커밋). 곧 배선할 수도 있으므로 **건드리지 않는다. 그 작업자에게 먼저 확인할 것.**

---

## 2. `server/` — 40파일 11,102 LOC 이 어디에도 배포되지 않는다

| 확인 항목 | 결과 |
|---|---|
| 호스팅 설정 (Dockerfile / Procfile / pm2) | **없음** |
| `npm run dev` 가 띄우는가 | **아니다** — `scripts/dev-with-local-auth.mjs` 는 `scripts/local-dev-auth-api.mjs` 를 띄운다 |
| `app/` `worker/` `lib/` 이 import 하는가 | **0건** |
| CI 가 실행하는가 | 아니다. `paid-flow-gates.yml:40` 의 `server/routes/admin.routes.js` 는 **push 경로 트리거**일 뿐 |
| 기동 경로 | `npm run api` (= `node server/server.js`) **하나뿐**, 이를 부르는 곳 없음 |
| worker 가 대체하는가 | 13개 라우트(admin·astro·auth·fortune·kasi·oracle·payment·points·profile·subscription×2·tarot·user) 전부 `worker/routes/` 에 대응이 있다 |

**등급 B** — 기술적으로는 지워도 아무 일도 안 일어난다. 다만 (1) CLAUDE.md 가 `npm run api` 를 문서화하고 있고 (2) 11k LOC 를 한 번에 옮기는 것은 되돌릴 때 부담이며 (3) 레거시 폴백으로 의도적으로 남긴 것일 수 있다. **사용자 판단이 필요하다.**

> ⚠️ 실행해 보지 않았다. `server/server.js` 는 `MONGO_URI` 로 **프로덕션 DB 에 붙는다.**

---

## 3. `scripts/` — 65파일 447 KB 미참조, 다만 대부분은 죽은 게 아니다

`package.json` · `.github/` · 다른 스크립트 · `app/` `worker/` `lib/` 어디에서도 이름이 나오지 않는 파일이 65개다. 그러나 성격이 갈린다:

| 성격 | 예 | 판정 |
|---|---|---|
| DB 마이그레이션 (`scripts/migrations/*`) | `20260730-zero-heavy-monthly-credit-balances.mjs` | **보존** — 이력이자 재실행용 |
| 미배선 verify 가드 | `verify-mindscan-reading.mjs`(CLAUDE.md 가 mock 정본으로 지정), `verify-portone-webhook-signature.mjs` 등 9개 | **보존** — 1차 감사에서 이미 C 판정 |
| 수동 회귀 하네스 | `test-saju-solar-term-regression.mjs`(38 KB), `test-saju-day-pillar-civil-date.mjs` | **보존** — 엔진 검증용 |
| 운영 조회·시드 | `query-monthly-credit-heavy-grants.mjs`, `grant-monthly-coins.mjs` | **보존** |
| **적용 완료된 일회성 코드모드** | `patch-diary-ui.mjs`(26 KB), `inject-godlife.mjs`(21 KB), `rm-godlife.mjs`, `fix-saju-onclick.mjs`, `rewrite-png-refs-to-webp.mjs`, `patch-index-html-optimized-images.mjs`, `fix-critical-css-loading.cjs`, `fix-main-glass-fouc.cjs`, `optimize-static-thirdparty-loading.cjs` | **A 후보** — 이미 소스에 반영됨 |
| 명백한 임시물 | `_check_sizes.mjs`, `gen-daily-2026-03-21.mjs` | **A 후보** |
| 구 배포 스크립트 | `build-cloudflare.mjs`, `deploy-cloudflare.mjs`, `setup-cloudflare-auth.mjs`, `ensure-pages-manifest.mjs` | **B** — `deploy-safe.mjs` 로 대체된 듯하나 확인 필요 |

---

## 4. 미사용 export 185건 — 확인했으나 손대지 말 것을 권한다

`ts-prune` 재실행 792건 중 고유 심볼 427개를 **ripgrep 전수 대조**한 결과 **185개가 레포 전체에서 정확히 1회**(=자기 정의부)만 등장한다.

그런데 실익이 없다:
- **번들이 줄지 않는다.** 트리셰이킹이 이미 제거한다.
- **LOC 도 거의 안 준다.** `export` 키워드만 떼는 작업이다.
- 반면 **185곳을 건드리는 위험**은 실재한다.

**C 유지 권고.** 굳이 한다면 barrel 재export 뒤에 숨은 것들만 골라야 하는데, 1차에서 파일 단위 고아는 이미 다 걷어냈다.

---

## 5. 확인했고 문제 없던 것

- **`styles/*.css` 22파일 전부 참조가 있다** — 1차의 C-12(knip 오탐) 판정이 맞았다. 다만 `fortune-ui.css` 594 KB 안의 **미사용 규칙**은 정적 분석 범위 밖이라 여전히 미확인이다.
- **테스트는 141개 중 140개가 실제로 돈다.** 안 도는 것은 `__tests__/guardian-fortune/contract.test.js` 1건뿐(기보고 W-3).

---

## 6. 🔴 1차 보고의 자기 정정

| # | 1차 주장 | 실제 |
|---|---|---|
| **W-4** | "`server/services/kasi-calendar.service.js` 가 미설치 `redis` 를 import → 실행 즉시 실패" | **틀렸다.** 해당 `require("redis")` 는 `try/catch` 로 감싸져 있고 실패 시 `redisCreateClient = null` 로 메모리 캐시에 degrade 한다. `server/` 는 정상 기동한다 |
| **D-5** | "tsconfig `exclude` 7개가 전부 유령 경로" | 과했다. `.codex-worktrees` `.claude/worktrees` `_scripts-archive` `.release-clean` 은 **런타임에 생성되는 조건부 경로**다. 진짜 잔재는 `veda` 하나였고 그것만 제거했다 |

## 7. 이번 감사 중 폐기한 중간 결과

단어 인덱스 방식(`grep -oE '[A-Za-z_$]...' | sort -u`)으로 "미등장 심볼 236개"라는 수치가 나왔으나 **폐기했다.** 건전성 검사에서 `GUARDIAN_FORTUNE_FEATURE_KEY` 가 코퍼스에는 있는데 인덱스에는 없는 것이 드러났다 — 미니파이된 초장문 라인에서 추출이 조용히 누락됐다. ripgrep 으로 다시 세어 185라는 신뢰 가능한 수치를 얻었다.

같은 이유로 **첫 에셋 스캔(54건)도 과소 보고였다.** 코퍼스에 `reports/*.json`(2026-07-04 감사 산출물)이 섞여 있어, 그 안에 이름이 적힌 죽은 에셋이 "참조 있음"으로 잡혔다. 감사 문서의 언급은 사용이 아니므로 제외하고 다시 돌려 197건을 얻었다.

---

## 권고 순서

1. **에셋 18파일 / 25.9 MB** — 규칙이 명확하고(`.webp` 대체본이 이미 참조됨) 화면 변화가 0이다. 가장 먼저.
2. **일회성 코드모드 스크립트 ~9개** — 적용 완료된 것만.
3. **`server/` 11k LOC** — 사용자 판단 후.
4. **guardian-fortune 에셋 20건** — 그 기능 작업자에게 확인 후.
5. **export 185건** — 하지 말 것을 권한다.
