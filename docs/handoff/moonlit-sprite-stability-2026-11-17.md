---
status: done
updated: 2026-11-17
next: 없음. 사용자 수용 범위에서 구현·검증·운영 반영을 마쳤다.
---

## 첫 행동

추가 제보가 오면 D:/CodeDestiny-Build/moonlit-lotus/flicker-v2/report.md와 현재 운영 SHA부터 대조한다. 이전의 빈 프레임0/FPS만으로 해결을 전제하지 않는다.

## 지금 상태

- 구현1008fe3d92c714c237961c776011d989c7e6e074, 자세 수정de7ed4416197664d50755d31609963fe8e8d0a94.
- main 병합 및 실제 운영 코드 c3f94ec1d659db473a4ca4009735a781afb2faf1. 다른 음성 작업의3f9ceb02a/bc3367542 문서 커밋을 보존했다.
- 작업 워크트리 D:/Development/codedestiny-worktrees/moonlit-sprite-stability-20261117-032528의 문서 종료 커밋을 main에 동기화하고 배수한다. 소스는 이미 운영에 있으며 이후 문서 커밋 때문에 main HEAD와 운영 SHA가 달라질 수 있다.
- main의 타 작업 미추적 .claude/skills/fire-your-seo-agency/ 보존. 다른 워크트리·root 개발서버는 건드리지 않았다.

## 승인 상태

2026-11-17 사용자: “구현·검수·CI 확인과 운영 반영까지 진행하라.” 이번 기능의 운영 반영 승인. 실LLM/실결제/운영DB 쓰기 범위 아님.
운영 공개 SHA 검증 후 ego46의 제어 종료 hard stop이 발생했다. 재개를 질문했고 사용자가 **“현재 검수 범위로 마무리”**라고 명시했다. 따라서 배포 후 운영 브라우저 시각 검수는 미실시로 남기고 제어를 다시 가져오거나 새 공간으로 우회하지 않는다. 기존 브라우저 공간은 사용자 제어 경계를 보존한다.

## 작업 규칙과 함정

- GitHub run.headSha와 실제 checkout/공개 SHA를 반드시 함께 대조. 이번 release는 override없음/pages_onlyfalse로 Pages·Worker를 함께 승격.
- 일반 push CI 반복 대기 금지. 이번 운영 요청은 기존 실행43940997422 하나를 추적했으며 중복 dispatch하지 않았다.
- ego에서 sharp 네이티브 모듈 import는 NodeRuntime disconnected를 일으켰다. 브라우저 JSON/PNG만 ego에서 보존하고 합성은 일반 Node CLI로 분리.
- 브라우저 rAF 간헐1초 지연은 active/visible에서도 관찰됐다. 실기기 FPS로 쓰지 않는다. 단계별 elapsed/rAF 제어 검수와 실시간 영상은 다르다.
- viewport는 goto 뒤 적용하고 ResizeObserver의 --ml-world-width 안정화 뒤 잰다. 초기 local-390.png는1893px이므로 모바일 증거에서 제외.
- 자기 mock/harness서버19416/19418 종료, Listen없음 확인. mock 합성record37/107만 삭제했고 실제운영 카운터·선택저장값은 변경하지 않았다.

## 설계

- 운영 재현: 전면75ms CSS+행동220ms CSS/key remount 중첩. old/new .551248/.448752에서 겹침알파약.753, ready reset으로 still재등장, previous제거시new .856. 이전후면70ms lighter도 이중윤곽을 남김.
- 공통 AtlasSprite/canvas 한 장 유지. decoded 다음그림을 동기 clear+draw, fade/독립rAF 제거. stale decode 무시, fallback 동시제거, 실패/StrictMode/컨텍스트재시도, 모션감소현재pose유지/재개. 선택 이미지 캐시12장.
- down/lower 높이정렬만으로 만든48장교대는 몸체적/손/상체를 역행시켰다. 비슷한자세에서 seam한번만 연결하고 같은그림을 역순회복. raw48장 모두보존하되 매주기전부강제하지 않음.
- 연이front down0..10→lower2..15, rear down0..6→lower1..15 중 상향셀제외. cat down0..5→lower3..15, hanbi down0..6→lower6..15. 나머지12종도 단일 seam과 상향셀제외, 동일그림역순.
- bow-drawing.ts는 기존elapsed만 읽음. BOW_CLIP/CYCLE_MS/use-private-bow/private-store는 수정하지 않음. 초기/최저/기립 기존시간창 유지. 그림·렌더종료사건으로 횟수계산하지 않음.

## 단계와 검증

- [x] 운영 실제 겹침·희미해짐·still재등장 재현
- [x] renderer 구현 및 자세 역행 수정, 작은 커밋
- [x] 15종×5개 UI미리보기75경로 canvas교체0
- [x] raw1,296셀 빈0/alpha>16 edge잘림0, 원본바이트변경없음
- [x] 최종 실제Character 전후면834단계 commit 빈0/mount0
- [x] visual_check:16개seam(연이front+15rear),주요3종반복경계,재전환33timed샘플,걷기152제어스텝 최종통과
- [x] 360/390/430/1440 안정viewport 가로넘침0, 음악제어/사진dialog1536x1024 확인
- [x] 실제mock37/107 pause/resume/reload(마지막완료복원),synthetic hidden listener pause, 경량surface유지
- [x] 엔진/정책 회귀:9/27/108정확종료,37/107,중복완료,소유권/오래된revision,speed경계/시간gap
- [x] 최종 check:fast exit0 Node5143/Jest8012pass(기존skip1); verify:release exit0; pre-push 병합트리exit0; impeccable detect []
- [x] main CI43937690547 CI required 포함 success
- [x] 운영 release43940997422 success, 승격·smoke·양쪽SHA검증통과
- [x] 로컬 verify:deployed-sha --sha=c3f94ec1d659db473a4ca4009735a781afb2faf1 exit0, 공개Pages/Worker둘다동일
- [x] 배포후 운영브라우저검수미실시 범위를 사용자명시수용

실기기Android/iOS/WebView·기기RAM/실시간고주사율성능은 미검증(adb devices0). 실제두탭숨김은 도구가document.hidden=false로유지해 수치증거로쓰지않음. synthetic hidden과실제정책엔진테스트를 구분한다. 작은 원본필선/음영차이는 보존된다.

## 롤백

git revert de7ed4416197664d50755d31609963fe8e8d0a94 1008fe3d92c714c237961c776011d989c7e6e074 후 같은CI·GitHub릴리스절차. 다른음성문서보존, DB/저장schema마이그레이션없음.
