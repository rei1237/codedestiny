# SEO 실측 감사 (2026-09-17, 1차 세션 — P0 범위)

> 이 문서는 22개 섹션짜리 전체 SEO 개편 요청 중 **P0(감사+긴급수정)** 범위만 다룬다.
> 허브 콘텐츠 재작성, 로케일 번역 완성, 내부링크 재설계, structured data 확장,
> E-E-A-T, 경쟁사 조사 등은 다루지 않았다 — 후속 세션 과제(문서 하단 참고).
>
> 실측 방법: `curl`로 `https://code-destiny.com`의 실제 production HTML을 직접
> 가져와 `<head>` 태그를 확인했다(Search Console·Naver Search Advisor 접근 권한
> 없음). React SSR은 `hrefLang`을 camelCase로 렌더링하므로, 소문자 `hreflang`
> grep은 실측 중 오탐(false negative)을 냈다가 재확인으로 정정했다 — 이 문서의
> 모든 결론은 대소문자 무관 확인을 거쳤다.

## 1. 인프라 구조 (정상)

| 항목 | 상태 | 근거 |
|---|---|---|
| robots.txt | 정상 | `https://code-destiny.com/robots.txt` 200, sitemap 6개 라인 모두 등재 |
| sitemap.xml | 정상 | 200, 1265 URL |
| sitemap-ko.xml | 정상 | 200, 784 URL |
| sitemap-ja.xml | 정상 | 200, 124 URL |
| sitemap-en.xml | 정상 | 200, 123 URL |
| sitemap-zh.xml | 정상 | 200, 123 URL |
| sitemap-zh-tw.xml | 정상 | 200, 111 URL |

`1265 = 784+124+123+123+111` — 통합 sitemap.xml이 5개 로케일 sitemap의 정확한
합집합이다(카운트 깨짐 아님, 의도된 구조로 보임).

**주의(P2, 이번엔 미수정):** robots.txt가 `sitemap.xml`(합집합)과
`sitemap-{locale}.xml`(부분집합) 5개를 **동시에** 제출한다. Google/Naver가 동일
URL을 여러 sitemap에서 중복 수신하는 것 자체는 에러는 아니지만 불필요하다.
정리하려면 `sitemap.xml`을 진짜 sitemap **index**로 바꾸거나, 로케일별 5개만
남기고 통합본을 빼는 두 방향이 있다 — 결정은 후속 세션에서.

## 2. Canonical / hreflang 스팟체크 (실측, 문제 없음)

7개 대표 허브 × 5개 로케일(ko/en/ja/zh/zh-tw) HTTP 상태:

| 허브 | ko | en | ja | zh | zh-tw |
|---|---|---|---|---|---|
| saju | 200 | 200 | 200 | 200 | **404** |
| astrology | 200 | 200 | 200 | 200 | **404** |
| ziwei | 200 | 200 | 200 | 200 | 200 |
| vedic | 200 | 200 | 200 | 200 | **404** |
| sukuyo | 200 | 200 | 200 | 200 | 200 |
| today | 200 | 200 | 200 | 200 | 200 |
| tarot | 200 | 200 | 200 | 200 | **404** |
| compatibility | 200 | **404** | **404** | **404** | **404** |

`/saju`, `/en/saju`, `/ja/saju`의 `<head>`를 직접 확인한 결과:

```
<link rel="canonical" href="https://code-destiny.com/saju/"/>
<link rel="alternate" hrefLang="ko" href="https://code-destiny.com/saju/"/>
<link rel="alternate" hrefLang="ja" href="https://code-destiny.com/ja/saju/"/>
<link rel="alternate" hrefLang="en" href="https://code-destiny.com/en/saju/"/>
<link rel="alternate" hrefLang="zh" href="https://code-destiny.com/zh/saju/"/>
<link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/saju/"/>
```

3개 로케일 모두 동일한 5-링크 세트가 상호 참조되고(reciprocal), canonical도
각 로케일이 자기 자신을 가리킨다(cross-locale 오염 없음). **존재하지 않는
zh-TW는 hreflang 세트에서 올바르게 빠져 있다** — 없는 번역을 향한 깨진
hreflang을 선언하지 않는, 의도된 안전장치(`lib/generate-page-metadata.ts`
`hreflangPaths`가 실제 존재하는 라우트만 받는 구조)가 정상 동작 중이다.

`/compatibility`(en/ja/zh/zh-tw 전부 미번역)도 확인 결과 hreflang 태그를
**아예 생성하지 않는다**(가짜 alternates 없음) — 이 역시 정상.

**결론: 이번 세션에서 canonical/hreflang 관련 P0 버그를 찾지 못했다.** 인프라는
설계대로 fail-safe하게 동작하고 있다. 남은 문제는 전부 "아직 번역이 없다"는
콘텐츠 격차이며 이는 SEO-LOCALE-AUDIT.md에서 다룬다.

## 3. 로케일 라우팅 이중 구조 — 조사 완료, 문제 아님

`app/[locale]/`(실질 다국어 허브) vs `app/en-us/`·`app/ja-jp/`·`app/zh-cn/`
(noindex + redirect 스텁, 옛 URL 스킴 호환용 죽은 코드) vs `app/ja/`
(`tokushoho` 전용 리터럴 세그먼트, 경로 겹침 없음). sitemap도 죽은 스텁 3개를
참조하지 않는다. **canonical/중복 콘텐츠 충돌 없음.** `en-us/ja-jp/zh-cn` 3개
폴더는 정리 후보(P3, 범위 밖 — 삭제하지 않음).

## 4. `useT`/`useTPick` 오용 점검 — 실측, 라이브 버그 없음

`useT(` 실제 호출부는 코드베이스 전체에서 8곳뿐이며 전부 `useT()`(네임스페이스
없이 코어 사전만 사용) 형태다. `ko.json`에 없는 네임스페이스(`featureMarketing.*`
등)를 다루는 유일한 파일 `app/components/FeatureMarketingDetailModal.tsx`는
이미 `useTPick`으로 정확히 우회하고 있다(주석에 이유 명시, 419번 줄의 `useT()`는
별개의 코어 텍스트용). **"useT가 ko를 비운다"는 알려진 함정이 실제로 발현되는
호출부는 현재 없다.**

## 5. 이번 세션 코드 수정

**없음.** 스팟체크한 범위 안에서 실제로 깨진 canonical/hreflang/robots/useT
버그를 찾지 못했다. CLAUDE.md 코딩 원칙(가짜 완료 금지, 실측 기반 보고)에 따라
억지로 코드를 바꾸지 않았다.

## 6. 후속 세션 과제 (P1~P3, 우선순위순)

- **P1 — zh-TW 번역 공백 4곳**: saju, astrology, vedic, tarot (SEO-LOCALE-AUDIT.md 참고)
- **P1 — compatibility 로케일 미대응**: en/ja/zh/zh-TW 전부 없음. 궁합은 검색
  의도가 뚜렷한 토픽이라 우선순위 있는 콘텐츠 저작 대상.
- **P1 — 로케일 소개 페이지 콘텐츠 깊이 비대칭**: `/saju`(ko, `SeoLandingTemplate`)는
  H1+H2 6개+FAQ 4문항으로 풍부하지만 `/en/saju`(`PublicFeatureIntroduction`)는
  섹션 2~3개+FAQ 1문항으로 훨씬 얇다. 로케일 간 신뢰 신호(E-E-A-T) 격차.
- **P2 — sitemap 중복 제출**: 통합 `sitemap.xml` vs 로케일별 5개 sitemap 동시 제출 정리.
- **P3 — 죽은 리다이렉트 스텁 정리**: `app/en-us/`, `app/ja-jp/`, `app/zh-cn/`.
- 요청 원문의 나머지(전체 route 자동 목록화, LCP/CLS/INP 실측, structured data
  전수 검사, 경쟁사 SERP 조사, 내부링크 재설계, E-E-A-T 페이지 신설, sitemap
  index 재설계)는 이번 세션에서 아예 손대지 않았다 — 별도 세션에서 범위를 다시
  좁혀 진행 권장.
