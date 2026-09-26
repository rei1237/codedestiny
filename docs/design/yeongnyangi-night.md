# 영냥이 밤의 상담실

2026-09-27 · 대상: 영냥이 홈, 상담 선택, `/checkout`, 생성 상태, 보관함, 결과 리더.

## 방향과 범위

첫 방문은 상담의 종류를 이해하고 질문을 남기는 경험, 입력과 결제는 선택을 확인하는 경험, 결과는 저장된 이야기를 읽는 경험으로 구분한다. 영냥이는 주인공이며 꽃돼지 연이는 기존 브랜드로 이어지는 보조 링크다. 가격과 결제 조건은 기존 catalog와 서버 판정을 따른다.

홈은 왼쪽 설명·행동과 오른쪽 캐릭터를 가진 상담실이다. 모바일은 설명과 두 행동을 먼저, 작은 캐릭터를 그 뒤에 놓는다. 실제 상담 종류와 고민 선택을 경력·프롤로그보다 앞에 둔다. 기존 캐릭터 원화는 보존한다. 캐릭터를 눌렀을 때의 짧은 반응만 유지하며 reduced motion에서는 움직이지 않는다.

입력은 밤색 단색 책상으로, 결과는 장식 없는 남색 독서면으로 구성한다. 색상 정본은 `app/yeongnyangi/night-tokens.css`; 홈의 기존 변수도 이 토큰을 참조한다. 본문 폭은 68ch, 줄 간격 1.95, 본문 17px. 목차는 데스크톱 왼쪽, 모바일 접이식이며 펼쳤을 때 본문을 가리는 sticky를 해제한다.

홈은 상담을 선택하는 Persuade, 입력·결제·진행·복구는 다음 행동이 분명한 Operate, 완료 결과는 내용을 먼저 읽는 Read 모드다. 이 문서의 밤색 표면과 금색 강조는 영냥이 범위의 결정이며 전역 연이·네오 디자인 체계를 바꾸지 않는다.

## 화면별 변경

- 홈: 고정 높이·절대 좌표의 히어로를 독립 `NightHero`와 반응형 grid로 교체. 기존 히어로 CSS를 제거하고 고민·상담 종류를 앞쪽으로 이동. 연이는 작은 연결 영역으로 유지.
- 입력: 반복된 전면 배경과 큰 표지를 제거. 등급별 가격·분량 목표·선택 상태를 비교하며 챕터 수는 `consultationManifest`의 실제 선택 결과를 사용.
- 결제: 같은 밤색 토큰으로 전환. 서버에서 읽은 상담 manifest의 챕터 수를 표시. 가격, PG SDK, 이용권, 인증과 결제 복귀 제어는 유지.
- 진행: 저장된 챕터와 최종 확인을 합친 기존 progress 계약 유지. 저장된 챕터 수와 서버에서 이어지는 진행 안내를 한 상태 영역에 모아 중복 안내 제거. `PAYMENT_NOT_ACTIVE`를 생성 중으로 표시하지 않고 확인 필요 안내 사용. 오류가 있을 때 결제 링크 숨김.
- 결과: 완료 시 한 줄 요약과 첫 행동 조언을 목차보다 먼저 보여준다. 공유·주문번호·상담 질문과 큰 원화·감사 인사는 본문 뒤로 이동하고, 주문번호와 상담 질문은 펼쳐 확인한다. 저장됨·생성 중·복구 필요를 목차에서 구분. 완료된 챕터를 재생성하지 않는 기존 복구 계약 유지.
- 복구: 중단 사유와 저장된 내용의 유지 안내 다음에 `기존 상담 복구하기`를 배치한다. 복구 버튼은 금색 바탕·먹색 글자로 다음 행동을 식별하며 기존 복구 조건과 비용 계약을 바꾸지 않는다.
- 재방문: 보관함에서 64자리 상담 주문번호로 기존 결과를 열 수 있다. 서버의 기존 소유권 검증을 통과해야 하며 별도 조회 API나 권한 부여는 없다.
- 언어: 새 상태·등급 안내는 한국어·영어·일본어·중국어 제공. 기존 서비스 메뉴의 한국어 및 다른 언어의 영어 폴백 범위는 유지.

## 자산과 출처

새 배경은 built-in imagegen으로 제작했다. 캐릭터를 생성하거나 수정하지 않았다. 원본은 `C:/Users/user/.codex/generated_images/01a0ded8-16d2-7ba1-ac64-17fc147b6f45/exec-5885ff97-6c87-4ef9-b186-53f8f70bc2e4.png`이다.

- `public/assets/yeongnyangi/night/consultation-room.webp`: 1440×960, 55,084 bytes, 홈 데스크톱 배경.
- `public/assets/yeongnyangi/night/consultation-room-mobile.webp`: 780×1100, 42,798 bytes, 같은 원본의 오른쪽 크롭, 모바일 홈 배경.
- 기존 영냥이 `original/hero-480.webp`, `original/hero-800.webp` 재사용. 기존 연이 `original/ggulggul-fortune.webp` 재사용. 원본 바이트는 변경하지 않았다.

생성 프롬프트:

> Create one production website background illustration, landscape 3:2, for a premium Korean fortune consultation room at night. Painterly, precise fine illustration with natural material texture, midnight navy and charcoal with restrained muted teal and violet shadows, a little aged gold. Composition: LEFT 55 percent is calm nearly-black navy plaster wall with subtle texture and ample uninterrupted empty negative space for real UI copy (DO NOT render copy); RIGHT third contains a tall arched wooden window with soft moonlight, a distant quiet night sky with only a few stars, a low dark wood consultation desk along the lower right edge, one closed book and simple small brass astrolabe with delicate abstract Eastern chart linework (no symbols resembling letters), a small ceramic teacup. Quiet, intimate, high-end editorial atmosphere. No characters, no cats, no people (existing character cutout will be overlaid separately), no text, no typography, no logos, no watermark, no banner, no glitter, no particles, no crystal ball, no ornate clutter, no blur or glass effect. Keep central/right area spacious enough for the existing cat character, lower edge fades naturally into midnight navy #0b1220.

## 검증 기록

캡처와 실행 결과는 `build-cache/yeongnyangi-night/`에 저장한다. 실제 PG 승인·유료 LLM·운영 DB 변경은 사용하지 않는다. mock 결과의 문장 품질은 실 LLM 품질 증거가 아니다.

개발 서버 두 개가 `.next`를 공유하며 manifest 오류·청크 구문 오류가 발생했다. 기존 서버는 보존하고 검증 서버의 distDir를 `build-cache/yn-night-next`로 분리했다. `.next`와 `build-cache`를 watch 대상에서 제외해 개발 서버의 갱신 반복을 피했다. 이 개발환경 오류를 제품의 복구 결함으로 간주하거나 제품 코드에 재시도 계층을 추가하지 않는다.

모바일 디자인 기록은 `home-390.png`, `result-390.png`, `progress-390.png`, `recovery-390.png`를 확인했다. 홈의 두 행동과 캐릭터 위계, 완료 결과의 요약·행동 조언 우선 배치, 진행 안내의 단일 상태 영역, 금색·먹색 복구 버튼을 최종 방향으로 유지한다. 이 캡처는 mock 화면이며 상담 내용이나 운영 연동의 품질을 입증하지 않는다.

독립 finish review에서 제안한 수정 4건을 반영한 재검토 판정은 `ship`이며, 추가 material fixes는 없었다. 실행 검사와 CI의 최종 결과는 확인된 출력에 근거해 별도로 기록한다.

### 구현 검증 (2026-09-27)

- `npm run check:fast -- --plan`: checkout/공유 UI 변경에 따라 high 검사로 승격.
- `npm run check:fast`: 종료 코드 0. paid gate 88/88, Node 1,728, Jest 296 suites / 4,234 tests 통과. 로컬 production build는 실행하지 않고 공식 main CI에서 확인한다.
- `npm run typecheck`: 종료 코드 0. 마지막 화면 순서 변경 후에도 통과.
- `node --test __tests__/ui/yeongnyangi-reading-v5.test.mjs __tests__/ui/yeongnyangi-paid-recovery-contract.test.mjs __tests__/ui/yeongnyangi-ui-locale-copy.test.mjs __tests__/ui/yeongnyangi-home-build.test.mjs __tests__/ui/yeongnyangi-sample-funnel.test.mjs`: 23/23 통과.
- `YEONGNYANGI_TEST_BASE=http://127.0.0.1:3139 node scripts/verify-yeongnyangi-night-ui.mjs`: 360/390/430/1280px 전부 통과. 실제 React 입력·등급·checkout 화면, 저장 수와 최종 확인 progress, 복구 상태, 주문번호 검증/재진입, 완료 상담 재열람 시 생성 호출 증가 없음, en/ja/zh-CN/zh-TW 360px 가로 넘침 없음. API는 mock transport.
- 기존 상담 브라우저 검증은 4개 폭에서 통과. 기존 v5 리더 검증은 참치 15개 챕터/차트/요약/표를 390/1280px에서 확인했다.
- axe-core WCAG 2A/AA 자동 검사: 홈·상담 입력·checkout main 영역 위반 0. 키보드 초점은 홈/입력에서 시각 표시 확인. 모든 장애 지원기술 조합의 검증을 뜻하지 않는다.
- 개발서버에서 청크 로딩/manifest 오류가 발생한 실행은 실패 기록으로 남겼으며 제품 코드에 가짜 재시도나 진행률을 추가하지 않았다.

### 캡처

`build-cache/yeongnyangi-night/`의 `before-home-390.png`, `before-input-390.png`, `before-checkout-390.png`와 각 `-1280.png`가 수정 전이다. 수정 후는 `home-{360,390,430,1280}.png`, `tiers-*.png`, `checkout-*.png`, `progress-*.png`, `recovery-*.png`, `result-*.png`, `reading-*.png`다. `locale-{en,ja,zh-CN,zh-TW}.png`는 번역문 길이 검증용이다. 로컬 화면은 mock 데이터를 사용한다.

### 유지한 경계와 제한

가격 registry, 이용권/월정석/단건 결제 정책, PG 승인, API 응답 구조, 인증/소유권 검사, DB 스키마와 생성/복구 서버 로직은 바꾸지 않았다. checkout은 이미 읽은 서버 manifest의 길이를 표시 상태에 저장한다. 오류 상태에서 결제 링크가 나타나지 않게 하고, PAYMENT_NOT_ACTIVE를 생성 중으로 표현하지 않도록 UI를 고쳤다. 수동 복구 mock은 실제 서버의 canRetryNow 권한 필드를 반영하도록 바로잡았다.

실제 결제 승인·유료 LLM 호출·운영 DB 쓰기는 0건이다. 기존 한국어 중심 홈·서비스 메뉴와 일부 본문 설명의 다국어 범위는 유지했으며, 서비스 전체 번역이 완료됐다는 뜻은 아니다. 프로덕션 승격은 별도 명시적 승인 대상이다. main CI와 스테이징 검증 결과는 전달 시 별도 확인한다.

추가 확인: `node scripts/verify-yeongnyangi-browser.mjs --payment-filter=chromium-generation-failure|chromium-generation-interrupted|chromium-refund`의 3개 mock 시나리오 모두 통과. sitemap drift 1,284 URL 일치. 최종 변경 파일 ESLint는 오류 0, 기존 anchor/img 사용 경고 18건이다.

### CI 검증 기준 보정

첫 CI에서 제품 빌드는 통과했으나 두 기존 검사가 이전 UI를 요구했다. browser shadow의 홈 배경색·인사말 기대값을 새 디자인에 맞췄고, feature-marketing-schema는 선택한 상담의 `consultationManifest(item,kind,topicId).length` 연결을 검증하도록 바꿨다. 가격과 분량 데이터 소스를 검사하는 목적은 유지한다. `npm run verify:feature-marketing-schema`는 보정 후 통과했다. 로컬 home-profile-catalog 재시도는 Next 개발 청크 오류로 실패하여 성공으로 기록하지 않으며, 정적 빌드 CI에서 재확인한다.

추가 Shadow 실패는 기존 `저장한 프로필` aria 이름을 찾는 테스트 선택자 두 곳이었다. 실제 화면의 `함께 읽을 프로필`에 맞췄다. 배포된 정적 자산을 localhost 읽기 전용 미러로 제공하고 모든 API를 mock 처리하여 Chromium/WebKit의 홈→프로필→28개 상품 비교 및 미결제 결과에서 나가기 4개 시나리오를 모두 통과했다. 이는 staging PG/DB에 요청을 쓰는 검증이 아니다.
