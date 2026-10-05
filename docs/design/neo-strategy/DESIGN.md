---
name: Code Destiny Neo Strategy
description: 네오 상담 진입·결과·전략서의 구현된 시각 체계
colors:
  neo-bg: "#0a0818"
  neo-surface: "#13102a"
  neo-text: "#f4eeff"
  neo-muted: "#c3bacf"
  neo-accent: "#c4b5fd"
  neo-gold: "#e8d5a3"
typography:
  display:
    fontFamily: "var(--font-display)"
    fontSize: "clamp(1.5rem, 3vw, 2.05rem)"
    lineHeight: 1.25
  body:
    fontFamily: "var(--font-body)"
    fontSize: "1rem"
    lineHeight: 1.8
rounded:
  sm: "8px"
  control: "12px"
  document: "14px"
  card: "20px"
  section: "26px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  reading: "28px"
---

# Design System: 네오 전략실

## Overview

은발·푸른 눈·금장 판타지 코트의 기존 네오를 유지하고, 조언을 편하게 꺼내는 서재와 정돈된 상담문을 연결한다. 네이비 퍼플과 샴페인 골드는 루트 [DESIGN.md](../../../DESIGN.md)의 네오 세계관을 따른다. 이 문서는 해당 표면의 구현 기록이며 전역 정본을 대체하지 않는다.

진입은 인물·공간 일러스트로, 결과는 판단과 행동을 읽는 여백으로 구분한다. 전략서 리더는 현재 테마의 `--cd-*`를 사용하므로 모든 화면이 고정 다크인 것은 아니다. 화면별 흐름·검증 범위는 [surface brief](../../../.impeccable/surfaces/neo-strategy.md)에 기록한다.

## Colors

Primary는 `neo-accent`, Secondary는 `neo-gold`, Neutral은 나머지 네오 색이다. 결과 CSS의 `--nr-bg/surface/text/muted/accent/gold`가 위 색에 대응한다. `neo-muted`는 결과 전용 보조 글자색이다.

결과 경계선은 `color-mix(in srgb, var(--nr-accent) 25%, transparent)`다. 전략서는 `--cd-bg/text/border`로 배경·글자·경계선을 함께 전환한다. 진입의 기존 CTA는 로컬 `--cd-cta-primary-*` 네이비 바탕과 밝은 글자, 금색 경계선을 유지한다.

## Typography

제목은 `--font-display`, 본문과 조작 요소는 `--font-body`를 사용한다. 결과 제목은 `--cd-t-display`, 절 제목은 `--cd-t-section`, 판단·소제목은 `--cd-t-card`, 보조 정보는 `--cd-t-body/caption`을 재사용한다.

결과 설명 본문은 1rem, 줄간격 1.75~1.8이다. 전략서 본문은 줄간격 1.85, `white-space: pre-wrap`으로 보관된 문단을 유지한다. 긴 내용에는 `overflow-wrap: anywhere`를 적용한다. 전략서 제목은 `clamp(2rem, 5vw, 3.5rem)`이며 600px 이하에서 2rem이다.

## Layout

진입 소개는 최대 1120px, 설명 그림과 문구는 2열이며 640px 이하에서 1열이다. 히어로는 기존 전면 인물·하단 대화창 구성을 사용한다.

결과는 `--cd-w-prose`(760px) 안의 단일 열이다. 핵심 판단과 첫 행동이 본문 폭을 사용하고, 작은 네오 그림은 요약 제목 옆에 놓인다(64px, 680px 이하 48px). 선택 체계 안내는 본문 다음에 놓인다. 문서 간 간격은 28px이다.

선택형 전략 개요의 강점 비교·관계 지도는 2열, 반복 패턴은 3열이며 680px 이하에서 모두 1열이다. 전략서 목록은 최대 1040px, 읽기 본문은 74ch다. 결과 모바일 바깥 여백은 16px, 전략서는 600px 이하 18px이다.

## Elevation & Depth

진입은 그림·어두운 덮개·인물 레이어로 깊이를 만든다. 결과는 어두운 바탕과 한 단계 밝은 문서 표면, 얇은 경계선이 중심이다. 상단 광원은 바이올렛 6%의 방사형 빛이다. 전략서 표지에는 3도 기울기와 테마 배경색을 섞은 그림자가 있다. 배지·편지 등 기존 문서 장식은 남아 있다.

## Shapes

공용 `--cd-r-sm/control/card/section`을 재사용한다. 결과 문서 용지는 로컬 14px 곡률, 전략서 조작 버튼은 공용 control 곡률을 사용한다. 타임라인 점은 pill 곡률이며 대화 말풍선은 card와 sm을 조합한다.

## Components

- 결과 요약: 질문, 핵심 판단, 먼저 할 한 가지, 체계·주제·날짜 메타를 읽기 순서대로 배치한다.
- 전략 개요: 기본 닫힘인 네이티브 `details`; 비교·패턴·관계·행동 시각 설명은 사용자가 펼친다. 내보내기 시에는 확장한다.
- 원문 리더: 최초 상담과 수정 상담의 기존 렌더러를 보존하고 개별 장 펼침·전체 보기로 탐색한다. 공유는 문서 아래에 둔다.
- 전략서 선택: 완료 상담 체크박스 목록, 선택 개수, 휘장 잔액, 발급 안내, 보관 목록을 표시한다. 버튼 최소 높이는 44px이고 비활성은 opacity .55다.
- 포커스: 결과는 바이올렛 3px/offset 3px, 전략서는 현재 글자색 2px/offset 4px 외곽선이다. 장 화살표는 공용 duration/easing을 사용한다. 감소된 모션 설정에서 기존 대기·진입 애니메이션을 줄인다.
- 전략서 PDF: A4 표지 뒤 목차·상담별 장·행동 모음·원문 링크로 구성한다. 브라우저 CJK 글꼴을 canvas에 그려 JPEG 페이지로 저장하므로 텍스트 선택형 PDF는 아니다. 본문은 종이색 바탕과 짙은 잉크를 사용한다.

## Do's and Don'ts

- **Do** 기존 은발 네오와 퍼플·골드 정체성을 유지하고 읽는 글의 폭·대비를 먼저 확보한다.
- **Do** 현재 테마의 배경·글자·경계선을 함께 적용하고 장문·영문·모바일에서 줄바꿈을 확인한다.
- **Do** 이미지의 정확한 생성 프롬프트·참조·원본을 [자산 출처](../neo-strategy-assets.json)에서 추적한다.
- **Don't** 결과 상단을 여러 좁은 카드로 쪼개거나 장식을 판단·첫 행동보다 앞세운다.
- **Don't** 전략서에 새 AI 해석을 암시하거나 시각 검토를 실제 결제·운영 배포 검증으로 표현한다.

