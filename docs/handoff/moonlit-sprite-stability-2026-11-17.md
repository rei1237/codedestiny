---
status: in-progress
updated: 2026-11-17
next: 시각 검수에서 발견한 atlas 간 자세 체적 역행을 presentation 타임라인 재선정으로 수정한 뒤 CI와 운영까지 전달.
---

## 첫 행동

이 문서와 외부 `D:/CodeDestiny-Build/moonlit-lotus/flicker-v2/work-state.md`를 읽는다. AGENTS/CLAUDE 절차 유지. 이전 작업의 완료 주장을 전제로 삼지 않는다.

## 지금 상태

- 작업 워크트리 `D:/Development/codedestiny-worktrees/moonlit-sprite-stability-20261117-032528`, 브랜치 `wt/moonlit-sprite-stability-20261117-032528`.
- 시작 main/운영 SHA `376b32d6636fbfc701bd60d308ceee88eb797c2f`. main은 최신 pull 확인. 다른 active 음성 작업 chat 때문에 worktree 예외 사용.
- 마지막 구현 커밋 `1008fe3d92c714c237961c776011d989c7e6e074`, 아직 push 안 함. 원본 자산·counter·payment/auth/API/DB 변경 없음.
- main의 타 작업 미추적 `.claude/skills/fire-your-seo-agency/` 보존. 타 워크트리·서버 PID20780 등 건드리지 않는다.
- 본 세션 dev 서버 exec48231(http127.0.0.1:19416 mock only), 별도 실제 컴포넌트 QA 번들 서버 exec74621(http127.0.0.1:19418, 외부 폴더). 종료 시 자기 두 서버만 정리.
- ego-browser space46 p1 실제앱(현재 mock), p2 QA. 끝에 별도 script로 finish keep[] 필요. 사용자 space41 접근 금지.

## 승인 상태

2026-11-17 사용자: “계획이나 설명으로 끝내지 말고 구현·검수·CI 확인과 운영 반영까지 진행하라”, “기존 승인 범위에서 이 기능의 수정·검수·운영 반영을 진행한다.” 이번 1회 운영 승격까지 승인. 실LLM/실결제/운영DB 쓰기 승인 아님.

## 작업 규칙과 함정

- 작업 단위 commit, 마지막 main에 ff merge → pre-push → push → main CI확인 → 정해진 Cloudflare workflow(mode production). target_sha override/headSha 착각 금지. 실제checkout+공개 Pages/Worker SHA 대조.
- 일반 push CI sleep polling 금지. 이 요청은 운영 전달을 명시 요구하므로 필요한 실행 추적은 수행하되 반복 무의미 조회 금지.
- `.tmp` 자기 파일만 삭제. 외부 QA 폴더의 JSON/PNG/report는 검수 증거로 보존, harness JS/번들 등 자기 scratch는 끝에 제거.
- ego script에서 sharp 네이티브 모듈을 import하면 `NodeRuntime disconnected`로 끝남. 브라우저 작업/PNG JSON 보존만 ego에서 하고 sharp 합성은 일반 Node CLI에서 실행. 여러 차례 실패 원인 분리됨. browser-harness-light도 끝의 sharp 때문에 종료됐으나 `stepped-bows.json` 1120개는 이미 정상 저장됨.
- CDP metrics는 goto 이후 적용. innerWidth만 기다리면 ResizeObserver 전의 stale 캐릭터 위치를 읽을 수 있음. viewport CSS --ml-world-width가 client sizes와 일치한 후 측정. native screenshot actual-390은 유효, local-390은1893px라 모바일 증거로 쓰지 않음.
- 검수 브라우저 rAF 간헐1초 지연(active/visible에도). 앱 FPS로 쓰지 않는다. deterministic elapsed/rAF step QA는 실기기 영상과 구분.

## 설계와 확인된 원인

- 운영 before-dom.json: 행동 CSS220ms+전면 CSS75ms 중복, key 재마운트, ready reset으로 still 재등장. 약55%/45% 두 그림과 배경 혼합으로 알파 약75%, previous제거시new86%. before-strip172ms 이중몸/색옅어짐 visual agent 확인.
- 커밋1008fe3: 한 persistent AtlasSprite/canvas. decoded 다음 그림을 clear+draw 한 task에서 교체. CSS/key/70ms lighter혼합 제거. 캐시12장, stale decode 취소, 실패시 이전그림유지+실클릭retry, StrictMode/컨텍스트retry, fallback과canvas같은task에서교체. frozen품질변경에서기존pose유지, idleclockresume. Space/preview/modelreview/front/rear/walk 공통경로. walkingmidpoint x78→78,y연속, opacity1.
- 그러나 시각 QA에서 추가 결함: source atlas 교대 타임라인이 높이만 정렬되어 volume/posture가 역행. 서한비 rear down8→lower5→down6, down11→lower6→down13, down7→lower8→lower7→down14. cat lower0→down1/lower5→down14. yeoni front down11→lower0 체적증가. 이 결함 아직 수정 전. 전체 완료 선언 금지.
- 다음 접근: raw그림 보존, 불필요한48장전부사용계약폐기(사용자요구아님), down 한source 하강→충분히낮은lower만1회연결→같은하강pose역순회복 검토. counter BOW_CLIP/CYCLE_MS 타이밍은 변경하지 말고 별도 presentation selector로 처리. visual_check agent가 all-poses PNG에서 경로선정 검토 중.

## 검증과 증거

- 외부 폴더 `D:/CodeDestiny-Build/moonlit-lotus/flicker-v2/`: before/after, asset-cells1296개(빈0,alpha>16 edge0), characters-ui(15종×5행동75경로canvasremount0), native-pixel-detail(15종 alpha 차0/불투명색차0,반투명RGB premultiply차<1), stepped-bows1120 nativeCharacter commits(15종front/rear,blank0/remount0).
- retransition.json+strip: 실제컴포넌트 33개timed샘플32~754ms(20ms timer), cold decode 지연/재전환,blank0/faded0/mount0. visual agent 잔상/중간still없음확인.
- walk-stepped152제어rAF표본: max dx .64%, middle x78 y84, start46/82,end50/86,opacity1,mount0. walk-boundaries.png.
- boundary/pairs/all-poses PNG: visual agent가 원본 체적 역행 발견. 현재 연락 대상 `/root/visual_check`.
- npm check:fast 최초 lint test 변수명module규칙 실패 수정. 다음 실행 Node5142 중5141pass/오늘운세파일누락1실패. 외부API0인 npm fortune:build-data로 ignored data 준비. 최종 check:fast 진행 중 exec10075, 로그 check-fast-final.log (Node5142pass,현재 Jest). npm verify:release exec60347 exit0, 로그verify-release.log. 추가 targeted18pass. impeccable detect [] 완료.
- SEO: 개인공간 noindex/기능스위치 유지, publicmeta/URL/canonical 변경없음. 관련 기존회귀pass.

## 단계

- [x] 운영 실제 페이드/정지그림 재현
- [x] 공통 renderer 구현·targeted 검사·중간커밋
- [x] 전체15종 자산 및 UI/결정적전후면검수
- [ ] 원본 자세 타임라인 불연속 수정 + 다시 경계짝 시각판정
- [ ] 필요한새회귀 + check:fast 계획/실행(전단계full결과 재사용여부판단)
- [ ] 360/390/430/desktop 최종화면·freeze/복귀·음악/사진기능확인
- [ ] 검증한 변경 commit, 문서done, main ffmerge, pre-push/push,CI
- [ ] production workflow 정확한checkout/SHA 대조·운영시각검수
- [ ] 브라우저finish,자기서버정리,워크트리배수,최종한국어보고/rollback
