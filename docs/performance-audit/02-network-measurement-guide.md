# Chrome Network 자동 측정 가이드

## 목적

`docs/performance-audit/01-route-inventory.md`의 URL 목록을 기준으로 Chrome DevTools Network 계측을 자동화한다. 기본 측정 대상은 production `https://code-destiny.com`이며, local URL도 같은 스크립트로 측정할 수 있다.

## 실행 명령

기본 production Top 20 측정:

```powershell
node scripts/performance-audit/measure-network.ts
```

로컬 서버 측정:

```powershell
node scripts/performance-audit/measure-network.ts --base-url http://localhost:3000
```

일부 URL만 빠르게 스모크 측정:

```powershell
node scripts/performance-audit/measure-network.ts --limit 3 --viewports mobile --runs cold --max-wait-ms 5000
```

P0/P1/P2 표 전체 측정:

```powershell
node scripts/performance-audit/measure-network.ts --mode p0p1p2
```

수동 URL 지정:

```powershell
node scripts/performance-audit/measure-network.ts --url /music --url /fortune-tea-house
```

Chrome 실행 파일을 직접 지정:

```powershell
node scripts/performance-audit/measure-network.ts --chrome-path "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## 측정 조건

- 브라우저 캐시 비활성화
- Service Worker 우회 시도
- mobile viewport: `390x844`
- desktop viewport: `1440x1000`
- URL당 `cold`, `repeat` 2회 측정
- network idle 또는 최대 15초까지 대기
- 자동 클릭 없음
- 실제 결제 요청 실행 없음
- 로그인/결제 필요 페이지는 접근 가능한 초기 화면까지만 기록
- audio/mp3는 실제 network 요청 여부만 기준으로 판단

## 결과 파일

- `docs/performance-audit/results/network-summary.csv`
  - URL, viewport, run별 총 요청 수와 transferred size 집계
  - document, image, js, css, font, audio/video, fetch/xhr 분리 집계
  - 자동 audio, sprite, R2 요청, 반복 API, 4xx/5xx 요청 기록

- `docs/performance-audit/results/network-heavy-requests.csv`
  - 전체 페이지를 통틀어 가장 큰 요청 Top 100
  - request URL, path, resource type, mime type, status, transferred size, encoded body size, cache, initiator, 확장자, 파일명 기록
  - component 추적 필요 여부 표시

- `docs/performance-audit/results/network-summary.md`
  - URL별 요약 표
  - 가장 무거운 URL Top 20
  - 가장 무거운 파일 Top 20
  - 자동 로딩 mp3/audio
  - 자동 로딩 sprite sheet
  - 이미지 과다 로딩 페이지
  - JS 번들이 큰 페이지
  - Fetch/XHR 반복 호출 의심
  - 다음 코드 추적 후보

## 판정 기준

- 초기 로딩 5MB 이상: `watch`
- 초기 로딩 10MB 이상: `high`
- 초기 로딩 20MB 이상: `very-high`
- audio/mp3가 사용자 클릭 전에 로딩됨: `very-high`
- 타로 카드/앨범 이미지가 20장 이상 한 번에 로딩됨: `high`
- 이미지 요청 30개 이상: `high`
- sprite sheet가 화면 진입 즉시 로딩됨: `high`
- JS transferred size 1.5MB 이상: `watch`
- JS transferred size 3MB 이상: `high`
- 동일 API가 3회 이상 반복 호출됨: `high`

## 다음 추적 방식

`network-heavy-requests.csv`에서 `componentTraceNeeded=yes`인 요청부터 라우트 파일과 주요 컴포넌트를 연결해 추적한다. 특히 R2, `codedestinyassets`, `codedestinymusic`, mp3, sprite, 1MB 이상 이미지, 512KB 이상 JS 요청을 우선 확인한다.
