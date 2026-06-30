# 04. 성능 원인 확실도 분석

작성일: 2026-06-30

이 문서는 수정 전 원인 후보를 확실도 기준으로 분류한다. Cloudflare Free 플랜에서는 URL별/Data Transfer 상위 파일을 직접 볼 수 없으므로, Playwright Network 측정값, 코드 사용처, 에셋 로딩 구조를 함께 보되 한계를 분리해서 기록한다.

## 확실도 기준

- 확실: Network 측정에서 실제 자동/초기 로딩 확인 + 코드 위치 확인
- 높음: Network에서 큰 요청 확인 + 코드 사용처 확인
- 중간: 코드상 위험 패턴 확인, Network에서는 일부만 확인
- 낮음: Cloudflare 수치상 의심 가능하지만 직접 증거 부족

## 원인 후보 분류표

| 순위 | 원인 후보 | 카테고리 | 근거 | 영향 페이지 | 예상 대역폭 영향 | 확실도 | 수정 난이도 | 추천 조치 |
|---|---|---|---|---|---|---|---|---|
| 1 | Neo 작전실 method cover 대형 PNG 4장이 초기 로딩됨 | A, C | `/neo-operation-room` desktop 29.90 MB, mobile 29.67 MB. Heavy Top은 `네오 전략실 베다점 이미지.png` 3.17 MB, 자미두수 2.94 MB, 사주 2.88 MB, 점성술 2.82 MB. 코드에서 `new window.Image()` 선로딩과 `loading="eager"` 확인 | `/neo-operation-room` | 매우 큼. 한 페이지 진입당 10MB 이상 이미지 절감 가능 | 확실 | 중간 | method cover는 선택 영역 진입 후 lazy, 썸네일/WebP/AVIF 별도 생성 |
| 2 | Neo 작전실 desktop/mobile/background/hero 이미지가 함께 로딩됨 | A, C | mobile 측정에서도 desktop 배경 이미지가 관측됨. 코드에서 desktop/mobile/prologue 배경 CSS 변수와 criticalAssets 선로딩 배열 확인 | `/neo-operation-room`, `/neo-operation-room/result` | 매우 큼. 배경 2장 이상 중복 로딩 시 수 MB 단위 | 확실 | 중간 | 현재 viewport 배경만 로딩, prologue/결과 배경은 stage 진입 후 요청 |
| 3 | Neo 작전실 BGM MP3가 사용자 클릭 전 요청됨 | B | Network `autoAudioRequests`에 `DestinyWar/The Moonlit War Room.mp3` 관측. 코드에 `<audio preload="none"><source src=...>`와 클릭 시 `audio.src/audio.load()` 흐름 존재 | `/neo-operation-room` | 중간. 측정 transferred는 작아도 range/full 요청 정책에 따라 누적 가능 | 확실 | 낮음-중간 | `<source>` 제거, 사용자가 BGM 버튼을 누른 뒤에만 `src` 주입 |
| 4 | 음악 감상실이 현재/다음 트랙 WAV를 클릭 전 load함 | B | `/music` mobile 3.71 MB, `Gisin Out Yongsin In.wav`, `Moonlight Daydream.wav` 자동 요청 관측. 코드에서 mount 후 `audio.src`, `audio.load()`, next `new Audio()` metadata preload 확인 | `/music` | 큼. WAV encoded body가 수십 MB라 사용자 수 증가 시 누적 위험 | 확실 | 중간 | 재생 클릭 전 `src/load` 금지, next track preload 제거 또는 opt-in |
| 5 | Neo 결과 화면이 대형 배경/히어로/장식 이미지를 즉시 로딩함 | A, C | `/neo-operation-room/result` mobile 14.51 MB. 코드에서 background CSS 변수, fullbody priority, 장식 이미지 렌더 확인 | `/neo-operation-room/result` | 큼. 결과 진입당 수 MB 단위 | 확실 | 중간 | 결과용 경량 배경/히어로 분리, 장식 lazy |
| 6 | Fortune Tea House 배경/오버레이/캐릭터 이미지가 stage 초기에 누적됨 | A, C | `/fortune-tea-house` desktop 8.08 MB, mobile 6.66 MB. 코드에서 stage별 desktop/mobile background와 overlay CSS 변수, 캐릭터 컷아웃 priority 확인 | `/fortune-tea-house` | 큼. 5MB 초과 페이지를 2-4MB대로 낮출 가능성 | 높음 | 중간 | 첫 stage 필수 배경만 로딩, overlay와 다음 stage 이미지는 지연 |
| 7 | 찻집 entry/loading sprite sheet와 캐릭터 sheet가 애니메이션 전 선로딩됨 | D, C | 코드에서 `TeaHouseEntryScene`의 `new window.Image()`, `ScentLoadingScene`의 eager sprite, `YeoniDialogueActor`의 hidden preloadFrames 확인. Network sprite 자동 분류는 미검출 | `/fortune-tea-house` 상담 단계 | 중간-큼. stage별 수백 KB-수 MB 가능 | 중간 | 중간 | 현재 stage/현재 frame sheet만 로딩, hidden preload 제거 |
| 8 | 타로 앨범 해금 후 78장 카드 grid가 한 번에 DOM에 생성됨 | C | 코드에서 `DestinyCafe/caretaro` 78장 URL 매핑과 unlocked grid 전체 렌더 확인. 이미지는 lazy, Network 초기 측정에서는 전체 로딩 미확인 | `/fortune-tea-house` 타로 앨범 | 중간. 해금 사용자/스크롤 조건에서 급증 가능 | 중간 | 중간 | grid 가상화, 첫 viewport 카드만 mount |
| 9 | 타로 상담 reveal face 카드가 클릭 전 eager로 로딩될 수 있음 | C | `TarotRevealScene`이 1/3/5장 face를 함께 렌더하고 `TarotAssetCard`가 `size="lg"` 또는 `visualOnly`면 eager | `/fortune-tea-house` 타로 상담 | 중간. 상담 1회당 카드 수만큼 증가 | 중간 | 낮음-중간 | 뒷면 선택 전 face component mount 지연 |
| 10 | 메인 정적 shell에서 서비스 카드/음악 커버/공통 이미지가 누적 로딩됨 | A, C | `/` desktop 4.76 MB, mobile 4.01 MB. Network에 `veda.webp`, `sukyo.webp`, `jumsung.webp`, `jami.webp`, 음악 커버, logo 다수 확인 | `/` | 중간. 첫 화면 외 카드 로딩 조정 시 수백 KB-1MB대 절감 가능 | 높음 | 중간 | first viewport 외 lazy 삽입 시점 확인, 음악 커버는 노출 직전 요청 |
| 11 | 공통 R2 폰트 4종이 여러 페이지에서 초기 로딩됨 | A, G | Network에서 `The Jamsil OTF`, `netmarbleM.ttf`, `Galmuri11-Bold.woff2`, `Mulmaru.woff2`가 다수 페이지에 반복 등장. CSS font-face 확인 | 전체 Next/static 페이지 | 중간. 페이지당 약 1MB 전후 | 높음 | 중간 | 실제 첫 화면 폰트 subset, route별 font-family 사용량 분리 |
| 12 | 메인/사주 연애 시뮬레이션의 정적 JS 엔진이 크게 로딩됨 | E | `/`, `/saju/love-simulation`에서 `saju-engine.js` 542.8 KB, `saju-engine-tarot-sukuyo-quantum.js` 309.7 KB 관측 | `/`, `/saju/love-simulation` | 중간. 이미지보다 작지만 방문량 많은 페이지에서 누적 | 높음 | 중간-높음 | route별 코드 분리 가능성 조사, 초기 실행에 불필요한 엔진 lazy |
| 13 | Next route별 JS 번들이 크지는 않지만 공통 chunk가 반복 로딩됨 | E | 2단계 기준 JS 1.5MB 이상 단일 페이지는 없음. 다만 `/music`, AI route에서 공통 chunks와 CSS가 반복됨 | `/music`, AI 상담 페이지, 타로 페이지 | 낮음-중간 | 중간 | 중간 | 큰 이미지/audio 수정 후 bundle analyzer로 후순위 점검 |
| 14 | `/api/auth/me` 반복 호출이 일부 desktop 측정에서 발생함 | F | Network에서 `/login` x23, `/points` x14, `/karma-destiny-ai` x11, `/tarot/mindscan` x16 등 관측. 이번 단계에서 원인 코드 위치는 미추적 | 로그인/포인트/AI/타로 일부 | 낮음-중간. 대역폭보다 요청 수/TTFB 영향 | 중간 | 중간 | auth 상태 조회 dedupe/cache 위치 추적, 결제/권한 로직은 보존 |
| 15 | R2 원본 PNG를 `next/image` 최적화 없이 그대로 제공함 | C, G | `NeoWarRoomAssetImage`, `AssetImage`에서 `unoptimized` 사용. Heavy Top이 원본 PNG 2-3MB대 | `/neo-operation-room`, `/fortune-tea-house` | 큼. 포맷 변환 시 수 MB 단위 절감 가능 | 높음 | 중간 | 원본 보존, 표시용 WebP/AVIF 파생본 추가 |
| 16 | CSS background-image가 큰 이미지를 즉시 요청할 수 있음 | A, C | Neo/찻집 shell에서 큰 배경을 CSS 변수로 삽입. 메인 일부 서비스 tile도 CSS background 사용 | `/neo-operation-room`, `/fortune-tea-house`, `/` | 중간-큼 | 높음 | 중간 | media query와 stage 조건으로 실제 필요한 background만 삽입 |
| 17 | 캐시/파일명 정책은 측정 도구만으로 실제 CDN HIT/MISS를 판단하기 어려움 | G | Playwright 측정은 browser cache disabled. CSV의 `cache=no`는 브라우저 캐시 기준이며 Cloudflare CDN HIT/MISS 증거가 아님 | 전체 정적/R2 에셋 | 불명. 트래픽 급증 시 매우 클 수 있음 | 낮음 | 중간 | Cloudflare Cache Analytics 또는 응답 헤더 샘플링으로 별도 확인 |
| 18 | 외부 핫링크/봇이 R2 이미지나 음악을 직접 가져갈 가능성 | H | Browser Network 재현만으로는 외부 referrer/bot 트래픽을 볼 수 없음. R2/Cloudflare Free에서 파일별 실제 전송량 제한 | R2 assets, music assets | 불명. 실제 Cloudflare 대역폭이 측정보다 크면 후보 | 낮음 | 중간 | hotlink protection, signed URL/Referer 정책, Cloudflare 로그 기능 검토 |

## 카테고리별 해석

### A. 프론트엔드 초기 로딩 문제

- 가장 강한 근거는 `/neo-operation-room`, `/neo-operation-room/result`, `/fortune-tea-house`, `/`다.
- `/neo-operation-room`은 단순히 파일이 큰 것이 아니라, Network와 코드에서 초기 로딩 구조가 함께 확인됐다.
- `/fortune-tea-house`는 특정 단일 파일보다 stage 배경, overlay, 캐릭터 이미지가 누적되는 패턴이다.

### B. 음원 자동 로딩 문제

- `/music`은 확실하다. `audio.src`와 `audio.load()`가 사용자 클릭 전 실행되고, 다음 트랙도 metadata preload된다.
- `/neo-operation-room`도 production 측정에서 MP3 자동 요청이 잡혔다. 현재 코드 상수명과 production 요청 파일명은 다르므로 배포본 차이는 별도 확인이 필요하다.
- 찻집 BGM은 코드상 `preload="none"`이고 source를 바로 넣지 않으며, 2단계 측정에서도 자동 audio 요청이 확인되지 않았다.

### C. 이미지/카드/앨범 과다 로딩 문제

- Neo 작전실 대형 PNG와 viewport 배경 중복이 최우선이다.
- 찻집은 배경/캐릭터 컷아웃/타로 이미지가 섞여 있지만, 타로 앨범 78장 전체가 잠금 상태에서 로딩된 증거는 없다.
- 카드 앨범은 해금 후 lazy grid 구조라 “현장 위험”은 있으나 초기 전체 로딩 원인으로 단정하면 안 된다.

### D. 스프라이트 시트 자동 로딩 문제

- Network 자동 분류에는 sprite sheet가 잡히지 않았다.
- 코드상 `new Image`, hidden preload, eager sprite가 있어 중간 확실도 위험으로 분류한다.
- 다음 단계에서는 sprite 파일 크기와 stage별 실제 요청 시점을 Playwright trace로 다시 확인해야 한다.

### E. JS 번들 과대 문제

- 이미지/audio에 비하면 1차 원인은 아니다.
- `saju-engine.js`와 `saju-engine-tarot-sukuyo-quantum.js`는 방문량이 많은 `/`와 `/saju/love-simulation`에서 누적 영향을 만든다.
- JS 1.5MB 이상 단일 페이지는 2단계에서 확인되지 않았다.

### F. Fetch/XHR 반복 호출 문제

- `/api/auth/me` 반복은 실제 Network에서 확인됐다.
- 그러나 이번 단계에서는 반복을 유발하는 React effect/store/provider 위치까지 추적하지 않았다.
- 결제/권한 로직과 연결될 수 있으므로 수정 전 별도 호출 흐름 감사가 필요하다.

### G. 캐시/파일명/정적 에셋 정책 문제

- Playwright 측정은 browser cache disabled라 실제 CDN cache hit/miss 판단에는 부적합하다.
- 고정 URL, query version, R2 public URL의 무효화 정책은 대역폭과 배포 반영성 모두에 영향을 줄 수 있다.
- 현재 확실한 것은 “큰 파일이 요청된다”이지 “Cloudflare 캐시가 안 먹는다”는 아니다.

### H. 봇/핫링크 가능성

- Browser Network에서는 실제 사용자 1회 로딩만 재현된다.
- Cloudflare Bandwidth가 브라우저 측정 합산보다 훨씬 크면, 외부 핫링크나 봇 직접 요청을 의심할 수 있다.
- Cloudflare Free만으로는 referrer/user-agent/object별 전송량을 직접 증명하기 어렵다.

## Cloudflare Pro 없이 확인 불가능한 부분

- 외부 사이트 핫링크가 실제 몇 GB를 사용했는지
- 특정 봇/크롤러가 어떤 URL 또는 R2 파일을 얼마나 긁었는지
- URL별 Cache HIT/MISS 대역폭
- 특정 R2 object별 실제 전송량
- country/device/referrer/user-agent별 asset transfer
- audio range request가 실제로 전체 파일 다운로드로 이어졌는지
- 특정 시간대 bandwidth spike의 정확한 요청 경로
- Cloudflare cache tier, edge location별 miss 원인

## 확실도가 “확실”인 원인

1. Neo 작전실 method cover 대형 PNG 4장 초기 로딩
2. Neo 작전실 desktop/mobile/background/hero 이미지 동시 로딩
3. Neo 작전실 BGM MP3 클릭 전 요청
4. 음악 감상실 current/next WAV 클릭 전 요청
5. Neo 결과 화면 대형 배경/히어로/장식 초기 로딩

## 확실도가 “높음”인 원인

1. Fortune Tea House 배경/오버레이/캐릭터 이미지 누적
2. 메인 정적 shell 서비스 카드/음악 커버/공통 이미지 누적
3. 공통 R2 폰트 4종 초기 로딩
4. 메인/사주 연애 시뮬레이션 정적 JS 엔진 로딩
5. R2 원본 PNG를 최적화 파생본 없이 제공
6. 큰 CSS background-image 즉시 요청 가능성

## 수정하면 가장 효과가 큰 Top 10

1. `/neo-operation-room` method cover 4장 선로딩/eager 제거
2. `/neo-operation-room` desktop/mobile/prologue 배경 동시 선로딩 제거
3. `/neo-operation-room` 대형 PNG 표시용 WebP/AVIF 파생본 적용
4. `/music` 사용자 클릭 전 `audio.src/audio.load()` 중단
5. `/music` next track metadata preload 중단
6. `/neo-operation-room` BGM `<source src>` 제거
7. `/neo-operation-room/result` 결과 배경/히어로/장식 lazy 및 경량화
8. `/fortune-tea-house` 첫 stage 외 배경/overlay 지연 로딩
9. `/fortune-tea-house` hidden sprite preload 제거
10. `/` first viewport 밖 서비스 카드/음악 커버 lazy 삽입 시점 재검증

## 그래도 지금 바로 수정 가능한 항목

- audio는 클릭 전 `src`를 주입하지 않는 방향으로 수정 가능하다.
- Neo method cover와 criticalAssets 선로딩은 feature logic과 분리되어 있어 비교적 안전하게 지연 가능하다.
- 결과 화면 장식 이미지는 우선순위를 낮추거나 lazy 처리 가능하다.
- 찻집 hidden sprite preload는 현재 보이는 frame 기준으로 축소 가능하다.
- 메인 카드 lazy 정책은 first viewport 기준으로 검증 후 조정 가능하다.

결제, AI 생성, API 권한 확인, 잠금 해제 정책은 이 단계의 수정 대상이 아니다.
