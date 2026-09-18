---
status: done
updated: 2026-09-18
next: P9 완료. 다음은 docs/handoff/2026-09-18-seo-p10-next-item.md 참고.
---

# SEO 개편 요청 — P9: 내부링크 재설계 + E-E-A-T 강화 (완료)

## 왜

`docs/handoff/2026-09-18-seo-p8-next-item.md`의 "남은 4개" 중 "허브
콘텐츠 재작성"에 이어, 사용자가 "내부링크 재설계, E-E-A-T 강화
진행해줘"로 두 항목을 함께 지정했다. 커밋 `bc1cbac49`.

## 완료 내용

- 내부링크 재설계: `lib/seo-landing-pages.js`의 `relatedServices`
  배열에서 누락된 연결을 보강했다. `sections.paragraphs`는 순수
  문자열이라 본문 안에 링크를 넣을 수 있는 구조가 아님을 먼저
  확인했고(`SeoLandingTemplate.jsx` 339~346행), 그래서 본문 링크가
  아니라 `relatedServices` 배열만 고쳤다(라우팅·URL 변경 없음, GREEN).
  - saju → sukuyo·vedic·astrology 추가(기존엔 ziwei만 있었음)
  - sajuCompatibility → sukuyo/compatibility 추가
  - ziwei → astrology 추가
  - sukuyo → ziwei·astrology 추가
  - astrology·vedic은 이미 네 체계(ziwei/vedic/sukuyo/astrology)를
    상호 링크하고 있어 수정하지 않음.
- E-E-A-T 강화: 이미 인사이트·가이드 지면에서 쓰이던
  `ContentIntegrityNote`(제작·검수 안내, 편집정책/방법론/문의 링크,
  `app/components/ContentIntegrityNote.jsx`)를 새로 만들지 않고
  `SeoLandingTemplate.jsx`에 연결해 SEO 허브 19개 전 페이지(6개
  주요 허브 + 하위 궁합 페이지 포함)에 노출했다.
  `contentSource` 기본값 `"template"`을 그대로 써 사람이 개별
  검수했다는 과장 없이, 편집팀이 정한 규칙으로 자동 구성했다는
  사실만 정직하게 밝힌다(`CONTENT_REVIEWS`가 빈 객체라 검수자 표시는
  항상 "전문가 개별 검수 확인 전"으로 뜬다 — 실제 검수 기록이 생기기
  전까지는 이대로 둔다).
- 검증: `npm run check:fast` 통과(jest 281 suites/3959 tests),
  `npm run verify:sitemap-drift` 직접 재확인 OK, 대상 파일
  `npx eslint` 클린. `sitemap:generate`로 lastmod 원장만 갱신(URL
  집합 변화 없어 sitemap.xml 자체는 불변).

## 남은 것

- Core Web Vitals 실측 (원 요청 22개 중 마지막 1개) — 다음 문서 참고:
  [2026-09-18-seo-p10-next-item.md](2026-09-18-seo-p10-next-item.md)

## 참고

- 원 요청 22개 전체 목록·완료 이력: [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- P8 결과물: [2026-09-18-seo-p8-next-item.md](2026-09-18-seo-p8-next-item.md), 커밋 `50b9676f0`.
- P9 결과물: 본 문서, 커밋 `bc1cbac49`.
