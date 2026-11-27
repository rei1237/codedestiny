---
status: in-progress
updated: 2026-11-27
next: 1 — PointsClient "달빛 주문 기록 확인 중" 문구 정리(GREEN)
---

# 결제·이용권 후속 잔여 결함 인수인계

2026-11-26 세션(af219051)이 11/25 결제 후 결과 미표시(A)와 이용권 결제 조회 멈춤·한도(B)를 고쳐 운영 배포했다. 이 문서는 그 세션에서 **보고만 하고 고치지 않은 항목**을 새 세션이 이어서 처리하기 위한 것이다.

## 첫 행동
1. `git branch --show-current`·`git status`·`git fetch origin`. 루트 `D:\Development\code-destiny`는 옆 세션 미커밋 파일이 많고 로컬 main이 origin보다 크게 뒤처져 있다. 루트에서 `reset`·`stash`·`checkout --`를 쓰지 않는다.
2. 쓰는 세션이 둘 이상이면 `scripts/create-safe-worktree.ps1 -Slug payment-leftovers`로 origin/main 기준 워크트리를 만든다. 🔴 D: 여유 공간을 먼저 본다(`Get-PSDrive D`). 11-26에 0.6GB까지 떨어져 typecheck가 ENOSPC로 실패한 적이 있다. 11-27에는 41GB였다. 워크트리 하나가 약 1.25GB다. 부족하면 사용자에게 알리고 기다린다. 옆 세션 워크트리는 지우지 않는다.
3. 아래 "단계"를 위에서부터 진행한다. GREEN 묶음(1~4)은 작은 커밋으로 하나씩, RED(5~7)는 위험·검증·롤백을 먼저 보고한다. "결정 필요"(8~10)는 손대지 말고 사용자에게 추천과 이유를 붙여 묻는다.

## 지금 상태 (2026-11-27)
- 이 세션 마지막 운영 배포: f588a234a7 (run 45764063648). 직전 B 배포는 010fbc596c (run 45746567566).
- 이 문서를 쓸 때(11-27 오전) origin/main은 88e058f367이다. 옆 세션의 사주 신살 작업이 그 위에 올라 있다. 배포 워크플로는 옆 세션이 c95fe1c6b6까지 dispatch했다(모드 미확인). 시작할 때 다시 fetch한다.
- D: 여유 공간은 11-27 기준 41GB로 회복됐다. 그래도 시작할 때 다시 본다.
- 닫힌 인수인계: `docs/handoff/paid-result-delivery-2026-11-26.md`(status: done). 원인·수정 이력은 그 문서에 있다.
- 이 작업용 워크트리·브랜치는 아직 없다.

## 승인 상태
- **운영 배포 승인 없음.** 이 문서의 작업이 끝나면 push(스테이징 아님, main)까지 하고, 운영 승격은 사용자에게 1회 묻는다. 묻기 직전 main에 다른 세션 커밋이 올라와 있으면 그 범위도 함께 알린다.
- 결제 정책 변경, 서버 형식 변경, CI 게이트 추가는 승인받지 않았다.
- 결제 검증은 mock만 쓴다. 실결제, 운영 DB 쓰기, 과금 LLM 호출은 하지 않는다.

## 작업 규칙과 함정 (직전 세션 실측)
- `npm run check:fast`는 미커밋 diff를 본다. 커밋한 뒤에 확인하려면 `--base=<origin/main SHA>`를 준다. `--base` 없이 커밋 후 돌리면 아무것도 검사하지 않는다.
- `app/**`를 고치면 `config/sitemap-lastmod.json` 서명이 바뀐다. `npm run sitemap:generate` 후 같은 작업에 커밋한다(서명만 바뀌는지 diff로 확인).
- `index.html`·`js/**`를 고치면 `npm run sync:public`이 미러 7개와 캐시 핀을 다시 각인한다. 리베이스 뒤에도 다시 돌린다.
- `verify:per-use-never-unlocks`는 `grantOrderEntitlement`의 시그니처 문자열을 그대로 찾는다. 시그니처를 바꾸면 검증기 문자열도 함께 바꾼다.
- `verify:payment-freeze`: 결제 동결 파일을 바꾸면 매니페스트 절차를 따른다.
- 결제 UI를 바꾸면 `paid-gate-auditor` 에이전트로 커밋 전에 감사한다.
- D: 공간이 부족하면 typecheck가 `ENOSPC`로 실패한다. 코드 결함이 아니므로 단독 재실행으로 확인한다.
- 스크린샷은 `visual-checker` 에이전트가 판정한다. 메인 세션에서 직접 Read하지 않는다. 프로세스는 PID로만 종료한다.
- `/checkout` 분기(`app/checkout/CheckoutClient.tsx:152-157`): `draft`가 있으면 YeongnyangiCheckout으로 간다. `params.requestId&&!params.paymentReturn&&getCurrentLoadingLocale()==='ko'&&!isMobileAppRuntime()`이면 SavedConsultationCheckout으로 간다. 나머지(다른 언어, PG 복귀, 앱)는 PreparedCheckoutClient로 간다. 결제 렌더러 3종 정합을 지킨다.
- 옛 브랜드 "달빛"을 분류하는 정규식은 지우지 않는다(`app/_lib/billing-client.ts:2956`, `index.html:25040`). 예전 주문 라벨을 이용권으로 분류하는 데 쓰인다. 화면에 보이는 문구만 고친다.

## 단계

### GREEN (문구·CSS, 하나씩 커밋)
- [ ] 1 `app/points/PointsClient.tsx:2627` "달빛 주문 기록 확인 중" 문구. 확정 명칭은 꿀단지 이용권이고 달빛은 폐기됐다(메모리 brand-and-product-naming-decisions). 예: "이용권 주문 기록 확인 중". 같은 화면의 다른 "달빛" 표시 문구도 `git grep -n "달빛" -- app/points`로 확인한다. 주석·정규식은 제외한다.
- [ ] 2 `/points` "연장하기 →" 버튼 대비 3.3:1(`PointsClient.tsx:2563` 라벨, 버튼 className은 그 위). 본문 크기 기준 4.5:1 이상으로 올린다. sharp 픽셀 측정으로 전후 값을 기록하고, 412·1280에서 확인한다. 같은 버튼의 "구매하기 →"·"다시 구매하기 →" 상태도 함께 본다.
- [ ] 3 `app/components/service-packs/service-pack-copy.ts:91` `flowerFamilyApply` "결제 방식 선택에서 꿀단지 이용권으로 적용할 수 있어요."는 PreparedCheckoutClient에 주 버튼 옆 "보유 꿀단지 적용하기"(B, 216a5665a8)가 생긴 뒤 안내가 어긋난다. 그 화면에서 실제 위치를 가리키게 고친다. 같은 키의 en·ja·zh-CN·zh-TW는 함께 저작하고, 나머지 로케일은 영어 복사 규칙을 따른다(메모리 locale-i18n-pitfalls).
- [ ] 4 결제 대화상자 우상단 베이지 사각형(`js/core/checkout-entry.js:54` `.cd-direct-payment-dialog::after`). `mask:var(--yn-yehwa-mask-branch-spray,var(--cd-yehwa-mask-…))` 변수가 정의되지 않은 화면에서는 마스크 없이 `background:var(--pay-gold)` 72×60 상자가 그대로 칠해진다. 변수가 없으면 장식을 그리지 않게 한다(fallback `none` 또는 `@supports`/조건 클래스). 원인 화면을 먼저 재현한다. 동결 파일이면 freeze 절차를 따르고, `sync:public`으로 핀을 다시 각인한다.

### RED (위험·검증·롤백 선보고)
- [ ] 5 클라이언트 `resolveVerdict`(`js/core/pass-verdict.js`)가 판매 종료 키를 낙관적으로 "이용권 적용 가능"으로 판정한다. 서버 `guardSaleClosedEntry`가 막아 이중 과금은 없지만, 화면이 적용 가능으로 보였다가 거절된다. 서버 판정과 맞춘다. 검증: `__tests__/worker/pass-coverage-matrix.test.js`에 판매 종료 키 케이스를 추가하고 `verify:billing-pass-policy`·`verify:pass-tier-policy`를 돌린다.
- [ ] 6 웹훅 취소 뒤에도 주문의 `rawPortOne.status`가 'paid'로 남는다(직전 세션 관찰, 운영 읽기 전용). 표시·감사 스크립트가 이 값을 믿으면 오판한다. 먼저 `worker/payments`에서 Transaction.Cancelled 처리가 rawPortOne을 갱신하는지 읽고, 읽는 쪽이 있는지 `git grep -n "rawPortOne.status"`로 확인한 뒤 수정 범위를 보고한다. DB 수선은 별도 승인 없이 하지 않는다.
- [ ] 7 CI "Yeongnyangi Browser Shadow"(`.github/workflows/yeongnyangi-browser-shadow.yml`)가 2026-11-25부터 main의 모든 커밋에서 실패한다. 단계 "Run browser acceptance matrix"에서 `locator.click: Timeout 30000ms exceeded`가 난다. shadow라 배포를 막지 않는다. 🟡 11-27 확인 결과 최근 2회(134fac2901, 3ccc5c3049)는 success였고 9a5fb969fe가 마지막 failure다. 먼저 최근 5회를 다시 보고, 계속 통과하면 "옆 세션이 해소"로 기록하고 닫는다. 실패가 다시 나면 `gh run list --workflow "Yeongnyangi Browser Shadow" --limit 10`으로 처음 실패한 커밋을 찾고, 로그의 locator를 확인해 제품 회귀인지 테스트가 낡은 것인지 판정한다. 제품 회귀면 원인 커밋을 보고하고 되돌리기를 제안한다.

### 결정 필요 (손대지 말고 추천과 이유를 붙여 묻는다)
- [ ] 8 SoulCat(영냥이) 결제 requestId. 서버는 `yn-<64hex>`이면서 소유자의 YeongnyangiRequest가 있어야 받는다. 클라이언트만으로는 맞출 수 없어 서버·요청 소유 설계 결정이 필요하다. 안: (a) 결제 전에 서버가 요청을 만들고 id를 돌려준다, (b) 서버가 SoulCat 전용 형식을 허용한다.
- [ ] 9 `/records/`에 라이트 사주 묶음(정적 해금, `saju_lifetime_bundle`)이 목록으로 나오지 않는다. 지금 재열람 통로는 홈 카드와 사주 결과뿐이다. 보관함 노출 여부는 `docs/context/library-preservation.md` 정책과 함께 결정한다.
- [ ] 10 CI 깊은 트리거 공백: `app/checkout/CheckoutClient.tsx`, `js/destiny-profile.js`, `worker/lib/profile-limits.js` 변경이 결제 게이트 CI를 깊게 돌리지 않는다. 메모리 ci-gates-scope는 지시 없이 게이트를 추가하지 말라고 한다. 사용자에게 추가 여부를 묻는다.

### 관찰 (선택, 사용자가 원할 때만)
- 묶음 보유자가 다시 들어오면 결과가 맨 위에서 열린다. 라이트 사주 섹션은 약 6000px 아래에 있다.
- 접근 상태가 수화되기 전에 클릭하면 묶음 결제 패널이 잠깐 뜬다. 서버가 already_unlocked로 처리해 과금은 없다.
- D: 디스크: 11-26에 옆 세션 워크트리 `android-1060-20261112-005825`(약 7GB), `android-internal-play-20261122-080050`(약 6.4GB), `naver-intent-seo-20261122-003824`(약 4.4GB)가 공간을 크게 차지했다. 11-27에는 41GB로 회복됐다. 다시 부족해지면 사용자에게 보고만 한다.

### 마무리
- [ ] 단계마다 check:fast → 커밋. 끝나면 `npm run check:pre-push` → `git push origin HEAD:main` → main CI 1회 확인 → 운영 승격 여부를 사용자에게 묻는다.
- [ ] 이 문서의 체크박스와 결과를 갱신해 `status: done`으로 닫는다. 자기 워크트리는 다른 체크아웃에서 `npm run worktree:remove -- <경로>`로 배수하고, `.tmp/`·스크래치는 지운다.
