---
status: in-progress
updated: 2026-11-17
next: mock 브라우저의 새 프로필 페이지에서 캐릭터·꿀방울 정상 표시를 확인하고 화면 캡처와 독립 검토를 완료한다.
---

# 프로필·꿀방울·달빛 다이어리 구현

## 첫 행동
- 작업 디렉터리 D:\Development\codedestiny-worktrees\profile-diary-20261117-074709 에서 이 문서와 .tmp/profile-diary-state.md를 읽는다.
- 이어받을 때 handoff, impeccable, ego-browser 스킬을 따른다. 이미 승인된 계획을 재질문하지 않는다.
- 기존 main 체크아웃 D:\Development\code-destiny 의 다른 세션 변경을 보존한다.

## 지금 상태
- 브랜치 wt/profile-diary-20261117-074709, 베이스 c4d928dd8628c8f38ca3e293419440094b32c6c1.
- 마지막 구현 커밋 0b38ddf4ab462f6b222b0f2da287548c76afc910: feat(diary): add local recurring schedule model.
- 다수의 프로필 UI/다이어리 UI/초안/테스트/캐시 참조/미러 변경은 아직 미커밋이며 전부 이 작업 소유다. git status와 diff로 확인한다.
- main 에는 다른 세션 소유의 .claude/skills/fire-your-seo-agency/가 있으므로 삭제·커밋 금지.
- push하지 않았다. 기준 main CI c4d928dd8은 이미 실패: https://github.com/rei1237/codedestiny/actions/runs/43973468383 .
  원인은 홈의 기존 cdSignatureConsultPopup이 CI 클릭을 가림. 이 작업과 별개다. 빨간 main 위에 push하지 말고, 전달 직전에 원격 main이 새 커밋/초록 CI로 바뀌었는지 확인한다.

## 승인 상태
- 2026-11-17 사용자: "Please implement the plan."
- 프로필 운세 이용 중심, 꿀방울 기존 사용처 연결 개선, 다이어리 월·주·일/반복 일정 일상 플래너, 현재 기기 저장 유지, 프로필에서 전체 화면 앱으로 열기까지 승인됨.
- 실 LLM·실결제·운영 DB·프로덕션 승격 승인은 없다. 모든 검증은 mock만.
- 최종은 한국어로 수정 파일/의도/유지 정책/검증 명령·결과/남은 확인을 보고한다.

## 작업 규칙과 함정
- 큰 변경이므로 테스트 추가가 critical로 자동 승격된다. 공식 로컬 진입은 check:fast, 전체 lint/test/build를 임의로 반복하지 않는다.
- sync:public은 생성 미러와 loader hash도 바꾼다. public 사본을 손으로 고치지 않는다.
- js/destiny-profile.js를 바꾸면 독립 HTML 10개와 public 미러, app/_lib/billing-client.ts의 PAID_SERVICE_RUNTIME_SRC 상수,
  scripts/verify-paid-gate-ui-regression.mjs의 핀 검사, config/payment-freeze.json 해시도 함께 갱신해야 한다.
  현재 derivePinKey는 build-b272a0842522. 결제 파일은 URL 캐시 상수만 변경했고 정책·결제 로직은 변경하지 않았다.
  핀 유도법은 scripts/verify-payment-choice-parity.mjs:783. freeze --update는 의도된 캐시 상수 변경에 한해 이미 실행했다.
- npm run sitemap:generate 완료: 1086 URLs, 원장 879 중 유지873/갱신6. 캐시 참조 HTML 수정에 따른 요구된 lastmod 산출물이다.
- ego-browser space 50, p1 다이어리(주 보기·일정 편집 중), p2 프로필(옛 fetch 주입 fixture가 실패 상태). p2의 fetch 가짜 주입을 고치려 반복하지 말 것.
- mock API를 새로 확장했으므로 새 페이지(p3)를 열어 실제 mock 서버 응답으로 프로필을 확인하는 것이 다음 단계다.
  own mock dev: exec session 68717, frontend http://127.0.0.1:22026 , API 22027. --watch로 mock API 코드 수정 시 서버 상태가 초기화된다.
  테스트 로그인과 프로필을 /api/auth/login 및 /api/profile POST에 로컬로 seed하면 된다(health.mock 검증 후).
  브라우저 인증 저장 키는 fortune_auth_token + fortune_auth_user (fortune_user가 아님).
  새 page의 Page.addScriptToEvaluateOnNewDocument에는 fake auth 키와 fortune_api_base_url=location.origin만 넣으면 충분하다.
- ego high-level snapshot/evaluate/click이 viewport를 데스크톱으로 재설정한다.
  모바일 캡처는 page.cdp Emulation.setDeviceMetricsOverride → Runtime.evaluate(실측 innerWidth) → Page.captureScreenshot을 연속 사용한다.
  Browser.getWindowForTarget은 "No web contents in the target"로 실패했으므로 재시도하지 않는다.
- 초기 dev HMR 중 SSR 로딩 화면에서 effect가 실행되지 않았지만 한 번 reload 후 정상. 프로덕션 결함으로 단정하지 않는다.
- 스크래치/스크린샷은 .tmp/에 둔다. 종료 시 own dev 세션 Ctrl-C, task.finish, own .tmp 파일 정리, 자기 워크트리 배수까지 한다.
- 현재 컨텍스트의 visual_checker는 계획 이미지 검토만 완료했다. 구현 완료 시 fresh fork_turns=none의 독립 finish reviewer와 documenter가 필요하다(impeccable 지시).

## 설계와 구현
- 일반 프로필에서도 preview 조회/일주 스프라이트/오행을 표시. 펫 garden API는 my 진입만 유지.
- 로딩/실패/프로필 보완/재시도 상태 분리. 늦은 응답은 소유자·연결 상태로 차단.
- 재렌더 전에 live honey widget을 돌려놓는 cd:profile-card-before-render 이벤트. close 시도 위젯 복원보다 먼저 abort.
- 프로필 카드 순서: 이름·캐릭터/프로필 바꾸기 → 운세 보기 → 출석·꿀방울 및 catalog 사용처 → 다이어리 → 성장/출생 정보.
- 꿀방울 제안은 CdHoney.getCatalog/getState와 기존 확인·해금 경로만 사용. 실제 가격/보유량을 지어내지 않음.
- 다이어리 기본 진입은 /diary/?from=profile, legacy embedded=true 모드는 보존.
- 월·주·일 플래너, 일정 편집/종일/시간 범위/반복(일·선택요일 주·매월)/한 건·전체 수정삭제, 할 일 수정·날짜 이동.
- 데이터는 기존 월 shard의 원본 anchor에 남음. date/endAt/allDay/note/repeat/exceptions 선택 필드. 반복은 화면 범위에서 계산.
- 검색은 반복 series를 한 번, 편집된 occurrence를 별도로 인덱스. 생성 날짜가 반복 요일이 아니어도 실제 첫 발생일을 찾음.
- 자동 저장는 600ms. boolean commit 성공 후에만 saved 표시. 실패 초안은 앱 메모리에 남고 재방문 시 복구하며 명시적 전체 삭제 시 recovery도 비움.
- 계정 동기화/알림/외부 캘린더는 범위 밖. noindex 유지.
- scripts/mock-dev-api.mjs에 character-preview와 honey catalog/attendance GET만 추가. 순수 계산/정본 카탈로그/지급 상수 사용,
  spend와 attendance POST는 계속 501. 실제 DB/LLM/PG 폴백 없음.

## 단계
- [x] 버그 재현/계획·사용자 선택 확정
- [x] 캐릭터·꿀방울·프로필 UI 구현
- [x] 플래너 데이터 모델 및 테스트 (0b38ddf4a 커밋)
- [x] 달력/일정/할 일/일기/초안/전체화면 연결
- [x] targeted tests: 프로필15 → 추가 꿀방울2 포함6개 summary, planner8 + mock5=13, draft3, 기존 저장/백업/noindex/copy50 통과
- [x] typecheck 1회와 관련 ESLint 통과(이후 작은 변경 있으므로 최종 gate 필요)
- [x] check:fast의 paid gate 77개 통과
- [ ] check:fast 전체 완료: 첫 실행 핀 실패→수정, 둘째 테스트 변수 module ESLint 실패→bundleModule/cardModule로 수정,
      셋째 sitemap drift 실패→sitemap:generate 완료. 마지막 로그 .tmp/check-fast-pass.log. 다음 최종 실행은 --base=c4d928dd8628c8f38ca3e293419440094b32c6c1로 작업 전체 포함.
- [ ] 프로필 mock 정상 표시, 월주일/편집/날짜 이동/빠른 추가/일기 저장 실제 조작 마무리
- [ ] 360/390/430/1440 및 연이/네오 캡처·접근성 계측·독립 finish review, 한 묶음 수정/확인
- [ ] impeccable detector 1회(아직 실행 안 함), task 한정 surface 문서 기록
- [ ] 검증한 UI/프로필/캐시·미러를 독립 커밋으로 보존
- [ ] main 최신 상태 확인 → 안전 병합 → pre-push → (기준 CI 문제 해결되었을 때만) push → CI 1회 보고
- [ ] 이 문서 done, mock/브라우저/임시 파일/워크트리 정리
