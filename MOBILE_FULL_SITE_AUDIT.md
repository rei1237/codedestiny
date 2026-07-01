# Mobile Full Site Audit

## 1. 홈 화면 초기 렌더링 구조
- 최초 mount 컴포넌트: `index.html` 정적 홈 셸, 언어 선택, 개인정보 동의 모달, 결제/해금 로더, 히어로, 로그인/회원가입 카드, 프로필 카드 스켈레톤, 사주 입력 폼, 음악/서재 진입 카드, 오늘의 무료 운명 카드, Moonlight Pass, 컬렉션 그리드, 결과 화면 컨테이너, 숨김 모달, 타일 프리뷰 패널
- 초기 이미지: `<img>` 40개. LCP 후보 로고는 eager, 대부분 카드 이미지는 `loading="lazy"` 또는 `data-img-src` placeholder 방식
- 초기 audio/BGM: `<audio>` 0개, `<source>` 0개. 홈에서 BGM 자동 다운로드 없음
- 초기 sprite: 결제/해금 로더의 `saju-loader-yeon-sprite` CSS sprite가 홈 DOM에 존재. 운명의 찻집/네오 작전실 전용 sprite는 각 라우트 진입 후 로딩
- 초기 모달: `id` 기준 Modal 20개, overlay 관련 selector 105개. 개인정보, 결제/해금, 타일 프리뷰, 꿈/해몽, 주역, 숙요, 점성술, 자미두수, 명리 타로, 관계 타로, 재회 타로, 연간 타로, 애니멀 토템, 케멧, 시빌라, 작명소 등이 홈 문서 안에 포함됨
- 초기 API 호출: 인증 힌트가 있을 때 `/api/auth/me` 확인. 로그인 상태에서는 `/api/billing/balance`, `/api/payments/me`, `/api/access/unlocks`, `/api/billing/saju-analysis/entitlements` 계열이 idle/권한 확인 흐름에서 실행될 수 있음

## 2. 홈에 과도하게 포함된 기능 후보
| 기능 | 현재 포함 방식 | 문제 | 분리/지연 로딩 방향 |
|---|---|---|---|
| 사주 결과 화면 | `index.html` 내부 hidden/result sections | 홈 문서 길이 증가, 모바일 DOM 피로 | 결과 계산 후 보이도록 유지하되 모바일 첫 화면에서는 폼을 짧게 압축 |
| 꿈/정신분석 해몽 | hidden modal + lazy script | 입력/결과 화면이 홈 DOM에 상주 | 카드 진입 전까지 접힌 컬렉션 내부로 유지, script lazy 유지 |
| 숙요/자미두수/점성술 모달 | hidden modal DOM | 모바일에서 한 번 열리면 긴 sheet가 됨 | 기존 계산/결제 정책 유지, 모바일 sheet 높이와 터치 영역 보강 |
| 타로 계열 모달 | hidden modal DOM + lazy feature script | 관계/재회/연간/토템이 홈에 누적 | 모바일은 컬렉션 chip으로 분류 후 필요 시 열기 |
| Moonlight Pass | 홈 중간 큰 안내 영역 | 첫 이해 흐름을 밀어냄 | 모바일 허브의 이용권 링크로 접힌 영역 직접 진입 |
| 음악/서재 | 홈 초반 이미지 카드 | 모바일 첫 스크롤을 늘림 | 모바일에서 얇은 링크 카드로 축소 |
| VVIP/작명/AI 상담 | premium card 묶음 | 설명이 길고 결제 정보가 많음 | 모바일에서 VVIP chip으로 바로 접힌 묶음만 열기 |
| 시빌라 시스템 | 별도 큰 entry + modal | 결과 아래에서 DOM/이미지가 길어짐 | lazy script 유지, 모바일에서는 컬렉션 탐색 뒤 진입 |

## 3. 모바일에서 너무 긴 영역
| 영역 | 현재 문제 | 모바일 개선안 | 우선순위 |
|---|---|---|---|
| 히어로 | 달/장식 visual과 CTA가 첫 화면을 크게 차지 | 모바일에서 visual 숨김, CTA 3개와 trust만 압축 | P0 |
| 사주 입력 폼 | min-height 900px 예약, divider/hint가 많음 | 모바일 min-height 해제, hint/divider 숨김, 필드 중심화 | P0 |
| 무료 운명 카드 | 4개 카드 grid가 세로로 길어짐 | 모바일 horizontal rail | P1 |
| 컬렉션 헤더 | lede/featureline이 카드마다 길게 보임 | 닫힌 상태에서는 title/subtitle만 표시 | P0 |
| 컬렉션 grid | 많은 기능이 한 번에 펼쳐져 길어짐 | 모바일 hub chip으로 한 컬렉션만 열고 나머지는 접기 | P0 |
| 음악/서재 | 이미지와 설명이 초반 스크롤을 늘림 | 모바일 compact link 카드 | P1 |
| 프리뷰/결제 sheet | 모바일에서 hero/feature list가 길어짐 | sheet max-height, CTA/텍스트 compact | P1 |

## 4. 성능 병목 후보
| 유형 | 파일 | 원인 | 수정 방향 |
|---|---|---|---|
| DOM 크기 | `index.html` | 22,184 lines, data-action 237개, feature entry 68개 | 모바일 hub + 접힌 컬렉션 단일 열람 |
| 숨김 모달 | `index.html` | 20개 모달 ID가 초기 문서에 포함 | 기존 정책 유지, lazy scripts 유지, 모바일 sheet 축소 |
| 이미지 | `index.html` | 카드 이미지 40개 중 일부 route/card 이미지 포함 | lazy/data-img-src 유지, 모바일 첫 화면 visual 축소 |
| 런타임 | `js/core/index-inline-runtime.js` | 결제/잠금/모달/결과 로직이 홈에서 광범위 사용 | 결제 정책은 변경하지 않고 UI 진입만 압축 |
| CSS | inline styles + `styles/*` | 기능별 스타일 링크 16개, 일부 noncritical delay | 모바일 첫 화면용 inline override로 추가 요청 없이 개선 |
| API | auth/billing/access | 로그인 상태에서 권한 동기화 호출 가능 | 호출 순서/정책 변경 없음, UI만 가볍게 진입 |

## 5. 기능 카드 및 내부 진입점
| 그룹 | 확인한 진입점 |
|---|---|
| 대표 CTA | 무료 운명 카드, 명리학 타로, 오늘의 운세, 운명의 찻집, 네오 작전실 |
| 음악/서재 | Moon Music, 운명의 서재 |
| 무료 추천 | 자미두수, 베다점, 서양 점성술, 숙요점 |
| 관상/심볼 | AI 동물 관상, MBTI 동물 궁합, 애니멀 토템, 사주 가디언, 운명의 알, 포춘텔러 물고기, 손금 지도 |
| 명상 | 네빌 명상, Divya Yoga, 코스믹 소울 명상 |
| 타로 | 우리는 무슨 사이, 태양 회복 타로, 자기 기준 회복 타로, 재회운 등대 타로, 타로 프롬프트 라이브러리, 십이지신 천운 타로, 수비학 타로, 이직 운명의 카드, 말과 행동 사이, 원석 소울 타로, 천체의 선율, 명리학 타로 |
| 신탁/점술 | 화투점, 이집트 신탁, IFÀ 오라클, 주역 거북점, 마야점, 룬 오라클, 지오맨시 흙점, 핀란드 돼지 주석점, 영국 홍차점, 데스티니 포커 |
| 코즈믹 | 서양 점성술, 자미두수 기본, 자미두수 심화, 베다 점성술, 올림푸스 신탁 |
| 꽃/해몽 | 운명의 꽃, 점성술 꽃, 자미두수 꽃, 숙요 꽃, 드림 프롬프트, 정신분석 해몽 |
| VVIP/AI | 숙요점 궁합 AI, 자미두수 AI, 점성술 AI, 베다점 AI, 운명의 업, 훈민정음 작명소, 인생의 책, 연애 비책, 신년운세 AI |
| 기타 | 심리테스트 허브, AI 이모이 오미쿠지, 연이의 마음 별자리, 혈액형 테스트, 최애운명, 사주 FPTI, 시빌라 시스템 |

## 6. 반영한 모바일 전용 구조
- 추가 마커: `mobile-first-hub-v20260701`, `mobile-first-navigation-v20260701`, `mobile-first-hub-dom-priority-v20260701`, `cd-mobile-first-ux-v20260701`, `cd-mobile-first-ux-priority-v20260701`
- 모바일 첫 흐름: 빠른 운세 허브 → 압축 히어로 → 로그인/회원 카드 → 프로필/사주 입력 → 무료 카드 rail → 전체 컬렉션 chip
- 컬렉션 동작: 모바일 hub chip 선택 시 대상 컬렉션만 열고 나머지는 닫음
- 터치 보강: `pointerup` 우선 처리, click 중복 방지, 장식 레이어 `pointer-events:none`
- 성능 보강: 모바일 첫 화면에서 desktop hero visual/topbar 숨김, 긴 lede/featureline 숨김, 폼 min-height 해제, 아래 컬렉션 `content-visibility:auto`

## 7. 검증 기록
- 수정 전 대상 파일: `index.html`, `MOBILE_FULL_SITE_AUDIT.md`
- 수정 전 핵심 근거: `index.html` 22,184 lines / `<img>` 40 / `<audio>` 0 / `<script>` 58 / `data-action` 237 / 기능 entry 68
- 동기화/빌드 검증: `npm run sync:public`, `npm run verify:locale-main-sync`, `npm run verify:runtime-cache-sync`
- 인코딩 검증: `npm run verify:entry-encoding -- --strict-core`, `git diff --check`, 코드포인트 기반 mojibake scan
- 모지바케 예외: `index.html` 및 public mirrors line 67의 `U+00ED`는 SEO keywords 내 정상 스페인어/힌디어 텍스트
- 미러 반영: root/public/static/en/ja/zh에서 모바일 마커와 로그인 보호 마커 확인
- 캐시 키: `build-cced885882dc`
- 모바일 런타임 검증: iPhone 12 touch emulation에서 `#cdMobileDestinyHub`가 `#inputPage` 첫 자식으로 표시, hub top 54px, topbar/hero visual hidden, audio 0, 첫 화면 visible image 1
- 터치 진입 검증: `tarotCollection` chip tap → tarot open true, `premiumVvipCollection` chip tap → VVIP open true, hub `openTarotModal` tap → `#tarotModalOverlay` visible true
