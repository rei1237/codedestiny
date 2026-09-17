---
status: active
updated: 2026-09-17
next: zh-TW 4개 허브 전부 완료. 다음은 P1 나머지(compatibility 다국어화, 소개 페이지 콘텐츠 보강) 중 택1
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

- [x] **P1 — zh-TW 번역 4개 허브 전부(saju, vedic, astrology, tarot)**:
      `ea3417fb6`, `70302613b`(2026-09-17)로 완료·push됨. 우선순위는 트래픽
      근거 없이 사용자 지시로 순서 없이 전부 진행 —
      `docs/handoff/2026-09-17-zh-tw-priority-followup.md` 참고.
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

zh-TW 4개 허브 배포 후 실제 트래픽 반응 — 이 세션에서는 배포 직후라 실측 불가,
후속 확인은 GSC 접근이 생기는 시점에.
