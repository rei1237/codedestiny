---
name: Code Destiny 기본 네 운세 상담 진입·입력·결과
description: 기존 연이 세계를 확장한 자미두수·숙요·서양 점성술·베다 질문 상담의 구현 기록
colors:
  fc-paper: "#fff8f3"
  fc-ink: "#3c1830"
  fc-muted: "#754455"
  fc-accent: "#9a2853"
  fc-line: "#dfbcc8"
  fc-field: "#fffdfb"
  fc-dark: "#2e1021"
  fc-light: "#fff3ec"
  fc-night-paper: "#171222"
  fc-night-ink: "#f7effa"
  fc-night-muted: "#d4bfdf"
  fc-night-accent: "#eed49e"
  fc-night-line: "#685375"
  fc-night-field: "#241b30"
  fc-night-dark: "#ead6ad"
  fc-night-light: "#261a31"
typography:
  display:
    fontFamily: "var(--font-display, 'Noto Serif KR', serif)"
    fontSize: "clamp(1.55rem, 4.5vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.035em"
  display-wide:
    fontSize: "clamp(1.55rem, 3.8cqi, 2.4rem)"
  lead:
    fontSize: "0.95rem"
    lineHeight: 1.85
  section:
    fontSize: "1.1rem"
  form-body:
    fontSize: "0.9rem"
    lineHeight: 1.8
  input:
    fontSize: "16px"
    lineHeight: 1.75
  report:
    fontSize: "1rem"
    lineHeight: 1.9
  label:
    fontSize: "0.88rem"
    fontWeight: 800
  service-name:
    fontSize: "0.8rem"
    fontWeight: 800
  price:
    fontSize: "1.15rem"
  note:
    fontSize: "0.73rem"
    lineHeight: 1.65
rounded:
  consultation: "20px"
  action-field: "10px"
  example: "9px"
spacing:
  copy-mobile: "25px 22px 28px"
  copy-wide: "40px 32px"
  form-body: "4px 22px 24px"
  action: "12px 18px"
  example: "10px 14px"
  field: "12px"
components:
  primary:
    backgroundColor: "{colors.fc-dark}"
    textColor: "{colors.fc-light}"
    rounded: "{rounded.action-field}"
    padding: "{spacing.action}"
    height: "48px minimum"
    width: "100%"
  primary-night:
    backgroundColor: "{colors.fc-night-dark}"
    textColor: "{colors.fc-night-light}"
  example:
    backgroundColor: "{colors.fc-field}"
    textColor: "{colors.fc-accent}"
    rounded: "{rounded.example}"
    padding: "{spacing.example}"
    height: "44px minimum"
  question:
    backgroundColor: "{colors.fc-field}"
    textColor: "{colors.fc-ink}"
    typography: "{typography.input}"
    rounded: "{rounded.action-field}"
    padding: "{spacing.field}"
    height: "140px minimum"
    width: "100%"
---

# 기본 네 운세 상담 — 구현 디자인 기록

## Overview

**Creative North Star: "별 지도를 펼치는 연이의 상담 자리"**

이 문서는 `basic-entry-direction.md`에 기록된 기존 세계 확장의 실제 구현을 남긴다. 자미두수·숙요·서양 점성술의 기존 기본 운세 modal과 `vedic-astrology.html`의 질문 상담 표면만 대상으로 한다. 소개는 Persuade, 질문 입력은 Operate, 결과는 Read다. 별도 승인 comp나 QUALITY BAR 보드는 없으며, 새 세계를 선정하거나 전역 `DESIGN.md`를 교체한 작업이 아니다.

체계별 꽃돼지 연이 장면이 상담의 분위기를 만들고, HTML 제목·설명·가격 상태·행동이 정보를 전달한다. 그림의 별 지도와 관측 기구는 연출이다. 실제 차트, 계산의 정확성, 상담 내용의 품질 또는 생성된 문양의 개수를 증명하지 않는다.

**Key Characteristics:**

- 장면 → 큰 제목 → 체계명 → 설명 → 질문 주제 → 가격 상태 → 내용 살펴보기의 위계
- 크림·로즈의 밝은 표면과 네오·베다의 짙은 플럼 표면에 각각 대응하는 문자색
- 기존 출생정보·composer·DOM ID를 유지하는 native disclosure
- 입력 disclosure 밖에서 읽는 결과, 짧은 문단과 현실적인 행동 조언

정본은 `js/core/fortune-consultation-ui.js`, `styles/fortune-consultation-entry.css`, 해당 engine의 panel markup이다. 전역 문서의 가격·코인 관련 과거 표현은 이번 문서의 정책 근거로 사용하지 않는다. 이용권·월정석·단건 결제 용어와 기존 소유 controller를 유지한다.

## Colors

### Primary

로즈 강조색은 체계명·입력 근거 라벨·질문 예시·결과 소제목·포커스를 연결한다. 짙은 표면에서는 샴페인 강조색으로 같은 역할을 채운다. 주 행동은 밝은 모드의 딥 와인/밝은 글자, 어두운 모드의 샴페인/짙은 글자 조합이다.

### Neutral

종이·본문·보조문·경계·입력·행동의 여덟 역할이 CSS의 `--fc-*` 세트에 대응한다. `.neo-mode .fortune-consultation`과 `.fortune-consultation--vedic`은 이 역할을 함께 교체한다. 베다는 연이 모드에서도 짙은 표면이다. 래스터 장면은 모드 전환으로 다른 캐릭터 이미지가 되지 않는다.

**The Surface Pair Rule.** 이 표면의 색은 배경·본문·보조문·입력·행동을 한 세트로 읽는다. 전체 제품의 색상 토큰을 이번 국소 값으로 대체하지 않는다.

최종 리뷰의 밝은 본문/placeholder 대비 (7.36/7.62:1), 어두운 본문/placeholder 대비 (10.75/9.66:1)는 선언된 CSS 토큰의 계산값이다. 기존 modal 전체 자손의 실측 명암비 인증으로 확대하지 않는다.

## Typography

표면은 기존 `--font-display`를 제목에 쓰고 나머지 조작 UI의 서체를 상속한다. 정적 셸의 desktop display는 CodeDestinyDisplay, body는 CodeDestinyBody 및 시스템 한글 폴백이다. 셸의 모바일 (768px 이하 또는 coarse pointer) 규칙은 display를 body로 전환한다. 베다는 기존 Cinzel/serif display와 Pretendard Variable·한글 시스템 body 스택을 유지한다. 새로운 폰트나 의존성을 도입하지 않았다. 외부 origin을 차단한 캡처의 폴백 렌더링은 온라인 폰트 수신 증거가 아니다.

큰 제목은 명시적인 `<br>`와 `word-break:keep-all`로 두 문장 덩어리를 만든다. 넓은 상담 카드에서는 `cqi`를 이용해 제목 크기를 카드 폭에 맞춘다. 본문 설명은 keep-all, 결과는 `overflow-wrap:anywhere`다. 가격 숫자는 tabular-nums다.

**The Readable Input Rule.** 질문 textarea와 select의 글자는 고정 16px이고, 질문은 세로 resize 가능한 최소 140px 영역이다. 결과 본문은 최대 72ch, 문단 간격 1.2em이며 소제목으로 흐름을 나눈다. 기존 formatter와 리포트 내용을 새 고정 8챕터 구조로 바꾸지 않는다.

## Layout

외곽 상담 카드는 1px 경계, `min-width:0`, `overflow:hidden`, inline-size container `fc-consultation`, 세로 margin 24px, scroll-margin-top 100px이다. 새 wrapper로 기존 modal 폭을 교체하지 않는다.

| 조건 | 실제 동작 |
| --- | --- |
| 기본/좁은 카드 | 한 열, 위 장면은 16:10, 아래 copy는 모바일 padding |
| 상담 카드 inline-size ≥680px | 설명:장면 약 1:1.08, 각 트랙 `minmax(0,…)`, 장면 오른쪽·최소 높이 480px |
| picture viewport ≤759px | 640px WebP 선택 |
| picture viewport >759px | 1280px WebP 선택 |

카드의 container breakpoint와 이미지 선택의 viewport breakpoint는 다른 기준이다. 1440px desktop에서도 베다의 실제 카드 폭 약 446px은 세로 배치를 유지한다. 넓은 copy는 좌우 32px, form body와 report도 같은 좌우 inset을 사용한다.

장면은 `object-fit:cover`, `object-position:65% center`이며 HTML img의 선언 크기는 1280×853, lazy loading과 async decoding을 사용한다. 모바일 crop과 desktop 배치를 위한 코드 값이지 원본 PNG의 측정 크기 주장은 아니다.

**The Shrinkable Track Rule.** 서양 점성술의 기존 `#astroModalOverlay #astroBodyWrap.fr-report` 단일 트랙은 `styles/basic-fortune-library.css`의 `grid-template-columns:minmax(0,1fr)`를 사용한다. 부모 283px 안에 306px 카드가 남던 360px 잘림의 원인을 이 트랙에서 해결했다. 상담 카드의 추가 clip 오버라이드로 숨기지 않았다.

## Elevation & Depth

새 상담 표면은 평평한 종이·입력 바탕·얇은 경계로 구분한다. 이번 CSS에 새 shadow, glow 또는 animation/transition 토큰은 없다. 천·황동·달빛의 깊이는 네 장의 래스터 장면이 담당한다. hover는 주 행동의 `brightness(1.12)`, 포커스는 강조색의 3px outline과 4px offset이다. 펼치기 이동은 `behavior:'instant'`다.

## Shapes

상담 외곽은 큰 둥근 모서리, 행동·입력은 그보다 작은 둥근 모서리, 예시 버튼은 가장 작은 곡률을 쓴다. primary 높이는 최소 48px, 질문 예시와 form 안 버튼은 최소 44px, details summary는 최소 52px이다. 네이티브 summary marker를 CSS로 새 아이콘으로 대체하지 않았다.

## Components

### 체계별 진입 카드

`CodeDestinyConsultationUI.entry(service, formId)`가 같은 구조를 네 체계에 적용한다. topic은 비상호작용 목록이고, 카드마다 질문 예시 두 개가 있다. 체계별 이름·근거·예시는 helper의 `services` 객체에서 관리한다.

| service | 이름 | 해석의 바탕 | 기존 panel / details / question / answer |
| --- | --- | --- | --- |
| ziwei | 자미두수 궁성 상담 | 명궁·관록궁·재백궁과 주요 별 | zwDeepAiPromptPanel / zwConsultationForm / zwDeepAiPromptQuestion / zwDeepAiAnswer |
| sukuyo | 숙요점 달빛 상담 | 계산된 본명숙과 숙요 성향 | sySoloAiConsultCard / syConsultationForm / sySoloAiQuestion / data-sy-ai-answer |
| astrology | 서양 점성술 차트 상담 | 출생 차트 행성·하우스·주요 각도 | astroAiPromptSection / astroConsultationForm / astroAiPromptQuestionInput / astroAiPromptAnswer |
| vedic | 베다 점성술 별빛 상담 | 라시·나크샤트라·계산된 다샤 | vedicConsultation / vedicConsultationForm / vedicAiQuestion / vedicAiAnswer |

예를 들어 서양 점성술의 질문 예시는 “하고 싶은 일과 주변의 기대가 달라 고민이에요. 제 차트에서 어떤 강점을 먼저 살려볼 수 있을까요?”다. 베다는 다샤 흐름과 준비를 묻는다. 서로 다른 체계의 설명을 하나의 계산 근거로 합치지 않는다.

### Native details와 질문 입력

“상담 내용 살펴보기” button은 `aria-controls`로 해당 details를 연결한다. 기존 details를 열고 instant scroll 후 첫 editable textarea에 focus한다. capture 단계의 Enter 동작은 button의 native keyboard activation이다. details 자체도 native summary로 열고 닫으며 capture listener의 toggle 이벤트가 외부 button의 `aria-expanded`를 동기화한다.

`formIntro`는 무료 차트와 질문 상담의 차이, 상담 근거, 계산에 사용한 출생정보를 먼저 보여준다. 별도 profile form을 만들지 않고 위 입력 수정·재계산을 안내한다. 질문 예시는 기존 textarea에 값을 넣고 bubbling `input` 이벤트를 발생시켜 기존 글자 수·composer 상태를 갱신한다. 네 textarea 모두 기존 maxlength 1000을 유지한다. 자미두수는 기존 상담 주제 select와 그 주제별 예시도 유지한다. 서양 최소 글자 수는 기존 상수를 표시하며 검토 캡처에는 최소 5자가 보인다.

### 행동·상태·결과

입력의 주 행동은 “상담 시작하기”다. 생성·복구·다시 상담·복사·프롬프트 disclosure는 기존 controller와 state가 소유한다. 베다의 inFlight/paidEvidence에 따른 기존 버튼 문구도 이 계층이 소유하며, 화면 기록이 새로운 재결제/환불/혜택 정책을 만들지 않는다. 상태 컨테이너는 `role=status`, `aria-live=polite`이고 결과 `.fc-report`는 입력 details 밖에 있다. 기존 보조 동작과 prompt 표시가 모든 상태에서 fixture 검증된 것은 아니다.

**The Price Ownership Rule.** 가격은 helper의 `CodeDestinyFeaturePricingStore.getOrLoad(service + '_ai_prompt_generator')`에서 받아 `displayPrice`로 표시한다. 최초는 “가격 확인 중”, 저장소 부재·실패 또는 표시값 부재는 “결제창에서 확인”이다. “이용권·월정석은 결제창에서 확인”은 가격 표시와 권리 판정을 구분한다. UI badge는 권리를 지급하지 않으며 실제 gate·주문·인증·복구·보관함·API·DB는 기존 controller를 유지한다. 캡처의 5,000원은 fixture registry의 값으로 실제 현재 판매가격을 증명하지 않는다.

### 자산 출처

`docs/design/fortune-consultation-ux/basic-entry-assets-v1.json`이 네 서비스의 정확한 생성 prompt, identity reference `public/icons/app-logo-512.webp`, generator `built-in image_gen`을 기록한다. 원본은 같은 문서 디렉터리의 `{service}-yeoni-entry-v1-original.png` 네 장, 배포 파생본은 `public/images/consultation/{service}-yeoni-entry-v1-{640,1280}.webp` 여덟 장이다. prompt는 원본 metadata와 WebP의 `.json` sidecar에도 보존된 자산 기록을 따른다. 문서화 단계에서 새 이미지 호출·이미지 변경은 없다. 공개 URL은 `/images/consultation/…`이고 생성 metadata의 서비스별 천문 장면은 사실 계산 차트가 아니다.

### 검증 근거와 경계

`artifacts/fortune-consultation-ux/basic-entry-v1`에 entry/form 각 16장, result/neo 각 4장으로 총 40 PNG, contact sheet 3장, `metrics.json`이 있다. entry/result/neo는 component 캡처이고 form은 실제 기존 modal 또는 베다 페이지의 viewport 캡처다. 네 서비스 ×360/390/430/1440px의 16 시나리오에서 metrics는 overflow false, keyboardDisclosure true, exampleInput true를 기록한다. verifier 소스는 조상 clip bounding, 44px 행동, 예시 값·글자 수·maxlength·16px textarea, 390px에서 root font 200%의 카드 overflow도 검사한다. 이는 native 실기기 또는 운영 거래 검증이 아니다.

모든 API는 mock, 모든 외부 origin은 차단했고 실결제·실 LLM·운영 DB 작업은 없다. result는 명시적인 화면 렌더링 fixture이며 실제 상담·저장 결과가 아님을 화면에 표시한다. 가격도 fixture다. metrics의 브라우저 오류는 `google_translate_script_failed` 1건이며 verifier는 외부 번역 스크립트 차단에 따른 이 오류만 허용한다. 성공 기록을 오류 0건으로 바꾸지 않는다.

`basic-entry-finish-review.md`의 최종 `disposition:ship`은 앞선 전체 검토의 남은 수정 1건, 서양 360px 단일 트랙 잘림, 그리고 그 수정의 390/430/1440px 회귀 여부에 한정된 fresh generic reviewer 판정이다. named preset 또는 별도 승인 comp가 실행·제공됐다고 주장하지 않는다. reviewer는 캡처와 소유 스타일을 직접 확인했으며 detector를 재실행하지 않았다. 선언된 대비·detector advisory·이전 전체 검토를 새 전체 품질 점수로 승격하지 않는다. 이번 문서화 단계는 기존 파일·metrics·review를 읽고 두 문서만 작성했으며 검사·캡처·UI 변경을 새로 수행하지 않았다. CI·배포·실제 상담 품질·상거래 결과는 이 디자인 기록의 증거 범위 밖이다.

## Do's and Don'ts

- **Do** 이번 표면의 container 폭과 이미지 viewport 조건을 구분한다.
- **Do** 질문 예시를 기존 input 이벤트와 controller에 연결한다.
- **Do** 출생정보와 결과 렌더링의 기존 DOM ID·소유권을 유지한다.
- **Do** fixture·선언 토큰 대비·component 캡처·viewport 캡처의 범위를 명시한다.
- **Don't** 그림의 별·문양·기구를 계산 정확성 또는 상담 품질 증거로 사용한다.
- **Don't** 문서의 가격 예시를 현재 판매가격·권리·혜택으로 하드코딩한다.
- **Don't** 기본 상담 확장을 별도 `/…-ai` 상품, 사주 품질, 전역 디자인 재정의로 확대한다.
- **Don't** 마지막 수정의 ship 판정을 배포·실거래·새 전체 품질 검증 완료로 표시한다.
