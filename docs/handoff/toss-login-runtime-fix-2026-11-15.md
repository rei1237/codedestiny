---
status: done
updated: 2026-11-15
next: 구현과 운영 릴리스는 완료됐다. 기존 QR17 로그인·보관함 복귀·재진입은 사용자 정상 보고로 확인됐다. root가 별도 UI/UX 개선과 콘솔 등록 잠금 등 잔여 게이트를 추적한다. 운영 릴리스를 재실행하지 않는다.
---

## 첫 행동
이 문서는 로그인 오류 수정·홈 진입 개선·검증·운영 반영의 완료 기록이다. 다음 세션은 아래 고정 운영 SHA와 릴리스 결과부터 읽는다. 실기기 실패가 추가 보고되면 그 시각과 안전 오류코드를 근거로 새 문제를 진단한다. 이번 운영 승인으로 추가 배포하지 않는다.

## 지금 상태
- 구현 작업 워크트리: D:/Development/codedestiny-worktrees/toss-login-name-fix-20261115-162213, branch wt/toss-login-name-fix-20261115-162213. 문서 전달 후 자체 워크트리를 배수한다.
- 검증·배포 소스 SHA: 08103bec6de88481e89a6dd87c3a8abab223b54d. 마지막 완료 문서 커밋은 이 SHA 이후 문서 변경뿐이며 운영 소스와 구분한다.
- main CI43696444456 SUCCESS. 일반 Linux AIT43696559157도 Critical/Static/Build/Typecheck/CI required 모두 SUCCESS.
- 공식 운영43698214314 SUCCESS. verify-deployed-sha로 /version.json(Pages), /api/version(Worker) 모두08103bec6de8 PASS 확인.
- root의 다른 세션 파일·untracked skill을 편집/삭제하지 않았다.

## 승인 상태
- 사용자 요청: 실제 QR17 로그인 실패 및 옛 이름 표시 해결, 홈 로그인 진입 개선. 이름 문제는 후속 지시 “이건 그냥 놓아두고 내가 할테니까 나머지 앱 론칭작업을 완료해줘”에 따라 사용자 담당이다.
- 2026-11-15 사용자 승인 원문: “이 범위로 운영에 1회 반영”. 범위: 최종 CI 통과 후 검증 로그인 수정과 누적 웹 변경을 공식 Pages/Worker로1회, 신규판매닫힘 유지. 실결제·검토제출·토스 공개출시는 제외. main 변경 시 영향 재확인.
- 승인 당시be22 이후966은 흑월 번역3키·무료 홈 아트/문구·캐릭터 결과 이미지/CSS·동일 generated runtime/SEO, 081은 private 숙요 CSS fixture1개만 추가됐다. root가 가격정책/auth/API/DB 추가변경 없음을 검토하고 기존1회 승인 범위 내 허용했다.
- 다른 actor/session이 같은081의 공식production43698214314를 이미 시작했다. gate 로그 DISPATCH_MODE: production을 확인하고 중복하지 않았다. 이 담당자의 production dispatch0회. 이미 실행된1회 결과 추적으로 승인 범위를 소진했다.
- 비밀값·키·mTLS 변경, 실LLM·실결제·운영 DB 테스트 쓰기, 검토 취소/제출, 공개출시를 실행하지 않았다.

## 설계와 수정
- 실제 /api/toss/login HTTP502를 read-only 운영 로그에서 확인했다(2026-11-15 16:16:41/16:22:29KST). REQUEST_FAILED는 미등록 오류코드의 공통 표시였다.
- Workers는 fetch redirect:error를 지원하지 않아 요청 구성 시 TypeError가 발생했다. worker/toss/partner.js를 manual로 바꾸고 기존 !response.ok로3xx 거절을 유지했다. 타임아웃·재시도·키·자격증명 전달·소유권·판매 게이트는 보존했다. 공식 근거: https://developers.cloudflare.com/workers/runtime-apis/request/ 및 workerd src/workerd/api/http.c++.
- dcf43cfb9: 수정 및 Miniflare/workerd mock 회귀. 일반 outbound는 거절하고 mTLS service binding만 mock. 기존502 재현→수정200 및302차단.
- 8338a0c3f: 홈 토스로그인/기록보관함 CTA, 로그인 주요버튼 우선배치, 오류 본문/닫기 분리, 허용 코드·UUID 줄바꿈. 401/403 기존 안내 우선.
- 476e36e05: 홈 보관함 로그인 URL next=/library 보존. canonical 화면은 정확한/library만 추가 허용하며 외부 URL·유사 접두어·하위경로·query는 거절한다.
- 82985b270: Windows 함수.toString의 CRLF로 public freshness가 오탐한 부분만 LF 직렬화 정규화.
- be22b3ba5: 기존 웹 destiny-profile 변경 뒤 낡은 캐시핀을 공식 scripts/restamp-paid-runtime-pins.mjs로 재생성. sync:public 관리 vedic2개는 공식값 보존. 최종23파일 각1줄. billing-client는 PAID_SERVICE_RUNTIME_SRC URL버전1줄뿐이며 동결 정본 절차 verify-payment-freeze --update로 해당 wholeFile hash1개만 함께 갱신했다. 정책/원본로직 변경 없음.

## 검증과 실패 이력
- 서버 targeted21PASS, UI61PASS, 재진입34PASS 및 엄격/library 허용목록6PASS, 앱 typecheckPASS.
- 실제 offline mock 홈→로그인→보관함, 새로고침→mock로그인→/library, 앱 재진입 확인. 360/390px 오류코드/UUID/닫기 겹침 없고 주요 로그인버튼 접근 가능.
- 초기06ba check:fast는 계약77PASS, lint/typecheckPASS 후 기존 웹22실패로 종료했다. 이를 전체PASS라고 보고하지 않는다.
- verify:release의 기존 캐시핀 실패는 공식생성기로 수정 후 parity/paidgate/freeze PASS. 이미 통과한 앞부분을 반복하지 않고 나머지 deploy:critical을 원래 순서로 실행하여 모두exit0(Worker dry-run 포함).
- be22 main CI는 흑월 fallbackTitle/premiumRequired.0/.1 누락 실패. 다른 세션966에서 보완되어 dictionary11locale/112namespace/46574경로PASS.
- 966 CI Toss1750개 중1749PASS/1FAIL은 원본CSS와 private 숙요 fixture 불일치. 다른 세션081에서 fixture만 동기화. 해당2테스트PASS, 최종 전체 AIT Critical PASS.
- 최종 pre-pushPASS, 검증 코드 main push 완료. main 및 AIT 최종 CI 모두SUCCESS.
- 사후 읽기 전용: /api/toss/catalog200,5개available0; /native/catalog 무인증401; /tarot-library/catalog200,0개. 신규판매닫힘과 인증경계 유지.

## 실제 AIT·전달 자료
- C:/Users/user/Downloads/CodeDestiny/20261115-login-fix-08103bec6/ai-saju-studio.ait
- SHA256 df5d4e1e92b9d339d44f7904ea9e8b5cfa79af3fecf69c672ac7525a78fb55fd
- 87668788 bytes, expanded98825884 bytes, portable sources1760개. 일반SDK판(privateSimulation=false).
- 실제 AIT 추출본을 코드 변경 없이 외부네트워크 차단 로컬서버에서 확인: / 새홈 CTA, /login?next=%2Flibrary 새로고침 canonical 진입, 홈카드→/?world=yeongnyangi 달빛점술방. ait-home-360.png/ait-yeongnyangi-360.png 참조.
- 실제 AIT 로그인·구매·생성 fullE2E는 미수행이다. SDK가 실제 기기를 요구하며 offline mock 검증과 구분한다.
- README.md에 기존17QR 로그인→보관함복귀→앱종료→동일QR재진입 절차와 실패code/UUID/발생시각 기록 안내가 있다. 구17은 generic 오류문구일 수 있다. 새홈CTA는 새AIT등록 이후에만 보인다.
- 콘솔 재확인: 버전17 검토 중, 버전등록 버튼 disabled=true. 검토 취소·재제출하지 않아 새QR미발급. 구QR을 새QR로 복사하지 않았다.
- 공식SDK3 brand에는 displayName이 없다. 옛 이름을 숨기기 위한 navigationBar 변경 등 우회하지 않았다.

## 단계
- [x] 로그인 실제 실패 원인 확인 및 코드 수정
- [x] 홈/오류 UI·재진입 수정 및 targeted/mock 검증
- [x] main 전달, 최종CI·LinuxAIT검수
- [x] 승인된 기존 운영run 결과·라이브 양쪽SHA 확인, 신규판매닫힘 확인
- [x] 전달 파일과 실기기 확인 절차 준비
- [x] 2026-11-15 사용자 직접 보고: “로그인·보관함 복귀·재진입 모두 정상”. 기존17QR+운영081 서버의 실기기 확인이며 에이전트가 직접 기기를 조작한 것은 아니다.
- [ ] 외부 잔여: 콘솔 등록 잠금 해제 후 새AIT등록/새QR, 이름문제 사용자 담당

구현·운영 반영·사용자 실기기 로그인 확인은 완료했지만 새QR·전체 토스 출시 완료를 뜻하지 않는다. 후속의 더 직관적인 로그인/CTA UI·UX 개선 요청은 root가 별도로 진행하며 이번 담당자는 새 UI 파일을 편집하지 않는다. 추가 실결제·검토제출·공개출시는 계속 별도 게이트다.