# 03. R2/이미지/음악/스프라이트 사용처 맵

작성일: 2026-06-30

이번 단계는 조사와 문서화만 수행했다. 서비스 로직, 에셋 로딩 코드, 결제/로그인 흐름은 수정하지 않았다.

## 조사 근거

- 2단계 측정 결과: `docs/performance-audit/results/network-summary.csv`, `docs/performance-audit/results/network-heavy-requests.csv`
- 라우트 목록: `docs/performance-audit/01-route-inventory.md`
- 코드 검색 범위: `app/`, `pages/`, `src/`, `components/`, `public/`, `static/`, `data/`, `lib/`, `styles/`, `index.html`
- 필수 키워드 검색: `DestinyCafe/caretaro`, `DestinyCafe/nobackground`, `DestinyCafe`, `codedestinyassets`, `codedestinymusic`, `codedestinymusic/DestinyCafe`, `neosong`, `yeonisong`, `mp3`, `audio`, `preload`, `autoPlay`, `autoplay`, `sprite`, `spriteSheet`, `frame`, `animation`, `tarot`, `tarotCards`, `tarotImages`, `album`, `cardImages`, `imageList`, `backgroundImage`, `next/image`, `img src`, `new Image`, `prefetch`, `priority`, `loading="eager"`, `loading="lazy"`, `R2`, `CLOUDFLARE`, `ASSET`, `IMAGE`

## 핵심 측정 요약

- `/neo-operation-room`: desktop 29.90 MB, mobile 29.67 MB. Top 대형 요청은 `DestinyWar` PNG 이미지.
- `/neo-operation-room/result`: mobile 14.51 MB. 결과 화면 배경/히어로/장식 이미지가 주된 원인.
- `/fortune-tea-house`: desktop 8.08 MB, mobile 6.66 MB. 배경, 오버레이, 캐릭터 컷아웃, 스프라이트성 이미지가 누적된다.
- `/music`: mobile 3.71 MB. 사용자 클릭 전 `yeonisong` WAV 요청이 측정됐다.
- `/`: desktop 4.76 MB, mobile 4.01 MB. 공통 폰트, 정적 엔진 JS, 서비스 카드 이미지가 누적된다.
- `/saju/love-simulation`: desktop 4.79 MB, mobile 3.84 MB. 정적 엔진 JS, 공통 폰트, 서비스 이미지 중심이다.

## 전체 사용처 맵

| 에셋/경로 | 사용 컴포넌트 | 사용 페이지 | 로딩 시점 | 파일 유형 | 초기 로딩 여부 | 위험도 | 근거 코드 위치 | 수정 제안 |
|---|---|---|---|---|---|---|---|---|
| `https://assets.code-destiny.com/DestinyWar/*` method cover PNG: 사주, 자미두수, 베다점, 점성술 | `NeoOperationRoomPage`, `NeoWarRoomAssetImage` | `/neo-operation-room` | `useEffect`에서 `new window.Image()`로 선로딩, 카드 렌더에서 `loading="eager"` | PNG image | 예 | Critical | `src/features/neo-war-room/NeoOperationRoomPage.tsx:1210`, `src/features/neo-war-room/NeoOperationRoomPage.tsx:1948`, `src/features/neo-war-room/data/assets.ts:145` | 선로딩 제거 또는 뷰포트/선택 이후 로딩, WebP/AVIF 변환, 썸네일 분리 |
| `DestinyWar/네오 전략실 데스크탑1.png`, `DestinyWar/네오 전략실 모바일1.png`, `strategyCity` | `NeoOperationRoomPage` CSS 변수 | `/neo-operation-room` | shell 렌더 시 `--neo-bg-desktop`, `--neo-bg-mobile`, `--neo-prologue-bg` 지정 | PNG background image | 예 | High | `src/features/neo-war-room/NeoOperationRoomPage.tsx:1132`, `docs/performance-audit/results/network-heavy-requests.csv` | CSS media 조건 확인, 현재 viewport 1장만 요청되게 분리 |
| `DestinyWar/네오 반신상 배경없음-Photoroom.png` 및 히어로 이미지 | `NeoOperationRoomPage`, `NeoWarRoomAssetImage` | `/neo-operation-room` | active hero가 priority로 렌더될 수 있음 | PNG image | 예 | High | `src/features/neo-war-room/NeoOperationRoomPage.tsx:1738`, `src/features/neo-war-room/data/assets.ts:62` | 첫 화면 필수 1장만 priority 유지, 나머지는 lazy |
| `DestinyWar` 결과 배경, fullbody, 장식, 선택 method cover | `NeoOperationRoomResultPage` | `/neo-operation-room/result` | 결과 화면 진입 즉시 배경 CSS 변수와 히어로 priority 이미지 렌더 | PNG image | 예 | High | `src/features/neo-war-room/NeoOperationRoomResultPage.tsx:513`, `src/features/neo-war-room/NeoOperationRoomResultPage.tsx:538`, `src/features/neo-war-room/NeoOperationRoomResultPage.tsx:581` | 결과 화면용 경량 배경/히어로 별도 생성, 장식 이미지 lazy |
| `https://music.code-destiny.com/DestinyWar/*.mp3` | `NeoOperationRoomPage` BGM audio | `/neo-operation-room` | `<audio preload="none">` 안에 `<source src>`가 포함됨. 측정 배포본은 클릭 전 MP3 요청 발생 | audio/mp3 | 예 | Critical | `src/features/neo-war-room/data/assets.ts:26`, `src/features/neo-war-room/NeoOperationRoomPage.tsx:1145`, `src/features/neo-war-room/NeoOperationRoomPage.tsx:1702`, `docs/performance-audit/results/network-summary.csv` | `<source>` 제거 후 클릭 시 `src` 주입, 배포본 파일명 차이 확인 |
| `public/neo-operation-room` 또는 투명 talk frame 계열 | `NeoSpriteActor`, `NeoOperationRoomPage` | `/neo-operation-room` | frame 배열을 구성하고 actor 상태에 따라 표시 | WebP/PNG sprite frame | 조건부 | Medium | `src/features/neo-war-room/NeoOperationRoomPage.tsx:167`, `src/features/neo-war-room/NeoOperationRoomPage.tsx:1110` | 실제 표시 frame만 로딩, frame atlas 크기 확인 |
| `https://assets.code-destiny.com/DestinyCafe/*` 배경/오버레이 | `FortuneTeaHouseImmersiveShell`, `FortuneTeaHouseLanding` | `/fortune-tea-house` | stage별 shell 렌더 시 CSS 변수로 desktop/mobile/overlay 지정 | WebP/PNG background image | 예 | High | `src/features/fortune-tea-house/components/FortuneTeaHouseImmersiveShell.tsx:19`, `src/features/fortune-tea-house/components/FortuneTeaHouseImmersiveShell.tsx:70`, `src/features/fortune-tea-house/components/FortuneTeaHouseLanding.tsx:60` | 첫 stage 배경만 즉시 로딩, overlay/다음 stage 배경은 stage 진입 후 로딩 |
| `DestinyCafe/nobackground/*` 꽃돼지/연이 컷아웃 | `FortuneTeaHouseLanding`, `TeaHouseEntryScene`, `ScentLoadingScene` | `/fortune-tea-house` | landing/entry/loading stage에서 priority 또는 eager 이미지 사용 | PNG/WebP image | 예 또는 stage 진입 즉시 | High | `src/features/fortune-tea-house/data/assets.ts:15`, `src/features/fortune-tea-house/data/assets.ts:73`, `src/features/fortune-tea-house/components/TeaHouseEntryScene.tsx:392`, `src/features/fortune-tea-house/components/TeaHouseEntryScene.tsx:455` | stage별 대표 컷아웃 1장만 우선, PNG 컷아웃 압축 |
| `DestinyCafe` 찻잔/변신 sprite sheet | `TeaHouseEntryScene` | `/fortune-tea-house` | `doorOpened`, `transformPreview` stage에서 `new window.Image()`로 선로딩 | sprite sheet image | 조건부 stage 진입 시 | High | `src/features/fortune-tea-house/components/TeaHouseEntryScene.tsx:150`, `src/features/fortune-tea-house/components/TeaHouseEntryScene.tsx:435` | 변신 직전 클릭/애니메이션 시작 직후 로딩으로 지연 |
| 연이 대화 sprite sheet 7종 | `YeoniDialogueActor`, `yeoniSprites` | `/fortune-tea-house` 상담 단계 | 숨김 `.preloadFrames` 영역에서 여러 sprite sheet `<img>` 생성 | sprite sheet image | actor mount 시 가능 | High | `src/features/fortune-tea-house/components/YeoniDialogueActor.tsx:39`, `src/features/fortune-tea-house/components/YeoniDialogueActor.tsx:91`, `src/features/fortune-tea-house/data/yeoniSprites.ts:13` | 숨김 선로딩 제거, 현재 감정 frame sheet만 요청 |
| 찻집 loading scene sprite, emotion gauge | `ScentLoadingScene` | `/fortune-tea-house` 상담 로딩 단계 | `loading="eager"` sprite와 priority loading scene 이미지 | sprite/image | 조건부 stage 진입 시 | High | `src/features/fortune-tea-house/components/ScentLoadingScene.tsx:155`, `src/features/fortune-tea-house/components/ScentLoadingScene.tsx:172` | stage 진입 후 1장씩 순차 로딩, eager 최소화 |
| `https://assets.code-destiny.com/DestinyCafe/caretaro/*` 78장 카드 | `DestinyCafeTarotAlbum`, `tarotCardImageMap` | `/fortune-tea-house` 타로 카드 앨범 | 앨범 open 시 URL 메타데이터 생성. unlocked grid에서 78장 DOM 생성, 이미지는 `loading="lazy"` | tarot card image | 잠금 상태는 아니오, 해금 후 조건부 | Medium | `src/features/fortune-tea-house/lib/tarotCardImageMap.ts:3`, `src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx:88`, `src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx:279`, `src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx:491` | 해금 grid 가상화, 첫 viewport 카드만 렌더 |
| `DestinyCafe/caretaro/*` 선택 spread 카드 | `TarotRevealScene`, `TarotAssetCard` | `/fortune-tea-house` 타로 상담 | 1/3/5장 spread face가 `size="lg"` 또는 `visualOnly`이면 eager | tarot card image | 상담 결과 stage에서 예 | Medium | `src/features/fortune-tea-house/components/TarotRevealScene.tsx:105`, `src/features/fortune-tea-house/components/TarotAssetCard.tsx:84` | 뒷면 선택 전 face lazy 또는 클릭 후 mount |
| `https://music.code-destiny.com/yeonisong/*.wav`, `neosong/*`, `DEST1NOVA/*`, `lunabloom/*`, `DestinyCafe/*`, `DestinyWar/*` | `useMusicPlayer`, `MusicPlayerExample`, `musicManifest` | `/music` | 현재 트랙 `audio.src` 설정 후 `audio.load()`, 다음 트랙도 `new Audio()`로 metadata preload | audio/wav, audio/mp3 | 예 | Critical | `app/music/_data/musicManifest.ts:21`, `app/music/_data/musicManifest.ts:102`, `app/music/_hooks/useMusicPlayer.ts:440`, `app/music/_hooks/useMusicPlayer.ts:569`, `app/music/_hooks/useMusicPlayer.ts:615`, `docs/performance-audit/results/network-summary.csv` | 사용자 재생 클릭 전 `src/load` 금지, 다음 트랙 preload off |
| 음악 앨범 커버: `music.code-destiny.com/*/*.webp`, `/music-covers/*` | `MusicPlayerExample`, `musicManifest` | `/music`, `/` 음악 카드 | 현재/featured cover 렌더, playlist는 coverUrl 비움 | WebP image | 현재 커버는 예 | Medium | `app/music/_data/musicManifest.ts:41`, `app/music/MusicPlayerExample.tsx:457`, `app/music/MusicPlayerExample.tsx:618`, `app/music/MusicPlayerExample.tsx:923`, `index.html:4437` | 현재 커버 외 prefetch 금지, home 음악 cover lazy 유지 |
| R2 폰트 `Mulmaru.woff2`, `Galmuri11-Bold.woff2`, `The Jamsil OTF`, `netmarbleM.ttf` | global CSS, static shell CSS | 전체 Next 페이지, `/` | CSS font-face 로딩 | font | 예 | Medium | `styles/globals.css:25`, `styles/core-ui.css:32`, `index.html:428`, `docs/performance-audit/results/network-summary.csv` | 페이지별 실제 사용 font subset 검토, optional font-display 유지 |
| `/fuctionassets/jami.webp`, `veda.webp`, `jumsung.webp`, `sukyo.webp`, `UNSETAMA2.webp`, 기타 서비스 카드 | `index.html` static shell | `/` | 일부 eager, 대부분 lazy/data-lazy-src. desktop 측정에서 서비스 이미지 다수 요청 | WebP/PNG image | 일부 예 | Medium | `index.html:4477`, `index.html:4486`, `index.html:4495`, `index.html:4504`, `index.html:5341`, `docs/performance-audit/results/network-summary.csv` | 첫 화면 외 카드 lazy 보장, `data-img-src` 실제 삽입 시점 확인 |
| `https://assets.code-destiny.com/꿀꿀 운세 로고.webp`, `마야점.webp`, `DEST1NOVA.webp`, `flower2.webp` | `app/page.js` React home | `/` React home | logo high priority, Maya eager, 나머지 lazy | WebP image | React home 진입 시 예 | Medium | `app/page.js:117`, `app/page.js:255`, `app/page.js:258`, `app/page.js:263` | React home이 실제 serving될 때만 측정, Maya eager 필요성 재검토 |
| 서비스 레지스트리 이미지: `saju.webp`, `jami.webp`, `sukyo.webp`, `veda.webp`, `jumsung.webp`, `lifebook.webp`, `love code.webp` | `serviceFeatureRegistry`, 서비스 카드 | `/services/*`, 메인 카드, AI/PDF 진입 링크 | 카드/목록 렌더 시 | WebP image | 페이지별 조건부 | Low-Medium | `app/_lib/serviceFeatureRegistry.ts:49`, `app/_lib/serviceFeatureRegistry.ts:9270`, `app/_lib/serviceFeatureRegistry.ts:9400` | 리스트 페이지에서 viewport 기반 lazy 확인 |
| PDF/AI 상담 이미지: `lifebook.webp`, `jamipremiun.webp`, AI route backgrounds | `LifeBookAiClient`, `ZiweiAiClient`, `AstrologyAiClient`, `VedicAiClient`, `SukuyoCompatibilityAiClient` | `/life-book-ai`, `/ziwei-ai`, `/astrology-ai`, `/vedic-ai`, `/sukuyo-compatibility-ai`, `/karma-destiny-ai` | mostly CSS gradients/font/service image, 대형 R2 없음 | image/font | 일부 예 | Low-Medium | `app/life-book-ai/page.tsx`, `app/ziwei-ai/page.tsx`, `app/astrology-ai/page.tsx`, `app/vedic-ai/page.tsx`, `app/sukuyo-compatibility-ai/page.tsx`, `app/_lib/serviceFeatureRegistry.ts:9400` | 현 단계에서는 후순위, 반복 API와 분리 측정 |
| 결제/포인트 로고 `꿀꿀 운세 로고.webp` | `PaymentPigVisual`, `PointsClient` | `/premium-unlock`, `/points`, 결제 gate | 결제/포인트 UI mount 시 eager/priority | WebP image | 해당 페이지에서 예 | Low | `app/components/common/PaymentPigVisual.tsx:9`, `app/components/common/PaymentPigVisual.tsx:41`, `app/points/PointsClient.tsx:97`, `app/points/PointsClient.tsx:4043` | 작은 로고라 후순위, 중복 요청 여부만 확인 |
| 연이 공통 sprite sheet `/fuctionassets/연이 캐릭터 스프라이트 시트.webp` | `YeonSpriteAvatar`, Yeon mood helpers | `/yeon-star-hug`, `/oracle/sikojen-povailu` | SVG `<image href>`로 component mount 시 요청 | sprite sheet image | 페이지별 예 | Medium | `lib/yeon/sprite.ts:3`, `lib/yeon/yeonSpriteMood.ts:13`, `app/oracle/sikojen-povailu/components/YeonSpriteAvatar.tsx:56` | avatar 진입 전 preload 금지, sprite sheet 크기 확인 |
| `SunHealingTarot` CSS background `/fuctionassets/healing.webp` | `SunHealingTarot` | `/tarot/healing` 계열 | CSS `backgroundImage` 즉시 적용 | WebP background image | 해당 route 예 | Medium | `app/components/SunHealingTarot.tsx:760` | CSS background를 `<Image loading="lazy">` 또는 route 진입 후 스타일 적용으로 전환 검토 |

## 서비스별 상세 분류

### 메인 페이지

- 실제 첫 화면 소스는 정적 shell `index.html`이다.
- `index.html`은 R2 font-face를 직접 선언하고, `/styles/cosmic-main.css`를 preload한다. 근거: `index.html:47`, `index.html:51`, `index.html:428`.
- 서비스 카드 이미지는 `/fuctionassets/*`, `music.code-destiny.com/*`, `assets.code-destiny.com/DestinyCafe/*`, `assets.code-destiny.com/DestinyWar/*`가 섞여 있다. 근거: `index.html:4437`, `index.html:4477`, `index.html:5179`, `index.html:5207`.
- 2단계 측정에서 `/` desktop은 4.76 MB, mobile은 4.01 MB였다. 대형 단일 파일보다는 font, `saju-engine.js`, 서비스 카드 이미지 누적형이다.
- React home `app/page.js`도 존재하며 logo high priority, Maya eager 이미지를 사용한다. 실제 serving 여부는 다음 단계에서 별도 확인이 필요하다.

### 운명의 찻집 메인

- R2 base는 `https://assets.code-destiny.com/DestinyCafe`다. 근거: `src/features/fortune-tea-house/data/assets.ts:3`.
- shell이 stage별 desktop/mobile background와 overlay를 CSS 변수로 바로 넣는다. 근거: `FortuneTeaHouseImmersiveShell.tsx:19`.
- BGM 트랙 목록은 코드에 있지만 audio element에는 `preload="none"`만 있고 source를 바로 넣지 않는다. 네트워크 측정에서도 찻집의 클릭 전 audio 요청은 확인되지 않았다. 근거: `src/features/fortune-tea-house/FortuneTeaHousePage.tsx:32`, `src/features/fortune-tea-house/FortuneTeaHousePage.tsx:688`.
- 위험은 audio보다 배경/오버레이/캐릭터 이미지의 누적이다.

### 운명의 찻집 사주/타로/숙요 상담

- entry stage에서 찻잔 sheet와 변신 sheet를 `new window.Image()`로 선로딩한다. 근거: `TeaHouseEntryScene.tsx:150`.
- 상담/로딩 stage에서 sprite sheet, loading scene, emotion gauge가 eager/priority로 로딩된다. 근거: `ScentLoadingScene.tsx:155`, `ScentLoadingScene.tsx:172`.
- Yeoni actor는 숨김 preload 영역에 여러 sprite sheet `<img>`를 만든다. 근거: `YeoniDialogueActor.tsx:91`.
- 다음 단계에서는 stage별 실제 first viewport와 animation 시작 시점 기준으로 선로딩을 분리해야 한다.

### 타로 카드 앨범

- 카드 이미지 URL은 `DestinyCafe/caretaro` prefix로 78장 전체를 매핑한다. 근거: `tarotCardImageMap.ts:3`, `DestinyCafeTarotAlbum.tsx:88`.
- 앨범이 닫혀 있으면 component가 `null`을 반환한다. 근거: `DestinyCafeTarotAlbum.tsx:205`.
- 잠금 상태에서는 lock panel만 렌더되고 78장 grid는 렌더되지 않는다. 근거: `DestinyCafeTarotAlbum.tsx:279`.
- 해금 상태에서는 전체 카드 grid가 렌더되며 각 이미지는 `loading="lazy"`다. 브라우저 viewport 조건에 따라 다수 요청 가능성이 있으므로 Medium으로 분류한다.

### 음악 감상실

- `/music`은 클릭 전 audio가 명확히 측정된 Critical 영역이다.
- `useMusicPlayer`는 mount 시 `new Audio()`를 만들고, 현재 트랙 변경 시 `audio.src`를 넣은 뒤 `audio.load()`를 호출한다. 근거: `app/music/_hooks/useMusicPlayer.ts:440`, `app/music/_hooks/useMusicPlayer.ts:569`.
- 다음 트랙도 `new Audio()`로 생성하고 `preload="metadata"`와 `load()`를 호출한다. 근거: `app/music/_hooks/useMusicPlayer.ts:615`.
- 측정된 자동 요청: `Gisin Out Yongsin In.wav`, `Moonlight Daydream.wav`.

### 사주 분석 화면

- `/saju/love-simulation`은 2단계 측정에서 desktop 4.79 MB, mobile 3.84 MB였다.
- 대역폭 원인은 R2 대형 이미지보다 `saju-engine.js`, 공통 폰트, 서비스 카드/정적 이미지 누적이다. 근거: `docs/performance-audit/results/network-summary.csv`.
- route 파일은 `app/saju/love-simulation/page.tsx`, client는 `app/saju/love-simulation/LoveSimulationClient.tsx`다.
- 별도 mp3/audio 자동 요청은 확인되지 않았다.

### 자미두수

- 일반/AI 진입 이미지는 `jami.webp`, `jamipremiun.webp` 계열이다. 근거: `app/_lib/serviceFeatureRegistry.ts:9279`, `app/_lib/serviceFeatureRegistry.ts:9411`, `index.html:4477`.
- 직접 route는 `app/ziwei-ai/page.tsx`, `app/ziwei-ai/ZiweiAiClient.tsx` 등이 있다.
- 단독 자미두수 페이지보다 `/neo-operation-room`의 자미두수 method cover PNG가 대역폭상 더 위험하다.

### 숙요점

- 일반 숙요점은 `sukyo.webp` 서비스 이미지와 정적 shell modal 진입이 중심이다. 근거: `app/_lib/serviceFeatureRegistry.ts:9289`, `index.html:4504`.
- AI 궁합 route는 `app/sukuyo-compatibility-ai/page.tsx`, `SukuyoCompatibilityAiClient.tsx`다.
- 2단계에서 반복 `/api/auth/me` 이슈는 있었지만, 대형 이미지/audio 이슈는 낮다.

### 점성술

- 일반 점성술은 `jumsung.webp` 서비스 이미지 중심이다. 근거: `app/_lib/serviceFeatureRegistry.ts:9307`, `index.html:4495`.
- AI route는 `app/astrology-ai/page.tsx`, `AstrologyAiClient.tsx`다.
- `/neo-operation-room` 점성술 method cover PNG가 2.82 MB로 더 높은 우선순위다.

### 베다점

- 일반 베다점은 `veda.webp` 서비스 이미지 중심이다. 근거: `app/_lib/serviceFeatureRegistry.ts:9298`, `index.html:4486`.
- AI route는 `app/vedic-ai/page.tsx`, `VedicAiClient.tsx`다.
- `/neo-operation-room` 베다점 method cover PNG가 3.17 MB로 전체 heavy request 1위다.

### PDF/AI 상담 페이지

- `/life-book-ai`, `/love-secret-ai`, `/karma-destiny-ai`, `/ziwei-ai`, `/astrology-ai`, `/vedic-ai`, `/sukuyo-compatibility-ai`는 주로 공통 Next bundle, font, 작은 서비스 이미지, CSS gradient가 중심이다.
- `lifebook.webp`는 `serviceFeatureRegistry`에서 `/life-book-ai` 진입 이미지로 연결된다. 근거: `app/_lib/serviceFeatureRegistry.ts:9400`.
- 현재 단계에서 대형 audio/sprite 자동 요청은 확인되지 않았다.

### 로그인/결제 관련 페이지

- `/login`, `/premium-unlock`, `/points`는 로고/결제 pig visual 정도의 이미지 사용이 중심이다.
- `PaymentPigVisual`은 R2 logo를 eager로 로딩한다. 근거: `app/components/common/PaymentPigVisual.tsx:9`, `app/components/common/PaymentPigVisual.tsx:46`.
- `PointsClient`는 points pass logo를 priority로 로딩한다. 근거: `app/points/PointsClient.tsx:97`, `app/points/PointsClient.tsx:4050`.
- 2단계 반복 API 이슈는 성능 추적 대상이지만, R2/이미지/음악 위험도는 Low다.

## 질문별 판정

### 1. Critical 위험 사용처

- `/neo-operation-room`: `DestinyWar` method cover PNG 4장과 배경/히어로를 `new Image()` 및 eager로 초기 로딩. 페이지 총 29.90 MB.
- `/neo-operation-room`: `DestinyWar` BGM MP3가 사용자 클릭 전 네트워크에서 관측됨.
- `/music`: `yeonisong` WAV가 사용자 클릭 전 current/next audio load로 관측됨.

### 2. High 위험 사용처

- `/neo-operation-room/result`: 결과 배경, fullbody, 장식, method cover.
- `/fortune-tea-house`: stage background/overlay, 캐릭터 컷아웃, entry transform sheet.
- `/fortune-tea-house`: 숨김 Yeoni sprite preload, scent loading eager sprite.

### 3. 사용자가 클릭하기 전 로딩되는 mp3/audio

- `https://music.code-destiny.com/yeonisong/Gisin%20Out%20Yongsin%20In.wav`
- `https://music.code-destiny.com/yeonisong/Moonlight%20Daydream.wav`
- `https://music.code-destiny.com/DestinyWar/The%20Moonlit%20War%20Room.mp3`

현재 코드의 Neo BGM 상수는 `Moonlit Strategy Map.mp3`를 가리키지만, 2단계 production 측정은 `The Moonlit War Room.mp3`를 관측했다. 배포본과 현재 코드의 파일명 차이는 다음 단계에서 확인해야 한다.

### 4. 초기 로딩되는 대형 이미지

- `DestinyWar/네오 전략실 베다점 이미지.png` 3.17 MB
- `DestinyWar/네오 전략실 자미두수 이미지.png` 2.94 MB
- `DestinyWar/네오 전략실 사주 이미지.png` 2.88 MB
- `DestinyWar/네오 전략실 점성술 이미지.png` 2.82 MB
- `DestinyWar/네오 전략실 데스크탑1.png` 2.36 MB
- `DestinyWar/네오 전략실 모바일1.png` 2.22 MB
- `DestinyWar/네오 반신상 배경없음-Photoroom.png` 1.98 MB
- `DestinyCafe/nobackground/*` 캐릭터 PNG와 stage 배경군은 페이지 총량 기준 High.

### 5. 초기 로딩되는 sprite sheet

- 네트워크 측정의 `spriteSheetRequests` 자동 분류에는 명시적으로 잡힌 항목이 없었다.
- 코드상 위험은 존재한다: `YeoniDialogueActor` 숨김 preload sprite, `TeaHouseEntryScene` transform sheet, `ScentLoadingScene` eager sprite, `YeonSpriteAvatar` SVG image sprite.

### 6. 타로 이미지 전체 로딩 여부

- 잠금 상태의 타로 앨범은 78장 전체 이미지를 로딩하지 않는다.
- 해금 후 앨범 grid는 78장 전체 DOM을 만들고 각 이미지는 `loading="lazy"`다.
- 상담 reveal stage는 선택 spread 1/3/5장 face를 eager로 로딩할 수 있다.

### 7. 모바일/데스크탑 이미지 분리 여부

- `NeoOperationRoomPage`와 `FortuneTeaHouseImmersiveShell` 모두 desktop/mobile background 변수를 분리한다.
- 측정 결과에서는 `/neo-operation-room` mobile에서도 desktop 배경 이미지가, desktop에서도 mobile 배경 이미지가 관측됐다. CSS media 조건 또는 선로딩 배열 때문에 실제 요청이 완전히 분리되지 않은 상태로 판단한다.
- 메인 정적 shell은 일부 `srcset`/`sizes`를 사용하지만 서비스 카드 다수는 동일 원본을 lazy로 로딩한다.

### 8. 다음 단계 수정 우선순위

1. `/neo-operation-room`: `new window.Image()` 선로딩 제거/축소, method cover `loading="eager"` 제거, 대형 PNG 경량 포맷 분리.
2. `/neo-operation-room`: BGM `<source src>` 제거 후 사용자 클릭 시 `src` 주입.
3. `/music`: current/next audio의 `audio.load()`를 사용자 재생 클릭 이후로 이동.
4. `/fortune-tea-house`: background/overlay/sprite를 stage 진입 후 순차 로딩하고 숨김 preload 제거.
5. 타로 앨범: 해금 grid 가상화, reveal face는 클릭 후 mount.
6. 메인 페이지: first viewport 외 서비스 카드/음악 커버 lazy 삽입 시점 검증.
7. 공통 폰트: 실제 사용 font subset과 route별 로딩 분리 검토.
