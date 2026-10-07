---
status: done
updated: 2026-10-07
next: "S00 진단·계약·관련 mock 완료. 현재 운영 집계는 미확보; S05/S06은 이 문서의 계약으로 별도 구현"
---

# S00 구매·후기·공유 퍼널 기준선

[실행 명세 S00](conversion-sessions-2026-10-07.md#s00-기존-퍼널의-현재-기준선과-누락-단계)의 진단 기록. 런타임을 바꾸지 않고 기존 이벤트·집계의 의미와 공백을 검증한다. S01~S09 구현, 운영 승격, 운영 DB 쓰기, 실결제·유료 LLM 호출은 범위 밖이다.

## 1. 기준 커밋과 보존 범위

- 전달 커밋 `205b3b0bd214832fed132e20730494432c44bfa9`는 시작 main `ea66f9eb89e763ba79aff1a6504fbe85efe47d5a`의 조상이다(`git merge-base --is-ancestor`, exit 0).
- `git diff --stat 205b3b0bd214832fed132e20730494432c44bfa9 main`: 시작 시 71파일, 1,376줄 추가/502줄 삭제. 공감 문장·상담 근거, 사주 엔진/표현, 자미두수 모바일·동물 이미지, 미러·사이트맵 변경이며 모두 타 세션 소유다.
- 공식 safe-worktree를 생성하는 동안 main이 `f1de513a5226e59b7e57e208fab85bb8bcf26b63`으로 전진했다. 이 SHA를 조사 기준으로 고정했다. 추가 차이는 사이트맵 관련 5파일 7줄 추가/7줄 삭제다. S00 시작 파일 7개와 후기·공유 호출부의 전달 커밋 대비 변경은 없었다.
- 시작 main의 미추적 `.claude/skills/fire-your-seo-agency/`, `i18n/authored/home-01.json`, `marketing/campaigns/2026-10-05/v3/official-posted-DeGgUwnDcjr.png`, `neo-briefing-390.png`, `output/`를 편집·스테이징하지 않는다.
- 계획: 코드와 이전 자료 대조 → 기간/모수/누락 이벤트 문서화 → 기존 mock 및 추가 계측 회귀 → check:fast → 해당 파일만 커밋·main 반영·push·정확한 SHA CI 확인 → 자기 워크트리 정리.

## 2. 다른 세션에서 찾은 운영 자료

| 출처 | 당시 관찰값 | 현재 기준선으로 쓸 수 없는 이유 |
|---|---|---|
| [2026-09-26 진단, GA4·주문 증거](../seo/yeongnyangi-conversion-20260926.md#ga4주문-증거) | GA4 2026-08-29~09-25 상품 조회 121, 구매 상품 1, 표시 수익 $0.74. 항목 ID `yeongnyangi-saju-mackerel`은 조회 43·구매 1 | 과거 보고서 UI 관찰값을 이번에 문서로 재확인. 이번 실시간 재조회 아님. 조회 이벤트/구매 상품 단위이며 적격 세션/고유 주문 아님. 속성 시간대·내부 테스트 제외·환불 대조 미확정. 1/43, 1/121을 구매율로 만들지 않음. 표시 USD는 PG USD 승인 증거 아님 |
| [사업 마스터](../business-refactor.md) | 2026-08-24~09-20 KST 생성 주문의 당시 상태: paid 5, refunded 12, failed 24, cancelled 22, pending 1 | 생성일 코호트·테스트 제외 전·당시 상태. 승인일 기준 매출이 아니며 현재 고객 수치로 재사용 불가 |
| [2026-10-02 질문 우선 설계 §8](../design/question-first-catalog-2026-10-02.md) | 질문 클릭·상품 열람·결제·결과 열람의 전후 표가 미측정 | 구현 계획/측정 명령은 있으나 현재 기준선의 집계 결과 없음 |
| [SEO·구매 전환 인수인계](../handoff/yeongnyangi-seo-conversion-20260926.md) 및 해당 채팅 `01a0da68-4b5c-7c51-bb6c-6202e092465e` | 운영 주문·환불 읽기 전용 export 미수신 | 현재 동일 기간의 주문/결과 연결 집계를 확보한 증거 없음 |

검색 범위는 위 문서 및 관련 docs/handoff·strategy·analytics, 최근 채팅 목록, “개선 CODE DESTINY 검색·상담 전환”과 “CODE DESTINY SEO 자동화 구축” 최근 기록이다. 후자는 GSC 관측이며 구매 원장이 아니다. 저장소/전체 과거 채팅 어디에도 자료가 없다고 단언하지 않는다. 개인정보 원장·테스트 계정 이메일은 문서/이벤트에 복제하지 않았다.

검색·상담 전환 채팅의 **구매 전 7일 이내 같은 상품의 마지막 유효 상세 방문** 계획도 확인했다. 이는 상세→구매 귀속의 후속 설계다. 현행 insight의 동의 기반 30분 세션 귀속과 같지 않고, 7일 연결이 구현됐다고 보지 않는다.

## 3. 대표 서비스와 현재 집계 표

대표: 영냥이 사주 고등어. 구매/GA4 키 `yeongnyangi-saju-mackerel`, 요청 catalog 키 `saju_mackerel`, 후기 catalog 상품군 `yeongnyangi`. 후기에는 생선별 구분이 없으므로 사주 고등어 후기율로 쪼개지 않는다.

기간 **W = [2026-09-09 00:00, 2026-10-07 00:00) KST**, 비교 **P = [2026-08-12 00:00, 2026-09-09 00:00) KST**. 완료된 각 28일이며 10월 7일 진행 중인 날짜는 제외한다. W의 UTC는 `[2026-09-08T15:00:00Z, 2026-10-06T15:00:00Z)`다. GA4 속성 시간대가 Asia/Seoul인지 확인 전에는 같은 기간이라고 간주하지 않는다. 기간 중 상품/가격/배포 변경은 별도 분할 표시해야 한다.

아래 전 행은 W/P 동일 기간, **분자·분모 값 모두 미확보**다. 표본이 없는 것이 확인되면 분모 0의 비율은 `N/A`; 아직 조회하지 않은 값은 `미확보`이며 0이나 0%가 아니다.

- **G 모수:** 분석 동의가 있는 같은 GA4 웹 세션의 순차 행동. 봇/내부 트래픽·운영자·테스트 제외 설정 확인 필요. 비동의 핑을 동의 세션과 합치지 않는다.
- **D 모수:** 서버 전체 승인/요청/후기 원장. 동의와 무관. 운영자(admin+확정된 테스트 계정), 테스트 주문, 웹 비교 시 선물·Play를 제외하고 제외/미분류 건수도 별도 남긴다. 테스트 제외 목록은 현재 미확보다.
- **G와 D는 분모가 다르다.** D 구매 전체/G 세션을 전체 고객 구매율로 발표하지 않는다. 익명 checkout beacon은 사용자·주문 연결이 없어 D 주문의 정확한 분모가 아니다.

| 단계/지표 | 분자 | 분모 | 출처·모수 | W/P 결과 |
|---|---|---|---|---|
| 방문 | 영냥이 공개 진입 `page_view` 세션 | 없음(건수) | GA4 G, 전체 사이트 세션과 별도 | 미확보 |
| 고민 선택률 | `concern_selected` 도달 세션 | 대표 흐름 진입 세션 | GA4 G, 주제 selector 변경만 포착. 기본값 유지 진입 누락 가능 | 미확보 |
| 상품 선택률 | 해당 item의 `view_item` 도달 세션 | 대표 흐름 진입 세션 | GA4 G, 상품 상세 `product_detail_view`와 구분 | 미확보 |
| 예시 발견률 | 해당 item의 `sample_view` 세션 | 같은 예시를 제공하는 상세 도달 세션 | GA4 G, 상품 선택 이후 반드시 거치는 단계는 아님 | 미확보 |
| 구매 진입률 | `purchase_attempt` 도달 세션 | 같은 item `view_item` 세션 | GA4 G; 클릭이며 신규 구매 확정 아님 | 미확보 |
| 로그인 복귀율 | 로그인 성공 후 같은 흐름에 복귀한 세션 | `purchase_attempt.login_required=true` 세션 | GA4 G; `login`만으로 원래 상품 복귀 증명 불가 | 미확보/복귀 연결 부족 |
| PG창 도달 | `checkout_pg_opened` 관찰 수 | `checkout_option_click` 관찰 수 | checkout_funnel_events 익명 시도 대용치. 정확한 주문 전환율 아님 | 미확보 |
| 결제 성공률 | 시도 코호트 중 관찰 종료까지 서버 승인된 고유 웹 주문 | W에 생성된 같은 상품 고유 결제 시도 주문 | D; paidAt·승인 증거 확인, 취소/실패/대기 별도 | 미확보 |
| 승인 주문/매출 | paidAt가 W인 고유 서버 승인 주문/통화별 금액 | 없음(건수/금액) | D; 이용권 구매·단건 결제 분리, 이후 환불도 총승인에는 포함 | 미확보 |
| 결과 시작률 | 승인 주문과 연결된 생성 요청 | 같은 승인 주문 코호트 | D; 미연결·이용권 사용·월정석 사용 별도 | 미확보 |
| 결과 완료율 | COMPLETED·완료 시각·필수 저장본 확인 요청 | 같은 승인 코호트의 생성 시작 요청 | D; 관찰 종료 시점 명시, 진행/실패/환불 분리 | 미확보 |
| 결과 열람 | `fortune_result_view`의 complete 관찰 세션 | 같은 G 세션 중 결과 렌더 관찰 세션 | GA4 G, partial 별도. D 전체 완료를 분모로 한 계정 최초 열람률은 현행 공개 이벤트로 연결 불가 | 미확보 |
| 후기 초대→작성→제출 | 아래 S05 각 후속 단계에 도달한 적격 세션 | 직전 단계의 적격 세션 | G; 해당 이벤트 미연결, 현재 배너는 적격 조회 전에도 보임 | 계측 공백 |
| 후기 승인율/승인 지연 | W 제출 코호트 중 승인된 후기/제출~승인 시간 | 동일 제출 코호트(검수 대기 별도) | D; 생선별이 아닌 `yeongnyangi` 상품군. 승인 시각/이력 소스 추가 확인 | 미확보 |
| 공유 동작 | 채널별 `fortune_share_action` 또는 `insight_share_action` | 동일 편집기/미리보기 진입 세션 | G; 복사/저장/공유창/취소/실패 각각 분리 | 미확보 |
| 일반 공유 수신 | 캠페인별 실제 도착 세션 | 없음(수신 건수); 송신 횟수 대비는 세대/기간이 다른 참고 비율 | GA4 G; 결과·daily 캠페인은 명시적 수신 이벤트 없음 | 계측 공백 |
| 공개 카드 수신→체험 | 유효 카드 수신 후 `insight_trial_click` 세션 | `insight_share_receive` 세션 | GA4 G; invalid/expired 화면의 클릭도 가능하므로 순차 교집합 필요 | 미확보 |
| 공유 기여 구매 | 같은 세션의 `share_campaign`을 가진 고유 purchase 거래 | 해당 캠페인 수신 G 세션 | GA4 동의 하한·30분 내부 이동 귀속; 서버 매출/인과적 증분 아님 | 미확보 |

이용권 **구매**는 PG 신규 승인이고 이용권 **사용**·월정석 **사용**은 결과 접근 수단이다. `purchase_complete`·`entitlement_granted`·`pass_verified_free`를 신규 `purchase`에 더하지 않는다. 서버 원장의 사용 수단/증거로 별도 분류하며 `paid:true` 결과만으로 PG 신규 결제를 추정하지 않는다.

## 4. 현행 이벤트 사전과 누락

| 현행 이벤트 | 실제 발화·payload | 중복/해석 경계 |
|---|---|---|
| `view_item`, `purchase_attempt`, `consultation_start` | `Consultation.tsx`: 선택 상품 `items[].item_id`; 클릭 `item_id,login_required`; 요청 생성 성공 `item_id` | 각각 상품 확정/버튼/서버 요청 성공. 결제 승인 아님 |
| `purchase` / `entitlement_granted` | `analytics.js:cdTrackConfirmedPurchase`; 서버 paid/success/fulfilled, 양수 금액과 거래 ID. purchase는 transaction_id,value,currency,items; grant는 transaction_id,item_id | 같은 문서 메모리 중복 제거. accepted에만 localStorage. 미동의 새 문서는 재발화 가능. 승인 대기·PG 콜백만으로 발화하지 않음 |
| `fortune_completed`, `fortune_first_open` | paid COMPLETED 응답을 브라우저가 관찰. item_id,observation,metric_version=2 | 저장 완료 전체 원장 아님. accepted만 영속 중복 제거 |
| `fortune_result_view` | paid 챕터 렌더; item_id,result_state,entry_source,observation,metric_version=2 | 문서 내 request×partial/complete당 한 번. direct→library 같은 상태는 한 번일 수 있음; 기기 간 최초 열람 아님 |
| 후기 노출/클릭/작성/제출 | `ReviewRewardBanner.tsx`, `review-reward-invite.mjs`, `ReviewsClient.tsx`에 trackEvent/cdTrack/gtag 호출 없음 | 일반 page_view는 작성/제출 증거 아님. 서버 POST 성공 pending과 공개 approved 분리 |
| `fortune_share_action` | `ResultSharing.tsx`; content_type=yeongnyangi,source=paid/daily,channel,outcome | editor opened, copied/manual, download_requested, opened/shared/cancelled/failed 등. fallback 한 행동이 두 관찰을 만들 수 있음 |
| `insight_share_available` / `insight_share_action` | `PublicInsightCard.tsx`; service,content_type,source; action에 stage,channel | available은 effect 실행이지 viewport 노출 아님. image_failed 경로는 일부 공통 필드 누락. preview_opened/created/copied/share_returned/download_requested/cancelled 등을 구분 |
| `insight_share_receive` / `insight_trial_click` | `InsightCardClient.tsx`; 유효 카드 GET 후 수신 service,content_type,source / CTA click service,content_type | 캐시 복원·재마운트 시 재관찰 가능. CTA는 missing/error 화면에도 있으므로 전체 클릭/수신 비율은 잘못된 분모 |
| `share_receive` | `analytics.js`; ref/via 또는 medium=share,campaign=public_share 진입. referral_channel, public_share면 content_id | 스크립트 중복 설치는 막지만 새 문서/새로고침은 새 관찰. legacy via는 자유 문자열 전달이므로 전역 개인정보 필터가 있다고 보지 않음 |

후기 원문·질문·결과 원문·이름·출생정보·이메일·인증 토큰·상담 ID는 새 이벤트 payload에 넣지 않는다. `cdTrack`는 모든 임의 payload를 자동 정제하는 도구가 아니므로 호출부 enum/allowlist가 필요하다. 거래 ID는 기존 승인 구매 계약에만 유지하고 후기/공유 ID로 재사용하지 않는다.

### 캠페인별 수신과 기여

| 캠페인 | 링크 목적 | 현행 수신 | 내부 이동 기여 |
|---|---|---|---|
| `yeongnyangi_result` | 유료 결과에서 공개 상담 진입 `/yeongnyangi/fortune/` | GA4 page_location UTM은 유지. 명시적 `share_receive` 없음 | `share_campaign` 승계 없음; GA4 UTM 보고와 서버 귀속은 별개 |
| `yeongnyangi_daily` | 무료 오늘 운세에서 `/yeongnyangi/room/#daily` | 위와 같음 | 위와 같음 |
| `insight_yeongnyangi`, `insight_ggulggul` | 동의한 공개 한 문장 `/share/?card=...` | 유효 카드 후 `insight_share_receive`; 일반 `share_receive`와 중복 합산 금지 | 동의하면 sessionStorage로 30분, 기존 이벤트에 share_campaign. 미동의면 현재 URL에서만, 동의 철회 후 저장 제거 |
| `public_share` | 공개 서비스/소개 페이지 | 기존 `share_receive` | insight 귀속 대상 아님 |

공유 카드 ID·철회 토큰은 분석 이벤트에 싣지 않는다. 현행 page_location은 UTM만 남겨 card 쿼리를 제거한다. UTM 자체를 임의 개인정보로 채워도 자동 정제된다고 보장하지 않는다. 이미지 저장 요청은 전달/수신 성공이 아니며, 1회 송신에 여러 수신이 가능해 수신/송신을 100% 상한의 성공률로 해석하지 않는다.

## 5. S05/S06 전달 계약 — 명칭 확정, 호출부 미구현

새 SDK나 공통 전송기를 만들지 않는다. React는 `lib/analytics.ts:trackEvent`, 셸은 기존 `window.cdTrack`을 사용한다. 아래 **제안 계약은 아직 운영 발화하지 않는다**. S05가 자기 호출부에서 연결·mock 검증한다.

공통 payload: `service=ggulggul|yeongnyangi`, 서버 후기 catalog의 `product_id`(불명은 unknown), `surface=paid_result|reviews|history|home`, `eligibility=unknown|eligible|ineligible|already_reviewed|error`, `metric_version=1`. 원 상품 SKU와 후기 상품군을 혼동하지 않는다. 분석 적격은 서버 eligibility 응답 기준이며 클라이언트 query로 자격을 만들지 않는다.

| S05 이벤트 | 발화 조건 | 중복 기준 |
|---|---|---|
| `review_invite_view` | 초대가 실제 viewport에 노출 | 문서 생명주기×surface×product_id×eligibility별 1회; unknown 노출을 적격 분모로 세지 않음 |
| `review_invite_click` | 후기 초대 CTA 클릭 | 한 사용자 click 처리당 1회, 의도적인 재클릭은 허용 |
| `review_write_start` | 적격 상품에서 사용자가 별점/본문/제목을 처음 직접 수정 | 작성 dialog 세션×product_id당 1회; 자동 기본값/로그인 복원으로 발화 금지 |
| `review_submit_attempt` | 검증 통과한 POST 직전 | 요청 1회당 1회, busy 중복 제출 제외 |
| `review_submit_success` | 서버 성공 응답, `review_status=pending` | 같은 요청 성공은 1회; 공개 승인/보상 지급으로 기록 금지 |
| `review_submit_failed` | POST 실패/네트워크 오류 | 요청당 1회; `reason=network|validation|ineligible|duplicate|server|unknown`만 허용. 원문 오류 제외 |

공개 승인·반려·보상 지급은 서버 원장 상태로 집계한다. 클라이언트에서 review_approved를 만들어 대체하지 않는다. 원문 긍정/부정·별점에 따라 초대를 달리하지 않는다. 제품 맥락·eligibility 보존 및 20자·상품별 1회·승인 후 월정석 정책은 S05 소유다.

S06은 기존 action/receive 이벤트 이름을 우선 재사용하고 stage/outcome의 뜻을 위 사전대로 지킨다. 유효 문장 단계가 필요하면 `insight_share_action.stage=valid_draft`를 미리보기 세션 첫 유효 전환에 1회만 연결한다. 원문/문장 해시를 보내지 않는다. UI 240/서버 120 불일치와 호출부의 중복 기준은 S06에서 수정한다.

일반 결과/daily 수신 보강 시 **공통 analytics 파일은 S00 소유**다. 이후 S00 계측 구현 단위에서 `utm_medium=share`와 두 캠페인 enum을 검증한 진입에 `share_receive` + `share_campaign` + allowlisted `referral_channel`(image 포함)을 제안한다. insight 수신을 여기에 합치지 않는다. 현재 S00은 누락 진단과 재현까지만 완료하며 런타임 수정·캐시 버전 변경을 하지 않는다. 확대 구현에는 동의/TTL/중복/PII와 실제 링크를 함께 검증해야 한다.

## 6. 운영 조회기와 analytics 버전 점검

`scripts/report-revenue-funnel.mjs`는 native Mongo driver의 find/aggregate/distinct/count만 사용하고 HTTP를 차단한다. 모델 초기화·인덱스 생성·쓰기·LLM·PG 호출은 없다. 출력은 집계 중심이며 식별자/이메일은 내보내지 않는다. 그러나 다음 이유로 **실행 결과를 바로 이 표에 채우면 안 된다**.

1. payments 필터는 `createdAt`이며 `paidAt` 승인 코호트가 아니다. W 이전 생성→W 승인 주문을 놓치고 W 생성→나중 승인 주문이 섞인다.
2. current는 오늘 00시부터 일부 오늘까지 포함하고 previous는 온전한 기간이다. W/P 완료된 28일과 다르며 실행 시각에 따라 길이도 다르다.
3. admin/명시 이메일 제외는 payments에 적용하지만 requests에는 사용자 제외가 없고 signups도 지정 이메일을 제외하지 않는다. 익명 checkout에는 사용자 제외 연결 자체가 없다.
4. 요청의 paymentId 또는 passEvidenceId 존재를 paid로 묶는다. 승인 주문과 join하지 않아 이용권 사용과 PG 구매·미승인 증거를 구분한 전달률이 아니다.
5. paymentMethod/paymentType별 출력은 있지만 선물·Play 제외를 강제하지 않고 금액을 KRW로 합산한다. 통화 일치 확인 전 혼합 원장의 총매출로 쓰지 않는다.

운영 재집계에 필요한 것은 확정 테스트 제외 기준, W/P GA4 시간대·필터/동의 모수, paidAt 기준 통화별 웹 승인/환불 및 동일 주문→요청 연결의 비식별 집계, 후기 제출/승인 집계다. 원본 개인정보를 저장소에 내보내지 않는다. 이 세션에서는 운영 DB 조회기를 실행하지 않았고 검증된 현재 export를 확보하지 못했다. 조회 접근 불가를 추정해 단정한 것은 아니다.

조사 기준 소스의 React `app/layout.js`는 `/js/core/analytics.js?v=20260814-ga4-v1`(afterInteractive), 셸 `index.html`과 `public/ggulggul/index.html`·`public/index.html`은 `?v=build-79885c7c9c24`(defer)다. `Get-FileHash js/core/analytics.js,public/js/core/analytics.js -Algorithm SHA256`의 두 값은 `79885c7c9c24e041d423f07f1887e76497193fa000bcae8a816d98d6811f73ad`로 일치한다. `lib/analytics.ts`는 초기 설치 전 이벤트를 최대 32개/30초 보관하는 래퍼다.

이는 **현재 체크아웃의 참조 버전** 확인이다. 운영 배포 SHA·응답 헤더·실제 브라우저 캐시는 이번에 조회하지 않았다. 9월의 7일 캐시 관찰을 근거로 지금도 실제 지연 중이라고 단정하지 않는다. 운영 집계를 재개할 때 해당 페이지가 실제 받은 script URL/응답 내용·헤더를 별도 기록한다.

## 7. 검증 기록

- `node --test __tests__/ui/purchase-analytics.test.mjs __tests__/ui/paid-review-invite.test.mjs __tests__/ui/review-reward-copy.test.mjs`: **18/18 PASS**. purchase 기존 9개+S00 5개, 후기 4개. JSDOM/esbuild와 실제 confirm 봉투/링크 생성기 사용, 외부 네트워크 guard 적용.
- S00 추가: 동의별 새 문서 구매 중복, 이용권/월정석 사용의 구매 오인 방지, insight 캠페인 TTL/철회·본문/카드 ID 제외, 미동의 URL 한정, 실제 결과/daily/insight 링크의 수신 커버리지 재현. 링크의 수신 누락을 관찰 테스트로 명시했으며, 향후 개선 시 기대값을 함께 바꿔야 한다.
- `node scripts/verify-analytics-events.mjs`: **PASS**. 동의 순서/3상태·공유 수신·페이지뷰 단일 발화·포털·크로스셀·배너 계약.
- `node scripts/verify-insight-cards.mjs --unit`: **PASS backend**. mock 모델·fetch로 projection/동의/PII·철회 권한·중복·만료·오류·edge OG/no-store 확인. 브라우저 편집기 검증과 구분한다.
- `npm run test:jest -- --runInBand __tests__/worker/review-create.test.js __tests__/worker/review-approval-reward.test.js`: **2 suites, 16/16 PASS**. 제출 pending과 승인 후 보상 경계를 mock으로 확인했다.
- `npm run check:fast -- --plan`: 변경 4파일, 테스트 변경에 따라 critical로 자동 분류됐다. `npm run check:fast`: 문서 신선도·lint·사이트맵(955 URL)·typecheck 통과 뒤 Node **2,944/2,945**, 기존 `yeongnyangi-tarot-spread-v3.test.mjs:156`의 `TAROT_UNDRAWN_CARD`로 **exit 1**. 이후 단계는 이 실행에서 미수행이다. 전체 check:fast 통과로 보고하지 않는다.
- 실패 항목만 `node --test __tests__/ui/yeongnyangi-tarot-spread-v3.test.mjs`로 재현 시도: **12/12 PASS**, 오류 재현 실패. 해당 테스트·타로/프롬프트 런타임의 base 대비 diff는 없다. 원인 확정/수정/무시 처리하지 않았으며 full-suite 실패 기록을 유지한다. 최종 main CI의 정확한 SHA 결과는 전달 메시지에서 별도로 확인한다.
- `git diff --check`: exit 0. 원본/미러 analytics SHA-256 일치. S00 관련 Node 18개 및 후기 서버 16개가 통과했지만 실제 후기 브라우저 제출 UI 검사는 이번 범위에서 실행하지 않았다.
- 실결제·유료 LLM·운영 DB 쓰기·운영 후기 제출·실공유·운영 승격 0회. 운영 구매율·매출 상승·수신율 개선·실기기 UI는 미검증.

`status: done`은 S00 진단·이벤트 사전·관련 mock 검증 산출물의 완료다. 운영 집계 확보, 신규 계측 연결, 전체 로컬 check:fast 성공, S01~S09 구현 완료를 뜻하지 않는다.
