# 신규 이용권 판매 준비 근거 — 2026-09-22

이 문서는 읽기 전용 외부 확인과 코드 상한을 구분해 기록한다. `lib/payment/pass-cost-evidence.js`에 import하지 않으며, 이 문서만으로 신규 이용권 판매를 열지 않는다. 실 PG 결제·유료 LLM·운영 DB 쓰기·상품 생성·운영 승격은 수행하지 않았다.

## PortOne 실정산 관찰

PortOne 관리자 콘솔 `PG 정산 내역`에서 2026-09-01~09-30 거래일 기준으로 확인했다.

- 총 거래: 43건, 62,600원. 정산 완료 18건 51,598원, 정산 예정 11건 9,726원.
- 정산 일자별 완료 집계: 거래금액 52,700원, 정산 완료 51,598원, PG 수수료 1,001원, 수수료 부가세 101원.
- 건별 관찰: KG이니시스 카드 3,000원은 수수료 57원+부가세 6원, 5,000원은 95원+10원, 9,900원은 188원+19원이었다. KG이니시스 간편결제 9,900원은 316원+32원, 카카오페이 간편결제 9,900원은 158원+16원이었다.
- 관찰 최대는 KG이니시스 간편결제의 총 348원/9,900원, 약 3.52%다. 기존 계획의 웹 5.5% 스트레스보다 낮지만 결제수단·계약 변경과 신규 v3 고액 이용권의 실제 정산을 보장하지 않는다.
- 목록에는 구 스탠다드 이용권과 단건 상품, 취소 거래가 섞여 있다. 신규 v3 이용권의 정산 표본이 아니며 최소 월 판매량 근거도 아니다.

개인 이름·거래번호·PG 거래번호는 문서에 저장하지 않았다.

## Google Play 신규 SKU 관찰

Play Console의 패키지 `com.codedestiny.app`을 읽기 전용으로 확인했다.

- 앱 상태는 임시·내부 테스트, 설치 사용자 0, 아직 검토를 위해 전송되지 않음이다.
- 연결된 개발자 계정의 `등록한 프로그램 및 서비스`에는 `15% 서비스 수수료`가 등록 상태로 표시됐다. 공식 약관상 이 등급은 연간 첫 100만 USD 수익에 15%, 초과분에 30%가 적용되며 한국 대체결제는 해당 수수료에서 4%p 감면된다. 현재 계정의 등록 상태를 확인한 것이며 신규 v3 SKU의 실제 가격·국가·구매 옵션·정산 또는 미래 프로그램 유지까지 보장하지 않는다.
- 일회성 제품은 총 18개다. 기존 이용권 `cd_pass_standard_30d`, `cd_pass_premium_30d`, `cd_pass_vvip_30d`는 각각 활성 구매 옵션 1개가 보인다.
- 코드가 요구하는 `cd_pass_standard_30d_v3`, `cd_pass_premium_30d_v3`, `cd_pass_vvip_30d_v3`는 목록에 없다. `_v2`도 없다.
- 신규 상품 생성·가격 입력·활성화·기존 상품 비활성화는 하지 않았다. 따라서 Play 채널은 `APP_SKU_NOT_VERIFIED`를 유지한다.

공식 문서상 일회성 제품은 지역별 가격과 구매 옵션을 설정한 뒤 활성화해야 Play Billing에 노출된다. 제품 ID는 생성 후 변경·재사용할 수 없으므로 실제 가격과 수수료가 확정되기 전에 SKU를 만들지 않는다.

## Workers AI 상한·사용량·계획 원가

- 공식 단가: GLM 4.7 Flash는 입력 $0.0605/백만·출력 $0.40/백만, 컨텍스트 131,072토큰. Llama 3.3 70B fp8-fast는 입력 $0.293/백만·출력 $2.253/백만, 컨텍스트 24,000토큰.
- `lib/workers-ai-input-token-limit.mjs`가 메시지 content의 UTF-8 바이트 수에 채팅 템플릿 여유 512를 더해 공급자 시도당 50,000토큰 상한을 보수적으로 강제한다. 기본 GLM/Llama는 요청 출력을 제외한 컨텍스트 한도가 더 작으면 그 값을 쓰고, 초과 시 `env.AI.run` 호출 전 실패한다.
- Workers AI 응답에 공식 `usage`가 있으면 실제 prompt/completion 토큰을 로그에 보존한다. 없는 모델만 입력 상한·출력 문자수 추정으로 표시한다.
- 인증 대시보드 최근 1개월은 1.03k Neuron·입력 10.94k·출력 26.52k, 9월 청구 가능 사용량은 $0.00, 최근 Workers Paid 청구서는 $5.00였다. 별도 읽기 전용 GraphQL 재현 `node scripts/check-workers-ai-quota.mjs --days=30`은 UTC 2026-08-24 이후 GLM 1,025 Neuron·일별 무료분 초과 추정 $0을 보였다. 시간 경계가 다른 계정 집계이며 유료 상담 폴백 표본은 아니다.
- 최신 청구서 원문은 2026-08-30 발행 `IN-77252831`, 서비스 기간 2026-08-30~09-29의 `Workers Paid` 1개 × $5.00이다. 소계·합계·청구액은 모두 $5.00이며 별도 세금 행은 없다. 6쪽 PDF의 SHA-256은 `24010e2c890229e1e57e699e802e38652cc3dece73df4e500b19fb709e6191a2`이고 개인정보가 포함된 원문은 저장소에 넣지 않았다.
- 9월 Billable usage에는 R2·Workers·D1·Queues 계정 사용량이 포함 한도 안의 $0.00로 표시됐다. 이 청구서는 계정 고정비를 확인할 뿐 Code Destiny 상품 SKU별 상담·저장 비용을 분리하지 않는다.
- 최악 계획은 Gemini 허용 재시도 후 Workers AI 두 모델이 모두 입력·출력 과금을 만들 수 있다고 보고 합산한다. `tarot-love-relationship` 1건의 계획 변동원가는 9,100원에서 14,700원으로 증가했다.

## 상품 요청 귀속 계측

- 운영 Worker `code-destiny-web`의 최근 7일 `[llm token_usage]` 조회는 먼저 0건, 후속 동일 표식 검색에서는 성공 이벤트 70개를 표시했다. 후속 결과에는 고용량 불완전 경고가 있었고 JSON 다운로드도 실패했으므로 어느 숫자도 전체 합계로 사용하지 않는다.
- 화면에서 복사할 수 있었던 2026-09-20 `master-love-codex/generate` 1건은 Gemini 2.5 Flash 입력 14,917·캐시 입력 1,018·출력 3,540토큰이었고 `estimated=false`였다. 다만 `serviceId`가 비어 있어 상품 전체·장별 재시도·저장·지원·환불 비용으로 귀속할 수 없다.
- 공통 LLM 로그에 기존 `serviceId`·`requestId`와 함께 결제 접근 유형 `billingAccess`를 남긴다. 서비스 식별자가 없으면 `route`를 제한 길이로 사용한다. 프롬프트·사용자 원문·개인정보는 기록하지 않는다.
- 마스터 연애 코덱스의 구조화·비구조화 호출은 `serviceId=master-love-codex` 또는 `master-love-codex-compat`, `sectionGroup=chapter.id`를 명시해 관찰된 빈 상품 키를 막는다.
- `node scripts/report-llm-token-usage.mjs llm.log --prices config/llm-tariffs-20260921.json`은 서비스별 호출 수뿐 아니라 고유 요청 수, 접근 유형, 귀속 누락 호출 수를 출력한다. `attributionComplete`는 모든 행에 상품/라우트·요청 ID·접근 유형이 있을 때만 `true`다.
- 이 변경은 **향후 승인된 운영 반영 뒤 생성되는 로그**부터 관찰 가능하다. 과거 비용을 소급 복원하지 않으며, 토큰 보고서는 항상 `saleApproval:false`다. 운영 승격·유료 호출은 이번 작업에서 하지 않았다.
- 저장 실원가는 MongoDB 문서 바이트·백업·트래픽을 상품 요청에 묶은 청구 자료, 지원 실원가는 상품별 티켓 시간과 검토된 인건비, 환불 실원가는 상품별 환불 건수·금액·회수 불가 공급자 비용이 필요하다. 세 항목은 현재 미확보다.

## 판매 판정

- 웹 5.5%와 Play 15% 계획 시나리오는 현재 v3 가격에서 40% 스트레스 공헌이익 기준을 넘는다. Play 계정의 15% 프로그램 가입은 확인했지만 v3 SKU 실정산은 없다.
- Play 30% 시나리오는 현재 v3 가격에서 약 30%로 기준 미달이다. 40% 기준 최소 계획가는 119,800원/359,400원/1,197,800원이다.
- Cloudflare Workers Paid 계정 청구서 원문과 Play 15% 프로그램 가입은 확인했다. 그러나 신규 SKU의 KRW 가격·지역·활성 상태·실정산, 상품별 유료 상담 실사용량, 저장·지원·환불 실원가는 아직 없다.
- 따라서 `PASS_COST_EVIDENCE`는 비워 두고 웹·Play 신규 이용권 판매 차단을 유지한다. 기존 주문 확정·선물 수령·복원은 변경하지 않는다.

계정 집계의 기계 가독 정본은 `docs/verification/pass-external-cost-evidence-20260922.json`이다.

공식 출처:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- https://support.google.com/googleplay/android-developer/answer/16430488
- https://support.google.com/googleplay/android-developer/answer/112622
