---
status: in-progress
updated: 2026-11-15
next: main의 기존 CI와 public 미러 실패가 해소되면 검증 커밋을 통합한다. root가 새 운영 승격 및 이름 지원 문의 승인을 각각 처리한다.
---

## 첫 행동
`D:/Development/codedestiny-worktrees/toss-login-name-fix-20261115-162213`에서 상태를 확인한다. 실행 중 검사 로그는 저장소 밖 `D:/Development/Temp/toss-login-fix-20261115/check-fast.log`다. root는 다른 세션 웹 홈/i18n 변경이 있으므로 편집·reset·stash하지 않는다.

## 지금 상태
- 안전 워크트리 `wt/toss-login-name-fix-20261115-162213`, 시작 SHA `06ba90272dd5308e5bd6826f76a7a23fa9d0be11`.
- 이전 운영 릴리스 43618733981 성공, 코드 a18cf23c7. 이번 작업의 운영 배포 0회.
- 실제 QR 20261115-17의 Android 로그인 실패를 Cloudflare read-only Logs에서 확인했다. 2026-11-15 16:16:41 및 16:22:29 KST `/api/toss/login` HTTP 502. 후자는 wallTime 262ms, DB 연결 성공 175ms, 연결완료 8ms 뒤 응답. 개인정보·토큰·요청 본문은 근거 문서에 보관하지 않는다.

## 승인 상태
- 2026-11-15 사용자: “로그인은 요청을 완료 못했다면서 안되고 있고 이 서비스 이름이 AI 사주 물상으로 나오는데 이 문제를 해결해줘”. 추가 캡처에서 네이티브 상단 옛 이름과 로그인 오류, 홈 로그인 버튼 부재가 확인됐다.
- 새 브라우저 작업공간 사용, 코드 수정·mock 검증은 승인 범위다. 실결제·실LLM·운영 DB 테스트 쓰기·키 회전·검토 제출·공개 출시를 수행하지 않는다.
- 이전 운영 승격 1회 승인은 이미 사용됐다. 새 수정의 운영 승격은 검증 커밋·영향을 root에 전달하고 별도 구체 승인 후 공식 workflow로 수행한다.
- 콘솔에서 버전17의 검토가 이미 진행 중임을 발견했다. 이 세션은 제출하지 않았다. 요청 취소·재제출을 하지 않는다.

## 작업 규칙과 함정
- SDK3.x에는 brand.displayName/icon이 없다. 공식 문서 `https://developers-apps-in-toss.toss.im/llms-full.txt` 브랜드 이름 절은 콘솔만 사용한다고 명시한다. 설정에 속성을 추가하거나 withTitle=false로 옛 이름을 숨기지 않는다.
- 콘솔 정상 UI가 조회한 meta-overview/release-overview를 read-only 대조: title/review.title 모두 `꿀꿀운세`, reviewState IN_REVIEW, reviewTarget BOTH, isEditable false, isDeployed false, liveBundle null. 최초 메타+번들 동시 검토 중이며 editable gate가 닫혔다. native 옛 이름의 캐시/전파 원인은 아직 미확정이다.
- 최초 검토 번들 deployment `01a1da95-7f41-7a56-843d-a262f3916715`, SDK3.7.0, 20261115-17. 파일 SHA256 `897d7d34c7b9bbce83302747c1ce16b541875092a1d7357e319747f786d81dcd`.
- REQUEST_FAILED 문구만으로 generic503으로 오판하면 안 된다. 실제502의 미등록 code도 같은 fallback으로 표시됐다.
- 기존 routes catch는 errorId를 응답에만 넣고 로그에는 남기지 않는다. 과거 errorId만으로 로그 상관관계가 있다고 주장하지 않는다.
- Ego space4, p1 토스 콘솔, p2 Cloudflare, p3 로컬 mock. 브라우저 스크립트 round38까지. 매 round 새 파일로 쓰고 이전 round 재실행 금지. 완료 전 finish하지 않는다.

## 설계
공통 `worker/toss/partner.js`가 fetch에 `redirect:'error'`를 주었다. Workers는 이를 지원하지 않아 Request 구성 시 TypeError를 발생시킨다. 공식 근거: `https://developers.cloudflare.com/workers/runtime-apis/request/`, workerd `src/workerd/api/http.c++`.

`manual`로 바꾸고 기존 `!response.ok` 검사를 유지한다. 따라서 3xx를 따라가지 않고 실패로 닫으며 토큰·인가코드가 다른 호스트로 전달되지 않는다. 타임아웃·재시도·키·판매 게이트·계정 및 결과 소유권은 변경하지 않는다. 원인이 확정되어 불필요한 서버 로그 추가는 생략한다.

새 Miniflare/workerd 회귀는 실제 Worker Request 구현을 사용하고 TOSS_MTLS를 mock 서비스 바인딩으로 주입한다. 일반 outbound는 무조건 실패한다. 기존 코드로 502 실패를 재현했고 수정 후 로그인200 및302거절을 검증했다. 외부 OAuth·결제·DB 호출은 없다.

## 단계
- [x] 실제 실패 요청 상태와 SDK 브랜드 계약 확인
- [x] workerd에서 기존 코드 실패 재현
- [x] manual 리디렉션 수정 및 targeted 21/21 통과
- [x] check:fast critical 실행 및 서버 커밋(전체 통과 아님, 아래 근거)
- [x] 홈 로그인 진입·오류 겹침·안전 코드 안내 수정 및 모바일 mock 검증
- [x] pre-push 실행(기존 public/index.html 미러 불일치로 실패; 통과 아님)
- [ ] main 통합·CI 결과 확인 및 새 Linux AIT/비공개 QR 준비
- [ ] 승인된 새 운영 승격 후 실기기 로그인 왕복 확인
- [ ] 콘솔 이름 전파 확인(검토 취소·재제출 금지), 결과 전달 및 자기 워크트리 정리

## 검증과 커밋
- `dcf43cfb9`: 서버 manual redirect 및 workerd 회귀. 기존 코드 502 재현 후 수정본21/21 PASS.
- `8338a0c3f`: 홈 상단 토스 로그인/기록 보관함을 기존 requireLogin에 연결. 로그인 주요 버튼을 긴 설명 위로 이동. 오류 본문과 닫기 버튼을 분리하고 허용된 오류코드·UUID만 각각 줄바꿈. 401/403은 기존 인증 안내 우선 유지.
- 앱 typecheck 첫 실행과 독립 두 번째 확인 모두 exit0. 전체 check:fast는 계약77/77, lint/sitemap/typecheck 통과 후 Node5078 중5056 pass/22 fail로 종료. 실패는 기존 웹 번역·홈카탈로그 관련이며 Jest와 이후 단계는 미실행. 검사 로그에서 실패 명칭을 확인할 것. 전체 검사를 반복하지 않는다.
- UI targeted `automatic-recovery-home`, `native-session-integration`, `tarot-login-return`, `session-draft-relogin`:61/61 PASS. 초기 unknown401 메시지 회귀1건을 찾아 인증 안내 우선으로 고친 뒤 통과했다.
- 실제 브라우저로 홈→토스로그인→mock 로그인→보관함→홈 재진입→기록보관함 확인. 기존 mock 저장소에 있던 숙요 결과 목록은 날짜/챕터 메타가 누락된 fixture라 그 원문 재열람을 이번 로그인 검증으로 주장하지 않는다.
- 360px 주요 로그인버튼 y248~302, 가로 넘침 없음. 오류 화면360/390px에서 본문/닫기 겹침 없음, 코드 표시 확인. 캡처는 `D:/Development/Temp/toss-login-fix-20261115/home-360.png`, `login-360.png`, `login-error-360.png`, `login-error-390.png`.
- Impeccable detector는 변경 이전부터 있던 style.css 결과 인용문의 border-left 한 건만 경고했다. 이번 수정 범위 밖 기존 디자인은 보존한다. 공개 웹 URL/SEO 변경 없음.
- 원격 main 재확인06ba90272, CI43685434571 failure 유지. root의 다른 세션 WIP는 편집/스테이징하지 않았으며 이 작업 push/배포/검토제출0회다.

## 이름 불일치 지원 문의 초안 — 미전송
사용자가 토스 앱 완전종료 후 QR17을 다시 열어도 상단 `ai 사주 물상`이 유지됨을 확인했다. 단순 앱 재시작으로 해결된다는 가설은 배제했다. 콘솔의 miniApp/review 응답 전체에서 name/title/display/brand 필드와 `사주 물상` 문자열을 대조했으며 title은 꿀꿀운세만 존재했다.

> 앱 ai-saju-studio, workspace21957의 비공개 테스트20261115-17(deployment01a1da95-7f41-7a56-843d-a262f3916715), SDK3.7.0에서 네이티브 상단명이 `ai 사주 물상`으로 표시됩니다. 콘솔 miniApp.title/review.title은 모두 `꿀꿀운세`이며 최초 앱정보와 번들이 IN_REVIEW/BOTH, isEditable=false, liveBundle=null 상태입니다. 토스 앱을 완전히 종료한 뒤 같은 QR로 재진입해도 같습니다. SDK3에는 brand.displayName 설정이 없다는 공식 가이드를 확인했습니다. 검토를 취소하지 않고 테스트 미니앱의 네이티브 브랜드 메타데이터를 현재 콘솔명과 동기화할 수 있는지 확인 부탁드립니다.

외부 문의는 전송하지 않았다. 검토 취소·재제출이나 무효 config 속성 추가, 네이티브 제목 숨김으로 우회하지 않는다.

## 전달 게이트
`npm run check:pre-push`는 verify:public-mirror-fresh에서 public/index.html이 소스보다 낡았다는 기존 main 결함으로 실패했다. 다른 세션의 웹 홈 작업 범위이므로 sync:public이나 root 편집을 하지 않았다. 서버/UI 커밋은 준비됐지만 main push·CI green·새 Linux AIT·새 QR·운영 반영은 완료로 보고하지 않는다. 브라우저 검수는 round38로 완료했고 space4는 round39 finish로 종료했다. 자체 offline 서버도 종료했다. 검수 중 `/login?product=...` 새로고침에서는 로컬 service/Screens.jsx 동적 import 실패가 발생했다. 홈부터의 정상 mock 로그인/보관함 왕복은 통과했으며 이 새로고침 실패를 실제 AIT 성공으로 해석하지 않는다. 새 Linux AIT 검증 때 재확인할 항목이다.

## 최신 main 통합 — 2026-11-15 후속
- eda40c1d9를 워크트리에 보존 merge(6d2bd0bca)했다. 기존 웹 홈/i18n 수정은 그대로 포함된다.
- 앞선 pre-push 실패 경로는 public/index.html이 아니라 root index.html이었다. Windows의 함수.toString()이 CRLF9개를 HTML에 삽입하여 내용diff 없이 dirty가 되는 문제를 확인했다. 82985b270에서 free-promo-shell의 두 함수 직렬화만 LF로 정규화했다. 관련6개 테스트PASS, 마지막 pre-push exit0.
- 로그인/UI targeted21+61PASS, 앱typecheckPASS는 유지된다. 과거22개Node실패를 최종트리실패로 재사용하지 않는다. 최신main CI43691843070은 마지막 확인 시 실패 없이 진행중. root 지시에 따라 이를 추가대기게이트로 만들지 않고 안전main통합 및push,공식LinuxAIT artifact실행을 이어간다.
- 사용자 최신 지시로 이름불일치/지원문의는 사용자가 담당한다. 해당 외부문의는 전송하지 않으며 추가 조작하지 않는다.
