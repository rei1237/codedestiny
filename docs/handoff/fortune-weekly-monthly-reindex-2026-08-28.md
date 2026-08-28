# /fortune/{weekly,monthly} 색인 복귀 — 남은 것 (2026-08-28)

본 작업은 **PR #1243 으로 끝났고 PR CI 5/5 초록불이다**(머지는 사용자 몫).
이 문서는 그 PR 이 **일부러 남긴 두 건**과, 다음 세션이 같은 자리를 다시 팔 때 필요한 실측값만 담는다.
배경 서사는 [adsense-remaining-levers-2026-08-17.md](adsense-remaining-levers-2026-08-17.md) §2 에 기록으로 옮겨 두었다.

## 끝난 것 (다시 하지 말 것)

- `lib/seo/siteSeo.ts` · `scripts/generate-sitemap.mjs` 의 `noindexPathPrefixes` **짝**에서
  `/fortune/weekly`·`/fortune/monthly` 제거. 사이트맵 389 → 439.
- 주간 `<title>` 교차월 라벨 축약(연중 최악 폭 61 → 59, 한도 60).
- 주간 허브 설명의 `…` 절단 제거(최악 폭 151, 색인 439개 중 `…` 종료 0).
- 기간별 문안 시드 분리 — `fortune-build-data` 가 패키지 4건(오늘·내일·주 시작일·달 1일)을 만들고
  `buildWeekly`/`buildMonthly` 가 자기 기간 시드로 읽는다. 문안을 새로 쓰지 않았다.

## 남은 것 ①: `site-name-signals` 가드가 빌드 산출물을 훑는다

`__tests__/ui/site-name-signals.static.test.js` 의 첫 테스트는 **로컬에 `out/`·`dist/` 가 있으면 실패한다.**
리포 루트를 깊이 4까지 걸어 `*.html` 을 모으는데 그 범위에 산출물이 들어오고, 로케일 미러 **52쪽**의
`og:site_name`(`Code Destiny` · `Code Destiny Japan` · `Code Destiny China` · `Code Destiny Taiwan`)이
브랜드명(`꿀꿀 운세`)과 달라 걸린다. 값의 정본은 `lib/i18n/locales.ts:42` 근방의 로케일 표다.

PR CI 의 fast 잡에는 빌드가 없어 초록불이라 지금까지 드러나지 않았다(PR #1239 에서 이 가드가 들어왔다).

🔴 **고치기 전에 정할 것** — 둘 중 무엇이 옳은지가 먼저다:

1. **가드의 범위가 틀렸다** — 이름 그대로 "정적 셸"만 봐야 하는데 산출물까지 본다. `out/`·`dist/` 를
   제외하면 끝난다. 다만 그러면 배포물의 사이트 이름은 아무도 안 보게 된다.
2. **로케일별 사이트 이름은 정당하다** — 구글은 언어별 사이트 이름을 지원한다. 그렇다면 가드가
   "한국어 표면은 brandName, 로케일 표면은 그 로케일의 siteName" 으로 갈라져야 한다.

추정: 2번이 맞고, 가드를 로케일 인식으로 고치는 것이 정답이다. **미검증** — 로케일별 사이트 이름을
구글이 실제로 어떻게 채택하는지 1차 출처를 확인하지 않았다.

재현: 워크트리에서 `npm run build:cf` 뒤 `npm run test:node` → `✖ 정적 셸의 og:site_name 이 전부 브랜드명과 같다`
(나머지 563개는 통과).

## 남은 것 ②: 주간·월간 `lastmod` 가 실제 변경보다 자주 올라간다

시드를 분리하면서 `/fortune/{weekly,monthly}` 의 HTML 은 이제 **주·월 단위로만 바뀐다.** 그런데
사이트맵 `lastmod` 는 여전히 매일 올라간다.

원인: `scripts/lib/sitemap-lastmod.mjs` 의 `RUNTIME_DATA_MODULES` 는 **모듈 단위** 표다.
`lib/fortune/daily-data.ts` 하나에 `volatile: true` 가 붙고, 그 모듈을 import 하는 라우트가 전부
휘발성으로 잡힌다 — 네 기간을 라우트별로 가를 수 없다.

이건 PR #1239 가 고친 것(UTC lastmod)과 **같은 축의 반대 방향 문제**다. 구글에게 유일한 재크롤
신호를 매일 거짓으로 올리는 셈이라, 신호 신뢰를 깎을 수 있다.

고치려면 라우트별 volatile 이 필요하다(예: `RUNTIME_DATA_MODULES` 대신 라우트 경로 패턴 → 시드
주기 표). 🔴 그 변경은 `verify:sitemap-drift` 가 원장을 **바이트로** 비교한다는 점을 함께 봐야 한다
(같은 파일 머리말의 2026-08-25 정정 참고) — 정규화 대상이 늘어난다.

## 다시 재려면

- 문장급 본문: `node scripts/verify-indexable-prose-depth.mjs --report` (dist 필요).
  2026-08-28 값: 색인 439개 · 최소 **934**(`/fortune/today/pig`) · p05 1,015 · 중앙 1,689 · 임계 900.
  🔴 초록불이 아니라 **최솟값과 임계값의 거리**로 읽을 것 — 붙어 있으면 며칠 뒤 무관한 PR 이 죽는다.
- 대조군 만드는 법: 가드 사본에 사이트맵 라우트 필터를 끼워 같은 dist 로 다시 돌린다(재빌드 불필요).
  🔴 Git Bash 에서 `/` 로 시작하는 env 값은 경로로 변환돼 조용히 안 먹는다 — `fortune.(weekly|monthly)`.
- 제목·설명 폭: 한도는 `scripts/verify-adsense-readiness.mjs` 의 `SERP_TITLE_WIDTH_LIMIT`(60) ·
  `SERP_DESCRIPTION_WIDTH_LIMIT`(160). 2026-08-28 dist 의 /fortune 100쪽: 제목 최대 54 · 설명 최대 156.
  🔴 주간 라벨은 **달을 넘는 주에만** 길어진다. 그 주에 빌드하지 않으면 초과가 안 보인다.
