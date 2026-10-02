# 연이의 운세 정원 — App Router 후속 계획 (2026-10-02 작성, 10-03 갱신)

이번 개편(꿀꿀 운세 정적 셸 `/ggulggul/`)은 **셸 화면만** 바꿨다: 홈, 모든 운세 시트, 계정·보관함 시트, 상세 시트 `#tilePvwOverlay`, 무료 사주 폼 `#destinyCardForm`.
App Router 쪽 상품 상세·입력·진행·결과·결제 화면은 **코드를 바꾸지 않았다.** 이 문서는 그 화면들의 목록과 정본상의 위치, 남은 그림(상태 3장)을 어디에 붙일지, 단계별 진행안과 위험을 적는다.

## 1. 출발점: 정본은 "App Router = 네오 단일"

- [design-and-ui.md](../context/design-and-ui.md) 38~43행에 따르면 App Router는 셸 테마를 따라오지 않는다. 2026-08-24 실측에서 차이는 0이었다.
- 같은 문서의 규모 실측은 라우트 219개, 하드코딩 hex 파일 284개, 값 6,304개다. "연이 라이트를 App Router에 입힌다"는 일은 **별도 계획으로 하는 프로젝트**이고, 곁다리로 시작하지 않는다.
- 몰입형 43개 라우트는 자기 다크 팔레트가 의도다. 영냥이(`app/yeongnyangi/`)와 `/checkout`은 `--yn-*` 밤 팔레트를 쓴다([design-canon](../context/design-canon.md) §4).
- 따라서 이 후속 작업의 기본값은 **"테마 분기 없이, 셸과 어긋나 보이는 곳만 좁게"**다. 전면 연이화가 필요하면 사용자 결정부터 받는다.

## 2. 인벤토리

### 2.1 상품 상세·목록

| 화면 | 파일 | 셸과의 관계 |
|---|---|---|
| 기능 목록 | `app/features/page.tsx` | 셸 "모든 운세"의 App Router 판 |
| 기능 상세 | `app/features/[slug]/page.tsx` → `app/components/FeatureVisualDetail.tsx` | 셸 상세 시트와 **같은 CSS** `styles/feature-visual-detail.css`를 쓴다 |

- 이번 개편의 상세 팔레트는 `body:not(.neo-mode) #tilePvwOverlay.pvw-visual …`로 **셸 id에 한정**했다(`styles/feature-visual-detail.css` 끝, 커밋 e2ef052ff).
- 그 결과 셸 상세는 정원 라이트(크림 `#fff9f4`, 잉크 `#402a38`, 장미 `#b53660`)이고, `/features/<slug>/`는 기존 팔레트 그대로다.
- 이 분리는 **의도된 것**이다. 공용 파일의 무범위 토큰을 바꾸면 App Router 상세가 반쪽만 바뀐다.

### 2.2 입력·생성 진행·결과

| 구분 | 파일 | 비고 |
|---|---|---|
| 공용 로딩 연출 | `app/components/common/LoadingProgressMotion.tsx` | 결제 처리 오버레이 계열에서 사용 |
| 결제 처리 로딩 | `app/components/common/PaymentLoading.tsx`, `PaymentProcessingOverlay.tsx`, `PaymentPigVisual.tsx` | 🔴 결제 경로 |
| 결과 폴링 | `app/_lib/consultationResultPolling.ts` | astrology-ai, life-book-ai, love-secret-ai, master-love-codex, nakshatra, island-consult 등 결과 화면 |
| 유료 재개 | `app/hooks/usePaidResume.ts` | 참조 파일 약 42개, 🔴 결제 복귀 |
| 생성 진행 예 | `app/human-design/report/_components/GenerationProgress.tsx` | 화면별 자체 진행 UI의 대표 사례 |
| 대화 상담 유료 턴 복구 | `app/fortune-chat/paid-turn-recovery.ts` | `/fortune-chat/` |
| 앱 구매 복구 | `app/app/_components/PurchaseRecoveryBoot.tsx` | 안드로이드 앱 `/app/` 레이아웃, Play 미완료 구매 재검증 |
| 오류 화면 | `app/error.tsx`, `app/global-error.tsx`(라우트별 `error.tsx` 일부) | |

### 2.3 결제·이용권·대화 라우트 (🔴 동결·게이트 대상)

- 결제·이용권: `/checkout/`, `/points/`, `/points/history/`, `/premium-unlock/`, `/gift/**`
- 대화 상담: `/fortune-chat/`(연이·네오, `?character=`), `/island-consult/`
- 셸의 새 진입점(하단 탭 "상담", 보관함·계정 시트 링크)은 **이 URL들로 가는 링크만** 바꿨다. 라우트 쪽은 무변경이다.

## 3. 상태 그림 3장 — 생성은 끝났고 미배선

원장: [yeoni-garden-art.jsonl](yeoni-garden-art.jsonl), 설명: [yeoni-garden-art.README.md](yeoni-garden-art.README.md). 원본 PNG는 저장소 밖 `D:\Development\yeoni-garden-art\source\`에 있고, 저장소에는 아직 WebP 파생본이 없다.

| 자산 | 판정 | 붙일 자리(후보) | 조건 |
|---|---|---|---|
| state-writing | pass | 생성 진행 화면: `GenerationProgress`류, 결과 폴링 대기 상태 | 화면별 진행 UI를 공용화할 때 함께 |
| state-ready | pass | 결과 준비 완료 전환: 폴링 완료 직후 안내 | 결과 본문 위 장식이 아니라 전환 순간에만 |
| state-recovery | pass(스카프 좌우 반전 경미) | 결제·생성 복구 안내: `usePaidResume` 재개 안내, `paid-turn-recovery`, `PurchaseRecoveryBoot` 안내 | 🔴 결제 복귀 경로, 문구·분기는 불변이고 그림만 |

- **셸에는 복구 배너가 없다.** 셸의 결제 복귀는 동결 함수(`index.html` 결제 동결 구역, `verify:payment-freeze`)가 맡는다. 그래서 이번에 셸 복구 배너를 새로 만들지 않았다. 계획 P8의 "셸 복구 배너 연결"은 붙일 자리가 없어 이 문서로 넘긴다.
- 배선할 때는 다음을 따른다.
  1. 원본에서 `320/480/640w` q72~78 WebP와 `.webp.json`(원본 sha256·변환)을 `public/images/yeoni/state/`에 만든다.
  2. 이미지는 lazy로, 고정 `aspect-ratio`를 둔다.
  3. 네오 단일 정본과 충돌하므로, 네오 화면에 연이 그림을 둘지는 **사용자 결정 사항**이다. 네오 판 그림은 원장 상한(자산당 3회)으로 따로 만든다.

## 4. 단계안

| 단계 | 내용 | 위험 | 검증 |
|---|---|---|---|
| A0 | 사용자 결정: App Router를 네오 단일로 유지할지, 문서형 표면만 연이 라이트를 허용할지 | — | — |
| A1 (GREEN) | 상태 그림 WebP 파생과 원장 갱신, 배선은 하지 않음 | 낮음 | 파일 크기, 시각 판정 |
| A2 (RED-lite) | 생성 진행 화면 1곳(예: human-design `GenerationProgress`)에 state-writing을 붙이고, 패턴 확인 뒤 공용 컴포넌트로 옮김 | 진행 표시 레이아웃 이동(CLS) | 해당 라우트 mock 생성 흐름, CLS, 요청 감시기 |
| A3 (RED) | 복구 안내에 state-recovery 배선 (`usePaidResume`, `paid-turn-recovery`) | 🔴 결제 복귀 경로 | `check:payment`, `verify:payment-freeze`, mock 결제 성공·취소·실패·복귀, 실결제 0회 |
| A4 (별도 프로젝트) | `/features/[slug]` 상세에 정원 팔레트 적용 여부 | 공용 CSS(`feature-visual-detail.css`) 원격 작용 | `verify:feature-marketing-schema`, App Router·셸 상세 두 곳 시각 대조 |

## 5. 위험과 지킬 것

- **결제 동결:** 결제·복귀 파일은 그림·스타일만 건드리고 분기·문구 키·가격은 바꾸지 않는다. 커밋마다 `verify:payment-freeze`를 돌린다.
- **공용 CSS 원격 작용:** `styles/feature-visual-detail.css`는 셸과 App Router가 공유한다. 셸 전용 규칙은 계속 `#tilePvwOverlay` 범위 안에 둔다.
- **반쪽 테마:** 하드코딩 hex 284개 파일 중 일부만 바꾸면 화면마다 세계가 갈린다. A4는 범위를 화면 단위로 끊고, 끊은 경계를 정본 문서에 적는다.
- **유료 LLM:** 진행·결과 화면 검증은 mock만 쓴다. 실호출은 1회씩 별도 승인을 받는다.
