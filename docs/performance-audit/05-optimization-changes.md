# 05. 안전한 최소 최적화 변경 기록

작성일: 2026-06-30

이번 단계는 04단계에서 확실도가 높은 원인 중 기능 회귀 위험이 낮은 항목만 수정했다. 결제, 이용권, 잠금 해제, AI 상담 결과, 프로필 저장/조회 로직은 수정하지 않았다.

| 수정 파일 | 수정 내용 | 원인 후보 | 기대 효과 | 위험도 | 롤백 방법 |
|---|---|---|---|---|---|
| `app/music/_hooks/useMusicPlayer.ts` | 초기 mount와 트랙 변경 시 `audio.src`를 넣지 않도록 변경. `preload` 기본값을 `none`으로 두고, 사용자가 재생할 때만 현재 트랙 URL을 할당한다. 다음 트랙 `new Audio()` metadata preload 제거 | `/music` current/next WAV 클릭 전 자동 요청 | `/music` 최초 진입 시 `Gisin Out Yongsin In.wav`, `Moonlight Daydream.wav` 같은 음원 다운로드 방지 | 중간 | 해당 파일에서 `audio.src/currentTrack.audioUrl` 트랙 변경 effect와 next preload effect를 이전 diff로 복원 |
| `src/features/neo-war-room/NeoOperationRoomPage.tsx` | BGM `<audio>`에서 `<source src>` 제거. mount/첫 pointer/keydown에서 자동 `playNeoBgm()` 호출하던 effect 제거. BGM 토글 클릭 시에만 URL 할당 및 재생 | Neo 작전실 BGM MP3 클릭 전 요청 | `/neo-operation-room` 초기 진입 시 `DestinyWar` MP3 자동 요청 방지 | 낮음-중간 | `<source>`와 기존 BGM autoplay/unlock effect를 이전 diff로 복원 |
| `src/features/neo-war-room/NeoOperationRoomPage.tsx` | `criticalAssets` `new window.Image()` 선로딩 제거. method cover 이미지를 `loading="eager"`에서 `loading="lazy"`로 변경 | Neo method cover 대형 PNG 4장 초기 로딩 | `/neo-operation-room` 진입 시 2-3MB급 method 이미지 4장과 배경/hero 선로딩 감소 | 중간 | `criticalAssets` effect와 method cover `loading="eager"`를 이전 diff로 복원 |

## 적용 내역

### 1. 수정한 페이지/컴포넌트

- `/music`: `useMusicPlayer`
- `/neo-operation-room`: `NeoOperationRoomPage`

### 2. mp3/audio 자동 로딩 제거 여부

- `/music`: 초기 렌더와 트랙 변경에서 `audio.src`를 할당하지 않는다. 사용자 재생 시점에만 현재 트랙 URL을 넣는다.
- `/music`: 다음 트랙 `new Audio()` metadata preload를 제거했다.
- `/neo-operation-room`: `<audio>`의 `<source src>`를 제거했고, mount/첫 입력 이벤트 기반 자동 재생 시도를 제거했다.

### 3. 타로 카드 전체 로딩 제거 여부

- 이번 변경에서 타로 카드 매핑/앨범/잠금 상태 코드는 수정하지 않았다.
- 03단계 조사 기준으로 잠금 상태에서는 78장 전체 이미지 로딩 증거가 없고, 해금 grid는 `loading="lazy"` 상태다.
- 결제/잠금 해제 안정성을 우선해 이번 최소 수정 범위에서는 건드리지 않았다.

### 4. 스프라이트 초기 로딩 제거 여부

- Neo 작전실의 `criticalAssets` 이미지 선로딩을 제거해 sprite/hero/method 계열 초기 선요청을 줄였다.
- 찻집 Yeoni hidden sprite preload는 이번 목표 파일 범위 밖이라 수정하지 않았다.

### 5. 이미지 lazy loading 적용 내역

- Neo 작전실 method cover 이미지를 `loading="lazy"`로 변경했다.
- 기존 첫 화면 hero 이미지 priority 정책은 이번 단계에서 변경하지 않았다.

### 6. JS dynamic import 적용 내역

- 없음.
- 04단계 분석 기준 JS 번들은 1차 병목이 아니어서 이번 안전 최소 수정 범위에서 제외했다.

### 7. 건드리지 않은 결제/AI/잠금 로직 목록

- 결제/이용권/월정석/단건결제 흐름
- 허니드롭 및 타로 앨범 잠금 해제 로직
- AI 상담 생성/저장/조회 로직
- 프로필 저장/조회 로직
- `/api/auth/me` 반복 호출 로직

### 8. 롤백 방법

- `app/music/_hooks/useMusicPlayer.ts`를 이전 diff로 되돌리면 음악 preload 동작이 복원된다.
- `src/features/neo-war-room/NeoOperationRoomPage.tsx`에서 BGM `<source>`, 자동 unlock/play effect, `criticalAssets` preload effect, method cover `loading="eager"`를 되돌리면 기존 동작이 복원된다.
- 문서만 되돌릴 때는 `docs/performance-audit/05-optimization-changes.md`를 삭제하면 된다.

## 검증 결과

- `npm run lint -- --file app/music/_hooks/useMusicPlayer.ts --file src/features/neo-war-room/NeoOperationRoomPage.tsx`: 통과
- 정적 패턴 검사: `preload="auto"`, `preload = "auto"`, Neo BGM `<source src>`, `criticalAssets`, `new window.Image()`, method `loading="eager"`, music `nextAudio` 미검출
- `git diff --check -- app/music/_hooks/useMusicPlayer.ts src/features/neo-war-room/NeoOperationRoomPage.tsx docs/performance-audit/05-optimization-changes.md`: 통과
- `node scripts/verify-entry-encoding.mjs --strict-core`: 통과
- `npm run typecheck`: 실패. 실패 위치는 기존 `scripts/generate-music-manifest.ts`, `scripts/performance-audit/measure-network.ts` 타입 오류이며 이번 변경 파일의 lint 검증은 통과했다.
