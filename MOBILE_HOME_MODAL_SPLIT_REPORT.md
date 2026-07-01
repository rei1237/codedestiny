# Mobile Home Modal Split Report

## 1. 적용 요약

- 적용 파일: `index.html`
- 적용 마커: `mobile-home-lazy-mount-v20260701`
- 적용 범위: 모바일 전용 hidden modal/result DOM lazy mount
- PC 영향: 없음. `(max-width: 768px), (hover: none) and (pointer: coarse)` 조건에서만 동작
- 결제/잠금/로그인/운세 생성 정책: 변경 없음

## 2. 홈에서 분리한 hidden DOM

| 기능 | 홈 포함 방식 | 모바일 처리 | 복귀 트리거 |
|---|---|---|---|
| 운명의 꽃 아틀리에 | `#destinyFlowerStudioOverlay` hidden overlay | idle 이후 DOM 분리 | `openDestinyFlowerStudio`, 꽃 탭 action |
| 자기 기준 회복 타로 | `#tarotSelfEsteemOverlay` hidden overlay | idle 이후 DOM 분리 | `openTarotSelfEsteemModal` 및 내부 단계 action |
| 개인정보 동의 | `#privacy-modal-overlay` hidden modal | idle 이후 DOM 분리 | 사주 입력 영역 focus/change, `agreeAndCalculate` |
| 달빛 결제 확인/로딩 | `#sajuLoaderOverlay` hidden overlay | idle 이후 DOM 분리 | 결제/잠금/로딩 전역 함수 호출 |
| 드림 프롬프트 | `#dreamModalOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openDreamModal` |
| 정신분석 해몽 | `#psychoDreamModalOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openPsychoDreamModal` |
| 거북점 | `#juyukModalOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openJuyukModal` |
| 숙요점 | `#sukuyoModalOverlay` hidden modal | idle 이후 DOM 분리 | `openSukuyoModal` |
| 점성술 기본 차트 | `#astroModalOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openAstroModal` |
| 자미두수 | `#ziweiModalOverlay` hidden modal | idle 이후 DOM 분리 | `openZiweiModal` |
| 명리학 타로 | `#tarotModalOverlay` hidden modal/prompt 포함 | idle 이후 DOM 분리 | `openTarotModal` |
| 관계 타로 | `#tarotLoveOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openTarotLoveModal` |
| 재회운 등대 타로 | `#tarotReunionOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openTarotReunionModal` |
| 십이지신 천운 타로 | `#tarotYearFortuneOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openTarotYearFortuneModal` |
| 애니멀 토템 | `#animalTotemOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openAnimalTotemModal` |
| 이집트 오라클 | `#kemetOracleOverlay` hidden modal/result 포함 | idle 이후 DOM 분리 | `openKemetModal` |
| 사주 결과 대시보드 | `#resultPage` hidden article | idle 이후 DOM 분리 | 사주 입력 focus/change, `agreeAndCalculate`, `#resultPage` hash |
| MBTI 궁합 모달 | `#astralModal` hidden overlay | idle 이후 DOM 분리 | `openMbtiModal`, `revealAstralSynergy` |
| 작명소 | `#namingPromptModal` hidden modal/form/result 포함 | idle 이후 DOM 분리 | `openNamingPromptModal`, `gotoNamingPremium` |
| 달빛 결제 루트 | `#goldenGrainChargeModalRoot` empty modal root | idle 이후 DOM 분리 | 충전/결제 전역 함수 호출 |
| 카드 상세 bottom sheet | `#tilePvwOverlay` hidden bottom sheet | idle 이후 DOM 분리 | `openTilePreview` |
| 운명 데이터 전환 확인 | `#dpSwitchConfirmOverlay` hidden modal | idle 이후 DOM 분리 | 데이터 전환 확인 action |
| 테스트/공통 모달 | `#tsModal` hidden modal | idle 이후 DOM 분리 | `closeModal` 계열 action |

## 3. 홈에 유지한 블록과 이유

| 기능 | 현재 상태 | 유지 이유 | 다음 분리 방향 |
|---|---|---|---|
| 시빌라 시스템 | `#sibylSystemSection`이 결과 대시보드 내부 섹션으로 존재 | 프리미엄/결제/진입 카드와 연결되어 있어 단순 detach 시 진입 경로 회귀 위험 | `/saju/sibyl` 라우트 우선 진입으로 전환 후 홈 내부 섹션 제거 |
| 우주 신비 도서관 | 카드/섹션형 진입 | 홈 컬렉션 접근성 유지 필요 | 라우트 카드만 남기고 상세 데이터는 route 진입 시 로딩 |
| 유명인 사주 아카이브 | 카드/상세 스크립트 혼재 | 홈 진입 링크 유지 필요 | `/famous-saju` 상세 라우트 중심으로 전환 |
| 프리미엄 분석 | 결과 대시보드 내부 잠금/결제 UI | 결제 판단 순서 보존 필요 | 결과 생성 이후 lazy mount 유지 |

## 4. 라우트 분리 현황

| 기능 | 권장 라우트 | 현재 대응 |
|---|---|---|
| 숙요점 | `/sukuyo` | 라우트 존재, 홈 모달은 lazy mount |
| 점성술 | `/astrology` | 라우트 존재, 홈 모달은 lazy mount |
| 자미두수 | `/ziwei` | 라우트 존재, 홈 모달은 lazy mount |
| 베다 점성술 | `/vedic` | 라우트 중심 유지 |
| 드림 프롬프트 | `/dream-prompt` | 현재 홈 모달 lazy mount, alias 권장 |
| 정신분석 해몽 | `/freud-dream` | 현재 홈 모달 lazy mount, `/dream/psycho` alias 권장 |
| 거북점 | `/tortoise-oracle` | 현재 홈 모달 lazy mount, route 승격 권장 |
| 운명의 꽃 | `/flower` | 현재 홈 모달 lazy mount, route 승격 권장 |
| 시빌라 | `/sibyl` | `/saju/sibyl` 계열 route 우선 진입 권장 |
| 작명소 | `/naming` | 현재 홈 모달 lazy mount, route 승격 권장 |

## 5. 검증 항목

- marker script 문법 확인: 통과
- `npm run sync:public`: 통과
- `npm run verify:locale-main-sync`: 통과
- `npm run verify:runtime-cache-sync`: 통과
- `npm run verify:entry-encoding -- --strict-core`: 통과
- `git diff --check`: 통과
- root/mirror marker 반영 확인: 통과
- 모바일 브라우저 검증 `390x844`: 통과
- 대표 모달 복귀: `openTarotModal` 클릭 후 `#tarotModalOverlay[data-cd-lazy-home-restored="mobile-home-lazy-mount-v20260701"]` 확인
- 사주 입력/결과 복귀: `#birthDate` 포커스 후 `#privacy-modal-overlay`, `#resultPage` 복귀 확인
- 유료 진입 모달 복귀: `openKemetModal` 클릭 후 `#kemetOracleOverlay` 복귀 확인
- 결제 실행 검증: 실제 구매/결제 side effect 방지를 위해 실행하지 않음. `#sajuLoaderOverlay`는 결제/잠금 함수 호출 전 복귀하도록 wrapper source 및 문법 검증으로 확인
