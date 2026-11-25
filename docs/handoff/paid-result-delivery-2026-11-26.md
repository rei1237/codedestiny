---
status: in-progress
updated: 2026-11-26
next: A-3 — check:critical(감사 권고) → fetch·rebase origin/main(충돌 시 미러는 sync:public, 사이트맵은 sitemap:generate 재생성) → check:pre-push → push → CI 1회 → 운영 dispatch → 스모크
---

# 11/25 결제 후 결과 미표시(A) + 이용권 결제 조회 멈춤·한도(B) 인수인계

## 첫 행동
1. `cd D:\Development\codedestiny-worktrees\paid-result-delivery-20261126-044518` (워크트리. 루트 `D:\Development\code-destiny`는 옆 세션 미커밋 122파일 — 절대 손대지 않는다)
2. 계획 정본: `C:\Users\user\.claude\plans\11-25-atomic-curry-of-af219051-889d-4fa9-a7c1-1c79d8182da2.md` (A 단계 + "후속 B" 절). 상태 파일: `d:\Development\code-destiny\.claude\state\af219051.md`
3. mock dev 서버가 `http://127.0.0.1:14182`(API mock 14183)에서 돌고 있을 수 있다(`npm run dev`, 로그 `.tmp/dev-mock.log`). 안 돌면 워크트리에서 `npm run dev` 백그라운드로 다시 띄운다. 끌 때는 PID로만(`taskkill /IM` 금지).

## 지금 상태
- 브랜치 `wt/paid-result-delivery-20261126-044518`, base origin/main 4b2617e036. 이 문서 커밋 직전 커밋 = 수정 1(index.html+미러 7) + 테스트(WIP, 실화면 미검증).
- 미러 7개(public/{en,ggulggul,ja,static,zh-tw,zh}/index.html, public/index.html)는 `npm run sync:public`로 생성됨.

## 승인 상태 (사용자 원문, 2026-11-26)
- A: "확실하게 모든 유료 기능 결제 후 결과가 제공되도록 수정해 그 이후에 검증 후 운영에 반영해줘" → **운영 배포 승인**: `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`. 단 dispatch 직전 origin/main에 이 작업 외 다른 세션 커밋이 올라왔으면 범위를 사용자에게 다시 묻는다.
- "cda861fc171acad238e8a13a9816ffab5ddb8e52가 라이트 사주 풀이 결제한 사람 결제 번호인데 다시 들어가면 복구가 잘되어있도록 해줘"
- B: "그리고 중간 꿀단지 등 이용권 구매 후 결제 조회가 멈췄다고 하는데 이용권 구매 후 딱 설정된 이용권 한도와 금액 상한에 맞게 모든 서비스 가격에 맞게 이용 가능하도록 확실하게 수정해서 운영 배포해주는 것을 후속으로 진행해줘" → B도 운영 배포 승인(별도 커밋·별도 배포, A 먼저).
- 추가: "그 외에도 중간 꿀단지가 안된다고 하니까 만원 이하 유료 서비스 중에서 이용권으로 안되는 기능이 있는지 확인해줘 운명 찻집이나 영냥이 고등어 이런것들이 되겠지" + "그 이후에 고쳐줘" → 조사 완료(아래 B-0), 결함 수정까지 승인.
- 계획 승인 = 11/25 결제 **운영 DB 읽기 전용** 조회 승인(해시 식별자만 출력). 운영 DB 쓰기·수동 지급·환불은 별도 승인 필요 → 필요하면 멈추고 묻는다.
- 이용권 중복·상향 규칙이 `docs/context/payment-gating.md`에 없으면 정책 결정이므로 묻는다.

## 작업 규칙과 함정
- RED(결제). 실결제·실 LLM 금지, 검증은 mock. 비밀값·PII 출력 금지.
- 검증: `npm run check:fast`(critical 자동 승격) 1회, `paid-gate-auditor` 에이전트, payment-freeze 매니페스트(필요 시 `--update`). 커밋 후 `npm run check:pre-push` → `git push origin HEAD:main`(먼저 `git fetch && git rebase origin/main`, 충돌 시 미러는 `npm run sync:public` 재생성) → main CI 1회 확인(sleep 루프 금지) → 운영 dispatch → 읽기 전용 스모크.
- 이미지는 메인에서 Read 금지 → `visual-checker` 에이전트로 판정. 412px·1280px.
- Bash 도구는 백슬래시 한 겹을 먹는다 → 이스케이프는 Edit 도구로. index.html·테스트는 LF.
- index.html 안 `tryUnlockFeature`, `_cdOpenSajuSectionAfterUnlock` 등은 **클로저 내부**라 `window.`로 덮어쓸 수 없다(덮어써도 무효 — 한 번 오진함).

## A 설계 (구현 완료, 미검증)
- 원인(실측): 홈 패널 결제 성공 뒤 `tryUnlockFeature`가 `_cdScrollUnlockedSectionIntoView`만 불러 묶음 키(`saju_lifetime_bundle`)는 대상이 없고 홈엔 사주 결과가 없음 → 결과 안 열림.
- 수정: `index.html` ≈30922 `_cdOpenSajuSectionAfterUnlock(featureKey, contentKey, payload)` → `_cdBuildSajuSectionUnlockResume` + `_cdRunSajuSectionUnlockResume`(≈30868, `dpRunWithProfile` 재계산 후 #summaryGate로 이동). 실패 시 기존 스크롤 폴백. `tryUnlockFeature` 성공 분기 6곳 교체. 이미 보유 분기는 `alreadyOwned`로 낙관 기록 생략.
- 수정 2(per-use 단건 resume)는 불필요(실측: 도달 유료 action 없음).
- 테스트 `__tests__/ui/saju-section-unlock-resume.behavior.test.js` `node --test` 16/16.
- 11/25 전수(5건): 10:53 신년AI상담 delivered / 17:48 premium_1m_v5 34,900 / 20:21 standard_1m_v5 14,900(신고자) / 21:12 묶음 cancelled(신고자) / 21:15 묶음 29,000 PAID=cda861(신고자, BIRTH ACTIVE). 고아·정체 0 → A는 DB 수선 불필요. 서버는 보유자에 결제 전 already_unlocked → 재진입 이중 과금 없음.

## A 실화면 실측 (2026-11-26, `.tmp/light-saju-pay.mjs <origin> buy|owned <width>`)
- 홈 라이트 사주 카드는 "마이" 시트(`#cdAccountSheet`) 안 접힌 `details.my-fortune-guide` 안에 있다(index.html:8943, 8973). 스크립트가 시트 열기→details 펼치기 처리함.
- 단건 카드는 환불 동의 체크박스(`[data-refund-consent-input]`) 체크 전 disabled(checkout-entry.js:611-645, 의도). 그다음 결제수단 2단계 `[data-pay-method="CARD"]`.
- 스크립트는 `window._cdRunDirectKrwCheckout`을 페이지에서 스텁 — 스텁은 **호출됨**(trace `stub-called`).
- 🔴 스텁 호출 직후: **수정본은 Page crashed**(2회), **베이스라인(HEAD 파일)은 크래시는 없지만 메인 스레드가 정체**(`waitForFunction` 15s 타임아웃, `window.__cdStubCheckoutOpts` 확인 불가). `window.dpRunWithProfile` 래퍼에는 호출 기록이 없었다. → 결제 성공 처리 경로 어딘가의 무한 루프/폭주가 베이스라인에도 있을 가능성(실제 운영 버그일 수도, mock 응답 형태 탓일 수도). 수정본이 이를 크래시로 키우는지 판정 필요.
  - 다음 시도: CDP `Debugger.enable` 후 클릭 2.5s·4s·5.5s 뒤 `Debugger.pause`로 콜스택 채집(스크립트에 코드 있음, 마지막 실행은 출력이 비어 원인 미확인 — 스크립트 전체 출력부터 본다). 또는 `Profiler.start/stop`.
  - 후보: 성공 뒤 `_cdUpdatePaidFeatureGate(paymentSuccess)`·`cd:unlocks-changed` ↔ access-store reconcile 핑퐁, mock `/api/billing/unlock-status`·`/api/me/access-state` 응답 형태.
- owned 모드(신고자 재진입 재현): `ownedBefore true`인데 카드 클릭 뒤 `privacy-modal-overlay`(개인정보 동의)가 뜨고 마지막 `isTileKeyUnlocked` false, 결과 섹션 top 6281(화면 밖). mock 프로필에 동의 플래그가 없어서인지, 실제 재진입 결함인지 판정 필요(실사용자는 동의 완료 상태일 가능성 높음 — 추정).

## A-1 결과 (2026-11-26, 완료)
- 🔴 원인(실측, **운영 결함**, 베이스라인도 동일): 모바일 지연 마운트 `wrapMethod`(index.html ≈39357)가 `window.__cdPaidFeatureGate.open/update/preload`를 감싸면 `_cdForwardPaidFeatureGateToReact`(≈25218)의 `bridge.open === _cdOpenPaidFeatureGate` 동일성 검사가 깨져, 셸 update/holdOpen/release → forward → 감싼 셸 update 로 무한 재귀. 412px에서 결제 성공 직후 메인 스레드 정체(베이스라인)·탭 크래시(수정 1 뒤 호출이 늘어 크래시로 커짐). 약 2026-07-02부터 잠복.
  - 근거: CDP 브레이크 트레이스 335회, 스택 `wrapped:41139 < forward:27009 < update:27125` 반복. `.tmp/light-saju-probe.mjs` 412: 수정 전 update 1회가 20s+ 정체 → 수정 후 재진입 1회·104ms.
- 수정 **34effaf1f7**: 셸 브리지 객체에 `__cdShellPaidFeatureGate: true` 표식, forward 는 표식 또는 동일성일 때 false. index.html + 미러 7. 테스트 `__tests__/ui/paid-gate-bridge-reentry.behavior.test.js` `node --test` 2/2(표식 제거 변이 시 1 fail 확인).
- mock 산출물(코드 결함 아님, 스크립트만 수정): ① "개인정보 동의 모달"은 오버레이 필터 오탐(실제 `aria-hidden` true·`.show` 없음, hasLogin true·privacyAgreed "true") ② mock 성별 'female' → 실제 API 형태 'F' + `birth{}` 객체(아니면 `profilesReferToSameBirth` 불일치로 2.6s 뒤 scope id '' → 생년 해금 제거) ③ 서버의 묶음 멤버 키 확장(`SAJU_BUNDLE_ALIAS_MEMBER_KEYS`) 누락 ④ `/api/saju/section` 미모킹(501 → "풀이를 불러오지 못했어요"). 일주·십성·조후·억부·절기 풀이 오류 문구도 미모킹 API 탓.
- 실화면 최종(`.tmp/light-saju-pay.mjs`, 판정에 #summaryGate 안 목업 본문 배달·오류 0 포함): buy 412 PASS, buy 1280 PASS(1회 체크박스 클릭 타이밍 플레이크 → 재실행 PASS), owned 412 PASS, owned 1280 PASS. errors [] 전부.
- visual-checker: buy-412/1280-5-result 통과(잠금 해제 배지 + 목업 본문, 오버레이·오류 없음), owned-*-5-result 통과(결과 페이지, 결제 패널·모달 없음), 2-panel·4-method 통과.
- 범위 밖 관찰(보고만, 미수정):
  1. 보유자 재진입(bundle-offer.js:392 `cdOneStepFreeSajuEntry()` 인자 없음)은 결과 **맨 위**로 열린다 — 라이트 사주 본문은 약 6000px 아래.
  2. access 수화 전(`/api/me/access-state` 호출 전) 클릭하면 보유자에게도 묶음 결제 패널이 뜬다. 결제를 눌러도 서버가 차감 전 `already_unlocked`(billing.js:3737-3902) → 이중 과금 없음. UX만 나쁨(계획 4단계의 `cd:unlocks-changed` 대기 최소 수정 후보).
  3. 결제 선택 대화창 우상단 72×60 평면 베이지 사각형: `js/core/checkout-entry.js:54` `.cd-direct-payment-dialog::after` 장식의 `mask: var(--yn-…, var(--cd-yehwa-mask-branch-spray))` — 변수가 `styles/yehwa-motifs.css` 에서 `.cdh, .cd-yehwa-scope …` 범위에만 정의돼 모달에서 마스크가 무효 → 사각형으로 칠해짐(추정, 412·1280 재현). 기존 결함.
  4. 결과 페이지 "내 사주를 더 깊게 읽기" 안내 카드(index.html ≈18556, 정적)가 보유자에게도 "한 번 결제로 영구 소장해요"를 보인다. 1280에서 "소장해/요." 줄바꿈(keep-all 누락 추정).
  5. 섹션 제목 분홍 #FF8BA7/흰 배경 2.21:1(기존 토큰).

## A-2 결과 (2026-11-26, 완료)
- payment-freeze: `node scripts/verify-payment-freeze.mjs` 통과(region 4 · file 3 · cap 2), `--update` 불필요.
- paid-gate-auditor(diff vs 4b2617e036): **PASS, 차단 없음**. 렌더러·동결 구역 미변경, 금지 패턴 없음, 이중 과금·무권리 개방·비보유자 노출 없음. 실행한 verify 15종 + node 테스트 5파일 50/50 통과.
  - 메모 1: `_cdRunSajuSectionUnlockResume`(index.html ≈30898)의 낙관 재기록은 섹션·묶음 키가 단건 전용이라 도달 불가. 이용권 구매 가능한 키가 추가되면 두 번째 finalize 를 건너뛰게 후속 처리.
  - 메모 2: 결제 성공 경로가 바뀌었는데 deepRequired false → **A-3 push 전에 `npm run check:critical` 1회 권고**.
- check:fast(`--base=4b2617e036`, critical 자동 승격): 통과(exit 0, 2회차 07:14→08:05). 1회차는 verify:sitemap-drift 차단 → f82e5443ba 로 해소, 2회차 직전 1회차 test:node 5848/1 은 `__tests__/ui/talisman-locale.test.js:110` 부하 타이밍 플레이크(diff 밖 파일, 단독 3/3 통과). 2회차: test:node 5849/0, test:jest 493 스위트·8631 pass·1 skip, build:worker·verify:entry-encoding 등 전 단계 통과.
  - 1차는 `verify:sitemap-drift` 차단 — 셸 5라우트(/ggulggul/·/en/·/ja/·/zh/·/zh-tw/) 서명 변경(이 index.html 수정) + KST 날짜 롤링. `npm run sitemap:generate` 재생성 커밋 **f82e5443ba**. A-3 rebase 뒤 다시 드리프트하면 같은 방식으로 재생성.
  - 주의: `npm run check:fast` 인자 없이는 "작업 트리 = HEAD"라 아무것도 안 돈다. 커밋된 워크트리는 `-- --base=4b2617e036` 필수.

## B-0 조사 결과 (서브에이전트, 코드 읽기)
- 서버 판정상 premium(중간 꿀단지, 상한 100코인)은 100코인 이하 건당·해금 항목을 모두 통과: 운명 찻집 tarot/tarot-five(50/70)·saju/saju-compat/sukuyo-compat(100) 정상, joint(150)는 상한 초과로 의도. 영냥이 고등어(`yeongnyangi-*-mackerel` 6종, 100) direct_or_pass로 정상(테스트 `__tests__/ui/pass-fish-coverage.test.mjs:7`). fusion=family 전용, profile-card-manage=passExcluded, 묶음·판매종료=direct_only, 이메일 상담=direct_only — 전부 문서상 의도(payment-gating.md 27, 240, 408, 11-05 절).
- 신고자가 산 것은 **standard**(20:21)일 수 있음 → 상한 50이라 고등어·100코인 상담 미적용은 정책상 정상. DB로 신고자 entitlement tier 확인 필수.
- 결함:
  1. [유력·추정] 이용권 지급/확인 멈춤: `app/points/PointsClient.tsx:397-409, 3586-3607, 4060-4069, 4146-4192, 4476-4485`(425 자동 재확인 없음, 422 PG_PAYMENT_NOT_PAID에 대기 기록 폐기, 부팅 재시도 15분 한정), `worker/payments/index.js:695-820, 994-1034`(지급 실패를 200 GRANT_PENDING으로 삼킴; DOWNGRADE_BLOCKED·PASS_POLICY_CONFLICT `passes.js:254-319`, CAS×3, PLAN_NOT_FOUND).
  2. [실측] 영냥이 SoulCat 진입: `app/checkout/CheckoutClient.tsx:305-307`이 requestId 없을 때 `yn-soulcat-${featureKey}-${slug}` 생성 → 서버 `worker/lib/pass-consumption.js:229-230` `^[a-f0-9]{64}$`만 허용 → 이용권 적용 422. 외부 SoulCat 진입(page.tsx:7)만 해당.
  3. [실측] 낡은 표: `worker/lib/profile-limits.js:106-111`(vvip 200), `:145-150`(300/1000/2000/5000), `js/core/pass-verdict.js:57,61`, `index.html:14018` freeLimits. 활성 v4/v5는 정본 경유라 영향은 레거시 폴백 표시뿐.
  4. [UX] 영냥이 결제창 "보유 꿀단지 적용하기"(CheckoutClient.tsx:390)가 접힌 `<details>`(382-403) 안 — 이용권이 커버하면 주 버튼 옆 노출은 **사용자 결정 필요**(묻지 말고 보고에 선택지로).
  5. CheckoutClient.tsx:4-17 헤더 주석 "Family 이용권만"은 낡음(direct_or_pass).

## 단계
- [x] A 조사·수정 1·테스트
- [x] A-1 실화면: 결제 직후 정체/크래시 원인 판정 → 수정본이 원인이면 원인 지점 수정(덧대지 말고), 베이스라인 결함이면 같이 고칠지 판단(실사용 영향 있으면 A 범위 — "모든 유료 기능 결제 후 결과 제공"). buy 412/1280, owned 412/1280 통과 + visual-checker 판정.
- [x] A-2 check:fast, paid-gate-auditor, payment-freeze (결과는 위 A-2 절)
- [ ] A-3 커밋 정리 → rebase origin/main → check:pre-push → push → CI 1회 → 운영 dispatch → 스모크
- [ ] B-1 운영 DB 읽기 전용: 17:48 premium·20:21 standard 주문 status, 사용자 `lastPassOrderId`/`passGrantOrderIds` 포함 여부, 현재 tier·잔여 한도, 지급 실패 사유(스크립트는 워크트리 `.tmp/`에 커밋 안 되는 파일로; 참고 `.tmp/survey-1125.mjs`, find+projection만, fetch 차단, 해시 출력). 지급 누락이면 수동 쓰기 금지 → 고친 confirm 재실행 경로로 복구되게 하고, 안 되면 멈추고 승인 요청.
- [ ] B-2 클라이언트: PointsClient GRANT_PENDING·직후 422를 "확인 중"으로, 3→5→10→20s 백오프 약 2분 자동 재확인, 대기 기록 24h, 확정은 성공/명확 실패만.
- [ ] B-3 서버: 지급 실패 사유 코드 응답·로그. B-1에서 확인된 사유만 문서 규칙대로 수정.
- [ ] B-4 SoulCat requestId 정합(CheckoutClient 쪽에서 64hex 생성이 최소 — 서버 형식 완화보다 우선), 낡은 표 4곳 정본 파생, CheckoutClient 헤더 주석 정정.
- [ ] B-5 매트릭스 테스트(전 유료 featureKey × 4 tier, 클라 pass-verdict == 서버 evaluatePassCoverage, 한도 소진·잔여 부족 포함) + grant-pending 테스트 보강 + 기존 pass 테스트·verify 실행.
- [ ] B-6 check:fast, auditor, freeze, mock `/points` 실화면 412·1280.
- [ ] B-7 커밋(클라/서버/표·테스트 분리) → push → CI → 운영 dispatch → 스모크.
- [ ] 정리: dev 서버 PID 종료, 다른 체크아웃(루트 말고 별도 경로에서도 되면 그곳)에서 `npm run worktree:remove -- 'D:\Development\codedestiny-worktrees\paid-result-delivery-20261126-044518'`, `.tmp/survey-1125.mjs`·`.tmp/dev-mock.log`·`.tmp/light-saju*`·`.tmp/mine/`·`.tmp/run-noopen.txt` 삭제, 스크래치패드 `D:\Development\Temp\claude\40e1d9fc07e84b89\af219051-889d-4fa9-a7c1-1c79d8182da2\scratchpad\` 의 survey-1125.mjs·orphans.json·health.json·survey.json·fixtest.js 삭제, 이 문서 `status: done`, 상태 파일 닫기.
- 최종 보고(한국어): 조사표, A 원인·수정, 수정 2 불필요 근거, cda861 재진입 안전, B 결과, 10,000원 이하 이용권 적용 표, 남은 위험(`/records/`에 라이트 사주 미노출, 영냥이 이용권 버튼 노출은 사용자 결정).
