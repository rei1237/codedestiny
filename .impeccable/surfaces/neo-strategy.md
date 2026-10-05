# 네오 전략실

## Scope

- 진입 `/neo-operation-room/`, 기존 결제 진입, 상담 결과, `/neo-operation-room/strategy-books/`, 전략서 PDF, 홈 전략실 링크.
- Mode: 진입·홈은 Persuade, 고민 입력·전략서 선택은 Operate, 상담 결과·전략서·PDF는 Read.
- 시각 정본: [표면 DESIGN.md](../../docs/design/neo-strategy/DESIGN.md), 공통 토큰은 루트 [DESIGN.md](../../DESIGN.md)와 `styles/theme-tokens.css`.

## Direction contract

THESIS: 위압적인 작전 명령보다 고민을 꺼내고 실행할 한 가지를 찾는 상담. 결과 첫 화면은 폭을 나눈 장식 카드 대신 판단과 행동을 읽는 한 열이다.

OWN-WORLD: 기존 은발·푸른 눈 네오, 네이비 퍼플 금장 코트, 샴페인 골드, 조용한 서재. 결과는 네오 팔레트, 전략서 리더는 현재 `--cd-*` 테마를 따른다.

STORY: 네오 소개 → 받을 도움 → 고민 입력. 상담 후 핵심 판단 → 첫 행동 → 선택형 개요 → 원문·수정 상담 → 기록·공유로 이어진다.

FIRST VIEWPORT: 진입은 서재 배경·기존 네오·제목·하단 대화와 시작 행동을 둔다. 결과는 작은 제목 옆 네오 그림과 본문 폭의 판단·첫 행동을 둔다.

FORM: 구현된 일러스트 상담 입구와 단일 열 문서 리더를 기록한다. 추출 모드 문서이며 별도 생성 seed는 기록되어 있지 않다.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented flow

- 소개 대화는 4장면이며 스킵할 수 있다. `data/welcome.ts`가 5개 언어의 시작 행동·설명·대화를 관리한다.
- 소개 다음에는 설명 그림과 핵심 판단·먼저 할 행동·다시 보는 기록을 안내한다. 고민 입력과 기존 체계 선택·결제 경로로 이어진다.
- 홈의 전략실 링크는 양쪽 테마에서 기존 네오 인물·서재 그림을 사용한다. 소개 문구는 “네오와 함께 다음 선택을 정리해요”다.
- 결과 요약은 수정 상담이 있으면 그 판단과 첫 행동을 우선 표시한다. 전략 개요는 기본 닫힘이다. 원문과 수정 상담은 기존 전용 렌더러로 남아 있으며 공유는 아래에 배치된다.
- 전략서는 본인의 완료된 네오 상담 1~5건과 사자 휘장 5개로 발급하는 보관 문서다. 새 AI 해석을 추가하지 않고 발급 시점 내용을 유지한다. 같은 상담 조합의 재열람은 추가 차감 없이 기존 발급본을 연다.
- 전략서 화면은 로그인·로딩·빈 목록·부족 잔액·조회/발급/PDF 실패 안내와 재시도 상태를 제공한다. PDF 저장 전에는 발급본의 현재 접근 권한을 다시 조회한다.
- PDF는 표지·목차·상담별 판단/행동·행동 모음·원문 링크를 포함한다. ko/en/ja/zh-CN/zh-TW 문구가 있으며 현재 브라우저 글꼴로 페이지를 그린다.

## Implementation sources

- `src/features/neo-war-room/NeoOperationRoomPage.tsx`, `data/welcome.ts`, `neo-operation-room.module.css`: 진입과 고민 입력.
- `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`, `neo-operation-room-result.module.css`: 결과 요약·개요·원문·공유.
- `src/features/neo-war-room/NeoStrategyBooksPage.tsx`, `neo-strategy-books.module.css`, `data/strategy-book.ts`, `strategy-book-pdf.ts`: 선택·보관·열람·PDF.
- `templates/home-funnel.html`, `styles/home-funnel.css`: 홈 전략실 진입.

## Raster provenance

이번 신규 생성물은 아래 3개다. 정확한 전체 프롬프트·도구·참조 이미지·생성 원본 식별자는 [neo-strategy-assets.json](../../docs/design/neo-strategy-assets.json)에 보관한다.

| 자산 | 적용 |
| --- | --- |
| `public/neo-operation-room/strategy-room-v1.webp` | 진입 서재 배경 |
| `public/neo-operation-room/strategy-explain-v1.webp` | 상담 가치 설명 그림 |
| `public/neo-operation-room/strategy-book-cover-v1.webp` | 전략서 화면·PDF 표지 |

앞의 두 그림은 기존 `public/neo-operation-room/briefing/neo-explain-v1.webp`를 참조했다. 홈과 결과의 기존 자산은 재사용한다. 이 문서는 추가 이미지를 생성하지 않는다.

## Review evidence and limits

최종 검토 인계 verdict는 **SHIP**이다. 검사 명령·결과와 검토 범위는 [검증 기록](../../docs/verification/neo-strategy-20261005.md)에 모았다. 화면·PDF 검토본 보관 위치는 `output/neo-strategy-20261005/`다.

화면 검토는 진입·결제·최초/수정 결과 360/390/430/1280px, 홈 두 테마 390/1280px, 한·영 전략서 선택과 좁은 폭을 포함한다. 5개 언어의 긴 상담을 담은 PDF를 생성·렌더 확인했다.

결과·기록·전략서 상태는 합성 상담을 사용한 로컬 mock 검토다. 실 LLM 호출, 실제 결제, 운영 DB 차감·발급, 실기기·스크린리더, 운영 배포는 이 증거로 확인되지 않는다. 이번 UI·전략서 변경은 검증 기록 상단의 이전 긴급 결제 복구 승격과 구분하며, 후속 main CI·배포 상태는 전달 보고에서 별도로 확인한다.
