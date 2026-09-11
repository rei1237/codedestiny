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

## 지금 상태

- 브랜치 `feat/detail-sheet-premium`, 워크트리 `D:\Development\code-destiny-wt\detail-sheet-premium`. PR: (아래 갱신)
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
- **환불 안내 공통 문구**(`preview.paywallNote`, 12개 로케일): 약관 §12 기준 "7일 이내 청약철회 · 열람/생성 시작분 제한 · 환불 정책 링크". 운명의 꽃 FAQ 에는 "월정석 현금 환불 아님" 추가.
- **로케일**: 신규 preview 라벨 9개(`recommendForLabel`·`receivesLabel`·`outlineLabel`·`outlineCaption`·`pricingLabel`·`benefitsLabel`·`assureLabel`·`refundPolicyLink`·`trustLabel`) + `flower_fc` 전면 재작성. en·ja·zh-cn·zh-tw 손번역, 나머지 7개는 en 복사, ko 는 preview 만.

## 운명의 꽃 카피 근거 (지어내지 않은 것만)

스튜디오 패널(#dfStudio*) · 엔진 입력(사주 일간·오행 비율·계절 / 점성술 태양·상승·달 / 자미두수 주성 밝기·사화 / 숙요 27수·달 위상) · 89종 도감 랭킹 · `Math.random` 없음(같은 입력 → 같은 꽃) · localStorage 개화 기록 12건 · 카카오 텍스트 공유 + 복사 · 이미지 파일 생성 없음(묘사문 복사만) · 환불 약관 §12 · 월정석 현금 환불 불가(TermsContent.jsx). "10년 경력" 문구는 사주/만세력 검수에 해당해 쓰지 않았다. 가격은 카피에 없다(가격 스토어·페이월 분기만).

- 실제 패널 이름은 「꽃 데이터 시트」지만 금지어("데이터") 때문에 카피에서는 「꽃 프로필」로 부른다. 패널 이름 자체를 바꿀지는 별도 결정.

## 검증 (2026-09-11 실행)

- `verify:feature-marketing-schema` OK(카피 162 / 템플릿 9) · 변이(래퍼 제거) 시 실패 확인
- `verify:feature-marketing-dictionary` OK(로케일 11 / 경로 34100 / 결손 0)
- `verify:rpt-preview-cta` · `verify:public-parity` · `verify:mobile-detail-nonintrusive` · `verify:hero-contrast` · `verify:payment-freeze` · `verify:mobile-cdp-smoke` 통과
- `node scripts/verify-feature-popup-journey.mjs` PASS(63 상세 × 4폭)
- `typecheck` 통과
- (렌더·결제 회귀 결과는 아래 갱신)

## 후속 과제 (보고만, 이 PR 에서 안 고침)

1. **나머지 98개 상품 카피 배치** — 카테고리별 PR. 각 항목에 `receives`·`outline`(선택)·`valueCompare` 명시·금지어 제거·사실 근거 주석. 배치 제안 순서: 사주 프리미엄 리포트 → 궁합 → 타로 → 자미·점성 → 월정석 단건.
2. `app/components/FeatureLandingPage.tsx:296` 주석/문구가 20,000원을 적고 있다(가격 하드코딩 의심).
3. 레지스트리에 `flower-studio-per-use` 잔존 상품이 남아 있다.
4. 사주 탭: 클라이언트는 해금으로 보이는데 서버가 402 를 준다(기존 결제 결함 목록과 함께 확인).
5. React 허브 모달 오버레이가 `role="presentation"` 이다(다이얼로그 의미 없음).
6. `#tilePvwCompareSec` 를 찾는 코드와 실제 id `#tilePvwCmpSec` 가 어긋난다.
7. `openXFlowerStudio` COPY 4항목(openDestinyFlowerStudio 외)이 "팔레트·꽃말·관계·커리어 가이드 패널"을 주장한다 — 관계·커리어 패널은 실측되지 않았다.
8. 기존 인수인계에 적힌 결제 결함 4건은 그대로 열려 있다.
9. 참고: 최근 90일 실결제가 0에 가깝고 병목은 전환율이 아니라 모수다 — 전환 UI 추가 투자는 보류를 권한다.
