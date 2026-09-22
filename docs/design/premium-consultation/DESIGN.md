---
name: Code Destiny Premium Consultation
description: 인생의 책과 연애 비책의 구매 전 소개·입력·결과를 연결하는 지역 디자인 정본
colors:
  book-background: "#152721"
  book-ink: "#f6ecd7"
  book-muted: "#d3c7aa"
  book-line: "#536656"
  book-accent: "#eddbaf"
  book-surface: "#20362a"
  book-detail-paper: "#f6f1e6"
  book-detail-muted: "#52624d"
  book-detail-accent: "#285640"
  book-detail-tint: "#e5e9dc"
  book-detail-line: "#c9cbb7"
  sample-paper: "#fffdf8"
  letter-background: "#f6f2ed"
  letter-surface: "#fffcf8"
  letter-input: "#f7f0ed"
  letter-sunken: "#efe5e1"
  letter-ink: "#35262c"
  letter-muted: "#71545f"
  letter-accent: "#763d53"
  letter-line: "#e0d3cc"
  letter-control-line: "#a7828e"
  letter-dark-background: "#251c22"
  letter-dark-surface: "#30242b"
  letter-dark-input: "#392b33"
  letter-dark-ink: "#f8ecee"
  letter-dark-muted: "#d6bdc7"
  letter-dark-accent: "#e5b4c7"
  letter-dark-line: "#58434e"
  letter-dark-control-line: "#a98797"
typography:
  display:
    fontFamily: "var(--font-serif)"
    fontSize: "clamp(30px, 3.4vw, 46px)"
    fontWeight: 700
    lineHeight: 1.5
  cover-title:
    fontFamily: "var(--font-serif)"
    fontSize: "clamp(24px, 2.7vw, 38px)"
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: "var(--font-body)"
    fontSize: "16px"
    lineHeight: 1.9
  label:
    fontFamily: "var(--font-body)"
    fontSize: "14px"
    lineHeight: 1.7
  sample-body:
    fontFamily: "var(--font-serif, Georgia, serif)"
    fontSize: "18px"
    lineHeight: 2
rounded:
  entry: "6px"
  field: "16px"
  pill: "9999px"
spacing:
  compact: "12px"
  inline: "20px"
  section: "24px"
  wide: "32px"
components:
  button-book-start:
    backgroundColor: "{colors.book-accent}"
    textColor: "{colors.book-surface}"
    rounded: "{rounded.entry}"
    padding: "12px 24px"
  button-letter-start:
    backgroundColor: "{colors.letter-accent}"
    textColor: "{colors.letter-surface}"
    rounded: "{rounded.entry}"
    padding: "12px 24px"
  letter-input:
    backgroundColor: "{colors.letter-input}"
    textColor: "{colors.letter-ink}"
    rounded: "{rounded.field}"
    padding: "0 16px"
  letter-choice:
    backgroundColor: "{colors.letter-input}"
    textColor: "{colors.letter-ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
  letter-choice-selected:
    backgroundColor: "{colors.letter-accent}"
    textColor: "{colors.letter-surface}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
---

# Design System: Code Destiny Premium Consultation

## Overview

**Creative North Star: "나만의 책과 비밀 편지"**

인생의 책은 짙은 녹색 천 제본과 금박 문양, 연애 비책은 아이보리 종이와 봉투·와인색 봉인으로 개인적인 기록물의 감각을 만든다. 구매 전에는 받을 결과물의 재질과 상담 범위를 먼저 보여주고, 결과에서는 같은 에셋과 한국어 명조가 긴 해설의 읽기 흐름을 잇는다.

이 정본은 두 상품의 구매 전 소개·입력, 상세 소개·팝업 공용 패널과 기존 결과의 시각적 연속성에만 적용한다. 전역 DESIGN.md, 영냥이·연이 정체성, 다른 전문가 상담군을 대체하지 않는다. 확정된 [Direction contract와 자산 출처](../../premium-consultation-design-20260923.md)를 구현 이후 기록한 scan 문서다. 원본 이미지를 새로 생성하거나 기존 결과 화면을 이번 확장에 맞춰 재작성하지 않았다.

**Key Characteristics:**
- 실제 책·편지 래스터와 별도 HTML 텍스트.
- 한국어 명조 제목과 읽기 쉬운 본문·입력 레이블.
- 표면·잉크·강조색이 함께 바뀌는 연애 비책 테마.
- 소개 CTA에서 입력으로 이어지는 모바일 동선.

## Colors

녹색 제본의 밝은 잉크와 편지의 차분한 와인색을 상품별로 유지한다. 위 frontmatter는 구현에서 재사용되는 값의 기록이며 런타임 정본은 CSS 모듈이다.

### Primary
- **제본 골드**: `book-accent`는 책 소개 CTA와 선택 강조를, `book-surface`는 그 위 잉크와 폼 표면을 담당한다.
- **편지 와인**: `letter-accent`는 편지 소개·입력·결과의 주요 행동과 강조에 사용한다. 어두운 테마에서는 `letter-dark-accent`와 어두운 표면을 짝지어 쓴다.

### Neutral
- **숲색 독서 공간**: `book-background`는 구매 전과 결과 독서 공간을 연결한다. 소개의 주·보조 잉크와 경계는 `book-ink`, `book-muted`, `book-line`이다.
- **편지 면지와 잉크**: `letter-*` 표면·잉크·경계는 입력과 결과가 공유하는 reportTheme에서 가져온다. `letter-dark-*`는 같은 역할의 어두운 테마 쌍이다.
- **책 내지와 편지 면지의 상세 패널**: 책 상세의 읽기 영역은 `book-detail-*`와 `book-surface` 잉크를 사용한다. 상세 편지는 기존 밝은 `letter-*`를 재사용한다. 두 상품 예시 내지의 `sample-paper`는 밝은 종이와 어두운 잉크의 고정 쌍이다. 이 상세 패널을 입력의 어두운 테마로 임의 치환하지 않는다.

**The Paired Surface Rule.** 테마를 바꿀 때 표면·주 잉크·보조 잉크·강조색·입력 경계를 함께 바꾼다. 밝은 래스터 편지지 위의 텍스트는 어두운 잉크를 유지한다.

## Typography

**Display Font:** 전역 `--font-serif`. CodeDestinySerifLatin 뒤에 한국어 CodeDestinySerifKR 명조와 한자 전용 CodeDestinyHan, 명조 대체 서체가 이어진다.
**Body Font:** 전역 `--font-body`. CodeDestinyHan, CodeDestinyBody, Pretendard 및 OS 본문 서체를 사용한다.

구매 전 두 상품은 같은 display/cover-title/body 위계를 쓴다. 결과의 제목·장문은 기존 `--font-premium`을 유지한다. 이는 한국어 명조를 포함하는 기존 전역 스택이며 지역 문서에서 재정의하지 않는다.

### Hierarchy
- **Display**: 결과물 옆 소개 제목. 모바일에서는 (28px)로 줄인다.
- **Cover title**: 실제 이미지 위 HTML 제목. 모바일에서는 (23px)로 줄인다.
- **Body**: 상담 설명. 읽는 폭은 최대 (42em), 모바일 글자 크기는 (15px)다.
- **Label**: 상담 범위와 준비 정보. 긴 한국어는 `keep-all`, 제목·사용자 입력값은 긴 단어 넘침도 처리한다.

**The Live Text Rule.** 제목·설명·가격을 이미지에 굽지 않는다. 실제 텍스트와 기존 번역 사전을 유지한다.

## Layout

공통 구매 전 컨테이너는 최대 (1200px), 데스크톱 패딩은 위 (88px)·좌우 (32px)·아래 (112px)다. 소개는 결과물 왼쪽·설명 오른쪽의 두 열이고 이미지 열은 (260–390px), 간격은 `clamp(32px, 5vw, 80px)`다. (700px) 이하에서는 단일 열과 좌우 (20px) 여백, 폭 (220px)의 작은 결과물로 바뀐다.

책 표지는 (3:4), 편지는 (4:5)의 제작 비율을 유지한다. 소개의 원본 비율 원칙을 긴 결과 편지 내지의 별도 배경 배치까지 기계적으로 확대하지 않는다. 책 입력은 준비 안내보다 폼 열을 넓게 (1:1.55) 두고 모바일에서 폼을 먼저 읽는다. 편지 입력은 남는 폭을 폼에, (320px)를 안내에 배정하며 (900px) 이하에서 단일 열로 바뀐다.

소개 CTA의 목적지는 기존 입력 영역이다. 폼의 스크롤 여백 (88px)으로 전역 내비게이션 아래에 입력 시작점을 둔다. 결과의 독서 컨테이너·내지·목차·페이지 이동은 기존 결과 구현을 따른다.

상세 소개 페이지와 기존 팝업의 공용 패널은 최대 (880px) 안에서 같은 원본 비율의 표지와 HTML 제목을 쓴다. 표지 최대 폭은 (280px), (699px) 이하에서는 (190px)다. 상세의 두 열은 모바일에서 단일 열이 된다. 이 값은 입력 소개의 (220px) 표지와 구분한다. 일자가 있는 원문 링크는 데스크톱에서 일자·제목·원문 보기 순으로, 모바일에서는 일자를 별도 행으로 보여준다.

## Elevation & Depth

주된 깊이는 래스터의 천·종이·봉인과 표면 대비에서 나온다. 입력의 모든 블록에 그림자를 덧대지 않는다. 편지의 고정 행동 영역과 결과 영역은 기존 reportTheme의 약한 ambient shadow를 공유한다. 라이트/다크 shadow와 포커스 링의 정확한 CSS는 sidecar에 기록한다. 기존 결과의 책 표지와 내지 그림자는 해당 결과 모듈의 소재 표현이며 공통 입력 그림자로 승격하지 않는다.

## Shapes

소개 CTA와 책 폼은 작은 `entry` 모서리를 공유한다. 연애 입력의 필드와 단계 행동은 기존 `field` 모서리, 관계 선택은 `pill`을 유지한다. 결과의 종이 모서리와 입력 컨트롤의 둥근 모서리는 역할이 다르므로 단일 값으로 통일하지 않는다.

## Components

### Buttons
소개 시작 버튼은 최소 높이 (48px), hover 밑줄, 바깥 focus-visible 윤곽으로 행동을 표시한다. disabled는 대기 커서와 opacity (.65)를 사용한다. 두 상품의 시작 버튼은 동일한 구조에 각 상품의 색 쌍을 사용한다. 시작은 입력으로 이동하며 구매·생성을 실행하지 않는다.

### Inputs / Fields
연애 비책의 이름·생일·시간은 최소 높이 (48px), 표면 2와 control 경계, 기존 공용 포커스 링을 쓴다. 비활성 상태와 오류·안내 텍스트는 기존 입력 상태 계약을 유지한다. 책 입력의 모드·성별·달력 선택도 기존 동작과 명확한 선택 상태를 보존한다.

### Chips
관계 선택은 실제 선택 가능한 버튼이다. 비선택은 입력 표면과 control 경계, 선택은 accent와 accent-ink 쌍을 쓴다. 소개의 상담 범위는 배지 카드가 아닌 줄바꿈 가능한 텍스트 목록이다.

### Cards / Containers
책 폼은 얇은 선과 어두운 표면으로 구분한다. 편지 폼은 기존 reportTheme의 표면·경계를 사용한다. 결과 내지와 장별 해설은 기존 독서 컴포넌트에 맡긴다.

### Detail preview / Source records
상세 결과 예시는 두 상품 모두 그림자 없는 사각 종이 내지와 `sample-body` 명조 본문으로 읽는다. 내부 여백은 데스크톱 (36px 30px), 모바일 (28px 20px)다. 실제 개인 결과와 혼동하지 않도록 예시 안내를 유지한다. 상세 행동 버튼은 기존 가격·이용 방식에 연결하고 두 재질에서 평면 색과 작은 `entry` 모서리를 공유한다.

네오 경력·날짜가 있는 세 원문 링크·AI 해석 방식은 기존 founder/records 정본에서 가져온다. 경력과 원문을 새 광고 배지로 꾸미지 않고 명조 소제목과 구분선이 있는 목록으로 보여준다. 링크 터치 높이는 최소 (44px)다. 팝업의 닫기·포커스·이력·결제 제어 소유권은 기존 호스트에 남긴다.

### Navigation
연애 비책의 이전/다음 단계는 최소 높이 (48px)의 기존 고정 행동 영역을 유지한다. 첫 단계의 이전 버튼만 disabled다. 전역 뒤로가기는 밝은 바탕 위에서도 읽히는 대비의 배경과 잉크를 유지한다. 단계 전환·진행 레일의 기존 transform 모션과 reduced-motion 대응은 보존한다.

## Do's and Don'ts

### Do:
- **Do** 같은 책·편지 에셋을 구매 전과 결과에 연결하고 실제 HTML 텍스트를 유지한다.
- **Do** 한국어 명조 로드, 작은 화면의 폼 폭, 키보드 포커스와 밝고 어두운 테마를 함께 확인한다.
- **Do** 가격은 PriceBadge와 기존 registry에서 읽고 이용권·월정석·단건 결제 의미를 유지한다.

### Don't:
- **Don't** 이번 두 상품의 지역 세계를 전역 캐릭터나 다른 전문가 상담에 덮어쓴다.
- **Don't** 래스터에 제목·가격을 굽거나 소개 이미지를 임의 크롭한다.
- **Don't** 새 혜택·보장 문구·결제 행동을 디자인 개선에 섞는다.
- **Don't** 단발성 장식·기존 영문 eyebrow·범위 밖 잔존 요소를 새 화면의 규칙으로 복제한다.
