---
status: active
updated: 2026-09-22
next: "실정산·상품별 Workers AI·저장·지원·환불 실원가와 Play 신규 SKU 근거를 확보하기 전까지 신규 이용권 판매 차단을 유지한다"
---
# 사업 리팩토링 인수인계

정본: [사업 마스터](../business-refactor.md), [계측](../analytics-kpi.md).

## 2026-09-22 영냥이 공개 분석 근거 보강

- 사용자 제공 네이버 원문을 브라우저에서 읽기 전용 확인했다. `223442610559`는 2024-05-10 「가수 휘성 사주 re;」로 다음 해를 고비로 언급한 공개 분석이고, `224032671570`는 2025-10-05 대통령·유명인·기업인 관련 과거 글 링크를 모은 작성자 색인이다.
- `/about/#author`의 기존 대통령 공개 원문 3건 아래에 휘성 원문과 작성자 원문 모음을 추가했다. 방문자가 요약 문구보다 게시일과 당시 표현을 직접 확인하도록 안내하고, 작성자 색인은 독립 기관이 산정한 적중률 자료가 아니라는 한계를 같은 화면에 명시했다.
- `docs/business-refactor.md`의 대통령 근거 절과 `docs/seo/YEONGNYANGI_SEARCH_STRATEGY.md`의 출처 상태를 갱신했다. 사후 사건 자체를 예견했다고 확대하거나, 작성자 색인의 상담 가격·후기·자기평가를 Code Destiny의 현행 정책 또는 독립 검증 증거로 사용하지 않는다.
- 결제·가격·인증·API·DB·LLM 로직은 변경하지 않았다. 기존 `marketing/**` 변경과 worktree를 보존한다.

## 2026-09-22 Workers AI 상한과 외부 원가 증거

- 코드 커밋 `4f45e0890`: `lib/workers-ai-input-token-limit.mjs`에서 Workers AI 공급자 시도당 입력을 불변 50,000토큰으로 제한했다. Cloudflare에는 생성 전 countTokens API가 없으므로 UTF-8 바이트 수+채팅 예약분을 실제 토큰 수의 보수적 상계로 쓴다. 기본 GLM/Llama 모델은 공식 컨텍스트 131,072/24,000에서 요청 출력과 예약분을 뺀 값이 더 작으면 그 한도를 적용한다.
- 공통 `lib/llm-client.ts`의 유일한 `env.AI.run` 직전에 검사한다. 초과 mock은 `env.AI.run` 0회를 단언하며, Gemini 50,000토큰 상한 구현은 반복하거나 변경하지 않았다. Workers AI 응답이 공식 `usage.prompt_tokens`·`completion_tokens`를 주면 실측값을 로그에 보존하고, 없을 때만 `estimated=true` 문자수 추정으로 내린다.
- 2026-09-22 로그인된 계정을 읽기 전용으로 확인했다. 포트원 9월 누계는 거래 52,700원, 정산 51,598원, PG 수수료 1,001원+부가세 101원으로 일치했다. Cloudflare 최근 1개월 Workers AI는 1.03k neurons, 입력 10.94k·출력 26.52k였고 9월 청구 가능 사용량은 포함 한도 안의 $0.00, 최근 Workers Paid 청구서는 $5.00이었다.
- Play Console의 `com.codedestiny.app`은 임시·내부 테스트, 프로덕션 비활성이다. 일회성 제품 18개에 구 `cd_pass_*_30d`와 Family는 있으나 신규 `cd_pass_standard_30d_v3`, `premium`, `vvip`는 없다. 따라서 Play 3종은 `APP_SKU_NOT_VERIFIED`를 유지한다. SKU를 만들거나 게시하지 않았다.
- 집계 정본은 `docs/verification/pass-external-cost-evidence-20260922.json`이다. 공식 GLM/Llama 단가는 `config/llm-tariffs-20260921.json`에 추가했지만, 계정 전체 집계는 상품별 LLM·재시도·저장·지원·환불 실원가가 아니므로 `lib/payment/pass-cost-evidence.js`는 비워 두고 웹 3종 `SETTLEMENT_EVIDENCE_MISSING`, Play 3종 `APP_SKU_NOT_VERIFIED` 판매 차단을 유지한다.
- 실PG·유료 LLM·운영 DB 쓰기·운영 승격은 수행하지 않았다. 기존 주문·선물·복원과 main의 `marketing/**`, 기존 worktree는 건드리지 않았다.
- 전용 Workers AI 6개 테스트, 폴백 가드, LLM 토큰 계측, TypeScript, handoff 계약은 통과했다. Windows 로컬 `check:fast`는 이번 변경 밖의 LF 고정 문자열 검사 3개가 CRLF 소스에서 실패했으며, Linux main CI로 최종 판정한다.

## 2026-09-22 Gemini 입력 토큰 하드 상한

- 코드 커밋 `f37a0762f`: Gemini 생성 전에 공식 `models.countTokens`로 전체 `GenerateContentRequest`를 검사하고 공급자 시도당 50,000토큰을 초과하면 호출을 차단한다. 상한은 환경값으로 올릴 수 없다.
- 공통 `lib/llm-client.ts`, 컨텍스트 캐시 생성, 직접 REST 경로 love-reading·mindscan·oracle을 같은 정본 `lib/gemini-input-token-limit.mjs`에 연결했다. 계산 실패 시 Gemini 생성은 보내지 않고 공통 클라이언트의 기존 Workers AI 폴백 계약만 유지한다.
- 계획표의 `inputTokenCapProvenInCode`를 `true`로 바꿨지만 이는 Gemini 입력 원가 상한만 입증한다. Workers AI·저장·지원·환불 원가는 실측하지 않았고 evidence 객체도 비어 있으므로 판매 승인 근거가 아니다.
- 판매 감사 결과 웹 3종은 `SETTLEMENT_EVIDENCE_MISSING`, Play 3종은 `APP_SKU_NOT_VERIFIED`로 계속 차단된다. 기존 주문 확정·선물 수령·복원 경로는 변경하지 않았다.
- 로컬 검증은 mock 전용이다. `npm run check:fast` 통과: paid suite 88/88, Node 1,529/1,529, Jest 289 suites·4,057 tests, lint·typecheck·Worker dry-run·사이트맵 1,284 URL 통과. `node scripts/audit-pass-profitability.mjs`의 차단 6건/비정상 종료는 예상 결과다.
- 실 LLM·실PG·운영 DB 쓰기·운영 승격은 수행하지 않았다. main의 `marketing/**` 미커밋 변경과 기존 worktree는 보존했다. 최종 전달 판정은 이 문서 커밋까지 main에 반영한 뒤 해당 SHA의 CI 성공으로 한다.

## 2026-09-22 비용 상한 기반 이용권 재설계

- 구현 커밋 `4f7830d62`: 공식 단가·코드 상한 계획표, v3 가격/한도, v2·legacy 복구 경로, 웹/앱/선물/표시/다국어 동기화와 회귀 검사를 포함한다.
- CI `35607421867` 재실행과 최신 main CI `35608976355`는 모두 `success`, `CI required` 성공까지 확인했다.
- 공식 Gemini 2.5 Flash 단가와 코드의 부분 수·출력 토큰·저장형 재시도·공급자 재시도를 계산했다. 가장 비싼 30,000원 상품이 아니라 3,000원 `tarot-love-relationship` 반복이 누적 한도의 원가 결정 조합이었다.
- 신규 v3 계획: 스탠다드 89,000원/건당·누적 3,000원, 프리미엄 269,000원/10,000원, VVIP 879,000원/30,000원. VVIP는 30,000원 상품 1회를 커버한다. 30일 비자동갱신·프로필 3/7/15개는 유지한다.
- 직전 `flower-20260921` v2와 legacy 플랜 해석을 코드에 남겨 기존 주문·선물·활성 이용권을 보존한다. 신규 ID는 `*_1m_v3`, Play SKU는 `cd_pass_*_30d_v3`다.
- 입력 토큰 공통 하드 상한이 없어 50,000토큰/공급자 시도는 계획 가정이다. 실원가 evidence는 계속 비어 있고 웹·Play 신규 판매 차단을 풀지 않았다.
- 월매출 약50,000원은 기준 고정비108,000원에도 못 미친다. 상품 공헌이익과 월 고정비 손익분기를 분리했으며, 고정비5배 540,000원 회수에는 Play30% 스트레스 기준 월15/5/2개가 필요하다.
- 운영 승격·실PG·유료LLM·운영DB 쓰기는 수행하지 않았다. main의 동시 `marketing/**` 변경은 건드리지 않았다.
- 로컬 `npm run check:fast` 최종 통과: paid suite 88/88, Node 1,525/1,525, Jest 289 suites·4,057 tests, lint·typecheck·Worker dry-run·사이트맵 1,284 URL 통과. 깨끗한 커밋의 public mirror 검사와 main CI가 다음 전달 판정이다.

## 마지막 사용자 요청과 재개 지점 — 반드시 이 절부터 읽기

사용자가 컨텍스트·토큰 비용을 줄이기 위해 이 시점의 인수인계를 명시 요청했다. 아래 완료 작업을 반복하지 않는다. **가격 재설계는 아직 끝나지 않았다. 신규 이용권을 판매 보류했다는 사실만으로 사용자의 최종 요청을 완료 처리하지 않는다.**

### 최신 비용 정보와 의도

- 사용자 제공: 현재 월 주문은 거의 없으며 월매출 약 **50,000원**, Gemini 월 청구 약 **10,000원**. Gemini 금액에는 개발 중 호출이 섞여 있다. 50,000원은 주문 건수가 아니다. 객단가/주문 수/상품별 원가로 임의 환산하지 않는다.
- 앞서 제공: PG 수수료 5% 이하(수수료 부가세 포함 여부 미확인), Cloudflare 기본 $5, MongoDB M10 월 약100,000원 예산. 유지비가 더 증가할 가능성이 높으므로 이를 반영하라는 요청.
- 사용자 원문 의도: "원가는 니가 검색해보고 가장 긴 상담이더라도 충분히 손익 분기를 넘도록 가격을 세팅해야해". 공식 공급자 단가를 직접 조사하고, 코드의 챕터 수·입출력/thinking 토큰 상한·재시도·재개·fallback 호출을 추적해 보수적 비용을 계산한 다음 **신규 이용권 판매가와 누적 한도를 실제로 조정**한다. 평균 사용량이나 개발비 포함 청구액을 근거로 흑자라고 단정하지 않는다.
- 현재 서버 기준 예산108,000원/월(USD1600 가정)은 매출50,000원보다 크다. 가격만으로 판매량과 무관한 사업 전체 흑자를 보장할 수 없다. 상품/이용권 단위 공헌이익과 월 고정비 회수에 필요한 판매량을 구분한다. 실제 송장·정산 검증이 없는 값은 시나리오/상한 추정으로 명시한다.
- 기존 9,900/29,900/59,900원, 누적20,000/50,000/90,000원은 **후속 요청 이전 후보안**이다. 최종 확정 가격으로 고집하지 않는다. 최소3종, 최상위3만원 상품 포함, 30일 비자동갱신, 꽃돼지 전용, 영냥이 단건 유지, 기존 구매권 보호 조건은 계속 적용한다.
- 현재 내부 게이트는 변동원가2배·고정비5배 스트레스 후 공헌이익률40% 이상 및 검토된 최소판매량으로 고정비 배분 후 양수. 실원가 evidence는 비어 있고 3종×웹/Play 모두 판매 차단. 추정 보고서를 실측 evidence로 넣어 차단을 풀지 않는다.

### 첫 번째 다음 행동과 조사 시작점

1. **먼저 CI 상태 확인**: 코드 SHA `a8476628ba7afbf5ad86a0c8fafb33bef6941a09`, [CI 35607421867](https://github.com/rei1237/codedestiny/actions/runs/35607421867). Pages/Worker 빌드·타입/린트·내부 링크 검사는 성공. 첫 실행 정적 검사에서 `verify-rpt-preview-cta-flow.mjs`의 `CDP event timeout: Page.loadEventFired`가 발생해 `gh run rerun 35607421867 --failed`를 1회 실행했다. 인수인계 작성 시 재실행 진행 중이다. 직전 `ce573bbc0`의 정적 검사는 성공했다. 재실행이 실패하면 로그로 원인을 확인하며 무조건 재시도하거나 검사 기준을 낮추지 않는다. 문서 후속 커밋의 main CI도 확인한다.
2. `docs/pass-pricing-20260921.md`, `lib/payment/pass-policy.js`, `lib/payment/pass-economics.mjs`, `worker/lib/pass-sale-policy.js`를 읽고 기존 계산/게이트를 재사용한다. `scripts/report-pass-economics.mjs`에 새 매출 시나리오를 반영하고 코드 근거가 있는 상담 비용 상한 보고서를 만든다. 단순 가격표 재작성만 하지 않는다.
3. 원가 조사 시작점: `worker/lib/paid-feature-registry.js`의 `cost: 300`/`amountKRW: 30000`, `worker/lib/pass-cost-catalog.js`의 전체 코스/reason. 초융합만이 최장/최고 원가라고 가정하지 않는다. `worker/lib/fusion-fortune-prompt.js`(목표30,000~60,000자), `worker/lib/love-secret-ai-prompt.js`, `worker/lib/ziwei-deep-report-prompt.mjs`, `worker/lib/master-love-codex-compat-prompt.mjs`, 나크샤트라 VVIP 등 호출부를 추적한다. `lib/llm-client.ts`는 `maxOutputTokens: normalized.maxTokens`, `thinkingConfig`를 사용하며 기본모델 gemini-2.5-flash. 실제 env 모델 변경 가능성도 표기한다. 타임아웃은 과금 상한이 아니며 재개 요청이 누적 호출을 무제한 허용하면 유한 원가가 입증된 것으로 보지 않는다.
4. 각 SKU/코스의 input/output/thinking/call/retry 상한, 저가 반복 조합, Google 수수료, PG, 변동 저장·지원·환불 충당, 고정비 증가를 계산한다. 지원비 등의 비공개 실제값은 가정과 근거를 분리한다. 품질/기존 구매권을 임의 축소하지 않는다. 승인 없는 유료 테스트로 비용 자료를 만들지 않는다.
5. 계산 결과에 따라 3종 가격·한도를 정본에서 조정하고 웹/앱/선물/표시/테스트를 동기화한다. VVIP가3만원 상품을 커버해야 한다는 요구는 유지하되, 이전의3회/9만원 한도를 확정 요구로 오해하지 말고 손익에 맞게 검토한다. 확인되지 않은 무손실 보장은 금지한다. 이후 아래 실환경/카카오/브라우저 공백을 이어간다.

### 방금 확인한 공식 자료

2026-09-21 검색 확인. 실제 결제/LLM 호출 없이 읽기만 했다.
- [Gemini 가격](https://ai.google.dev/gemini-api/docs/pricing): 2.5 Flash 텍스트 입력 $0.30/100만, 출력(thinking 포함) $2.50/100만. 기존 `config/llm-tariffs-20260921.json` 재사용. 캐시/도구/다른 모델 요금은 별도.
- [Gemini 2.5 Flash 모델 한도](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash): 모델 최대 입력1,048,576·출력65,536. **이 값 전체를 모든 실제 호출의 토큰 사용량으로 단정하지 않는다.** 코드의 더 낮은 요청 상한과 실제 프롬프트 크기를 확인한다.
- [thinking 과금](https://ai.google.dev/gemini-api/docs/generate-content/thinking): 출력과 thinking 합산. 토큰 통계 필드 중복 집계 여부 확인.
- [Play 수수료](https://support.google.com/googleplay/android-developer/answer/112622?hl=en-GB), [변경 요율 설명](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en): 2026년 지역·신규설치·프로그램별 변경이 있으므로 한국 계정에15%를 일괄 적용하지 않는다. 지금 문서의15/30%는 비교 시나리오이며 계약 확정치가 아니다. 공식 본문의 해당 지역 적용 조건을 다시 읽는다.

### 작업 위치와 완료 검증

- 사용자 재개 디렉터리: `D:/Development/code-destiny` (main). 동시 `marketing/**` 미커밋 변경은 보존했다.
- 실제 이번 작업 checkout: `D:/Development/codedestiny-worktrees/yeongnyangi-business-v2-20260921-200128`, branch `wt/yeongnyangi-business-v2-20260921-200128`. 모든 코드 변경은 main에 ff merge/push했다. 이어서 편집할 때 동시 세션이면 이 worktree를 재사용/최신 main 반영하고 중복 worktree를 만들지 않는다.
- `node_modules`는 main을 가리키는 junction. 재귀삭제 금지. `.env`는 hardlink일 수 있으므로 내용을 수정하지 않는다. worktree는 다음 작업을 위해 남겼다. 로컬 mock dev25540/25541은 중지했다. 활성 유료 호출/배포 프로세스 없음.
- 최신 홈 수정: 공통 SEO 링크를 펼침형 탐색에 재사용하고 홈 전용 자료실에 날짜별·일간별 월간·유명인 사주·휴먼디자인·심리테스트 허브를 복원. 공통/다국어 푸터는 확장하지 않았다. 내부 링크 검사의 예외/상한을 느슨하게 하지 않았다. Pages/Worker 최종 조립은 영냥이 root를 보존한다.
- 후속 검증: 로케일 푸터8개, sitemap1284 URL, 모바일 진입/가격/하단탭 정합 통과. 전생 궁합 가격 기대값3천원 정정 후 관련12개 운세 검사 명령 모두 통과. 모바일 가격 불일치0. UI1524 테스트 단계 CI 통과. 최종 main CI는 위 실행을 조회한다.
- 이용권 비용 계산2개 테스트 통과. `node scripts/audit-pass-profitability.mjs`는6개 판매차단/종료2가 **예상 결과**다. 이전 선물 replica CI33개·결제/Worker critical 성공 기록은 아래 보존했다.
- 실 PG·유료 LLM·운영 DB 쓰기·운영 승격은 승인받지 않았고 수행하지 않았다. 카카오 소개만 저장됐으며 채널 이름/아바타는 아래 제약으로 미완료다.

재개 문장(아래 코드 SHA 이후 문서 전용 커밋은 `git log -1`로 확인):
```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\business-refactor.md의 첫 절부터 읽고 이어가라. 마지막 코드 전달 커밋 a8476628ba7afbf5ad86a0c8fafb33bef6941a09와 CI 35607421867의 재실행 및 최신 main CI부터 확인하라. 완료 작업을 반복하지 말고 월매출 약5만원·Gemini 약1만원(개발 포함), PG5%이하·CF$5·Mongo월10만원 및 비용 증가를 반영하라. 공식 단가와 코드상 최장 상담·재시도·최대 소진 조합의 비용 상한을 계산해 꽃돼지 전용3종 이용권 가격과 한도를 조정하고, 최상위3만원 상품 커버·기존 구매권을 보존하라. 추정을 실측으로 둔갑시키지 말고 운영 승격·실PG·유료LLM·운영DB 쓰기는 별도 승인으로 남겨라. 동시 marketing 변경을 보존하고 기존 worktree를 확인해 재사용하라.
```

## 2026-09-21 최신 main 전달 — 이전 기록보다 우선

- main 전달 중 최종 CI는 [main 검사 목록](https://github.com/rei1237/codedestiny/actions/workflows/pr-ci.yml?query=branch%3Amain)의 최신 SHA를 확인한다. `2e1c312467b2bebf585801d6018e9fc8b9b9e941` 검사에서 발견한 날짜별·일간별 월간·유명인 사주·휴먼디자인 허브 링크 누락과 전생 궁합의 옛 가격 검사값을 후속 커밋에서 수정했다. 실패한 중간 CI를 최종 성공 증거로 사용하지 않는다.
- 영냥이 root를 최종 Pages 조립까지 보존했다. `/ggulggul/` 사이트맵·lastmod·옛 만세력 리다이렉트 충돌과 footer 신뢰 링크를 수정했다. 새 홈의 펼침형 탐색 메뉴에 기존 공통 공개 허브 링크를 재사용해 콘텐츠 이동 경로를 보존했다. 두 조립 스크립트를 실제 실행하는 임시 파일 fixture 검사 통과.
- 개별 화면·최소 결제 증빙·질문형 AI·저장 메타데이터의 가격 조회를 정본에 연결했다. 찻집 5종 화면/서버/문서와 다국어 안내를 동기화했다. 저장된 주문·결과를 일괄 수정하거나 운영 DB에 쓰지 않았다.
- 최초 `check:fast` 통과 후 회귀는 해당 검사로 재현해 수정했다. 후속 Jest 전체 4,048개 통과/옛 가격 기대 1개 실패 → 수정 후 해당 묶음 18개 통과. Node 전체의 옛 차감액 기대 2개 → 수정 후 해당 묶음 19개 통과. 로케일 복귀24개, 상품 안내21개, 홈 조립1개 통과. 정식 최종 전달 판정은 위 main CI다.
- [결제·Worker 검사 실행](https://github.com/rei1237/codedestiny/actions/runs/35603177847)의 `Critical checks` job 성공 확인. 실행 전체는 이후 수정한 UI 기대값/홈 신뢰 링크로 실패했으므로 전체 성공으로 인용하지 않는다.
- [선물 replica CI](https://github.com/rei1237/codedestiny/actions/runs/35600030305) 33개 통과: 구정책 주문 복구, 새 VVIP 9만 원 선물, 구정책 활성 중 신정책 수령 보류 포함. 운영 DB 검증이 아니다.
- 깨끗한 커밋에서 `verify:public-mirror-fresh` 통과(재생성 차이0). 캐시 키 전파를 마지막 loader/정적 진입 페이지까지 완료했다. `verify:sitemap-drift` 1,284 URL, `verify:handoff-contract` 176문서 통과. main `marketing/**` 타 세션 변경 보존.

### 다음 행동: 가격 확정에 필요한 근거부터

1. `docs/pass-pricing-20260921.md`를 읽고 실제 상품별 모델/토큰·thinking/재시도·저장·지원·환불 원가 및 PG 정산 근거를 모은다. 무승인 유료 호출이나 운영 DB 쓰기로 자료를 만들지 않는다. 원가 evidence는 비어 있고 3종 × 웹/Play 모두 신규 판매 차단이다.
2. 최소 판매량 근거와 비용 증가를 검토한다. 예산 월108,000원은 환율1,600원 가정이며 청구서 실측이 아니다. 내부 심사는 변동원가2배·고정비5배(예산 기준 월540,000원), 공헌이익40% 이상 및 배분 고정비 차감 양수를 요구한다. 추가 고정비·더 큰 증가가 예상되면 상향한다. 후보9,900/29,900/59,900원을 확정가로 광고하지 않는다.
3. Google 프로그램/국가별 정산·신규 SKU·가격·비자동갱신·기존 영수증 복원을 검증한다. 미확인15%를 확정 수수료로 쓰지 않는다. 기준 미달이면 신규 가격/누적 한도만 재설계하고 기존 구매권은 줄이지 않는다.
4. 아래 브라우저 공백과 카카오 이름/아바타 제한을 해결한다. 완료한 무료 세 장·계측·본 구현을 반복하지 않는다. 운영 승격, 실 PG·유료 LLM·운영 DB 쓰기는 별도 승인이다. 운영 SHA 확인 전 배포 완료라고 하지 않는다.

## 2026-09-21 영냥이 메인·가격 정책 추가 작업

이 절과 [이용권 원가/정책 문서](../pass-pricing-20260921.md)가 아래 과거 가격 고정 기록보다 우선한다. 사용자 승인으로 가격·홈을 변경했으며, 후속 요청으로 유지비 증가까지 반영한 흑자 범위의 가격 재검토를 판매 전 필수 조건으로 추가했다.

- `/` 영냥이 메인, `/ggulggul/` 꽃돼지. root의 기존 action·공유·결제 복귀 파라미터와 구 해시를 꽃돼지로 보존. `/static/` 유지. 무료 세 장·계측은 재구현하지 않음.
- 꽃돼지 가격 변경 전수표: `docs/verification/flower-price-changes-20260921.json`. 찻집 5종 5천원, 기존 3만원 유지, 영냥이 가격 유지.
- 버전 `flower-20260921` 3종 후보 구현: 9900/29900/59900원, 누적2/5/9만원, 건당5천/1만/3만원. **판매 가격 확정 아님. 웹/앱/선물 신규 판매 모두 차단**. Family 신규 판매 종료, 버전 없는 과거 주문은 legacy. 기존 VVIP2만원·Family·기구매 연장·선물·환불 권리 유지.
- 원가 심사: 상품/코스별 최대 원가의 가장 비싼 반복 조합, 세금/PG/Play, 고정비와 최소 판매량을 함께 계산. 현재 실원가 evidence 비어 있음. 비용증거 없이 판매를 열지 말 것.
- 사용자 예산: PG5%이하(부가세 여부 미확인), CF$5, Mongo M10 월10만원, 향후 증가 가능. 시나리오는 PG5.5%, 환율1600/2000, Play15/30%, 고정비2/3/5배. 새 내부 게이트는 변동원가2배·고정비5배 스트레스 후 공헌이익40% 이상과 고정비 차감 양수. 판매량 가정은 보장이 아니며 근거 필요.
- 카카오 소개 저장 검증 완료: 영냥이 + 기존10년경력/대통령 적중 문구. 비즈니스 채널은 이름 변경 불가 UI 확인. PNG 준비 `public/assets/yeongnyangi/original/kakao-profile.png`; 업로드는 Chrome 확장의 파일 URL 접근 권한 미허용으로 미완료. 사용자에게 권한 켜기 안내함. 메시지 발송 없음.
- 브라우저 mock: root 영냥이와 꽃돼지 연결, 기존 `/?action=cdOpenAllFortunes`의 `/ggulggul/?action=...` 보존, 모바일390px overflow 없음, /points 신규3종 가격/한도/구매·선물 disabled 확인. root 예측 출처 링크 보존.
- 원래 남아 있던 MindScan 결과 재열람·실제 사주 결과→연애비책·저장소차단·스크린리더·OG 실기기 검증은 아직 완전 검증 아님. 운영 PG/유료LLM/DB 쓰기와 운영 승격은 별도 승인.
- 작업 시작 base5817e5149d657b5b6429359c898aada33bd1f6c3. 동시 marketing 작업을 보존하기 위해 worktree `D:/Development/codedestiny-worktrees/yeongnyangi-business-v2-20260921-200128` 사용. main merge/push/CI 전달 기록은 아래 최신 절을 확인한다.

## 제약과 승인
기존 구매권·가격·결제 검증·계산·URL 보존. 무료 세 장은 no-LLM.
실 PG·유료 LLM·운영 DB 쓰기·고객 메시지 발송 승인 없음. 운영 승격 별도.
다른 세션의 marketing 변경 보존. DB 마이그레이션 없음. 롤백은 이 작업 커밋만 역순 revert.

## 완료한 변경
- 9cfe1a8db: 승인/완료 관찰/열람 분리, 초기 분석 로드 전 이벤트 보완. 기존 이벤트 이름 유지하며 새 열람 의미 분리.
- 2d5bf280f: /today/ 연이의 무료 세 장, MindScan CardBack만 재사용, 정적 22카드×3 해석, KST/복원/공유/완결 후 단일 상담 링크.
- 3a12b5a3a: 홈 대표 구매/무료 행동과 registry 가격, 연애 비책 현재 이미지, 경력·대통령 원문 링크, 사전/미러/사이트맵.
- 주요 파일: app/today/DailyTarot.tsx, lib/tarot/daily-three.mjs, js/core/analytics.js, lib/analytics.ts, app/yeongnyangi/_components/Consultation.tsx, templates/home-funnel.html, lib/brand/prediction-records.json.

## 검증
- check:fast exit0, paid suite88, Jest288 suites/4039 tests, lint/typecheck/Worker build 통과.
- 일일/분석10 tests 통과. 대표 영냥이 상품·조회503·생성실패·중단·환불 mock5 cases 통과. 실PG/LLM/운영DB writes0.
- Chrome 로컬390px 선택/Space키/순차 공개/복원/공유수신/이미지·overflow 확인. today-hub mock API 미지원 오류 중에도 완료.
- 새 출처 표시 이후 ESLint, home-builder --check, sitemap drift 통과. 마지막 CI로 최종 커밋 판정 예정.
- 카카오 채널 _GgxaGX 소개는 사용자 지시로 원래 경력·적중 문구 복원, reload 값 확인. 메시지·환영 활성화 없음.
- 운영 배포 증거 아직 없음. 조사 당시 Pages/Worker f0ffba34e168b27879409ae1ceaddca7e56cd19e. 로컬 수정/CI를 배포 완료라고 하지 않는다.

## 중요한 사용자 정정
“두 대통령 적중”은 반드시 유지. 9월20일 대화 01a0be27-944f-7ef0-bfaf-e2acf06b4053에서 사용자가 제공했던 원문을 회수했다. 사용자에게 다시 링크를 요구하지 않는다.
- 윤석열: https://blog.naver.com/neosaju/222876455500 (2022-09-16), https://blog.naver.com/neosaju/223444062729 (2024-05-12)
- 이재명: https://blog.naver.com/neosaju/223459696339 (2024-05-27)
- 223442610559는 휘성 글이므로 대통령 사례 아님.
Chrome에서 게시일/본문 확인. 원문 수정이력·전 예측 적중률을 독립 검증했다고 기록하지 않는다. 관련 SEO 정본에 최신 출처 발견을 반영했다.

## 다음 순서
1. main 전달 SHA fe1d0235c0c3ddf9f47cd5c94178694e1799541c의 CI 링크 아래 확인. 운영 승격 승인과 live PG/LLM/실기기 검증은 별도. main 합치기와 push를 반복하지 않는다.
2. 연애 비책 실제 사주 결과→상세→결제 전 이미지/가격, 기존 MindScan 선택·복귀·재열람 브라우저 검사 공백 보강. 일일 API 성공/저장소차단/스크린리더·OG 실기기 확인.
3. 전 체계 상담 진입 정리·상품 전수표/실원가·기존 이용권 잔여권리, 카카오 메뉴/지원 동선 및 7일/30일 실제 지표. 메시지 발송은 승인 전 금지.

## 반복하지 않을 조사
GA4/DB 현재차이·테스트 미분류 수치는 마스터 참조. 방문자325는 적격 전환 분모 아님. 영냥이 홈 진입은 원래 존재했다. 연애 비책은 CSS 배경만 오래된 상태였다. 마인드스캔 전체를 무료 경로에 삽입하지 않는다.

## 작업 환경
원 작업 main: D:/Development/code-destiny. 동시작업 예외 worktree: D:/Development/codedestiny-worktrees/business-retention-20260921-131612. 로컬 mock dev 포트34976, API34977. node_modules는 main을 향한 junction이며 디렉터리 재귀삭제 금지. 인수인계 후 제거 시 junction 링크만 먼저 해제.

## 재개 문장
docs/handoff/business-refactor.md와 관련 마스터 문서를 읽고, 완료된 작업을 반복하지 말고 다음 미완료 우선순위부터 구현·검증·배포를 이어가라.

## main 전달 기록
fe1d0235c0c3ddf9f47cd5c94178694e1799541c main push 완료. 동시 main 변경과의 충돌은 sitemap-lastmod 생성 원장만 있었고 최신 main 기준 재생성 후 검증했다.
- [코드 CI](https://github.com/rei1237/codedestiny/actions/runs/35562505911)
- [결제 가드](https://github.com/rei1237/codedestiny/actions/runs/35562505885)
링크 생성 확인 시 실행 중이었으며 최종 상태는 링크의 해당 SHA로 확인한다. 자동 스테이징과 프로덕션 승격은 별개다.

## CI에서 발견해 수정한 회귀
fe1d0235c 빌드는 /sukuyo/calendar 고아 URL 검사에서 실패. TodayHubClient의 한국어 전문 도구 링크를 유료 추천과 함께 숨긴 것이 원인. 무료 전문 도구 3개 링크를 복원하고 FusionCrossSell만 한국어에서 숨기도록 수정했다. 따라서 이전 실패 CI를 최종 통과로 인용하지 않는다.

최신 코드 전달: 8760d5258212d7e725166fd63e8fe75cfa7ce38d. [회귀 수정 후 CI](https://github.com/rei1237/codedestiny/actions/runs/35562836889). 사주아이/청월당 공식 주체·제한된 모바일 DOM 관찰을 마스터에 추가했다.
