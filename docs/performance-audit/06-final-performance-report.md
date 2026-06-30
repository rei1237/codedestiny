# 06 Final Performance Report

## 측정 범위

- 수정 전 기준: `docs/performance-audit/results/network-summary.csv`의 production cold load.
- 수정 후 기준: `http://localhost:3100` 로컬 cold load.
- 측정 도구: `scripts/performance-audit/measure-network.ts`.
- 측정 조건: cache disabled, mobile `390x844`, desktop `1440x1000`, cold/repeat 각 1회.
- 산출물:
  - `docs/performance-audit/results/local-after-20260630/network-summary.csv`
  - `docs/performance-audit/results/local-after-20260630/network-heavy-requests.csv`
  - `docs/performance-audit/results/local-after-20260630-rerun/network-summary.csv`
  - `docs/performance-audit/results/local-after-dev-server.err.log`

로컬 after 측정은 일부 라우트가 500 또는 404를 반환했다. 특히 `/palm-reading`은 `./lib/palm/palm-ui-state.js`의 `import.meta` 파싱 오류가 기록되었고, 여러 desktop App Router 라우트는 `Cannot read properties of undefined (reading '/_app')` 오류로 fallback bundle만 측정되었다. 따라서 아래 비교에서 `무효`로 표시된 행은 대역폭 개선 판정에 사용하지 않는다.

production 재측정은 아직 배포가 없어서 수행하지 않았다. 배포 전 로컬 검증 결과만 이 문서에 고정한다.

## 실행 명령

```bash
npm run dev:next -- -p 3100
node scripts/performance-audit/measure-network.ts --base-url http://localhost:3100 --out-dir docs/performance-audit/results/local-after-20260630 --mode top20 --viewports mobile,desktop --runs cold,repeat --max-wait-ms 15000
node scripts/performance-audit/measure-network.ts --base-url http://localhost:3100 --out-dir docs/performance-audit/results/local-after-20260630-rerun --urls /music,/palm-reading --viewports mobile --runs cold,repeat --max-wait-ms 15000
```

## 수정 전후 비교

| URL | viewport | 수정 전 transferred | 수정 후 transferred | 감소율 | 수정 전 요청 수 | 수정 후 요청 수 | 남은 가장 큰 파일 | 통과 여부 |
|---|---|---:|---:|---:|---:|---:|---|---|
| `/` | mobile | 3.32 MB | 1.73 MB | 48.1% | 49 | 44 | `/` document 303.7 KB | 부분 통과: local 200, 외부 font/API 오류 있음 |
| `/` | desktop | 4.76 MB | 784.9 KB | 83.9% | 57 | 38 | `/` document 303.7 KB | 부분 통과: local 200, 외부 font/API 오류 있음 |
| `/music` | mobile | 3.71 MB | 648 B | N/A | 74 | 2 | `/music/` 348 B | 무효: local 500 |
| `/music` | desktop | 1.55 MB | 1.80 MB | N/A | 39 | 7 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/fortune-tea-house` | mobile | 4.98 MB | 3.58 MB | 28.3% | 59 | 32 | `main-app.js` 1.69 MB | 부분 통과: local 200, R2/font 오류 있음 |
| `/fortune-tea-house` | desktop | 4.61 MB | 1.86 MB | N/A | 57 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/neo-operation-room` | mobile | 29.67 MB | 10.97 MB | 63.0% | 49 | 21 | `네오 반신상 배경없음-Photoroom.png` 1.98 MB | 부분 통과: method cover 선로딩 제거 확인 |
| `/neo-operation-room` | desktop | 6.18 MB | 1.86 MB | N/A | 28 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/neo-operation-room/result` | mobile | 8.73 MB | 12.85 MB | -47.2% | 42 | 22 | `사자 휘장 c부터ex-Photoroom.png` 2.39 MB | 실패: 결과 페이지 대형 PNG 남음 |
| `/neo-operation-room/result` | desktop | 309.7 KB | 1.86 MB | N/A | 37 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/login` | mobile | 584.3 KB | 2.80 MB | -390.0% | 33 | 12 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/login` | desktop | 1.08 MB | 1.86 MB | N/A | 80 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/points` | mobile | 1.70 MB | 2.80 MB | -64.6% | 50 | 12 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/points` | desktop | 1.62 MB | 1.86 MB | N/A | 71 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/premium-unlock` | mobile | 675.5 KB | 4.19 MB | -535.3% | 32 | 12 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/premium-unlock` | desktop | 303.3 KB | 1.86 MB | N/A | 35 | 10 | `fallback/main.js` 1.73 MB | 무효: local 500 |
| `/life-book-ai` | mobile | 819.7 KB | 2.88 MB | -260.2% | 30 | 12 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/life-book-ai` | desktop | 819.8 KB | 621 B | N/A | 30 | 2 | `/life-book-ai/` 321 B | 무효: local 500 |
| `/love-secret-ai` | mobile | 946.1 KB | 2.90 MB | -213.5% | 35 | 13 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/love-secret-ai` | desktop | 594.4 KB | 621 B | N/A | 34 | 2 | `/love-secret-ai/` 321 B | 무효: local 500 |
| `/karma-destiny-ai` | mobile | 707.8 KB | 2.94 MB | -325.5% | 34 | 13 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/karma-destiny-ai` | desktop | 403.9 KB | 621 B | N/A | 40 | 2 | `/karma-destiny-ai/` 321 B | 무효: local 500 |
| `/ziwei-ai` | mobile | 1.11 MB | 2.90 MB | -161.6% | 34 | 14 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/ziwei-ai` | desktop | 1.11 MB | 621 B | N/A | 34 | 2 | `/ziwei-ai/` 321 B | 무효: local 500 |
| `/astrology-ai` | mobile | 1.11 MB | 2.89 MB | -160.9% | 34 | 14 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/astrology-ai` | desktop | 973.4 KB | 621 B | N/A | 33 | 2 | `/astrology-ai/` 321 B | 무효: local 500 |
| `/vedic-ai` | mobile | 691.2 KB | 2.92 MB | -332.2% | 31 | 21 | `main-app.js` 1.69 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/vedic-ai` | desktop | 702.0 KB | 621 B | N/A | 34 | 2 | `/vedic-ai/` 321 B | 무효: local 500 |
| `/sukuyo-compatibility-ai` | mobile | 1.12 MB | 756.5 KB | 34.1% | 35 | 8 | `layout.js` 603.8 KB | 부분 통과: local 200, 외부 오류 있음 |
| `/sukuyo-compatibility-ai` | desktop | 656.5 KB | 621 B | N/A | 45 | 2 | `/sukuyo-compatibility-ai/` 321 B | 무효: local 500 |
| `/saju/destiny-bias` | mobile | 653.2 KB | 724.8 KB | N/A | 34 | 7 | `layout.js` 603.8 KB | 무효: local 404 |
| `/saju/destiny-bias` | desktop | 642.9 KB | 621 B | N/A | 31 | 2 | `/saju/destiny-bias/` 321 B | 무효: local 500 |
| `/saju/love-simulation` | mobile | 3.84 MB | 728.0 KB | 81.5% | 78 | 8 | `layout.js` 603.8 KB | 부분 통과: local 200, 외부 오류 있음 |
| `/saju/love-simulation` | desktop | 4.31 MB | 621 B | N/A | 76 | 2 | `/saju/love-simulation/` 321 B | 무효: local 500 |
| `/tarot/prompt-maker` | mobile | 928.6 KB | 1.74 MB | -91.5% | 41 | 9 | prompt maker chunk 1022.6 KB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/tarot/prompt-maker` | desktop | 704.7 KB | 621 B | N/A | 36 | 2 | `/tarot/prompt-maker/` 321 B | 무효: local 500 |
| `/tarot/mindscan` | mobile | 850.1 KB | 2.28 MB | -175.2% | 40 | 8 | `main-app.js` 1.68 MB | 부분 통과: local 200, dev bundle 영향 큼 |
| `/tarot/mindscan` | desktop | 791.4 KB | 621 B | N/A | 46 | 2 | `/tarot/mindscan/` 321 B | 무효: local 500 |
| `/palm-reading` | mobile | 1.13 MB | 621 B | N/A | 31 | 2 | `/palm-reading/` 321 B | 무효: local 500 |
| `/palm-reading` | desktop | 1.13 MB | 621 B | N/A | 31 | 2 | `/palm-reading/` 321 B | 무효: local 500 |

## 검증 항목

| 검증 항목 | 결과 | 근거 | 실패 시 추가 조치 |
|---|---|---|---|
| 운명의 찻집 첫 진입 시 mp3 자동 다운로드 없음 | 통과 | local `/fortune-tea-house` mobile cold/repeat의 `audioVideoBytes`가 `0 B`, heavy requests에 `.mp3`/`.wav` 없음 | production 배포 후 동일 URL 재측정 |
| 음악 감상실 첫 진입 시 전체 음원 자동 다운로드 없음 | 부분 통과 | local `/music`은 500이라 network 비교 무효. 코드상 `new Audio()`는 `preload = "none"`, 실제 `audio.src = track.audioUrl`은 `playCurrentAudio()` 내부에서만 실행 | `/music` local 500 해소 후 network 재측정 |
| 타로 앨범 첫 진입 시 전체 카드 이미지 일괄 다운로드 없음 | 통과 유지 | 2단계 baseline과 local after heavy requests에 78장 카드 원본 일괄 요청 없음. 5단계에서 이 로직은 변경하지 않음 | 카드 앨범 전용 URL을 별도 측정 세트에 추가 |
| 스프라이트 시트가 애니메이션 시작 전부터 다운로드되지 않음 | 부분 통과 | Neo operation room의 `criticalAssets` 선로딩 제거 후 method cover 이미지 4종이 local after cold heavy top에서 사라짐. Fortune Tea House sprite/background는 아직 남음 | Fortune Tea House sprite 조건부 로딩 분리 |
| 메인 페이지 초기 transferred size 감소 | 부분 통과 | local cold 기준 mobile 3.32 MB -> 1.73 MB, desktop 4.76 MB -> 784.9 KB. 외부 asset 오류가 있어 production 확정값 아님 | 배포 후 production cold 재측정 |
| 모바일에서 데스크탑 대형 배경 미로딩 | 부분 통과 | `/neo-operation-room` mobile cold heavy top에서 기존 method cover와 desktop hero 선로딩은 제거됨. `/fortune-tea-house` mobile은 desktop loading background가 여전히 요청됨 | CSS/media 분기와 background-image 구조 개선 |
| 동일 API 반복 호출 감소 | 미검증 | local 측정이 500/fallback과 외부 요청 실패가 섞여 production 반복 호출과 비교 불가. 5단계에서 API 호출 로직은 수정하지 않음 | production after에서 repeatedApiCalls만 재비교 |
| 결제/이용권/잠금 해제/AI 상담 결과 정상 | 네트워크 성능 기준 미검증 | 관련 결제, entitlement, AI 저장/조회 로직은 수정하지 않음. local route 500 때문에 E2E 정상성 판정 불가 | local runtime 오류 해소 후 결제 없는 smoke와 잠금 상태 조회만 검증 |

## Repeat Load 관찰

- `/neo-operation-room` mobile repeat는 `21.16 MB`로 cold보다 커졌다. `네오 반신상 배경없음-Photoroom.png`가 여러 번 기록되어 local dev 환경의 이미지 컴포넌트/중복 요청 여부를 추가 추적해야 한다.
- `/fortune-tea-house` mobile repeat는 `9.90 MB`로 cold보다 커졌다. dev chunk와 Fortune Tea House page chunk가 크게 잡혀 production build 재측정이 필요하다.
- `/music` mobile repeat는 500 응답만 측정되어 음원 자동 로딩 여부를 network로 확정할 수 없다. 다만 completed local request logs 전체에서 `.mp3`/`.wav` heavy request는 발견되지 않았다.

## 결론

1. 실제로 줄어든 대역폭 예상치
   - 가장 신뢰 가능한 local 200 비교는 `/neo-operation-room` mobile cold다. `29.67 MB`에서 `10.97 MB`로 약 `18.70 MB`, `63.0%` 감소했다.
   - 5단계 수정으로 초기 선로딩에서 빠진 method cover 원본 4종은 baseline 기준 약 `11.8 MB` 절감 기대가 있다.
   - `/music`은 network after가 500이라 확정값은 없다. 코드상 사용자 재생 전 음원 URL 할당을 제거했으므로 baseline mobile cold의 audio/video `1.03 MB` 이상이 production after에서 줄어드는지 확인해야 한다.

2. 가장 큰 개선 효과가 있었던 수정
   - `src/features/neo-war-room/NeoOperationRoomPage.tsx`의 `criticalAssets` 이미지 선로딩 제거와 method cover `loading="lazy"` 전환이 가장 컸다.
   - `app/music/_hooks/useMusicPlayer.ts`의 pre-play 음원 URL 할당 제거는 network 재측정 전이지만, 자동 음원 다운로드 차단 효과가 가장 직접적이다.

3. 아직 남은 무거운 페이지
   - `/neo-operation-room/result` mobile: `12.85 MB`, 대형 PNG `사자 휘장 c부터ex-Photoroom.png` 2.39 MB 등 결과 페이지 이미지가 남음.
   - `/neo-operation-room` mobile repeat: `21.16 MB`, `네오 반신상 배경없음-Photoroom.png` 반복 요청 의심.
   - `/fortune-tea-house` mobile repeat: `9.90 MB`, Fortune Tea House page chunk와 background/sprite 계열 추가 추적 필요.
   - `/music`: local 500 때문에 production after 검증 전까지 최종 판정 보류.

4. Cloudflare Free만으로는 확인 불가능한 부분
   - R2 object별 실제 전송량.
   - 외부 핫링크나 봇이 특정 asset을 몇 GB 사용했는지.
   - URL별 Cache HIT/MISS 대역폭.
   - User-Agent, referrer, 국가별 bandwidth breakdown.

5. Pro 없이 추가로 할 수 있는 다음 조치
   - local 500 원인부터 고정한 뒤 동일 스크립트를 다시 실행.
   - 배포 후 production `--base-url https://code-destiny.com`로 같은 URL 목록 재측정.
   - CI에 `preload="auto"`, mount 시점 `audio.src`, `criticalAssets`, `new window.Image()` 금지 정적 체크 추가.
   - Neo result 대형 PNG와 Fortune Tea House desktop background/sprite를 조건부 로딩으로 분리.

6. Pro 1개월을 써야만 확인 가능한 항목
   - Cache Analytics에서 실제 URL별 transfer 상위 목록.
   - R2 object별 egress 상위 파일.
   - 봇/핫링크 referrer별 전송량.
   - edge cache miss가 큰 라우트와 asset의 실제 원인.

7. 롤백 방법
   - 커밋 후라면 5단계 성능 수정 커밋만 `git revert`한다.
   - 현재처럼 dirty worktree가 섞인 상태에서는 전체 파일 `git restore`를 쓰지 않는다.
   - 되돌릴 hunk는 `app/music/_hooks/useMusicPlayer.ts`의 pre-play audio 변경과 `src/features/neo-war-room/NeoOperationRoomPage.tsx`의 BGM/source/preload/criticalAssets/lazy loading 변경으로 제한한다.
