---
status: active
updated: 2026-08-28
next: "\"남은 것 ③\" — 월간 화면의 앵커가 \"오늘\"인 것을 고친다"
---

# /fortune/{weekly,monthly} 색인 복귀 — 남은 것 (2026-08-28)

본 작업은 **PR #1243 으로 끝났고**, 그때 일부러 남긴 두 건도 **같은 날 후속 브랜치에서 처리했다**.
이 문서는 이제 "무엇이 왜 그렇게 결론 났는지" 의 기록이며, **새로 남은 것은 아래 §3 하나뿐이다.**
배경 서사는 [adsense-remaining-levers-2026-08-17.md](adsense-remaining-levers-2026-08-17.md) §2 에 있다.

## 끝난 것 (다시 하지 말 것)

### PR #1243

- `lib/seo/siteSeo.ts` · `scripts/generate-sitemap.mjs` 의 `noindexPathPrefixes` **짝**에서
  `/fortune/weekly`·`/fortune/monthly` 제거. 사이트맵 389 → 439.
- 주간 `<title>` 교차월 라벨 축약(연중 최악 폭 61 → 59, 한도 60).
- 주간 허브 설명의 `…` 절단 제거(최악 폭 151, 색인 439개 중 `…` 종료 0).
- 기간별 문안 시드 분리 — `fortune-build-data` 가 패키지 4건(오늘·내일·주 시작일·달 1일)을 만들고
  `buildWeekly`/`buildMonthly` 가 자기 기간 시드로 읽는다. 문안을 새로 쓰지 않았다.

### 후속 브랜치 (이 문서를 남긴 다음 작업)

**① `site-name-signals` 가드가 로컬 빌드 산출물에서 잡아낸 것은 가드의 오류가 아니라 진짜 갈라짐이었다.**

인수인계 당시의 두 가설(가드 범위가 틀렸다 / 로케일별 사이트 이름이 정당하다) 중 **어느 쪽도 아니었다.**
실측(2026-08-28, `dist/ja/today/index.html`)으로 결론이 갈렸다 — **한 페이지 안에서** 신호가 갈려 있었다:

| 신호 | 값 |
|---|---|
| `og:site_name` | `Code Destiny Japan` |
| `application-name` | `꿀꿀 운세` |
| `WebSite` 스키마 `name` | `꿀꿀 운세` (`inLanguage: ko-KR`) |

즉 "로케일별 사이트 이름" 이 성립한 상태가 아니라, PR #1239 가 한국어 표면에서 없앤 갈라짐이
로케일 미러 52쪽에 남아 있던 것이다. 구글은 네 신호가 **일치할 때만** 사이트 이름을 채택하므로
이 상태에서는 어느 이름도 잡히지 않는다.

- 원인 한 줄: `lib/seo/createI18nMetadata.ts` 의 `siteName: localeConfig.siteName` → `siteSeo.brandName`.
- 가드는 범위를 좁히지 **않았다.** 대신 세 번째 테스트(소스 스캔)가 `localeConfig.siteName` ·
  `LOCALE_CONFIG[...].siteName` 까지 막도록 넓혔고, 첫 번째 테스트가 `dist/`·`out/` 을 훑는 것은
  주석으로 **의도임을 명시**했다(그 자리에서 이 결함이 처음 드러났다).
- 실측 확인: 재빌드 후 `dist` 의 `og:site_name` 선언 711건이 전부 `꿀꿀 운세` 하나이고,
  가드의 깊이 4 범위 밖 선언은 0건이다.
- 로케일 표(`lib/i18n/locales.ts`)의 `siteName` 값 자체는 그대로 두었다 — 빵부스러기 라벨
  (`app/components/I18nSeoPageTemplate.jsx:166`)이 계속 쓴다. 그 라벨까지 브랜드명으로 모을지는
  별건이고, 사이트 이름 신호 4종에는 들어가지 않는다.

**② 주간 `lastmod` 는 이제 주 단위로만 올라간다. 월간은 일부러 매일로 두었다.**

`scripts/lib/sitemap-lastmod.mjs` 에 `FORTUNE_VOLATILE_CADENCES` 를 넣어 **라우트별 갱신 주기**를
가른다. `volatile` 은 "매일 바뀐다" 가 아니라 "시계에서 나온다" 는 표시로 뜻이 바뀌었고, 얼마나
자주인지는 라우트가 정한다.

- `weekly` → 그 주의 월요일(`kstWeekStartYmd`), `today`·`tomorrow`·`monthly` → KST 오늘.
- 소스가 **진짜로** 바뀐 날은 주기와 무관하게 오늘이다 — `max(원장의 lastmod, 주기 날짜)` 로
  판정한다. 주 중간에 주간 문안을 고쳤는데 lastmod 가 지난 월요일로 내려가면 거짓 신호의 방향만
  반대가 되기 때문이다.
- 기간 목록은 손으로 적지 않고 `lib/fortune/periods.ts` 에서 전수 발견하며, 주기가 분류되지 않은
  기간이 있으면 원장 생성이 **실패**한다(CLAUDE.md 원칙 10).
- 사이트맵의 `changefreq` 도 주간만 `weekly` 로 맞췄다(크롤러 참고값이지만 lastmod 와 어긋난 값을
  적어 둘 이유가 없다).
- 회귀 가드: `__tests__/release/sitemap-volatile-lastmod-kst.test.js` 에 주기 테스트 추가. 기준
  날짜를 시계가 아니라 **원장의 최신 lastmod + 14일** 에서 만들어, 원장을 다시 만들어도
  조용히 무의미해지지 않는다.

🔴 **월간을 월 주기로 바꾸지 말 것 — 지금은 그게 거짓말이다.** 실측 근거:
`lib/fortune/range-data.ts` 의 `loadMonthRange` 가 **오늘**을 앵커로 잡아 `monthGanji`·`moonPhase`·
`moonSign`·`anchorYmd` 를 계산하고, `lib/fortune/build-view.ts` 의 `buildMonthly` 가 그 값으로 점수와
관계를 다시 계산한다. 즉 월간 HTML 은 달이 바뀔 때가 아니라 날마다 달라진다. 주기 표를 먼저
고치면 진짜 변경을 숨기는, 방향만 반대인 거짓 신호가 된다.

## 남은 것 ③: 월간 화면의 앵커가 "오늘" 이다

월간 페이지는 "이번 달" 을 말하면서 점수·관계·달 위상은 **오늘** 기준으로 계산한다. 그래서
같은 달 안에서도 날마다 숫자가 흔들리고, 위 ②의 주기 표가 월간만 daily 로 남는 이유가 된다.

- 고칠 자리: `lib/fortune/range-data.ts` 의 `loadMonthRange` — `kstToday()` 로 잡은 `d` 를 앵커로
  쓰는 세 곳(`coreGanjiAtMidnight`·`moonSkyForDate`·`surroundingTerms`)과 `anchorYmd`.
- 🔴 이건 **화면 값이 바뀌는 변경**이다(점수·관계·"기운이 바뀌는 날"). 월건은 절입일에 바뀌므로
  달 1일 앵커면 절입 전 구간의 월건을 쓰게 된다 — 그게 옳은지부터 정해야 한다(미검증).
- 옮긴다면 같은 PR 에서 `FORTUNE_VOLATILE_CADENCES` 의 `monthly` 를 `kstMonthStartYmd` 로 바꾸고
  `__tests__/release/sitemap-volatile-lastmod-kst.test.js` 의 월간 단언도 함께 고친다.
- 안 옮기기로 정한다면 그것도 결론이다 — 위 ②는 그대로 두면 된다.

## 다시 재려면

- 문장급 본문: `node scripts/verify-indexable-prose-depth.mjs --report` (dist 필요).
  2026-08-28 값(후속 브랜치 재측정, PR #1243 과 동일): 색인 439개 · 최소 **934**(`/fortune/today/pig`)
  · p05 1,015 · 중앙 1,689 · 임계 900.
  🔴 초록불이 아니라 **최솟값과 임계값의 거리**로 읽을 것 — 붙어 있으면 며칠 뒤 무관한 PR 이 죽는다.
- 대조군 만드는 법: 가드 사본에 사이트맵 라우트 필터를 끼워 같은 dist 로 다시 돌린다(재빌드 불필요).
  🔴 Git Bash 에서 `/` 로 시작하는 env 값은 경로로 변환돼 조용히 안 먹는다 — `fortune.(weekly|monthly)`.
- 제목·설명 폭: 한도는 `scripts/verify-adsense-readiness.mjs` 의 `SERP_TITLE_WIDTH_LIMIT`(60) ·
  `SERP_DESCRIPTION_WIDTH_LIMIT`(160). 2026-08-28 dist 의 /fortune 100쪽: 제목 최대 54 · 설명 최대 156.
  🔴 주간 라벨은 **달을 넘는 주에만** 길어진다. 그 주에 빌드하지 않으면 초과가 안 보인다.
- 사이트 이름 신호: `npm run build:cf` 뒤 `node --test __tests__/ui/site-name-signals.static.test.js`.
  빌드 없이 소스만 볼 때도 세 번째·다섯 번째 테스트는 그대로 돈다.
- 주기 판정: `node --test __tests__/release/sitemap-volatile-lastmod-kst.test.js` · `npm run verify:sitemap-drift`.
