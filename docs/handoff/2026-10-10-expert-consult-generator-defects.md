---
status: active
updated: 2026-10-10
next: "공통 1단계: worker/lib/paid-report-length.js 를 문장 경계 자르기로 바꾸고 paid-report-length.test.js 에 실패 재현 테스트를 먼저 추가한다."
---

# 전문가 상담(R6 자미·R7 점성술·R8 베다) 생성기 결함 수정

## 왜

"고치지않은 결함에 대해서 각각 수정할 수 있도록 인수 인계 문서를 만들어서 작업할 수 있도록해줘" (2026-10-10). R6·R7·R8 은 2026-10-10 실호출에서 모두 불합격했다. 결과 원문은 `build-cache/llm-sample-review-20261009/R6|R7|R8/result.md` 에 있다.

## 지금 상태

- 아직 고치지 않았다. 규칙(실호출 승인, 원값 금지, P1·P2 만 사용 등)은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 그대로 따른다.

## 남은 작업

공통 단계(1~4)를 먼저 하고, 서비스별 단계(5~7)를 뒤에 한다. 단계마다 mock 테스트를 추가하고 check:fast 를 통과시킨 뒤 커밋한다.

- [ ] **1. 잘림.** `worker/lib/paid-report-length.js:4-29` 가 글자 단위로 자른다.
  - 마지막 완결 문장에서 끊고, 열린 `**` 를 닫는다.
  - 호출처: ziwei-ai.js:1866, vedic-ai.js:1501, astrology-ai.js:1213·1217.
  - `scripts/verify-llm-generation-resilience.mjs:1167·1181` 이 호출 문자열을 고정하고 있으니 함께 고친다.
- [ ] **2. "시스템" 치환.** 넓은 `/시스템/g` 치환 때문에 문장이 깨진다.
  - 위치: ziwei:1608, astrology:114·1099, vedic:1069.
  - 좁은 패턴 `시스템\s*(?:메시지|지시)` 하나를 worker/lib 공유 함수로 둔다(정본은 아래).
  - 잠재 대상: sukuyo-compatibility-ai.js:52, love-secret-ai-prompt.js:9.
- [ ] **3. 최소 분량.** valid 가 40자 이상인지만 본다.
  - 위치: ziwei:1827-1829·1906, astrology:1187-1190·1230, vedic:1466-1474·1512-1513(minTotalChars:0).
  - 그룹 minChars 에 못 미치면 기존 예산 안에서 1회 보강한다. 그래도 모자라면 거부하지 말고 배달한다(ai-and-db.md:125).
  - 다만 15,000자에 못 미친 결과를 ok 로 표시하지 않는다(R8 사례).
- [ ] **4. 공통 계약.** fortune-reasoning-contract.js:84-110 의 "표에 적힌 이름 그대로" 규칙 때문에 영문 라벨이 본문으로 옮겨진다. 호칭 규칙도 없다.
  - ziwei·astrology·vedic·sukuyo·saju 가 모두 이 계약을 쓴다.
- [ ] **5. R6 자미 (ziwei-ai.js).**
  - ziwei-hanja.js:123-133 의 한자 오삽입: "에 대한大限", "함지에咸池".
  - 헤더 L1372-1398 에 기준 연도가 없다("내년 2026"). 다음 해 유년도 계산해 넣는다.
  - 자화와 생년사화, 함과 함지의 구분 설명을 L1136-1163 에 넣는다.
  - reading_guide L170 이 답을 먼저 쓰게 한다.
  - `<br>` 을 정리한다.
  - 한자 지시가 L1064 와 L1423 에서 반대다. 하나로 맞춘다.
  - paid-narrative-candidate.js:12-21 이 괄호로 끝나는 근거 줄을 지운다.
- [ ] **6. R7 점성술 (astrology-ai.js).**
  - L998 "미입력" 대체값과 L990 '미루는 편이 나은 일' 문구에서 가짜 이름이 생긴다.
  - L1107-1132 지침이 소제목으로 새어 나온다.
  - houseRulers 가 없다(L830-858).
  - 트랜짓이 한 시점뿐이다(L791-828). 분기별로 계산하거나, 분기별 단정을 금지한다.
  - L1633 행성명을 한국어로 바꾼다.
  - 맺음말 요구 L892·900 이 L1115 와 충돌한다.
- [ ] **7. R8 베다 (vedic-ai.js).**
  - scores 예시가 0 이고 채점 지시가 없다(L996-1004).
  - 결론 규칙이 없고, 다음 AD 전환과 고차라를 근거로 쓰지 않는다(L965-994).
  - dignity 영문이 그대로 나간다(L908-960).
- [ ] **8. 재실호출.** R6·R7·R8 을 각 1회 돌린다. 각각 승인이 필요하다. 약 7·7·5회, 합계 약 $0.22.

**끝난 판정:** 다음이 모두 0건이어야 한다.
- 문장 중간 잘림
- 깨진 치환어
- 영문 라벨
- `<br>`
- 잘못된 연도

그리고 R8 은 15,000자 이상이어야 한다.

## 정본 예시

- 좁은 치환: `worker/routes/new-year-ai.js:184-189`, `worker/routes/karma-destiny-ai.js:388-394`

## 함정

- 1단계는 공유 함수다. 세 라우트의 기존 테스트가 함께 움직인다.
- 4단계 계약은 사주·숙요에도 걸린다. 그 서비스들의 테스트도 같이 돌린다.

## 검증

```
npx jest __tests__/worker/paid-report-length.test.js __tests__/worker/ziwei-paid-delivery* __tests__/worker/astrology-paid-delivery* __tests__/worker/astrology-ai-prompt-domain-templates* __tests__/worker/vedic-paid-delivery* __tests__/worker/vedic-ai-prompt-domain-templates*
npm run check:fast
node build-cache/llm-sample-review-20261009/harness/r6.mjs --plan   # 0회, 그다음 승인받고 실행
```

- 오프라인 확인: 기존 `R6|R7|R8/raw.json` 을 새 후처리에 통과시킨다. 비용은 0 이다.

## 모르는 것

- 트랜짓을 분기별로 계산할지, 분기별 단정을 금지할지 정해지지 않았다. 사용자에게 묻는다.
