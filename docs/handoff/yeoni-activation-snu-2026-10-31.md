---
status: blocked
updated: 2026-10-31
workspace: D:/Development/code-destiny/.codex-worktrees/activation-rewards-20261031-145450
branch: wt/activation-rewards-20261031-145450
---

# 연이 튜토리얼·전환 보상·SNU 해금

사용자 승인 방향을 구현했다. 새 꽃돼지 연이 그림, 무료 사주→월정석 안내, 상담 후 추천/후기 팝업, 첫 단건 유료 상담 완료 500개/30일, 무료 사주 완료 500개/30일(기존 가입 보상 수령자 제외), 학교 메일함 확인 후 본인 출생정보 하나에 비 LLM 사주 콘텐츠 10종 해금이다. 할인 쿠폰은 구현하지 않았다. 가격·이용권·기존 잔액·만료일·구매 증빙·후기 승인 보상 정본은 보존한다. 첫 구매 보상은 단건 현금 결제와 전달 증빙이 모두 있는 경우에 한하며 이용권·선물·무료·월정석만 사용은 제외한다.

## 전달 차단

이전 실패 main: 06a18ac7133026ac6cbba08ea64c2e309492e3b7. 기존 PR CI 실패: https://github.com/rei1237/codedestiny/actions/runs/41177515266
- Build Pages and Worker: fortune-service-selection-guide 제목 표시 폭 82 > 60.
- Static guards: verify-editorial-manuscripts, 검수 원고 수 27 != 32.
현재 main 수정 63e86a034b8b9e749d9a91e529e8349d61cc542e를 로컬 통합했다. 마지막 확인 시 해당 main CI 41179244541은 in_progress였다: https://github.com/rei1237/codedestiny/actions/runs/41179244541 . 완료 성공을 확인하기 전에는 새 기능을 push하지 않는다.
통합 후 targeted Jest 91/91, client race 2/2, TypeScript, worker dry-run, payment-freeze, JS module graph를 다시 확인했다. 월정석 지급 후 안내 잔액도 새로 조회한다.

사용자 AGENTS.md의 기존 main이 red이면 그 위에 새 변경을 push하지 않는 규칙 때문에 이 기능은 push하지 않았다. 무관한 SEO 원고와 다른 세션의 main 미커밋 수정은 건드리지 않았다.

main 체크아웃(C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530)에는 다른 세션의 미커밋 변경이 있다. 원본 D:/Development/code-destiny도 다른 세션이 사용 중인 feature checkout이다. reset/stash/checkout으로 정리하지 않는다.

## 검증

- 7개 targeted Jest 파일 91/91 통과: activation-rewards, snu-campus, activation-rewards-route, content-unlock-duplicate-key, review-eligibility, auth.withdraw, auth.signup-phone-backfill.
- node --test __tests__/ui/activation-entry.test.mjs: 2/2 통과. 무료 사주 완료가 인증 상태보다 빠른 경우와 로그아웃 후 지연 응답 차단.
- node ./node_modules/typescript/bin/tsc --noEmit --pretty false 통과.
- scoped ESLint 오류 0. /ggulggul/은 legacy 문서 전체 이동이 필요해 원래 a 링크를 유지하며 경고가 있다.
- verify-payment-freeze 통과(region 4 / file 3 / cap 2), verify-worker-no-undef 통과.
- sync:public 및 i18n 정본 병합 실행, public parity 통과. 통합 후 sitemap:generate 실행(1037 URLs, 사주 안내/학교 혜택 경로는 noindex로 제외). Worker dry-run 빌드 통과(gzip 5767.58 KiB). 첫 check:pre-push는 lastmod 원장 drift로 중단돼 정본 생성기로 보정했다.
- 실제 신규 경로 /onboarding/, /snu/ 10상태를 가상 API로 확인: 360/390/430/1280px, 그림 로딩·가로 넘침 없음, 수령·기존 수령자·학교 확인 요청·프로필 해금·비회원 확인. 당시 브라우저 오류 0.
- 상담 후 실제 ResultBenefits 컴포넌트: 360/1280px 팝업 표시, Esc 닫기, 포커스 복귀, 다시 열기·버튼 닫기 통과.
- 기존 first-visit-guide 실제 모듈·CSS: 360/1280px 새 그림, 월정석 장면·링크·Esc 통과.
- 마지막 Next 개발 화면 캡처 재실행에는 Next loadManifest JSON 읽기 오류 1건이 있었다. 앱 코드와 분리된 개발 manifest 오류이며 운영/CI 렌더링 증거로 확대하지 않는다.
- check:fast -- --plan 확인. check:fast는 critical 자동 승격 후 큰 paid-gate suite 도중 중단되어 전체 통과가 아니다. CI 전체와 운영 검증은 미실행이다.

## 운영 경계

실 LLM·결제·운영 DB 지급·인증 메일 발송·운영 배포·SNULIFE 외부 답신은 하지 않았다. mock에서 실제 연동 폴백은 없다. 학교 인증 토큰은 해시로 저장하며 만료 20분, 60초/일5회 제한, 이메일 해시 _id로 재가입 중복을 막는다. 기존 해금은 insertOnly로 보존한다. 탈퇴 시 이메일/토큰/출생·프로필 연결을 비식별화한다. 신규 권리/보상에 TTL 삭제를 두지 않는다. 되돌리기는 기능 커밋만 revert하고 기존 지급 결과/권리를 자동 삭제하지 않는다.

## 이어서 할 일

1. 기존 main CI 책임 변경이 복구됐는지 확인한다. 이 작업에 SEO 수정을 섞거나 검사를 낮추지 않는다.
2. 이 작업 커밋의 check:pre-push 결과를 최종 보고/상태 파일에서 확인한다.
3. 최신 origin/main과 안전하게 통합하고 충돌은 정본(source)을 보존한 뒤 i18n/sync 생성기를 다시 돌린다. 다른 세션 main dirty 파일은 보존한다.
4. 필요한 targeted 검사 후 main에 전달하고 공식 CI를 한 번 확인한다. 실패나 진행 중을 성공으로 보고하지 않는다.
5. 운영 승격은 별도 명시 승인 후 진행하고 학교 메일 전달·본인 프로필 해금·기존 결과 보존을 확인한다. 실 LLM 검수는 횟수를 따로 승인받는다. 준비 완료 후 SNULIFE 답신 초안을 갱신하고 제출 자료를 보낸다.
6. 통합 완료 후 이 문서를 done으로 닫고 자신의 워크트리만 배수한다.

## 산출물

- D:/Development/code-destiny/outputs/snulife-partnership-20261031/: 최신 campaign-plan.txt, posting-copy.txt, reply-after-readiness-draft.txt, snulife-yeoni-saju-final-1500x1200.png, yeoni-tutorial-first-steps-1800x600.webp. 이전 고등어/쿠폰 시안은 사용하지 않는다.
- D:/Development/code-destiny/outputs/activation-ux-20261031/: 가상 브라우저 증거/스크린샷.
- public/assets/marketing/snulife/ 및 public/assets/yeoni/onboarding/: 최적화한 실제 서비스 이미지와 생성 출처.

## 현재 소유 변경

별도 안전 워크트리에서 생성한 이 작업 변경만 있다.

```text
 M .ignore
 M __tests__/worker/auth.signup-phone-backfill.test.js
 M __tests__/worker/auth.withdraw.test.js
 M __tests__/worker/content-unlock-duplicate-key.test.js
 M __tests__/worker/review-eligibility.test.js
 M app/components/auth/AuthShell.tsx
 M app/fortune-chat/ConsultationResult.tsx
 M app/layout.js
 M app/yeongnyangi/_components/Result.tsx
 M docs/context/payment-gating.md
 M i18n/authored/homeFollowup-01.json
 M index.html
 M js/core/first-visit-guide.mjs
 M js/core/signup-benefit-policy.mjs
 M js/first-visit-copy.mjs
 M js/review-reward-invite.mjs
 M js/signup-benefit-exit.js
 M public/en/index.html
 M public/ggulggul/index.html
 M public/i18n/de.json
 M public/i18n/en.json
 M public/i18n/es.json
 M public/i18n/fr.json
 M public/i18n/hi.json
 M public/i18n/ja.json
 M public/i18n/ko.json
 M public/i18n/ms.json
 M public/i18n/nl.json
 M public/i18n/vi.json
 M public/i18n/zh-cn.json
 M public/i18n/zh-tw.json
 M public/index.html
 M public/ja/index.html
 M public/js/core/first-visit-guide.mjs
 M public/js/core/signup-benefit-policy.mjs
 M public/js/first-visit-copy.mjs
 M public/js/review-reward-invite.mjs
 M public/js/signup-benefit-exit.js
 M public/static/index.html
 M public/styles/guide-primitives.css
 M public/zh-tw/index.html
 M public/zh/index.html
 M styles/guide-primitives.css
 M worker/index.js
 M worker/lib/content-unlocks.js
 M worker/lib/models.js
 M worker/lib/review-eligibility.js
 M worker/routes/auth.js
?? __tests__/ui/activation-entry.test.mjs
?? __tests__/worker/activation-rewards-route.test.js
?? __tests__/worker/activation-rewards.test.js
?? __tests__/worker/snu-campus.test.js
?? app/components/activation/
?? app/onboarding/
?? app/snu/
?? js/activation-entry.mjs
?? js/core/activation-reward-policy.mjs
?? js/core/snu-campus-policy.mjs
?? public/assets/marketing/
?? public/assets/yeoni/onboarding/
?? public/js/activation-entry.mjs
?? public/js/core/activation-reward-policy.mjs
?? public/js/core/snu-campus-policy.mjs
?? public/styles/activation-entry.css
?? styles/activation-entry.css
?? worker/lib/activation-reward-models.js
?? worker/lib/activation-rewards.js
?? worker/lib/snu-campus.js
?? worker/routes/activation-rewards.js
```
