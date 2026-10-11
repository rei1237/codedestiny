---
status: active
updated: 2026-10-11
next: "단계 C(프롬프트 계약: 4 timeContract·5A·8C·9C·10·11·14C)를 한다. 효과는 MA·MO 재실호출로만 확인하므로 실호출은 따로 승인받는다. 단계 B 는 a208bea08, 단계 A 는 556d2af0e 에서 끝났다."
---

# 영냥이 퓨전(MA 모듬·MO 오마카세) 품질 결함 14건 + 토큰 여유

## 왜

"고치지않은 결함에 대해서 각각 수정할 수 있도록 인수 인계 문서를 만들어서 작업할 수 있도록해줘" (2026-10-10). MA·MO 는 조건부 합격이다. 결과 원문은 `build-cache/llm-sample-review-20261009/MA|MO/result.md` 에 있다.

## 지금 상태

- 단계 B(6·5B·1B·2B·3B·7·8B)와 단계 A(1A·2A·3A·4·9A·12·13A·14A)는 끝났다(아래 '단계 A 결과'·'단계 B 결과'). 단계 C 와 재실호출은 남았다. 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다.
- 🔴 **strict 검사는 배달을 막지 못한다.**
  - `worker/yeongnyangi/providers/delivery.ts:51-56` 이 validateChapter 의 오류를 받아 fallback 으로 배달한다.
  - 그래서 새 strict 검사를 더해도 효과가 없다. 효과가 있는 수정은 세 가지뿐이다: (A) 결정적 데이터, (B) `correctChapterProse`(providers/chapter.ts:92-109) 결정적 교정, (C) 프롬프트 계약.

## 단계 B 결과 (a208bea08, 2026-10-10)

모두 결정적 교정이고 requests 해시는 움직이지 않았다(reading-invariance 통과). 실출력 dry-run 은 `build-cache/llm-sample-review-20261009` 의 MA·MO 원문으로 했다.

- 6·5B: correctProseMarkup 이 `X(X)` 를 접고, 점수가 든 괄호를 지우고, 영어 오행어를 ELEMENT_KO(block-anchors.ts)로 바꾼다.
- 1B: 원국·현재 대운에 丑 이 없으면 戌未 형을 미술파(未戌破)로 바꾼다(saju/natal-claims.ts).
- 3B: 기둥 이름 바로 뒤 십성을 tenGodsByPillar 계산값으로 바꾼다. 남은 한계: 바뀐 십성 뒤의 설명 문장은 옛 뜻을 그대로 말할 수 있다.
- 7: 행성명 + 대운을 다샤 단계로 바꾼다(consultation.ts correctDashaSequence). 어느 단계에도 없는 행성은 현재 마하다샤로 바꾼다(MO "목성 대운" → "달 마하다샤").
- 2B: 새 fortune/ziwei/claims.ts.
  - 유년사화는 연도가 하나 명시되고 '유년' 이 있는 문장에서만 그해 천간 사화로 바꾼다.
  - 삼합·대궁 기하는 연도와 무관하므로 연도 조건 없이 적용한다. 관계가 반대면 낱말을 바꾸고, 둘 다 아니면 문장을 지운다.
  - 기준궁에서 빼는 것: 관계어 바로 뒤 궁(대상), 블록이 유년·대한이 들어간다고 한 궁. 그 궁은 유년 명궁이라 삼합이 유년 이름(재백·관록)으로 불린다.
  - 결과: MA 변경 0(유년 혼합 프레임 오탐 2건을 걸렀다), MO 대궁→삼합 1건.
  - 남은 것: 연도 없는 사화 문장(MO "염정은 화권"), '유년 사화(유년사화)' 띄어쓰기 중복.
- 8B: strict 검증은 그대로 fail-closed 다. delivery.ts fallback 에서만 supplementSystemSources 가 sources 를 채운다.
  - 다른 블록이 이미 인용한 체계 ID 를 evidence 블록으로 옮긴다.
  - 그런 ID 가 없으면, 한국어 본문이 체계명을 말한 경우에만 그 체계의 첫 장 fact 를 넣는다.
  - 쓰지 않은 체계는 비워 둔다(MO ch13 류는 그대로 남는다).

## 단계 A 결과 (556d2af0e, 2026-10-11)

모두 장 fact 입구(`selectChapterFacts`)나 프롬프트 입력에서 붙인다. 저장된 context·뽑은 카드는 그대로다. 불변성 해시는 한 번 갱신했다(199행 중 103행: requests 103, prepare 17, validated 8, manifests 6, id 0).

- 1A: 새 `fortune/saju/luck-overlap.ts`. 사주 세운·월운 행에 `majorLuckOverlap`(그해 대운 기둥, 대운과 그 운이 함께 있어야 성립하는 합·충·형·파·해·삼합·방합)을 붙인다. 3자 형은 대운+세운(월운)+원국을 합쳐 판정한다. 키에 majorLuck 이 들어 있어 대운을 못 보는 등급에서는 함께 빠진다.
  - 가정: 월운의 대운은 월운 시작 해로 고른다(엔진의 연 단위 대운 경계와 같다).
- 2A: `ZIWEI_PALACE_RELATIONS`(명궁 기준 고정 순서, 대궁 +6·삼합 +4/+8). 대한·유년 행에 `facingPalace`·`trinePalaces`, palaces 래퍼에 `palaceRelations` 를 붙인다.
- 3A: 사주 base selector 에 `tenGodsByPillar.summary`. 기둥마다 {label, pillar, stemTenGod, primaryHiddenTenGod} 만 준다. 전체 표는 그것을 고른 장만 받는다.
- 4: 인생 장 `life-year`·`life-next-year` 는 계산 해·다음 해의 세운·유년·월운 행만, `life-decade` 는 현재+다음 대운을 본다. 상담 period 와 그 timeContract 문장은 질문 장(질문 배정·questionPolicy·question/answer 역할)에만 간다.
  - 가정: 문서의 "next 조건에 life-decade 추가" 대신 compare 분기를 썼다. next 분기는 현재 대운을 빼므로 '지금의 10년' 절이 근거를 잃는다.
- 9A: 새 `fortune/tarot/time-frame.ts`. 카드(`cards`·`tarotConsultation.cards`)마다 `timeFrame` 을 붙인다. 과거·현재·이어질 방향·시기 아닌 자리는 모두 '달력 시기 아님'이고, 한 달 스프레드의 1~4주 차만 '카드를 뽑은 날부터 N주 차'다.
- 12: 융합 ask 1장 제목을 `{주제} · 질문에 대한 답과 지금의 흐름` 으로 덮어쓴다(service.ts). 단일 체계 ask 는 그대로다.
- 13A: `askCalculatedData`(ask/prompt.ts). today*·monthlyLuck 을 요청 기간으로 줄이고, 인용되지 않은 fact 를 큰 것부터 빼서 CALCULATED_DATA 를 `ASK_EVIDENCE_CHAR_BUDGET`(64,000자) 안에 둔다. ASK_PROMPT_VIEW_GUIDE 는 palaces 래퍼 경로를 설명한다.
  - MO ch1 추정(호출 002 + 새 fact 선택, countTokens 비율 환산): 46,152 → 약 35,900 토큰. 단계 A 가 붙인 fact 는 상한 전 3,150자였다.
- 14A: 신궁은 self·inner·money·spending·expansion·life-nature·life-money 장에서만 따로 붙는다.
- 남은 것: 궁합 상대 차트(partnerChart) 유년 행에는 관계를 붙이지 않았다. ask 패킷은 설계대로 majorLuck 키(majorLuckOverlap 포함)를 뺀다.

## 남은 작업

경로 앞의 `fortune/`, `providers/` 는 `worker/yeongnyangi/` 아래다.

**단계 B. 결정적 후처리.** ✅ 끝남(위 '단계 B 결과'). 아래 표는 기록용이다.

| # | 결함 | 원인 위치 | 수정 |
|---|---|---|---|
| 6 | `월주(월주)` 같은 괄호 중복 | consultation.ts:274-295 correctProseMarkup 에 규칙이 없음 | 같은 말이 괄호로 반복되면 접는다. 서로 다른 값(X(漢字))은 둔다 |
| 5B | `metal`, `점수 41`, `(-4점)`, `('seasonalBalance' score -4)` | consultation.ts:221-269 redactInternalEvidence | 점수가 든 괄호는 통째로 지운다. 영어 오행어는 reading-presentation.ts:37 names 맵으로 바꾼다 |
| 1B | 근거 없는 戌未 '형' | 엔진은 미술파로 계산(life-book-ai-saju.js:127-143) | 계산에 없는 형은 미술파(未戌破)로 바꾼다. 丑 이 있을 때만 형으로 둔다 |
| 2B | 자미 대궁·삼합·유년사화 오기 | consultation.ts:353-364 가 궁만 검증 | 관계표·annualTransformations 와 대조해 바꾼다. 연도가 명시된 문장에만 적용 |
| 3B | 월지·월주 십성 오기 | correctNatalClaims(chapter.ts:105-107)에 규칙 없음 | 기둥이 명시된 십성만 계산값으로 바꾼다 |
| 7 | "목성 대운" | correctDashaSequence(consultation.ts:367-418) | 행성명이 붙은 대운을 마하·안타르·프라티안타르 단계로 바꾼다 |
| 8B | 체계 sources 누락 | chapter.ts:235-239 검사를 fallback 이 우회 | 본문이 이미 언급한 체계의 sources 만 보충한다 |

**단계 A. 결정적 데이터.** ✅ 끝남(위 '단계 A 결과'). 아래는 기록용이다.
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
node --test __tests__/ui/yeongnyangi-consultation.test.mjs __tests__/ui/yeongnyangi-natal-claims.test.mjs __tests__/ui/yeongnyangi-fusion-delivery.test.mjs __tests__/ui/yeongnyangi-prevention.test.mjs __tests__/ui/yeongnyangi-ask-validation.test.mjs __tests__/ui/yeongnyangi-benchmark-budget.test.mjs __tests__/ui/yeongnyangi-reading-invariance.test.mjs __tests__/ui/yeongnyangi-ziwei-palace-strength.test.mjs
npm run check:fast
```

- 토큰 측정: scratch `prevention_tokens.mjs` 패턴을 따른다. countTokens 만 쓰므로 비용은 0 이다.

## 모르는 것

- MO ch1 의 프라티안타르 행성 값은 호출자 정보 기준이다. 다샤 데이터로 다시 확인한다.
