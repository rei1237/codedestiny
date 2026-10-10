---
status: active
updated: 2026-10-10
next: "love-tarot-delivery.route.test.js 에 '정상 9회·상한 18회' 기대 테스트를 먼저 쓰고(실패 확인), worker/lib/love-tarot-delivery.js 조각 21개를 9개로 묶는다."
---

# 속마음 타로(/love-reading) LLM 호출 21~42회 → 9~18회 최적화

## 왜

"love-reading은 속마음 타로로 보이는데 21~42회 호출은 말도 안되는 수치이므로 원인 파악후 llm 비용 최적화를 먼저 한 이후에 진행해주도록해" (2026-10-10)

이 문서가 끝나야 [기본 운세 샘플 문서](2026-10-10-basic-fortune-llm-samples.md)의 B1c 를 돌릴 수 있다.

## 지금 상태

- 원인 파악까지 끝났고, 코드는 아직 고치지 않았다.
- 21~42회는 **조각 21개 × 조각당 최대 2회 시도**에서 나온다. 길이 보완이나 판정 호출 때문이 아니다.
  - 조각 구성(worker/lib/love-tarot-delivery.js:17-26): 카드 meaning 6, 카드 action 6, 개요 3, FINAL 4, matrix 2.
  - 요청 1번에 조각 1개만 만든다(`PAID_LLM_PARTS_PER_REQUEST=1`, sync-llm-timeout.js:26). 시도는 2회까지다(paid-narrative-delivery.js:135).
  - 21회 모두 같은 공용 프롬프트(약 3.2k자)를 다시 보낸다.
- 두 번째 시도를 부르는 거부 지점:
  - evidenceHash 를 모델이 잘못 따라 쓰면 후보를 버린다(paid-narrative-candidate.js:49).
  - 본문 안에서 문장이 반복되면 버린다(love-tarot-delivery.js:62).
  - 다른 조각과 문장이 겹치면 버린다(paid-narrative-delivery.js:169-177). 가장 유력한 원인으로 추정한다.

## 남은 작업

- [ ] **1. 조각을 21개에서 9개로 묶는다.**
  - 카드당 1회로 받는다. 4문단을 받아 `normalizeNarrativeParagraphs(body,4)` 로 detail/relationshipInsight/advice/caution 에 나눠 넣는다. 화면 분할 로직(:34-36)도 함께 맞춘다.
  - 개요 3개를 1회로 받는다.
  - matrix 2개를 1회로 받는다(8문단).
  - FINAL 4개를 1회로 받는다.
- [ ] **2. evidenceHash 를 서버가 채운다.** 공용 후보 검사에 영향이 있으면 love 전용 옵션으로 한다.
- [ ] **3. 반복 문장을 거부하지 않고 결정적으로 지운 뒤 채택한다.** 범위는 본문 안과 조각 사이 둘 다다(원칙 17).
- [ ] **4. 비용 근거를 실제 코드에 맞춘다.**
  - `config/pass-cost-planning-20260921.json:64-75` 의 parts 를 고친다. 설정은 시도 3×3, 입력 50k 를 가정해 실제와 다르다.
  - mindscan parts 도 19 로 되어 있지만 실제는 25 다.
  - `__tests__/ui/pass-economics.test.mjs:25` 에서 속마음 타로가 가격을 정하는 서비스(pricingDriver)로 고정되어 있다.
- [ ] **5. (같은 패턴, 후속)**
  - 오라클: 15~29조각, 최대 58회. 카드 조각이 2문단 미만이면 정규화 없이 버린다(tarot-oracle-delivery.js:95).
  - 마인드스캔: 25조각, 최대 50회. 위치 6·7 이 앞 카드를 재사용해 겹침 거부 위험이 크다.
- [ ] **6. 재실호출.** 승인받고 B1c 를 1회 돌려 품질과 호출 수를 확인한다.

**끝난 판정:**
- mock 기준 정상 9회, 상한 18회.
- 실호출 9~12회.
- 화면 필드가 모두 채워진다.
- 하한 합계 26,400자를 유지한다.

## 정본 예시

- 문단 수 고정 후 결정적 정규화: `worker/lib/love-tarot-delivery.js:66` (matrix 4문단)

## 함정

- 테스트의 21/22/42 기대값(love-tarot-delivery.route.test.js:48-58)은 구조를 바꾼 결과로 바뀌는 것이다. 기대값만 고쳐서 통과시키지 않는다.
- 결제 보존 계약이 있으므로 공급자 오류에 대한 2회 시도 상한은 유지한다.
- 응답이 커진다(카드당 약 4~6k자). maxOutputTokens 9500 과 45초 timeout 안에 들어오는지 mock 이 아니라 실호출로 확인한다.
- `scripts/report-pass-economics.mjs` 는 파일을 쓴다. 의도할 때만 실행한다.

## 검증

```
npx jest __tests__/worker/love-tarot-delivery.route.test.js __tests__/worker/mindscan-delivery.route.test.js __tests__/worker/oracle-consultation.route.test.js __tests__/ui/pass-economics.test.mjs
npm run check:fast
```

## 모르는 것

- 겹침 거부가 실제로 두 번째 시도의 주원인인지는 실측하지 않았다. 재실호출 로그에서 거부 사유별 횟수를 센다.
