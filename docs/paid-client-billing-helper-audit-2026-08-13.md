# 유료 클라이언트 결제 헬퍼 감사 (2026-08-13)

> 결론 먼저: **네 헬퍼는 공용 모듈로 합치지 않는다.** "복붙 중복"으로 보이지만 실제로는
> 라우트마다 다르게 진화한 변종이고, 합치면 유료 기능 여섯 개의 결제 증거가 동시에 바뀐다.

## 왜 감사했나

`ziwei-ai-consultation` 을 `ziwei-deep-pdf` 로 통합(PR #579)하면서, 두 패널이 똑같이 갖고 있던
결제 헬퍼 네 개가 눈에 띄었다. 처음에는 "약 80줄이 클라이언트 아홉 곳에 복붙돼 있으니 공용
모듈로 빼면 되겠다"고 판단했다. **그 판단은 틀렸다.**

## 방법 — 이름 grep 으로 단정하지 않는다

CLAUDE.md 코딩 원칙 6이 요구하는 방식대로, 함수 **본문을 중괄호 균형으로 잘라내** 비교했다.
줄바꿈·들여쓰기 차이가 실질 차이로 오인되지 않도록 토큰 단위로 정규화한 뒤 그룹핑했다.

이름만 세면 "7곳에 같은 함수" 지만, 본문을 열어 보면 다음과 같다.

## 결과

대상 파일 7개 — `ZiweiDeepPdfPanel` · `IslandConsultClient` · `LoveSecretAiClient` ·
`NamingAiClient` · `SukuyoCompatibilityAiClient` · `VedicAiClient` · `ZiweiAiClient`

| 헬퍼 | 실질 변종 | 갈라진 지점 |
|---|---|---|
| `runtimePayload` | **2** | 6곳 동일 / `Naming` 만 다름 |
| `isPaymentGranted` | **2** | 6곳 동일 / `Naming` 만 다름 |
| `extractPayment` | **4** | `ZiweiDeepPdf`·`Island`·`ZiweiAi` 동일 / `LoveSecret` / `Sukuyo` / `Vedic` 각자 다름 (`Naming` 은 미보유) |
| `buildBillingGateInput` | **5** | 전부 다름 (`LoveSecret`·`Naming` 은 미보유) |

### 차이가 실질인 것과 포맷일 뿐인 것

`isPaymentGranted` 는 겉보기에 네 가지였지만, 셋은 **줄바꿈 위치만 다른 같은 로직**이었다.
진짜 다른 것은 `Naming` 하나다. 반대로 `extractPayment` 는 길이가 같은 두 구현이 서로 다른
변종이었다. **길이도 이름도 판단 근거가 못 된다.**

### 왜 갈라졌나 — 대부분 의도된 차이다

- `LoveSecret` — 증거에 `attemptId: activeAttemptId()` 를 실는다. 그 기능 고유의 재시도 추적이다.
- `Vedic` — `ledgerId` 를 다루지 않고 `transactionId: paymentId` 로 별칭을 준다. 증거 필드 이름이
  다른 라우트와 애초에 다르다.
- `buildBillingGateInput` — 애초에 **공용화 대상이 아니다.** 기능마다 `featureKey`·가격·
  `categoryKey` 가 다르다(`premium-report` vs `premium-consultation`). 다른 게 정상이다.

`extractPayment` 가 만드는 페이로드는 서버가 받아 결제 증거로 검증한다. 하나로 합치면 여섯 개
유료 기능의 증거 모양이 한꺼번에 바뀐다 — 이득(약 5KB)에 비해 위험이 크게 어긋난다.

## 미조치로 남긴 잠재 결함 2건

사용자 확인 후 **이번에는 고치지 않기로** 했다. 둘 다 결제 판정·증거를 바꾸는 변경이라
별도 PR 에서 해당 기능의 결제 동작을 함께 검증하며 다루는 것이 맞다.

### ① `NamingAiClient` 의 `isPaymentGranted` 가 축소형이다

표준형에 있는 두 가지가 없다:

- `denied` 상태 집합(`failed`·`cancelled`·`payment_required` 등) 검사
- `granted`·`paid`·`succeeded` 등 **명시적 승인 상태**의 조기 통과

그 결과 `status: "failed"` 인 응답이라도 `paymentId` 가 실려 있으면 **승인으로 읽을 수 있다.**
반대로 이용권으로 무료 통과해 id 가 하나도 없는 응답은 거부로 읽는다.
표준형(나머지 6곳)이 더 안전하다.

### ② `SukuyoCompatibilityAiClient` 의 `extractPayment` 가 `billingEvidence` 를 안 실는다

다른 라우트는 전부 `billingEvidence` 를 함께 보낸다. 숙요점 궁합만 빠져 있다.
의도인지 누락인지는 이 감사에서 결론 내지 못했다 — 서버가 그 필드를 어떻게 쓰는지
(`worker/routes/sukuyo-compatibility-ai.js`) 확인이 선행되어야 한다.

## 확인했으나 문제가 아니었던 것

**`ZiweiDeepPdfPanel` 만 `membershipCreditCost` 를 게이트에 명시하지 않는다.** 통합 전
상담 패널은 `FEATURE_MEMBERSHIP_CREDIT_COST = 3000` 을 실어 보냈으므로 회귀를 의심했으나,
값이 같은 곳으로 수렴한다:

- 서버 `paymentPayload.runtimeGate.membershipCreditCost` = `calculateMembershipCreditCost(300)` = **3000**
- 클라이언트 폴백([billing-client.ts:2289](../app/_lib/billing-client.ts)) = `cost * 10` = **3000**

명시 전달이 없어도 게이트가 같은 값을 쓴다. 조치 불필요.

## 다음에 이 코드를 볼 사람에게

이 네 헬퍼가 여러 파일에 흩어져 있는 것을 보고 "중복이니 합치자"로 바로 가지 말 것.
**본문을 열어 비교한 뒤에** 판단하라. 이 감사에서 이름 기반 추정은 실제와 달랐다.
