---
status: done
date: 2026-10-09
updated: 2026-10-09
next: 전달 검증 완료. 공유 main의 다른 세션 변경이 정리된 뒤 git pull --ff-only로 최신 원격 main을 반영한다.
last_verified_sha: 66de5ab1016e3db633346d58a4425a4f68b54328
---

# 영냥이 대화형 입력 — 구현 전달, 공유 main CI 차단

## 2026-10-09 최종 재검증 — 전달 완료
- 사용자 지정 시작 전달 SHA: `98e8db5141a7fe5104f0f4c7323598afc70bca8c`. 동시 변경을 보존하는 격리 워크트리에서 검증했다. 이 절이 아래 과거 차단/재개 절보다 우선한다.
- 원격 main `bf7e5a938b7f7d03a7cf0f04bc403612046cf769`에서는 기존 결제 6건과 추가 무후르타 가격 2건이 실패했다. 실제 핵심 검사를 실행한 [CI 37824686293](https://github.com/rei1237/codedestiny/actions/runs/37824686293)도 6 suites / 8 tests 실패 및 sitemap 원장 드리프트로 실패했다.
- 검증 중 전달된 가격 회귀 수정 SHA `c6a8ec26f0b81dbec4e0228f017c163b73a5dfd6`에서 `npm run test:jest -- --runInBand --silent`에 아래 6개 worker 파일을 지정해 **6 suites / 155 tests PASS**를 확인했다. 기존 실패 6건과 추가 실패 2건이 모두 해결됐으며 과거 러브 코드 영구 해금 보존 assertion도 변경 없이 통과했다.
  - relationship-boundary-test.route.test.js, payments-v2.daewun-pricing.test.js, payments-v2.entitlements.test.js, paid-non-llm-delivery.test.js, static-reading-price.test.js, app-store.google-billing.test.js.
- `npm run verify:home-service-registry`: **PASS**. [CI 37823842908](https://github.com/rei1237/codedestiny/actions/runs/37823842908)의 love-simulation / nakshatra-muhurta 가격 표기 및 animal-destiny 가격 불일치 **3건 해결**. 레지스트리 57개·질문 카드 37곳·패널 8개 대조 통과.
- `node --test __tests__/ui/yeongnyangi-intake-chat.test.mjs __tests__/ui/yeongnyangi-question-policy.test.mjs`: **14/14 PASS**.
- `node scripts/qa/verify-yeongnyangi-intake.mjs`: **PASS**. mock 요청 5개·브라우저 오류 0개·390px scrollWidth=390. 프로필 저장 오류/재시도, 로그인 복귀, 궁합·진로·장기·타로, 누락 입력 복원 통과. 실제 LLM·결제·DB 검증은 아니다.
- 남은 sitemap 차단은 기존 생성기 `npm run sitemap:generate`로 `config/sitemap-lastmod.json` 서명 78개만 갱신했다. URL·lastmod·정책은 변경하지 않았다. `npm run verify:sitemap-drift`: **PASS**, 955 URLs. 전달 커밋 `66de5ab1016e3db633346d58a4425a4f68b54328`을 원격 main에 push했다. 이 SHA는 결제 수정 뒤 문서와 sitemap 원장만 추가됐으며 상담/결제 소스는 c6a8ec26f와 같다.
- `gh workflow run pr-ci.yml --ref main -f full_ci=true`로 실행한 [main CI 37827273374](https://github.com/rei1237/codedestiny/actions/runs/37827273374)는 `66de5ab1016e3db633346d58a4425a4f68b54328`에서 **최종 success**. Critical checks, Static guards, Build Pages and Worker, Typecheck and lint, CI required가 모두 실제 실행 후 success다. 핵심 검사 skip 성공으로 대체하지 않았다.
- 문서 변경은 `npm run check:fast -- --plan`, `npm run check:fast`, `npm run verify:handoff-contract`, `git diff --check`로 검증했다. 이후 원격 main의 `b4b1a4b1b7586b67c0fab4a7de2b58fd96d74d64`는 다른 작업의 문서-only 변경이며 상담/결제 소스는 검증 SHA와 같다.
- 최초 sandbox의 Jest 임시 경로 EPERM 및 Playwright 경로 제한은 승인된 로컬 mock 실행으로 해소했다. 검증 중 공유 main의 `git pull --ff-only`는 다른 세션 HTML 변경과 겹쳐 안전하게 중단됐으며 해당 변경과 index는 보존했다. 원격 main push는 격리 워크트리에서 수행했다.
- 이번 직접 수정은 sitemap 생성 원장과 이 문서다. 결제 정책·인증·API·DB·상담 UI 코드는 수정하지 않았다. 다른 채팅 메시지, 실제 과금, 운영 DB 쓰기, 스테이징 검증, 운영 승격은 실행하지 않았다.
- 재개/확인 지시: `D:/Development/code-destiny`에서 `D:/Development/code-destiny/docs/handoff/2026-10-09-yeongnyangi-intake-ci-blocked.md`를 읽고, 마지막 코드 전달·검증 SHA `66de5ab1016e3db633346d58a4425a4f68b54328`와 CI 성공 근거를 확인한다. 다음 행동은 다른 세션의 main 변경이 정리된 후 `git pull --ff-only`이며, 가격/상담 UI 재구현이나 운영 승격은 필요하지 않다.

## 2026-10-09 재검증 — 차단 유지
- 사용자 지정 마지막 전달 SHA는 `516219bfb4fb93d430363e94f5e6306471cb1f2b`. 이후 원격 main `7f48507964e2e297b33694dff43276589d9a8b50`을 별도 워크트리에서 고정 검증했다. 공유 main의 다른 세션 미커밋 변경은 보존했다.
- `e49855d93`은 정적 테스트 3개의 과거 가격 기대값만 정본에 맞췄다. 해당 3파일과 intake-chat의 `node --test`는 **25/25 통과**했다.
- `node scripts/qa/verify-yeongnyangi-intake.mjs`: **PASS**, mock 요청 5개, 브라우저 오류 0개, 390px에서 가로 넘침 없음. 프로필 저장 오류/재시도, 로그인 복귀, 타로/궁합/진로/장기, 누락 입력 복원 통과. 실제 LLM·결제·DB 검증은 아니다.
- `npm run test:jest -- --runInBand --silent`에 아래 5개 worker 파일을 지정: **5 suites 실패, 6 tests 실패, 81 tests 통과**.
  - `relationship-boundary-test.route.test.js`: 1,000원 기대 / 정본 응답 5,000원.
  - `payments-v2.daewun-pricing.test.js`: section_summary 3,000원 기대 / 5,000원.
  - `payments-v2.entitlements.test.js`: 과거 러브 코드 영구 해금의 `unlockMap[LOVE_CODE_FEATURE_KEY]`가 true 대신 undefined. 기존 결과 접근 보존 문제이므로 기대값만 바꾸면 안 된다.
  - `paid-non-llm-delivery.test.js`: fixture의 unlock / 현재 per_use 불일치.
  - `static-reading-price.test.js`: animal-destiny-unlock 1,000원 기대 / 5,000원, rpt_quantumCard 1,000원 기대 / 10,000원.
- 실제 핵심 검사를 실행한 [CI 37821500883](https://github.com/rei1237/codedestiny/actions/runs/37821500883)은 `e5972a981532b63ac4b296a2146fffcf07e140af`에서 실패. Critical checks의 5 suites / 6 tests 실패가 로컬에서 그대로 재현됐다.
- 최신 [CI 37823085397](https://github.com/rei1237/codedestiny/actions/runs/37823085397)은 `7f48507964e2e297b33694dff43276589d9a8b50`에서 success이나 문서 변경으로 Static guards / Critical checks / Build를 **skipped**했다. 회귀 해결 증거로 인정하지 않는다.
- 초기 sandbox의 Jest 임시 경로 EPERM 및 Playwright 브라우저 경로 제한은 승인된 로컬 재실행으로 해소했다. 검사 실패와 환경 실패를 구분했다.
- 이번 수정은 이 인수인계 문서뿐이다. 가격·결제·인증·API·DB 로직을 수정하지 않았고 다른 채팅에 메시지를 보내지 않았다. 운영/스테이징 검증·승격도 실행하지 않았다.
- **다음 행동:** 가격 작업에서 위 5개 worker suite, 특히 과거 러브 코드 접근 보존을 수정한 SHA가 전달되면 해당 suite와 intake browser를 재검증하고, 핵심 검사가 실제 실행된 main CI required 성공을 확인한 뒤 status: done으로 닫는다. 이 문서의 과거 재개 절보다 본 절이 우선한다.

## 구현과 전달
- 사용자 승인: 한국어 질문형 상담을 고민부터 결제 직전까지 메신저로 연결. 기존 규칙 사용, 추가 AI 호출 없음.
- 구현 커밋: 08fec61a3. 동시 main 변경 통합 후 전달 SHA: 68757ca738dc92ea2926e423c91ab00fdbcd7e1b.
- main 로컬/원격 반영 완료. 별도 PR·운영 배포 없음. 다른 세션의 staged/미커밋 파일은 보존했다.
- 상담 질문, 범위·가격 확인, 프로필 단계별 생성/선택, 타로 준비, 결과 언어, 최종 확인, 이전 답변 수정, 로그인/새로고침 복귀를 구현했다.
- 서버 API·DB·결제 정책 변경 없음. 가격·질문 횟수는 기존 정본을 사용한다.

## 변경 파일
- app/yeongnyangi/_components/Consultation.tsx
- app/yeongnyangi/_components/IntakeChat.tsx
- app/yeongnyangi/_components/intake-chat.module.css
- app/yeongnyangi/_components/ProfileChatFields.tsx
- app/yeongnyangi/_components/ProfileForm.tsx
- app/yeongnyangi/_components/ProfilePicker.tsx
- app/yeongnyangi/_components/tarot/TarotSpreadPlanner.tsx
- app/yeongnyangi/_lib/intake-chat.ts
- __tests__/ui/yeongnyangi-intake-chat.test.mjs
- scripts/qa/verify-yeongnyangi-intake.mjs
- DESIGN.md
- .impeccable/surfaces/yeongnyangi-intake-chat.md

## 검증
- node --test __tests__/ui/yeongnyangi-intake-chat.test.mjs: 4/4 통과. 기존 question-policy와 함께 실행: 14/14 통과.
- npm run typecheck: 최종 통합 SHA에서 통과.
- node scripts/qa/verify-yeongnyangi-intake.mjs: 최종 통합 SHA에서 통과. 일상/진로/궁합/장기/타로 5개 mock 요청, 프로필 저장 실패·재시도, 로그인 복귀, 누락 입력 복원, IME 전송 방지, 작은 viewport 포함. Next navigation은 대역이며 실제 React 컴포넌트를 번들해 검증한다.
- 실제 Next 화면 모바일/데스크톱 캡처 확인 및 finish reviewer ship(mock 범위). 원본 캐릭터 자산 재사용. 실제 기기 키보드는 미검증.
- impeccable detect: 지적 0개.
- npm run check:fast -- --plan / npm run check:fast 실행. 초기 sandbox 제한 실패 후 재실행에서 paid gate 88/88, node 3028/3028 통과. 동시 가격 변경 통합 이후 최종 Jest에서 5 suites / 6 tests 실패.
- GitHub main CI 37820097712: failure. Build Pages and Worker, Typecheck and lint 통과. Static guards / Critical checks / CI required 실패.
- CI 링크: https://github.com/rei1237/codedestiny/actions/runs/37820097712
- 실제 LLM·결제·운영 DB·운영 배포는 실행하지 않았다.

## 공유 main 차단 원인과 경계
이번 UI 커밋에서 수정하지 않은 가격/과금 회귀다. 정책을 임의로 바꾸거나 기대값만 고치지 않는다.
- CI static: animal-destiny.static.test.js, luck-sync-diary-planner.static.test.js, mobile-pricing-source.static.test.js에 과거 1,000원/10 값 기대가 남아 있다.
- local Jest: relationship-boundary-test.route.test.js, payments-v2.daewun-pricing.test.js, payments-v2.entitlements.test.js, paid-non-llm-delivery.test.js, static-reading-price.test.js.
- 과거 러브 코드 unlockMap 보존 실패도 있으므로 단순 기대값 교체로 처리하면 안 된다.
- 가격 작업 담당 채팅: 01a11c85-01a8-7022-a843-dafbdd6140da, 제목 「종합 사주 풀이 가격을 5천원으로 조정」. 읽기 전용 상태 확인 시 담당자가 미러 누락을 조사하고 있었다.
- 해당 채팅에 메시지로 실패 근거를 전달할 사용자 승인 질문을 제출했으나 이 문서 작성 시 답변은 없다. 승인 없이 메시지를 보내지 않았다.

## 재개
- 작업 디렉터리: D:/Development/code-destiny
- 문서: D:/Development/code-destiny/docs/handoff/2026-10-09-yeongnyangi-intake-ci-blocked.md
- 마지막 구현 전달 SHA: 68757ca738dc92ea2926e423c91ab00fdbcd7e1b
- 먼저 사용자 답변을 확인한다. 전달 승인 시 담당 채팅에 위 실패 파일/CI 링크/과거 해금 보존 실패를 전달한다. 공유 main 수정이 전달되면 새 SHA의 CI required와 위 targeted browser 검사만 확인한다.
- 모든 게이트 해결 후 이 문서를 status: done으로 닫는다. 새 상담 UI 개편이나 결제 정책 변경으로 범위를 넓히지 않는다.
- 캡처 보존: C:/Users/user/.codex/visualizations/2026/10/08/01a11c7b-714a-79d3-9d30-9828fc532d17/yeongnyangi-intake/
