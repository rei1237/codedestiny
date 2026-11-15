# 달빛 연화당 — 나 혼자 머무는 2D 사찰

## 2026-11-15 표찰·글꼴 개선

사용자가 지적한 일반 사각 버튼을 크림·로즈 종이 표찰, 샴페인 골드 이중 테두리, 기존 예화 꽃가지 마스크로 바꿨다. 제목과 짧은 버튼은 기존 자체 호스팅 주아체(`CodeDestinyRounded`)를 사용한다. 긴 설명·입력란·음악 목록의 본문 서체는 유지한다. 저장 언어가 영어여도 한국어 연화당의 주아체가 풀리지 않도록 로컬 `--ml-display`와 `lang=ko`를 지정했다. 공용 타이포그래피 파일이나 폰트 파일은 수정하지 않았다.

주요 표찰 48px, 데스크톱·360/390/430px 가로 넘침 없음, 세 장면 표찰 간 겹침 0개, 키보드 Enter로 기도 패널 열기와 주아체 실제 로딩을 확인했다. 마당 불상의 얼굴·합장 손을 가리던 표찰 및 소품 표찰 좌표를 조정했고 시각 검수에서 확인했다. 캡처와 수치는 `D:/CodeDestiny-Build/moonlit-lotus/controls-v1/`에 보관한다. 원본 그림·애니메이션·세션·결제·인증·API·DB·색인 정책은 변경하지 않았다.

검증: `check:fast -- --plan` 후 `check:fast`는 Node 검사 5,099개 중 5,098개 통과, 격리 워크트리의 생성 운세 데이터 누락 1개로 중단됐다. 외부 호출 없는 `fortune:build-data` 실행 후 실패 파일 `sky-and-range.test.mjs` 7/7 재검증 통과. 남은 `smoke:core` 115+47 통과, 관련 Jest 대상 없음, 변경 TSX eslint 및 diff 공백 검사 통과. 전체 검사를 재실행해 통과했다고 보고하지 않는다. Impeccable detector 종료 0, 실제 화면은 별도로 검수했다. 도구가 알린 기존 PRODUCT/DESIGN 보조 문서 버전 차이는 이번 버튼 개선 범위에서 수정하지 않았다.

2026-11-15 구현·검수 기록. 화면은 `/moonlit-lotus/`, 원본 동작 검수는 `/moonlit-lotus/model-review/`다. 홈의 ‘나만의 연화당 들어가기’ 한 번으로 진입한다. 검색 제외는 접근 인증이 아니다. 운영 승격은 수행하지 않았다.

## 구현과 공간

마당, **법당 내부**, 연못을 동일한 부드러운 일러스트로 제작했다. 법당에는 꽃돼지 불상과 연꽃 좌대, 참배 방석, 음악함, 목탁, 염주, 기도 수첩이 있다. 배경과 터치 지점을 같은 3:2 좌표계에 두고 캐릭터 발 기준선은 셀의 y=354/384에 맞춘다. 전경 기둥을 오가는 자유 보행은 구현하지 않았으며 장면 버튼으로 이동한다. 작은 화면에서는 장면을 좌우로 볼 수 있고 같은 기능을 화면 아래 활동 버튼으로도 이용한다.

- 기도: 글을 적고 합장·참배하며 명시적으로 개인 기록에 저장한다.
- 명상: 앉은 자세와 호흡 안내, 기존 명상 음악을 이용한다.
- 108배: 9/27/108 목표, 일시정지·재개·중단, 동작 속도 변경, 조작을 숨기는 집중 보기.
- 긍정 확언: 기존 마음 훈련 문장을 고르거나 수정하고 직접 읽은 뒤 기록한다. 음성 인식·녹음·신체 동작 측정은 하지 않는다.
- 음악: 기존 23곡 탐색·다음 곡·반복·셔플·타이머. 단일 audio와 탭 간 재생 신호로 중첩을 줄인다. 목탁은 짧은 합성 효과음이며 실제 목탁 녹음으로 표시하지 않는다.
- 운세: 기존 일기 운세 어댑터의 오늘 흐름, `/today/` 상세 왕복.
- 기록: 현재 계정과 프로필의 기도·확언·참배 기록 조회·수정·삭제.
- 캐릭터: 수동 선택 우선, 여성 연이·남성 영냥이 기본값, 성별 없으면 선택 안내. 이 기능의 네오와 영냥이는 동일 캐릭터이며 이름표는 없다.

다른 이용자가 접속해도 장면에는 본인의 캐릭터만 있다. 방문자 목록, 채팅, presence, WebSocket, 공동 방 상태는 없다. 기록과 세션은 이 브라우저 IndexedDB에 저장하고 계정 ID+프로필 ID로 분리한다. 서버 기록 API나 동기화 기능을 추가하지 않았다. 같은 브라우저를 직접 조작할 수 있는 사람으로부터 보호하는 암호화 저장소는 아니며, 브라우저 데이터 삭제 시 기록도 사라진다. UI에 로컬 저장 범위를 안내한다.

## 원본 보존과 2D 자산 갱신

기존 1단계 모델/검수 파일과 연이 2D v1·v2 파일은 이번 변경에 포함하지 않았다. `git diff --name-only 6243d5767 -- app/moonlit-lotus/model-review public/assets/moonlit-lotus/yeoni` 결과는 비어 있었다. 연이 공식 시트 SHA-256은 `4b7b01cc92a8ea66dbc6234630df46b7238c9a383eff0fe6064c2b59546b0425`다.

연이 v2의 **80개 독립 그림**(v1 24개의 3.33배), 44개 큰절 그림과 인사·명상·표정 포즈를 재사용했다. `Sprite.tsx`의 75ms 전환과 `bow-session.ts`의 8,840ms 한 주기를 그대로 사용한다. 새 영냥이는 움직임/표정 16개, 큰절 16개, 합계 32개 그림이다. 영냥이의 남색 모자·망토·흰 털을 유지했다. 사용자 지정 시트의 이름표는 제외했다.

프로필 커스터마이징은 기존 `/api/rpg/pet?profileId=...` **GET**으로 저장된 친구를 읽고 기존 `petSpriteMarkup`으로 털색·장식 조합을 보존한다. 얼굴 크기·위치, 아바타 색과 이름을 조절한다. 둥근 SVG 몸체와 프로필 이미지 얼굴을 조합한 방식이며 **개인별 새 전신 스프라이트 생성, 사진 업로드, AI 변환은 구현하지 않았다**. 전용 연이 스프라이트와 같은 그림 수준의 개인별 큰절 애니메이션은 후속 제작 영역이다.

원본 PNG, 가공된 미리보기, 실제 실행 캡처와 JSON 검수 결과:

`D:/CodeDestiny-Build/moonlit-lotus/space-v1/`

재현 명령(저장소 루트):

```powershell
node scripts/sprites/prepare-moonlit-space.mjs D:/CodeDestiny-Build/moonlit-lotus/space-v1
```

입력은 `courtyard-source.png`, `hall-source.png`, `pond-source.png`, `cat-motion-source.png`, `cat-bow-source.png`. 생성 프롬프트는 `docs/design/moonlit-lotus-space-prompts.md`, 셀별 해시·좌표·용량은 `public/assets/moonlit-lotus/space-v1/manifest.json`에 있다. 원본을 유지하고 버전을 올려 갱신한다. 이 파일들은 2D 그림이며 GLB나 새로운 3D 모델 산출물로 보고하지 않는다.

| 자산 | 실제 용량 | 해상도/구성 |
|---|---:|---|
| 마당 | 125,568 / 468,372 B | 768 / 1536px 폭 |
| 법당 | 108,446 / 400,794 B | 768 / 1536px 폭 |
| 연못 | 138,090 / 469,066 B | 768 / 1536px 폭 |
| 영냥이 동작 | 692,706 B | 1536², 384² 셀 16개 |
| 영냥이 큰절 | 576,696 B | 1536², 384² 셀 16개 |
| 영냥이 정지 | 29,362 B | 384² |
| 연이 v2 기존 5개 시트 | 2,781,102 B | 1536² ×5, 그림 80개 |

## 동작·저장 규약

React 활동 상태와 세션 진행을 공유하고 그림만 감소 모션/정지 이미지로 바꾼다. 음악 시간·클릭 수·렌더링 횟수로 참배 횟수를 계산하지 않는다. 활동은 `idle`, `greeting`, `meditation`, `bow`, `prayer`, `affirmation`. 참배 단계는 기존 `poseAt(elapsed)`를 사용한다. 캐릭터 선택은 `yeoni | cat | custom`이다.

- 세션: 기존 `sessionId`, `cycleIndex`, `completed`, `target`, `elapsed`, `status`, `speed`, `pendingSpeed`.
- 1회 완료: 기립·합장으로 돌아온 마지막 단계에서만 집계. 중복 ID/index 거부. 목표에서 다음 주기를 예약하지 않는다.
- 일시정지: 같은 탭에서는 현재 위치 보존. 새로고침은 마지막 완료 횟수와 준비 자세 복원. 숨김·pagehide·다른 활동·뒤로 이동에서 일시정지. 250ms 초과 시간 간격을 한꺼번에 보상하지 않는다.
- IndexedDB `cd-moonlit-private-v1`: sessions/records. `scope=accountId|profileId`, 비회원은 guest. 계정 전환 시 개인 화면을 다시 마운트한다.
- 소유권: `owner`, `revision`, 12초 lease, 2.5초 heartbeat. IndexedDB readwrite 트랜잭션 안에서 최신 소유권/버전을 확인한다.
- 완료 기록: 세션 저장과 같은 트랜잭션에서 `scope|bow|sessionId` 키로 한 번만 삽입한다. 삭제는 내용 없는 표식을 남겨 완료 세션 재열기 시 복원하지 않는다. 기록 수정도 updatedAt 비교 후 저장한다.
- 저장 불가: 현재 탭 전용 모드임을 안내한다. 저장 중 실패는 진행을 멈추고 재시도를 안내한다.

## 실제 검수

Chromium 데스크톱 개발 서버와 모바일 폭 에뮬레이션에서 확인했다. 운영 데이터나 실결제를 사용하지 않았고 계정/프로필은 검수용 fixture였다.

| 사례 | 관찰 결과 |
|---|---|
| 37회 복원·재개 | 37 복원, 현재 동작 위치 보존 |
| 38번째 동작 중 새로고침 | 37, elapsed=0 복원 |
| 107 후 재개 | 실제 화면 108에서 완료, 재열어도 108 |
| 9/27 목표 | 순수 세션 자동 검사에서 정확히 목표 종료 |
| 동일 완료·완료 세션 재열기 | 자동 검사 + 실제 IndexedDB fixture에서 기록 1개 |
| 완료 기록 삭제 후 완료 재전송 | 실제 저장 모듈 검수에서 기록 0개 유지 |
| 동시 소유권 요청·오래된 재전송 | 실제 저장 모듈에서 소유자 1개, stale 저장 null |
| 두 탭 전환 | 진행 일시정지, 다른 탭 재개 후 원래 탭 재개 가능, 숨김 시간 가산 없음 |
| 경량·감소 모션 | 동작 중 전환해도 같은 세션, 0회/elapsed 871ms로 진행 유지 |
| 여성·남성·수동 선택·성별 없음 | 연이/영냥이 기본, 수동 우선, 비회원 선택 안내 확인 |
| 프로필 커스터마이징 | GET만 호출, 실제 기존 친구 마크업 적용, 취향 저장 |
| 계정 전환 | 이전 계정 기도 표시되지 않음 |
| 기록 | 확언 생성→수정→삭제 실제 버튼으로 확인 |
| 날짜 | 브라우저 검수 시계로 KST 자정 이동, 새 기록 2026-11-17 확인 |
| 홈·직접 URL·뒤로 | 홈 카드 한 번 진입, URL/새로고침, 운세 상세 왕복 확인 |
| 음악 | 실제 currentTime 증가, 검색·다음 곡·셔플/반복 선택, 5분 타이머 시계 fixture 만료 |
| 음악 중첩·오류 | 재생 audio 1개, ended/error 사건 fixture, 재시도 후 경고 해제 수정 |
| 그림·소품 | 내부/마당/연못 화풍, 관찰한 큰절 손·무릎 방석 접지, 기둥 앞뒤 고정 확인 |
| 폭 360/390/430 | 문서 가로 넘침 없음, 버튼 최소 높이 44px, 모바일 장면 중심 수정 |
| 글자 200% | 390px에서 문서 scrollWidth=390, 활동 버튼 유지 |
| 키보드 | 패널 제목 초점과 닫은 뒤 호출 버튼 복원, 모든 주요 기능 버튼/입력 의미 제공 |
| 느린 네트워크 | CDP 350ms/100kB/s 조건에서 연못 그림 로딩 후 조작 유지; 캐시 배제한 전체 초기 LCP 측정은 아님 |
| 이미지 실패 | 요청 차단 후 안내·재시도, 기도 textarea 정상 |
| 디코딩 실패 | decode reject 주입 후 정지 대체/재시도 정상 |
| 프로필 API 실패 | 503 fixture 안내와 연이/영냥이 선택 유지 |

시각 검수에서 불상 얼굴을 가리던 버튼, 모바일 리사이즈 시 장면 중심, 데스크톱 전신 잘림을 수정하고 확인했다. primary hover 대비도 수정했다. 모든 프레임을 모든 실기기에서 관찰했다는 의미는 아니다.

**미검증:** 실제 Android Chrome, iOS Safari, 앱 WebView, 물리적 화면 잠금/OS 종료, NVDA/VoiceOver, 모바일 GPU 메모리·발열·장시간 FPS, 운영 API 오류 및 운영 음악의 모든 트랙 완주. 화면 낭독기 이름/역할은 브라우저 의미 구조로 확인했지만 실제 낭독기 사용 검수는 하지 않았다. 기존 상담·결제·결과·보관함 전체를 수동 E2E로 재실행하지 않았다. 관련 77개 결제 가드와 타입·정적 검사를 통과한 범위로만 보고한다.

## 성능·서버·비용

20Hz 세션 상태 업데이트, 프레임 경계의 그림 변경, 숨김 일시정지, 필요한 시트의 decode 확인을 사용한다. 경량/감소 모션은 같은 카운터를 유지한다. 기본 그림은 투명 WebP이며 모바일 배경은 768px이다. 3D 엔진은 이 화면에서 로드하지 않는다.

검수용 Chromium 개발 빌드, 390px 에뮬레이션에서 JSHeapUsedSize **37,833,800 B (36.1MiB)**, Total **49,364,992 B (47.1MiB)**를 관찰했다. DOM Nodes=929. 개발 도구와 다른 페이지 문맥이 포함될 수 있으며 실제 모바일·프로덕션 수치가 아니다. 디코딩된 그림 메모리는 별도다: 1536² RGBA 시트당 9MiB, 연이 큰절 3장은 27MiB, 768×512 배경 1.5MiB/1536×1024 배경 6MiB. 브라우저가 이전 활동의 5개 시트를 캐시하면 연이만 45MiB까지 보유할 수 있다. GPU/전체 프로세스 메모리 상한을 보장하지 않는다.

참배 프레임·기도·확언·기록마다 서버 호출을 만들지 않는다. 동시 1,000명이 참배해도 그 동작을 위한 주기적 서버 요청은 0이다. 입장 HTML, 정적 자산, 사용자 선택 시 프로필 GET, 음악 CDN은 별개다. 서버 동시 수용 인원 상한은 부하 시험/실제 요금제/캐시 적중률을 측정하지 않아 **미확정**이다.

추정 예: 방문당 새 정적 그림 3MiB를 받는다고 가정하면 월 10만 방문은 약 293GiB. 저장소의 `/assets/*`는 정적 라우트이며 Cloudflare Pages의 정적 자산 요청은 무료·무제한 과금 범주다. 기존 HTML/프로필의 Functions 사용량은 별도 요금 대상이다. [Cloudflare Pages 공식 요금 설명](https://developers.cloudflare.com/pages/functions/pricing/). 따라서 이 기능의 클라이언트 참배 처리 자체에는 추가 서버 연산비가 없지만, 전체 운영 청구액을 0원이라고 보장하지 않는다.

음악을 128kbps로 30분 듣는다는 **미측정 가정**에서는 회당 28.8MB, 월 10만 회면 약 2.88TB다. 현재 음악 호스트의 계약·실제 비트레이트·청구서를 확인하지 못해 음악 비용은 산정하지 않았다. 사용자별 생성형 AI 호출을 추가하지 않아 이 기능의 자캐 꾸미기에는 생성 API 비용이 없다.

## 변경 파일과 검증

- `app/moonlit-lotus/page.tsx`, `Space.tsx`, `space.module.css`: 진입·장면·활동·접근성.
- `_components/Character.tsx`, `MusicPlayer.tsx`, `PrivateRecords.tsx`: 캐릭터·기존 음원 재생·개인 기록.
- `_lib/config.ts`, `session-policy.ts`, `private-store.ts`, `use-private-bow.ts`, `use-space-profile.ts`, `use-effects.ts`: 기능 스위치·세션·로컬 저장·현재 프로필·효과음.
- `app/components/HomeMoonlitEntry.tsx`, `.module.css`, `app/page.js`: 홈 단일 진입 카드.
- `app/components/AppChrome.tsx`: 개인 공간의 별도 내비게이션 적용.
- `lib/seo/index-policy.mjs`, `__tests__/ui/index-policy.test.mjs`, `config/sitemap-lastmod.json`: 공간 전체 noindex/사이트맵 제외 및 홈 변경 원장.
- `__tests__/ui/moonlit-private-space.test.mjs`: 세션·소유권·기본 캐릭터·자산 검사.
- `scripts/sprites/prepare-moonlit-space.mjs`, `public/assets/moonlit-lotus/space-v1/*`, 본 문서·프롬프트·인수인계.

검증 명령과 결과:

- `npm run check:fast -- --plan` 후 `npm run check:fast`: critical 경로의 관련 결제 가드 **77/77**, lint 통과. 사이트맵 원장 drift에서 중단되어 전체 통과로 표시하지 않는다.
- `npm run sitemap:generate` → `npm run verify:sitemap-drift`: **1081 URL 일치**, 갱신 원장은 홈 1개.
- `npm run typecheck`: **통과**.
- 관련 `eslint`: **오류 0, 경고 4**(명시적 responsive img, 비동기 토큰 ref 정리). 전체 quiet lint는 통과.
- `node --test __tests__/ui/moonlit-private-space.test.mjs __tests__/ui/index-policy.test.mjs`: **22/22**.
- `node --test __tests__/ui/yeoni-sprite-session.test.mjs`: **7/7**.
- `git diff --check`: 통과.
- 구현 커밋 `8a2407cf1` 이후 `npm run check:pre-push`: 미러·사이트맵·SEO 레지스트리·저장소 위생 **통과**. 최신 main 병합 후 사이트맵도 다시 일치했다.
- Impeccable detect: 종료 코드 0, 출력 없음. 시각 검수를 대신하지 않는다.
- 실제 브라우저 기록: 외부 산출물 폴더의 `*-observations.json`, `failure-tabs-performance.json`, `home-music-midnight.json`.

결제 정책·이용권·월정석·단건 결제·인증 처리·서버 API 응답·운영 DB 스키마를 변경하지 않았다. 기존 계정 상태 읽기와 기존 프로필 GET만 이용한다. 프로필 친구 성장/부화 API는 호출하지 않는다.

## 비활성화·롤백·미리보기

`app/moonlit-lotus/_lib/config.ts`의 `MOONLIT_LOTUS_ENABLED=false`로 홈 카드와 새 공간을 함께 비활성화할 수 있다. 로컬 기록과 원본 검수 페이지는 유지된다. 전체 되돌림은 이번 공간 구현 커밋만 `git revert`하고 원격 절차를 따른다. 다른 작업 커밋이나 기존 v1/v2를 되돌리지 않는다.

로컬 실행은 저장소의 `npm run dev`(기본 mock 인증/API). main 기본 포트의 `http://127.0.0.1:34052/moonlit-lotus/?scene=hall`을 연다. 검수 당시 별도 워크트리 서버는 24106이었으며 정리 시 종료한다. 운영 URL이 이미 배포되었다고 주장하지 않는다. main push 후 CI는 저장소 규칙대로 최종 보고 전 한 번만 확인하며 pending이면 미통과로 보고한다.
