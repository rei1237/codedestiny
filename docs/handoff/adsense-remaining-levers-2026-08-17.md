---
status: active
updated: 2026-08-28
next: "§3 남은 레버 C(허브 링크 404개) 착수 여부를 판단한다 — 가장 무겁고 위험하다"
---

# AdSense 승인 — 남은 레버 인수인계 (2026-08-17)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 수치는 전부 `main` @ `ba564e283` 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [adsense-rejection-response-2026-08-17.md](adsense-rejection-response-2026-08-17.md)
> — 그쪽 §2(함정 3가지)·§3(편집자 노트 구조)은 **여전히 유효**하고 이 문서와 중복하지 않는다.

## 0. 지금 어디까지 왔나 — PR 6건 전부 머지됨

| PR | 내용 | 상태 |
|---|---|---|
| #757 | 얇은 카테고리·스텁 22개를 색인·광고에서 제외 | MERGED |
| #758 | `/contact`·`/editorial-policy` 본문 보강 | MERGED |
| #759 | 편집자 노트 18개 + 발견형 가드 + PR CI 배선 | MERGED |
| #761 | 색인 신호가 전무하던 루트 셸 2개 차단 | MERGED |
| #764 | 일일 문안이 24개 sign 공용이던 것을 날짜×sign 해시로 분리 | MERGED |
| #766 | 기간별 읽는 법 96편 + 기간별 계산 근거 FAQ + 가드 | MERGED |

### 현재 기준선 (재현: 아래 §5)

| 지표 | 값 |
|---|---|
| 사이트맵 URL | **411** (착수 전 433) |
| 광고 게재 가능 라우트 | **197** (착수 전 215) |
| 그중 고유 본문 1,500자 미만 | 17 (**전부 편집자 노트 보유**) |
| `_headers` 규칙 / 상한 | **96 / 100** — 여유 4칸뿐 |
| `_headers` X-Robots noindex 줄 | 57 |
| `scripts/generate-sitemap.mjs:49` noindex 목록 | 35 |
| `lib/seo/siteSeo.ts:384` noindex 목록 | 57 |

### `/fortune` 중복도 추이 (같은 sign 의 기간 쌍, 8-gram Jaccard)

| 쌍 | 착수 전 | #764 후 | **#766 후 (현재)** |
|---|---|---|---|
| today ↔ tomorrow | 79.1% | 71.2% | **63.3%** |
| tomorrow ↔ weekly | 70.5% | 63.5% | **56.8%** |
| weekly ↔ monthly | 69.7% | 69.7% | **62.5%** |

🔴 **위 raw 수치를 그대로 인용하지 말 것.** 96개 페이지가 공유하는 사이트 크롬과 24개 sign
그리드가 포함돼 **두 배쯤 부풀려져 있다.** 가드가 실제로 보는 축(문서빈도 10% 초과 shingle 제거)으로 재면:

| 기간 쌍 (크롬 제거) | 값 |
|---|---|
| today ↔ tomorrow | **31.1%** |
| tomorrow ↔ weekly | **24.1%** |
| today ↔ monthly (최악) | **38.5%** |
| 대조군 (같은 기간, 다른 sign) | 10.0% |
| 페이지당 고유 shingle | 501 / 549 / 671 (min/중앙/max) |

---

## 1. 🔴 다시 파지 말 것 — 이미 판정이 끝난 두 가지

### 1-1. robots.txt `Disallow` 는 대책이 아니다 (구글 1차 출처로 확인)

얇은 페이지를 심사에서 감추려는 발상은 **효과가 없고 오히려 해롭다.** 근거 4가지:

1. **AdSense 크롤러는 광고 태그가 있는 URL 만 가져간다** —
   *"The crawler attempts to access URLs only where our ad tags are implemented."*
   ([support.google.com/adsense/answer/99376](https://support.google.com/adsense/answer/99376))
   그런데 대상 라우트는 전부 `canLoadAdsense=false` 다. **막을 대상 자체가 없다.**
2. **`Disallow` 를 걸면 noindex 가 죽는다** —
   *"If the page is blocked by a robots.txt file … the crawler will never see the `noindex` rule,
   and the page can still appear in search results."*
   ([developers.google.com/search/docs/crawling-indexing/block-indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing))
   **이미 색인된 URL 이 영영 안 빠진다.** 지금 필요한 것은 정확히 그 반대다.
3. **`User-agent: *` 로는 애초에 안 막힌다** — Mediapartners-Google·AdsBot 은
   *"The global user agent (`*`) is ignored."* 레포도 이미 알고 있어 `app/robots.ts` 가
   21개 규칙을 11개 그룹에 각각 복제한다.
4. **막으면 승인 후 광고가 안 나간다** — 차단 시 *"we can't serve Google ads on the site."*
   그리고 `scripts/verify-adsense-readiness.mjs:1282-1285` 가 Mediapartners-Google 의 `Allow: /` 를 **강제**한다.

### 1-2. `/nakshatra/codex/*` 27개는 손댈 필요가 없다

선행 문서 §4-4 가 "codex 간 토큰 72% 중복"으로 적었지만, **가드가 실제로 쓰는 8-gram Jaccard 로는 10.8%** 이고
고유 본문이 2,136~2,332자다. 항목당 손으로 쓴 산문도 589자 있다(`constants/nakshatra-expert-prose.js`,
`constants/nakshatra-fusion.js` 의 `FUSION_DEEP`). **지표가 다르면 결론도 다르다** — 손대지 않기로 판정했다.

### 1-3. 워커 경로에도 `_headers` 는 적용된다

`public/_routes.json:8` 이 `/insights/famous-saju/*` 를 워커로 보내지만, `_headers` 는 살아 있다.
라이브 실측이 [seo-naver-diagnostic-2026-08-16.md](seo-naver-diagnostic-2026-08-16.md) §1 에 있다
(`curl -sI /fortune/sikojen-povailu/` → `x-robots-tag: noindex, nofollow`).
🔴 **이 문서의 초판이 반대로 적었다가 정정했다.** 일반론으로 추론하지 말고 그 실측을 볼 것.

---

## 2. ~~남은 레버 B~~ — `/fortune/weekly|monthly` 48개 색인 제외 → **2026-08-28 에 되돌렸다**

🔴 **이 절은 이제 기록이다. 여기 적힌 대로 다시 빼지 말 것.**
2026-08-17 에 이 레버를 당겨 50개(상세 48 + 허브 2)를 색인에서 뺐고, 2026-08-28 에 전부
되돌렸다(사이트맵 389 → 439). 되돌린 근거는 이 절이 스스로 적어 둔 것과 같다 — 광고를 못
붙는 라우트라 색인을 빼도 얻는 것이 0 이었고, 크롬 제거 8-gram Jaccard 24~38% 는 색인을
유지 중인 today↔tomorrow(31.1%)와 같은 범위다. 아래 "하는 법" 은 되돌리는 쪽에서도 그대로
쓰인다(두 목록은 **짝**이고, 사이트맵 두 벌을 같은 커밋에 담아야 한다).

되돌리면서 함께 고쳐야 했던 것 셋 — 색인에서 빠져 있는 동안 게이트 대상이 아니라 숨어 있었다:

1. **주간 `<title>` 이 달을 넘는 주에만 폭 61** (한도 60). 같은 달 주에 빌드하면 안 보인다.
   `lib/fortune/build-view.ts` 의 교차월 라벨을 `10월 26일~11월 1일` → `10월 26~11월 1일` 로
   축약해 연중 최악 59 로 내렸다(2026~2030 전 주 × sign 24종 실측).
2. **주간 허브 설명이 `…` 로 잘렸다**(폭 157). `facts[0]` 이 `기간 2026-08-24 ~ 2026-08-30`
   이라 바로 앞 `rangeLabel` 의 재진술이었다. 주간만 압축 날짜 + `요일별 일진 배치` 로 바꿔
   최악 151.
3. 🔴 **`verify-indexable-prose-depth` 의 여유가 0 이 됐다.** `/fortune/{weekly,monthly}` 가
   `loadDailyPackage("today")` 로 **오늘 문안을 그대로 재탕**하고 있어서, 색인이 50개 늘자
   한 문안이 실린 색인 페이지가 7 → 21쪽이 되어 공용 문구 임계(20쪽)를 넘었다. 그 문안을 쓴
   sign 들이 42단위씩 깎여 최솟값이 934 → **900(임계값과 동일)**. 기간마다 다른 시드로
   같은 풀에서 뽑게 고쳐 934 로 되돌렸다(문안을 새로 쓰지 않았다).

### 판단 재료

- **광고 수익 손실 없음**: `app/components/adsense-route-policy.js:106-115` 의 `CONTENT_PREFIXES` 에는
  `/fortune/today`·`/fortune/tomorrow` 만 있다. weekly·monthly 는 **이미 `canLoadAdsense=false`** 다.
  (확인: `node -e "import('./app/components/adsense-route-policy.js').then(m=>console.log(m.canLoadAdsense('/fortune/weekly/aries')))"` → `false`)
- **잃는 것**: 사이트맵 411 → **363**(weekly·monthly 상세 48 + 허브 2 = 50개가 빠진다. `grep -c "/fortune/weekly/\|/fortune/monthly/" sitemap.xml` → 50).
  그만큼의 검색 유입을 포기한다. **이게 이 안의 유일한 비용이자 사용자 판단 지점이다.**
- **얻는 것**: 색인에 남는 근중복이 줄어든다. 다만 #766 이후 크롬 제거 기준 중복이 24~38% 라
  **예전만큼 급한 사안은 아니다.** 먼저 §3(C안)을 검토할 것을 권한다.

### 하는 법 — PR #757 (`b85aa09ab`) 패턴 그대로, 4단계 중 3단계만

1. ~~광고 정책~~ — **불필요**(이미 차단됨). `adsense-route-policy.js` 를 건드리지 말 것.
2. `scripts/generate-sitemap.mjs:49 noindexPathPrefixes` 에 `/fortune/weekly`·`/fortune/monthly` 추가
3. `lib/seo/siteSeo.ts:384 noindexPathPrefixes` 에 동일 추가
4. `sitemap.xml` **과** `public/sitemap.xml` 을 **같은 커밋에** 재생성
   (`scripts/verify-sitemap-integrity.mjs:126` 이 두 파일의 URL 수 일치를 강제한다)

### 🔴 이 안의 함정

- **ShareWidget 커플링 — 이번엔 안전하다.** `siteSeo.ts` 의 `noindexPathPrefixes` 는
  `isNoindexPath` → `lib/seo.v2.ts:85 isPrivateRoute` → `lib/share.v2.ts:36` →
  `ShareWidget.tsx:115` 로 흘러 공유 버튼을 지운다. 그래서 `/flower/*` 는 페이지 단위 처리를 했다.
  **확인 결과 `SignFortuneView.tsx` 와 `page.tsx` 는 ShareWidget 을 렌더하지 않는다**
  (`grep -c ShareWidget` → 0/0). 접두사 목록에 넣어도 기능이 사라지지 않는다.
- 🔴 **`verify:fortune-freshness` 를 깨뜨리지 말 것.** `scripts/verify-fortune-freshness.mjs` 는
  `periods.ts:10` 에서 기간 4개를 발견해 **프로덕션에 HTTP 요청**을 보내고 `Article` JSON-LD 의
  `datePublished` 를 확인한다(`.github/workflows/fortune-daily-publish.yml:96`).
  **색인 제외는 404 가 아니므로 통과한다.** 단, 라우트 자체를 지우면 이 가드가 죽는다 — 지우지 말 것.
- 🔴 **`verify-adsense-readiness.mjs:1396 verifyBlockedIndexableSitemapRouteQuality`** 는
  *"광고 불가 + 사이트맵 등재 + noindex 아님 → 1,800자 이상"* 을 단언한다. 지금 weekly·monthly 가
  이 조항의 적용을 받고 있는데, **noindex 를 걸면 이 검사에서 빠진다**(더 느슨해진다). 문제 없음.

---

## 3. 남은 레버 C — 허브 링크 404개 (가장 무겁고 가장 위험)

### 실체

색인 가능하고 **광고까지 게재하는 페이지 3개**가 각각 134~135개씩, 합쳐서 **404개 링크**로
같은 noindex 템플릿 상세 134개를 가리킨다. 산출물 실측:

| 링크 출처 | 개수 | 성격 |
|---|---|---|
| `app/insights/famous-saju/page.tsx:187` | 134 | 카드 그리드 (`publishedCelebritySajuSeeds.map`) |
| `app/famous-saju/page.tsx:107` | 134 | 두 번째 허브 — 위와 Jaccard 0.369 로 서로 근중복 |
| **`app/insights/page.js:176-187`** | 134 | 🔴 **`sr-only` 내비에 숨겨 놓은 링크 목록** |

`/psychotest` 도 같은 모양이다 — 허브는 색인 대상인데 상세 14개는 서로 84.2% 중복이고
`app/psychotest/page.tsx:59-65` 가 **JSON-LD `ItemList` 로 14개 URL 을 따로 또 공개**한다.

### 🔴 그냥 링크만 걷어내면 **빌드가 멈춘다**

허브의 자체 산문은 거의 없다. `/insights/famous-saju` 의 고유 문구는 **~280자뿐**이고
나머지 18,000자는 **134개 카드 텍스트**다. `scripts/verify-editor-notes.mjs` 는 공통 크롬을 걷어낸
**고유 본문**을 재는데, 그 고유 본문이 곧 카드다. 카드를 빼면 **~300자**로 떨어져
`MIN_UNIQUE_BODY = 1500` 에 걸린다. `/famous-saju` 도 같다.

### 착수 조건 (전부 **같은 커밋**에 들어가야 한다)

1. **실제 허브 산문을 쓴다.** 이 인물들을 왜 다루는지, 어떻게 분류·검증하는지, 무엇을 근거로
   사주를 세우는지 — 카드 없이도 1,500자 고유 본문이 서는 분량.
2. **`app/_content/editor-notes.js` 에 두 허브 항목을 추가한다.** 규격:
   `lede` ≥ 90자 · `tips` 3개 이상 · 각 팁 `body` ≥ 50자 · 노트끼리 8-gram Jaccard < 0.5 ·
   **`lede` 가 페이지 본문의 부분 문자열이면 실패**(`verify-editor-notes.mjs:276-280`).
3. 🔴 **노트만으로는 임계를 못 넘는다.** 가드는 **노트를 제거한 뒤** 분량을 잰다
   (`verify-editor-notes.mjs:8`, `:170`). 1번이 반드시 선행돼야 한다.

### 그 밖의 제약

- **`/psychotest` 는 다른 축의 게이트를 받는다** — 광고 불가 + 색인 대상이라
  `verify-adsense-readiness.mjs:29 minimumBlockedIndexableVisibleTextLength = 1800`(가시 텍스트 총량).
  2026-08-17 실측 가시 텍스트는 **4,417자**다. 🔴 카드를 걷어낸 뒤 남는 양은 **측정하지 않았다** —
  선행 문서가 인용한 3,502자는 코드 주석의 옛 값이라 믿지 말고, **반드시 `npm run build:cf` 를
  돌려 직접 재라.**
- **`/famous-saju/category/*` 12개는 대체 경로가 못 된다** — `noindex, **nofollow**` 라 크롤이 끊긴다
  (`lib/seo/siteSeo.ts:454` → `lib/generate-page-metadata.ts:355-362`).
- 🔴 **고아 페이지를 잡아 줄 가드가 없다.** `verify:no-orphan-sitemap-routes` 는
  [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) `:321-324` 에서 제안만 되고 **구현되지 않았다.**
  링크를 잘못 끊어도 아무도 알려주지 않는다. 손으로 따져야 한다.
- **한 곳만 고치면 효과가 없다.** 세 경로가 서로 독립이라 하나를 끊어도 나머지 둘이 134개를 그대로 노출한다.
- `lib/seo-site-urls.ts:52-56` 이 134개 상세 URL 을 열거하고 있으나 **아무것도 소비하지 않는다**
  (`scripts/verify-indexnow-wiring.mjs:53-54` 가 여기 배선을 오히려 금지한다). 지금은 무해하지만
  다음 사람을 오도하므로 함께 정리할 것.

---

## 4. 남은 레버 D — `sign-profiles.ts` 나머지 264자 (**일부러 안 했다**)

`essence`(101) · `strength`(55) · `caution`(55) · `luckyHabit`(53) 은 여전히 sign 단위라
한 sign 의 4개 기간 URL 에 그대로 복제된다. **§0 의 남은 24~38% 중복의 실체가 이것이다.**

🔴 **그런데 이건 고칠 대상이 아니라고 판단했다.** 근거:

- sign 의 **기질**은 기간이 달라도 같은 것이 맞다. "양자리는 이런 사람"이 주간 페이지에서
  달라져야 할 이유가 없다.
- #766 에서 고친 FAQ 와 **성격이 다르다.** FAQ 는 주간 페이지에서 「그날의 일진을 계산한다」고
  **사실과 다른 말**을 하고 있었다. 이 넷은 틀린 서술이 아니다.
- 억지로 가르면 없는 차이를 지어내게 된다 — 그게 바로 AdSense 가 싫어하는 종류의 글이다.

되살리려면 96편을 더 써야 하고, 그 전에 **위 세 가지를 반박할 수 있어야 한다.**

---

## 5. 검증 · 재현 명령

```bash
# 기준선
grep -c "<loc>" sitemap.xml                 # 411
grep -c "^/" _headers                       # 96 (상한 100)
npm run build:cf                            # postbuild 에서 verify:adsense-readiness
node scripts/verify-editor-notes.mjs        # build:cf 뒤. 광고 라우트 197개 / 예외 0개
node scripts/verify-fortune-period-axis.mjs # sign 24 × 기간 4 = 96편 완비
npm run verify:seo-heading-integrity        # 색인 라우트 411개 H1 정확히 1개
node scripts/verify-guard-wiring.mjs        # 새 verify:* 를 만들었다면 필수
npx tsc --noEmit
npm test                                    # 236개
```

### 🔴 중복도를 잴 때

**페이지 전체 Jaccard 로 판단하지 말 것.** 96개가 공유하는 크롬 때문에 두 배 부풀려진다
(같은 조치가 raw 63.3% vs 크롬 제거 31.1%). `verify-editor-notes.mjs:182-190` 와 같은 방식으로
**문서빈도가 `코퍼스 × 0.1` 을 넘는 shingle 을 먼저 버리고** 재라.

### 🔴 새 `verify:*` 를 만들면 배선이 필수다

`scripts/verify-guard-wiring.mjs` 는 `pr-ci.yml` 의 `Typecheck and lint` 잡에서 **티어와 무관하게
항상** 돈다. 배선도 선언도 없는 검증기가 있으면 **그 PR 은 즉시 빨간불이 된다.**
`out/` 을 읽는 SEO 계열 가드의 배선 정본은 `pr-ci.yml` 의 `Build Pages and Worker` 잡
(`verify:seo-heading-integrity`·`verify:editor-notes`·`verify:fortune-period-axis` 가 나란히 있다).
🔴 `scripts/run-postbuild.mjs` 에는 넣지 말 것 — `optional` 개념이 없어 **릴리스 배포까지 하드 차단**된다.

---

## 6. 작업 환경 (여전히 유효)

🔴 **다른 세션이 기본 작업 디렉터리(`D:\Development\code-destiny`)를 함께 쓴다.**
이 작업 중에도 결제·팝업 관련 미커밋 변경이 20~36개 사이를 오갔고, 브랜치도 임의로 바뀌었다.

- **`git add .` 절대 금지.** 파일을 하나씩 지정해 스테이지한다.
- **격리된 워크트리에서 작업할 것.** `git merge` 가 남의 미커밋 파일과 겹치면 안전하게 거부되지만,
  그때는 이미 시간을 버린 뒤다. 처음부터 `git worktree add D:/wt-<주제> -b <브랜치> origin/main` 로 시작한다.
  빌드가 필요하면 `npm ci` 를 함께 돌린다(약 2분).
- **워크트리 정리**: `git worktree remove --force` 가 `node_modules` 경로 길이로 실패하면
  `robocopy <빈폴더> <워크트리> /MIR` 로 비운 뒤 지우고 `git worktree prune`.
- 빌드는 `sitemap.xml`·`rss.xml`·`config/sitemap-lastmod.json` 을 건드린다. `<loc>` 변화가 없으면
  **날짜 churn 이므로 커밋에서 뺀다** — 다음 빌드의 `save()`(`scripts/lib/sitemap-lastmod.mjs:410`)가 정리한다.

## 7. 권장 순서

1. **C안 착수 전 `/psychotest` 실측부터.** 카드를 걷어낸 뒤 가시 텍스트가 1,800자를 넘는지가
   이 안의 성립 여부를 가른다. 추정하지 말고 빌드해서 재라.
2. **C안** — 허브 산문 + 편집자 노트를 먼저 쓰고, 그다음 링크를 줄인다. 세 경로를 함께 고친다.
3. **B안** — C안 이후에도 심사가 막히면. 검색 유입을 포기하는 결정이라 사용자 승인이 필요하다.
4. **D안은 하지 않는다** (§4 근거).
