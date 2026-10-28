---
status: done
updated: 2026-10-09
next: "실 LLM 표본 검수는 별도 승인과 호출 예산을 받은 뒤 아래 12건을 한 건씩 진행한다."
---

# 유료 상담 LLM 결과 표본 검수 인수인계

## 요청과 현재 경계

- 사용자 요청: “이 작업하고 난 이후에 영냥이 상담의 고등어 이외에도 다른 llm 상담과 다른 대표 상담 llm 결과를 하나씩 확인할 수 있도록 해줄 인수인계 문서를 만들어줘”.
- 이 문서는 **다음 작업의 실행표**다. 작성 과정에서 실 LLM, 실결제, 운영 DB 쓰기, 환불은 실행하지 않았다. 기존 mock/CI 통과는 실제 생성 문장의 품질 증거가 아니다.
- 고등어는 이번 표본 목록에서 제외한다. 고등어 결과의 실 LLM 검수 완료 여부는 이 문서에서 새로 단정하지 않는다.
- 코드 기준은 이 문서 작성 시점의 `main` `4fd089a2b597a0ea7251f8c374e933d7c7c19bf9`다. 실행 전에 `git fetch origin main`으로 새 커밋과 배포 SHA를 다시 확인한다. 가격·이용권·월정석·단건 결제 조건은 `worker/lib/paid-feature-registry.js`와 현재 서버 응답을 정본으로 사용하며 이 문서의 표본 수를 결제 승인으로 해석하지 않는다.

## 확인할 결과: 12건, 각 1건

영냥이 3건은 서로 다른 질문군과 근거 체계를 선택한다. 종류와 추가 질문 계약은 [질문 상담 계약](../context/yeongnyangi-question-consultation.md)의 생선 표와 질문군 표를 따른다. 질문은 예시이며 실제 입력은 해당 서비스의 유효성 검사와 기존 테스트 fixture에 맞춰 확정한다.

| 번호 | 결과 | 대표 입력과 확인 초점 |
| --- | --- | --- |
| Y1 | 영냥이 연어 | 이직 또는 진로 선택 한 건. 목표 시기·선택지·제약을 넣고, 답이 질문에 직접 닿는지 확인한다. |
| Y2 | 영냥이 광어 | 두 사람의 생활·돈·갈등 조율 한 건. 두 프로필의 근거가 섞이지 않고 비교되는지 확인한다. |
| Y3 | 영냥이 참치 | 현재와 다음 장기 시기 전환 한 건. 실제 계산된 대운·대한·다샤 중 사용된 근거와 시기를 대조한다. |

다음 9건은 서로 다른 대표 상품의 결과 화면과 저장·재열람을 확인한다. canonical 키와 진입점은 [유료 LLM 전달표](paid-llm-delivery-matrix-20260915.md) 및 `worker/lib/paid-feature-registry.js`를 실행 시점에 재확인한다.

| 번호 | 상품 / canonical 키 | 진입점 | 결과에서 볼 것 |
| --- | --- | --- | --- |
| R1 | 연이 운명 상담 `fortune-chat-consultation` | `/fortune-chat/` | 다정한 상담 톤, 질문의 답, 저장된 대화의 재열람 |
| R2 | 네오 팩폭 전략실 `neo-operation-room-consultation` | `/neo-operation-room/` | 근거 있는 실행 전략과 모욕 없는 직설, 현실 점검의 연결 |
| R3 | 마스터 인연의 서 개인 `master-love-codex` | `/master-love-codex/` 개인판 | 개인의 관계 패턴·사주/자미 근거, 장별 완성·재열람 |
| R4 | 마스터 인연의 서 궁합 `master-love-codex-compat` | 같은 화면의 궁합판 | 두 사람 근거 분리, 관계의 접점과 조율 행동 |
| R5 | 초융합 `fusion-fortune-consultation` | `/fusion-fortune/` | 서로 다른 체계의 근거가 섞이지 않고 종합되는지 |
| R6 | 자미두수 전문가 `ziwei-ai-consultation` | `/ziwei-ai/` | 궁·사화 계산과 해석의 연결 |
| R7 | 서양 점성술 `astrology-ai-consultation` | `/astrology-ai/` | 차트·하우스·행성 근거와 결과 섹션의 연결 |
| R8 | 베다 전문가 `vedic-ai-consultation` | `/vedic-ai/` | 라그나·다샤·하우스 근거와 쉬운 설명 |
| R9 | 인생의 책 `life-book-ai-consultation` | `/life-book-ai/` | 장별 일관성, 누락·중복 없는 완성본과 재열람 |

## 한 건씩 실행하는 순서

1. `Set-Location D:\Development\code-destiny`에서 `git fetch origin main` 후 `git rev-parse origin/main`을 기록한다. 공유 루트가 미커밋 상태면 덮어쓰지 말고 깨끗한 워크트리에서 읽기 전용 검증한다. 운영 Pages `/version.json`과 Worker `/api/version`의 SHA가 검사하려는 코드와 같은지 확인한다.
2. 아래 mock 검사를 먼저 실행하고 결과를 기록한다. 이는 배선·저장·근거 계약 확인이며 실제 문장 품질 확인과 구분한다.
3. 실 LLM 표본 호출 **전에** 사용자에게 정확한 대상, 건수, 예상 비용 상한, 환경, 테스트 계정·결제/이용권 처리 방법, 운영 DB 쓰기 여부를 제시하고 **이번 표본 실행에 대한 별도 승인**을 받는다. 승인 범위를 넘는 자동 재시도·추가 상품 호출·실결제는 하지 않는다. 가능하면 개인 정보가 없는 고정 시험 프로필을 쓴다.
4. 승인된 환경에서 Y1→Y3, R1→R9를 **한 건씩** 실행한다. 각 건의 첫 결과를 저장·재열람한 뒤 다음 건으로 간다. 정상 저장본이 있으면 비용을 들여 같은 결과를 재생성하지 않는다. 실패 시 원인과 저장 상태를 먼저 확인한다.
5. 각 결과를 아래 판정표로 검수한다. 문제가 있으면 해당 상품의 근거 입력, 프롬프트 버전, 결과 ID, 저장 상태를 함께 기록한다. 사용자 식별자·생년월일·원문 비밀정보는 문서나 이슈에 남기지 않는다.

## 결과 판정표와 기록 양식

각 표본은 `PASS / FAIL / 미검증` 중 하나로 적고, mock·스테이징·운영 실호출을 혼동하지 않는다.

| 항목 | 확인 기준 |
| --- | --- |
| 질문 적합성 | 첫 부분에서 실제 질문·판단 대상·기간을 다루며, 다른 상품이나 질문에 대한 일반론으로 흐르지 않는다. |
| 계산 근거 | 사용한 사주·자미·베다·점성술·타로 근거를 입력/계산 스냅샷과 대조한다. 없는 날짜·카드·행성·확률을 만들지 않는다. |
| 설명 품질 | 어려운 용어를 풀어주고, 강점과 주의점, 현실적인 선택/행동을 함께 제시한다. 과장·공포·100% 단정·문단 반복이 없다. |
| 상품 차이 | 연어·광어·참치의 질문 범위와 추가 질문 계약, 개인판·궁합판의 두 사람 구분, 캐릭터별 말투가 유지된다. |
| 전달 품질 | 장/섹션이 빠지거나 복제되지 않고, 저장 후 새로고침·기록 재열람에서도 같은 본문이 나온다. 미완성·오류 상태를 완료로 표시하지 않는다. |
| 비용·안전 | 실제 호출 횟수와 비용을 기록하고 승인 한도를 넘지 않는다. 실제 결제·운영 DB 변경은 별도 승인 범위에서만 한다. |

기록 한 줄: `번호 | 환경 | 코드/배포 SHA | 입력 fixture ID | 결과 ID(마스킹) | 프롬프트 버전 | 호출/비용 | 저장·재열람 | 판정 | 근거 화면/로그 경로 | 후속 조치`. 결과 전문 대신 개인정보를 가린 발췌와 문제 위치를 남긴다. **근거를 못 찾으면 추측하지 말고 사용자에게 묻는다.**

## 재현 가능한 무과금 검증

아래 명령은 mock/정적 검증이다. 통과해도 실 LLM 문장 품질이 확인된 것은 아니다.

```powershell
Set-Location D:\Development\code-destiny
node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/yeongnyangi-consultation-quality.test.mjs __tests__/ui/yeongnyangi-consultation-kinds.test.mjs
npm run verify:ai-consultation-flows
npm run check:fast -- --plan
npm run check:fast
```

대표 상품의 저장·재열람 회귀는 `__tests__/worker/guardian-paid-delivery.test.js`, `neo-paid-delivery.test.js`, `master-love-codex-paid-delivery.test.js`, `fusion-paid-delivery-route.test.js`, `ziwei-paid-delivery.test.js`, `astrology-paid-delivery.test.js`, `vedic-paid-delivery.test.js`와 인생의 책 관련 검사를 현재 경로에서 확인해 선택한다. 테스트를 새로 만들거나 기대값만 바꾸어 실결과 문제를 덮지 않는다.

## 다음 세션의 전달 규칙

- 저장소 규칙대로 다른 세션의 미커밋 변경을 보존한다. 동시 작업이면 안전 워크트리에서 작업하고, 검증한 변경만 `main`에 직접 반영한다. PR을 만들지 않는다. 정적 공개 파일을 바꾸면 `npm run sync:public`의 필요성을 확인한다.
- 코드 수정이 생기면 `npm run check:fast -- --plan`과 `npm run check:fast`, main `CI required` 결과를 기록한다. 운영 승격은 별도 승인과 릴리스 검증을 따른다.
- 이 문서의 `status: done`은 **검수 실행표 작성 완료**를 뜻한다. 12건의 실 LLM 결과 검수는 아직 실행하지 않았으며, 각 건의 실제 증거가 생길 때만 별도 결과표에 완료로 기록한다.
