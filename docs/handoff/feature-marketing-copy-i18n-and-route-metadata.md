---
status: blocked
updated: 2026-08-23
next: "남은 것 3(vi·hi·es·fr·de·nl·ms 실번역)은 사용자가 \"나중에 일괄\"로 미뤘다 — 착수 전 확인"
---

# 마케팅 타일 팝업(FEATURE_MARKETING_COPY) 다국어화 + 라우트 메타데이터 로케일 동기화 (2026-08-23)

## 🔴 현재 상태 (2026-08-23 갱신 — 아래 "머지 순서" 절은 역사 기록이다)

**아래 "머지 순서" 절의 9개 PR(#995·#1000~#1005·#1008·#996)은 전부 머지됐다.** 스택은 자식부터(#1008 → #1000) 머지된 뒤 #995 가 `main` 으로 들어갔고, 브랜치는 삭제됐다. 그 절을 지금 지시로 읽지 말 것.

이어서 진행된 것:

| 항목 | 상태 |
|---|---|
| 남은 것 1 — React `FeatureMarketingDetailModal.tsx` | **PR #1009 로 완료** (셸 키 재사용 + 신규 148키, en/ja/zh 실번역 · 나머지 7개는 영어) |
| 남은 것 2 — `app/premium-unlock/page.tsx` | **PR #1010 으로 완료** (en/ja/zh 신규 작성 + `RouteMetadataLocaleSync` 배선) |
| 남은 것 3 — vi/hi/es/fr/de/nl/ms 실번역 | **미착수 — 이것만 남았다** (사용자가 "나중에 일괄"로 계획) |
| 남은 것 4 — 미확인 18번째 라우트 | **없었다.** 계수 착오 — 배선 완료 목록이 10개가 아니라 11개(`app/maya/page.tsx` 포함)라 18개가 전부 설명된다 |

## 배경

전체 세션 목표는 "Code Destiny 전체를 실제 글로벌 서비스 수준으로 다국어 완성"(`docs/handoff/global-i18n-audit-remaining.md`가 다루는 Wave 0~9와 같은 상위 프로젝트). 이 문서는 그 프로젝트의 두 갈래 — ① 정적 셸(`index.html`)의 타일 클릭 미리보기 팝업이 쓰는 `FEATURE_MARKETING_COPY`(65개 실제 상품 + 30개 별칭 + 9개 카테고리 템플릿) ② 18개 라우트 파일의 사장돼 있던 4개 언어 `<title>`/`<meta description>` — 만 다룬다. `global-i18n-audit-remaining.md`가 다루는 "Wave 7"(React 클라이언트 컴포넌트의 alt/aria/title) 작업과는 **완전히 별개 파일·별개 PR 체인**이니 혼동하지 말 것.

사용자 지시(원문): "한국어로 안내해주고 그냥 영어, 일본어, 중국어로 다 진행해주면 될것 같긴해 모든 경로 빼놓지 않고 남는 언어들은 영어로 일단 채워놓고 나중에 일괄적으로 나머지 작업을 할 수 있도록 하자" — en/ja/zh-CN/zh-TW는 실번역, 나머지 7개 로케일(vi/hi/es/fr/de/nl/ms)은 지금은 영어로 채우고 **나중에 일괄로 마저 번역**하라는 명시적 계획.

## 🔴 머지 순서 — 반드시 이 순서를 지킬 것

두 갈래는 서로 독립적이지만, ①번 갈래(마케팅 팝업) 내부는 **8개 PR이 전부 순차 스택**(각 PR이 앞 PR의 브랜치에서 분기)돼 있다. 뒤 PR은 앞 PR의 커밋을 포함하므로, **앞 PR을 머지하지 않은 채 뒤 PR을 먼저 머지하면 안 된다** — GitHub이 자동으로 막지 않고 diff가 꼬인다.

```
main
 └─ #995  feat/feature-marketing-copy-i18n-infra              (인프라 + 9개 카테고리 템플릿)
     └─ #1000 feat/feature-marketing-copy-products-batch1     (7개 상품: 자미두수/작전실/작명/숙요/점성술/카르마/베다 등 최상위 상담)
         └─ #1001 batch2                                      (10개: destiny-island, 꽃 스튜디오 4종, flower-fc, 명상, 손금, 타로 2종)
             └─ #1002 batch3                                  (10개: 타로 관계/재회/연간, 연애시뮬, 최애운명, 해몽, 오라클, 리포트 3종)
                 └─ #1003 batch4                               (10개: 동물테스트, 오라클 계열 6종, 명상, 요가, 인생의 책)
                     └─ #1004 batch5                            (10개: 인생총운, 연애비책, 초융합, 인연장소, 리포트 5종)
                         └─ #1005 batch6                         (10개: 무료 카드 4종, 신년운세, 시빌라, 수호신, 자미두수 기본/심화, 서양점성술)
                             └─ #1008 batch7 [최종]               (8개: 베다점성술 기본, 마스터러브코덱스 본인/궁합, 자미두수 심층PDF, 나크샤트라 3종, 베다궁합확장)
```

**머지 절차**: `#995 → #1000 → #1001 → #1002 → #1003 → #1004 → #1005 → #1008` 순서로 **하나씩** 머지한다(각 PR이 머지되면 GitHub이 다음 PR의 base를 자동으로 `main`으로 재타게팅하지 않으므로, 순서대로 머지하면 다음 PR의 diff가 자동으로 좁아진다 — 중간을 건너뛰면 뒤 PR에 앞 PR의 diff가 전부 섞여 보인다). 다른 세션이 병렬로 이 8개 중 일부만 골라 머지하지 않도록 주의.

②번 갈래(`PR #996` `feat/route-metadata-locale-wiring`)는 `main`에서 독립적으로 분기했고 위 8개와 파일이 겹치지 않는다(확인: `gh pr diff <n> --name-only` 대조 완료) — **어느 순서에 머지해도 무방**.

현재 PR 상태(전부 `OPEN`, 아직 아무것도 안 머지됨):
| PR | 브랜치 | base | 내용 |
|---|---|---|---|
| #995 | `feat/feature-marketing-copy-i18n-infra` | `main` | `_localizeMarketingCopy` 등 인프라 + 9개 카테고리 템플릿 |
| #1000 | `feat/feature-marketing-copy-products-batch1` | `feat/feature-marketing-copy-i18n-infra` | 7개 상품 |
| #1001 | `feat/feature-marketing-copy-products-batch2` | `feat/feature-marketing-copy-products-batch1` | 10개 상품 |
| #1002 | `feat/feature-marketing-copy-products-batch3` | `feat/feature-marketing-copy-products-batch2` | 10개 상품 |
| #1003 | `feat/feature-marketing-copy-products-batch4` | `feat/feature-marketing-copy-products-batch3` | 10개 상품 |
| #1004 | `feat/feature-marketing-copy-products-batch5` | `feat/feature-marketing-copy-products-batch4` | 10개 상품 |
| #1005 | `feat/feature-marketing-copy-products-batch6` | `feat/feature-marketing-copy-products-batch5` | 10개 상품 |
| #1008 | `feat/feature-marketing-copy-products-batch7` | `feat/feature-marketing-copy-products-batch6` | 8개 상품 (최종) |
| #996 | `feat/route-metadata-locale-wiring` | `main` | 10개 라우트 파일 메타데이터 로케일 동기화 (독립) |

## ① 완료 — FEATURE_MARKETING_COPY 65개 실제 상품 전부 완료

`index.html`의 `FEATURE_MARKETING_COPY`/`FEATURE_MARKETING_TEMPLATES`가 구동하는 타일 클릭 미리보기 팝업(React `FeatureMarketingDetailModal.tsx`의 벤더 JS 버전, 별개 컴포넌트 — 아래 "남은 것 1" 참고)을 로케일화했다.

- **정본 아키텍처**: `_localizeMarketingCopy(merged, templateId, copyKey)`(index.html, `_resolvePreviewData` 마지막에서 호출)가 `tagline/feats/premiumIntro/premiumAudience/premiumChapters/premiumOutcomes/answersQuestions/valueCompare/faq/analysisSteps/fallbackCta/ctaNote/fallbackTitle` 필드를 `featureMarketing.<safeKey>.*` 네임스페이스로 조회한다. `_pvwSafeKey(rawKey)`가 라우트 경로나 액션명을 안전한 사전 키로 변환(`/neo-operation-room` → `neo_operation_room`).
- **ko 누출 방지 가드**: `_pvwTrKeep(key,value)`는 `value`가 non-empty 문자열이 아니면 조회 자체를 건너뛴다 — 안 그러면 `window.cdTranslate`의 ko 분기(`typeof fallback==='string'?...:key`)가 빈 필드에서 원시 키 문자열("featureMarketing.xxx.yyy")을 화면에 그대로 노출시킨다. 새 필드를 추가할 때 반드시 `_pvwTr` 대신 이 래퍼를 쓸 것.
- **카테고리 맵**: `_MARKETING_CATEGORY_KEY_BY_KO`(index.html)가 한국어 카테고리명 → 안전 키를 매핑한다. 이번 세션에 9개(`작명/naming`·`명상/meditation`·`꿈 상징/dream`·`요가/yoga`·`인생 명리/life`·`연애 명리/love`·`초융합/fusion`·`신년운세/newyear`·`시빌라 시스템/sibyl`·`사주 수호신/guardian`·`자미두수 심화/ziweideep`·`서양 점성술/westernastro`·`베다 점성술/vedicastro` — 정확히는 13개)를 새로 추가했다. **새 상품을 추가할 때 이 맵에 카테고리가 없으면 조용히 undefined가 되어 배지가 안 보일 뿐 에러는 안 나므로**, 신규 카테고리 문자열을 만들 때마다 이 맵부터 확인할 것.
- **7개 EN-폴백 로케일**(`vi/hi/es/fr/de/nl/ms`)은 지금 전부 **영어 텍스트를 그대로 복사**해 뒀다 — 사용자의 명시적 계획대로 "나중에 일괄 번역" 대상이다. 이 7개는 진짜 번역이 아니라는 걸 다음 세션이 헷갈리지 않게 표시해 둔다.
- **별칭(alias) 30개**(`{inherit:'otherKey'}` 형태로 다른 상품의 카피를 그대로 쓰는 항목)는 **별도 작업이 필요 없다** — 대상 키(`otherKey`)가 이미 번역돼 있으면 별칭도 자동으로 번역된 카피를 받는다. 65개 실제 항목만 번역하면 전체 95개 키가 커버된다.

### 검증(매 배치 공통, 전부 통과)
- `node scripts/verify-entry-encoding.mjs -- --strict-core`
- `vm.Script` 기반 구문 검사(수정된 `index.html` 영역만 추출해 파싱 — 전체 파일 스캔은 "한국어 주석 속 `<script>` 문자열"에 오탐되므로 이 방식을 씀)
- `npm run verify:i18n-ko-coverage` / `npm run verify:i18n-runtime`(11개 로케일 JSON parity) / `npm run verify:i18n-no-fallback`
- 매 배치 새 키에 대한 수동 `valueAtPath` 시뮬레이션(`cdTranslate`의 실제 조회 로직을 그대로 복제해 4개 로케일 + 1개 EN-폴백 로케일에서 값이 기대대로 나오는지 확인, 빈 필드가 `undefined`로 남는지도 확인)

**🔴 알려진 비차단 경고**: `verify:i18n-no-fallback`의 B수치(한국어 fallback 인자)가 기준선 181 대비 +11 — 이건 **PR #995(인프라)가 도입한 `_pvwTr`/`_pvwTrKeep` 호출 자체에서 온 것이고, 이후 batch1~7 어느 것도 이 수치를 더 늘리지 않았다**(전 배치에서 동일하게 192로 고정 관찰됨). 이 스크립트는 소프트 래칫(`--strict`/`I18N_RATCHET=on` 없이는 경고만, CI 안 막음)이라 배포를 막지 않는다. 원인 추적은 `docs/handoff/global-i18n-audit-remaining.md`의 "남은 것 4"가 이미 트래킹 중인 별개 항목이다.

## ② 완료 — 10개 라우트 파일 메타데이터 로케일 동기화 (PR #996)

18개 라우트 파일이 이미 `ko/en/ja/zh` 4개 언어 메타데이터 객체를 갖고 있었는데 `generateMetadata()`가 항상 `.ko`만 읽던 문제. `middleware` 없이는 서버 컴포넌트가 방문자 로케일을 알 수 없어(1) `cookies()` 강제 동적 렌더링(캐싱 비용) 또는 (2) 클라이언트 사후 패치 중 (2)를 선택 — 신규 컴포넌트 `app/components/RouteMetadataLocaleSync.tsx`가 `LocaleRuntimeBridge`와 같은 `cd:locale-ready`/`cd:locale-change` 이벤트를 듣고 하이드레이션 후 `document.title`/`<meta name="description">`만 패치한다. SSR/크롤러가 보는 메타데이터는 그대로 한국어로 안전하게 유지(hreflang/canonical 불일치 위험 회피, 이 레포의 과거 사고 이력과 같은 급).

**10개 파일 완료**: `app/psychotest/page.tsx`, `app/ziwei/chart/page.tsx`, `app/tarot/self-esteem/page.tsx`, `app/tarot/healing/page.tsx`, `app/saju/sibyl/page.tsx`, `app/saju/destiny-meeting-place/page.tsx`, `app/saju-fpti/page.tsx`, `app/palm-reading/page.tsx`, `app/oracle/sikojen-povailu/page.tsx`, `app/oracle/royal-tea/page.tsx`, `app/maya/page.tsx`.

**8개 제외(이유 문서화됨, PR #996 본문 참고)**:
- 즉시 `redirect()`하는 라우트 5개(`tarot/healing/start`, `saju/basic/play`, `oracle/sikojen-povailu/play`, `oracle/hwatu-life/play`, `oracle/ifa`) — DOM이 안 그려져 동기화할 대상이 없음.
- `app/psychotest/[slug]/page.tsx` — `robots:{index:false}`이고 본문이 100% 하드코딩 한국어라, 탭 제목만 번역하면 오히려 "반쪽 번역" 불일치를 만듦.
- **`app/premium-unlock/page.tsx`는 아예 손 안 댐** — 이 파일의 `_METADATA_COPY`는 다른 17개와 달리 **애초에 비-한국어 번역이 하나도 없다**(다른 10개는 "번역은 있는데 배선만 안 됨"이었지만 이건 "번역 자체가 없음"). 별도 신규 번역 작업이 선행돼야 함(아래 "남은 것 2" 참고).
- 나머지 라우트는 조사 범위 밖(18개 중 명시적으로 다룬 건 위 항목들 합 17개 — 1개는 이번 조사에서 언급 안 됨, 다음 세션이 재확인 필요할 수 있음).

## 남은 것

### 1. ✅ React `FeatureMarketingDetailModal.tsx` — PR #1009 로 완료

이 문서의 추측대로 **셸 데이터의 사본이 맞았다.** 실측(2026-08-23): 481개 leaf 문자열 중 **344개가 셸과 바이트 단위로 동일**해서, 문서의 제안대로 `featureMarketing.*` 키를 재사용하고 **신규 키는 148개**만 만들었다(`badge`·`headline` 17 / `sampleReport.*` 56 / `resultPreview.*` 45 / 문구가 갈린 `hub*` 9 / `preview.*` 팝업 라벨 11).

**다음 세션이 알아야 할 함정 두 가지:**

- 🔴 **`useT` 를 쓰면 ko 로케일이 깨진다.** `ko.json` 에는 `featureMarketing` 네임스페이스가 **아예 없다**(한국어는 소스가 정본). `lib/i18n/dictionary.ts` 의 `resolveKey` 는 키가 없으면 한국어 원문이 아니라 `MISSING_TEXT`("번역을 준비 중입니다")를 돌려주므로, 모달이 통째로 그 문구로 덮인다. 그래서 셸의 `_pvwTrKeep` 과 같은 계약(값 없으면 원문 유지)을 주는 **`useTPick` 을 `lib/i18n/useT.ts` 에 새로 만들었다.** 같은 성질의 데이터(소스가 ko 정본인 네임스페이스)를 React 로 옮길 때는 이걸 쓸 것.
- 🔴 **카테고리 카피와 상품(explicit) 카피는 각자의 네임스페이스로 따로 로케일화한 뒤 합쳐야 한다.** 합친 뒤 한 네임스페이스로 조회하면, explicit 사전에 없는 필드를 카테고리 값에 대고 찾다가 **남의 상품 번역이 붙는다.**

회귀 가드: `__tests__/ui/feature-marketing-modal-i18n.static.test.js`(`test:node` 에 이미 배선된 경로). 소스에서 카피 객체를 중괄호 균형으로 잘라 내 11개 로케일 전부에서 조회를 시뮬레이션하고, 키 누락·한국어 잔존을 실패시킨다. 음성 테스트로 fail-closed 확인 완료.

### 2. ✅ `app/premium-unlock/page.tsx`의 `_METADATA_COPY` — PR #1010 으로 완료

en/ja/zh 카피를 새로 쓰고 `RouteMetadataLocaleSync` 를 붙였다. 서버 렌더 메타데이터와 OG 는 #996 의 계약대로 한국어를 유지한다.

### 3. 🔴 7개 EN-폴백 로케일의 실번역 (vi/hi/es/fr/de/nl/ms) — **이것만 남았다**

`public/i18n/{vi,hi,es,fr,de,nl,ms}.json`의 `featureMarketing.*`/`featureMarketingCategory.*`/`featureMarketingTrust.*` 네임스페이스 전체(9개 템플릿 + 65개 실제 상품 + 13개 카테고리, **PR #1009 가 더한 148키 포함**)가 지금 영어 텍스트를 그대로 복사한 상태다. PR #1010 이 붙인 `/premium-unlock` 라우트 메타데이터도 같은 성질이다(`RouteMetadataLocaleSync` 의 `pickEntry` 가 이 7개 로케일에 `entries.en` 을 준다 — 이쪽은 사전이 아니라 라우트 파일에 로케일을 추가해야 한다). 사용자가 명시적으로 "지금은 영어로 채우고 나중에 일괄 번역"을 지시했으므로 이번 세션에서는 손대지 않았다 — **사용자가 "이제 나머지 언어 번역해줘"라고 명시할 때 착수**. 전체 en.json의 해당 네임스페이스를 원본으로 삼아 6개 언어(vi/hi/es/fr/de/nl/ms)를 병렬로 번역하는 것이 가장 효율적일 것(각 언어가 독립이라 배치 병렬화 가능).

### 4. ✅ 남은 8번째 라우트 — 그런 라우트는 없었다 (계수 착오)

2026-08-23 재실측: `git grep -ln "_METADATA_COPY" -- 'app/**/*.tsx'` 는 정확히 18개를 돌려주고, 18개가 전부 설명된다 — **배선 완료 목록이 10개가 아니라 11개다**(위 ② 절이 "10개 파일 완료"라고 적었지만 실제로 나열된 파일은 `app/maya/page.tsx` 를 포함해 11개다). 계산: 배선 11 + `redirect()` 5 + `psychotest/[slug]` 1 + `premium-unlock` 1 = 18. 다음 세션은 이 항목을 다시 조사하지 말 것.

## 검증 명령 모음 (재현용)

```bash
# index.html 수정 영역 구문 검사 (batch 번호만 바꿔가며 반복 사용)
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('var FEATURE_MARKETING_COPY=');
const end = html.indexOf('function _resolvePreviewData', start);
const chunkEnd = html.indexOf('_localizeMarketingCopy(merged', end);
const findEnd = html.indexOf('function _open(', chunkEnd);
const code = html.slice(start, findEnd);
new (require('vm').Script)('(function(){' + code + '\n})');
console.log('SYNTAX OK');
"

node scripts/verify-entry-encoding.mjs -- --strict-core
npm run verify:i18n-ko-coverage
npm run verify:i18n-runtime
npm run verify:i18n-no-fallback
```

## 이번 세션에서 배운 것 (다음에도 유효)

- **`_pvwTrKeep` 패턴은 필수다** — 빈 필드에 `_pvwTr`을 그냥 쓰면 ko 로케일에서 원시 키 문자열이 화면에 샌다(이 세션 시작 전에 이미 자체 발견·수정된 버그, 재발 방지용으로 기록).
- **카테고리 맵 갱신을 잊기 쉽다** — 새 상품을 배치에 넣을 때마다 그 상품의 한국어 카테고리 문자열이 `_MARKETING_CATEGORY_KEY_BY_KO`에 있는지 먼저 확인할 것. 이번 세션에서만 13개 신규 카테고리를 발견·추가했다(사전 조사 없이 진행했다면 배지가 조용히 비어 보였을 것).
- **`analysisSteps` 필드는 `label`+`detail` 두 개 서브필드**를 가질 수 있다(단순 `label`만 있는 경우도 있음, `/fusion-fortune`이 label-only, `master-love-codex` 계열이 label+detail 예시) — 병합 스크립트가 둘 다 옵셔널로 처리하도록 작성돼 있다.
- **PR 체이닝**: 같은 파일(`index.html`, `public/i18n/*.json`)을 건드리는 연속 작업은 매번 `main`에서 새로 분기하지 말고 앞 PR의 브랜치 위에 쌓을 것 — 이번 세션 8개 PR 전부 이 패턴.
