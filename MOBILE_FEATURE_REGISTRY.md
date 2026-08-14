# Mobile Feature Registry

## 조사 기준
- 기준 소스: `index.html`, `app/**/page.*`, `app/_lib/serviceSections.js`, `app/_lib/serviceMap.js`, `app/_lib/serviceFeatureRegistry.ts`, `worker/lib/paid-feature-registry.js`, `app/points/PointsClient.tsx`
- 홈 카드 추출 기준: `.tarot-tile`, `.prem-card`, `.lifebook-tile`, `.lovebible-tile`, `.moon-music-entry`, `.moon-story-entry`, `.cd-comprehensive-prompt-entry`
- 결제 정책 표기: 코드에 보이는 가격/한도만 기록하고 정책은 변경하지 않음
- 🔴 **가격 정본은 이 문서가 아니다** — `worker/lib/paid-feature-registry.js`(콘텐츠) · `worker/payments/passes.js`(이용권) · `worker/lib/app-store-pricing.js`(앱)이다. 이 표의 가격 열은 **참고용 사본**이며 이를 검증하는 CI 가드가 없어 조용히 낡는다(2026-08-12 감사에서 가격 기재 52행 중 7행이 어긋나 있었다). 가격을 이 문서에서 읽어 코드에 넣지 말 것. 현행 전수 목록은 [docs/pricing/PRICING_AUDIT.md](docs/pricing/PRICING_AUDIT.md) 참고
- 표기 단위는 **원화 고정** — 코인은 폐지된 내부 단위라 사용자 대상 문서에 쓰지 않는다(`docs/payment-policy-overview.md` 2절)

## Registry
| 기능명 | 현재 진입 위치 | 라우트/모달/인페이지 여부 | 무료/유료 | 모바일 첫 화면 문제 | 성능 문제 | 개선 방식 |
|---|---|---|---|---|---|---|
| 홈 | 상단 브랜드/루트 진입 | `/`, `index.html` | 무료 | PC 히어로가 모바일 첫 화면을 밀어냄 | LCP 로고, hero visual, 카드 DOM 동시 존재 | 모바일 허브를 첫 진입점으로 유지 |
| 무료 사주 분석 | 히어로 CTA, 모바일 허브, 사주 입력 폼 | `#destinyCardForm`, 인페이지 | 무료 기본, 일부 결과 잠금 | 입력 폼과 결과 영역이 한 문서에 길게 존재 | 사주 엔진과 결과 섹션이 무거움 | 첫 화면에서는 CTA만, 계산 후 결과 집중 표시 |
| 오늘의 운세 | 히어로 CTA, 결과 탭 | `/today`, 인페이지 결과 탭 | 무료 | 홈에서 직접 찾기 어려움 | 결과 DOM이 홈 문서 후반에 존재 | 모바일 허브/빠른 CTA에 노출 유지 |
| 나의 운명 카드 | 모바일 허브, 무료 카드 섹션 | `#destinyCardForm`, 인페이지 | 무료 | 카드 생성 전 설명이 길어짐 | 프로필/결과 관련 DOM 동시 존재 | 생성 CTA와 입력 필드 중심으로 압축 |
| 프로필 카드 저장 | 사주 입력 후 프로필 카드 영역 | 인페이지, worker user/profile API | 로그인/권한 기반, 일부 관리 결제 | 저장 상태와 입력 UI가 섞임 | auth/profile sync API 발생 | 모바일에서는 저장 상태 카드 축소 |
| 카카오 공유 이벤트 | 결과 공유 버튼, `shareKakao` | 인페이지 action | 무료, 보상 가능 | 공유 버튼이 결과 하단에 묻힘 | Kakao/share 스크립트 지연 로딩 필요 | 결과 화면 전용 CTA로 유지 |
| 로그인 | 상단 auth 카드, 회원 CTA | `/login`, auth UI | 무료 | 홈 카드 안에서 상태 설명이 길어짐 | auth bootstrap `/api/auth/me` | 모바일 auth 카드를 간결화 |
| 회원가입 | auth 카드, 로그인 유도 | `/signup` | 무료 | 첫 화면 CTA 경쟁 | auth UI와 약관 흐름 분리 필요 | 모바일 hub 아래 보조 CTA |
| 언어 선택 | 우측 상단 language dropdown | 인페이지 dropdown | 무료 | 작은 화면에서 터치 영역 겹침 가능 | native i18n 스크립트 | 고정 위치 유지, 터치 영역 확보 |
| 개인정보 동의 | 개인정보 동의 모달 | `privacy-modal-overlay`, `agreeAndCalculate` | 무료 | 초기 DOM에 포함됨 | hidden modal DOM | 필요 시만 표시, 초기 노출 없음 유지 |
| 결제 확인 | 달빛 결제 확인/결제 로더 | 모달/overlay | 유료 흐름 | 모바일 화면을 덮는 긴 상태 UI | 결제 확인 API, sprite overlay | 결제 시점 전용 sheet로 제한 |
| Moon Music | 홈 음악 카드 | `/music` | 무료/콘텐츠 | 이미지 카드가 초반 스크롤을 늘림 | 음악 커버/오디오 후보 | 모바일은 얇은 링크 카드 |
| 음악 감상 모드 | Moon Music CTA | `/music` | 무료/콘텐츠 | 홈에서 설명이 길어짐 | `/music` route에서 audio 로딩 가능 | 홈에서는 audio 미로드 유지 |
| Moon Library | 운명의 서재 카드 | `/stories` | 무료/콘텐츠 | 홈 초반 카드가 길어짐 | story 이미지/리스트 route 로딩 | 모바일은 compact link |
| 운명의 서재 | 운명의 서재 카드 | `/stories` | 무료/콘텐츠 | 음악 카드와 함께 초반 피로 | route 진입 전 이미지 최소화 필요 | 모바일 허브 보조 링크 |
| 웹소설 | 서재 상세 | `/stories`, `/stories/[episode]` | 무료/콘텐츠 | 홈에서 직접 구조 파악 어려움 | episode dynamic route 콘텐츠 로딩 | 홈에는 대표 링크만 |
| Moonlight Pass | 홈 이용권 미니 섹션, `/points` | 인페이지 + `/points` | 유료 이용권 | 플랜 설명이 길어 첫 흐름을 밀어냄 | 결제/잔량 상태 API | 모바일 허브의 이용권 링크로 직접 이동 |
| 스탠다드 꿀 30일 | Moonlight Pass 카드 | `/points?plan=standard`, 인페이지 CTA | 30일 9,900원, 3,000원 이하 | 플랜 비교가 세로로 길어짐 | 결제 상태/월정석 잔량 조회 | 접힌 플랜 카드, 선택 시 상세 |
| 프리미엄 꿀 30일 | Moonlight Pass 카드 | `/points?plan=premium`, 인페이지 CTA | 30일 29,900원, 5,000원 이하 | 추천 카드가 화면을 차지 | 결제 상태/월정석 잔량 조회 | 모바일 기본 추천 카드만 강조 |
| VVIP 꿀단지 30일 | Moonlight Pass 카드 | `/points?plan=vvip`, 인페이지 CTA | 30일 59,000원, 10,000원 이하 | VVIP 서고와 혼동 가능 | 결제 상태/월정석 잔량 조회 | 이용권과 VVIP 기능 서고 구분 |
| Code Destiny Family 30일 | Moonlight Pass 카드 | `/points?plan=family`, 인페이지 CTA | 30일 149,000원, 모든 유료 기능 | 설명이 길고 고가 플랜 정보가 큼 | 결제 상태/월정석 잔량 조회 | 상세는 `/points`로 분리 |
| 월정석 잔량 | 포인트/이용권 페이지 | `/points`, billing status | 유료/잔량 | 홈에서 노출되면 복잡함 | `/api/billing/balance` 계열 | 홈에서는 요약만, 상세는 `/points` |
| 카카오 공유 보상 | 공유 이벤트 후 보상 | share reward action/API | 무료 보상 | 사용 조건을 홈에서 설명하면 길어짐 | share reward script | 결과 공유 후 안내 |
| 단건 결제 | 유료 카드/프리뷰/결제 모달 | direct KRW payment | 유료 | 프리뷰와 결제 CTA가 길어짐 | 결제 provider/API | 카드 preview 후 결제 sheet |
| 잠금 해제 | 잠금 카드, `unlockPremiumFeature` | 인페이지/worker unlock | 유료/이용권 가능 | 잠금 뱃지가 많아 시각 피로 | 권한/해금 조회 API | 한 컬렉션만 열어 잠금 노출 축소 |
| 운명의 찻집 | VVIP 대표 상담 카드, 모바일 허브 | `/fortune-tea-house` | 타로 5,000원, 사주 10,000원, 궁합 20,000원 | 홈 카드 설명이 길어짐 | 별도 route 자산 | 모바일 대표 CTA 유지 |
| 네오의 팩폭 작전실 | VVIP 대표 상담 카드, 모바일 허브 | `/neo-operation-room` | AI 상담 30,000원 | 대표 기능이 컬렉션 안에 묻힘 | 별도 route 자산 | 모바일 대표 CTA 유지 |
| 종합 운세 프롬프트 | 홈 prompt entry | `/fortune/prompt-hub` | 무료/프롬프트 | 배너가 세로 공간 차지 | 이미지 1개 | 모바일에서는 compact banner |
| 관상 & 심볼 | 모바일 빠른 탐색, 컬렉션 탭 | `animalCollection`, 관상 & 심볼 컬렉션 | 무료/유료 혼합 | 개별 카드 수가 많아 첫 화면 탐색이 느림 | 이미지/모달/route 혼합 | 컬렉션 허브는 접힘, 대표 카드만 우선 노출 |
| AI 동물 관상 | 관상 & 심볼 컬렉션 | `openPhysiognomyApp`, `/services/face-reading` | 무료, 궁합 5,000원 | 컬렉션 미오픈 시 찾기 어려움 | 이미지/앱 route 로딩 | 심볼 chip으로 진입 |
| MBTI 동물 궁합 | 관상 & 심볼 컬렉션 | `openMbtiModal` | 무료 (레지스트리 미등록) | 모달이 홈 안에 존재 | hidden modal | 필요 시 모달 열기 |
| 애니멀 토템 | 관상 & 심볼 컬렉션 | `openAnimalTotemModal`, `/services/animal-totem` | 3,000원~6,000원 | 카드가 많은 컬렉션에 묻힘 | lazy script 필요 | 심볼 chip 후 카드 노출 |
| 사주 가디언 소환진 | 관상 & 심볼 컬렉션 | `/saju-guardian`, `openSajuGuardianPage` | 영구 해금 10,000원 | 기능 성격 설명이 길어짐 | Next route bundle | 카드 CTA만 유지 |
| 운명의 알 / 다마고치 | 관상 & 심볼 컬렉션 | `/tadagochi`, `openDestinyEggPage` | 무료 (레지스트리 미등록) | 작은 게임성 기능이 묻힘 | 별도 route/asset | 심볼 컬렉션 내부 유지 |
| 포춘텔러 물고기 | 관상 & 심볼 컬렉션 | `/fortune-teller-fish.html` | 1회 500원 | 정적 HTML 진입이 혼재 | static HTML asset | 카드 preview 후 이동 |
| AI 손금 | 관상 & 심볼 컬렉션 | `/palm-reading`, `/services/palm-reading` | 기본 진입 무료, 세부 분석 30~50스톤, AI 상담 50스톤 | 홈에서 직접 CTA 없음 | 이미지 업로드/AI 분석 route | 심볼 컬렉션 내부 유지, 결과/결제는 route에서 처리 |
| 네빌 명상 실습 | 명상 컬렉션 | `/neville-meditation.html` | 30분 3,000원, 60분 5,000원 | 명상 기능이 타로 사이에 묻힘 | static HTML | 명상 chip으로 별도 묶음 |
| Divya Yoga 맞춤 명상 | 명상 컬렉션 | `/yoga-guru.html` | 30분 3,000원, 60분 5,000원 | 설명이 길어질 수 있음 | static HTML | 명상 컬렉션 접힘 유지 |
| 코스믹 소울 명상 | 명상 컬렉션 | `/cosmic-soul-meditation.html` | 30분 5,000원, 60분 10,000원 | 고가 옵션 설명이 길어짐 | static HTML/audio 가능 | 별도 route로 이동 |
| R=VD 현실 렌더링 | 명상 컬렉션의 코스믹 소울 명상 카드 | `/cosmic-soul-meditation.html` | 30분 5,000원, 60분 10,000원 | 명상/현실화 맥락을 함께 봐야 이해됨 | `r=vd.webp`와 정적 명상 페이지 | 모바일은 코스믹 소울 명상 상세로 딥링크 |
| 명상 | 모바일 빠른 탐색, 명상 컬렉션 | `#cdMobileBottomNav`, 명상 컬렉션 | 무료/유료 혼합 | 타로/신탁 카드 사이에 묻힘 | 정적 HTML, audio 가능 route 혼합 | 카테고리 탭에서 접힌 rail로 진입 |
| 타로 | 모바일 빠른 탐색, 타로 컬렉션 | `tarotCollection`, `openTarotModal` | 무료/유료 혼합 | 카드 수가 많아 세로 피로가 큼 | 모달/route/정적 HTML 혼합 | 대표 무료 카드와 더보기 구조 |
| 우리는 무슨 사이? | 타로 컬렉션 | `openTarotLoveModal`, `/tarot/love` | 1회 5,000원 | 모바일에서 타로 카드가 많음 | hidden modal + lazy script | 타로 chip 후 노출 |
| 따뜻한 태양 회복 타로 | 타로 컬렉션 | `/tarot/healing`, `openTarotHealingModal` | 무료 | 무료 타로가 유료 카드 사이에 묻힘 | route bundle | 타로 상단 무료 카드로 유지 |
| 자기 기준 회복 타로 | 타로 컬렉션 | `openTarotSelfEsteemModal`, `/tarot/self-esteem` | 무료 | 모달 길이 부담 | hidden modal + lazy script | 무료 카드 우선 정렬 |
| 재회운 등대 타로 | 타로 컬렉션 | `openTarotReunionModal`, `/tarot/reunion` | 1회 5,000원 | 유료 카드가 많음 | lazy script | preview 후 결제 |
| 타로 프롬프트 라이브러리 | 타로 컬렉션 | `/tarot/prompt-maker` | 1회 5,000원 | 기능 설명이 복잡 | Next route bundle | route 이동형 유지 |
| 십이지신 천운 타로 | 타로 컬렉션 | `openTarotYearFortuneModal`, `/tarot/year` | 1회 10,000원 | 카드 탐색 부담 | lazy script | 타로 chip 후 노출 |
| 수비학 타로 | 타로 컬렉션 | `/tarot/numerology/` | 1회 3,000원 | 별도 타로 유형이 묻힘 | Next route bundle | 타로 컬렉션 내부 |
| 이직 운명의 카드 | 타로 컬렉션 | `/tarot-ijik.html` | 1회 5,000원 | 정적 HTML 진입 혼재 | static HTML | preview 후 route 이동 |
| 말과 행동 사이 마음의 온도 | 타로 컬렉션 | `/tarot/mindscan/` | 1회 5,000원 | 제목만으로 비용 파악 어려움 | route image/AI calls 가능 | badge 유지 |
| 원석 소울 타로 | 타로 컬렉션 | `/tarot/crystal-soul/` | 1회 5,000원 | 카드 수 증가 | route bundle/image | 타로 컬렉션 내부 |
| 천체의 선율 타로 | 타로 컬렉션 | `/celestial-harmony.html` | 1회 10,000원 | 고가 카드가 타로 내 혼재 | static HTML | preview에서 비용 명확화 |
| 명리학 타로 | 타로 컬렉션, 기본 타로 CTA | `openTarotModal`, `/services/tarot`, `/tarot/mingri` | 무료 | 모달이 홈 DOM에 있음 | hidden modal | 대표 무료 타로 CTA |
| 신탁 & 점술 | 모바일 빠른 탐색, 신탁 컬렉션 | `oracleCollection`, `openKemetModal` | 무료/유료 혼합 | 신탁 방식이 많아 첫 선택이 어려움 | 모달/정적 HTML/route 혼합 | 신탁 탭에서 대표 4개 우선 표시 |
| 화투점 | 신탁 & 점술 컬렉션 | `openHwatuModal`, `/oracle/hwatu` | 무료 (레지스트리 미등록) | 신탁 카드가 많음 | modal/script | 신탁 chip 후 노출 |
| 이집트 신탁 / Kemet Oracle | 신탁 & 점술 컬렉션 | `openKemetModal`, `/oracle/kemet` | 1회 3,000원 | 홈 hidden modal | lazy script | 신탁 chip 후 노출 |
| IFA 오라클 | 신탁 & 점술 컬렉션 | `/ifa-oracle.html`, `/oracle/ifa` | 1회 3,000원 | 정적 route 혼재 | static HTML | preview 후 이동 |
| 주역 거북점 | 신탁 & 점술 컬렉션 | `openJuyukModal`, `/oracle/juyuk` | 1회 3,000원 | 모달 탐색 부담 | modal/script | 신탁 chip 후 노출 |
| 마야점 | 신탁 & 점술 컬렉션 | `/maya` | 1회 3,000원 | 별도 route가 짧게만 노출 | route/static asset | 신탁 컬렉션 내부 |
| 스톤헨지 룬 | 신탁 & 점술 컬렉션 | `/oracle/rune/` | 1룬 3,000원 · 3룬 5,000원 · 5룬 7,000원 · 12룬 10,000원 | 유료 신탁 탐색 부담 | route bundle | 신탁 컬렉션 내부 |
| 지오맨시 흙점 | 신탁 & 점술 컬렉션 | `/geomancy-oracle-v4.html` | 1회 5,000원 | 정적 HTML 혼재 | static HTML | preview 후 이동 |
| 핀란드 돼지 주석점 | 신탁 & 점술 컬렉션 | `/fortune/sikojen-povailu/`, `/oracle/sikojen-povailu` | 무료 (레지스트리 미등록) | 무료/유료 신탁 혼재 | route/static assets | 신탁 컬렉션 내부 |
| 영국 홍차점 | 신탁 & 점술 컬렉션 | `/royal-tea-oracle.html`, `openRoyalTeaOracle` | 무료 | 기능명이 낯설어 설명 필요 | static HTML | 무료 신탁 카드로 유지 |
| 데스티니 포커 | 신탁 & 점술 컬렉션 | `/destiny-poker.html` | 무료 | 게임/점술 혼재 | static HTML | 신탁 컬렉션 내부 |
| 코즈믹 & 별자리 | 모바일 빠른 탐색, 별자리 컬렉션 | `cosmicCollection`, `openAstroModal` | 무료/유료 혼합 | 기본 차트와 AI 상담이 섞여 복잡함 | chart route, modal, AI route 혼합 | 별자리 탭에서 기본 차트와 유료 상담 분리 |
| 서양 점성술 기본 차트 | 코즈믹 & 별자리 컬렉션 | `openAstroModal`, `/astrology/cosmic` | 기본 무료 | 코즈믹 카드 사이에 묻힘 | hidden modal/route | 별자리 chip 후 노출 |
| 자미두수 기본 명반 | 코즈믹 & 별자리 컬렉션 | `openZiweiModal`, `/ziwei/chart` | 기본 무료 | 이름이 길어 모바일 폭 부담 | hidden modal/route | 제목 축약 유지 |
| 자미두수 심화 | 코즈믹 & 별자리 컬렉션 | `navigateToZiweiChart`, `/ziwei/chart` | 해금 20,000원 | 고가 잠금 UI가 큼 | 권한 확인 | preview에서 안내 |
| 베다 점성술 | 코즈믹 & 별자리 컬렉션 | `navigateToVedic`, `/vedic-ai`, `/vedic/jyotish` | 기본 무료, AI 상담 유료 | 기본/AI가 혼재 | route bundle | 기본 차트와 AI 상담 분리 |
| 올림푸스 신탁 | 코즈믹 & 별자리 컬렉션 | `openOlympusOracleModal` | 해금 10,000원 | modal 진입이 카드 안에 묻힘 | lazy script | 별자리 chip 내부 |
| 운명의 꽃 & 해몽 | 모바일 빠른 탐색, 꽃/해몽 컬렉션 | `flowerCollection`, `openDestinyFlowerStudio` | 무료/유료 혼합 | 꽃 4종과 해몽 2종이 한 번에 길어짐 | studio modal/engine, dream modal 혼합 | 꽃/해몽 탭에서 대표 카드와 더보기 |
| 운명의 꽃 사주 | 운명의 꽃 & 해몽 컬렉션 | `openDestinyFlowerStudio`, `/flower/destiny` | 전체 해금 20,000원(4종 공통) · 1회 이용 5,000원 | 꽃 4종이 비슷해 혼동 | studio modal/engine | 꽃·해몽 chip 하위 |
| 점성술 꽃 | 운명의 꽃 & 해몽 컬렉션 | `openAstrologyFlowerStudio`, `/flower/astrology` | 전체 해금 20,000원(4종 공통) · 1회 이용 5,000원 | 이름 차이가 작음 | studio modal/engine | source badge 강화 |
| 자미두수 꽃 | 운명의 꽃 & 해몽 컬렉션 | `openJamidusuFlowerStudio`, `/flower/jamidusu` | 전체 해금 20,000원(4종 공통) · 1회 이용 5,000원 | 이름 차이가 작음 | studio modal/engine | source badge 강화 |
| 숙요 꽃 | 운명의 꽃 & 해몽 컬렉션 | `openSukuyoFlowerStudio`, `/flower/sukuyo` | 전체 해금 20,000원(4종 공통) · 1회 이용 5,000원 | 이름 차이가 작음 | studio modal/engine | source badge 강화 |
| 드림 프롬프트 | 운명의 꽃 & 해몽 컬렉션 | `openDreamModal`, `/dream/tarot` | 무료 | 해몽 기능이 꽃 아래에 섞임 | hidden modal | 꽃·해몽 chip 내부 |
| 정신분석 해몽 | 운명의 꽃 & 해몽 컬렉션 | `openPsychoDreamModal`, `/dream/psycho` | 1회 3,000원 | 결과 sheet가 길어질 수 있음 | lazy script | preview 후 열기 |
| VVIP 운명 서고 | 모바일 빠른 탐색, VVIP 컬렉션 | `vvipCollection`, `/premium-unlock` | AI 상담/프리미엄 유료 | 고가 상담과 이용권 설명이 길어짐 | AI route/API, 결제 확인 flow | 대표 상담 2개 우선, 나머지 접힘 |
| 숙요점 궁합 AI 상담 | VVIP 운명 서고 | `/sukuyo-compatibility-ai` | AI 상담 30,000원 | VVIP 카드가 많음 | AI route/API | VVIP chip 후 노출 |
| 자미두수 AI 상담 | VVIP 운명 서고 | `gotoZiweiPremium`, `/ziwei-ai` | AI 상담 30,000원 | 결제 게이트와 상담 설명이 큼 | AI route/API | preview 후 결제 |
| 점성술 AI 상담 | VVIP 운명 서고 | `gotoAstrologyPremium`, `/astrology-ai` | AI 상담 30,000원 | 카드 설명이 길어짐 | AI route/API | preview 후 결제 |
| 베다점 AI 상담 | VVIP 운명 서고 | `/vedic-ai` | AI 상담 30,000원 | 기본 베다와 혼동 | AI route/API | VVIP 카드로 분리 |
| 운명의 업 | VVIP 운명 서고 | `/karma-destiny-ai` | AI 상담 50,000원 | 고가 상담이 모바일에 부담 | AI route/API | VVIP 상세 route 이동 |
| 훈민정음 작명소 | VVIP 운명 서고 | `openNamingPromptModal` | Prompt 30,000원 | 모달/결제 정보가 큼 | naming asset/modal | preview 후 모달 |
| 인생의 책 AI 상담 | VVIP 운명 서고 | `/life-book-ai`, `/saju/lifebook` | AI 상담 30,000원 · PDF 생성 50,000원 | PDF 흐름이 길고 민감 | AI + PDF render | 별도 route에서 단계형 |
| 연애 비책 AI 상담 | VVIP 운명 서고 | `goLoveSecretAi`, `/love-secret-ai` | AI 상담 30,000원, 궁합 추가 가능 | 결제/입력/결과가 길어짐 | AI route/API | 별도 route 단계형 |
| 신년운세 AI 상담 | VVIP 운명 서고 | `/new-year-ai-consultation` | AI 상담 유료 | 시즌성 고가 상담이 묻힘 | AI route/API | VVIP 카드 하위 |
| 기타 | 모바일 빠른 탐색, 기타 컬렉션 | `miscCollection`, 기타 컬렉션 | 무료/유료 혼합 | 테스트/아카이브/정적 페이지가 섞임 | 외부 링크/정적 HTML/Next route 혼합 | 기타 탭에서 compact card와 외부 표시 |
| 심리테스트 허브 | 기타 컬렉션 | 외부 Replit 링크 | 무료 | 외부 링크라 이탈 가능 | 외부 페이지 | 외부 표시 명확화 |
| AI 이모이 오미쿠지 | 기타 컬렉션 | `/emoi_omikuji_v2.html` | 무료 | 정적 HTML 혼재 | static HTML | 기타 chip 내부 |
| 연이의 마음 별자리 | 기타 컬렉션 | `/yeon-star-hug` | 무료 | 작은 무료 콘텐츠가 묻힘 | Next route bundle | 기타 chip 내부 |
| 혈액형 테스트 | 기타 컬렉션 | `/blood-type-app.html` | 무료 | 정적 HTML 혼재 | static HTML | 기타 chip 내부 |
| 최애운명 | 기타 컬렉션 | `/saju/destiny-bias` | 1회 5,000원 | 입력/결과/공유가 긴 route | Next route bundle | 카드 preview 후 이동 |
| 사주 FPTI | 기타 컬렉션 | `/saju-fpti` | 무료, 심화 리포트 가능 | 무료 테스트와 리포트가 혼재 | route bundle | 무료 시작 후 심화 분리 |
| 우주 신비 도서관 | 홈 인사이트 섹션 | `/insights`, `/insights/[slug]` | 무료 콘텐츠 | 홈 후반에 있어 찾기 어려움 | 기사/이미지 목록 | 모바일에서는 보조 링크 |
| 유명인 사주 분석 아카이브 | 홈 아카이브 카드, 인사이트 | `/famous-saju`, `/insights/famous-saju`, `/insights/famous-saju/[slug]` | 무료 콘텐츠 | 홈 후반 검색 UI가 길어짐 | 유명인 DB/카드 렌더 | 상세는 insights 정경로, `/famous-saju/:slug` 는 301 |
| 시빌라 시스템 | 기타/VVIP/사주 섹션 | `openSibylModal`, `/saju/sibyl` | 기본 무료, 심화 유료 | modal과 결과 섹션이 길어짐 | lazy script/engine | 별도 route와 modal 분리 |
| 사주네컷 | 사주 결과 fun card | 인페이지 결과 섹션, `/saju-picture` | 무료/공유 | 결과 후반에 묻힘 | 이미지/SVG 생성 | 결과 액션으로 유지 |
| 사주 RPG | 사주 결과 특수 리포트 | 인페이지 `skillTreeCard` | 유료 해금 3,000원 | 홈 첫 화면에는 불필요 | 결과 계산 후 렌더 | 결과 후 노출 |
| 퀀텀 명리 전략 리포트 | 사주 결과 특수 리포트 | 인페이지 `quantumCard` | 유료/패키지 | 홈 문서에 hidden 섹션 포함 | 결과 DOM/engine | 결과 후 lazy 표시 |
| 빌런 블랙리스트 | 사주 결과 특수 리포트 | 인페이지 `villainCard` | 유료/패키지 | 자극적 카드가 결과 후반에 큼 | 결과 DOM | 결과 후 접힘 |
| 에너지 원정 리포트 | 사주 결과 특수 리포트 | 인페이지 `energyCoordCard` | 유료 해금 5,000원 | 결과 화면 길이 증가 | 결과 DOM | 결과 dashboard 탭화 |
| 명리 헬스 리포트 | 사주 결과 특수 리포트 | 인페이지 `healthReport`, `/health-report/guide` | 유료 해금 5,000원 | 민감 정보라 홈 노출 부적합 | 결과 DOM | 결과 후 고지와 함께 분리 |
| 퀀텀 로또 리포트 | 사주 결과 특수 리포트 | 인페이지 `lottoCard` | 유료/패키지 | 엔터테인먼트 기능이 결과를 늘림 | 결과 DOM | 결과 후 optional 카드 |
| 테토 vs 에겐 테스트 | 사주 결과 특수 테스트 | `hormone-vibe-section`, `hormoneVibeResult` | 무료/결과 기반 | 결과 후반에 묻힘 | 결과 DOM | 테스트 묶음 접힘 |
| 극T 테스트 | 사주 결과 특수 테스트 | 인페이지 `tTestTitle`, extremeT script | 무료/결과 기반 | 결과 후반에 묻힘 | `extremeTResult.js` | 테스트 묶음 접힘 |

## 누락 방지 체크
- 필수 사용자 목록의 모든 기능군을 위 표에 포함함.
- 홈 카드 자동 추출 결과 68개 기능 entry와 Next route/정적 route 검색 결과를 병합함.
- 결제/잠금/이용권 순서는 문서화만 했고 코드 정책은 변경하지 않음.
