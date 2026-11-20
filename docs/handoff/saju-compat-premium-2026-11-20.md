---
status: in-progress
updated: 2026-11-20
next: "A1 계산 모듈(saju-compat-premium-facts) + 테스트"
---

# 사주 고급 궁합(10,000원) 재구축 인수인계

## 요청 원문 (2026-11-20)
1. "사주 화면의 사주 궁합 분석은 5천원인데 현재 결제 후 제대로 생성이 안되는 버그가 있는데 기존 쓰레기 코드를 참조하지말고 현재 세팅된 로직으로 정확하게 만들어주길 바래 전생이라든지 그런 부분은 불필요하거나 정확하지 않으므로 정적으로 제공해주면 될것 같다."
2. "그냥 가격도 만원으로 올리도록해 그리고 정확하게 버그 없이 생성되도록해주고 기존 정적으로 생성하는 기능은 간단 연예인 궁합이나 유명인 궁합 등은 무료로 볼 수 있도록해줘 이 궁합 서비스는 고급 궁합 기능이 되어야하며, 상대방의 바람끼라든지 이미 세팅된 계산 값으로도 볼 수 있도록해줘"
3. "그외에도 최고의 서버 전문가로서 llm 상담들이 결제 이후에 제공이 안되어서 매출을 날리는 문제가 없도록 문제점을 분석해서 해결해도 함께 해줘"
4. "그리고 새로 만든 사주 궁합 진입점을 고급스러운 달빛 예화 느낌으로 만들어줘"

## 첫 행동
- 작업 위치는 이 워크트리다: `D:\Development\codedestiny-worktrees\saju-compat-premium-20261120-175330`, 브랜치 `wt/saju-compat-premium-20261120-175330`, 기점 `34f58616f`.
- 루트 체크아웃은 다른 세션과 공유한다. 루트에서 `reset`·`stash`·`checkout --`를 쓰지 않는다.
- 이 문서의 단계 체크박스를 보고 `next`부터 진행한다.
- 새 워크트리에서 check:fast가 데이터 누락으로 실패하면 `npm run fortune:build-data`부터 돌린다.

## 승인 상태
- 2026-11-20 사용자가 계획(`C:\Users\user\.claude\plans\witty-greeting-minsky.md`)을 승인했다.
  - 승인 범위: 코드 수정과 main 머지·push(스테이징까지).
  - 운영 승격은 승인되지 않았다.
  - 과금 LLM 실호출은 승인되지 않았다. 검증은 전부 mock으로 한다.
  - 실결제·운영 DB 쓰기·환불 실행은 금지다.
- 사용자 결정(AskUserQuestion, 2026-11-20):
  1. 고급 궁합은 App Router 새 페이지로 만든다. 사주 탭에는 진입만 둔다.
  2. 기존 정적 궁합 결과는 무료로 공개한다. 유명인 궁합을 새로 만들지는 않는다.
- 이미 확정된 정책(다른 세션 문서 `docs/handoff/paid-retry-delivery-2026-11-19.md`, 사용자 결정 2026-11-19):
  - 유료 LLM은 실패하면 먼저 "다시 시도"를 무료로 제공한다.
  - 생성 시각에서 7일이 지나거나 고객이 요청하면 그때 환불한다.
  - 대표 7종(`RETRY_FIRST_POLICY`)은 이미 이 정책을 따른다. 새 상품도 이 정책으로 만든다. 즉시 환불로 만들지 않는다.

## 작업 규칙과 함정
- 🔴 기존 `worker/routes/saju-compat-basic.js`, `worker/lib/saju-compat-schema.js`, `worker/lib/saju-compat-prompts.js`, `js/saju-compat-flow.mjs`, `js/saju-engine.js`의 LLM 경로는 템플릿으로 참조하지 않는다(사용자 지시). 삭제도 하지 않는다. 기존 구매자 보관함과 Toss 네이티브가 이 경로를 쓴다.
- 템플릿은 연애 비책이다.
  - 라우트: `worker/routes/love-secret-ai.js`
  - 프롬프트: `worker/lib/love-secret-ai-prompt.js`
  - 계산: `worker/lib/love-secret-ai-calculation.js`, `worker/lib/love-secret-ai-facts.js`
  - 화면: `app/love-secret-ai/` (`love-secret-retry.ts` 포함)
  - 테스트: `__tests__/ui/love-secret-paid-delivery.behavior.test.js`
  - 이미 다시 시도 우선 정책이 적용된 상태이므로 그 구조를 그대로 따른다.
- 결정적 궁합 계산 재료:
  - `buildSajuLoveCompatibility` (`worker/lib/master-love-codex-compat.js:648`)
  - `calculateLifeBookAiSaju` (`worker/lib/life-book-ai-saju.js:701`, `timeUnknown` 지원)
  - `approvedCompatSupportFacts` (`worker/lib/saju-authority-consumer.js:176`)
  - 도화·홍염 강도는 `love-secret-ai-facts.js:244,290`의 방식을 따른다.
- 새 유료 LLM 서비스는 아래 두 곳에 반드시 등록한다. 둘 다 fail-closed라 빠뜨리면 검사가 실패한다.
  - `worker/lib/consultation-recovery-registry.js`의 `PAID_LLM_DELIVERY_CONTRACT`와 `PAID_LLM_DELIVERY_TESTS`
  - `scripts/verify-paid-llm-delivery-contract.mjs`의 `RETRY_FIRST_POLICY` 분류
- LLM 안전 규칙 17:
  - 분량 하한은 목표의 80% 이하로 둔다.
  - 출력 토큰은 목표 상한에 머리말과 thinking 몫을 더한 값 이상으로 잡는다.
  - 형식 위반은 거부하지 말고 결정적으로 교정한다.
- 바람기 지표는 계산값(근거 항목 목록과 낮음·보통·높음 등급)으로만 판정한다. 단정·비난 표현은 쓰지 않는다. LLM은 그 근거만 해석한다.
- 전생 인연은 LLM 없이 정적 표로 만든다. 일주와 상대 년주를 교차한다.
- 메모리의 함정 목록(결제·정적 셸·가드·윈도우 CRLF)을 지킨다. index.html을 고치면 `npm run sync:public`을 돌리고 미러도 커밋한다.

## 감사 결과: 결제 후 미제공 경로 (C·D단계 입력)
다른 세션의 paid-retry R10("계약 목록 나머지 서비스에 다시 시도 우선 정책")이 같은 파일을 다룬다. 해당 파일은 `checkpoint-refund-guard`, `paid-delivery-stuck`, `paid-narrative-delivery`, 계약 검사기다. 그래서 C·D는 이 워크트리에서 따로 구현하지 않고 R10에 넘긴다. 코드를 읽어 확인한 내용이다.
1. `runPaidNarrativeDelivery`의 `onExhausted`를 넘기는 곳은 `worker/lib/feature-question-delivery.js:71` 하나뿐이다. 서술형 상품 12종은 시도를 다 써도 환불 경로가 없다.
2. `paid-narrative-delivery.js:273`은 저장된 장이 0개일 때만 소진 처리를 한다. 일부 장이 저장된 뒤 소진되면 영구히 `partial` 상태로 남는다.
3. `worker/lib/checkpoint-refund-guard.js:25-28`
   - 서술형 실행을 attempts나 `reviewRequired` 확인 없이 `recoverable`로 판정한다.
   - 하드코딩된 14개 키는 `includeResumable` 게이트를 거치지 않는다.
   - 그 결과 `service-execution-task.js:847-852`가 600초씩 미루기만 반복해 영구 pending이 된다.
4. `paid-narrative-recovery-task.js:11,22`는 24시간 뒤, 그리고 `reviewRequired`가 되면 재개를 멈춘다.
5. 레코드가 생기기 전 4xx로 끝나는데도 결제가 이미 차감된 경우:
   - `saju-compat-basic.js:134`(시간 모름이면 시주가 비어 422, 클라이언트는 이를 TRANSPORT 재시도로 분류: `js/saju-compat-flow.mjs:127`)
   - `yoga-guru.js:81`, `oracle.js:145`, `animal-totem.js:682`
   - feature-question seed의 422(`feature-question-delivery.js:58-63`)
   - `ziwei-deep-report.js:~765`
   - love-secret `REPRESENTATIVE_FACTS_MISMATCH` 409(`love-secret-ai.js:1793`, restore 누락)
6. `KNOWN_STUCK_SETTLE_GAPS` 12개 서비스는 isolate가 죽으면 정산 경로가 없다.
7. 외부 정책 결정이 필요한 것: Toss 네이티브, palm-reading 카드 환불, fortune-chat 단건 카드 환불, 스토리지 장애 시 503.

## 설계 요약
상세는 승인된 계획 파일에 있다.
- featureKey `saju-compat-premium`, 100코인(10,000원), reason "사주 고급 궁합".
- 클라이언트는 두 사람의 출생 입력(날짜, 양력·음력·윤달, 시각 또는 모름, 성별, 이름)과 관계 유형만 보낸다. 명식과 facts는 서버가 계산한다.
- 결제 전 `/prepare`(validate)로 입력을 검증한다. 검증을 통과해야만 결제창을 연다.
- 전달 방식:
  - 완성본만 전달한다.
  - 실패하면 무료로 다시 시도하게 한다.
  - 7일이 지나거나 고객이 요청하면 환불한다.
- 결과 화면 구성:
  - 정적 계산 카드: 궁합 축 점수, 오행 보완, 합충, 상대 바람기 지표와 근거, 전생 인연
  - LLM 4장: 관계 총론 / 성향·소통 / 신뢰·이성 기질 / 시기·실천
- 진입점: 사주 탭의 무료 정적 궁합 결과 아래와 SEO 소개 페이지 `/saju/compatibility/`에 둔다. 디자인은 고급스러운 달빛 예화 톤이다(`docs/context/design-canon.md` §달빛 예화 기본 UI 계약, `DESIGN.md` §2, `styles/yehwa-motifs.css`의 생성 마스크 재사용).

## 단계
- [ ] A1 계산 모듈 `worker/lib/saju-compat-premium-facts.js`와 테스트 `__tests__/worker/saju-compat-premium-facts.test.js` → check:fast → 커밋
- [ ] A2 카탈로그(paid-feature-registry·billing·saju-service-catalog·service-registry), 프롬프트, 라우트, 모델, worker 배선, 계약·RETRY_FIRST 등록, paid-delivery 테스트 → 커밋
- [ ] A3 App Router 입력·결과 페이지, dev-preview fixture, 보관함 등록, SEO 소개 페이지 갱신 → 커밋
- [ ] B 사주 탭: 결제 없이 정적 궁합 결과를 보여 주고, 그 아래 달빛 예화 톤의 고급 궁합 CTA를 둔다(sessionStorage 프리필). 그다음 sync:public → 커밋
- [ ] A4 화면 검증: headed 브라우저로 `?preview=success|failed`와 사주 탭 무료 궁합(시간 모름 포함)을 확인하고, visual-checker로 판정한다.
- [ ] M 머지와 push: main으로 머지 → check:pre-push → push → CI 1회 확인 → `verify:staging -- --sha=<SHA>`
- [ ] C·D 감사 결과를 paid-retry R10에 넘긴다. 상대 세션이 끝났으면 이어서 구현하고, 아니면 보고만 한다.
- [ ] 정리: 이 문서를 `status: done`으로 바꾸고, 워크트리를 배수하고, 임시 파일을 지운다.

## 실측 (단계마다 추가)
