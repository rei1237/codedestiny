---
status: in-progress
updated: 2026-11-22
next: Phase 1 셸·흐름 구현(ritual-machine → RitualFlow → page.tsx 분기)
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
- [ ] Phase 1 셸·흐름: `ritual-machine.ts`+테스트, RitualFlow, LotusProgress, SpeechBubble, BreathGuide, HoldToLight, use-ritual-bow(+테스트), WishLantern, 회향, page.tsx 분기(+딥링크 테스트), i18n ko/en. 캐릭터는 기존 `_components/Character.tsx` 정적 사용.
- [ ] Phase 2 오디오: `_audio/audio-engine.ts`(BGM 2채널 1.5s 크로스페이드, SFX 풀, ducking), use-ambient-audio(선호 `cd:moonlit-music:v1` + trackId·sfx, try/catch), MiniPlayer(44px 오브 → 시트: 목록+분위기 태그, 이전/다음, 재생/정지, 볼륨, 효과음), visibilitychange, BroadcastChannel `cd:moonlit-audio`, 테스트. `music.code-destiny.com` CORS 는 `curl -sI -H 'Origin: https://code-destiny.com'` 로 확인만(없으면 볼륨 램프 경로).
- [ ] Phase 3 캐릭터·연출: companion-machine(idle·greet·guide·breathe·bow·pray·bless·react·rest), CompanionStage(연이 포즈는 `model-review/sprite-clips.ts` POSES/PREVIEW_CLIPS, 기타 캐릭터 transform 1단계), `_fx/scene-fx.ts`(입자 ≤40/저사양 12, 탭 물결, 정지 조건), 연기·연등·디졸브 400~800ms.
- [ ] Phase 4 다듬기: 품질 단계, reduced-motion, 키보드·aria-live, 나머지 로케일, 안 쓰게 된 코드 삭제(deletion-auditor, 별도 커밋), `docs/design/moonlit-lotus-ritual.md`, CONTEXT_AUDIT 충돌 2건(`_graveyard`→삭제, 브랜치/PR→main 직접), 화면 시나리오 검증, `npm run check:pre-push`, main 머지·push·워크트리 배수(메인 세션이 수행해도 됨), 이 문서 status: done.

## 결과 기록
(단계별로 커밋 SHA·명령·출력 요지·남은 위험을 여기에 추가)
