---
status: active
updated: 2026-09-11
next: "상세창 프리미엄 개편 PR 의 CI·머지를 확인한 뒤, 운명의 꽃과 같은 형식(receives·outline)으로 나머지 유료 상품 카피를 카테고리 배치 1번(사주 프리미엄 리포트)부터 옮긴다."
---

# 유료 상세창 프리미엄 개편 — 공통 구조 + 운명의 꽃

## 왜

유료 타일을 누르면 뜨는 상세창(`#tilePvwOverlayTemplate` 바텀시트/다이얼로그)이 개발 문서처럼 읽혔고, 모바일에서는 분석 단계 설명이 **세로로 한 글자씩** 끊겼다. 사용자 요청: 호기심 → 나에게 어떤 도움 → 무엇을 받는지 → 분석 신뢰 → 결과 상상 → 가격·혜택 → 이용 결심 순서의 프리미엄 상품 문서로 재구성하고, 첫 기준 화면은 「운명의 꽃」.

사용자 확정 범위: **공통 구조(180키 전체 자동 적용) + 운명의 꽃 카피만**. 나머지 98개 상품 카피는 이 문서의 후속 배치로 넘긴다. 결과 미리보기는 **구성 미리보기**(실제 결과 화면 부위 이름 + 기존 자산 이미지, 지어낸 결과 문장 없음).

## 근본 원인 (세로 한 글자 줄바꿈)

`.tile-pvw-step` 은 `28px minmax(0,1fr)` 2열 grid 인데, `_fillPairs` 가 `b`·`span` 을 li 에 바로 붙여 `::before` 까지 grid item 이 **3개**가 됐다. 자동 배치로 설명 `span` 이 2행 1열(28px 칸)로 떨어지고, `overflow-wrap:anywhere` 가 그 칸에서 한국어를 글자마다 끊었다. 옛 레이아웃(padding-left + absolute 마커)에는 없던 결함이 grid 전환 때 들어왔다.

수정: `_fillPairs` 가 둘을 `.tile-pvw-step-body` 한 겹으로 감싸(DOM 이 item 2개를 보장) + CSS `grid-column:2` 이중 고정 + 본문 `word-break:keep-all; overflow-wrap:break-word`. 모바일 인라인 `!important`(제목 ellipsis·태그라인 2줄 clamp·feats .76rem)와 네이비 `premium-vvip-preview-style` 규칙도 제거했다.

🔴 가드: `verify:feature-marketing-schema` 가 래퍼 생성 코드를 문다(래퍼를 지우는 변이로 실패 확인함).

### 같이 잡은 원인 3건 (렌더 실측 후)

- **모바일 본문 13px 대**: 셸이 모바일에서 `html{font-size:14px}` 로 루트를 낮춘다(index.html·styles/fortune-ui*.css 7곳). 새 블록을 rem 으로 적어 본문이 13.1~14px 로 줄었다. 프리미엄 블록의 모든 크기를 `--pvw-rem:16px` 토큰 배수(`calc(N * var(--pvw-rem))`)로 바꿔 루트와 끊었다. 새 크기를 넣을 때 rem 을 쓰지 말 것.
- **닫기 버튼이 본문을 가림**: `.tile-pvw-close` 가 시트 기준 absolute 라 스크롤되는 본문 위에 떠 있었다. 시트(flex column) 흐름으로 넣어 스크롤 영역 위 한 줄을 차지하게 했다.
- **데스크톱 히어로 462px**: `aspect-ratio:16/9` + `max-height:260px` + width auto → 높이 상한이 비율을 타고 폭으로 전달됐다. `width:100%` 명시.

## 지금 상태

- 브랜치 `feat/detail-sheet-premium`, 워크트리 `D:\Development\code-destiny-wt\detail-sheet-premium`. PR: #1923 (Ready, 머지 미포함)
- 계획 정본: `C:\Users\user\.claude\plans\witty-twirling-petal.md`

### 남는 계약

- **섹션 순서**(schema 가드 ORDER, 계약 주석 `feature-marketing-premium-v20260911`): 추천 대상(AudSec) → 이런 질문(QuestSec) → 내가 받게 되는 것(ReceiveSec, 분석 깊이 ScaleSec 포함) → 결과 화면 구성(OutlineSec) → 어떻게 분석(StepsSec·ReqSec) → 믿고 볼 수 있는 이유(TrustSec) → 가격과 혜택(PriceSec: Paywall·PremiumBlock·CmpSec) → 안심 안내(Assure) → FAQ → 고정 CTA.
- **새 COPY 필드** (상품 COPY 전용, 템플릿·레거시 D 에는 없음):
  - `receives:[{icon,title,detail}]` — 없으면 기존 `feats` 로 폴백(98개 상품은 라벨·스타일만 바뀜).
  - `outline:[{title,detail}]` + `outlineImage`(public/ 에 **실재하는** 파일만 — 가드가 존재 검사) — 없으면 섹션 숨김.
  - 사전 경로 `featureMarketing.<ns>.receives.<i>.title|detail`, `outline.<i>.title|detail` (icon 은 번역 안 함). 사전 가드 `requiredPaths` 에 추가됨.
- **`valueCompare:{rows:[]}` 는 명시적 숨김**이다. 필드를 지우면 `_pickPreviewField`(!=null) 가 레거시 D·템플릿 비교표로 떨어진다. schema 가드가 빈 배열을 허용하도록 바꿨다.
- **금지어 가드**: `receives` 를 가진(새 형식으로 옮긴) 항목은 `기능·계산값·컬럼·데이터·규칙 기반 시각화·시스템·프롬프트·내부 로직` 을 쓰면 실패. 옛 형식 항목은 옮길 때부터 적용된다.
- **FAQ** 는 `details` 가 아니라 `button[aria-expanded][aria-controls]` + region, `grid-template-rows 0fr→1fr` 애니메이션, reduced-motion 에서 끔.
- **CSS 범위**: 새 기하는 전부 `.tile-pvw-overlay:not(.pvw-visual)` 로 한정 — 허브(`FeatureMarketingDetailModal.tsx`)·비주얼 상세 모드는 제외. 비주얼 모드는 `styles/feature-visual-detail.css:96` 에서 새 섹션(Faq·Receive·Outline)을 숨긴다.
- **결제 로직 무변경**: `_open` 페이월 4분기·`_onCta`/`_runCta`·bypass 재클릭·가격 스토어·상품 ID 손대지 않음. 페이월 박스는 위치·스타일만 이동.
- **환불 안내**: `preview.paywallNote` 는 기존 법적 고지 원문 그대로(안심 안내 카드로 위치만 이동) + 환불 정책 링크(`/refund-policy/`) 추가. 🔴 사전·카피에 환불 기한("7일")을 적으면 `verify:payment-legal-copy` 가 막는다 — 정본은 `lib/legal/refund-policy-rows.js` 하나. 운명의 꽃 FAQ 환불 답변도 기한 없이 "환불 정책의 조건에 따라 · 열람 시작분 제한 · 월정석 현금 환불 아님"으로 적었다.
- **로케일**: 신규 preview 라벨 9개(`recommendForLabel`·`receivesLabel`·`outlineLabel`·`outlineCaption`·`pricingLabel`·`benefitsLabel`·`assureLabel`·`refundPolicyLink`·`trustLabel`) + `flower_fc` 전면 재작성. en·ja·zh-cn·zh-tw 손번역, 나머지 7개는 en 복사, ko 는 preview 만.

## 운명의 꽃 카피 근거 (지어내지 않은 것만)

스튜디오 패널(#dfStudio*) · 엔진 입력(사주 일간·오행 비율·계절 / 점성술 태양·상승·달 / 자미두수 주성 밝기·사화 / 숙요 27수·달 위상) · 89종 도감 랭킹 · `Math.random` 없음(같은 입력 → 같은 꽃) · localStorage 개화 기록 12건 · 카카오 텍스트 공유 + 복사 · 이미지 파일 생성 없음(묘사문 복사만) · 환불 약관 §12 · 월정석 현금 환불 불가(TermsContent.jsx). "10년 경력" 문구는 사주/만세력 검수에 해당해 쓰지 않았다. 가격은 카피에 없다(가격 스토어·페이월 분기만).

- 실제 패널 이름은 「꽃 데이터 시트」지만 금지어("데이터") 때문에 카피에서는 「꽃 프로필」로 부른다. 패널 이름 자체를 바꿀지는 별도 결정.

## 검증 (2026-09-11 실행)

- `verify:feature-marketing-schema` OK(카피 162 / 템플릿 9) · 변이(래퍼 제거) 시 실패 확인
- `verify:feature-marketing-dictionary` OK(로케일 11 / 경로 34100 / 결손 0)
- `verify:rpt-preview-cta` · `verify:public-parity` · `verify:mobile-detail-nonintrusive` · `verify:hero-contrast` · `verify:payment-freeze` · `verify:mobile-cdp-smoke` 통과
- `node scripts/verify-feature-popup-journey.mjs` PASS(63 상세 × 4폭)
- `typecheck` 통과 · `verify:handoff-contract` OK
- origin/main 리베이스 후 위 가드 전부 재실행 통과(충돌은 `config/sitemap-lastmod.json` 하나 — upstream 채택 후 `sitemap:generate`·`sync:public` 재생성)
- **렌더 실측**(scratch Playwright, `/api/**` 전부 스텁, 외부 호스트 차단 — 실결제·LLM·네트워크 0): 운명의 꽃 Yeon·Neo × 320/360/375/390/412/430/1280
  - 가로 넘침 0 · 40px 미만 칸 글자 0 · CTA 48px(데스크톱 52) 뷰포트 안 · 닫기 48px 스크롤 영역과 겹침 0
  - 모바일 본문 15~16px · line-height 1.6~1.75 (위반 0) · 좌우 여백 20px · 데스크톱 다이얼로그 720px · 히어로 718px(전폭)
  - role=dialog·aria-modal·aria-labelledby · 포커스 트랩 순환 · ESC 닫힘 · FAQ 5개 기본 접힘·aria-expanded 토글
  - 다른 상품 5종(타로·사주·궁합·코인 단건·잠금) 360·1280 넘침·좁은 칸·CTA 통과
  - 시각 검사 에이전트: 세로 글자 0, 대비 전부 AA 이상(본문 7.59:1, 금색 번호 5.44:1, CTA 10.77:1, Neo 본문 10.40:1)
- **결제 회귀(mock 6상태, 새 코드 vs origin/main)**: 무료·PG 단건·이용권·구매 완료·프리미엄 이용권·해금 + 가격 API 실패. 페이월 문구·CTA 클릭 경로(bypass 재클릭 1회)·네트워크 호출이 전부 동일하고, 차이는 운명의 꽃 CTA 문구("운명의 꽃 피우기" → "운명의 꽃 해금하기")뿐. 점성술 상담 5상태도 동일.

## 후속 과제 (보고만, 이 PR 에서 안 고침)

1. **나머지 98개 상품 카피 배치** — 카테고리별 PR. 각 항목에 `receives`·`outline`(선택)·`valueCompare` 명시·금지어 제거·사실 근거 주석. 배치 제안 순서: 사주 프리미엄 리포트 → 궁합 → 타로 → 자미·점성 → 월정석 단건.
2. `app/components/FeatureLandingPage.tsx:296` 주석/문구가 20,000원을 적고 있다(가격 하드코딩 의심).
3. 레지스트리에 `flower-studio-per-use` 잔존 상품이 남아 있다.
4. 사주 탭: 클라이언트는 해금으로 보이는데 서버가 402 를 준다(기존 결제 결함 목록과 함께 확인).
5. React 허브 모달 오버레이가 `role="presentation"` 이다(다이얼로그 의미 없음).
6. `#tilePvwCompareSec` 를 찾는 코드와 실제 id `#tilePvwCmpSec` 가 어긋난다.
7. `openXFlowerStudio` COPY 4항목(openDestinyFlowerStudio 외)이 "팔레트·꽃말·관계·커리어 가이드 패널"을 주장한다 — 관계·커리어 패널은 실측되지 않았다.
8. 기존 인수인계에 적힌 결제 결함 4건은 그대로 열려 있다.
9. **가격 배지가 모든 유료 상품에 "· 전문가 상담"을 붙인다** — `index.html` `_resolvePreviewData` 의 `merged.cost=featurePricing.displayPrice+' · '+_pvwTr('home.nav.aiConsult','전문가 상담')`. 운명의 꽃·올림푸스 신탁처럼 상담이 아닌 상품에도 붙어 사실과 다르다(origin/main 동일, 가격 표시 코드라 이번에 안 건드림).
10. **CTA 이중 호출** — 운명의 꽃 구매 완료·해금 상태에서 CTA 한 번에 `openDestinyFlowerStudio` 가 2회 불린다(`js/core/index-inline-runtime.js` 액션 디스패처 + `js/mobile-interaction-patch.js` 1661 근처). origin/main 동일.
11. **프리미엄 이용권 상태 CTA 후 렌더러 크래시** — mock 에서 `POST /api/billing/coin-gate` 뒤 페이지가 죽었다. `{}` 스텁 탓일 수 있어 실제 응답 형태로 재현 필요. origin/main 동일.
12. **비주얼 상세 모드(타로·사주 카탈로그 타일)** 는 이번 새 구조에서 제외(`.pvw-visual`)라 옛 레이아웃(마젠타 그라데이션 CTA·중간 버튼)이 그대로다. 같은 형식으로 옮길지 별도 결정.
13. Neo 테마 안심 안내 박스가 한 단계 떠 있는 남보라 면(#1C1937)이다 — "남색 박스 금지"에 경계. 디자인 판단 필요.
14. 가격 로딩 중에는 CTA 가 "가격 확인 중"으로 보이고 누를 수 없다(기존 동작, 가격 API 실패 시 안내 문구 표시).
15. 참고: 최근 90일 실결제가 0에 가깝고 병목은 전환율이 아니라 모수다 — 전환 UI 추가 투자는 보류를 권한다.
