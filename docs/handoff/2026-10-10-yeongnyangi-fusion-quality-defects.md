---
status: active
updated: 2026-10-10
next: "단계 B(correctChapterProse 결정적 후처리)부터 한다: 6번 X(X) 접기와 5B 점수·영어 정리를 consultation.ts correctProseMarkup 에 넣고 yeongnyangi-consultation.test.mjs 에 재현 테스트를 먼저 쓴다."
---

# 영냥이 퓨전(MA 모듬·MO 오마카세) 품질 결함 14건 + 토큰 여유

## 왜

"고치지않은 결함에 대해서 각각 수정할 수 있도록 인수 인계 문서를 만들어서 작업할 수 있도록해줘" (2026-10-10). MA·MO 는 조건부 합격이다. 결과 원문은 `build-cache/llm-sample-review-20261009/MA|MO/result.md` 에 있다.

## 지금 상태

- 아직 고치지 않았다. 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다.
- 🔴 **strict 검사는 배달을 막지 못한다.**
  - `worker/yeongnyangi/providers/delivery.ts:51-56` 이 validateChapter 의 오류를 받아 fallback 으로 배달한다.
  - 그래서 새 strict 검사를 더해도 효과가 없다. 효과가 있는 수정은 세 가지뿐이다: (A) 결정적 데이터, (B) `correctChapterProse`(providers/chapter.ts:92-109) 결정적 교정, (C) 프롬프트 계약.

## 남은 작업

경로 앞의 `fortune/`, `providers/` 는 `worker/yeongnyangi/` 아래다.

**단계 B. 결정적 후처리.** requests 해시는 움직이지 않는다. 먼저 한다.

| # | 결함 | 원인 위치 | 수정 |
|---|---|---|---|
| 6 | `월주(월주)` 같은 괄호 중복 | consultation.ts:274-295 correctProseMarkup 에 규칙이 없음 | 같은 말이 괄호로 반복되면 접는다. 서로 다른 값(X(漢字))은 둔다 |
| 5B | `metal`, `점수 41`, `(-4점)`, `('seasonalBalance' score -4)` | consultation.ts:221-269 redactInternalEvidence | 점수가 든 괄호는 통째로 지운다. 영어 오행어는 reading-presentation.ts:37 names 맵으로 바꾼다 |
| 1B | 근거 없는 戌未 '형' | 엔진은 미술파로 계산(life-book-ai-saju.js:127-143) | 계산에 없는 형은 미술파(未戌破)로 바꾼다. 丑 이 있을 때만 형으로 둔다 |
| 2B | 자미 대궁·삼합·유년사화 오기 | consultation.ts:353-364 가 궁만 검증 | 관계표·annualTransformations 와 대조해 바꾼다. 연도가 명시된 문장에만 적용 |
| 3B | 월지·월주 십성 오기 | correctNatalClaims(chapter.ts:105-107)에 규칙 없음 | 기둥이 명시된 십성만 계산값으로 바꾼다 |
| 7 | "목성 대운" | correctDashaSequence(consultation.ts:367-418) | 행성명이 붙은 대운을 마하·안타르·프라티안타르 단계로 바꾼다 |
| 8B | 체계 sources 누락 | chapter.ts:235-239 검사를 fallback 이 우회 | 본문이 이미 언급한 체계의 sources 만 보충한다 |

**단계 A. 결정적 데이터.** requests·prepare 해시가 크게 움직인다. 모아서 한 번에 갱신한다.
- 1A: 세운×대운·월운×대운 관계 `luckOverlap` 을 만든다. 3자 형은 대운+세운+원국 지지를 합쳐 판정한다(L480-499·605-629 는 운×원국만 봄).
- 2A: 12궁 `{facing, trines}` 관계표를 넣는다(reading-facts.ts:56-61·110-122). 대한·유년 행에도 붙인다.
- 3A: base selector(reading-manifest.ts:46)에 tenGodsByPillar 요약을 넣는다.
- 4: 장별 scopeYear 를 정한다. 고칠 곳:
  - chapter-facts.ts:48 의 yearlyLuck slice(0,1)
  - L42-46 next 조건에 life-decade 추가
  - chapter.ts:463·482 의 상담 period 를 질문 장 전용으로
- 9A: 타로 position 에 timeFrame 라벨을 붙인다.
- 12: ask 1장 title 을 덮어쓴다(service.ts:280-289).
- 13A **토큰** (MO ch1 46,152, prevention 44,412 / 상한 50,000, `llm-client.ts:1176-1186` 은 fail-closed):
  - ask/prompt.ts:100 중복 제거가 palaces 래퍼 경로를 인식하게 한다.
  - monthlyLuck 을 요청 기간으로 바꾼다.
  - 관련 fact 만 넣는다.
  - 전송 전 토큰 사다리를 둔다.
- 14A: chapter-facts.ts:33 의 bodyPalace(재백궁) 강제 포함을 self/money 장으로 한정한다.

**단계 C. 프롬프트 계약.** 효과는 재실호출로만 확인할 수 있다.
- 4: 장별 timeContract.
- 5A: readerEvidence(prompts/domain/reader-counsel.ts:29-42) 점수를 범주어로.
- 8C: ask 1장에 체계별 슬롯.
- 9C: ASK_PERIOD_GUIDE(ask/prompt.ts:79)에 "타로 position 을 시기로 옮기지 않는다".
- 10: 예방 conditions·signals 블록에 사주 충·파 anchor 를 요구하고, 후보를 미리 순위화한다(fortune/prevention.ts, 사주 근거 29.6K).
- 11: minimumChars 를 target 의 약 0.8 로 올린다(reading-quality.ts:16-25). 배달 floor(chapter-delivery-contract.js:19-24)는 그대로 둔다.
- 14C: claim 사용 횟수 장부.

**마무리**
- [ ] fallback 로그를 code 별로 집계한다.
- [ ] MA·MO 를 각 1회 재실호출한다. 각각 승인이 필요하다. 약 29·39회, 약 $0.92.

**끝난 판정:**
- 14건 재발 0
- 두 ask 첫 장 입력 토큰 40,000 이하
- 하한 미달 장 0~2개

## 정본 예시

- 해시 갱신 관례: `__tests__/ui/yeongnyangi-reading-invariance.test.mjs` 헤더 주석(MO 2026-10-10 askPromptView 항목)

## 함정

- 해시는 `YEONGNYANGI_INVARIANCE_PRINT=1` 로 갱신하고, 헤더 주석에 의도와 움직인 행 수를 적는다. 단계마다 1회만 갱신한다.
- 3A·11 은 거의 모든 행의 requests 를 움직인다. 11 은 repair 비용이 늘어나므로 pass-economics 로 확인한다.
- 사주 '대운'과 베다 다샤를 혼동하지 않는다. 7번은 행성명이 붙은 경우에만 적용한다.

## 검증

```
npx jest __tests__/ui/yeongnyangi-consultation.test.mjs __tests__/ui/yeongnyangi-natal-claims.test.mjs __tests__/ui/yeongnyangi-fusion-delivery.test.mjs __tests__/ui/yeongnyangi-prevention.test.mjs __tests__/ui/yeongnyangi-ask-validation.test.mjs __tests__/ui/yeongnyangi-benchmark-budget.test.mjs __tests__/ui/yeongnyangi-reading-invariance.test.mjs
npm run check:fast
```

- 토큰 측정: scratch `prevention_tokens.mjs` 패턴을 따른다. countTokens 만 쓰므로 비용은 0 이다.

## 모르는 것

- MO ch1 의 프라티안타르 행성 값은 호출자 정보 기준이다. 다샤 데이터로 다시 확인한다.
