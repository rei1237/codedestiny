---
name: Code Destiny Ziwei Consultation
description: 질문에서 해석과 근거로 이어지는 자미두수 심층 상담
colors:
  gold: "#d6bb80"
  background: "#09131e"
  surface: "#111f2e"
  text: "#f4f1e8"
  muted: "#b5c4d2"
  rule: "#354453"
typography:
  display:
    fontFamily: "CodeDestinySerifKR, serif"
    fontSize: "clamp(1.7rem,4vw,3rem)"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-.025em"
  headline:
    fontFamily: "CodeDestinySerifKR, serif"
    fontSize: "clamp(1.45rem,3vw,2rem)"
    lineHeight: 1.6
  body:
    fontFamily: "var(--font-body, 'Malgun Gothic'), 'Malgun Gothic', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.95
  label:
    fontFamily: "var(--font-body, 'Malgun Gothic'), 'Malgun Gothic', sans-serif"
    fontSize: ".8125rem"
rounded:
  control: "6px"
  disclosure: "8px"
  dialog: "12px"
spacing:
  small: "8px"
  control-gap: "12px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "10px 18px"
---

# Design System: Code Destiny Ziwei Consultation

## Overview

**Creative North Star: "별 지도로 읽는 상담서"**

이 문서는 자미두수 상담 입력·결과·저장 상담서에만 적용한다. 전역 디자인 시스템을 대체하지 않는다. 깊은 남색 바탕, 절제한 금색, 브랜드 명조 제목과 산세리프 본문으로 차분한 상담의 무게를 만든다. 사용자의 질문과 해석이 먼저 읽히고, 계산 근거는 필요할 때 펼쳐진다.

기준 구현은 `app/components/ziwei/ziwei-consultation.module.css`, `ZiweiConsultation.tsx`, `app/components/AdvancedZiweiSectionV2.tsx`다. PDF는 `lib/pdf/export-ziwei-report-pdf.ts`, `lib/pdf/typeset-writer.ts`, `lib/pdf/typeset-metrics.js`를 따른다. 상대 경로는 저장소 루트 기준이다. 구현 캡처는 이 문서 옆 `implementation/`에 있다.

## Colors

**Primary.** 금색은 선택한 질문, 현재 위치, 핵심 행동을 표시한다. 넓은 장식 면을 반복하기보다 사용자의 다음 행동을 찾는 데 쓴다.

**Neutral.** 남색 바탕과 한 단계 밝은 보조 표면, 따뜻한 밝은 본문색, 차분한 설명색, 얇은 구분선이 한 세트다.

**표면과 글자 동행 규칙.** 배경을 바꾸는 영역에서는 본문·보조 설명·선택 상태를 함께 확인한다. PDF 속지는 공용 조판기의 밝은 종이와 잉크 팔레트를 유지하며 화면의 남색 면을 모든 페이지에 복제하지 않는다.

## Typography

브랜드 명조는 결론과 질문의 위계를 만든다. 기존 `--font-body`는 긴 해석, 프로필, 조작 안내를 담당한다. 새로운 글꼴 다운로드를 이 화면의 전제로 추가하지 않는다.

**오래 읽는 본문 규칙.** 해석은 짧은 문단과 넉넉한 행간을 사용한다. 도입부는 최대 64ch, 상세 답변은 최대 72ch로 제한한다. 한국어는 단어 단위 줄바꿈을 우선하되 긴 문자열은 영역 밖으로 넘치지 않게 한다.

PDF 제목과 본문은 모두 기존에 등록하는 한글 본문 글꼴을 쓴다. 본문 크기와 페이지 분할은 공용 조판 상수를 유지한다. 화면의 명조 제목을 이유로 PDF에 별도 장식 글꼴을 추가하지 않는다.

## Layout

최대 폭은 1120px이다. 모바일의 한 줄 읽기 흐름을 기준으로 구성하며, 768px 이상에서는 양쪽 여백과 섹션 간격을 넓힌다. 질문 선택 입력은 작은 화면에서 2열, 넓은 화면에서 4열이다.

상단 섹션 이동은 가로 스크롤을 허용하고 현재 위치를 색과 밑줄로 표시한다. 고정 내비게이션의 높이와 안전 영역을 고려해 앵커 이동 대상에 여유를 둔다. 주요 행동은 줄바꿈할 수 있다.

**해석 먼저, 근거는 펼쳐서 규칙.** 여덟 질문은 세로 목록으로 둔다. 동시에 열린 답변은 최대 하나이며 모두 닫힌 상태도 허용한다. 세부 근거와 심층 명반은 기본적으로 접어 긴 기술 정보가 첫 결론을 밀어내지 않게 한다.

## Elevation & Depth

상담 표면의 깊이는 그림자보다 남색의 명도 차이와 얇은 구분선으로 만든다. 행동 조언은 보조 표면에 담고, 긴 답변마다 별도의 떠 있는 카드를 반복하지 않는다.

**별 지도의 재료감 규칙.** 표지의 최적화된 천체 지도 WebP는 배경 재료다. 모바일용 이미지를 선택하고, 이미지 위의 어두운 방향성 오버레이로 글자 주변의 대비를 확보한다. 별 지도가 실제로 보이는지와 글자가 편안히 읽히는지를 함께 확인한다. 불투명도·오버레이 원문은 sidecar에 기록한다.

## Shapes

컨트롤과 행동 조언의 작은 곡률, 심층 펼침 영역의 중간 곡률, 공유 대화상자의 넉넉한 곡률로 역할을 구분한다. 질문 목록은 상하 구분선을 사용한다. 둥근 카드의 반복으로 읽기 흐름을 잘게 나누지 않는다.

## Components

**행동 버튼.** 금색 채움은 현재 질문의 답 읽기 등 주요 행동에 사용한다. 보조 행동은 투명 바탕과 경계선으로 구분한다. 주요 행동 높이는 최소 48px이며, 버튼과 summary는 최소 44px를 유지한다. 키보드 포커스는 금색 외곽선으로 드러낸다.

**질문 펼침.** 열린 질문 제목을 금색으로 표시한다. Lucide Plus/Minus가 열림 상태를 보조하며 summary 자체의 의미와 키보드 조작을 유지한다. 표시용 아이콘을 텍스트 글리프로 치환하지 않는다.

**공유 대화상자.** 제목, 선택 가능한 요약 본문, 공유·복사 행동, 상태 안내 순서로 읽힌다. 작은 화면에서 내부 스크롤과 닫기 버튼의 터치 영역을 보장한다.

**저장 상담서.** 남색 표지와 천체 지도에서 밝은 종이의 목차·장별 본문으로 전환한다. 화면의 펼침 상태와 무관하게 전체 내용을 검색 가능한 텍스트로 조판한다. 표지 장식 로딩 실패가 텍스트 저장을 막지 않는다.

**움직임 절제 규칙.** 읽는 표면에 상시 장식 애니메이션을 추가하지 않는다. 움직임 감소 설정에서는 애니메이션·전환을 끄고 스크롤을 즉시 이동으로 처리한다.

## Do's and Don'ts

- **Do** 모바일에서 결론, 질문, 다음 행동 순서가 유지되는지 확인한다.
- **Do** 천체 지도의 질감과 글자 대비를 함께 검토한다.
- **Do** 키보드 포커스, 44px 이상 조작 영역, 긴 한국어 문장의 줄바꿈을 유지한다.
- **Do** PDF의 검색 가능한 한글, 장 제목, 본문과 쪽번호의 분리를 보존한다.
- **Don't** 기존 심층 명반의 개별 기술 색상을 새로운 상담 팔레트로 일반화한다.
- **Don't** 개발 도구 표시나 캡처용 상태를 서비스 구성요소로 기록한다.
- **Don't** 이 문서의 남색 상담 분위기를 다른 캐릭터나 서비스 전체에 적용한다.
