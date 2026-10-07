# 고민에서 시작하는 상담 · 2026-10-07

status: done

## 승인된 범위

사용자: "오케이 이렇게 수정을 깔끔한 UI/UX로 진행해주도록해줘"
추가: "주역점이라든지 이집트 점술 등 LLM 서비스가 아닌 저가 상품들은 그냥 천원 정도로 설정"

- 꿀꿀운세를 전체 브랜드로, 영냥이·연이·네오를 상담 경험으로 설명한다.
- 홈의 주 행동은 내 고민 상담하기. 체계·캐릭터·상세 상품 탐색은 기존 전체 탐색 안에 보존한다.
- 질문 상담은 질문 범위로 안내하고, 기존 성향 리포트 등급과 구분한다.
- 반복 구매 상품을 첫 상담에서 비교시키지 않는다. 이용권·월정석·단건 결제와 보관함 분리는 유지한다.
- 실제 비LLM 저가 결과 생성 경로를 확인한 상품만 1,000원으로 변경한다. 무료 기능과 LLM 상품, 기존 구매 스냅샷은 유지한다.

## 화면 계약과 정본

이번 변경은 기존 세계관 안에서 상담 진입 순서를 정리한다. 연이 정원의 로즈·크림 `--cdh-*`, 네오의 퍼플 계열, 영냥이의 밤·금색 `--yn-*`와 기존 캐릭터 자산을 유지한다. 전역 `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`의 세계관·토큰을 새로 정의하지 않는다. 정체성·용어는 `docs/context/design-canon.md`, 실제 색과 컴포넌트 동작은 각 소스가 정본이다.

| 화면 | 모드 | 유지할 계약 | 구현 정본 |
|---|---|---|---|
| 꿀꿀운세 홈 | Persuade | 첫 행동은 **내 고민 상담하기**. 오늘의 무료 운세와 모든 운세는 보조 링크로 둔다. 고민 → 범위·가격 → 답·근거·다음 행동 순서로 설명한다. | `templates/home-funnel.html`, `styles/concern-first-home.css` |
| 홈 이용권 안내 | Persuade | 첫 상담 전에 반복 구매 상품을 비교시키지 않고, 이용권 안내와 기존 확인 경로를 간결하게 노출한다. | 홈 템플릿의 `cdhPassSlot`, `.cdh-pass--simple` |
| 영냥이 질문 입력 | Operate | 질문과 현재 상황, 필요한 선택지·조건·기간을 먼저 받는다. 대상·장기 흐름·해석 체계 조정은 접힌 상세 설정에서 제공하며, 추천 범위·가격·추가 질문 수와 부족한 입력을 함께 보여준다. | `app/yeongnyangi/_components/QuestionScope.tsx`, `question-scope.module.css` |
| 영냥이 상품 안내 | Persuade | 질문 상담과 가상의 상담 예시를 먼저 보여준다. 생선별 전체 성향 리포트 비교는 **질문 없이 전체 성향 리포트 고르기**를 펼쳤을 때 노출한다. | `app/yeongnyangi/_components/ProductGuide.tsx`, `product-guide.module.css` |
| 고민 탐색과 연결 | Operate | 대표 고민과 직접 입력을 먼저 제공하고 더 많은 고민은 검색·분야 선택으로 찾는다. 질문 연결은 범위 확인 화면으로 이어진다. | `app/components/QuestionJourney.tsx`, `lib/fortune/question-journey.ts` |

- 홈의 실제 진입은 `app/page.js`에서 `/ggulggul/` 정적 셸 `index.html`로 연결된다. `public` 미러는 `npm run sync:public` 생성물이며 별도 디자인 정본으로 취급하지 않는다.
- 홈의 **모든 운세와 상담 둘러보기** 안에 전체 목록·검색과 영냥이·연이·네오의 기존 상담 경로를 보존한다. 접힌 영역의 기존 해시·딥링크와 검색 포커스 이동도 함께 유지한다.
- 질문 상담의 등급은 답의 품질이 아니라 질문 범위·대상·계산 필요성으로 설명한다. 가격은 `worker/yeongnyangi/payments/catalog.ts`, 추천과 추가 질문 한도는 `worker/yeongnyangi/fortune/ask/question-policy.ts`에서 읽는다.
- 필수 입력이 부족하거나 지원하지 않는 질문이면 계속하기를 비활성화한다. 기존 전체 성향 리포트로 가는 버튼은 질문 상담의 주 버튼보다 낮은 시각적 위계로 둔다. 상품 안내의 기존 리포트 링크는 `flow=legacy`를 유지한다.
- 모바일 360/390/430px와 데스크톱에서 가로 넘침·CTA 가림이 없어야 한다. 기존 해석 체계와 결제 복귀, 서비스별 구매 결과·보관함 분리도 유지한다.

## 비LLM 정적 상품 가격

- 승인된 신규 판매가 범위는 `__tests__/fixtures/static-reading-price-keys.cjs`의 **37개 키**다. 별칭을 포함한 키 수이며 37개 독립 서비스라는 뜻은 아니다.
- 가격 정본은 `worker/lib/paid-feature-registry.js`이며 해당 정적 상품을 1,000원으로 맞추고 각 클라이언트 가격 표시를 동기화한다. 이 문서의 숫자를 별도 가격 데이터로 사용하지 않는다.
- 기존 `scripts/sync-flower-price-copy.mjs`가 가격 배지뿐 아니라 `data-coin-cost`·`data-tile-lock-cost`·`data-price-krw`도 위 가격 정본에서 도출한다. 화면에 보이는 가격과 잠금·결제 진입에 쓰는 속성의 값이 같아야 한다. i18n `homeSimple-01`에는 `price1000`·`w1000`·`from9000` 가격 키를 보존한다.
- 기존 이용권·월정석·단건 결제 구조, 무료 기능, LLM 상품과 과거 주문·구매 권한의 가격 스냅샷은 유지한다. 가격 변경 범위는 새 판매이며 기존 구매를 다시 가격 매기지 않는다.
- 코드에 검증된 Google Play 1,000원 SKU가 없다. Play Console의 실제 등록 상태는 확인하지 않았다. `worker/lib/app-store-pricing.js`의 `APP_PAID_LOW_PRICE_FEATURE_KEYS`에 해당 유료 키를 유지해 앱 무료 구간으로 빠지지 않게 한다. 검증된 SKU가 없으면 앱 신규 판매는 503으로 차단한다. 앱 판매를 열려면 별도의 SKU 확인·등록·검증이 필요하다.

홈의 돈·진로 질문 링크는 비LLM 가격 인하와 별개다. 해당 `data-cd-price-key`는 `questionScopeEntry`가 실제 추천하는 연어(salmon) 상품의 9,000원 가격과 일치시킨다. `__tests__/ui/question-concerns.test.mjs`의 교차 화면 가드가 홈 질문 링크의 가격 키와 질문 화면의 추천 상품 키를 대조한다.

## 로컬 검증 근거와 한계

아래는 로컬 mock 화면 및 상호작용 확인이다. 운영 화면·운영 배포·실제 결제 검증을 의미하지 않는다.

PNG의 최종 보관 경로는 `C:/Users/user/.codex/visualizations/2026/10/07/01a116b6-9460-7d41-9f69-ac843acbbbcf/concern-first-ux/`다. 아래 8개 파일을 이 경로에 보관했으며, 워크트리의 `.impeccable/review/` 사본은 작업 종료 시 정리한다.

| 근거 | 확인 범위 |
|---|---|
| `home-360.png`, `home-mobile-390.png`, `home-430.png`, `home-1440.png` | 홈 360/390/430/1440px 캡처. 해당 폭에서 가로 넘침 없음. |
| `question-mobile-390.png`, `question-desktop.png` | 질문 입력 모바일·데스크톱. 아래 두 수정 후 같은 질문 화면으로 재검토. |
| `product-mobile-390.png`, `product-desktop.png` | 상품 안내 모바일·데스크톱. 질문 상담 우선 안내와 접힌 성향 리포트 비교. |
| 로컬 CUA 상호작용 | 모든 운세에서 검색 입력으로 포커스 이동. 이직 질문의 9,000원·추가 질문 1회 안내와 필수 입력 완료 후 계속하기 활성화. 기존 상품 펼치기 및 `flow=legacy` 연결. |

필수 PNG 8개를 확보했다. 독립 화면 검토의 최초 판정은 `fix`였으며, 지적한 두 항목은 질문 화면의 기존 리포트 보조 버튼 위계와 중복 kicker였다. 두 항목을 수정한 뒤 같은 질문 화면의 모바일·데스크톱 캡처를 재검토해 모두 `resolved`, 판정 `ship`을 받았다. 이 `ship`은 **두 수정의 시각적 해결 범위에 한정**하며 전체 서비스·결제·CI 통과를 뜻하지 않는다. 전용 reviewer/documenter preset이 없어 fresh 일반 에이전트로 역할을 수행했다.

로컬 `npm run check:fast -- --plan`과 `npm run check:fast`를 실행했다. 결제 스위트의 87개 명령과 Jest 348개 suite / 5,295개 test가 통과했다. Node 검사 2,964개 중 4개는 이전 홈 배치·상품 수 기대값 및 갱신 전 사이트맵 서명 때문에 실패했다. 기대값을 새 정보 구조에 맞추고 `npm run sitemap:generate` 후 해당 20개 검사를 다시 실행해 모두 통과했다. `npm run typecheck`, `npm run lint`도 통과했다. 수정 뒤 전체 로컬 스위트는 반복하지 않으며 통합 검증은 main CI에서 확정한다. 실제 결제·유료 LLM·운영 DB 쓰기는 수행하지 않았다.

## CI 가격 동기화 보강

`353d1948e`의 main CI에서 Typecheck/lint, Build, Critical, Paid Flow Gates는 통과했다. Static guards의 `verify:home-service-registry`는 홈 목록에 이전 가격이 남아 실패했다. 위 동기화 스크립트와 질문 링크 가격 키를 보강한 뒤 로컬에서 다음 결과를 확인했다.

- `npm run verify:home-service-registry`: 홈 서비스 57개·셸 타일 31개·질문 가격 37곳의 가격 일치 통과.
- i18n: 116개 키 × 12개 로케일 확인 통과. paid-gate-price: 44곳 확인 통과.
- `__tests__/ui/question-concerns.test.mjs`: 교차 화면 가격 가드를 포함한 4개 검사 통과.
- `scripts/sync-flower-price-copy.mjs` 재실행: 두 번째 실행에서 `0 badge edits` 확인.

이 보강은 가격 표시·가격 속성의 동기화이며 레이아웃을 바꾸지 않았다. 앞서 검토한 닫힌 홈·상품 안내·질문 폼의 형태는 동일해 PNG를 다시 캡처하지 않았다. 기존 PNG는 보강 뒤 펼친 목록의 최신 가격 증거로 확대 해석하지 않는다.

`b13097450`의 후속 CI는 이전 가격을 기대하던 검색·모바일 카드 검사 3건을 발견했다. `home-service-finder.test.js`와 `mobile-pricing-source.static.test.js`를 새 가격으로 갱신했다. 1,000원 상품과 3,000원 상담의 검색 분리, 실제 범위 가격 상품의 상·하한 검색을 유지하며 관련 34개 검사가 통과했다.

최종 구현 커밋 `13db6be3cce956553975fd7178521277709cdc55`를 main에 통합·push했다. [main CI 37650520852](https://github.com/rei1237/codedestiny/actions/runs/37650520852)의 Static guards, Build Pages and Worker, Typecheck and lint, Critical checks, CI required가 모두 success다. 결제 코드가 마지막으로 바뀐 `b13097450`의 [Paid Flow Gates 37649180247](https://github.com/rei1237/codedestiny/actions/runs/37649180247)도 success이며, 이후 변경은 UI 검사 두 파일뿐이다. 운영 승격과 실제 결제 검증을 의미하지 않는다.

## 후속 영냥이 기획 시안

사용자가 추가 요청한 영냥이 장점·차원 입장 연출·이용권 단순화는 **기획 단계**다. 저장소의 신규 판매 정책이나 상담 진입 연출에 적용하지 않았다.

- 제안: 내 질문에 맞춘 답·해석의 근거·현실에서 해볼 행동을 첫 화면에 제시한다. 기존 밤의 상담실과 영냥이 자산으로 짧은 입장 장면을 만든다.
- 제안: 질문에 맞는 범위를 추천한 뒤 단건 결제와 같은 범위 5회 이용권 두 선택만 제시한다. 10회·20회 묶음 신규 판매 정리는 별도 정책 결정이며 기존 구매 권한은 보존한다.
- 클릭형 시안: `C:/Users/user/.codex/visualizations/2026/10/07/01a116b6-9460-7d41-9f69-ac843acbbbcf/yeongnyangi-plan/index.html`. 기본 범위의 현재 가격 3,000원·5회 12,000원·30일을 예시로 쓴다. 실제 결제나 발급은 없다.
- 데스크톱·390px 모바일에서 입장→질문→구매 선택과 조건 표시를 확인했다. 입장 모바일의 IAB fullPage 캡처 오류는 viewport 캡처로 교체했고, 독립 검토에서 해결 및 시안 사용 가능 판정을 받았다. 이 시안은 운영 기능 검증을 대신하지 않는다.

## 진행

- [x] 운영 화면 및 현재 구현 확인
- [x] 동시 작업 확인 및 안전 워크트리 생성
- [x] 홈·영냥이 상품 안내·홈 이용권 노출 정리
- [x] 비LLM 가격 등록소·클라이언트 가격 동기화
- [x] 로컬 mock 화면·상호작용 확인 및 필수 PNG 8개 확보
- [x] 독립 화면 검토의 두 수정 및 해당 화면 재검토
- [x] 변경 기반 검사 결과 확정
- [x] scoped commit, main 통합·push·CI 확인
- [x] 화면 증거·기획 시안을 워크트리 밖에 보관하고 임시 검토 서버·탭 종료

완료 기록 커밋 전달 후 이 작업의 워크트리·정션·임시 파일만 정리한다. 다른 세션의 파일과 작업은 보존한다.

운영 승격·실결제·실LLM·운영 DB 쓰기는 실행하지 않는다.
