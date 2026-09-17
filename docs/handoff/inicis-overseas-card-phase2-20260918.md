---
status: in-progress
updated: 2026-09-18
next: 이 워크트리(wt/inicis-overseas-card-p2-20260918-044006)는 아직 main 에 안 들어갔다 — 아래 "재개 절차"의 머지·push 를 먼저 끝내고, 그 다음 2단계 잔여(영문 결제정보 + 서버측 환불 동의 기록)를 새 세션에서 시작한다
---

# KG이니시스 해외카드 특약 대비 — 2단계 ②③ (결제창 정책 링크·영문 결제 문의 진입점)

권장: 주력 모델(Opus 5) / effort max. 🔴 RED(결제창 마크업·12개 로케일 사전·동결 파일·캐시 핀)이고, 계획과 RED 사전 보고는 이미 사용자 승인을 받았다("승인할테니 진행해", 2026-09-18).

1단계 문서: [inicis-overseas-card-phase1.md](inicis-overseas-card-phase1.md). 원 요청은 그 문서의 프론트매터 `next` 가 가리킨 2단계다.

## 왜

1단계는 "없는 기능을 없다고 적는" 데까지였다. 2단계는 그중 UI 로 메울 수 있는 것을 메운다. 해외 고객이 결제창에서 약관·환불 규정·개인정보 처리방침·문의처에 **자기 언어로** 닿지 못하면 전자상거래법 표시 의무와 PG 심사 8번 문항(해외 고객 CS)이 동시에 비어 있다.

## 범위 — 3축 중 2축만 했다

사용자 승인 시점에 범위를 잘랐다. 한 세션에 한 작업이 원칙이고, ①은 화면 4곳·문자열 수십 개짜리 별건이다.

| 축 | 이번 세션 | 상태 |
|---|---|---|
| ② 결제창 정책 링크 | C2 | 완료 |
| ③ 영문 결제 문의 진입점 | C1 | 완료 |
| ① 영문 결제정보(이용권 모달·영냥이·선물 안내 한국어 하드코딩) | 안 함 | **다음 세션** |
| (1단계 인수인계 4번째 항목) 서버측 환불 동의 기록 | 안 함 | **다음 세션** |

## 지금 상태

- 워크트리 `D:\Development\codedestiny-worktrees\inicis-overseas-card-p2-20260918-044006`, 브랜치 `wt/inicis-overseas-card-p2-20260918-044006`, 베이스 `8ee6b4b88`.
- 커밋 2개 + 이 문서 커밋. **아직 main 에 머지하지 않았고 push 하지 않았다.**
  - C1 `52b1e7c2e` — 영문·일문·중문 고객센터에 결제·환불 문의 항목 추가(17 files, 371+/368-).
  - C2 `8b7e3bbc4` — 결제창 하단 로케일별 정책 링크 줄(70 files, 1600+/1269-).
- `FOREIGN_CARD_ENABLED` 는 이번에도 어디에도 설정하지 않았다(OFF). 카드 브랜드명·환불 응답기한 약속은 한 글자도 넣지 않았다 — 특약은 여전히 미승인이다.

## 무엇을 바꿨나

### C1 — 영문 결제 문의 진입점 (`52b1e7c2e`)

- `lib/i18n/public-trust-copy.mjs`(**CRLF**)의 en·ja·zh 신뢰 페이지에 결제·환불 문의 절을 하나씩 추가했다. 세 절 모두 앵커 id `payment-help` 를 갖는다.
- 앵커를 실제로 그리려고 `app/components/LocalizedTrustPage.jsx:33` 의 구조분해를 `([heading, body])` → `([heading, body, id])` 로 넓히고 `id={id}` 를 붙였다. id 가 없는 기존 절은 그대로 `undefined` 라 마크업이 안 바뀐다.
- 한국어 `/contact-us` 의 결제·환불 문의 `<li>`(`app/contact-us/page.js:80`)에도 같은 앵커를 붙였다. 정적 사본 `public/static/policies/contact/index.html` 동기화.
- 문구는 **있는 것만** 적었다: 같은 이메일, 보낼 정보, 카드번호·보안코드 금지. 응답기한·전용 창구는 만들지 않았고 약속하지도 않았다.

### C2 — 결제창 정책 링크 줄 (`8b7e3bbc4`)

- 정본은 `js/core/checkout-entry.js` 하나다: `POLICY_LINKS_BY_LANG`(:478) · `policyLinkTargets()`(:490) · `buildPaymentPolicyLinksHtml()`(:506). 렌더러 3종은 전부 이 빌더에 위임한다 — `index.html:21771` · `js/destiny-profile.js:12603` · `app/_lib/billing-client.ts:1256`.
- 🔴 **URL 표가 코어 안에 있는 이유**: `checkout-entry.js` 는 UMD 클래식 스크립트/CommonJS 하이브리드라 `lib/i18n/routes.ts` 를 import 할 수 없다. 선례는 같은 파일의 `REFERENCE_FX_BY_LANG` 이다. 라우트를 바꾸면 이 표도 같이 고쳐야 하고, 안 고치면 결제 임계 화면에서 약관이 404 로 뜬다.
- 🔴 **번체(zh-TW)의 문의처만 `/en/contact#payment-help`** 다. `/zh-tw/contact` 라우트가 존재하지 않는다(세 경로로 확인: `lib/i18n/routes.ts`, 라우트 목록, 생성된 `sitemap.xml`). 그 라우트가 생기면 표를 같이 고친다.
- 링크는 전부 새 탭(`target="_blank" rel="noopener noreferrer"`)이다. 같은 탭으로 나가면 진행 중인 결제가 끊긴다.
- 🔴 **`[data-mode]` 를 붙이면 안 된다.** 렌더러 3종 모두 `[data-mode]` 노드를 "누르면 모달을 닫는" 훅으로 다룬다. 결제 중 약관을 열면 결제창이 통째로 사라진다. 새 노드는 `data-policy-links` 를 쓴다.
- 한국어 화면에서도 그린다. 해외 고지(`buildOverseasChargeNoticeHtml`)와 달리 표시 의무는 로케일과 무관하다.
- 12개 런타임 로케일 `public/i18n/*.json` 의 `payment.directModal.legal` 에 라벨 4개(`terms`·`refund`·`privacy`·`support`)를 넣었다. 저작은 en·ja·zh-CN·zh-TW, 나머지 7개는 영어 복사(레포 규칙). **ko 값은 코어 폴백과 바이트 일치**해야 한다 — `cdTranslate` 가 ko 는 사전을 건너뛴다.

### 가드 — `scripts/verify-payment-choice-parity.mjs`(**CRLF**)

새 검사 4개를 기존 가드에 얹었다. 새 파일을 만들지 않았으므로 러너 배선이 필요 없다.

1. 빌더 마커 2개 추가(`data-policy-links`, `target="_blank" rel="noopener noreferrer"`) — 총 18개.
2. 렌더 픽스처에 정책 링크 줄을 포함시켜 금지 패턴 검사가 실제 출력까지 본다.
3. **§2-a-2 라우트 대조** — 5개 로케일을 실제로 렌더해 href 4개를 뽑고, `#fragment` 를 떼고 생성된 `sitemap.xml` 의 `<loc>` 과 대조한다. 표를 가드에 다시 적으면 같이 고쳐 쓰는 이중 장부가 되므로 실제 라우트 목록과 맞춘다.
   - 🔴 로케일을 돌리는 방법은 `globalThis.window = { cdGetCurrentLanguage: () => lang }` 뿐이다. 코어의 `runtimeWindow()` 가 `typeof window` 를 보므로 `globalThis.cdGetCurrentLanguage` 를 심어도 **아무 효과가 없고 5개 전부 ko 로 렌더된다**(한 번 당했다). `finally` 로 복원한다.
4. 렌더러 3종이 `buildPaymentPolicyLinksHtml` 를 참조하는지 전수 단언. 미러 한 곳만 직접 `<a href="/terms">` 를 적는 형태를 리터럴 검사로는 볼 수 없다.

## 검증 (전부 mock, 실결제 없음)

- `node scripts/verify-payment-choice-parity.mjs` → PASS(10 renderers, 93 css rules, 18 builder + 14 renderer markers, 3 banned, 70 copy keys × 12 locales, 25 gate-triggered paths) · `--self-test` → OK(음성 6 + 정상 2).
- **변이 3종으로 가드가 무는지 확인**(원칙 10). 없는 라우트로 바꾸기 → BITES. 미러에서 빌더 위임 제거 → BITES. 링크 4개를 3개로 줄이기 → BITES. 매번 메모리 사본으로 복원했다(git 명령 안 씀 — 옆 세션 보호).
- `node scripts/verify-payment-freeze.mjs --update` → 통과(region 4 · file 3 · 상한 2). 절차 1단계인 "`worker/payments/` 도 같은 변경이 필요한가"는 추정이 아니라 실측으로 답했다: `git grep 'cd-direct-payment|provisionTiming|directModal' -- worker/` 0건, `worker/payments/` 는 서버 모듈만 — 미러 불필요.
- `node scripts/verify-paid-gate-ui-regression.mjs` → PASS(핀 리터럴 회전 반영).
- `npm run sitemap:generate` → `[sitemap:check] OK (URL 1281개)`. 라우트가 안 늘었음을 `<loc>` 집합 diff 로 증명했다(1281 = 1281, 차집합 공집합).
- `npm run check:fast` → **exit 0**, Test Suites 280 passed / 280, Tests 3954 passed / 3954.

## 함정 — 다음 세션이 같은 데서 막힌다

- **캐시 핀 회전이 계획에 없었는데 필요했다.** `js/core/checkout-entry.js` 나 `js/destiny-profile.js` 를 한 글자라도 고치면 정적 페이지 23개 + `app/layout.js` + `app/_lib/billing-client.ts` + `scripts/verify-paid-gate-ui-regression.mjs` 의 핀 리터럴이 전부 낡는다. 이번엔 26파일 73곳이었다. `index.html` 계열은 `sync:public` 이 관리하니 손대지 않는다.
  - 🔴 `PIN_GROUPS` 순서는 [destiny-profile, core] 이고 가드는 **첫 실패 그룹에서 던진다**. 그래서 1회차에 core 만, core 를 고친 2회차에 destiny-profile 이 나왔다. 두 그룹을 한 번에 유도해 한 번에 고치는 게 맞다(유도식: `sha1(rel + "\n" + normalizeForPin(content) + "\n---\n")` 앞 12자, 접두사 `build-`).
  - 🟠 (보고만) 이 가드에는 fail-open 이 있다. `index.html` 계열 중 하나라도 낡은 핀 값을 들고 있으면 그 값이 "sync 관리 대상"으로 분류되어, 같은 값을 쓰는 손관리 페이지 전부가 낡음 검사에서 빠진다.
- **핀을 회전하면 sitemap 원장이 드리프트한다.** `scripts/lib/sitemap-lastmod.mjs` 가 라우트의 import 폐포로 서명을 만드는데 `app/layout.js` 가 거의 모든 라우트의 폐포에 있다. 원인 추정 말고 `npm run sitemap:generate` 후 재생성본 커밋으로 끝낸다.
- **CRLF 파일은 Edit/sed 가 줄바꿈을 떨군다.** 이번 대상 중 `lib/i18n/public-trust-copy.mjs` 와 `scripts/verify-payment-choice-parity.mjs` 가 CRLF다. node 로 읽어 `eol` 을 보존해 쓴다(스크립트는 세션 스크래치패드에 있었고 남기지 않았다).
- **Bash 호출마다 cwd 가 `d:\Development\code-destiny` 로 되돌아간다.** 모든 명령을 `cd <워크트리> &&` 로 시작한다.

## 남은 작업

- [ ] **머지·push**(아래 재개 절차). 이번 세션은 워크트리에 커밋만 했다.
- [ ] 2단계 ① 영문 결제정보 — 이용권 모달 `app/points/PointsClient.tsx:4829-4874`, 영냥이 `app/checkout/CheckoutClient.tsx:194-226`, 선물 안내 `GIFT_GUIDANCE` 의 한국어 하드코딩. 7개 로케일 `payment.directModal` 영어화.
- [ ] 서버측 환불 동의 기록 — 이용권 모달 체크박스는 클라이언트에서만 버튼을 잠근다(`app/points/PointsClient.tsx:4867`). 단건 결제창엔 체크박스 자체가 없다([05](../payment/inicis-overseas-card/05-fulfillment-and-evidence.md) §4).
- [ ] 3단계(법무, LEGAL REVIEW REQUIRED)는 그대로 남아 있다.
- 플래그 ON 은 [02](../payment/inicis-overseas-card/02-overseas-card-implementation.md) §7 체크리스트 10개 순서를 따른다. 이번 변경으로 체크리스트 항목이 켜지지는 않았다(§7 에 정책 링크 항목이 없다 — 표시 의무는 플래그와 독립이다).

## 갱신한 문서

| 문서 | 무엇 |
|---|---|
| [01](../payment/inicis-overseas-card/01-current-payment-architecture.md) §4 | "약관·환불·개인정보 링크와 동의 체크박스 없음" → 링크는 생겼고 체크박스는 여전히 없다 |
| [02](../payment/inicis-overseas-card/02-overseas-card-implementation.md) §8 | 정책 링크 READY 행 + 환불 동의 NOT READY 행 추가 |
| [06](../payment/inicis-overseas-card/06-customer-support-and-incident-response.md) §1·§5 | C1 이 낡게 만든 근거 줄번호 갱신(`public-trust-copy.mjs` ja 14/35 · en 74/95 · zh 134/155), 결제창 링크 진입점 행 추가, "없는 것" 목록에서 진입점과 응답기한을 분리 |
| [09](../payment/inicis-overseas-card/09-inicis-application-facts.md) 8번·§7·§8 | 8번 문항 NOT READY → READY(한계는 답에 그대로), 2단계 목록에서 ②③ 완료 표기 |

## 범위 밖 결함 (보고만, 이번에 안 고침)

- `/zh-tw/contact` 라우트가 없다. 번체 사용자는 결제 문의에서 영어 페이지로 간다.
- 이용권 상점 오버레이(`index.html:29230`·`:29240` `overseasStoreNoticeHtml`)에는 정책 링크가 없다. 해외 고지만 있고 약관·환불·문의로 가는 길이 없다. 축 ① 영역이다.
- 위 핀 가드 fail-open.
- ko 와 비-ko 개인정보 처리방침의 시행일이 다르다.
- `verify:payment-choice-single-instance` 가 폐기된 PR 워크플로에만 배선돼 있어 지금은 아무 데서도 안 돈다.

## 재개 절차

머지는 **공유 체크아웃을 건드리지 않고** 워크트리에서 한다(옆 세션의 미커밋 작업 보호, 1단계와 같은 방식).

```powershell
Set-Location 'D:\Development\codedestiny-worktrees\inicis-overseas-card-p2-20260918-044006'
git fetch origin main
git log --oneline origin/main -1
# origin/main 을 detached 로 받아 --no-ff 머지 → 충돌 예상 지점은 정적 페이지 핀과 sitemap 원장뿐이다.
# 핀은 합친 코어에서 다시 유도하고, 머지 직후 npm run sync:public 을 반드시 다시 돌린다(미러가 도로 낡는다).
npm run check:fast
git push origin HEAD:main
```

push 후 `CI required` 통과만 확인하고 끝낸다. 스테이징 화면 검증은 선택이고, 운영 승격과 `FOREIGN_CARD_ENABLED` 켜기는 **명시적 1회 승인** 없이는 하지 않는다.
