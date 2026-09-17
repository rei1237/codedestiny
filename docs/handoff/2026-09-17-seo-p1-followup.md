---
status: active
updated: 2026-09-17
next: zh-TW 번역 우선순위(트래픽 근거) 정하고 saju부터 착수할지 사용자에게 확인
---

# SEO 개편 요청 — P1 이후 (P0는 완료)

## 왜

22개 섹션짜리 전체 SEO 개편 요청. 1차 세션은 사용자 승인으로 "P0 감사+긴급수정"만
수행. 나머지는 후속 세션 과제로 명시적으로 남김.

## 지금 상태

- `873bdf254` (main) — `SEO-AUDIT.md`, `SEO-LOCALE-AUDIT.md` 커밋 완료.
- P0 스팟체크 결과 canonical/hreflang/useT 오용 등 **실제 버그는 하나도 못 찾음**
  → 코드 수정 없음. 두 문서가 정본, 여기서 과정 반복 안 함.

## 남은 작업

- [ ] **P1 — zh-TW 번역 4개 허브**: saju, astrology, vedic, tarot (`SEO-LOCALE-AUDIT.md §2`).
      순서는 트래픽/검색량 데이터로 정할 것 — 임의로 saju부터 하지 않는다.
- [ ] **P1 — compatibility 다국어화**: en/ja/zh/zh-TW 전부 없음(ko만 존재).
- [ ] **P1 — 로케일 소개 페이지 콘텐츠 얕음**: `PublicFeatureIntroduction` 기반
      페이지(FAQ 1문항 고정)를 `/saju`(ko, `SeoLandingTemplate`) 수준으로 보강할지 결정.
- [ ] **P2 — sitemap 중복 제출**: `sitemap.xml`(통합, 1265) vs 로케일별 5개가 동시
      제출됨. index로 바꿀지 통합본을 뺄지 결정 필요.
- [ ] **P3 — 죽은 리다이렉트 스텁 정리**: `app/en-us/`, `app/ja-jp/`, `app/zh-cn/`
      (옛 URL 스킴 호환용, sitemap 미참조 — 삭제 전 코딩 원칙 9 3면 확인).
- [ ] 원 요청 22개 항목 중 미착수: `SEO-KEYWORD-MAP.md`, `SEO-CHANGELOG.md`,
      허브 콘텐츠 재작성, 내부링크 재설계, structured data 확장, E-E-A-T 강화,
      경쟁사 SERP 조사, Core Web Vitals 실측.

## 정본 예시

- `SEO-AUDIT.md` — 인프라·canonical/hreflang 실측 전체.
- `SEO-LOCALE-AUDIT.md` — 로케일 격차·`useT`/`useTPick` grep 결과 전체.
- `lib/generate-page-metadata.ts:88` — `HreflangPathMap`에 `zh-TW` 누락 시 위험 경고 주석.
- `app/components/PublicFeatureIntroduction.jsx:16` — FAQ 1문항 고정 구조.

## 함정

- React SSR은 `hreflang`을 `hrefLang`(camelCase)로 렌더링 — grep은 대소문자 무관으로.
- `curl`은 `-L` 필수(확장자 없는 경로가 308로 trailing-slash 리다이렉트).
- WebFetch는 `<head>` 태그(canonical/hreflang) 추출이 불안정 — curl+grep으로 직접 확인.
- ko.json이 작은 것 자체는 버그 아님(`useTPick` 소비 시 정상) — [[locale-i18n-pitfalls]] 참고.

## 검증

```
npm run check:fast   # 코드 수정 시
```
번역 콘텐츠 저작은 검증 스크립트 없음 — production curl 재확인이 유일한 실측 수단.

## 모르는 것

zh-TW 4개 허브 중 어디부터 번역할지(실제 검색량/트래픽 데이터 없음) — 사용자에게 물을 것.
