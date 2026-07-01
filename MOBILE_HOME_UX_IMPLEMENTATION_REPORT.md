# Mobile Home UX Implementation Report

## 1. 적용 범위
- 대상 소스: `index.html`
- 동기화 산출물: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`
- 모바일 홈 마커: `mobile-home-compact-v20260701`
- 런타임 캐시 키: `build-934ca6a71e44`

## 2. 모바일 전용 홈 구조
| 순서 | 적용 내용 |
|---|---|
| Hero Compact | 브랜드, 한 줄 문구, 대표 CTA 1개, 보조 CTA 2개 |
| Quick Start | 무료 사주, 오늘의 타로, 오늘의 운세, 나의 운명 카드 |
| Category Tabs | 추천, 사주, 타로, 상담, 신탁, 별자리, 꽃·해몽, 음악, VVIP, 마이 |
| Recommended Cards | 운명의 찻집, 네오 작전실, AI 손금, Moon Music |
| Recently Used / Saved | 저장된 프로필, 잠금 해제, 마이 |
| Moonlight Pass Compact | 내 이용권 확인 우선, 플랜 상세는 모바일 bottom sheet |
| All Features | 기본 접힘, 카테고리별 진입 |
| Footer | 사업자 정보 모바일 접힘 |

## 3. 성능/초기 렌더링 조정
- 모바일 첫 화면 이미지는 로고 1개만 노출되도록 축소했다.
- 모바일 첫 화면의 audio DOM은 0개로 확인했다.
- 긴 컬렉션, 이용권 상세, 푸터 사업자 정보는 첫 화면에서 접힘 상태로 배치했다.
- 주요 비핵심 스타일과 스크립트는 기존 지연 로딩 정책을 유지했다.

## 4. 모바일 동작 검증 결과
| 항목 | 결과 |
|---|---|
| 첫 DOM | `#cdMobileDestinyHub` |
| 첫 화면 헤더 노출 | 미노출 |
| 첫 화면 이미지 | 1개 |
| 첫 화면 audio | 0개 |
| 대표 CTA | `#destinyCardForm`으로 이동, form top 12px |
| 타로 CTA | `#tarotModalOverlay` 표시, pointer-events `auto` |
| VVIP 탭 | `#premiumVvipCollection` 열림, 헤더 top 12px |
| 이용권 상세 | `#honeyMembershipDetails` fixed bottom sheet 표시 |
| 푸터 사업자 정보 | 모바일 기본 접힘 |

## 5. 정책 유지
- 결제 정책, 잠금 해제 정책, 로그인/회원가입 로직, 운세 결과 생성 로직은 변경하지 않았다.
- 이용권, 월정석, 단건 결제 판단 순서는 수정하지 않았다.

## 6. 검증 명령
- `npm run sync:public`
- `npm run verify:locale-main-sync`
- `npm run verify:runtime-cache-sync`
- `npm run verify:entry-encoding -- --strict-core`
- `git diff --check`
- 모바일 브라우저 viewport 390x844 동작 검증
