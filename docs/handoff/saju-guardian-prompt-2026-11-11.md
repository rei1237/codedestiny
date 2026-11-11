---
status: active
updated: 2026-11-12
next: "2단계 — 무료화 운영 승격 완료 통보를 받은 뒤 origin/main 최신으로 rebase(또는 cherry-pick)하고 재검증·push한다(통보 전 push 금지)."
---

# 사주 가디언: 이미지 생성 → 이미지 프롬프트, 가격 3,000원

## 첫 행동
1. 이 문서의 「단계」에서 체크되지 않은 첫 항목부터 진행한다.
2. 작업 경로는 아래 워크트리다. 메인 체크아웃 `D:\Development\code-destiny`(feat/world-cast-page, 미커밋 변경 다수)는 절대 건드리지 않는다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\saju-guardian-prompt-20261111-215425`
- 브랜치: `wt/saju-guardian-prompt-20261111-215425` (base `bae74a4c1`, 확인 시점 origin/main은 `542fb9b42`로 1커밋 앞)
- 끝난 커밋: `8d4f0a548` feat(guardian) 프롬프트 제공, `893eff4da` copy(guardian) 판매 문구·패널 08/09 숨김, `1d991cace` sitemap 원장, `8b757f577` feat(guardian) 가격 30코인(3,000원) 생년월일별 해금 (아직 push 안 함)
- 검증 결과(가격 변경 전): 가디언·보안 jest 76/76, 결제 관문 77/77, 전체 test:node 4969/0, check:fast·check:worker·verify:app-store-billing-policy·verify:birth-scope-client-mirror·sitemap·seo-entity·repo-hygiene·llms 통과. 390px Playwright 20/20(스크립트: `D:\Development\Temp\claude\ec29f026d20d029c\c8cfa28f-a18d-4e53-8b31-2acc5aa8c80c\scratchpad\guardian-e2e.mjs <worktree> http://localhost:3217 <shotsDir>`; dev 서버는 `PORT=3217 npm run -s dev:next -- -p 3217`, 끝나면 반드시 종료).

## 승인 상태 (원문·날짜)
- 2026-11-11 상세 패널 08·09 숨김, 운영 DB는 조회하지 않음(코드 변경만).
- 2026-11-11 사용자: "회당 가격은 3천원 정도로해주고 사주 무료화 릴리즈에 함께 배포해주면 좋겠다"
  - 가격 30코인(3,000원) 확정. 이 문서의 해석: 「1회 = 생년월일(명식) 1건 구매」. 같은 명식이면 늘 같은 프롬프트라 같은 생년월일 재열람은 무료로 유지(기존 BIRTH 범위 해금 구조 그대로). 생성할 때마다 차감하는 per_use 전환은 하지 않는다 — 최종 보고에 이 해석을 명시.
  - main 병합·push 승인, 사주 무료화 릴리스 운영 승격에 함께 싣는 것 승인.
- 기존 권리: 회수·삭제·전환하지 않는다(사용자 원래 지시). 기존 50코인 구매자는 그대로 해당 생년월일 영구 열람. 과거 주문·영수증 스냅샷(50코인) 수정 금지.
- 운영 DB 쓰기 금지. 새 Google Play 상품(SKU) 생성 금지.

## 작업 규칙과 함정
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- i18n 병합에 `scripts/i18n-merge-authored.mjs --core`를 쓰지 않는다(객체→배열 변환으로 대량 churn). `public/i18n/*.json`은 해당 값만 외과적으로 바꾼다.
- 생성기: `npm run sync:public`(미러·마케팅 문구·상세), `npm run sitemap:generate`, 테스트 전 `npm run fortune:build-data`.
- `verify-public-mirror-fresh`가 Windows 줄바꿈 때문에 free-fortune-policy 4파일에서 거짓 실패한다(기존 문제, 커밋하지 말 것).
- docs 인벤토리(`docs/purchase-journey/inventory.json` 등)는 base에서 이미 낡았다. 재생성 시 수천 줄 churn이므로 손대지 않는다.
- 상세 패널 webp에 "5,000원"이 그림으로 박혀 있으면 그 패널은 새 그림을 만들지 말고 보고한다(숨김 여부는 사용자 결정).
- 공유 main push: 로컬 main에 남의 미push 커밋이 있으면 origin/main 기준 작업 트리에 내 커밋만 cherry-pick해서 push. PR 만들지 않는다. 다른 세션 워크트리(`saju-free-classic-ui-20261111-*`)는 건드리지 않는다.
- 운영 배포는 GitHub 워크플로로만. 무료화 릴리스 담당 문서는 `docs/handoff/saju-free-classic-ui-20261111.md`(origin/main).

## 설계: 가격 변경 범위
- 정본: `worker/lib/paid-feature-registry.js` 319행 `saju-guardian-unlock` cost 50 → 30, 536행 `unlock.saju_guardian` cost 50 → 30. 이 키를 쓰는 다른 가격표(`js/core/service-registry.js`, `lib/saju/saju-service-catalog.mjs`, `scripts/verify-app-store-billing-policy.mjs`, `public/feature-details/*`, `index.html` 15283 `data-price-krw="5000"`·`home.tiles.sajuGuardianPricePrice5000`, `index.html` 28054 근처 `'🔒 영구 해금 '`)를 찾아 맞춘다.
- 화면 문구 `app/saju-guardian/SajuGuardianClient.tsx` 176·187·198·211·1201·364·375·383·396: "5,000원 영구 해금" → 생년월일 1건 3,000원임이 보이게(예: "3,000원 · 생년월일별 해금", "🔒 3,000원으로 해금하기", en도). "영구"는 같은 생년월일 다시 보기 무료라는 뜻으로만 남기거나 빼되 과장하지 않는다.
- Play 결제 매핑이 50코인 전용 SKU(cd_content_tier_*)에 묶여 있으면 30코인에 맞는 기존 티어가 있는지 확인하고, 없으면 멈추고 보고한다.
- 테스트의 50 기대값은 새 판매 경로만 30으로 고친다. 과거 구매·스냅샷 테스트의 50은 그대로.

## 단계
- [x] 0. 이미지 생성 → 프롬프트 전환, 판매 문구, 패널 숨김, 검증 (커밋 3개)
- [x] 1. 가격 30코인(3,000원)으로 변경 + 생성물 재생성 + 테스트(가디언 jest, 결제 관문, check:fast, check:worker, verify:app-store-billing-policy, verify:birth-scope-client-mirror, sitemap, test:node) + 390px 화면에서 가격 문구 확인 → 커밋
  - 결과(2026-11-12): 커밋 `8b757f577`(33파일). 가디언 관련 jest 32스위트 655/655, 이용권·결제 관문 jest 14스위트 399/399, pass-light-status 13/13, check:fast 통과(jest 474스위트 7900 통과·1 skip), check:worker 통과(7900 통과), test:node 4969/0, verify:app-store-billing-policy·verify:birth-scope-client-mirror(41키)·sitemap:check·verify:pass-tier-policy 통과. 390px Playwright: 가격 점검 ALL PASS(`scratchpad\guardian-price-check.mjs <worktree> <base> <shotsDir> unlocked`), guardian-e2e 20/20.
  - 바뀐 곳: 정본 `worker/lib/paid-feature-registry.js` 두 키 50→30, `js/core/service-registry.js`(→ yehwa-home.generated.json), `index.html` 홈 타일 배지·잠금 배지 `'🔒 생년월일별 '`·상세 시트 cost/fallbackCta 2곳(→ public/*/index.html), `SajuGuardianClient.tsx` 문구(ko/en), `public/i18n/*.json` 12개에 새 키 `sajuGuardianPricePrice3000` 추가(옛 Price5000 키는 남김, 지금은 미사용).
  - 연쇄 변경: `worker/lib/profile-limits.js` `MIN_PASS_COVERABLE_COIN`·`FAMILY_MIN_PASS_COVERABLE_COIN` 50→30. `verify:pass-tier-policy`가 "이용권 대상 최저 판매가 = 소진 기준"을 강제하므로, 가디언이 최저가(30)가 되면서 함께 내려야 했다. 효과: 이용권 잔여 예산이 30코인 이상이면 아직 소진 아님(전엔 50). 경계 테스트(pass-exhaustion-repurchase·pass-policy-v2·pass-light-status) 갱신.
  - Play: 30코인은 기존 `cd_content_tier_01`(3,000원) 티어로 해석되어 새 SKU 불필요. 상세 패널 webp에 가격 그림 없음(08·09는 이미 숨김).
  - 확인 한계: 해금 전 /saju-guardian은 /login으로 넘어가서 잠금 화면 문구는 코드로만 확인. Next dev `/`에는 옛 홈 타일이 안 그려져 `/saju` 목록(3,000원)과 정적 index.html 마크업으로 확인.
  - 가디언 아닌 "5,000원 영구 해금" 문구는 그대로 둠: 자미두수(paid-ziwei.src.js), sibyl.lockedCost, payment.permanentUnlock5000.
  - 포트 3217의 next dev(PID 9120)는 이 세션이 띄운 것이 아니라 그대로 둠. 이 세션은 3218을 썼고 종료함.
  - free-fortune-policy 4파일 줄바꿈 거짓 변경은 되돌리고 커밋하지 않음.
- 🔴 순서 조율(2026-11-11, 무료화 릴리스 세션 요청: 사용자 결정 "무료화 먼저, 가디언은 바로 뒤"): 무료화 운영 승격(CI 커밋 70e2b413d)이 끝났다는 통보 전에는 가디언 커밋을 origin/main에 push하지 않는다. 승격 뒤 가디언은 별도 운영 배포로 바로 이어 간다.
- [ ] 2. (무료화 승격 완료 통보 후) origin/main 최신으로 rebase(또는 cherry-pick), 충돌 해결, 재검증, origin/main push, CI 결과 확인
- [ ] 3. 무료화 릴리스 운영 승격 상태 확인: 아직이면 담당 문서에 가디언 포함 사실을 적어 함께 승격되게 하고, 승격 워크플로가 이미 끝났으면 가디언 포함 커밋으로 운영 배포 워크플로 실행(승인됨). 배포 후 운영 `/api/guardian/generate-image` 410·`/image-prompt` 401(비로그인) 확인, 운영 DB 쓰기 없이.
- [ ] 4. 최종 보고(한국어): 가격 해석, 기존 이용자 영향, 후속 과제(order-view-model.ts:99 표기 오류, light-fortune-catalog.js:18 사유, /api/guardian-avatar 죽은 코드, NVIDIA_DRAW_API_KEY 비밀값 정리, 패널 08·09 새 그림, docs 인벤토리, "나의 수호 캐릭터" 사전 누락, public/i18n/en.json:6002 "10,000 KRW", transform-origin 경고)
