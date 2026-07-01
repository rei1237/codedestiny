# Mobile Feature Detail Template Report

## 1. 적용 요약

- 적용 파일: `index.html`, `styles/mobile-lite.css`
- 적용 마커: `mobile-feature-detail-template-v20260701`
- 적용 방식: 기존 기능 로직은 유지하고, 모바일에서 기능 overlay/root에 공통 템플릿 속성과 레이아웃 규칙을 부여
- 결제/잠금/로그인/운세 생성 로직: 변경 없음
- BGM/audio/video: 기능 상세 root 내부는 사용자 액션 전 `preload="none"` 유지
- 이미지: 기능 상세 root 내부 기본 `loading="lazy"`, `fetchpriority="low"` 보정

## 2. 모바일 상세 템플릿 contract

| 속성 | 의미 |
|---|---|
| `data-component="MobileFeatureDetail"` | 모바일 기능 상세 화면 root |
| `data-mobile-detail-template="free"` | 무료/기본 기능 상세 |
| `data-mobile-detail-template="paid"` | 유료/잠금 기능 상세 |
| `data-mobile-detail-template="consult"` | 상담형 기능 상세 |
| `data-mobile-detail-section="top"` | 기능명, 1줄 설명, 가격/무료/정보 배지 |
| `data-mobile-detail-section="start"` | 입력, 카드 선택, 대표 CTA |
| `data-mobile-detail-section="preview"` | 유료 미리보기 |
| `data-mobile-detail-section="guide"` | 접힘/안내/주의 영역 |
| `data-mobile-detail-section="progress"` | loading, 단계 진행 상태 |
| `data-mobile-detail-section="result"` | 요약, 상세 해석, 공유/저장 CTA |
| `data-mobile-detail-shell="1"` | 모바일 full-height shell |

## 3. 실제 적용 기능

| 기능 | root | 템플릿 | 주요 처리 |
|---|---|---|---|
| 운명의 꽃 아틀리에 | `destinyFlowerStudioOverlay` | paid | 상단/입력/결과/안내 section 지정 |
| 자기 기준 회복 타로 | `tarotSelfEsteemOverlay` | free | 카드 선택/결과 section 지정 |
| 드림 프롬프트 | `dreamModalOverlay` | free | 입력, 진행, 결과 section 지정 |
| 정신분석 해몽 | `psychoDreamModalOverlay` | paid | 입력, 진행, 결과 section 지정 |
| 거북점 | `juyukModalOverlay` | paid | 질문/결과 section 지정 |
| 숙요점 | `sukuyoModalOverlay` | free | 출생 정보/결과 section 지정 |
| 점성술 기본 차트 | `astroModalOverlay` | free | 출생 정보/결과 section 지정 |
| 자미두수 | `ziweiModalOverlay` | free | 출생 정보/결과 section 지정 |
| 명리학 타로 | `tarotModalOverlay` | free | 무료 시작/유료 확장 badge, 결과 요약 section 지정 |
| 관계 타로 | `tarotLoveOverlay` | paid | 카드 선택/결과 section 지정 |
| 재회운 등대 타로 | `tarotReunionOverlay` | paid | 카드 선택/결과 section 지정 |
| 십이지신 천운 타로 | `tarotYearFortuneOverlay` | paid | 연간 리딩/결과 section 지정 |
| 애니멀 토템 | `animalTotemOverlay` | paid | 토템 선택/결과 section 지정 |
| 이집트 오라클 | `kemetOracleOverlay` | paid | 질문 입력/카드/결과 section 지정 |
| 사주 결과 대시보드 | `resultPage` | free | 요약 먼저, 상세는 accordion contract 적용 |
| MBTI 궁합 모달 | `astralModal` | free | 선택형 start/result section 지정 |
| 작명소 | `namingPromptModal` | consult | 상담형 입력/진행/결과 section 지정 |
| 결제/권한 확인 | `sajuLoaderOverlay`, `cdPaidFeatureGate` | paid | bottom sheet, loading/status section 지정 |
| 카드 미리보기 | `tilePvwOverlay` | paid | 미리보기/CTA section 지정 |
| 이용권/결제 | `goldenGrainChargeModalRoot` | paid | 결제 sheet section 지정 |

## 4. 상담형 기능 적용 기준

| 상담 기능군 | 모바일 기준 |
|---|---|
| 운명의 찻집 | 캐릭터 이미지는 작게, 긴 세계관은 접힘, 상담 CTA 우선 |
| 네오 작전실 | 첫 화면은 질문/프로필/CTA 우선, 컷신은 상담 시작 이후 |
| 숙요점/자미두수/점성술/베다점 상담 | 출생 정보 확인, 권한 확인, 상담 생성, 결과 표시 4단계 유지 |
| 운명의 업/인생의 책/연애 비책/신년운세 | 진행 중 빈 화면 금지, chapter 결과는 accordion |
| 작명소 | 이번 static modal에 `consult` 템플릿 적용 |

## 5. 검증 계획

- marker script 문법 확인: 통과
- `npm run sync:public`: 통과
- `npm run verify:locale-main-sync`: 통과
- `npm run verify:runtime-cache-sync`: 통과
- `npm run verify:entry-encoding -- --strict-core`: 통과
- `git diff --check`: 통과
- root/mirror marker 반영 확인: 통과
- 모바일 브라우저 `390x844`: 통과
- 대표 무료 기능 `openTarotModal`: `data-mobile-detail-template="free"` 확인
- 대표 유료 기능 `openKemetModal`: `data-mobile-detail-template="paid"` 확인
- 상담형 `openNamingPromptModal`: root 복귀 후 `data-mobile-detail-template="consult"` 확인
- 입력 focus: `#kemetWorry` 포커스 후 입력창이 viewport 안쪽에 유지됨
- 작명소 실제 입력 focus: 결제/권한 흐름 전 root가 `display:none` 상태라 side effect 없이 focus 검증하지 않음
