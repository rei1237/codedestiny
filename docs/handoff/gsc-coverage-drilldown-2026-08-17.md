# GSC 커버리지 드릴다운 대응 — 인수인계 (2026-08-17)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 수치는 GSC 드릴다운 내보내기 실측 + 라이브 curl 실측이다.
>
> 원본: `code-destiny.com-Coverage-Drilldown-2026-08-17` (Google Sheets 2개, 「차트」·「테이블」·「메타데이터」 3탭).
> 🔴 사용자가 준 URL 의 `gid` 는 **차트 탭**이라 URL 목록이 없다. 테이블은 **2번째 시트**다.
> 받는 법(스코프 문제로 Drive 커넥터는 못 쓴다 — `Insufficient scope`):
> ```bash
> curl -sL -o wb.xlsx "https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx"
> # xlsx 는 zip 이다. xl/worksheets/sheet2.xml + xl/sharedStrings.xml 을 파싱한다.
> # 셀 타입 판정 주의: <c r=".." s=".." t="s"> 처럼 속성 순서가 섞이므로
> # /t="s"/ 를 여는 태그 전체에서 검사할 것(순서를 가정하면 전부 인덱스 숫자로 읽힌다).
> ```

---

## 1. 규모 (2026-05-18 → 2026-08-07 추세)

| 버킷 | 시작 | 최근 | 추세 |
|---|---|---|---|
| 찾을 수 없음(404) | 540 | **754** | 증가 |
| 리디렉션이 포함된 페이지 | 154 | **317** | 증가 |

테이블 탭 실측: 404 **754행**, 리디렉션 **280행**.

## 2. 404 754건의 분해 — 무엇을 고쳤고 무엇을 남겼나

| 패턴 | 건수 | 상태 |
|---|---|---|
| 구 프리픽스 `en-us`·`ja-jp`·`zh-cn` | **167** | ✅ 이 세션 — 301→404 체인이었다 |
| `/insights/<slug>` 무슬래시 | **23** | ✅ 이 세션 — 규칙이 `X/*` 라 `X` 를 못 잡았다 |
| 구 프리픽스 `es-es`·`de-de`·`fr-fr`·`nl-nl`·`ms-my`·`hi-in` | **361** | ⬜ 의도적 방치 (§4) |
| `/fortune/**.html` | 106 | ⬜ 이미 301→200. GSC 재크롤 대기 |
| `/fortune/...` 무슬래시 | 45 | ⬜ 이미 301→200 |
| `/insights/<slug>/` 슬래시 | 27 | ⬜ 이미 301→200 |
| 기타 | 23 | ✅ 전수 조사 완료 — **코드 조치 불필요** (§2-3) |

### 2-1. 🔴 301 → 404 체인 (167건) — 이번 세션의 핵심

`public/_redirects` 가 `/en-us/* → /en/:splat 301` 이었다. **로케일 산출물이 있는 경로는 41개뿐**이라
나머지는 전부 리다이렉트 끝이 404 였다. 표본 12건 전수 확인:

```
/en-us/saju-picture                                        301 → /en/saju-picture   → 404
/ja-jp/insights/astrology-synastry-compatibility-fun-guide 301 → /ja/insights/...   → 404
/zh-cn/high-value/category/informational-article           301 → /zh/high-value/... → 404
```

한국어 원본은 살아 있다(8건 중 7건 200). 그래서 목적지를 `/:splat` 으로 바꿨다 — **규칙 수 증가 0**.

🔴 루트(`/en-us`·`/ja-jp`·`/zh-cn`)는 `/en/`·`/ja/`·`/zh/` 가 실재하므로 **그대로 뒀다.**
다만 `/en-us/`(후행 슬래시)는 splat 이 비어 `/`(한국어 홈)로 간다 — 영어 홈이 아니다.
죽은 레거시 URL 1개라 규칙을 더 쓰지 않았다(예산 §3). 고치려면 `/en-us/ /en/ 301` 3줄이 필요하다.

### 2-2. `X/*` 는 `X` 를 안 잡는다 (23건)

은퇴한 insights 통합 규칙이 `/insights/foo/*` 형태였다. Cloudflare 에서 이건 `/insights/foo/` 와
`/insights/foo/bar` 는 잡지만 **`/insights/foo` 는 못 잡는다** → 하드 404.

```
/insights/tarot-major-arcana-symbols    404
/insights/tarot-major-arcana-symbols/   301
```

파일의 옛 주석은 *"상한 때문에 무슬래시 형태를 포기했다"* 고 적혀 있었는데, **`X*` 한 줄이 양쪽을
같은 비용으로 덮으므로 포기할 이유가 없었다.** 짝(정확 일치 규칙)이 없는 43개를 `X*` 로 바꿨다.

🔴 **프리픽스화 전 사이트맵 충돌 검사 필수.** 실측 결과 이 43개는 충돌 0이지만
`/me` 는 `/methodology` 를 삼켜서 제외했다. 재현:
```bash
node -e "/* _redirects 의 /x/* 규칙을 뽑아 sitemap.xml 의 loc 과 startsWith 대조 */"
```

이건 같은 세션에서 `_headers` 에 있었던 것과 **똑같은 부류의 실수**다(`/destiny-poker.html` 이
`/destiny-poker` 를 안 덮던 문제, PR #740). **와일드카드 경계를 적을 때마다 이 질문을 할 것.**

### 2-3. 기타 23건 — 전수 조사 결과 코드 조치 불필요 (2026-08-17)

**이 절의 목적은 다음 사람이 같은 조사를 반복하지 않게 하는 것이다.** 결론부터: **고칠 것이 없다.**

| URL | 라이브 | 소스 참조 | 판정 |
|---|---|---|---|
| `/favicon.ico` | **200** | — | 이미 정상. 과거 흔적 |
| `/oracle/kemet` · `/animal/totem` | 404 | `HomeServiceSections.tsx:76,84` · `serviceMap.js` | ⚠️ **링크가 아니다** — `/index.html?action=openKemetModal` 로 보내는 **모달 리라이트 맵**이다. `grep -rl 'oracle/kemet' dist --include=*.html` → **0**. 산출물에 href 로 안 나간다 |
| `/fuctionassets/saju.webp/` · `jumsung.webp/` | 404 | — | 슬래시 없는 원본은 **200**. 산출물에 확장자 뒤 슬래시가 붙은 `src`/`href` 는 **0건**(전수 grep). 크롤러가 붙인 형태 |
| `/js/life-book.js` | 404 | `sync-legacy-static-to-public.mjs` 미러 목록에만 | 페이지 참조 0. 미러 목록의 잔재 |
| `/manifest-samba.json` | 404 | **없음** | 참조 0 |
| `/high-value/category/{faq-page,informational-article}` | 404 | **없음** | 참조 0 |
| `/oracle/juyuk` · `/oracle/hwatu` | **308** | — | 정상 동작 중 |
| `/saju/love-secret` | **301** | — | 정상 동작 중 |
| `/oracle/` · `/ko/` · `/tarot-cards/` · `/animal/totem` | 404 | 자산 경로로만 등장 | 허브가 없는 경로. 링크 0 |
| `/&` · `/$` · `/api/admin/entry/password` | 404 | — | 깨진 크롤 문자열 · 관리 API. 404 가 정답 |

🔴 **`/ko/` 가 404 인 것은 정상이다** — 한국어는 `pathPrefix: ""` 라 프리픽스가 없다(`lib/i18n/locales.ts`).
hreflang 이 `/ko/` 를 내보내고 있었다면 버그지만, 산출물 실측 결과 그런 참조는 없다.

재현:
```bash
grep -ro 'href="/oracle/kemet[^"]*"' dist --include=*.html | wc -l          # 0
grep -roE '(src|href)="/[^"]+\.(webp|png|jpg|svg|js|css)/"' dist --include=*.html | wc -l   # 0
```

## 3. 🔴 `_redirects` 예산이 이 문제의 진짜 제약이다

`scripts/verify-redirects-budget.mjs` — Cloudflare Pages 는 **첫 102개만** 적용하고 나머지를
조용히 버린다. 가드 예산은 **95** (실측 상한 102 − 마진 7). 현재 **89/95, 여유 6**.

그래서 이 세션의 수정은 전부 **규칙 수 증가 0** 으로 설계했다. 새 규칙을 넣고 싶으면
먼저 합칠 수 있는 쌍을 찾을 것(`X` + `X/*` → `X*` 로 2줄이 1줄이 된다 — 아직 21쌍 남아 있다).

## 4. 361건을 방치하기로 한 근거

`es-es`·`de-de`·`fr-fr`·`nl-nl`·`ms-my`·`hi-in` 은 `_redirects` 규칙이 아예 없어 하드 404다.

- 이 URL 들은 **실재한 적이 없다.** 셸 런타임 버그(`__cdLocalePrefixMap`, PR #725 로 수정)가
  만들어 낸 것이고, 지금은 생성되지 않는다.
- 외부 백링크가 붙었을 가능성이 사실상 없다 → 보존할 링크 자산이 없다.
- 301 을 깔면 `/xx-yy/*` 6줄이 필요해 **89 → 95**, 가드 상한에 정확히 닿는다(여유 0).
- Google 은 404 를 리다이렉트보다 빨리 버린다. 크롤 예산이 문제인 신규 도메인에서는
  **404 로 흘려보내는 쪽이 유리하다.**

→ **다시 검토하지 말 것.** 재검토하려면 위 4개 근거 중 무엇이 바뀌었는지 먼저 적을 것.

## 5. 리디렉션 280건 — 대부분 정상이다

| 패턴 | 건수 | 판정 |
|---|---|---|
| `/insights/...` (슬래시 83 + 무슬래시 41) | 124 | ✅ 의도된 근중복 통합 301. **고치지 말 것** |
| `/fortune/**.html` | 82 | ✅ 레거시 → 허브 301. 의도됨 |
| `/en`·`/ja` 등 무슬래시 | 15 | 후행 슬래시 308. 내부 링크는 #724·#726 이 이미 고쳤다 → 과거 흔적 |
| 기타 | 57 | ✅ 전수 조사 — **살아 있는 라우트의 무슬래시 형태**. 아래 |

기타 57건은 전부 **살아 있는 라우트의 무슬래시 형태**다(`/tarot`·`/manse`·`/today`·`/about`·
`/insights`·`/high-value`·`/points`·`/methodology`·`/faq` 등). 라이브 실측 결과 **전부 308 → 200** 이다.

```
/          200          ← 홈은 리다이렉트하지 않는다. 시트의 `/` 6행은 빈 셀 파싱 산물이다
/tarot     308 → 200
/insights  308 → 200
/points    308 → 200
```

내부 링크는 #724·#726 이 이미 고쳤으므로(산출물 기준 32회 → 2회) 이건 **과거 색인 잔재**다.
**조치 불필요** — 재크롤로 소멸한다.

🔴 **「리디렉션이 포함된 페이지」는 오류가 아니라 정보성 리포트다.** 은퇴한 콘텐츠를 정본으로
합치는 301 은 정확히 우리가 의도한 것이고, 이 숫자가 0이 되는 것은 목표가 아니다.
**중요한 것은 리다이렉트 끝이 200 이냐**이고, §2-1 이 그게 아니었던 167건을 고친 것이다.

## 6. 남은 일

**코드로 고칠 것은 남아 있지 않다.** 754 + 280건을 전수 분류했고, 조치가 필요한 190건은
이 세션에서 처리했다. 나머지는 이미 정상 동작 중이거나(§2·§5) 의도적으로 두는 것(§4)이다.

1. **재크롤 대기 (사람 작업)** — §2 의 "이미 301→200" 178건은 코드 문제가 아니다.
   GSC 에서 검증을 요청하되 판정에는 **2~4주** 걸린다. 그 전에 개선 여부를 단정하지 않는다.
2. **선택 — `/en-us/` 후행 슬래시** (§2-1). 죽은 레거시 URL 1개에 규칙 3줄을 쓸지 저울질.
   지금은 `/`(한국어 홈)로 간다. 영어 홈으로 보내고 싶으면 `/en-us/ /en/ 301` 3줄.
3. **선택 — 남은 21쌍 병합.** `X` + `X/*` 두 줄을 `X*` 한 줄로 합치면 **21줄이 빈다**
   (89 → 68). 예산이 급할 때 여기서 확보한다. 🔴 병합 전 사이트맵 충돌 검사 필수(§2-2 참고).
   지금 당장은 필요 없다 — 이 세션의 수정이 전부 순증 0이었기 때문이다.
4. **다음 드릴다운을 받을 때** — §0 의 xlsx 파싱 절차를 그대로 쓰면 된다. `gid` 가 차트 탭인 것과
   셀 타입 판정 함정을 반복해서 밟지 말 것.

## 7. 이 세션에서 바꾼 파일

`public/_redirects` 만. (루트 `_redirects` 는 **존재하지 않는다** — `public/` 이 유일 정본이다.
`_headers` 와 다르니 헷갈리지 말 것.)

검증: `build:cf`(adsense-readiness OK) · `verify-redirects-budget` 89/95 · `verify-public-parity` ·
paid-gate 49/49.

🔴 라이브 확인은 **머지 후에만** 가능하다:
```bash
curl -sL -o /dev/null -w "%{http_code} hops:%{num_redirects}\n" https://code-destiny.com/en-us/saju-picture
#   → 200 hops:2 기대 (현재는 404)
curl -s -o /dev/null -w "%{http_code}\n" https://code-destiny.com/insights/tarot-major-arcana-symbols
#   → 301 기대 (현재는 404)
```
