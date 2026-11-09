---
status: in-progress
updated: 2026-11-09
next: 실행 중인 check:fast(session 71351) 결과 확인 후 pre-push·main push·CI 1회 확인, 자체 워크트리 배수. 운영은 화면 승인 대기.
---

# 프로필 다마고치 달빛 예화·꿀단지 이식

## 첫 행동

현재 워크트리와 로그를 확인하고 위 next부터 계속한다. 코드와 최종 시각 검수는 완료했다. `js/core/profile-pet-card.mjs`와 `profile-character-card.mjs`의 지갑 소유권 구조는 아래 설계가 정본이다.

## 지금 상태

- 원본 `D:/Development/code-destiny`는 다른 세션의 dirty `feat/world-cast-page`다. reset/stash/checkout 하지 않는다.
- 내 워크트리 `D:/Development/codedestiny-worktrees/profile-pet-honey-garden-20261109-090056`, 브랜치 `wt/profile-pet-honey-garden-20261109-090056`.
- 시작·마지막 전달 커밋 `fbc3a41df78d54b6570859aca792e98aa39a080f`. 해당 main CI 42535705705 성공을 확인했다. 이번 소스 커밋 `16d2d25b0`은 targeted 검증 후 생성했으며 아직 push하지 않았다.
- node_modules 정션은 원본과 공유한다. 마지막에 정션을 먼저 해제하고 내 워크트리만 배수한다. 원본에 remove-worktree.mjs가 없으면 내 워크트리의 스크립트를 절대 경로로 불러 원본 cwd에서 실행할 수 있다. main에 포함된 커밋·clean 여부를 검사하는 공식 도구이며 승인 없는 --force는 사용하지 않는다.
- mock 서버 PID 대신 exec session 43996, localhost 13412. `.tmp/pet-honey-preview-server.mjs`에서 실제 public 미러를 읽고 fake API만 제공한다. 이 세션은 sync:public 후 서버를 띄운 채 유지 중이다.
- Ego TaskSpace 69, p1, 이름 `달빛 정원 꿀단지와 출석 UX 20261109`. 아직 finish하지 않았다. 모든 후속 스크립트는 이 공간을 재개한다. 원격 API/LLM/결제/운영 DB를 쓰지 않는다.

## 승인 상태

사용자: “좀 더 달빛 예화 스타일을 넣고 버튼도 오행도 귀엽게 개선해주고 친밀도에 따른 꿀방울 출석 체크 관련 UI/UX를 여기 이식하고 여기에서 꿀방울 관리를 하도록해줘”. UI 구현은 승인됐다. 기존 요청에 따라 운영 승격은 최종 화면 승인 이후이며 아직 승인되지 않았다.

사용자가 async 질문에 “기존 보상 수량 유지, 친밀도별 반응과 진행 상태 개선 (추천)”을 선택했다. 기존 출석 1개·5일 +4개·돌봄 계정/일 +1개를 유지한다. 친밀도는 30·70·100 꽃과 기존 반응 구간에 반영하며, 출석 완료 때 다시 도장을 찍으라고 하지 않도록 인사말을 바꾼다. 배율·새 보상은 만들지 않는다.

## 작업 규칙과 함정

- 최초 컨텍스트를 오래된 원본에서 읽어 targetExists:false가 나와 새 워크트리에서 context를 다시 읽었다. 실제 스타일·코드가 정본이다. Impeccable의 PRODUCT/sidecar 구버전 경고는 요청 범위 밖으로 수정하지 않았다. 최종에 init/document로 정리할 수 있음을 간단히 알린다.
- Impeccable 적용, code-destiny/polish/craft-floor 읽음. 새 세계관 없이 기존 꽃 선화·달·크림/로즈와 네오 플럼을 확장했다. 새 동물 래스터 원화는 만들지 않았다. 기존 시트를 그대로 사용한다.
- source/honey UI는 옛 IIFE var 관례를 유지한다. ESLint 0 errors, 기존 var 등 warning 105개를 확인했다. 관련 없는 변환을 하지 않는다.
- 옛 native 출석 달력은 5일판+월력 전체를 보여준다. 월력만 details로 묶고 기존 번역 키·UTC 날짜 계산·보너스 로직은 유지했다.
- 초기 통합 테스트의 afterEach가 DOM 종료 뒤 비동기 observer를 남긴 결함은 observer disconnect, 종료 전 tick, cleanup 초기화로 고쳤다. 실제 4개 행위 검사는 원래 통과했으나 컨테이너가 실패했었다. JSDOM의 CustomEvent/AbortController는 해당 window 것으로 맞췄다.
- 캡처는 loading 상태를 지나 `.pg-pet--yeongnyangi`와 native attendance ready까지 기다린 뒤 한다. Ego의 UI 액션/탐색은 viewport를 원복할 수 있다. 액션 후에 CDP metrics를 다시 설정하고 clip을 계산한다. tall 카드 캡처 시 height 2200~2600, DPR1, raw:true를 쓴다.

## 설계

- `profile-honey-manager.mjs`: 기존 `[data-cd-honey-widget]` 실제 노드를 comment 앵커에서 빌려 오고 abort 때 복귀한다. 별도 지갑·출석 구현을 만들지 않는다.
- 부모 `mountCharacterCard`가 preview 조회 **이전**부터 안정된 honeyHost를 만들고 지갑 이식/복귀를 소유한다. preview 로딩·오류여도 지갑이 사용 가능하다. 성공하면 같은 호스트를 게임 뒤로 옮겨 `mountPetGarden`에 넘긴다. 부모 spirit details 쿼리는 `.pc-details`로 한정해 지갑 details와 충돌하지 않는다.
- 이전 root 자체를 교체했을 때도 activeMount의 예전 토큰을 abort하여 숨겨진 원래 지갑을 복구한다.
- direct `mountPetGarden` 테스트/독립 사용은 부모 호스트가 없으면 자체 호스트를 만들고 같은 helper로 노드를 이식한다.
- `prompt-hub-honey.js`는 기존 출석 handler·API·사용처/해금확인·가격을 그대로 유지한다. render가 `cd:honey-state`를 발행하며 read-only `getState`가 잔액·출석/guest/error 상태만 제공한다. 게임 헤더는 이 값을 쓰고 이벤트 때 숫자만 갱신해 키보드 초점을 유지한다.
- 프로필의 독자 attendance GET/POST·data-pet-attend는 제거했다. native 출석 버튼만 있다. 친밀도/먹기/놀이 API·서버 원장·보상 함수는 변경하지 않는다.
- 기본 카드 크림/로즈, 네오 deep plum. 동그란 4색 행동 버튼·SVG 상징, 꽃 오행 배지, 달과 기존 lotus branch 이미지, 친밀도 꽃 3단계. 기존 서체 토큰, 본문 Pretendard·이름 Jua400 유지.

## 검증과 남은 단계

- [x] 기존 pet/honey 관련 30개 통과.
- [x] 지갑 동일 노드 보존·이식복귀·5일 보너스 POST1회·잔액 상호 동기화·지출 refresh·retry·root 교체 통과.
- [x] 독립 finish reviewer `/root/honey_garden_review`: 최초 P1은 캐릭터 조회 실패 시 지갑도 숨는 문제. 부모가 지갑을 먼저 소유하도록 고치고 failure→출석→retry 새 테스트 추가. 6개 모두 통과. 후속 독립 검수 SHIP.
- [x] 첫 UI 360/390/430/1280 가로 넘침 없음, wallet1/attendance1, 행동 버튼 mobile56/desktop82px. 4색 버튼·본문·보상 AA 통과.
- [x] 알려진 결함 수정: 하단 운세 버튼 light contrast2.8 → 전용 쌍토큰 사용; 친밀도 label의 전역 min-height48 제거; 캐릭터 조회 중 disabled eggs 대신 loading; 헤더 출석·꿀단지 명시.
- [x] source sync:public 및 합친 36개 targeted 통과. `.tmp/pet-honey-final-targeted.log`. 출석 완료 인사말과 조회 실패→출석→retry를 포함한 최신 추가 6개도 통과.
- [x] Ego 실제 출석5개+돌봄1개로23→29, 친밀도75→85, 사용처18종·해금 상태, 월력, 헤더 Enter→지갑 이동, 사용처 닫기→초점 복귀 확인. 8개 레이아웃(360/390/430/1280 × light/neo) 모두 overflow없음, wallet1/attendance1, 주요 대비 최소4.96. reduce 시 animationName:none. `.tmp/honey-final-visual-report.json`.
- [x] detector 정확히1회: `.tmp/pet-honey-detector.json`, 11개 모두 font scale advisory, blocker0. 다시 실행하지 않는다.
- [x] docs/design/profile-pet-garden.md에 새 UX 설계·보상 보존 추가.
- [ ] check:fast 계획 critical 확인 후 실행 중(session 71351, `.tmp/pet-honey-check-fast.log`). paid/auth 77개 통과, lint·sitemap까지 통과 후 typecheck 진행. 실결제·실 LLM 폴백 없음.
- [ ] 검증 후 내 파일만 커밋, pre-push, 최신 origin/main 확인·통합, HEAD:main FF push. dirty local main/원본 브랜치는 건드리지 않는다. CI 한 번 확인, 기다리거나 staging 폴링하지 않는다.
- [ ] Ego finish({keep:[]}), mock 서버 종료, 기록 status:done, 내 워크트리·임시파일 배수. 승인용 이미지/HTML은 사용자 visualizations 폴더에 보존한다.

증거 폴더: `C:/Users/user/.codex/visualizations/2026/11/08/01a1bcc9-2c34-71b2-bc5b-69bf1f4bcda8`. 첫 v2 캡처는 `profile-pet-honey-v2-mobile-ready.png`, `profile-pet-honey-v2-desktop-initial.png`, `profile-pet-honey-v2-neo-initial.png`이며 수정 전 대비 자료다. 새 최종 캡처는 별도 final 파일명으로 저장한다. 예전 profile-pet-motion-preview.html은 v1 UI 스틸을 담고 있으므로 최종 v2 자료로 그대로 안내하지 않는다.

Ego의 native action은 물리 viewport(1908×909)로 돌아갈 수 있다. metrics를 조작한 캡처 뒤의 click에서 기존 하단 nav가 가로채는 일이 있었으며, 테스트에서 metrics override를 해제해 입력하고 필요한 만큼 실제 wheel로 이동했다. 캡처 전 scrollTo는 CSS smooth 영향을 피하도록 `{behavior:'instant'}`와 scrollY===0 대기를 사용한다. `honey-qa-utils.mjs`의 captureCard가 최신 정본이다. 월별 기록·출석 제어에는 scroll-margin도 두었다. 추가 스타일 탐색은 종료했고 최종 단계는 출석 완료 인사말을 담은 캡처 갱신과 필수 검증·전달이다.
