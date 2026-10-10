---
status: active
updated: 2026-10-11
next: "[최적화 문서](2026-10-10-love-tarot-call-optimization.md)가 status: done 인지 확인한다. done 이면 B1c 속마음 타로를 --plan 견적 → 1회 승인 → 실행(부분당 1회) → 채점 → 탭·PDF 반영 순으로 진행하고, 이 문서를 done 으로 닫는다."
---

# 기본 운세 LLM 결과(B1~B7) 실호출 → 결과 페이지·PDF 추가

## 왜

"꿀꿀 운세 타로라든지 사주 화면에서 궁합이라든지 애니멀 토템이라든지 사주, 숙요, 자미두수, 베다점에도 각 기본 운세의 상담에 대한 llm 결과가 없는데 이 부분들도 이후에 지금 llm 결과에서 볼 수 있도록 조치해" (2026-10-10)

타로에 대한 사용자 결정: "모든 타로 llm를 호출해서 결과를 넣어주길 바라며, love-reading은 … 원인 파악후 llm 비용 최적화를 먼저 한 이후에 진행"

## 지금 상태

- 9개 항목 중 8개(B1a·B1b·B2~B7)를 실행하고 채점했다. B1c 만 최적화 문서 완료를 기다린다.
- 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다. 서비스마다 1회씩 승인받고, 원문을 전달하고, P1·P2 만 쓴다.
- **추가 규칙(사용자, 2026-10-11): "최소한의 호출로 진행하도록해 너무 비용이 크다."** B1a 부터 부분당 실호출 1회만 한다. 재시도는 하지 않고, 하네스 상한은 조각 수로 둔다. 그래서 첫 거부에서 멈춘 부분 결과도 그대로 채점한다. B1c 도 같은 정책을 쓴다.
- 결과 페이지: https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV (v6). 기본 상담 탭 8개와 "꿀꿀 기본 명리 타로 · LLM 없음" 탭을 더했다. PDF 8개(B3·B2·B6·B7·B5·B4·B1a·B1b)도 더했다.
- 원장: 이 문서 8건 합계 51회, $0.3391. 전체 누계는 262회/$2.64 이고, 다른 세션 호출을 포함한다. 상한은 400회/$8 이다(사용자 승인).

| ID | 서비스 | 호출 | 비용 | 최종 상태 | 판정 | 핵심 사유 |
|---|---|---:|---:|---|---|---|
| B3 | 애니멀 토템 | 1 | $0.0029 | COMPLETED | 조건부 합격 | 질문 답이 한 문단(913자)뿐이다. 서운함의 원인을 사용자 고집으로 돌린다. |
| B2 | 사주 궁합 basic | 5 | $0.0191 | COMPLETED | 조건부 합격 | 라벨 결함 1건: `saju-compat-prompts.js:38` 의 ELEMENT_SAME 이 "일간 오행이 같아"라고 쓴다. 그래서 "두 분 일간 모두 금"이라는 사실 오류가 생긴다. |
| B6 | 자미 기본 상담 | 10 | $0.0923 | COMPLETED | 불합격 | 부분마다 명반 요약을 처음부터 반복한다. `<p>` 가 노출된다. '내년(2026년)'이라고 잘못 쓴다. minChars 미달 본문을 수락한다. |
| B7 | 베다 기본 상담 | 11 | $0.0750 | COMPLETED | 불합격 | part-10 이 문장 중간에서 끊긴다. 결론이 부분끼리 다르다. 하우스 룰러가 틀린다. `</div>` 가 노출된다. |
| B5 | 숙요 기본 상담 | 10 | $0.0502 | COMPLETED | 조건부 합격 | 한 줄 답이 없다. 10부가 같은 내용을 반복한다. 오늘의 신호를 커리어 근거로 쓴다. 숙 배정 OFFSET 은 확인이 필요하다. |
| B4 | 사주 AI 상담 | 4 | $0.0613 | REFUNDED | 불합격 | life_domains 가 2회 연속 검증에 실패해 자동 환불됐다. 오행 인과 금지 패턴 위반과 번호 소제목이 원인이다. |
| B1a | 오라클 타로 3장 | 6 | $0.0230 | DELIVERY_REVIEW_REQUIRED | 불합격 | closingLine 이 반복으로 거부돼 5/17 에서 멈췄다. 부분마다 3장을 다시 해석한다. |
| B1b | 마인드스캔 | 4 | $0.0153 | DELIVERY_REVIEW_REQUIRED | 불합격 | evidenceHash 를 잘못 옮겨 거부돼 3/25 에서 멈췄다. 같은 내용을 반복하고 `<br>` 가 노출된다. |
| B1c | 속마음 타로 | — | — | 대기 | — | 최적화 문서가 끝난 뒤에 돌린다. |

- 원문: `build-cache/llm-sample-review-20261009/<ID>/result.md` (각 파일 끝에 "## 판정"). 상세 근거는 같은 폴더 `findings.md` B 줄이다.
- 하네스(ignored): `harness/pn.mjs`(엔진+인메모리 저장소), `harness/b3.mjs`·`b2.mjs`·`b6.mjs`·`b7.mjs`·`b5.mjs`·`b4.mjs`·`b1a.mjs`·`b1b.mjs`. b1a·b1b 에는 최소 호출 래퍼(부분당 1회 + 상한)가 들어 있다.
- 반영 스크립트: `pdf/make_pdfs.py` 에 B 제목과 `render_result_md` 를 더했다. `<ID>/result.md` 를 판정·입력 장과 본문 장으로 나눈다. `harness/kkul_page.py` 에는 B 탭, `KK0` "LLM 없음" 탭을 더하고 PDF ID 정규식을 소문자까지 넓혔다.
- 게시 메모: 게시본의 R6·R7 탭은 그대로 두었다. 로컬 R6·R7 은 다른 세션이 다시 생성한 것이라 이번 게시에 넣지 않았다.

### 후속(범위 밖, 고치지 않음)

1. **유료 서사 엔진 공통.** 부분 프롬프트가 제목 한 줄뿐이다. 그래서 모델이 부분마다 상담 전체를 다시 쓴다(B6·B1a·B1b, B5·B7 일부).
   - `paid-narrative-delivery.js:175` 는 minChars 미달 본문을 수락한다.
   - 64자리 evidenceHash 를 되풀이시키는 계약이 정상 응답을 무작위로 버린다.
   - 본문에 원문 `<p>`/`<br>`/`</div>` 가 섞인다.
2. **개인정보.** B4 analysisResult 의 calculationMeta·daewunBridge 에 출생일시 원본이 들어 있고, 이것이 Gemini 로 간다. B6·B7 questionFacts 와 B7 vedicResult 도 마찬가지다.
3. **B4.** 프롬프트(일/돈/건강 리듬)가 UNSUPPORTED 검증기와 충돌한다. allowRepair:false 라 재시도할 때 실패 이유가 전달되지 않는다.
4. **B2.** ELEMENT_SAME/ELEMENT_KE 라벨이 엔진(주도 오행 비교)과 맞지 않는다.
5. **B5.** 숙 배정 OFFSET 16 이 숙요경 대응과 2칸 다르다. 의도인지 확인해야 한다.
6. **마인드스캔.** 5쌍을 7위치로 확장할 때 카드를 재사용한다.
7. **B6.** 유년 표기가 틀린다. B7 은 출력이 끊긴다.

## 남은 작업

모두 Gemini gemini-2.5-flash 이고 `runPaidNarrativeDelivery` 를 탄다.

**공통 하네스(새로 만든다).**
- 핸들러(코인·결제·DB)는 거치지 않는다. 다음 순서로 어댑터를 직접 돌린다:
  1. seed 로 시작한다.
  2. 상태는 `paidNarrativeInsert`(worker/lib/paid-narrative-delivery.js:31)로 만든다.
  3. 조각마다 `adapter.produce(task, state)` 를 부른다.
  4. 끝나면 `render` 를 부른다.
- 서버 재개용 등록부는 `worker/lib/paid-narrative-adapters.js:51-61` 이다.

| 순서 | ID | 서비스 | 진입 | 예상 호출 |
|---|---|---|---|---|
| 1 | B3 | 애니멀 토템 | routes/animal-totem.js:600-632 | 1~2 |
| 2 | B2 | 사주 궁합 basic | routes/saju-compat-basic.js:52-102 (P1+P2) | 4~8 |
| 3 | B6 | 자미 기본 상담 | lib/feature-question-delivery.js + ziwei-ai-prompt.js | 10~20 |
| 4 | B7 | 베다 기본 상담 | 같은 엔진 + vedic-ai-prompt.js | 10~20 |
| 5 | B5 | 숙요 기본 상담 | 같은 엔진 + sukuyo-ai-prompt.js | 10~20 |
| 6 | B4 | 사주 AI 상담 | fortune.js:614 runSajuAISectionWaves, saju-ai-prompt.js:52-120 | 5~10 |
| 7 | B1a | 오라클 타로 | tarotOracleNarrativeAdapter + seedTarotOracleNarrative (3장) | 17~34 |
| 8 | B1b | 마인드스캔 | mindscanNarrativeAdapter + seedMindscanNarrative | 25~50 |
| 9 | B1c | 속마음 타로 | loveTarotNarrativeAdapter + seedLoveTarot | 🔴 [최적화 문서](2026-10-10-love-tarot-call-optimization.md) 완료 후 9~18 |

- [x] **0. 상한 승인.** 400회/$8 로 올렸다(2026-10-10 승인).
- [ ] **1~9.** 8/9 완료. 남은 것은 B1c 다. 항목마다 다음 순서로 진행한다:
  1. `--plan` 으로 0회 견적을 낸다.
  2. 승인을 받는다.
  3. 1회 실행한다.
  4. 채점한다.
  5. `<ID>/result.md` 절대 경로를 전달한다.
- [ ] **결과 반영.** 8개 항목과 LLM 없음 탭은 v6 에 반영했다. B1c 만 남았다. B1c 를 반영할 때는 다음 순서로 한다.
  1. 게시본을 먼저 읽는다(다른 세션 탭 보존).
  2. B1c 를 make_pdfs.py `TITLES`/`B_ITEMS` 와 kkul_page.py `ITEMS` 에 더한다.
  - `pdf/make_pdfs.py` 에 제목을 더한다.
  - `harness/kkul_page.py` ITEMS 에 탭을 더한다.
  - 같은 URL 에 다시 게시한다.
  - 꿀꿀 기본 명리 타로 모달은 LLM 이 없다(결정적 템플릿). 탭에는 "LLM 없음"으로만 적는다.

**끝난 판정:** 9개 탭과 PDF 가 결과 페이지에 있고, 항목마다 판정(합격/조건부/불합격)이 적혀 있다.

## 정본 예시

- 어댑터를 구동하는 mock: `__tests__/worker/animal-totem-paid-delivery.test.js`, `__tests__/worker/love-tarot-delivery.route.test.js`

## 함정

- 카드나 패를 뽑는 곳(애니멀 토템, 타로)은 브라우저의 Math.random 대신 고정 배열을 넣는다.
- B4 는 `createGeminiContextCache` 가 하네스 펜스에 막힌다. 그래서 null 을 돌려주는 스텁이 필요하고, runSajuAISectionWaves 를 export 해야 한다.
- B6·B7 차트는 r6·r8 하네스의 P1 차트를 재사용한다.
- Artifact `files` 는 D: 경로를 거부한다. scratchpad 로 복사해 `root` 로 게시하고, 게시가 끝나면 복사본을 지운다.
- 후속(범위 밖): 애니멀 토템 five 모드 가격이 코드는 50, `paid-feature-registry.js:303` 은 30 이다.

## 검증

```
python build-cache/llm-sample-review-20261009/pdf/make_pdfs.py
python build-cache/llm-sample-review-20261009/harness/kkul_page.py
node <scratchpad>/birthcheck.mjs build-cache/llm-sample-review-20261009/pdf/kkul-results.html   # 출생값 0건
```

## 모르는 것

- 숙요 basicResult 와 사주 sajuResult 를 P1 으로 만드는 경로가 확인되지 않았다. 핸들러 입력 형태를 먼저 읽는다.
