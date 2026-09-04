# Code Destiny performance audit route inventory

작성일: 2026-06-30
범위: 성능 수정 없이 코드베이스 내부 라우트, 링크, 서비스 카드, 사이트맵, 정적 HTML, API route, R2/음악/이미지 에셋 사용 근거만 조사.

## 조사 근거

- 시작 상태: 기존 워크트리에 다수 수정/추가 파일이 있었고, 이번 단계에서는 이 문서만 새로 생성한다.
- 검색 대상: `app/`, `pages/`, `src/`, `components/`, `public/`, `worker/`, `scripts/`, `lib/`, `index.html`.
- Pages Router: `pages/_app.tsx`, `pages/_document.tsx`, `pages/404.tsx`, `pages/500.tsx`만 확인되어 사용자 측정용 일반 페이지는 없음.
- 정적 미러: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`은 root `index.html` 미러로 보며 독립 수정 대상에서는 제외.
- sitemap 근거: `app/sitemap.ts`, `lib/seo-site-urls.ts`, `scripts/generate-sitemap.mjs`.
- 서비스 카드/내비게이션 근거: `index.html`, `app/_lib/serviceSections.js`, `app/_lib/serviceMap.js`, `app/components/FeatureLandingPage.tsx`, `app/components/AppChrome.tsx`. *(2026-09-05: 당시 근거였던 `app/components/MainLandingPage.tsx` 는 미참조로 삭제됐다.)*
- 에셋 근거: `src/features/fortune-tea-house/**`, `src/features/neo-war-room/**`, `app/music/**`, `public/fuctionassets/**`, `public/images/**`, `public/neo-operation-room/**`, `public/music-covers/**`, `lib/r2-public-url*`, `scripts/generate-music-manifest.ts`.

필수 키워드 검색 결과:

| 키워드 | 매치 수 |
|---|---:|
| `href=` | 1610 |
| `route` | 2909 |
| `pathname` | 760 |
| `slug` | 1262 |
| `service` | 2948 |
| `tarot` | 17327 |
| `saju` | 13447 |
| `ziwei` | 5111 |
| `sukuyo` | 17512 |
| `astrology` | 3032 |
| `vedic` | 4884 |
| `music` | 626 |
| `cafe` | 88 |
| `DestinyCafe` | 33 |
| `codedestinymusic` | 0 |
| `neosong` | 15 |
| `yeonisong` | 13 |
| `mp3` | 81 |
| `sprite` | 802 |
| `album` | 424 |
| `card` | 19562 |
| `R2` | 713 |
| `CLOUDFLARE` | 278 |
| `ASSET` | 2001 |
| `IMAGE` | 4506 |

## 발견 수량

- 화면/페이지 URL 후보: 296개
  - App Router page 파일: 172개
  - public 정적 HTML 파일: 124개
- API 감사 후보: 58개
  - App API route 파일: 17개
  - Worker route 파일: 41개
- 전체 감사 후보: 354개
- 화면/페이지 우선순위 분류: P0 25개, P1 50개, P2 48개, P3 173개

## P0/P1/P2 주요 측정 URL

| 번호 | URL | 서비스명 | 라우트 파일 | 주요 컴포넌트 | 에셋 사용 가능성 | 결제/로그인 필요 여부 | 우선순위 |
|---|---|---|---|---|---|---|---|
| 1 | `/` | 메인 정적 셸 | `index.html`, `app/page.js` | static shell, `app/page.js` | 높음: R2 로고, 음악 커버, 서비스 카드 이미지 | 무료, 일부 카드 유료 게이트 | P0 |
| 2 | `/kkul-kkul-unse` | 메인 SEO 홈 | `app/kkul-kkul-unse/page.js` | home cosmic page | 높음: 홈 이미지/R2 | 무료 | P0 |
| 3 | `/login` | 로그인 | `app/login/page.tsx` | `LoginRouteClient` | 낮음 | 비로그인 진입 | P0 |
| 4 | `/signup` | 회원가입 | `app/signup/page.tsx` | `SignupRouteClient` | 낮음 | 비로그인 진입 | P0 |
| 5 | `/auth/google/callback` | Google OAuth callback | `app/auth/google/callback/page.tsx` | `StaticOAuthCallbackRedirect` | 낮음 | OAuth | P0 |
| 6 | `/auth/kakao/callback` | Kakao OAuth callback | `app/auth/kakao/callback/page.tsx` | `StaticOAuthCallbackRedirect` | 낮음 | OAuth | P0 |
| 7 | `/auth/naver/callback` | Naver OAuth callback | `app/auth/naver/callback/page.tsx` | `StaticOAuthCallbackRedirect` | 낮음 | OAuth | P0 |
| 8 | `/me` | 마이페이지 | `app/me/page.tsx` | `MeRouteClient` | 중간 | 로그인 필요 | P0 |
| 9 | `/me/reports` | 내 리포트 | `app/me/reports/page.tsx` | authFetch report list | 중간 | 로그인 필요 | P0 |
| 10 | `/points` | 결제/포인트 | `app/points/page.tsx` | `PointsRouteClient` | 중간: 결제 UI 이미지 | 로그인 필요 | P0 |
| 11 | `/points/history` | 포인트 내역 | `app/points/history/page.tsx` | `PointHistoryRouteClient` | 낮음 | 로그인 필요 | P0 |
| 12 | `/premium` | 프리미엄 안내 | `app/premium/page.js` | `SeoLandingTemplate` | 중간 | 무료, 결제 진입 | P0 |
| 13 | `/premium-unlock` | 프리미엄 언락 | `app/premium-unlock/page.tsx` | `PremiumSalesContent` | 중간 | 결제 가능 | P0 |
| 14 | `/premium-reports` | 프리미엄 리포트 허브 | `app/premium-reports/page.js` | `SeoLandingTemplate` | 중간 | 결제 진입 | P0 |
| 15 | `/today` | 오늘의 운세 | `app/today/page.js` | `SeoLandingTemplate` | 중간 | 무료 | P0 |
| 16 | `/daily-fortune` | 데일리 운세 | `app/daily-fortune/page.js` | `SeoLandingTemplate` | 중간 | 무료 | P0 |
| 17 | `/manse` | 만세력 SEO | `app/manse/page.js` | `SeoLandingTemplate` | 중간 | 무료 | P0 |
| 18 | `/saju` | 사주 허브 | `app/saju/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 19 | `/tarot` | 타로 허브 | `app/tarot/page.js` | `SeoLandingTemplate` | 높음: 카드 이미지 연결 | 무료, 유료 서비스 연결 | P0 |
| 20 | `/compatibility` | 궁합 허브 | `app/compatibility/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 21 | `/saju/compatibility` | 사주 궁합 | `app/saju/compatibility/page.js` | `SeoLandingTemplate` | 중간 | 무료/일부 유료 | P0 |
| 22 | `/ziwei` | 자미두수 허브 | `app/ziwei/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 23 | `/astrology` | 점성술 허브 | `app/astrology/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 24 | `/sukuyo` | 숙요점 허브 | `app/sukuyo/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 25 | `/vedic` | 베다점 허브 | `app/vedic/page.js` | `SeoLandingTemplate` | 중간 | 무료, 유료 서비스 연결 | P0 |
| 26 | `/music` | 음악 감상실 | `app/music/page.tsx` | `MusicRouteClient`, `MusicPlayerExample`, `MusicPlaylistPanel` | 높음: `music.code-destiny.com` mp3, 앨범 커버 | 무료 | P1 |
| 27 | `/music/guide` | 음악 가이드 | `app/music/guide/page.js` | guide page | 중간 | 무료 | P1 |
| 28 | `/fortune-tea-house` | 운명의 찻집 | `app/fortune-tea-house/page.tsx` | `FortuneTeaHouseClient`, `FortuneTeaHousePage` | 높음: DestinyCafe mp3, R2/스프라이트/타로 앨범 | 무료 + 유료 상담/앨범 언락 | P1 |
| 29 | `/neo-operation-room` | 네오 작전실 | `app/neo-operation-room/page.tsx` | `NeoOperationRoomPage` | 높음: R2 이미지, 스프라이트, BGM mp3 | 유료 게이트 | P1 |
| 30 | `/neo-operation-room/result` | 네오 작전 결과 | `app/neo-operation-room/result/page.tsx` | `NeoOperationRoomResultPage` | 높음: R2 이미지/스탬프 | 로그인/결제 결과 | P1 |
| 31 | `/neo-war-room/asset-demo` | 네오 에셋 데모 | `app/neo-war-room/asset-demo/page.tsx` | `NeoWarRoomAssetImage` | 높음: R2 에셋 확인용 | 내부/테스트 | P1 |
| 32 | `/saju/love-simulation` | LOVE CODE | `app/saju/love-simulation/page.tsx` | `LoveSimulationClient` | 높음: 캐릭터 이미지 | 유료 언락 | P1 |
| 33 | `/saju/destiny-bias` | 최애운명 | `app/saju/destiny-bias/page.tsx` | `DestinyBiasRouteClient`, `MyDestinyBiasShell` | 높음: 포토카드/OG 이미지 | 유료 | P1 |
| 34 | `/saju/destiny-bias/stage` | 최애운명 stage | `app/saju/destiny-bias/stage/page.tsx` | stage page | 높음 | 유료 흐름 | P1 |
| 35 | `/saju/animal-destiny` | 열두 동물 운명 | `app/saju/animal-destiny/page.tsx` | `AnimalDestinyRouteClient` | 높음: 동물 카드/애니메이션 | 유료 가능 | P1 |
| 36 | `/saju/animal-test` | 동물점 테스트 | `app/saju/animal-test/page.tsx` | animal test page | 높음: 동물 이미지 | 유료 가능 | P1 |
| 37 | `/saju-guardian` | 사주 가디언 | `app/saju-guardian/page.tsx` | `SajuGuardianRouteClient` | 높음: 수호동물 이미지 | 무료/유료 가능 | P1 |
| 38 | `/saju-picture` | 사주 네컷 | `app/saju-picture/page.tsx` | picture page | 높음: 이미지 생성/카드 | 유료 가능 | P1 |
| 39 | `/yeon-star-hug` | 연이의 마음 별자리 | `app/yeon-star-hug/page.tsx` | `YeonStarHugRouteClient`, `components/yeon/**` | 높음: 연이 스프라이트 | 무료 | P1 |
| 40 | `/palm-reading` | 손금 지도 | `app/palm-reading/page.tsx` | `PalmReadingRouteClient`, `PalmDestinyMain` | 높음: 업로드 이미지/캔버스 | 로그인/API 분석 가능 | P1 |
| 41 | `/tarot/mingri` | 명리 타로 | `app/tarot/mingri/page.tsx` | `FeatureLandingPage` | 높음: 타로 카드 이미지 | 무료 | P1 |
| 42 | `/tarot/mingri/play` | 명리 타로 play | `app/tarot/mingri/play/page.tsx` | play page | 높음: 카드 이미지 | 무료 | P1 |
| 43 | `/tarot/love` | 연애 타로 | `app/tarot/love/page.tsx` | `FeatureLandingPage`, `LoveRelationshipTarot` | 높음: 카드 이미지 | 유료 | P1 |
| 44 | `/tarot/mindscan` | 속마음 타로 | `app/tarot/mindscan/page.tsx` | `MindScanTarotRouteClient` | 높음: 카드 이미지 | 유료 | P1 |
| 45 | `/tarot/crystal-soul` | 원석 소울 타로 | `app/tarot/crystal-soul/page.js` | `CrystalSoulRouteClient` | 높음: 원석/카드 이미지 | 유료 | P1 |
| 46 | `/tarot/numerology` | 수비학 타로 | `app/tarot/numerology/page.tsx` | `NumerologyTarotRouteClient` | 높음: 카드 이미지 | 유료 가능 | P1 |
| 47 | `/tarot/prompt-maker` | 타로 프롬프트 라이브러리 | `app/tarot/prompt-maker/page.tsx` | `TarotPromptMakerRouteClient` | 높음: 카드/스프레드 UI | 유료 | P1 |
| 48 | `/tarot/healing` | 힐링 타로 | `app/tarot/healing/page.tsx` | `TarotHealingRouteClient` | 높음: 카드/이미지 | 무료 | P1 |
| 49 | `/tarot/healing/start` | 힐링 타로 start | `app/tarot/healing/start/page.tsx` | start page | 높음 | 무료 | P1 |
| 50 | `/tarot/self-esteem` | 자존감 타로 | `app/tarot/self-esteem/page.tsx` | `TarotSelfEsteemRouteClient` | 높음: 카드 이미지 | 무료 | P1 |
| 51 | `/tarot/reunion` | 재회 타로 | `app/tarot/reunion/page.tsx` | `SeoLandingTemplate` | 높음: 카드 이미지 | 유료 | P1 |
| 52 | `/tarot/year` | 12지 천운 타로 | `app/tarot/year/page.tsx` | `FeatureLandingPage` | 높음: 카드 이미지 | 유료 | P1 |
| 53 | `/oracle/hwatu-life` | 화투 인생 테스트 | `app/oracle/hwatu-life/page.tsx` | `FeatureLandingPage` | 높음: 화투 카드 이미지 | 무료 | P1 |
| 54 | `/oracle/hwatu-life/play` | 화투 인생 play | `app/oracle/hwatu-life/play/page.tsx` | play page | 높음 | 무료 | P1 |
| 55 | `/oracle/rune` | 룬 오라클 | `app/oracle/rune/page.tsx` | `RuneRouteClient` | 높음: 룬 이미지 | 유료 가능 | P1 |
| 56 | `/oracle/sikojen-povailu` | 핀란드 주석점 | `app/oracle/sikojen-povailu/page.tsx` | `SikojenpovailuRouteClient` | 높음: 연이/주석점 이미지 | 무료/유료 가능 | P1 |
| 57 | `/oracle/sikojen-povailu/play` | 핀란드 주석점 play | `app/oracle/sikojen-povailu/play/page.tsx` | play page | 높음 | 무료/유료 가능 | P1 |
| 58 | `/oracle/ifa` | IFA 오라클 | `app/oracle/ifa/page.tsx` | oracle page | 중간 | 유료 가능 | P1 |
| 59 | `/oracle/royal-tea` | 로열 티 오라클 | `app/oracle/royal-tea/page.tsx` | `FeatureLandingPage` | 높음: 티컵 이미지 | 무료/유료 가능 | P1 |
| 60 | `/maya` | 마야 달력 | `app/maya/page.tsx` | `MayaRouteClient` | 중간: 캘린더 이미지 | 무료 | P1 |
| 61 | `/olympus` | 올림푸스 | `app/olympus/page.js` | dynamic component | 중간 | 무료/유료 가능 | P1 |
| 62 | `/blood-type-app.html` | 혈액형 테스트 | `public/blood-type-app.html` | static HTML | 중간: 정적 이미지 | 무료 | P1 |
| 63 | `/celestial-harmony.html` | Celestial Harmony | `public/celestial-harmony.html`, `app/api/celestial-harmony/route.js` | static HTML + API | 높음: 카드 이미지 | 유료 | P1 |
| 64 | `/destiny-poker.html` | 데스티니 포커 | `public/destiny-poker.html` | static HTML | 높음: 카드/캐릭터 이미지 | 무료/유료 가능 | P1 |
| 65 | `/geomancy-oracle-v4.html` | 지오맨시 | `public/geomancy-oracle-v4.html` | static HTML | 중간 | 무료/유료 가능 | P1 |
| 66 | `/royal-tea-oracle.html` | 정적 로열 티 | `public/royal-tea-oracle.html` | static HTML | 높음: 티컵 이미지 | 무료/유료 가능 | P1 |
| 67 | `/tarot-ijik.html` | 이직 타로 | `public/tarot-ijik.html` | static HTML | 높음: 타로 카드 이미지 | 유료 가능 | P1 |
| 68 | `/tadagochi.html` | 운세 다마고치 | `public/tadagochi.html` | static HTML | 높음: 동물 이미지 다량 | 유료 가능 | P1 |
| 69 | `/secret-house_real.html` | 시크릿 하우스 | `public/secret-house_real.html` | static HTML | 높음: 이미지/시뮬레이션 | 무료/유료 가능 | P1 |
| 70 | `/emoi_omikuji_v2.html` | AI 오미쿠지 | `public/emoi_omikuji_v2.html` | static HTML | 중간: SVG/이미지 | 무료/유료 가능 | P1 |
| 71 | `/cosmic-soul-meditation.html` | 코스믹 소울 명상 | `public/cosmic-soul-meditation.html` | static HTML | 중간 | 유료 가능 | P1 |
| 72 | `/neville-meditation.html` | 네빌 명상 | `public/neville-meditation.html` | static HTML | 중간 | 유료 가능 | P1 |
| 73 | `/yoga-guru.html` | 요가 구루 | `public/yoga-guru.html`, `worker/routes/yoga-guru.js` | static HTML + Worker API | 중간 | 유료 가능 | P1 |
| 74 | `/ifa-oracle.html` | 정적 IFA | `public/ifa-oracle.html` | static HTML | 중간 | 유료 가능 | P1 |
| 75 | `/fortune-teller-fish.html` | 점쟁이 물고기 | `public/fortune-teller-fish.html` | static HTML | 중간 | 무료 | P1 |
| 76 | `/saju/basic` | 사주 기본 | `app/saju/basic/page.tsx` | `FeatureLandingPage` | 중간 | 무료 | P2 |
| 77 | `/saju/basic/play` | 사주 기본 play | `app/saju/basic/play/page.tsx` | play page | 중간 | 무료 | P2 |
| 78 | `/saju/guide` | 사주 가이드 | `app/saju/guide/page.js` | guide page | 낮음 | 무료 | P2 |
| 79 | `/saju/ten-gods` | 십성 가이드 | `app/saju/ten-gods/page.js` | guide page | 낮음 | 무료 | P2 |
| 80 | `/saju/five-elements` | 오행 가이드 | `app/saju/five-elements/page.js` | guide page | 낮음 | 무료 | P2 |
| 81 | `/saju/sibyl` | 시빌 시스템 | `app/saju/sibyl/page.tsx` | `FeatureLandingPage` | 중간 | 무료 + 유료 가능 | P2 |
| 82 | `/saju/lifebook` | 인생의 책 랜딩 | `app/saju/lifebook/page.js` | premium landing | 중간 | 유료 | P2 |
| 83 | `/saju/love-bible` | 러브 바이블 랜딩 | `app/saju/love-bible/page.js` | premium landing | 중간 | 유료 | P2 |
| 84 | `/saju/destiny-meeting-place` | 사주 인연의 장소 | `app/saju/destiny-meeting-place/page.tsx` | `DestinyMeetingPlaceRouteClient` | 중간 | 유료 | P2 |
| 85 | `/saju-fpti` | 사주 FPTI | `app/saju-fpti/page.tsx` | `SajuFptiRouteClient` | 중간 | 무료/유료 리포트 | P2 |
| 86 | `/fpti` | FPTI 별칭 | `app/fpti/page.tsx` | FPTI page | 중간 | 무료/유료 리포트 | P2 |
| 87 | `/life-book-ai` | 인생의 책 AI | `app/life-book-ai/page.tsx` | `LifeBookAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 88 | `/life-book-ai/result` | 인생의 책 결과 | `app/life-book-ai/result/page.tsx` | result page, `authFetch` | 중간 | 로그인/결제 결과 | P2 |
| 89 | `/love-secret-ai` | 연애 비책 AI | `app/love-secret-ai/page.tsx` | `LoveSecretAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 90 | `/love-secret-ai/result` | 연애 비책 결과 | `app/love-secret-ai/result/page.tsx` | result page, `authFetch` | 중간 | 로그인/결제 결과 | P2 |
| 91 | `/karma-destiny-ai` | 운명의 업 AI | `app/karma-destiny-ai/page.tsx` | `KarmaDestinyAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 92 | `/karma-destiny-ai/result` | 운명의 업 결과 | `app/karma-destiny-ai/result/page.tsx` | result page | 중간 | 로그인/결제 결과 | P2 |
| 93 | `/new-year-ai-consultation` | 신년운세 AI | `app/new-year-ai-consultation/page.tsx` | `NewYearAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 94 | `/ziwei/chart` | 자미두수 명반 | `app/ziwei/chart/page.tsx` | `ZiweiChartClientLoader` | 중간 | 무료 + 유료 궁합/심화 | P2 |
| 95 | `/ziwei/guide` | 자미두수 가이드 | `app/ziwei/guide/page.js` | guide page | 낮음 | 무료 | P2 |
| 96 | `/ziwei-ai` | 자미두수 AI 상담 | `app/ziwei-ai/page.tsx` | `ZiweiAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 97 | `/astrology/cosmic` | 점성술 코즈믹 | `app/astrology/cosmic/page.tsx` | `FeatureLandingPage` | 중간 | 무료 + 유료 궁합/심화 | P2 |
| 98 | `/astrology/guide` | 점성술 가이드 | `app/astrology/guide/page.js` | guide page | 낮음 | 무료 | P2 |
| 99 | `/astrology-ai` | 점성술 AI | `app/astrology-ai/page.tsx` | `AstrologyAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 100 | `/astrology-ai/result` | 점성술 AI 결과 | `app/astrology-ai/result/page.tsx` | result page | 중간 | 로그인/결제 결과 | P2 |
| 101 | `/vedic/jyotish` | 베다 점성술 | `app/vedic/jyotish/page.tsx` | `FeatureLandingPage` | 중간 | 무료 + 유료 심화 | P2 |
| 102 | `/vedic/guide` | 베다 가이드 | `app/vedic/guide/page.js` | guide page | 낮음 | 무료 | P2 |
| 103 | `/vedic-ai` | 베다 AI | `app/vedic-ai/page.tsx` | `VedicAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 104 | `/sukuyo/compatibility` | 숙요 궁합 | `app/sukuyo/compatibility/page.js` | `SeoLandingTemplate` | 중간 | 무료 + 유료 가능 | P2 |
| 105 | `/sukuyo/calendar` | 숙요 달력 | `app/sukuyo/calendar/page.tsx` | `SukuyoCalendarRouteClient` | 중간 | 무료/API | P2 |
| 106 | `/sukuyo/guide` | 숙요 가이드 | `app/sukuyo/guide/page.js` | guide page | 낮음 | 무료 | P2 |
| 107 | `/sukuyo-compatibility-ai` | 숙요 궁합 AI | `app/sukuyo-compatibility-ai/page.tsx` | `SukuyoCompatibilityAiRouteClient` | 중간 | 유료/로그인 | P2 |
| 108 | `/oracle/sukuyo` | 숙요 오라클 랜딩 | `app/oracle/sukuyo/page.tsx` | `FeatureLandingPage` | 중간 | 무료 + 유료 가능 | P2 |
| 109 | `/pdf/life-book` | 인생의 책 PDF 랜딩 | `app/pdf/life-book/page.js` | PDF landing | 낮음 | 유료 | P2 |
| 110 | `/pdf/love-report` | 연애 PDF 랜딩 | `app/pdf/love-report/page.js` | `SeoLandingTemplate` | 낮음 | 유료 | P2 |
| 111 | `/premium/saju-lifebook` | 프리미엄 인생책 별칭 | `app/premium/saju-lifebook/page.js` | re-export `saju/lifebook` | 중간 | 유료 | P2 |
| 112 | `/premium/saju-love-bible` | 프리미엄 러브바이블 별칭 | `app/premium/saju-love-bible/page.js` | re-export `saju/love-bible` | 중간 | 유료 | P2 |
| 113 | `/fortune/prompt-hub` | 종합 프롬프트 허브 | `app/fortune/prompt-hub/page.tsx` | `PromptHubRouteClient` | 중간 | 유료 가능 | P2 |
| 114 | `/dream` | 꿈 해몽 허브 | `app/dream/page.js` | `SeoLandingTemplate` | 중간 | 무료/AI 연결 | P2 |
| 115 | `/dream/tarot` | 꿈 타로 프롬프트 | `app/dream/tarot/page.tsx` | `FeatureLandingPage` | 중간 | 무료/AI 연결 | P2 |
| 116 | `/dream/psycho` | 꿈 심리 분석 | `app/dream/psycho/page.tsx` | `FeatureLandingPage` | 중간 | 무료/AI 연결 | P2 |
| 117 | `/love` | 연애 허브 | `app/love/page.js` | `SeoLandingTemplate` | 중간 | 무료/유료 연결 | P2 |
| 118 | `/physiognomy` | 관상 허브 | `app/physiognomy/page.js` | `SeoLandingTemplate` | 중간 | 무료/유료 연결 | P2 |
| 119 | `/face-reading` | 얼굴 관상 별칭 | `app/face-reading/page.js` | static route page | 중간 | 무료/유료 연결 | P2 |
| 120 | `/animal/physio` | AI 동물 관상 | `app/animal/physio/page.tsx` | `FeatureLandingPage` | 중간 | 무료/유료 가능 | P2 |
| 121 | `/animal/mbti` | MBTI 동물 궁합 | `app/animal/mbti/page.tsx` | `FeatureLandingPage` | 중간 | 무료 | P2 |
| 122 | `/vedic-astrology.html` | 정적 베다점 | `public/vedic-astrology.html` | static HTML | 중간 | 무료/유료 가능 | P2 |
| 123 | `/myungwun_final.html` | 정적 명운 페이지 | `public/myungwun_final.html` | static HTML | 중간 | 무료/유료 가능 | P2 |

## P3 기타 페이지/콘텐츠

P3는 측정 후보에서 제외하지 않고, 자동 측정 배치에서는 후순위로 둔다. 아래 항목은 실제 route 파일 또는 public HTML 파일이 존재하는 근거 기반 목록이다.

| 번호 | URL | 서비스명 | 라우트 파일 | 주요 컴포넌트 | 에셋 사용 가능성 | 결제/로그인 필요 여부 | 우선순위 |
|---|---|---|---|---|---|---|---|
| P3-1 | `/admin`, `/admin/login`, `/admin/cache-status`, `/admin/content`, `/admin/insights`, `/admin/insights/new`, `/admin/insights/edit` | 관리자 | `app/admin/**/page.tsx` | admin pages, `InsightEditorPage` | 중간: 에디터 이미지 업로드 | 관리자 필요 | P3 |
| P3-2 | `/about`, `/faq`, `/methodology`, `/contact`, `/contact-us`, `/privacy`, `/privacy-policy`, `/terms`, `/terms-of-service`, `/disclaimer`, `/advertising-policy`, `/editorial-policy` | 법적/운영 문서 | `app/**/page.js` | static/SEO pages | 낮음 | 무료 | P3 |
| P3-3 | `/[locale]`, `/[locale]/today`, `/[locale]/sukuyo`, `/[locale]/ziwei`, `/[locale]/insights`, `/[locale]/insights/[slug]`, `/en-us`, `/ja-jp`, `/zh-cn` | 다국어 셸/별칭 | `app/[locale]/**`, `app/en-us/page.js`, `app/ja-jp/page.js`, `app/zh-cn/page.js` | locale shell | 중간 | 무료 | P3 |
| P3-4 | `/insights`, `/insights/[slug]`, `/insights/saju`, `/insights/tarot`, `/insights/ziwei`, `/insights/ziwei-basics`, `/insights/sukuyo`, `/insights/sukuyo-basics`, `/insights/astrology`, `/insights/vedic`, `/insights/dream`, `/insights/compatibility` | 인사이트 허브/아카이브 | `app/insights/**/page.*`, `app/insights/articles.js`, `app/insights/seo-growth-articles.js` | `InsightsCosmicRouteClient`, `InsightTopicArchive` (`InsightArticleCosmicClient` 는 2026-09-05 미참조로 삭제) | 중간: 주제별 대표 이미지 | 무료 | P3 |
| P3-5 | `/insights/famous-saju`, `/insights/famous-saju/[slug]`, `/famous-saju`, `/famous-saju/[slug]`, `/famous-saju/category/[category]` | 유명인 사주 콘텐츠 | `app/insights/famous-saju/**`, `app/famous-saju/**`, `lib/famous-saju/**` | famous saju pages | 중간: 프로필/OG 이미지 | 무료 | P3 |
| P3-6 | `/high-value`, `/high-value/[slug]`, `/high-value/category/[category]` | 고가치 SEO 문서 | `app/high-value/**`, `app/high-value/content.js` | high-value pages | 낮음 | 무료 | P3 |
| P3-7 | `/psychotest`, `/psychotest/psycho`, `/psychotest/narcissist`, `/psychotest/chihuahua`, `/psychotest/aura`, `/psychotest/ttest`, `/psychotest/persona`, `/psychotest/thriller`, `/psychotest/office`, `/psychotest/seven`, `/psychotest/hsp`, `/psychotest/tci`, `/psychotest/empathy`, `/psychotest/mental`, `/psychotest/romance` | 심리테스트 | `app/psychotest/**`, `lib/psychotest-catalog.ts` | psychotest pages | 중간 | 무료 | P3 |
| P3-8 | `/stories`, `/stories/code-destiny`, `/stories/code-destiny/prologue`, `/stories/code-destiny/chapter-1` ... `/stories/code-destiny/chapter-61` | 운명의 서재 | `app/stories/**`, `lib/stories/data.ts` | `StoriesIndexRouteClient`, `ChapterList`, `ChapterViewer` | 중간 | 무료 | P3 |
| P3-9 | `/blog/daewoon-sewoon.html`, `/blog/goonghap-guide.html`, `/blog/ilju-personality.html`, `/blog/ohang-five-elements.html`, `/blog/saju-basics.html`, `/blog/saju-career.html`, `/blog/tarot-major-arcana.html`, `/blog/tarot-spread-howto.html`, `/blog/yongshin-guide.html`, `/blog/ziwei-intro.html` | 정적 블로그 | `public/blog/*.html` | static HTML | 낮음 | 무료 | P3 |
| P3-10 | `/fortune/{today,tomorrow,weekly,monthly}/{aquarius,aries,cancer,capricorn,dog,dragon,gemini,goat,horse,leo,libra,monkey,ox,pig,pisces,rabbit,rat,rooster,sagittarius,scorpio,snake,taurus,tiger,virgo}.html` | 생성형 일/주/월 운세 | `public/fortune/**/**/*.html` | static HTML | 낮음 | 무료 | P3 |
| P3-11 | `/calendar/guide`, `/health-report/guide`, `/mayan-calendar/guide` | 가이드 문서 | `app/calendar/guide/page.js`, `app/health-report/guide/page.js`, `app/mayan-calendar/guide/page.js` | guide pages | 낮음 | 무료 | P3 |
| P3-12 | `/sukyo`, `/sukyo/relationship-encyclopedia` | 숙요 legacy alias | `app/sukyo/**/page.js`, `public/_redirects` | static alias pages | 낮음 | 무료 | P3 |
| P3-13 | `/api-hello-test`, `/dev-status`, `/landing`, `/static/geomancy-oracle-v4.html`, `/ifa-oracle-about.html` | 테스트/상태/중복 정적 | `app/api-hello-test/page.tsx`, `app/dev-status/page.tsx`, `app/landing/page.js`, `public/static/geomancy-oracle-v4.html`, `public/ifa-oracle-about.html` | test/static pages | 낮음 | 내부/무료 | P3 |

## API route inventory

| 번호 | URL | 서비스명 | 라우트 파일 | 주요 컴포넌트 | 에셋 사용 가능성 | 결제/로그인 필요 여부 | 우선순위 |
|---|---|---|---|---|---|---|---|
| API-1 | `/api/celestial-harmony` | Celestial Harmony API | `app/api/celestial-harmony/route.js`, `worker/routes/celestial-harmony.js` | route handler | 낮음 | 유료 가능 | P1 |
| API-2 | `/api/fortune-tea-house/consult` | 찻집 상담 | `app/api/fortune-tea-house/consult/route.ts`, `worker/routes/fortune-tea-house.js` | consult handler | 낮음 | 유료 가능 | P1 |
| API-3 | `/api/fortune-tea-house/honey-drops/balance` | 꿀방울 잔액 | `app/api/fortune-tea-house/honey-drops/balance/route.ts`, `worker/routes/fortune-tea-house.js` | honey drops handler | 낮음 | 로그인 가능 | P1 |
| API-4 | `/api/fortune-tea-house/honey-drops/tarot-album/unlock` | 타로 앨범 언락 | `app/api/fortune-tea-house/honey-drops/tarot-album/unlock/route.ts`, `worker/routes/fortune-tea-house.js` | unlock handler | 낮음 | 로그인/유료 | P1 |
| API-5 | `/api/fortune-tea-house/results/honey-letter` | 찻집 결과 편지 | `app/api/fortune-tea-house/results/honey-letter/route.ts`, `worker/routes/fortune-tea-house.js` | result handler | 낮음 | 로그인 가능 | P1 |
| API-6 | `/api/tarot/draw` | 타로 드로우 | `app/api/tarot/draw/route.js`, `worker/routes/tarot.js` | tarot handler | 낮음 | 무료/유료 가능 | P1 |
| API-7 | `/api/tarot/reading` | 타로 리딩 | `app/api/tarot/reading/route.js`, `worker/routes/tarot.js` | tarot handler | 낮음 | 무료/유료 가능 | P1 |
| API-8 | `/api/tarot/love-reading` | 연애 타로 API | `app/api/tarot/love-reading/route.js`, `worker/routes/tarot.js` | tarot handler | 낮음 | 유료 가능 | P1 |
| API-9 | `/api/tarot/mindscan` | 속마음 타로 API | `app/api/tarot/mindscan/route.js`, `worker/routes/tarot.js` | tarot handler | 낮음 | 유료 가능 | P1 |
| API-10 | `/api/tarot/crystal-soul` | 원석 타로 API | `app/api/tarot/crystal-soul/route.js`, `worker/routes/tarot.js` | tarot handler | 낮음 | 유료 가능 | P1 |
| API-11 | `/api/neo-operation-room/[...path]` | 네오 작전실 API | `app/api/neo-operation-room/[...path]/route.ts`, `worker/routes/neo-operation-room.js` | ensure-access/start/result/refine | 낮음 | 로그인/유료 | P1 |
| API-12 | `/api/palm/analyze` | 손금 분석 API | `app/api/palm/analyze/route.ts`, `worker/routes/palm.js` | palm analyzer | 낮음 | 로그인/API | P1 |
| API-13 | `/api/sukuyo/calendar` | 숙요 달력 API | `app/api/sukuyo/calendar/route.ts`, `worker/routes/sukuyo.js` | calendar handler | 낮음 | 무료 | P2 |
| API-14 | `/api/sukuyo-basic` | 숙요 basic API | `app/api/sukuyo-basic/route.ts` | Next route handler | 낮음 | route auth | P2 |
| API-15 | `/api/kasi/calendar` | KASI 달력 API | `app/api/kasi/calendar/route.ts`, `worker/routes/kasi.js` | calendar handler | 낮음 | 무료 | P2 |
| API-16 | `/api/vedic-reading` | 베다 리딩 API | `app/api/vedic-reading/route.ts` | Next route handler | 낮음 | route auth | P2 |
| API-17 | `/api/hello` | 테스트 API | `app/api/hello/route.ts` | test handler | 낮음 | 무료 | P3 |
| API-18 | `/api/auth/*`, `/api/session`, `/api/me/payment-phone` | 인증 | `worker/routes/auth.js` | auth handler | 낮음 | 인증 핵심 | P0 |
| API-19 | `/api/billing/*`, `/api/payments/*`, `/api/payment/*`, `/api/checkout/*`, `/api/points/*`, `/api/premium/pdf-archive/*` | 결제/포인트 | `worker/routes/billing.js`, `worker/routes/payments.js` | billing/payment handlers | 낮음 | 로그인/결제 | P0 |
| API-20 | `/api/fortune/*`, `/api/subscription/status`, `/api/subscription/me` | 코인/운세/구독 | `worker/routes/fortune.js` | fortune handlers | 낮음 | 로그인/유료 가능 | P0 |
| API-21 | `/api/life-book-ai/*`, `/api/lifebook/*`, `/api/premium/saju-lifebook/*`, `/api/premium/saju/life-book/*` | 인생의 책 AI | `worker/routes/life-book-ai.js` | ensure-access/start/message | 낮음 | 로그인/유료 | P2 |
| API-22 | `/api/love-secret-ai/*` | 연애 비책 AI | `worker/routes/love-secret-ai.js` | ensure-access/start/message | 낮음 | 로그인/유료 | P2 |
| API-23 | `/api/karma-destiny-ai/*` | 운명의 업 AI | `worker/routes/karma-destiny-ai.js` | ensure-access/start/result/message | 낮음 | 로그인/유료 | P2 |
| API-24 | `/api/new-year-ai/*`, `/api/saju-new-year/*` | 신년운세 AI | `worker/routes/new-year-ai.js`, `worker/routes/saju-new-year.js` | AI handlers | 낮음 | 로그인/유료 | P2 |
| API-25 | `/api/ziwei-ai/*`, `/api/ziwei/daehan/*`, `/api/ziwei/*` | 자미두수 AI/대한 | `worker/routes/ziwei-ai.js`, `worker/routes/ziwei-daehan.js`, `worker/routes/fortune.js` | AI/daehan handlers | 낮음 | 로그인/유료 | P2 |
| API-26 | `/api/astrology-ai/*`, `/api/astrology/*`, `/api/astro/*` | 점성술 API | `worker/routes/astrology-ai.js`, `worker/routes/astro.js` | AI/PDF/chart handlers | 낮음 | 로그인/유료 가능 | P2 |
| API-27 | `/api/vedic-ai/*`, `/api/vedic/*` | 베다 AI/PDF | `worker/routes/vedic-ai.js`, `worker/routes/astro.js` | AI/PDF handlers | 낮음 | 로그인/유료 | P2 |
| API-28 | `/api/sukuyo-compatibility-ai/*`, `/api/sukuyo/*`, `/api/sukyo/*`, `/api/pdf/sukyo/*` | 숙요 API | `worker/routes/sukuyo-compatibility-ai.js`, `worker/routes/sukuyo.js` | AI/PDF/calendar handlers | 낮음 | 로그인/유료 가능 | P2 |
| API-29 | `/api/admin/*`, `/api/content/*`, `/api/content-feed/*`, `/api/insights/*` | 관리자/콘텐츠 | `worker/routes/admin.js`, `worker/routes/content.js`, `worker/routes/insights.js` | content/admin handlers | 중간: R2 이미지 업로드/읽기 | 관리자/무료 읽기 혼재 | P3 |
| API-30 | `/api/profile/*`, `/api/profiles/*`, `/api/user/*`, `/api/subscriptions/*`, `/api/access/*`, `/api/unlocks/*` | 사용자/프로필/구독 | `worker/routes/profile.js`, `worker/routes/user.js`, `worker/routes/subscriptions.js`, `worker/routes/access.js` | user handlers | 낮음 | 로그인 | P0 |
| API-31 | `/api/destiny-bias/*`, `/api/fpti/*`, `/api/sibyl/*`, `/api/naming-prompt/*`, `/api/rpg/*` | 개별 유료/리포트 API | `worker/routes/destiny-bias.js`, `worker/routes/fpti.js`, `worker/routes/sibyl.js`, `worker/routes/naming-prompt.js`, `worker/routes/rpg.js` | feature handlers | 낮음 | 유료 가능 | P2 |
| API-32 | `/api/dream/*`, `/api/oracle/*`, `/api/yoga-guru/*`, `/api/youtube/*` | 꿈/오라클/요가/유튜브 | `worker/routes/dream.js`, `worker/routes/oracle.js`, `worker/routes/yoga-guru.js`, `worker/routes/youtube.js` | feature handlers | 낮음 | 무료/유료 가능 | P1 |
| API-33 | `/api/health`, `/api/health/auth-env`, `/api/health/route-metrics`, `/api/geo`, `/api/geocode`, `/api/version`, `/api/pexels-image`, `/api/status`, `/api/debug/*` | 상태/유틸 | `worker/index.js`, `worker/routes/debug.js` | utility handlers | 낮음 | 내부/무료 | P3 |

## 이미지/음악/R2 사용 가능성이 큰 페이지

- `/`: R2 preconnect, 로고, 음악 커버, 서비스 카드 이미지.
- `/music`: `app/music/_data/musicManifest.ts` 기준 mp3/커버 다량, `music.code-destiny.com`.
- `/fortune-tea-house`: DestinyCafe mp3, `src/features/fortune-tea-house/data/assets.ts`, `tarotCardImageMap.ts`, `public/images/fortune-tea-house/**`.
- `/neo-operation-room`, `/neo-operation-room/result`: `src/features/neo-war-room/data/assets.ts`, R2 이미지, sprite, BGM mp3.
- `/saju/love-simulation`: `public/fuctionassets/러브 코드/**`.
- `/saju/destiny-bias`: 포토카드/OG 이미지, stage UI.
- `/saju/animal-destiny`, `/saju/animal-test`, `/saju-guardian`, `/saju-picture`, `/tadagochi.html`: 동물 이미지 다량.
- `/tarot/*`: `public/tarot-cards/**`, 타로 카드 이미지, 카드 애니메이션.
- `/oracle/hwatu-life`, `/oracle/hwatu-life/play`, `/destiny-poker.html`: 화투/카드 이미지.
- `/oracle/sikojen-povailu`, `/oracle/sikojen-povailu/play`, `/yeon-star-hug`: 연이 sprite.
- `/palm-reading`: 사용자 이미지 업로드/캔버스 분석.
- `/celestial-harmony.html`, `/tarot-ijik.html`, `/royal-tea-oracle.html`, `/geomancy-oracle-v4.html`: 정적 카드/오라클 이미지.

## 다음 단계 Top 20 측정 URL

1. `/`
2. `/music`
3. `/fortune-tea-house`
4. `/neo-operation-room`
5. `/neo-operation-room/result`
6. `/login`
7. `/points`
8. `/premium-unlock`
9. `/life-book-ai`
10. `/love-secret-ai`
11. `/karma-destiny-ai`
12. `/ziwei-ai`
13. `/astrology-ai`
14. `/vedic-ai`
15. `/sukuyo-compatibility-ai`
16. `/saju/destiny-bias`
17. `/saju/love-simulation`
18. `/tarot/prompt-maker`
19. `/tarot/mindscan`
20. `/palm-reading`
