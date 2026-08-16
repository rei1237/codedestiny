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
| 기타(`/oracle/kemet` 등) | 3 | ⬜ 미조사 |

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
| 기타 | 59 | 미분류 |

🔴 **「리디렉션이 포함된 페이지」는 오류가 아니라 정보성 리포트다.** 은퇴한 콘텐츠를 정본으로
합치는 301 은 정확히 우리가 의도한 것이고, 이 숫자가 0이 되는 것은 목표가 아니다.
**중요한 것은 리다이렉트 끝이 200 이냐**이고, §2-1 이 그게 아니었던 167건을 고친 것이다.

## 6. 남은 일

1. **재크롤 대기** — §2 의 "이미 301→200" 178건은 코드 문제가 아니다. GSC 에서 검증을 요청하되
   판정에는 **2~4주** 걸린다. 그 전에 개선 여부를 단정하지 않는다.
2. **`/oracle/kemet` 등 3건 미조사** — 404 목록에 있고 라이브도 404다. 실재했던 라우트인지
   `git log --diff-filter=D` 로 확인할 것.
3. **`/en-us/` 후행 슬래시** — §2-1 참고. 규칙 3줄을 쓸지는 예산과 저울질.
4. **남은 21쌍 병합** — `X` + `X/*` 를 `X*` 로 합치면 21줄이 빈다. 예산이 급하면 여기서 확보.

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
