---
name: Yeoni Salon
description: 연이 운명 상담의 꽃빛 아이보리·로즈 입력 및 결과 표면
colors:
  salon-paper: "#fffaf7"
  salon-surface: "#ffffff"
  salon-ink: "#462c3b"
  salon-muted: "#765c69"
  salon-rose: "#963c5b"
  salon-wash: "#f6e9e9"
  salon-line: "#e7d8dc"
typography:
  display:
    fontFamily: "var(--font-display), serif"
    fontSize: "clamp(26px, 3vw, 38px)"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-.025em"
  prompt:
    fontSize: "21px"
    fontWeight: 650
    lineHeight: 1.45
  input:
    fontSize: "16px"
    lineHeight: 1.8
rounded:
  welcome: "20px"
  reading: "16px"
  question: "14px"
  action: "12px"
  topic: "8px"
---

# 연이 상담 표면: 꽃빛 살롱

## Overview

2026-10-19 구현 기준. Operate 모드의 범위 한정 문서다. `/fortune-chat/`와 `/fortune-tea-house/?counsel=letter`의 연이 상담에 적용하며, 전역 디자인 시스템이나 네오 상담의 시각 규칙으로 확대하지 않는다.

따뜻한 찻집 환영 장면에서 질문 작성으로 자연스럽게 이동한다. 인간형 연이는 환영을, 꽃돼지 연이는 단계별 질문 안내를 맡는다. UI는 짧고 차분하게, 결과는 충분한 행간으로 읽게 한다. 구현 정본은 `app/fortune-chat/yeoni-salon.module.css`, `ConsultationIntake.tsx`, `YeoniWelcome.tsx`다. 자산 출처·생성 프롬프트·변경 범위 정본은 [기존 설계 기록](../../docs/design/yeoni-salon.md)을 따른다.

## Colors

위 토큰은 `.room, .loading` 안에 선언된 실제 값이다. 아이보리는 전체 바탕, 흰색은 입력·결과 표면, 짙은 잉크는 본문·가격, 낮은 채도의 보조색은 설명에 사용한다. 로즈는 주 행동·선택·포커스, 옅은 로즈는 선택 표면·질문 인용, 선 색상은 구획과 테두리를 맡는다. 기존 상담의 지역 변수에 연결하되 전역 토큰을 교체하지 않는다. 가격은 `.price`의 잉크 색상과 650 굵기로 읽힘을 확보한다.

## Typography

기존 로컬 폰트 변수 `--font-display`와 `--font-body`를 재사용한다. 환영 제목은 위 display 정의, 700px 이하에서는 24px다. 단계 제목은 21px/650에서 모바일 18px로 바뀐다. 안내 본문은 14px/1.75, 모바일 13px다. 질문 입력은 16px/1.8, 확인 질문은 17px/1.8이며 결과 문단 행간은 1.95다. 한글 제목과 안내는 `word-break: keep-all`, 질문 확인은 `white-space: pre-wrap`과 `overflow-wrap: anywhere`를 사용한다.

## Layout

- 상담 방은 `100dvh`이고 타임라인 최대 폭은 1080px다. 기본 타임라인 여백은 `24px 20px 48px`, 구간 간격은 24px다.
- 입력과 결과 최대 폭은 760px, 보조 안내는 704px다. 입력 내부 여백은 `12px 28px 0`이다. 해석 방식은 두 열로 배치한다.
- 700px 이하: 타임라인 좌우 여백을 없애고 입력은 좌우 20px, 결과는 화면보다 24px 좁게 둔다. 하단은 safe-area를 포함한다. 주 행동은 남은 가로 폭을 채운다.
- 환영 장면은 기본 최소 높이 260px, 모바일 225px다. 모바일 설명 영역은 61%, 그림 위치는 `65% center`다.
- 900px 이상: 환영 최소 높이 360px, 그림은 오른쪽 54%와 `right center`로 배치한다. compact 장면은 최소 320px, 그림 폭 49%다. 데스크톱 설명 영역은 50%다. 인물 머리가 잘리지 않는 현재 구도를 유지한다.

## Elevation & Depth

상담 헤더·결과 패널은 그림자 없이 바탕색과 1px 선으로 구분한다. 헤더의 backdrop filter도 제거한다. 깊이는 그림 속 장면과 차분한 색면이 담당한다. 주 행동 hover는 `brightness(.92)`, 비활성 버튼은 opacity `.48`이다.

## Shapes

환영 장면 20px, 결과 패널 16px, 입력·질문 인용 14px, 행동·해석 선택 12px, 예시·주제 8px의 모서리를 사용한다. 모바일 환영 장면은 전체 폭에 맞춰 모서리를 없앤다. 단계 번호와 선택 표식은 원형이며 과한 장식 프레임은 추가하지 않는다.

## Components

**상담 입력:** 질문 작성 → 해석 방식 → 내용 확인의 세 단계다. 다음 단계는 질문과 준비 상태를 확인하고, 이전 단계와 질문 수정은 부모가 보유한 입력을 재사용한다. 마지막 행동은 기존 `onCreate`로 연결된다. 사주·자미두수·숙요·베다점·서양 점성술·타로를 구분하며 타로에서는 프로필 대신 기존 타로 주제 목록을 보여준다.

**접근성:** 단계 탐색은 `nav`와 `aria-current="step"`, 선택 버튼은 `aria-pressed`, 해석·타로 주제는 `fieldset`/`legend`다. 질문은 연결된 label·도움말을 가지며 최대 300자를 입력한다. 단계가 바뀌면 `tabIndex=-1` 제목으로 포커스를 옮긴다. 조작 요소의 `focus-visible`은 로즈 2px 외곽선과 4px 간격이다. 링크·단계·보조 행동은 최소 44px 높이, 주 행동은 52px다. reduced-motion에서는 transition을 없앤다. 미래나 상대 마음을 확정하지 않는 AI 상담 안내를 유지한다.

**이미지:** `salon-welcome-v1.webp`는 인간형·꽃돼지 연이가 함께 있는 환영 장면이며 의미 있는 alt를 가진다. 투명 `salon-companion-v1.webp`는 단계 안내의 장식 이미지로 빈 alt를 쓴다. 제목과 문구는 이미지에 합성하지 않고 HTML로 유지한다. 출처와 정확한 생성 기록은 위 설계 기록을 참조한다.

**기존 계약:** 금액은 `PriceBadge(featureKey="fortune-chat-consultation")`, 대체 수단 수량은 기존 `HONEY_COST`를 참조한다. 현재 소스의 이용 수단 표현을 이 문서에서 새로운 정책으로 해석하거나 확장하지 않는다. 로그인·프로필·생성·결제 복귀·결과 재열람은 기존 컨트롤러 책임이다. 찻집·지난 상담 링크와 `/fortune-chat/`의 기존 noindex 및 메타데이터 경계를 보존한다.

## Do's and Don'ts

- Do: 이 문서의 표면 범위와 지역 CSS 토큰을 유지한다. 실제 동작과 가격 데이터는 기존 정본을 참조한다.
- Do: 모바일 입력·결과를 분리해서 확인하고 선택·포커스·비활성 상태를 함께 점검한다.
- Don't: 시각 변경을 위해 결제·인증·API·DB 계약을 바꾸거나 새 혜택을 주장하지 않는다.
- Don't: 인간형 환영 장면과 꽃돼지 안내의 역할을 뒤섞거나 이미지에 UI 글자를 넣지 않는다.

검증 기록: 상위 작업에서 외부 네트워크를 차단한 API mock fixture가 360/390/430/1440px의 질문·해석·확인·결과와 입력 보존, 타로 프로필 생략, 실패 후 재시도, 완료 결과 재열람을 통과했다. 독립 시각 리뷰는 원본 16장 및 가격 대비·데스크톱 인물 크롭 수정 후 2장을 확인했고 두 문제는 해결되었다. 기계 검사 결과는 `[]`였다. 캡처 위치는 `C:/Users/user/.codex/visualizations/2026/10/19/01a15318-1710-7ac0-a84b-61f0f21f1d41/yeoni-salon`이다. 이는 실제 결제·LLM·운영 DB·배포 검증을 뜻하지 않는다.
