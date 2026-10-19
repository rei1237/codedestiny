---
name: 영냥이 질문 후 결제 화면
description: 푸른 달빛과 흰 마법사 고양이로 상담 준비와 이용 방법을 안내하는 결제 화면
colors:
  yn-night: "#091528"
  yn-deep: "#101e36"
  yn-surface: "#162b47"
  yn-muted: "#b8cbe0"
  yn-line: "#38516c"
  yn-gold: "#a4dcf4"
  yn-ivory: "#f3f4ef"
  pay-fill: "#b3e4f5"
  pay-ink: "#10243b"
  pay-hover: "#d4f1fc"
typography:
  headline:
    fontFamily: "var(--font-serif)"
    fontSize: "clamp(1.75rem,4vw,2.6rem)"
    lineHeight: 1.35
  question:
    fontFamily: "var(--font-serif)"
    fontSize: "1.3rem"
    lineHeight: 1.75
  input:
    fontSize: "16px"
  feedback:
    fontSize: "0.95rem"
    lineHeight: 1.7
  pay-label:
    fontSize: "1rem"
    fontWeight: 700
rounded:
  summary: "20px"
  summary-mobile: "16px"
  pay: "10px"
  field: "10px"
spacing:
  control-gap: "12px"
  product-gap: "16px"
  section: "24px"
components:
  button-pay:
    backgroundColor: "{colors.pay-fill}"
    textColor: "{colors.pay-ink}"
    rounded: "{rounded.pay}"
    typography: "{typography.pay-label}"
    width: "100%"
  button-pay-hover:
    backgroundColor: "{colors.pay-hover}"
  summary:
    backgroundColor: "{colors.yn-deep}"
    rounded: "{rounded.summary}"
    padding: "26px"
  field:
    backgroundColor: "{colors.yn-deep}"
    textColor: "{colors.yn-ivory}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
    typography: "{typography.input}"
---

# Design System: 영냥이 질문 후 결제 화면

## Overview

**Creative North Star: "마음을 맡길 준비 — 푸른 달빛"**

질문 제출 뒤 상담 내용과 이용 방법을 확인한다. 짙은 청색 바탕에 밝은 청색 행동 버튼을 두고, 푸른 구슬을 품은 흰 장모 마법사 고양이로 영냥이의 차분하고 다정한 정체성을 드러낸다. CSS 물고기와 옅은 발자국은 제목 주변을 장식한다.

이 문서는 질문 후 결제 영역 전용이다. 전역 `DESIGN.md`, 다른 페르소나, 공유 밤 토큰은 바꾸지 않는다. 구현 정본은 `app/checkout/YeongnyangiCheckout.tsx`와 `app/checkout/yeongnyangi-checkout.module.css`다. 상세 입력은 기존 `app/yeongnyangi/_components/QuestionCheckout.tsx` 및 `question-checkout.module.css`를 유지하며 결제 루트의 토큰을 상속한다.

**Key Characteristics:**
- 사용 가능한 이용권을 먼저 선택하되 유효한 이전 선택을 존중한다.
- 혜택 조회 중에는 결제를 막고, 자동 선택만으로 이용권을 차감하지 않는다.
- 선택 정보는 접고 필수 준비는 드러내며 모바일에서는 요약을 먼저 배치한다.
- 모바일 하단에 금액과 CTA를 고정하고 실패·취소 안내로 포커스를 이동한다.

mock을 연결한 실제 React 브라우저에서 360·390·430·1440px 검증이 모두 통과했다. 워크트리의 최종 캡처는 `build-cache/yeongnyangi-checkout/checkout-{360,390,430,1440}.png` 및 `checkout-error-390.png`다. main 작업 폴더에는 같은 디렉터리의 `blue-checkout-{360,390,430,1440}.png` 및 `blue-checkout-error-390.png`로 보존했다. 독립 리뷰의 물고기 가림 한 건은 `z-index:2`로 수정했다. 최종 재확인은 390px의 해당 항목에 한정하며 판정은 `resolved · ship`이다. 전체 화면의 재리뷰를 뜻하지 않는다. detector 결과는 `[]`다. 실결제·운영 DB·운영 서체 렌더링은 이 검증 범위에 포함하지 않는다.

## Colors

### Primary
- `yn-gold`: 기존 키를 유지하되 결제 루트에서는 밝은 달빛 청색이다. 선택된 이용 방법, 라디오, 포커스, 캐럿에 사용한다.
- `pay-fill`, `pay-ink`, `pay-hover`: CTA 기본 배경·글자·활성 hover 배경이다. 경계는 `#cfedf8`다.

### Neutral
- `yn-night`: 전체 바탕. 오른쪽 위에 `radial-gradient(ellipse at 80% 0%,#173c60 0,transparent 44%)`를 겹친다.
- `yn-deep`: 요약·입력·모바일 고정 바 표면이다. `yn-surface`도 결제 범위의 상속 토큰으로 선언한다.
- `yn-ivory`: 본문과 금액, `yn-muted`: 보조 설명, `yn-line`: 구분선과 입력 경계다.

**The Scoped Palette Rule.** 결제 루트의 `--yn-*`만 재정의한다. `question-checkout.module.css`와 `night-tokens.css`는 유지하며 하위 입력까지 표면·글자·경계·강조색을 함께 상속한다. 텍스트 선택 영역은 달빛 청색 바탕과 짙은 청색 글자다.

## Typography

제목과 질문은 `var(--font-serif)`를 참조하고 나머지는 기존 서체를 상속한다. 운영에서 선택된 글꼴과 다운로드 성공 여부는 확인하지 않았다.

760px 이하 제목은 1.65rem·최대 8ch, 질문은 1.1rem이다. 소개는 데스크톱 1rem/1.8, 모바일 .85rem/1.7이다. 질문은 줄바꿈을 보존하고 긴 문자열을 감싼다. 상품 제목은 1.1rem, 상품 설명은 .9rem/1.6, 이용 방법 설명은 .85rem/1.6이다. 금액은 1.65rem에서 모바일 1.25rem으로 줄이고 `tabular-nums`를 적용한다. 모바일 CTA는 .95rem, 하단 설명·금액 라벨은 .75rem이다. 상세 입력은 16px를 유지한다.

## Layout

컨테이너는 최대 1120px, 가운데 정렬, 여백 `24px 40px 140px`다. 헤더는 `1fr 260px`의 글·그림 두 열이며 질문이 전체 열을 차지한다. 헤더 아래 간격은 36px다. 본문은 `minmax(0,1.1fr) minmax(340px,.9fr)`, 간격 44px로 상세·요약을 나눈다. 요약은 위에서 24px에 붙는 sticky 패널이며 내부 여백은 26px다.

760px 이하 바깥 여백은 `12px 18px 155px`, 헤더는 `minmax(0,1fr) 140px`, 아래 간격은 24px다. 본문은 한 열·28px 간격이며 요약이 상세보다 앞이다. 요약 내부는 `22px 18px`다. 고정 하단 행동 영역은 z-index 30, `minmax(0,1fr) minmax(170px,1.3fr)` 두 열이며 설명은 전체 열을 쓴다. 좌우는 각각 `max(18px,env(safe-area-inset-left/right))`, 하단은 `12px + env(safe-area-inset-bottom)`을 확보한다.

## Elevation & Depth

짙은 표면과 얇은 경계에 작은 그림자를 더한다. 요약은 `0 18px 40px #030a172b`, CTA는 `0 6px 16px #040b1729`, 모바일 고정 바는 `0 -8px 28px #030a172b`다. 고양이는 `drop-shadow(0 12px 24px #05101e60)`다. 장식 반복 애니메이션은 없다. 활성 CTA hover는 위로 1px 이동하며 `prefers-reduced-motion:reduce`에서는 transition과 이동을 제거한다.

## Shapes

요약 반경은 데스크톱 20px·모바일 16px, CTA와 상세 입력은 10px다. 이용 방법은 구분선이 있는 네이티브 라디오 행으로 최소 48px, 라디오는 20px다. 펼침 제목은 최소 44px, 입력은 최소 46px, CTA는 모든 너비에서 최소 54px다. 물고기는 둥근 몸통·삼각 꼬리·작은 눈, 발자국은 둥근 패드와 발가락 네 개로 구성한다.

## Components

### 푸른 달빛 고양이와 장식

새 자산 `/assets/yeongnyangi/checkout-moonblue.webp`는 640×640 투명 WebP, 142,410바이트다. 생성 프롬프트와 시각은 `public/assets/yeongnyangi/checkout-moonblue.webp.json`에 보존한다. 흰 장모 고양이·남색 마법사 모자와 망토·푸른 구슬을 그리며 이미지 안에 UI 문구를 넣지 않는다.

데스크톱 그림 영역은 260×240px, 이미지 상자는 260×260px다. 모바일 영역은 140×185px, 이미지 상자는 170×185px이며 왼쪽으로 20px 옮긴다. `object-fit:contain`을 쓰고 Next Image에 원본 크기, `priority`, `sizes="(max-width:760px) 160px, 260px"`를 지정한다. CSS 물고기 두 개는 31×15px 몸통에 서로 다른 회전·축소·불투명도를 사용하며 이미지 z-index 1 위에 z-index 2로 놓는다. 발자국 세 개는 27×30px, 간격 20px, 전체 불투명도 .12다. 그림·물고기·발자국은 `aria-hidden` 및 빈 이미지 `alt`로 장식임을 표시하고 포인터 이벤트를 받지 않는다.

### 상담 요약과 이용 방법

상품 물고기는 기존 `/assets/yeongnyangi/fish/{fishId}.webp`를 76px 너비로 표시한다. 상품명·물고기 이름·챕터 수는 텍스트로 제공하며 가격과 횟수는 기존 상품·가격 정본에서 읽는다.

로그인 후 조회가 끝나면 사용 가능한 패밀리 이용권을 우선 선택하고, 없으면 해당 상품에 적용 가능하며 남은 횟수가 있는 첫 보유 이용권을 선택한다. 둘 다 없으면 단건 결제다. 같은 계정·상품에 대해 한 시간 이내 저장한 명시적 이전 선택이 유효하면 이를 복원한다. 월정석은 이전 선택의 복원 또는 사용자 선택으로 이용한다. 목록은 패밀리 이용권·해당 상품 보유 이용권·월정석·단건 결제 순이며 사용 불가 항목에는 이유를 표시한다.

자동 선택은 결제나 차감이 아니다. 조회 중에는 이용 방법과 CTA를 비활성화하고 금액을 `확인 중`으로 표시한다. 클릭 이후 준비된 상담과 계정을 확인하고 기존 이용권 quote/consume 또는 결제 게이트로 진행한다. 저장된 선택·표시 잔액으로 서버 확인을 우회하지 않는다. 일부 월정석 할인은 기존 조건과 단건 잔액 기준을 유지한다.

### 상세 정보

질문 수정·상담 깊이·범위·상황 보충의 기존 접힘과 필수 정보의 열림 동작을 유지한다. 필수 준비가 유효하지 않거나 확인 중이면 해당 항목을 열고, 로그인 사용자는 준비 완료 전까지 결제할 수 없다. 상세 입력 구조·공유 CSS는 변경하지 않는다.

### 핵심 행동과 복구

로그인한 이용권·월정석 선택의 CTA는 `상담 시작하기`, 단건 결제는 `결제하고 상담 시작하기`다. 이용권 종류를 별도 CTA에 반복하지 않고 차감 안내와 이용 방법에서 보여준다. 비로그인은 `로그인하고 이어가기`, 조회 중은 `이용권 확인 중`, 실행 중은 `상담 준비 중`이다. 비활성 버튼은 `#263e55` 배경·`#48627a` 경계·`#b8cbe0` 글자, 그림자 없음, `not-allowed` 커서다.

진입 시 내용 래퍼로 포커스와 시작 위치를 이동하는 기존 동작을 유지한다. 실패·취소 메시지는 `role="status"`, `tabIndex={-1}`이며 진행이 끝나면 `focus({preventScroll:true})`와 중앙 스크롤로 찾기 쉽게 한다. 로그인 사용자는 보유 혜택을 다시 확인할 수 있다. 조회 실패는 `role="alert"`와 재확인 버튼으로 안내한다. 포커스 윤곽선은 달빛 청색 2px, 결제 컨트롤 간격은 4px, 상세 입력 규칙은 3px다. checkout의 기존 robots `noindex` 정책을 유지한다.

## Do's and Don'ts

### Do:
- **Do** 푸른 팔레트를 결제 루트에 한정하고 기존 입력의 토큰 상속을 유지한다.
- **Do** 자동 선택과 실제 사용을 구분하고 유효한 사용자 선택을 복원한다.
- **Do** 가격·이용권·월정석·단건 결제 정책과 서버 확인 경로를 유지한다.
- **Do** 장식 물고기가 고양이에 가려지지 않게 z-index 2를 유지한다.
- **Do** 검증한 viewport·mock 범위와 부분 재리뷰 범위를 구분해 기록한다.

### Don't:
- **Don't** 청색 팔레트를 전역 캐릭터 토큰으로 확장하지 않는다.
- **Don't** 자동 선택이나 잔액 표시를 결제 완료·차감의 증거로 취급하지 않는다.
- **Don't** CSS 선언이나 mock 검증만으로 운영 서체·실결제 검증을 완료했다고 기록하지 않는다.
