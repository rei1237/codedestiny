---
name: 영냥이 질문 후 결제 화면
description: 질문 제출 직후 상담 내용과 보유 혜택을 확인하는 한정된 보라·아이보리·골드 결제 화면
colors:
  yn-night: "#211432"
  yn-deep: "#271b30"
  yn-muted: "#c7b9cc"
  yn-line: "#66516e"
  yn-gold: "#e5c58e"
  yn-ivory: "#f3eee5"
  pay-ink: "#281d30"
  pay-hover: "#f4dab2"
typography:
  headline:
    fontFamily: "var(--font-serif)"
    fontSize: "clamp(1.7rem,4vw,2.5rem)"
    lineHeight: 1.35
  question:
    fontFamily: "var(--font-serif)"
    fontSize: "1.3rem"
    lineHeight: 1.7
  input:
    fontSize: "16px"
  feedback:
    fontSize: "0.95rem"
    lineHeight: 1.7
  pay-label:
    fontSize: "1rem"
    fontWeight: 700
rounded:
  summary: "24px"
  pay: "14px"
  field: "10px"
spacing:
  control-gap: "12px"
  product-gap: "16px"
  section: "24px"
components:
  button-pay:
    backgroundColor: "{colors.yn-gold}"
    textColor: "{colors.pay-ink}"
    rounded: "{rounded.pay}"
    typography: "{typography.pay-label}"
    width: "100%"
  button-pay-hover:
    backgroundColor: "{colors.pay-hover}"
  summary:
    backgroundColor: "{colors.yn-deep}"
    rounded: "{rounded.summary}"
    padding: "28px"
  field:
    backgroundColor: "{colors.yn-deep}"
    textColor: "{colors.yn-ivory}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    typography: "{typography.input}"
---

# Design System: 영냥이 질문 후 결제 화면

## Overview

**Creative North Star: "마음을 맡길 준비"**

질문을 제출하면 상담 내용과 이용 방법을 한 화면에서 확인한다. 깊은 보라 바탕, 아이보리 글자, 금색 핵심 행동으로 영냥이의 차분한 상담 분위기를 유지한다. 기존 물고기 자산으로 선택한 상담의 깊이를 보여준다.

이 문서는 질문 제출 후 결제 영역에만 적용한다. 전역 `DESIGN.md`와 영냥이 전체 팔레트를 교체하지 않는다. 구현 정본은 `app/checkout/YeongnyangiCheckout.tsx`, `app/checkout/yeongnyangi-checkout.module.css`, `app/yeongnyangi/_components/QuestionCheckout.tsx`, `app/yeongnyangi/_components/question-checkout.module.css`, `app/yeongnyangi/night-tokens.css`다.

**Key Characteristics:**
- 질문 다음에 상담 요약과 보유 이용권을 먼저 확인한다.
- 선택 사항은 접고, 준비되지 않은 필수 정보는 펼친다.
- 모바일에서는 금액과 핵심 행동을 화면 하단에 고정한다.
- 실패·취소 후에는 안내 문구로 포커스를 이동해 복구 행동을 찾게 한다.

검토 산출물은 `build-cache/yeongnyangi-checkout/checkout-{360,390,430,1440}.png`다. 검토자가 지적한 보라색 바탕과 모바일 복구 포커스 두 항목을 수정한 범위로 기록한다. detector 결과는 `[]`이며, 전체 서비스·운영 결제·운영 서체 검증을 의미하지 않는다.

## Colors

### Primary
- `yn-gold`: 결제 CTA, 선택된 이용 방법 제목, 결제 금액, 라디오와 포커스 윤곽선에 사용한다. 공유 밤 토큰의 값을 상속한다.
- `pay-ink`와 `pay-hover`: CTA 글자색과 활성 버튼의 마우스 오버 배경이다.

### Neutral
- `yn-night`: 결제 영역 자체의 단색 보라 바탕이다.
- `yn-deep`: 요약 패널과 입력 표면이다.
- `yn-ivory`: 본문 글자이며 공유 밤 토큰을 상속한다.
- `yn-muted`: 보조 설명, `yn-line`: 구분선과 입력 경계다.

**The Scoped Palette Rule.** 결제 루트에서 재정의한 밤·표면·보조 글자·경계 토큰은 이 영역의 자식에만 적용한다. 공유 `night-tokens.css`의 네이비 팔레트나 전역 페르소나 색을 바꾸지 않는다. CSS 폴백 색을 실제 상속값으로 문서화하지 않는다.

## Typography

제목과 제출 질문은 `var(--font-serif)`를 참조한다. 나머지 글자에는 이 화면 전용 서체를 선언하지 않는다. 운영 환경에서 실제로 선택된 글꼴, 다운로드 성공, 글자 폭은 확인되지 않았다.

제목·질문·입력·피드백·CTA의 크기는 프런트매터를 따른다. 760px 이하의 질문은 1.15rem이다. 상품 제목은 1.1rem, 설명은 0.9rem/1.6, 이용 방법 보조 문구는 0.85rem/1.6이다. 금액은 데스크톱 1.65rem, 모바일 1.25rem이며 숫자 폭은 `tabular-nums`로 정렬한다. 모바일 고정 바의 설명과 금액 라벨은 0.75rem이다. 질문의 줄바꿈은 보존하고 긴 문자열은 줄바꿈을 허용한다.

## Layout

결제 컨테이너는 최대 폭 1120px, 가운데 정렬, 여백 `32px 24px 140px`다. 데스크톱은 왼쪽 상세 정보와 오른쪽 요약을 `minmax(0,1.15fr) minmax(320px,.85fr)`, 간격 48px로 배치한다. 요약은 위에서 24px 위치에 붙는 sticky 패널이다.

760px 이하에서는 한 열로 전환한다. 요약이 먼저, 상세 정보가 다음에 오며 간격은 28px이다. 컨테이너 여백은 `24px 18px 145px`, 요약 내부는 `22px 18px`다. 금액·CTA 영역은 화면 하단에 고정하고 z-index 30, 금액과 버튼을 `1fr minmax(170px,1.3fr)`로 배치한다. 상단 설명은 두 열 전체를 쓴다. 좌우는 `max(18px,env(safe-area-inset-left))`, 하단은 `12px + env(safe-area-inset-bottom)`의 여백을 적용한다.

## Elevation & Depth

패널의 어두운 표면과 얇은 경계로 층위를 구분한다. 요약 패널의 그림자는 `0 18px 44px #100b1929` 한 겹이다. 모바일 고정 바에는 별도 그림자 없이 상단 경계를 둔다. 이 결제 모듈은 추가 등장 애니메이션이나 전환을 선언하지 않는다.

## Shapes

요약·CTA·입력 반경은 프런트매터를 따른다. 이용 방법은 반복 카드 대신 아래 구분선이 있는 라디오 행이다. 각 행은 최소 높이 48px, 라디오는 20px다. 펼침 제목은 최소 높이 44px, 상세 입력은 최소 높이 46px다. 결제 CTA의 유효 최소 높이는 모바일에서도 54px다. 모바일의 48px 선언보다 결제 버튼 기본 선택자의 구체성이 높다.

## Components

### 상담 요약과 이용 방법

물고기는 `/assets/yeongnyangi/fish/{fishId}.webp`를 재사용하고 화면 너비 88px로 표시한다. 장식 이미지의 `alt`는 비우고, 상품명·물고기 이름·챕터 수를 텍스트로 제공한다. 가격과 횟수는 기존 상품·가격 정본에서 읽는다.

이용 방법은 패밀리 이용권, 해당 상품에 적용 가능한 보유 이용권, 월정석, 단건 결제 순서로 보인다. 보유 혜택을 먼저 보여주는 것이 자동 사용을 뜻하지는 않는다. 기본 선택은 단건 결제이며, 유효한 이전 선택만 계정·상품·유효기간을 확인해 복원한다. 사용할 수 없는 항목은 비활성화하고 이유를 함께 보인다. 일부 월정석 할인은 구현된 조건에서만 접힌 상세 항목으로 제공한다.

### 상세 정보

질문 수정, 상담 방식·깊이, 주제·범위, 상황 보충은 기본적으로 접혀 있다. 판단에 필요한 선택지·조건·기간은 조건에 따라 열린 섹션에 나타난다. 준비 항목은 유효하지 않거나 확인 중이면 열리고, 완료된 항목은 요약에 답을 표시한다. 필수 준비가 끝나기 전에는 로그인한 사용자의 결제 버튼을 비활성화한다.

### 핵심 행동과 복구

CTA는 현재 로그인·선택 혜택·진행 상태에 따라 문구를 바꾼다. 준비 중에는 관련 필드와 버튼을 비활성화한다. CTA의 비활성 불투명도는 0.55이며 활성 상태에서만 마우스 오버 색을 적용한다.

결제 화면을 열면 내용 래퍼에 포커스를 주고 시작 위치로 스크롤한다. 실패·취소 등의 메시지가 있고 진행 중이 아니면 `role="status"`, `tabIndex={-1}` 안내 문구에 `focus({preventScroll:true})` 후 `scrollIntoView({block:'center'})`를 실행한다. 로그인 상태에서는 그 아래 보유 혜택 다시 확인하기 버튼을 제공한다. 보유 혜택 조회 실패는 별도의 `role="alert"`와 다시 확인하기 버튼으로 안내한다.

키보드 포커스는 금색 2px 윤곽선으로 표시한다. 결제의 버튼·입력·펼침 제목은 바깥 간격 4px, 상세 입력·선택·텍스트 영역 등의 규칙은 3px이다. 내용 래퍼의 프로그램 포커스는 윤곽선을 숨긴다. 실제 결제·이용권 적용은 기존 서버 확인 경로를 유지하며 화면의 잔액 표시나 저장된 선택만으로 접근을 허용하지 않는다.

## Do's and Don'ts

### Do:
- **Do** 이 문서의 보라색 표면 변경을 질문 후 결제 영역에 한정한다.
- **Do** 기존 이용권·월정석·단건 결제의 가격, 한도, 서버 확인 계약을 유지한다.
- **Do** 선택 정보는 접고 필수 준비와 실패 후 복구 위치는 쉽게 찾도록 유지한다.
- **Do** 새로운 검증 결과는 화면 산출물과 실제 실행 범위를 구분해서 기록한다.

### Don't:
- **Don't** 새 물고기 그림, 장식 애니메이션, 전역 팔레트를 이 범위에서 추가하지 않는다.
- **Don't** CSS 폴백이나 선언만으로 운영 글꼴 렌더링·명암비 측정을 완료했다고 기록하지 않는다.
- **Don't** 화면에 보인 잔액이나 이용 방법 복원을 결제 완료의 증거로 취급하지 않는다.
