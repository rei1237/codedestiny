---
status: in-progress
updated: 2026-11-15
next: cde0b14ea 고정 Linux AIT run43703521077 산출물을 받아 검수하고 최종 문서 commit/push 후 워크트리를 배수한다.
---

## 첫 행동

`D:/Development/codedestiny-worktrees/toss-cta-ux-20261115-184310`에서 branch/status/fetch 확인. 현재 로그 `D:/Development/Temp/toss-cta-ux-20261115/remaining-checks.log`를 읽고 실행 중 exec session90485를 이어 받는다. `Remaining check:fast gates PASS`까지 확인한다. 전체 검사를 처음부터 반복하지 않는다.

## 지금 상태

- UI 커밋 `5ac792a84` (12파일), origin6243d5767 보존 merge `493ed7349a8e494c13477a448bc6e9b0cabf74de`, clean. 이 문서 후속 커밋이 추가된다. 아직 UI push 전.
- 워크트리 `wt/toss-cta-ux-20261115-184310`. root 다른 세션 파일은 편집하지 않았다.
- 최신 확인 원격6243d576776ae2b6905ab3c3ba01aacb8b39a124 CI43701005627 SUCCESS. merge 후 pre-push PASS (`pre-push.log`). 최종 push 직전 실제 remote와 root WIP를 다시 확인한다.
- 종전 로그인 장애는 운영08103bec6de88481e89a6dd87c3a8abab223b54d, 공식 릴리스43698214314 성공, Pages/Worker SHA 일치. 사용자가 “로그인·보관함 복귀·재진입 모두 정상”으로 확인했다. 중복 배포하지 않는다.
- 이전 AIT는 `C:/Users/user/Downloads/CodeDestiny/20261115-login-fix-08103bec6/ai-saju-studio.ait`; 이번 UI는 아직 포함되지 않았다.

## 승인 상태

- 2026-11-15 최신 요청: “근데 로그인 버튼이라든지 버튼 CTA라고 하나? 이런게 사용자 경험상 좋지 않게 배치되어있어서 최고의 전문가로서 직관적이고 편리하게 UI/UX를 개선해줘”. 실제 구현·검증·커밋/push·Linux AIT 준비를 계속한다.
- 기존 달빛 예화·원본 캐릭터·가격·결제·소유권 보존. 이번 UI에 새 운영 서버 배포가 필요하지 않으며 이전 1회 운영 승인은 이미 처리됐다. 실결제·실LLM·운영 DB 테스트 쓰기·검토 제출·공개 출시 금지.
- 콘솔은 버전17 검토 중, `버전 등록하기` disabled=true. 새 QR은 잠금 해제 전 발급할 수 없다. 검토 취소/재제출로 우회하지 않는다. 이름 불일치 문의는 사용자가 맡기로 했으므로 전송하지 않는다.
- 새 Ego 작업공간은 이미 승인된 범위. root UI검수 space11 정상 finish 완료, dev 서버PID22448도 종료했다.

## 설계

- 홈 첫 화면에서 중복 공간탭을 생략하고 두 캐릭터카드로 선택. 공간 내부 탭은 유지. 계정 진입은 아이콘/윤곽 48px 버튼, 로그인 후 `내 보관함`.
- `LoginPanel.tsx/.module.css`는 SPA App과 canonical Screens에서 동일한 설명·54px 주버튼·복귀 안내·둘러보기·접는 개인정보 안내를 렌더링. 기존 브랜드 fonts-ui.generated를 직접 로드하여 명조/주아체 불일치를 해결했고 scoped button shadow도 동일화.
- 인증 callback은 그대로 유지(원본 문자열 대조 PASS), 네이티브 중복/이탈/계정/복원 가드와 return URL 허용목록은 변경하지 않았다.
- library의 구매 복구를 기록과 페이지네이션 아래에, settings 로그아웃은 weak. 정책문구 의미 보존. 공개웹 SEO 변경 없음.
- 근거 `docs/design/toss-cta-ux-2026-11-15.md`. root는 이미 impeccable/ego-browser/handoff 스킬을 읽었다. 후속 브라우저 사용 시 자기 세션에서 ego guide를 읽는다.

## 검증과 함정

- 앱 typecheck PASS. 관련 통합 133건 확인: 최초 공통패널을 mock으로 치환해 생긴 테스트 실패를 실제 패널 렌더링으로 고쳤다. 마지막 변경 후 실패했던20/32건 재실행 모두 PASS.
- `check:fast -- --plan`: critical. `check:fast` 계약/lint/sitemap/typecheck PASS, Node5086/5087 PASS. 실패1건은 새 워크트리에 무시된 fortune/data/daily-2026-11-15.json이 없어서였다. `npm run fortune:build-data` (외부 호출 없는 정적 계산) 후 실패 파일 `node --test __tests__/fortune/sky-and-range.test.mjs` 7/7 PASS.
- 전체 test:node를 반복하지 않고 `D:/Development/Temp/toss-cta-ux-20261115/continue-checks.mjs`가 공식 plan의 test:node 이후 npm script를 원래 순서대로 실행 중(session90485, 마지막 cron-mongo-op-coverage 진행). 맨 끝 Jest까지 확인할 것. 최초 check:fast 전체 PASS라고 쓰지 않는다.
- 최초로그 check-fast.log, 남은검사 remaining-checks.log, pre-push.log. npm cmd의 마지막 Get-Content가 exit0을 보일 수 있으므로 로그 실제 실패를 확인해야 한다. remaining script는 종료 코드를 보존한다.
- 새 별도 apps/toss/node_modules에 npm ci 완료(루트 deps만으로 Vite 없음). Node `C:/Program Files/nodejs/node.exe`, npm.cmd. Python은 python 명령 대신 py -3. lockfile 변경 없음.
- 브라우저 캡처 위치 `D:/Development/Temp/toss-cta-ux-20261115/`: home-360.png, final-login-spa-360.png, final-login-reload-360.png, final-login-error-360.png, login-reload-390/430/1280.png, login-privacy-360.png, library-logged-out-360.png.
- 별도 시각검수 agent `/root/toss_cta_ux_review` 최종 PASS. 360/390/430/1280px 넘침/겹침없음, CTA54px, 보조대비5.00:1/버튼7.35:1. SPA/refresh 제목·버튼 동일. 더 꾸미는 반복은 중단한다.
- 실제 mock 경로 홈→로그인→refresh→mock login→library→home→refresh→library PASS. 키보드 focus-visible solid PASS. 기존 localStorage의 과거 숙요mock 주문은 날짜/챕터메타가 없어 원문재열람 근거로 사용하지 않았다. 운영 library.js는 정상필드를 제공한다. 이 문제를 UI조건문으로 숨기지 않았다.
- Vite HMR 직후 AppEntry dynamic import 일시 실패: 모듈GET200 확인, reload 후 전체흐름PASS. 실제 AIT 검증과 구분한다. Ego emulation은 round마다 초기화되므로 매번 setDeviceMetricsOverride 필요. TDS text selector는 안쪽 overlay와 충돌하여 role:button selector를 사용. 아래쪽 버튼 pointer 자동scroll이 불안정해 실제 keyboard Enter로 전체동선 검증.
- Impeccable detector 1회: 기존 탭 선택밑줄과 기존 blockquote 테두리 2경고만, 새 LoginPanel경고없음.

## 단계

- [x] UI 구현·행동 경계 보존·타입 및 관련 통합 검사
- [x] 독립 시각검수 및 1회 보정 후 최종 확인
- [x] 코드 커밋, 최신 main 보존 merge, pre-push PASS
- [x] 남은 check:fast 단계 종료 확인: Jest 479 suites / 8011 tests PASS, 1 skipped. 마지막 exit0 및 Remaining check:fast gates PASS 확인.
- [x] cde0b14ea main fast-forward 통합/push. Push CI 43703512772 실행, 최종 결과 확인 전.
- [x] 공식 `pr-ci.yml` workflow_dispatch `full_ci=true,toss_artifact=true,toss_simulation_artifact=false` 요청: run43703521077. Linux AIT 결과 확인 전. 운영 릴리스 실행 없음.
- [ ] 산출물 다운로드·해시·portable 검수·새CTA 포함 확인. 같은SHA mainCI가PASS라면 artifact Critical upload 성공 시 다운로드 가능, 나머지 run상태는 별도 표기.
- [ ] 최신 AIT/검증화면/README를 Downloads/CodeDestiny의 새 명확한 폴더에 정리. QR 잠금/실기기 최신UI 잔여를 명시.
- [ ] 자기 문서 done, 커밋/push/CI 확인, 워크트리/브랜치 배수 및 자체 scratch 정리. root의 다른 .claude untracked나 다른워크트리는 건드리지 않는다.

## 이전 정리 제한

로그인fix의 외부 임시·중간(be22/966)폴더 3개 일괄 재귀삭제는 자동 승인검토가 blocked by policy(세부사유없음)로 거절하여 남겼고 root가 이미 사용자에게 설명했다. 이 작업이 우회 삭제하지 않는다. 새UI의 검수 산출물은 전달 폴더로 보존 후 자기 스크래치만 정상 절차로 정리한다.

## 전달 진행 추가

- main 전달 SHA: cde0b14ea71889a20b9785904cb1514e0cb2a1e5. 최종 pre-push exit0.
- 새 전달 폴더: C:/Users/user/Downloads/CodeDestiny/20261115-login-cta-ux (검수 캡처 9개, README, 검증 로그).
- Linux AIT 다운로드 후 D:/Development/Temp/toss-cta-ux-20261115/verify-delivery.mjs로 경로·일반판·크기·새 CTA·SHA256 검증 준비.

## AIT 완료 추적 승인 원문

부모 세션이 2026-11-15 원문을 재확인했다: “검증된 커밋으로 Linux AIT를 생성하고, 기존 축소 버전과 구분되는 새 비공개 테스트 QR을 준비해.”, “최종 CI 결과를 확인하고 ... 실제 AIT에서 홈 진입부터 ... 검증해줘”, “나머지 앱 론칭작업을 완료해줘”. 따라서 AIT 산출물 확보와 이 요청의 최종 CI 확인은 일반 push의 습관적 폴링과 달리 명시된 납품 범위로 완료까지 추적한다. 새 QR은 기존 콘솔 검토 잠금을 우회하지 않는다.

## CI 실패 수선

- cde0b14ea Push CI43703512772는 기존 홈 nav를 찾는 5개 테스트(FPTI 2, 휴먼디자인 1, 마야 1, 심리 1)가 실패했다. 제품 UI나 라우팅 오류가 아니라 승인된 캐릭터 카드 진입에 맞춘 테스트 갱신 누락이었다.
- 제품 코드는 변경하지 않고 4개 테스트 파일을 실제 `button.world-entry-ggulggul`로 진입하도록 갱신했다. FPTI 공유 DOM 테스트는 시작 URL을 `/`로 초기화해 직전 테스트의 world 쿼리 영향을 제거했다. 기존 목적지/assertion 강도 유지.
- 관련 7개 테스트 파일 18/18 PASS. 수선 커밋 62e0b6d16. 폐기된 cde AIT 요청43703521077 취소 요청.
- pre-push는 이 문서 미커밋 때문에 판정 불가로 1회 중단됐다. 문서 커밋 후 다시 수행하며, 이를 코드 회귀로 기록하지 않는다.
