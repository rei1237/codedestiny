---
status: active
updated: 2026-09-18
next: 이용권 모달 14문구 영어화(app/points/PointsClient.tsx:4823-4946)부터 시작한다 — 폴백을 EN으로 할지 결정 필요.
---

# /checkout 다국어 배선 — 해외카드 2단계 ① 첫 축

- 날짜: 2026-09-18 (1차 축), 이용권 모달 축 추가 완료
- 등급: RED (결제 화면)
- 커밋: `701a9d6e2` (/checkout, 1차 축), `83fe0c05c` (이용권 모달, 2차 축) — 둘 다 main 에 직접,
  push 완료(스테이징까지). 프로덕션 승격 승인 없음
- 선행 문서: [inicis-overseas-card-phase2-20260918.md](inicis-overseas-card-phase2-20260918.md)

## 왜

2단계 ①(영문 결제정보)은 세 축으로 나뉜다: **영냥이 단건 결제 화면**(`/checkout`), **이용권
모달**, **`GIFT_GUIDANCE`**. `/checkout` 은 i18n 배선이 **아예 없어서**(`useT` 계열 import 0건)
12개 로케일 전부가 한국어 결제 화면을 봤다. 해외카드 특약을 켜는 순간 이 화면이 해외 사용자의
결제 임계 화면이 된다.

첫 두 축(`/checkout`, 이용권 모달)은 완료했다. 마지막 축(`GIFT_GUIDANCE`)은 **아직 손대지
않았다** — 한 세션에 한 작업.

## 무엇을 바꿨나 (4파일)

| 파일 | 내용 |
| --- | --- |
| `app/checkout/checkout-copy.ts` (신규 281줄) | 35키 동기 표. ko·en·ja·zh-CN·zh-TW 저작, 나머지 7개는 EN. `resolveCheckoutPolicyHrefs()` |
| `app/checkout/CheckoutClient.tsx` | 하드코딩 39줄 → 표 참조. `languagechange`·`cd:locale-ready` 추종. `ko-KR` 하드코딩 제거 |
| `app/checkout/CheckoutRouteClient.tsx` | `dynamic` 로딩 셸도 같은 표를 쓴다 (본체 붙기 전 한 프레임이 한국어로 고정되던 구멍) |
| `scripts/verify-payment-choice-parity.mjs` | `§2-a-3` 블록 +36줄 |

### 설계 결정 3개 (되돌리지 말 것)

1. **사전(`useT`)이 아니라 동기 표다.** 결제 화면의 첫 렌더가 비면 안 된다.
   `app/account/delete/AccountDeleteActions.tsx` 와 같은 방식이고, 그게 이 레포의 결제·계정
   임계 화면 관례다. 사전으로 옮기자는 제안이 오면 이 줄을 근거로 거절한다.
2. **폴백은 `ko` 가 아니라 `EN` 이다** (`getCheckoutCopy` 의 `|| EN`). 표에 없는 로케일이
   생겨도 한국어가 **구조적으로** 샐 수 없다.
3. **정책 링크 표를 새로 만들지 않았다.** `lib/i18n/routes.ts` 의 `getLocalizedPublicHref`
   에서 파생한다 — URL 원장이 둘이 되면 갈라진다. `/zh-tw/contact` 라우트가 없어
   zh-TW 문의처는 `/en/contact/#payment-help` 로 떨어진다(결제창 C2 와 같은 규칙,
   하드코딩이 아니라 `contact === "/contact"` 조건으로 파생).

## 🔴 깨뜨리면 안 되는 계약 — ko 값은 한 글자도 못 바꾼다

`scripts/lib/yeongnyangi-mobile-payment.mjs` 가 **한국어 리터럴로 셀렉터를 건다**:

- `/단건 결제하기/` — :146, :147, :310, :323, :338, :349
- `'선택한 상담과 생선이 달라요. 영냥이 방에서 다시 골라 주세요.'` — :306
- `'← 영냥이 방'` — :311

그래서 `CHECKOUT_COPY.ko` 는 이전 하드코딩과 **바이트 동일**하게 옮겼다. ko 문구를 다듬고
싶으면 이 하네스를 먼저 고쳐야 한다. 🔴 단 이 하네스를 도는 `scripts/verify-yeongnyangi-browser.mjs`
는 **`package.json` 에도 `.github` 에도 배선돼 있지 않다**(전수 grep: 문서 언급뿐). 즉 지금은
깨져도 CI 가 안 잡는다 — ko 를 바꿀 때 사람이 기억해야 한다는 뜻이다.

## 검증 (전부 mock, 실결제 0)

- `npx tsc --noEmit` — exit 0
- `npm run check:fast` — exit 0, 마지막 스텝 `test:jest` 281 스위트 / 3959 테스트 전원 통과
- `node scripts/verify-payment-choice-parity.mjs` — PASS (10 renderers, 93 css rules, 70 copy keys x 12 locales, 25 gate-triggered paths)
- **변이 주입으로 새 가드가 무는 것 확인**(원칙 10): `/terms` → `/terms-of-use` 로 바꾸니
  `AssertionError: /checkout 정책 링크(ko.terms) /terms-of-use/ 가 sitemap.xml 에 없습니다`
  로 즉시 실패, 복원 후 PASS.
- `npm run sitemap:generate` — 원장 갱신 0, `sitemap.xml` 무변경. 문구 변경은 드리프트를 안 낸다.
- 12개 로케일 × 3개 정책 링크 21종이 전부 `sitemap.xml` 의 실재 라우트임을 확인.

## 함정

- `app/checkout/*` 3파일 전부 **CRLF** 다. `Edit`·`sed` 는 CRLF 를 떨군다 — node 로 패치한다.
- `scripts/verify-payment-choice-parity.mjs` 도 CRLF. 그리고 heredoc 안에서 정규식을 쓰면
  **Bash 가 백슬래시를 한 겹 먹는다** — 이번에 `/\/$/` 가 `//$/` 로 나가 `SyntaxError:
  Missing } in template expression` 를 냈다. 패치 스크립트는 `String.fromCharCode(92)` 같은
  우회로 쓰거나 heredoc 을 피한다.

## 범위 밖 결함 (보고만, 안 고침)

- `verify-locale-table-coverage.mjs` 가 로컬에서 **헛실패**한다(+14171 / baseline 5396).
  전수 확인 결과 새 위반은 전부 `.delivery-worktrees/repo-1884/` 와
  `.codex-worktrees/home-service-discovery-ux-clean/` 안이고, `git ls-files` 상 **추적되지 않는
  잔재 디렉터리**다. 그 둘을 빼면 합계 **5004 ≤ 5396** 으로 통과이며 baseline 보다 392 낫다.
  `--list | grep -i checkout` 은 0건 — 이번 표는 갭에 기여하지 않는다. CI 는 fresh clone 이라
  영향 없다. 고치려면 그 두 디렉터리를 지우거나 가드에 제외를 넣어야 하는데, 둘 다 다른 축이다.
- `scripts/verify-yeongnyangi-browser.mjs` 미배선 (위 🔴 참조).
- `scripts/verify-gift-checkout.mjs`(미배선, `package.json`/`.github` 전수 grep 0건)를
  `MOCK_DEV_PORT=18290 npm run dev` 로 띄운 서버에 대해 실행하면 첫 스텝(`getByRole('button',
  { name: '선물하기' })`)에서 90초 타임아웃으로 실패한다. 원인은 mock dev 서버가
  `/api/me/access-state/`, `/api/profile/` 를 501(`MOCK_ROUTE_NOT_IMPLEMENTED`)로 응답하고
  `/points` 화면이 그 상태에서 스켈레톤 로딩에 멈춰 있는 것 — 이번 커밋(`83fe0c05c`)과 무관하다.
  `git stash`로 변경 전 파일로 되돌려 동일한 디버그 스크립트를 돌려도 **같은 501 시퀀스와 같은
  멈춤**이 재현됨을 실측 확인(재현 스크립트는 검증 후 삭제, 남기지 않음). 이 스크립트가 마지막으로
  실제 통과한 시점은 이번 세션 범위 밖이라 불명 — 다음에 이 가드를 쓰려면 mock-api 쪽에
  `access-state`/`profile` 라우트를 추가하거나 스크립트를 그에 맞게 갱신해야 한다.

## 남은 작업 — 2단계 ① 의 나머지 두 축

- [x] **이용권 모달 영어화** — 완료. 커밋 `83fe0c05c`. `app/points/PointsClient.tsx`의
      `POINTS_PAGE_COPY` 표(:824)에 17키 추가(en/ja/zh-CN/zh-TW 저작, 나머지 7개는 EN 상속),
      `pendingSubscriptionPaymentPlan` 모달의 한국어 리터럴 17개를 `copy.xxx` 참조로 교체.
      폴백은 `/checkout` 관례에 맞춰 `POINTS_PAGE_COPY[lang] || POINTS_PAGE_COPY.ko` →
      `|| POINTS_PAGE_COPY.en` 으로 변경(사용자 승인). ko 값은 기존 리터럴과 바이트 동일하게 유지.
      검증: `tsc --noEmit` 통과, `check:fast`(jest 281 스위트/3959 테스트 전원) 통과,
      `verify-billing-pass-policy.mjs` 통과. `verify-gift-checkout.mjs`는 실행 시도했으나
      **이 변경과 무관한 환경 문제로 실패**(아래 "범위 밖 결함" 참고) — git stash 로 변경 전
      파일에서도 동일하게 재현되는 것을 확인해 원인이 이번 변경이 아님을 실측 확인함.
      `{GIFT_GUIDANCE}` 본문은 계획대로 건드리지 않음.
- [ ] **`GIFT_GUIDANCE`** — `lib/payment/gift-policy.js:13` 의 한국어 장문 1건. 소비처 2곳:
      `app/gift/claim/page.tsx:51`, `app/points/PointsClient.tsx:4862`. 서버 공용 모듈이라
      로케일 인자를 받게 할지, 소비처에서 갈아끼울지가 설계 갈림길이다.

## 이 문서 밖 (2단계·3단계 잔여)

[inicis-overseas-card-phase2-20260918.md](inicis-overseas-card-phase2-20260918.md) 의 남은 작업을
따른다: 단건 레일 환불 동의(🔴 `js/core/checkout-entry.js` 를 건드리면 캐시 핀 26파일 73곳 회전이
딸려 온다 — 사용자가 이번 범위에서 명시적으로 뺐다), 3단계 법무.

## 재개 절차

```
git branch --show-current   # main
git status                  # marketing/* 는 다른 세션 것 — 건드리지 않는다
git pull --ff-only
```

다음 세션 첫 문장: **"`docs/handoff/checkout-i18n-wiring-20260918.md` 를 읽고, 2단계 ① 의 마지막
축인 `GIFT_GUIDANCE` 다국어화(`lib/payment/gift-policy.js:13`, 소비처
`app/gift/claim/page.tsx:51` / `app/points/PointsClient.tsx:4862`)를 시작한다."**
