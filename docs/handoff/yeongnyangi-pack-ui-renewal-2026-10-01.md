---
status: done
implementationStatus: shipped-to-main
updated: 2026-10-01
next: 후속 과제 1~7과 '두 이용권 적용 표시'(ffa9abd14·7bac4fed3·e88d2b312·1ebd3d6b7)까지 완료. 스테이징 카카오페이 실결제 1회는 2026-10-01에 사용했다. 다시 결제하려면 새 1회 승인이 필요하다.
---

# 영냥이 전용 이용권 리뉴얼 (2026-10-01)

## 결과

| 커밋 | 내용 |
|---|---|
| a7e0716dc | 🔴 가격·회수 교체: 전 어종 5·10·20회, 10/15/20% 할인, 30일, `-v2` id, policyVersion `yeongnyangi-pack-20261001` |
| 99183f6e5 | `/points#fish-packs` UI를 달빛 이용권(꽃돼지) 카드·결제 모달과 같은 구조로 |
| d69a959bd | 꽃돼지 Premium 카드에 연이 추천 장식 이미지 |

- 히어로: `yeoni-alliance-v1.webp`와 `paymentAllianceCopy`를 재사용한다. 월정석 카드의 1/N과 예시 줄은 `resolveServerFeaturePricing('yeongnyangi-saju-mackerel')`에서 계산한다(하드코딩 없음).
- 카드: 전역 `moon-plan-card`, `btn-moonlight`를 쓴다. 10회(가운데) 카드에는 "영냥이 추천" 배지와 `recommend-badge-v1.webp` 오버레이가 붙는다.
- 구매 모달: 꽃돼지 모달 순서를 따른다. 조건 → 선물 입력과 안내 → 환불 동의 → 결제수단 타일(카드·카카오페이) → 닫기.
  - 카카오페이는 후속 #5(965b09ee6)에서 붙였다.
  - Esc와 배경 클릭으로 닫는다. 결제 중에는 닫히지 않는다. 열면 제목으로 포커스가 가고, 닫으면 트리거로 돌아온다.
  - z-index는 `z-[1000]`이다. 하단 탭바 `.cd-mnav`가 z 960이다.
- 리뉴얼 커밋 3개는 결제 실행 코드(`buy`/`resume`/`checkOrder`, `service-pack-client.ts`)를 바꾸지 않았다. 결제 실행은 #3·#5에서 바뀌었다.
- 이미지:
  - 생선 세트는 360px `-v2`로 다시 인코딩했다.
  - 추천 배지 2장은 codex image_gen으로 생성했다. 영냥이는 정본 외형(흰 장모·마법사 모자)이다. 출처는 각 폴더 `provenance.md`에 있다.
  - 원본 PNG는 `.tmp/recommend-badges/`에 있다(커밋하지 않음).

## 함정

- `/points`에는 전역 규칙 `body:has(main.moon-shop) header:not(.moon-shop-hero){display:none}`(styles/globals.css)이 있다. 섹션 안에 `<header>`를 쓰면 화면에서 사라진다. div를 쓴다.
- `service-pack-copy.ts`의 `COPY`는 테스트가 JSON.parse한다. 큰따옴표를 쓰고 후행 쉼표를 두지 않는다. 12개 로케일 전부에 키가 있어야 한다.
- 꽃돼지 모달(PointsClient)은 원래 `z-[180]`이라 하단 탭바 아래에 깔렸다. 후속 #1에서 `z-[1000]`으로 고쳤다. 토스트는 모달 위에 와야 해서 `z-[1010]`이다.

## 검증 (실측)

- `node --test __tests__/ui/service-pack-pending-resume.behavior.test.mjs`: 22/22 통과.
- 영냥이 세트 jest 2개 파일: 115/115 통과.
- `npm run check:fast`(critical): exit 0, jest 4864/4864 통과.
- 로컬 dev에서 카탈로그 API를 정책표로 스텁했다. 360/390/768/960 폭에서 visual-checker 판정을 받았다.
  - 통과: 구조 일치, 오버레이, 줄바꿈, 자가·선물 모달, 가로 넘침 없음.
  - 실결제는 하지 않았다.

## 후속 과제 (전부 완료)

1. ~~꽃돼지 결제 모달이 하단 탭바(z 960)에 가려질 수 있다.~~ **완료(2026-10-01)**
   - 재현: 360×640에서 모달 맨 아래 "닫기"를 누르면 탭바의 "모든 운세" 링크가 눌렸다.
   - 수정: 모달 `z-[1000]`, 토스트 `z-[1010]`. 수정 후 닫기 버튼이 눌리고 배경이 탭바를 덮는다(DOM 실측과 visual-checker 판정).
2. ~~꽃돼지 Premium 칩 "일반 10,000원 이하 이용 가능"이 중복으로 보인다.~~ **완료(2026-10-01)**
   - 원인: 정책 칩(`formatSubscriptionPlanPolicy`)과 기능 칩 `under*` 키가 같은 문구를 냈다. Standard·VVIP도 같았다.
   - 수정: 카드 기능 칩에서 `under*`를 뺐다. 960 폭 DOM 실측에서 카드마다 해당 칩이 1개다.
   - 별건(미해결): `verify:sitemap-drift`가 이 수정 이전부터 실패한다. /dream·/love·/manse 등 16개 경로의 서명이 바뀌었다. 이 수정을 빼고 돌려도 실패한다.
3. ~~취소·실패 복귀가 다른 탭에서 일어나면 구매 버튼이 잠긴다.~~ **완료(2026-10-01, 85b693e8b)**
   - 재현: 수정 전 코드를 jsdom에 실제 `ServicePackShop`으로 렌더했다. 다른 탭 복귀(스냅샷 없음) 뒤 "결제 확인"이 계속 NOT_PAID로 실패해 버튼이 잠긴 채 남았다.
   - 수정: 다른 탭 취소 복귀는 서버 확인을 1회 한다. 확인 결과가 FAILED/CANCELLED이거나, 이어갈 스냅샷이 없는 NOT_PAID이면 로컬 대기 주문을 지우고 `notPaid` 문구를 띄운다. 서버는 새 키로 새 주문을 만든다(`service-pack:<key>`).
   - 유지: 같은 탭 취소에 이어갈 스냅샷이 있으면 이어가기 패널과 잠금을 그대로 둔다. 서버에 닿지 못하면(DATABASE_UNAVAILABLE 등) 잠금을 유지한다.
4. ~~`-v1` 미완료 주문은 "이어가기"가 막히고 버튼이 잠긴다.~~ **완료(같은 커밋)**
   - 이어가기는 여전히 막혀 있다. 카탈로그에 없는 플랜이라 의도한 동작이다. 대신 "결제 확인"에서 NOT_PAID가 오면 잠금이 풀려 새 세트를 고를 수 있다.
   - 검증: 임시 jsdom 시나리오 6개가 모두 통과했다(#3·#4 각각, 서버 불통, 같은 탭 유지 2개, CANCELLED). `service-pack-pending-resume` 22/22.
5. ~~영냥이 세트 결제수단은 카드만 된다.~~ **카카오페이 추가 완료(2026-10-01, 965b09ee6, mock 검증만)**
   - 사용자 결정: 수단은 카카오페이다. 기존 `kakaopayChannelKey` 채널을 쓰고, 꽃돼지와 같은 표를 재사용한다. 검증은 mock만 한다.
   - 구조:
     - 수단 값의 정본은 `js/core/checkout-entry.js`의 `DIRECT_PAY_METHODS` 표다(EASY_PAY, kakaopayChannelKey, orderMethod `kakaopay`). `service-pack-client.ts`는 `setSelectedDirectPayMethod` → `resolveDirectPayFields` → `clear`로 값을 꺼낸다. 값을 베끼지 않는다.
     - `lib/payment/portone.ts`에 `payFields` 옵션을 더했다. 전용 채널이면 `config[channelKeyName]`만 쓰고, 비어 있으면 `PAY_METHOD_UNAVAILABLE`로 실패한다(이니시스로 폴백하지 않음). 그때는 bypass도 싣지 않는다. 동결 매니페스트도 같은 커밋에서 갱신했다.
     - 카드는 종전 경로 그대로다(`card_general`, payFields 없음).
     - 서버는 바꾸지 않았다. prepare가 `kakaopay`를 pg 계열로 받는다.
   - 모달 동작:
     - 모달을 열면 `ensureDirectPayMethodAvailability`(`/api/payments/config`)로 채널키가 없는 수단을 미리 '준비 중'으로 내린다.
     - 결제창에서 `PAY_METHOD_UNAVAILABLE`이 오면 그 수단을 내린다.
     - 이어가기에서 저장된 수단이 꺼져 있으면 같은 주문을 카드로 잇는다.
   - 검증(mock):
     - `service-pack-pending-resume` 24/24(카카오 2개 추가), 세트 jest 115/115.
     - verify 7종: payment-freeze, portone-single-payment(⑥ 채널 격리 목록에 portone.ts 추가), billing-pass-policy, checkout-pass-card, payment-choice-parity, paid-gate-ui, pg-window-no-conflict.
     - 임시 jsdom에 실제 `ServicePackShop`을 렌더해 3개 시나리오를 확인했다. 카카오 타일은 prepare `kakaopay`와 PortOne EASY_PAY·전용 채널로 간다. 카드는 `card_general`이다. 키가 없으면 주문 전에 타일이 잠긴다.
     - 실제 `portone.ts` 번들 3개 시나리오: 카카오 채널 사용·bypass 없음, 키 없으면 창을 열지 않음, 카드는 그대로.
     - `check:fast`(critical): jest 4893/4893이 통과했다. node 단계의 sitemap lastmod 테스트 1개가 병렬 실행에서만 실패했다. 단독 실행은 6/6 통과이고, 이 변경과 무관하다.
   - 미검증과 남은 위험:
     - 실제 카카오페이 결제창 동작(스테이징 채널 포함)은 확인하지 않았다. 실결제 확인은 사용자의 1회 승인이 필요하다.
     - orderId 없이 남은 대기 기록(prepare 응답 유실)을 다른 수단으로 다시 사면, 서버는 처음 기록한 수단을 유지한다(`$setOnInsert`). 확정 시 `resolveConfirmedPaymentMethod`가 PG 결과로 바로잡는다.
6. ~~해외 원화 환산 안내가 세트 카드에 없다.~~ **완료(2026-10-01, 4b36b99b5)**
   - PointsPage가 기존 `useOverseasCharge()` 결과를 `ServicePackShop`의 `overseasCharge` prop으로 넘긴다. 카드 가격 아래에 "약 … 상당"을, 목록 끝에 원화 승인 고지를 꽃돼지 카드와 같은 마크업으로 표시한다.
   - 문구 정본은 checkout-entry 그대로이고, `verify:overseas-payment-notice`의 호출 파일 목록도 바뀌지 않았다. 한국어 화면에서는 null이라 기존과 같다.
7. ~~`SubscriptionSection`이 죽은 코드다.~~ **완료(2026-10-01, eab383f36)**
   - 컴포넌트, 렌더 위치, 그것만 쓰던 문구 키 6개(`purchasePass` 등, 타입·ko·en)를 지웠다. 삭제 전에 deletion-auditor로 3면 검색을 했다.
   - `verify-billing-pass-policy.mjs`의 "PDF 서비스와 일반 유료 서비스 조건은 상품별 안내에서…" 단언은 지우고 주석으로 대체했다. 그 문장은 죽은 본문에만 있어서 원래 화면을 지키지 못하고 있었다.
   - 별건(미해결):
     - 살아 있는 `/points`에는 위 PDF·일반 유료 서비스 조건 문장이 없다. 필요한 정책 고지인지는 결제 문서 담당의 판단이 필요하다.
     - PointsClient의 `{false && (...)}` 죽은 블록이 아직 남아 있다(②-2 구분선 등). `points-shop-request-budget.static.test.js`의 "월정석으로는 이용권을 구매할 수 없습니다."와 billing-pass-policy의 `<SubscriptionStatusCard subscription={subscription} />` 단언은 이제 그 죽은 블록 안에서만 맞는다. 그 블록을 지우면 두 단언도 같이 손봐야 한다.

## 스테이징 실결제 1회와 '두 이용권 적용 표시' (2026-10-01)

### 실결제 결과 (사용자 승인 1회, 사용 완료)
- 사용자가 스테이징에서 고등어 5회 세트를 카카오페이로 1,000원 결제했다.
- `wrangler tail` 실측: 웹훅이 `yeongnyangi-pack-mackerel-small-v2` 주문을 확정했고, `payment_entitlements`에 지급(commit)까지 됐다.
- tail에는 성공한 prepare 요청이 빠져 있고 401 한 건만 잡혔다. 이벤트 누락이 있어서 클라이언트 쪽 경과는 로그로 확정하지 못했다.
- 사용자 체감은 "결제 후 화면 변화 없음"이었다. 원인(코드상)은 두 가지다.
  - 성공 신호가 세트 목록 맨 아래 한 줄뿐이었다.
  - 웹훅 지급이 복귀보다 늦으면 '미지급'으로 끝나고 다시 확인하지 않았다.

### 이번 커밋 (서버·결제 정책 변경 없음)
두 이용권은 동시에 보유하고 각각 쓴다. 상담 한 건에는 한 수단만 차감되며, 판정은 서버 funding claim이 한다.
- `ffa9abd14` 도장 에셋 2장: `public/assets/yeoni/honey-passes/applied-stamp-v1.webp`, `public/assets/yeongnyangi/service-packs/applied-stamp-v1.webp`. 상수는 `APPLIED_STAMP_IMAGES`다.
- `7bac4fed3` /points 표시 3곳:
  - 상단 '내 이용권' 두 칸(`OwnedPassesSummary.tsx`).
  - 구매 직후 완료 패널(`data-pack-completed`).
  - 세트 카드 '보유 중 · N회 남음' 배지와 도장.
- `e88d2b312` **RED.** 결제 복귀 뒤 '미지급'일 때만 2·4·8초 간격으로 자동 재확인한다(`confirmPackOrderWithRecheck`).
  - 재확인하지 않는 경우: NOT_PAID·FAILED·401 같은 오류, GIFT.
  - 계정이 바뀌거나 언마운트되면 abort한다.
  - 롤백할 때는 이 커밋만 revert하면 된다.
- `1ebd3d6b7` 상담 결제창(/checkout) '내 이용권' 두 칸:
  - 달빛 이용권은 로컬 스냅샷을 읽는다. Family일 때만 '적용 중'과 도장을 붙이고, 다른 등급에는 "Family부터" 안내를 띄운다.
  - 영냥이 세트는 quote 후보를 쓴다.
  - 세트 사용 뒤 '적용됨 · N회 남음'을 1.2초 보여 주고 돌아간다.
  - SoulCat 모드에서는 표시하지 않는다.

### 검증 (실측)
- `service-pack-pending-resume.behavior` 31/31.
- 세트 jest 3개 파일 120/120. 이 실행은 `NODE_OPTIONS=--experimental-vm-modules`가 필요하다.
- verify 4종 통과: paid-gate-ui, checkout-pass-card, billing-pass-policy, payment-choice-parity.
- `check:fast --committed-head` EXIT=0.
- visual-checker로 /points와 /checkout을 360·390·768·960 폭에서 판정했고 전부 PASS다. /checkout은 카드 폭 기준 컨테이너 쿼리(≥560px일 때 두 칸 나란히)를 쓴다.
- 미검증:
  - 스테이징에서 새 화면을 실제로 결제한 적은 없다(승인 소진).
  - /checkout 요약이 560px 이상이 되어 두 칸이 나란히 놓이는 배치는 캡처에 없었다.

### 함정
- 모바일 폭 로그인 스텁: GlobalHeader는 메뉴를 열 때만 AuthWidget(refreshAuth)을 마운트한다. 스텁에서 localStorage `fortune_auth_cache_verified_v1`(`{scope:userId,verifiedAt}`)를 넣지 않으면 ownerId가 비어 로그아웃 화면처럼 보인다. 테스트 산물이고 제품 결함이 아니다.
- /checkout의 `requestId`는 64자리 hex만 받는다. 아니면 SoulCat 모드로 빠져 세트 칸이 안 뜬다.

### 별건 (보고만, 미해결)
- `packRequest`가 `retryOn401:false`라서, 상태 확인·prepare가 401이면 토큰 갱신 없이 바로 로그인으로 보낸다. 스테이징 tail의 prepare 401과 같은 결이다.
- /points 보유 목록(`ServicePacks.tsx`의 wallet 리스트)은 아직 "고등어 · 고등어 세트 5회"처럼 어종이 두 번 나온다.
- /points 768 폭에서 "서양 / 점성술"이 꺾인다.

## 재개 정보

~~~text
D:\Development\code-destiny에서 docs\handoff\yeongnyangi-pack-ui-renewal-2026-10-01.md를 읽고 git status와 1ebd3d6b7 이후 커밋을 확인하라. 두 이용권 적용 표시까지 끝났다. 남은 것은 '별건' 3개뿐이다. 실결제는 새 1회 승인이 있을 때만 한다.
~~~
