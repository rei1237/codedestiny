---
status: active
updated: 2026-08-24
next: "§4 \"남은 작업 — 우선순위\" 첫 항목부터"
---

# 서비스 노출 감사 — 인수인계 (2026-08-24)

> 이 문서만 읽고 이어서 작업할 수 있게 쓴다. 수치는 전부 `out/` 실측이며 재현 명령을 함께 남긴다.
> 착수 배경: "서비스가 JS 에 갇혀 검색에 노출되지 않는다"는 진단을 검증하기 위한 전수 감사.

## 0. 한 줄 결론

**진단은 맞았다. 다만 원인은 "크롤러가 JS 를 못 읽는다"가 아니라 두 가지였다 —
① 얇은 본문 때문에 우리가 스스로 `noindex` 를 걸었고, ② 푸터가 환불정책 전문을
색인 페이지 279개(사이트맵의 75%)에 복제해 고유 본문 비율을 무너뜨리고 있었다.**

②는 이 PR 에서 고쳤다. ①은 남아 있다(§4).

---

## 1. 실측 — 무엇을 근거로 이 결론에 왔나

### 1-1. 셸 타일 서비스 54개 중 색인 URL 이 있는 것은 28개

재현:
```bash
npm run sitemap:generate     # 커밋본이 낡아 있어 먼저 재생성해야 한다(§5-1)
# 그 뒤 타일(var D) ↔ 사이트맵 ↔ app 라우트를 대조
```

| 구분 | 개수 |
|---|---:|
| 타일 서비스(`index.html` 의 `var D` 키) | 54 |
| 색인 URL 있음 | 28 (유료 16) |
| URL 은 있는데 사이트맵에 없음 | **26 (유료 13)** |
| URL 자체가 없음 | 0 |

### 1-2. 26개의 원인 분해 — 대부분이 "의도적 noindex" 였다

| 원인 | 개수 | 유료 |
|---|---:|---:|
| `_headers` X-Robots-Tag / sitemap noindexPathPrefixes 로 **의도적 차단** | 21 | 12 |
| app 랜딩 자체가 없음(레거시 `.html` 만 존재) | 14 | 7 |
| 정본이 레거시 `.html` 로 잡혀 app 랜딩이 301 로 죽음 | 1 | 1 |

🔴 **`/oracle/ifa`** — `app/oracle/ifa/page.tsx` 가 실재하는데
`scripts/static-canonical-route-map.mjs:115-116` 이 `/ifa-oracle.html` 을 정본으로,
`/oracle/ifa` 를 그 **별칭**으로 선언해 301 로 죽어 있다. 목적지인 레거시 `.html` 은
본문 328자라 `_headers` 가 noindex 를 건다. 즉 현대적 랜딩이 얇은 정적 파일에 가려져 있다.
(이 패턴은 정본 19개 중 1건뿐이다 — 일반화하지 말 것.)

### 1-3. 크롤러가 읽는 본문 실측

`verify-adsense-readiness.mjs` 의 `getVisibleText` 와 같은 방식(script/style/svg 제거).

| 서비스 | 가격 | 본문(자) | 스크립트(KB) |
|---|---:|---:|---:|
| IFÀ 오라클 | 3,000원 | **328** | 20 |
| 영국 홍차점 | 5,000원 | **337** | 67 |
| 네빌 명상 | — | 547 | 36 |
| 지오맨시 오라클 | 3,000원 | 675 | 43 |
| 요가 구루 | 3,000원 | 751 | 42 |
| 셀레스티얼 하모니 | 10,000원 | 837 | 79 |
| 코스믹 소울 명상 | 30,000원 | 1,305 | 39 |
| 포춘텔러 피쉬 | 무료 | **200** | 62 |

**본문 중앙값 751자 · 스크립트 합계 728KB.** 기능이 전부 스크립트 안에 있고 크롤러가
읽는 것은 그 껍데기뿐이라는 뜻이다 — 사용자 표현대로 "JS 에 갇혀" 있다.

### 1-4. 🔴 raw 글자수 게이트는 링크 목록을 걸러내지 못한다

`verify-adsense-readiness.mjs:29` 의 `minimumBlockedIndexableVisibleTextLength = 1800` 은
**raw visible text** 를 센다. 그래서 링크 허브도 통과한다:

| 페이지 | raw | 크롬 제거 후 고유 | 산문(>25자) |
|---|---:|---:|---:|
| `/oracle/sikojen-povailu` | 2,523 | **47** | **0** |
| `/oracle/royal-tea` | 2,888 | **412** | **222** |
| `/ziwei/chart` | 1,974 | 1,972 | 1,920 |

시코옌은 raw 2,523자로 게이트를 통과하지만 고유 본문은 사실상 0이다. 전부
"서비스 링크 허브" 목록이다. **게이트가 AdSense 심사 기준을 대변하지 못한다.**

### 1-5. 🔴 그리고 그 raw 를 부풀리던 것의 정체 — 푸터 환불정책 전문

`app/components/SiteFooterHub.jsx` 가 `REFUND_POLICY_ROWS`(8개 조항, 1,013자)를
모든 페이지 푸터에 렌더하고 있었다.

| 지표 | 값 |
|---|---:|
| `out/` HTML 총수 | 732 |
| 보일러플레이트를 본문에 담은 페이지 | **538 (73%)** |
| 그중 사이트맵에 있는 것(색인 대상) | **279 / 371 (75%)** |
| 색인 페이지에 실린 중복 총량 | 약 **334,800자** |

색인된 유료 랜딩의 "문장급 본문"을 뜯어보면 대부분이 이 환불정책이었다 —
영국 홍차점은 14문장 중 11개, 시코옌은 11문장 중 10개가 같은 문구였다.

**제거 시뮬레이션**: 색인 371개 중 **278개는 제거 후에도 1,800자 이상**,
미달로 떨어지는 것은 `/tarot/love` **한 개(12자 부족)** 뿐이었다.
즉 게이트는 보일러플레이트에 기대고 있지 않았고, 제거는 안전했다.

---

## 2. 이 PR 이 한 것

| 파일 | 변경 |
|---|---|
| `app/components/SiteFooterHub.jsx` | 환불정책 전문 `<ul>` 렌더 → `/refund-policy/` 링크 1줄로 교체 |
| `app/tarot/love/page.tsx` | 6카드 스프레드 포지션 기반 `valueSections` 7개 추가 |

법적 고지는 유지된다 — 8개 조항 **전부**가 `/refund-policy` 에 이미 실려 있음을
같은 날 `out/` 대조로 확인했다(8/8). 푸터에는 요약 문단 + 전문 링크 + 카드 환급 고지가 남는다.

`/tarot/love` 본문은 구현에서만 뽑았다(지어낸 문장 0):
`js/tarot-love-experience.js:9-16`(포지션 6종 라벨) · `:24`(50코인) · `:26`(featureKey) ·
`:29`(서버 LLM 동기 생성) · `:3-4`(API 경로).

### 측정된 효과

| 지표 | 전 | 후 |
|---|---:|---:|
| 보일러플레이트를 담은 페이지 | 538 | **1** (= `/refund-policy` 정본) |
| 색인 페이지 중 중복 보유 | 279 | **1** |
| 중복 총량 | 334,800자 | 1,200자 |
| `/tarot/love` 본문 | 2,809 | 2,680 (게이트 통과) |
| `/oracle/sukuyo` 본문 | 3,860 | 2,901 |

재현:
```bash
npm run build          # [adsense-readiness] OK 확인
# out/ 에서 "월정석은 각 지급분이 지급된 날로부터 30일간만 유효하며" 를 포함한 파일 수를 센다
```

---

## 3. 🔴 로케일 푸터에도 같은 문제가 남아 있다 (미조치)

`app/components/LocaleFooterHub.jsx:80` 의 `getRefundSection(locale)` 이 로케일 라우트에서
같은 방식으로 환불 전문을 렌더한다. 로케일 산출물은 41개뿐이라 이번엔 손대지 않았다.
같은 처방(요약 + 전문 링크)을 적용할 것.

---

## 4. 남은 작업 — 우선순위

> 🔴 **2026-08-30 갱신: §4-1·§4-2·§4-4 는 전부 해소됐다.** 아래 표는 2026-08-24 **오전** 값이고,
> 같은 날 오후에 5개 라우트가 본문 보강 후 색인으로 돌아왔다. 2026-08-30 dist/ 재측정에서
> 8개 라우트 전부 문장급 본문 1,292~2,618단위(임계 900, 색인 439개 중앙 1,689)로 통과한다.
> 수치와 재현은 [docs/code-destiny-audit.md](../code-destiny-audit.md) §5 의 "P3 를 다시 열지 말 것".
> 남은 얇은 라우트는 `/oracle/royal-tea`·`/oracle/sikojen-povailu` 뿐이고 **noindex 유지가 정답**이다.

### 4-1. 색인 복원 후보 (본문 실측 기준)

색인 중인 페이지의 고유 문장급 본문은 **1,472 ~ 3,634자**(최소값 = `/oracle/rune`).
이 기준선과 비교하면:

| 서비스 | 경로 | 고유 문장급 | 판정 |
|---|---|---:|---|
| 자미두수 명반 | `/ziwei/chart` | **1,920** | ✅ **지금 바로 색인 가능** (보일러플레이트 0) |
| 영국 홍차점 (5,000원) | `/oracle/royal-tea` | ~412 | ❌ 본문 보강 선행 |
| 시코옌 | `/oracle/sikojen-povailu` | ~47 | ❌ 링크 허브 — noindex 유지가 옳다 |

🔴 `/ziwei/chart` 색인 복원은 **다섯 곳**을 함께 고쳐야 한다
(`docs/context/seo-and-adsense.md` 의 색인 5개소 표):
`scripts/generate-sitemap.mjs` noindexPathPrefixes · `lib/seo/siteSeo.ts` noindexPathPrefixes ·
루트 `_headers` X-Robots-Tag · `scripts/verify-adsense-readiness.mjs` 의 패턴 목록 ·
`generate-sitemap.mjs` `coreRoutes` 등재.
`lib/seo/siteSeo.ts` 에서 빼면 ShareWidget 이 되살아난다(의도된 부작용).

### 4-2. 본문 보강이 필요한 것 (out/ 실측, 1,800자 게이트 기준)

| 서비스 | 경로 | 현재 | 부족 |
|---|---|---:|---:|
| IFÀ 오라클 | `/oracle/ifa` | 23 | 1,777 |
| 연애 시뮬레이션 | `/saju/love-simulation` | 58 | 1,742 |
| 사주 수호신 | `/saju-guardian` | 160 | 1,640 |
| 네오 작전실 | `/neo-operation-room` | 285 | 1,515 |
| 사주 FPTI | `/saju-fpti` | 431 | 1,369 |
| 최애운명 | `/saju/destiny-bias` | 697 | 1,103 |
| 힐링 타로 | `/tarot/healing` | 1,092 | 708 |

**합계 9,854자.** 정본 패턴은 `app/oracle/rune/page.tsx` 다 —
`<section className="sr-only">` 안에 h1 + 산문 + h2/ul + h2/ol + FAQ 를 서버 렌더하고
JSON-LD 3종(`buildServiceJsonLd`/`buildFaqPageJsonLd`/`buildBreadcrumbJsonLd`)을 붙인다.
`FeatureLandingPage` 를 쓰는 라우트는 `valueSections` 로 같은 효과를 낸다(이 PR 의 `/tarot/love` 참고).

🔴 **본문은 구현에서 뽑을 것.** 지어낸 효능·보장은 금지다
(`docs/handoff/detail-sheet-copy-rewrite.md` 의 제1원칙, PR #629 가 그래서 나왔다).

### 4-3. 게이트 자체의 결함 (설계 과제)

`minimumBlockedIndexableVisibleTextLength` 가 raw 를 재기 때문에 링크 허브가 통과한다(§1-4).
**"크롬·공통 보일러플레이트를 뺀 문장급 본문"** 으로 기준을 바꾸면 링크 허브가 자동으로 걸리고,
noindex 목록을 손으로 관리하지 않아도 된다(CLAUDE.md 원칙 10 — 손으로 쓴 목록은 가드가 아니다).
이 PR 이 보일러플레이트를 걷어냈으므로 이제 raw 와 고유 본문의 차이가 크게 줄어 전환이 쉬워졌다.

### 4-4. `/oracle/ifa` 정본 뒤집기

`static-canonical-route-map.mjs:114-119` 에서 `/ifa-oracle.html` 을 정본,
`/oracle/ifa` 를 별칭으로 둔 것을 뒤집는다. 다만 `/oracle/ifa` 의 본문이 23자이므로
§4-2 의 본문 보강이 선행돼야 한다.

---

## 5. 이번 감사에서 함께 발견한 것 (이 PR 범위 밖)

### 5-1. 커밋된 사이트맵이 낡았다 — 라이브는 정상

`public/sitemap.xml` / `sitemap.xml` 은 362개인데 생성기는 **371개**를 만든다.
차이 9개는 커밋 `e2fc4cd71`(2026-08-23, "버려지던 app 랜딩 9개를 살려 색인 대상으로 되돌린다")이
소스만 고치고 사이트맵을 재생성하지 않아 생겼다.

```
/astrology/cosmic  /oracle/sukuyo  /saju/basic  /saju/sibyl
/tarot/love  /tarot/mingri  /tarot/reunion  /tarot/self-esteem  /tarot/year
```

🔴 **라이브는 정상이다** — 실측(2026-08-24): 프로덕션·스테이징 모두 371개이고
`/oracle/sukuyo` 도 들어 있다. 빌드가 `sitemap:generate` 를 먼저 돌리기 때문이다.
따라서 색인 사고는 아니고 **커밋본 드리프트**다. 다만 로컬 감사가 낡은 파일을 읽어
잘못된 결론에 도달할 수 있다(이 감사도 처음에 그랬다).

`verify-sitemap-integrity` 는 루트↔public 두 사본을 서로 대조할 뿐 **생성기와 대조하지 않는다.**
`verify-public-mirror-fresh` 처럼 "생성기를 돌려 결과가 커밋된 것과 같은지" 보는 가드가 없다.

### 5-2. `public/famous-saju-aliases.json` 도 같은 드리프트

`lib/famous-saju/celebrity-data.ts` 는 2026-08-22 에 갱신됐는데 별칭 파일은 2026-08-16 이 마지막이다.
`npm run verify:redirects-budget` 을 **단독으로** 돌리면 실패한다. 빌드는 재생성 후 검사하므로
CI·배포에는 영향이 없다.

### 5-3. `verify:public-mirror-fresh` 는 Windows 로컬에서 항상 실패한다

`core.autocrlf=true` 환경에서 생성기는 `.ignore` 를 LF 로 쓰고 git 은 CRLF 로 체크아웃하는데
가드가 바이트 비교를 한다. 내용은 동일하다(`git diff --numstat` 이 비어 있음). CI(Linux)에서는 안 난다.

### 5-4. `static/geomancy-oracle-v4.html` 의 인라인 스크립트가 깨져 있다

빌드 로그: `[externalize-dist-inline-scripts] 파싱 안 되는 인라인 블록이 있어 그대로 둔 파일 1개
(원래부터 깨진 스크립트다 — 이 단계가 만든 문제가 아니다)`. 별건으로 조사 대상.

---

## 6. 재현 명령 모음

```bash
# 사이트맵 재생성 후 감사해야 한다(커밋본이 낡음)
npm run sitemap:generate

# 빌드(본문 실측의 전제). fortune 데이터가 먼저 필요하다.
npm run fortune:build-data && npm run build

# 보일러플레이트 확산 측정
#   out/ 전 HTML 에서 "월정석은 각 지급분이 지급된 날로부터 30일간만 유효하며" 포함 수를 센다

# 본문 분량 측정 방식은 verify-adsense-readiness.mjs 의 getVisibleText 와 동일
#   script/style/svg/주석 제거 후 태그 제거 → 공백 정규화 → length
```

🔴 워크트리에서 빌드하려면 `node_modules` 링크가 필요하다:
`cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"`
(지울 때는 `cmd /c rmdir` 로 링크부터 끊을 것 — 안 그러면 공유 설치본을 지운다.)
