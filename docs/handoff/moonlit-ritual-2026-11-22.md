---
status: done
updated: 2026-11-22
next: "없음 — main 반영·push 완료(2026-11-22). 후속은 결과 기록의 범위 밖 발견 참고"
---

# 달빛 연화당 참배 흐름(명상 게임형) 인수인계

## 첫 행동
1. 승인된 계획 전문을 읽는다: `C:\Users\user\.claude\plans\pasted-content-id-2791-tingly-nebula.md` (Phase 0 진단·설계·에셋 목록·위험·검증). 이 문서와 계획이 다르면 이 문서가 우선이다.
2. 작업 위치는 워크트리 `D:\Development\codedestiny-worktrees\moonlit-ritual-20261122-030358` (브랜치 `wt/moonlit-ritual-20261122-030358`, base `dbd61a8dd`). 공유 체크아웃 `D:\Development\code-destiny` 에는 다른 세션의 미커밋 worker/* 파일이 있다 — 거기서 `reset --hard`·`stash`·`checkout --` 금지, 그 파일 건드리지 않음.
3. 아래 "단계"에서 첫 미완료 항목부터 진행하고, 끝나면 체크박스·결과·커밋 SHA를 이 문서에 적고 커밋한다.

## 승인 상태
- 2026-11-22 사용자가 계획(ExitPlanMode)을 승인. Phase 1~4 구현을 승인 대기 없이 진행해도 된다.
- 결정 4건(원문 요지): ① "탭=한 번 절, 삼배" ② "연출 단계로 추가"(호흡·향은 저장 없음) ③ "회향 뒤·구석 메뉴로 유지"(기존 Space 재사용) ④ "저장소 규칙 따름"(main 직접 머지·브랜치 PR 없음, `_graveyard` 대신 3면 grep 후 별도 커밋 삭제).
- 승인 밖(멈추고 물을 것): 운영 배포, 결제·인증·DB 변경, `music.code-destiny.com` CORS 설정 변경, 과금 LLM 호출, 새 에셋 생성·외부 반입.

## 작업 규칙과 함정
- 프로젝트 CLAUDE.md·`docs/context/design-canon.md` 준수. 새 hex 금지(기존 `app/moonlit-lotus/space.module.css` 사설 변수 재사용), 모듈 안 `--cd-*` 재선언 금지, 제목 주아체·본문 Pretendard, 주 액션 ≥48px, 터치 ≥44px.
- 모든 새 사용자 문자열은 i18n 키. 네임스페이스 `moonlitRitual`, `public/i18n/<lang>/moonlitRitual.json`. 패턴은 `app/components/guided-flow/useGuidedT.ts` + `lib/i18n/useT.ts`. 🔴 `useT` 는 ko 를 비운다 — ko 사전 파일이 있어도 `useTPick`/guided 패턴처럼 ko 를 실제로 읽는지 확인. 저작 ko·en·ja·zh-CN·zh-TW, 나머지 로케일은 영어 복사(목록은 기존 `public/i18n/` 폴더로 확인).
- 화자 말투: 연이 존댓말, 영냥이(cat) 반말·'~냥'은 짧은 한마디에만, 기타 캐릭터 해요체. UI 크롬 해요체.
- 엔진 6종 코드 읽기 전용, 결제 파일 수정 금지(이 기능엔 유료 게이트 없음).
- 저장: 소원은 `_lib/private-store.ts` `writeRecord({kind:'prayer'})`. 삼배는 `sessions` 저장소를 절대 쓰지 않는다(108배 진행 세션 덮어씀). `model-review/bow-session.ts` 의 순수 `advance`/`poseAt` 을 메모리 세션(target 3 수동 구성, `newSession` 은 9/27/108 클램프라 쓰지 말 것)으로 돌리고 완료 시 `writeRecord({id: scope+'|bow|ritual-'+uuid, kind:'bow', completed:3, target:3, text:''})` 1회. `bow-session.ts` 수정 금지.
- 탭=한 번 절: 한 주기 완료(`completed` 증가 = 기립·합장 복귀) 시 정지하고 다음 탭 대기.
- 커밋 금지: `public/**` 중 빌드 부산물(재스탬프·sitemap·미러), `js/core/**` 재생성물, `.env*`, `package-lock.json`. 단 새 i18n 사전 `public/i18n/*/moonlitRitual.json` 은 소스이므로 커밋한다(기존 i18n 사전이 git 추적되는지 `git ls-files public/i18n | head` 로 먼저 확인).
- 검사: `npm run check:fast -- --plan` 후 `npm run check:fast`. 테스트는 `node --test __tests__/ui/<file>.test.mjs`. 워크트리 jest 는 run-mock-tests 러너(메모리 worktree-mechanics). `app/**` 편집이 sitemap 원장을 무효화할 수 있다 — 검사가 요구하면 원장 갱신 규칙을 따른다.
- 커밋: Conventional Commits, 한국어 요지, 말미 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git add` 전 `git status`·`git diff --stat`. 단계마다 커밋.
- 화면 검증은 dev 서버(mock)로 하고 스크린샷은 `.tmp/` 에 두고 visual-checker 에이전트로 판정(메인에서 이미지 Read 금지).
- 기존 이전 Codex 음악 로직: `D:\Development\Temp\moonlit-latest-audio-20261120\moonlit-place-and-ambient.patch` (커밋 `f91990b19`, 분리 클론 `D:\Development\Temp\moonlit-prod-isolated-20261120`). 선호 저장·재생 상태기·NotAllowedError→blocked 만 옮긴다.

## 설계 요약 (상세는 계획 파일)
- `app/moonlit-lotus/page.tsx`: `scene`/`activity`/`view` 파라미터가 있거나 `stay=1` 이면 기존 `<Space/>`, 아니면 `<RitualFlow/>`. 기존 딥링크 보존을 테스트로 고정.
- 새 코드 `app/moonlit-lotus/_ritual/`(흐름·UI), `_audio/`(엔진·MiniPlayer), `_fx/`(canvas 1개 rAF).
- 단계: enter(탭=오디오 해제, play() 동기 호출) → breathe(4-4-6 ×3, 건너뛰기) → incense(1.5s 길게 누르기+버튼 대안) → bow(탭마다 1배 ×3, mokugyo SFX) → wish(입력 1개, 위로 밀기/버튼 → 연등) → dedication(범종 슬롯·축원 말풍선, "연화당 둘러보기"/"홈으로"). 항상 나가기·빠르게 진행. 연꽃 꽃잎 6장 진행 표시.

## 단계
- [x] Phase 1 셸·흐름: `ritual-machine.ts`+테스트, RitualFlow, LotusProgress, SpeechBubble, BreathGuide, HoldToLight, use-ritual-bow(+테스트), WishLantern, 회향, page.tsx 분기(+딥링크 테스트), i18n ko/en. 캐릭터는 기존 `_components/Character.tsx` 정적 사용.
- [x] Phase 2 오디오: `_audio/audio-engine.ts`(BGM 2채널 1.5s 크로스페이드, SFX 풀, ducking), use-ambient-audio(선호 `cd:moonlit-music:v1` + trackId·sfx, try/catch), MiniPlayer(44px 오브 → 시트: 목록+분위기 태그, 이전/다음, 재생/정지, 볼륨, 효과음), visibilitychange, BroadcastChannel `cd:moonlit-audio`, 테스트. `music.code-destiny.com` CORS 는 `curl -sI -H 'Origin: https://code-destiny.com'` 로 확인만(없으면 볼륨 램프 경로).
- [x] Phase 3 캐릭터·연출: companion-machine(idle·greet·guide·breathe·bow·pray·bless·react·rest), CompanionStage(연이 포즈는 `model-review/sprite-clips.ts` POSES/PREVIEW_CLIPS, 기타 캐릭터 transform 1단계), `_fx/scene-fx.ts`(입자 ≤40/저사양 12, 탭 물결, 정지 조건), 연기·연등·디졸브 400~800ms.
- [x] Phase 4 다듬기(머지·push·워크트리 배수·status: done 은 메인 세션 몫으로 남김): 품질 단계, reduced-motion, 키보드·aria-live, 나머지 로케일, 안 쓰게 된 코드 삭제(deletion-auditor, 별도 커밋), `docs/design/moonlit-lotus-ritual.md`, CONTEXT_AUDIT 충돌 2건(`_graveyard`→삭제, 브랜치/PR→main 직접), 화면 시나리오 검증, `npm run check:pre-push`, main 머지·push·워크트리 배수(메인 세션이 수행해도 됨), 이 문서 status: done.

## 결과 기록
(단계별로 커밋 SHA·명령·출력 요지·남은 위험을 여기에 추가)

### Phase 1 (2026-11-22, 브랜치 wt/moonlit-ritual-20261122-030358, 미머지·미push)
- 커밋: 81343fed6 i18n(`i18n/authored/moonlitRitual-01.json` → `node scripts/i18n-merge-authored.mjs --namespace moonlitRitual`), 534254a6c 순수 모듈(ritual-machine·ritual-bow·mode), c0390a9c2 UI(`app/moonlit-lotus/_ritual/*`), 6bf9120e6 page.tsx 분기+MoonlitEntry+테스트.
- 설계 결정: 정적 export 라 모드는 마운트 뒤 `MoonlitEntry` 가 `location.search` 로 고른다(scene·activity·view 또는 stay=1 → 기존 Space, 그 외 → 참배). 둘러보기는 `history.pushState(?stay=1)`, 뒤로 가기는 popstate 로 참배 복귀(처음 단계부터). 참배 절은 bow-session 의 advance 를 쓰되 target 3 세션을 직접 만들고(newSession 은 9/27/108 로 고정), `sessions` 스토어는 쓰지 않고 완료 시 `records` 에 bow 1행, 소원은 prayer 1행. 빠르게 진행 = 시간 0.5배. ko 사전은 정적 import(useT 가 ko 를 비움).
- 검증: `node --test __tests__/ui/moonlit-*.test.mjs __tests__/ui/home-moonlit-entry-card.test.mjs` → 50/50 pass(신규 6). `npm run check:fast` → critical 승격, paid-gate-suite 78/0, lint·typecheck·sitemap-drift 통과, test:node 5736 pass / 1 fail = `__tests__/fortune/sky-and-range.test.mjs` 의 일일 패키지 ENOENT(워크트리에 `fortune/data` 미생성, 환경) → `npm run fortune:build-data` 뒤 재실행 7/7 pass. 체크 뒤 바꾼 것은 ritual.module.css 의 가로 배치·꽃잎 transform 뿐(재실행 생략, CSS 전용).
- 화면: Playwright 워크스루 360×740·390×844(빠르게)·1440×900(en)·844×390(빠르게)·딥링크 `?scene=hall&activity=bow`. 전 뷰포트 가로 넘침 0, 콘솔 오류 0, records = bow 3/3 1행 + prayer 1행, sessions 0, 둘러보기 URL `?stay=1`(lang 유지), 뒤로 가기 → 참배, 딥링크 → 기존 공간. visual-checker 1차 차단 2(가로 화면 행동 밀림·동의 배너) + 경미(연꽃 윗잎 잘림 = `transform-box:fill-box`, 360 상단 바 12px 넘침 = grid 열 min-content) → 가로 2열 배치·transform-box 제거·`grid-template-columns:minmax(0,1fr)` 로 고친 뒤 재판정 통과(가로 소원 건너뛰기 하단 387/390px 로 여유 3px).
- 함정: 첫 방문 쿠키 동의 배너(`app/components/AnalyticsConsent.tsx`, 전역)가 하단 행동 영역 위에 뜬다 — 세로 360 은 2px 차로 안 가리지만 가로 844×390 에서는 '참배 시작하기' 대부분을 가린다. 전역 컴포넌트라 이번 범위 밖, 후속 과제. Playwright 로 걸을 때는 `cd_cookie_consent=essential` 쿠키를 미리 넣는다. CSS 모듈이라 `primary` 는 `space.primary` 로 붙여야 하고, `.page button` 을 이기려면 `.flow .x` 로 쓴다.
- 남은 위험: ja·zh 등 10개 로케일은 영어 복사(Phase 4). 오디오·캐릭터 상태기계 없음(Phase 2·3, 캐릭터는 정적 Character, 일부 포즈 뒤 밝은 사각 박스 보임). 모드 결정 전 빈 화면 1프레임. 둘러보기 후 복귀 시 처음부터. 절 단계 건너뛰기는 기록 없음. reduced-motion 일부만. 가로 화면 절하는 포즈 하단 잘림(경미). 실기기 미검증.

### Phase 2 (2026-11-22, 같은 브랜치, 미머지·미push)
- 커밋: 05abbbe24 i18n(`i18n/authored/moonlitRitual-02.json`, audio 26키, ko·en 저작·나머지 영어 복사), 1db881b57 엔진·선호·곡 목록(`_audio/audio-engine.ts`·`music-preference.ts`·`tracks.ts`), 160f2f5a1 MiniPlayer·use-ambient-audio·RitualFlow 연결·테스트(`__tests__/ui/moonlit-ritual-audio.test.mjs`), 5be5935d0 시각 판정 수정(효과음 켜짐 대비, 낮은 화면 시트 스크롤).
- CORS 실측: `curl -sI -H "Origin: https://code-destiny.com" https://music.code-destiny.com/Meditation/Crystal%20Garden.mp3` → `Access-Control-Allow-Origin: https://code-destiny.com`, `Vary: Origin`. GainNode 는 이 출처에서만, AudioContext 가 running 일 때만 연결(그 외 localhost·스테이징은 볼륨 램프). 서버 설정은 건드리지 않음.
- 설계 결정: 훅 반환에서 `sfx` 는 재생 함수, 켜짐 여부는 `sfxOn`(스냅샷 `sfx` 가 함수에 덮여 토글이 늘 켜짐으로 보이던 버그를 typecheck 가 잡음, 테스트로 고정·변이 확인). 자동재생은 마운트 뒤 1회 시도 → 막히면 blocked + "소리 켜기" 알약, 입장 탭이 동기 play. 정지 탭은 auto:false 로 저장. 범종(회향)·풍경(입장)·불(점화)은 무음 슬롯.
- 검증: moonlit 테스트 63/63 pass(신규 13). `npm run check:fast` 1차 typecheck 실패(위 sfx 버그) → 수정 뒤 재실행 EXIT 0(paid-gate 78/0, jest 8487 pass·1 skip). Playwright(.tmp, mock dev) 18/18: blocked→알약→입장 탭 재생, 허용 시 도착 재생, 곡 변경 2탭(크로스페이드 뒤 단독 재생), Esc 닫힘, 백그라운드 정지·복귀 재개, 재방문 곡·볼륨 0.6 복원, 절 3회 = 목탁 3회, ?stay=1 전환 시 재생 0, 콘솔 오류 0, 360·844×390·1440 가로 넘침 0.
- 화면 판정: visual-checker 1차 블로커 2 — 효과음 '켜짐' 대비 1.22:1, 844×390 시트가 높이 넘침 → span color:inherit, `@media (max-height:520px)` 시트 전체 스크롤로 수정. DOM 실측 844×390 시트 y12–378/390, 목록 7행 보임. 재판정: 켜짐 7.13:1 통과, 남은 블로커 1(낮은 화면에서 scrollIntoView 가 시트 전체를 내려 머리말·재생 버튼이 가려짐) → 목록 자체 scrollTop 만 조정하고 시트는 scrollTop 0 으로 열기. 실측 844×390 시트 scrollTop 0·닫기 보임, 390 목록 scrollTop 798·지금 곡 목록 안에 보임. 이 마지막 수정은 DOM 실측으로 확인(스크린샷 재판정 없음).
- 함정: Playwright 의 evaluate·locator 호출이 페이지에 사용자 활성화를 준다(`navigator.userActivation.hasBeenActive` true). 차단 시나리오는 goto 뒤 손대지 않고 기다린 다음 읽어야 한다. Next 개발 route announcer 가 빈 role=alert 를 둔다. 이 워크트리 해시 포트(27592)에 03:17 부터 떠 있던 dev 서버를 재사용(내가 띄운 것 아님, 끄지 않음).
- 남은 위험: 실기기(iOS Safari 무음 스위치·고정 볼륨) 미검증. 다른 탭 MusicPlayer 와의 BroadcastChannel 상호 정지는 정적 검사만. 목탁 외 효과음 자산 없음. 절 단계 돼지 뒤 밝은 사각은 플레이어와 무관(숨김 전후 픽셀 차 0), Phase 1 기록과 같은 항목.

### Phase 3 (2026-11-22, 같은 브랜치, 미머지·미push)
- 커밋: e89ca29e4(길동무 상태 문구 i18n), 819ee1800(순수 모듈 companion-machine·companion-pose·_fx/scene-fx), d6327a356(CompanionStage·SceneFx 연결, 디졸브, 사각·잘림 수정).
- 구조: `_ritual/companion-machine.ts`(시간은 호출부 now, 30s 무입력 rest, 불 붙임·3배·연등 react, 연등 lookUp) → `_ritual/companion-pose.ts`(연이 포즈·깜빡임·숨 프레임, 1단계 activity) → `_ritual/CompanionStage.tsx`. 연출은 `_fx/SceneFx.tsx`(next/dynamic, ssr:false) + `_fx/scene-fx.ts`(rAF 1개, 반딧불 40/저사양 12, 숨김·화면 밖·reduced 정지, `canvas[data-running]`).
- 검증: `node --test __tests__/ui/moonlit-*.test.mjs __tests__/ui/home-moonlit-entry-card.test.mjs` 70/70. `npm run check:fast` exit 0(critical 승격, jest 490 suites/8487 pass). Playwright 360/390/844x390/1440 걸음: 단계별 상태 전부 도달, 콘솔 오류 0, 가로 넘침 0, 숨김 탭 1s 동안 rAF 0·running=false, 복귀 시 true. visual-checker 1차 BLOCKER(합장 단계 사각) → 수정 후 재판정 PASS.
- 함정: (1) 캐릭터 뒤 밝은 사각의 원인은 두 가지. 배경 그림의 밝은 제단(→ .pool 그라데이션)과 `yeoni/2d-v2/bow-down.webp` 시트 자체의 옅은 사각 매트(알파≤60, 셀 384 중 x67~311·y3~353, 셀 가장자리 검사로는 안 잡힘). 정지 합장은 rest 3 프레임으로 바꿨고, 절 동작은 여전히 bow-down 을 쓰지만 어두운 배경이라 안 보임. 에셋 재가공은 승인 범위 밖. (2) 퍼센트 margin 은 무대 너비 기준이라 가로 화면에서 절 포즈가 잘렸다 → `--figure-size` 기준. (3) ritual-flow 테스트의 한글 마크업 정규식 `>[^<{]*[가-힣]` 은 화살표 `=>` 뒤 한글 주석도 잡는다 → 주석을 중괄호 안으로. (4) Bash 에서 백틱이 든 문서를 인라인으로 쓰면 명령 치환이 실행된다 → 스크립트 파일로.
- 남은 위험: 360/390 세로에서 캐릭터 하단이 무대 아래로 7px 겹침(스프라이트 여백 안, 의도). 844x390 합장 하단 여유 약 10px. 1단계 Character 의 aria 라벨은 기존 코드의 한국어 고정. 올려다보기는 transform 근사. 향 연기·등불은 정지 화면에서 약하게만 보임(애니메이션 육안 미확인). 기존 Character.tsx 의 prayer(bow-down 2)도 같은 매트가 있음(범위 밖, 보고만). reduced-motion 전면·품질 단계는 Phase 4. 실기기 미검증.

### Phase 4 (2026-11-22, 같은 브랜치, 미머지·미push)
- 커밋: d7f3adff3(품질 단계) · a3dd6f718(reduced-motion·키보드·aria-live) · ec484afac(ja·zh-CN·zh-TW 저작) · cf7dd6953(reduce 에서 space.page 전역 정지·단계별 카메라 규칙을 이기도록 !important 복원) · 7e40121d7(첫 화면 패널 초점·테두리 제거, 개발 모드 effect 이중 실행 대응) · 96bc5a6b4(설계 메모 docs/design/moonlit-lotus-ritual.md, CONTEXT_AUDIT 2건).
- 삭제 감사(deletion-auditor): **삭제 대상 없음**. Space.tsx 는 _ritual/MoonlitEntry.tsx:3 이 쓰고 테스트 4곳(moonlit-bow-facing-control:45, meditation-guide:29, private-space:39, ritual-flow:65)이 단언. 새 export 약 80개 모두 소비처, 외부 참조 0인 19개는 파일 안에서 사용(GAIN_ORIGINS·SPACE_PARAMS·sceneState 등). i18n 99키·CSS 클래스 76개 전부 사용. 삭제 커밋 없음.
- 시나리오(Playwright, mock dev 27592, .tmp/ritual-p4.mjs): 첫 방문 키보드 한 바퀴 통과(단계 전환 초점→패널, Enter 짧게 누르면 향 안 켜짐·길게 누르면 켜짐, 삼배 동안 절 버튼 초점 유지, aria-live 2개, records 삼배 3/3+기도 1, sessions 0, 가로 넘침 0, 콘솔 오류 0) · 재방문 선호 유지 · 자동재생 차단 시 blocked+"소리 켜기" · 숨김 탭에서 캔버스 정지→복귀 재개 · reduce(배경 transform none, 패널 ritual-fade, 숨쉬기 빛 4s 전환, 길동무 숨쉬기 호흡 동기, 캔버스 정지, 말풍선 즉시 전체) · CPU 4배(개발 서버): 1회 60fps·high, 1회 enter 40fps→low(오른쪽 등 제거) — 판정 경로 양쪽 확인, 롱태스크 최대 0.9~2.4s 는 개발 모드 컴파일 · 108배 진행 세션(41/108, revision 7) 참배 뒤 바이트 동일 · 기존 기록 기도 수첩 표시 · ?activity=bow 가 Space 로 41/108 복원 · 360×740·844×390·1440×900 넘침 0.
- 터치 대상: measure:touch-targets 첫 화면 미달 0, 전 단계+음악 시트 390×844·844×390 미달 0.
- 화면 판정(visual-checker 16장+재캡처): 레이아웃 깨짐 없음. 발견 2건 고침(첫 화면 패널 초점 테두리가 가로·데스크톱에서 화면 밖으로 잘림 → 7e40121d7). 남은 것: 연등은 CSS 자리표시(그림 에셋 없음, 위시리스트), 삼배 중 길동무 뒤 사각 매트(기존 Character 그림, 범위 밖).
- 검사: node --test moonlit-* 70/70. check:fast(전체 승격) 5759개 중 3개 실패 = yeongnyangi-reading-invariance(이 브랜치 변경 48파일 전부 moonlit·docs, 단독 재실행 통과 194s → 동시 부하 헛실패). check:pre-push exit 0. build:cf 미실행(미검증).
- 남은 위험: 품질 판정은 첫 2초 한 번뿐. 효과음 3종 무음 슬롯. 쿠키 동의 배너가 가로 첫 화면 버튼을 덮을 수 있음(기존). 실기기·스크린리더 실청취 미검증.
