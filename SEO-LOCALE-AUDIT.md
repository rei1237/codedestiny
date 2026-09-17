# 로케일·번역 SEO 감사 (2026-09-17, 1차 세션 — P0 범위)

> SEO-AUDIT.md의 부속 문서. 로케일 커버리지 격차와 번역 인프라(`useT`/`useTPick`)
> 오용 여부만 다룬다. 실제 번역 콘텐츠 저작은 이 세션의 범위 밖(P1, 후속 세션).

## 1. `useT` vs `useTPick` 오용 전수 점검 — 라이브 버그 없음

**방법**: `useT\(` 전수 grep(테스트 포함).

**실제 호출부 (8곳, 전부 네임스페이스 없이 코어 사전만 사용):**

| 파일 | 호출 형태 |
|---|---|
| `app/global-error.tsx:103` | `useT()` |
| `app/components/WithdrawModal.jsx:67` | `useT()` |
| `app/error.tsx:14` | `useT()` |
| `app/components/PaidValueSection.tsx:33` | `useT()` |
| `app/components/FeatureMarketingDetailModal.tsx:419` | `useT()` |
| `app/components/DeliverableSpec.tsx:40` | `useT()` |

테스트 가드도 이 패턴을 강제한다: `__tests__/ui/fortune-tea-house-i18n.static.test.js`는
`useT(`을 아예 금지(`useTeaHouseCopy` 강제), `__tests__/ui/withdraw-modal.static.test.js`는
정확히 `const t = useT()` 형태만 허용.

**위험 후보로 지목됐던 파일 확인**: `FeatureMarketingDetailModal.tsx`는
`ko.json`에 없는 `featureMarketing.*`/`featureMarketingCategory.*`/
`featureMarketingTrust.*` 조회에 **전부 `useTPick`**(370번 줄, `pick`으로 별칭)을
쓰고, 419번 줄의 `useT()`는 별개의 코어 UI 텍스트에만 쓴다. 193~194번 줄에 이유가
코드 주석으로 명시돼 있다("useT가 아니라 useTPick을 쓴다 — ko.json에는
featureMarketing 네임스페이스가 아예 없다").

**결론: "소스=ko, 소비=useT" 위험 조합이 실제로 발현되는 곳은 현재 없다.**
이번 세션에서 수정할 코드가 없었다.

## 2. zh-TW 커버리지 격차 (실측)

7개 대표 허브 curl 상태 코드(2026-09-17):

| 허브 | zh-TW 상태 |
|---|---|
| saju | **404** |
| astrology | **404** |
| vedic | **404** |
| tarot | **404** |
| ziwei | 200 |
| sukuyo | 200 |
| today | 200 |
| compatibility | 404 (en/ja/zh도 전부 404 — zh-TW만의 문제 아님) |

**패턴**: zh-TW sitemap은 111개 URL로 별도 존재하고 `SEO_INDEXABLE_LOCALES`에도
포함돼 있어 인프라 자체는 zh-TW를 완전한 로케일로 취급한다. 그런데 saju/astrology/
vedic/tarot 4개 핵심 허브는 zh-TW 페이지가 아예 없다(404) — **번역 콘텐츠 저작
누락**이지 라우팅·메타데이터 코드의 버그가 아니다. `generatePageMetadata()`는
없는 라우트를 hreflang에 넣지 않게 설계돼 있어(SEO-AUDIT.md §2), 이 격차가 깨진
링크로 새어나가지는 않는다 — 다만 검색 노출 기회 자체가 그만큼 비어 있다.

**후속 세션 우선순위(P1)**: zh-TW 사용자가 실제로 많이 찾는 순서가 확인되지 않았으므로,
번역 저작 순서는 트래픽/검색량 데이터가 있는 후속 세션에서 다시 정하는 것을
권장한다(임의로 saju부터 하지 않음 — 코딩 원칙 1: 가정을 드러낸다).

## 3. `compatibility` 허브 — 로케일 자체가 없음

en/ja/zh/zh-TW 전부 404, ko만 존재. hreflang 태그도 아예 생성되지 않는다(정상 —
없는 번역을 향한 가짜 alternates를 만들지 않는 설계). "궁합"은 검색 의도가
뚜렷한 상업적 조사성 토픽이라, 다국어 확장 시 우선순위 있는 후보로 기록해 둔다(P1).

## 4. ko.json이 en/ja/zh보다 절반 크기인 현상 — 설계상 정상으로 확인됨

`public/i18n/ko.json`(519KB) vs en/ja/zh(약 1MB). 원인은 버그가 아니라 **한국어가
많은 네임스페이스에서 UI 컴포넌트 안에 하드코딩된 소스 원문**이기 때문이다
(`featureMarketing.*`가 대표 사례 — ko.json에 항목이 아예 없고 컴포넌트가
`useTPick`으로 원문을 그대로 통과시킨다). en/ja/zh는 그 원문을 사전 파일로
번역해 채워야 하므로 사전이 더 크다. **다만 이 설계 때문에 "ko 사전에 키가 없다"는
사실만으로는 번역 누락 여부를 판단할 수 없다** — `useT`(있으면 없어짐) vs
`useTPick`(있으면 원문 유지) 어느 쪽으로 소비되는지를 함께 봐야 하며, 이번
세션에서 그 확인(§1)까지 마쳤다.

## 5. 로케일 소개 페이지 콘텐츠 깊이 비대칭 (P1, 코드 수정 아님)

`/saju`(ko)는 `SeoLandingTemplate` 기반으로 H1 + H2 섹션 다수 + FAQ 여러 문항의
풍부한 구조인 반면, `/en/saju`·`/ja/saju` 등은 `PublicFeatureIntroduction`
컴포넌트 기반으로 섹션 2~4개 + FAQ **정확히 1문항**(`INTRO_UI[locale]`에
질문·답변이 하나로 고정된 구조, `app/components/PublicFeatureIntroduction.jsx:16`)
으로 상당히 얇다. 이는 번역 누락이 아니라 애초에 다른 템플릿을 쓰도록 설계된
것 — 로케일 간 E-E-A-T/콘텐츠 깊이 신호 격차로, 콘텐츠 저작이 필요한 P1 과제다.

## 6. 이번 세션 결론

- 코드 수정 없음(버그를 찾지 못함).
- 번역 인프라(`useT`/`useTPick`)는 이미 안전하게 사용되고 있음 — 확인 완료.
- 실제 격차는 전부 "아직 만들지 않은 콘텐츠"이며, SEO-AUDIT.md §6의 후속 과제
  목록으로 넘긴다.
