---
status: done
updated: 2026-10-07
next: "S00 진단·계약·관련 mock 완료. 운영 잠정 집계·GA4 현재 IP 제외 활성 확인. 정제 전환율·S05/S06 연결·React 캐시 버전은 후속"
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

최초 진단에서는 아래 전 행의 W/P **분자·분모 값 모두 미확보**였다. 후속 운영 조회로 확보한 잠정 원장 수치와 남은 제약은 §8을 우선한다. 표본이 없는 것이 확인되면 분모 0의 비율은 `N/A`; 아직 조회하지 않은 값은 `미확보`이며 0이나 0%가 아니다.

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

### 전달 CI 후속

S00 구현 커밋 `c86fbf326`, main 전달 `eee6b5b4b07beec7a74bf283de70e68243bffdba`는 [CI 37620945333](https://github.com/rei1237/codedestiny/actions/runs/37620945333)에서 타입·lint·빌드·critical(전체 Test 포함)이 통과했다. 로컬 타로 오류는 CI에서 재현되지 않았으나 원인이 해결됐다고 단정하지 않는다.

최종 CI required는 타 세션의 `docs/handoff/fortune-chat-question-2026-10-07.md`에 frontmatter가 없어 실패했다. 같은 `node scripts/verify-handoff-contract.mjs`로 재현했고, 전달을 위해 해당 문서의 본문을 그대로 보존한 채 필수 status/updated/next만 추가했다. 원 작업은 미완료이므로 status는 active를 유지하며 완료로 닫지 않는다. 이는 S00 외 제품 수정이 아니라 CI 문서 형식 보완이다. 수정 후 정확한 main SHA의 필수 CI 판정은 최종 전달 메시지에서 확인한다.

후속 검증: `npm run verify:handoff-contract -- --self-test` 11건, `npm run verify:handoff-contract` 167문서, 문서 2파일 대상 `npm run check:fast -- --plan`(fast) 및 `npm run check:fast` 모두 exit 0. 이 문서 전용 검사 통과가 최초 코드 검사 전체를 재실행한 뜻은 아니다.

## 8. 남은 확인 후속 — 2026-10-07 실조회

이 절은 위 최초 진단의 ‘운영 조회 미실행’ 상태를 갱신한다. 조회 기준 코드는 `20d36f1bd7ce9a1f90aca20e9920d419d85a877e`이며 다른 세션 변경은 별도 워크트리로 보존했다. S05/S06의 신규 이벤트 연결은 여전히 별도 구현 범위다.

### 운영 DB: 잠정 원장 집계 확보

2026-10-07 22:06 KST, 운영 `code_destiny`에 native Mongo driver로 **find/aggregate만** 실행했다. 모델 초기화·인덱스 생성·쓰기·PG·LLM 호출은 하지 않았다. 기간은 §3의 완료된 KST 28일 W/P다. 조회 시점 상태를 관찰했으므로 기간 이후 완료·환불도 현재 상태에 포함될 수 있다.

제외 기준을 찾았다: `docs/context/delivery-and-ci.md`와 `scripts/seed-preview-test-account.mjs`, `scripts/migrations/20260906-purge-test-reports-and-orphan-collections.mjs`가 `.env.local`의 `CD_PREVIEW_TEST_EMAIL`을 테스트 계정으로 명시한다. 값은 출력·복제하지 않고 users._id와 메모리에서만 대조했다. 현재 admin 0개, 확인된 테스트 계정 1개다. **이외 운영자·테스트 계정의 완전한 목록은 미확정**이므로 아래는 실제 고객 매출/구매율이 아니라 부분 제외한 잠정 원장 수치다. 집중 구매·반복 환불을 임의로 테스트라고 분류하지 않았다.

| 지표 | W: 9/9~10/6 KST | P: 8/12~9/8 KST |
|---|---:|---:|
| createdAt 기준 주문 원본 | 79 | 163 |
| 확인된 계정으로 제외한 생성 주문 | 1 | 28 |
| 남은 생성 주문 | 78 | 135 |
| 현재 상태 paid / refunded / failed / cancelled / pending | 43 / 18 / 7 / 5 / 5 | 4 / 2 / 77 / 51 / 1 |
| paidAt 기준 승인 주문(추후 환불 포함) | 61 | 6 |
| 위 승인 주문에서 확인된 테스트 계정 제외 건수 | 0 | 0 |
| rawPortOne.currency=KRW 승인 금액 합계 | 433,658원 | 67,600원 |
| 승인 주문 유형: digital_content / membership_pass | 58 / 3 | 2 / 4 |
| 승인 코호트 중 현재 refunded 상태 | 18 | 2 |
| 대표 상품 `yeongnyangi-saju-mackerel` 승인 주문 | 24 | 0 |
| createdAt 기준 영냥이 요청(확인된 계정 제외 후) | 79 | 0 |
| 승인 주문 ID와 paymentId가 연결된 영냥이 요청 | 41 | 0 |
| 위 연결 요청 중 COMPLETED+completedAt+저장 챕터 수 일치 | 34 | 0 |
| createdAt 기준 reviews 원본 | 0 | 0 |

통화 미기록·PG 금액 미기록은 이 승인 코호트에서 각각 0건이다. 금액은 `paymentAmount`를 일괄 KRW로 간주하지 않고 `rawPortOne.currency/amount`로 합산했다. 환불 실액·부분 환불·수수료를 조회하지 않았으므로 순매출을 계산하지 않는다. `purchaseType` 미기록 생성 주문이 W 75/P 135건이라 선물 여부를 모두 확정하지 못했고, 다른 주문/앱 원장까지 포괄한 웹 전용 고객 전환율로 발표하지 않는다. paid 계열/환불 생성 주문 중 paidAt 누락은 0건이었다.

W 영냥이 요청은 accessMethod/state별 `unknown/CREATED 33`, `unknown/REFUNDED 1`, `unknown/COMPLETED 1`, `DIRECT_KRW/REFUNDED 6`, `DIRECT_KRW/COMPLETED 33`, `MOONLIGHT_STONE/COMPLETED 4`, `FAMILY/COMPLETED 1`이다. 월정석·이용권 사용을 신규 PG 구매에 합치지 않았다. COMPLETED+챕터 개수 검사는 필수 본문 전체의 품질/스키마 검증과 다르며, 34/61을 완료율로 계산하지 않는다(다른 서비스와 이용권 구매 포함). 후기 제출 코호트 0건의 승인율은 **N/A**, 클라이언트 작성 시작·초대 노출 수는 여전히 계측 공백이다.

재현 조건: payments는 `createdAt OR paidAt`가 `[2026-08-11T15:00Z,2026-10-06T15:00Z)`인 행을 최소 projection으로 읽고 20,000행 초과 시 중단했다. 각 W/P의 생성·승인 코호트를 별도 분리했으며 승인은 `paid|success|fulfilled` 또는 `refunded`+`refundedAt`에 `paidAt` 기간 조건을 적용했다. 요청은 `createdAt` 범위 또는 승인 `_id`와 일치하는 `paymentId`로 읽고 동일 계정 제외를 적용했다. 챕터 본문은 읽지 않고 서버 `$size`만 사용했다. reviews는 `createdAt` 범위, 동일 계정·createdByAdmin·빈 userId 제외, 상태/approvedAt만 관찰했다. 모든 조회는 `maxTimeMS=12000`, pool=1이었다. 일반 sandbox 접속은 진행되지 않아 중단하고 승인된 외부 네트워크 실행으로 성공했다. 비식별 합계만 이 문서에 보존하고 임시 조회 파일은 작업 후 삭제했다.

### GA4: 현재 설정과 관측치 확인, 내부 트래픽 필터 수정

로그인된 Chrome에서 Code:Destiny / FortuneDevelope, 속성 `526361229`, 웹 스트림 `13684562754` / `G-FMHV4ZHY3G`를 확인했다.

- 보고 시간대는 **미국 로스앤젤레스(GMT-07:00)**, 표시 통화는 USD였다. KST와 16시간 다르므로 GA 날짜 9/9~10/6을 서버 KST W와 합치지 않는다. 시간대·통화는 임의 변경하지 않았다.
- 같은 달력 날짜의 보고서 개요는 활성 사용자 42, 신규 사용자 20, Purchasers 잠재고객 활성 사용자 5, 주요 이벤트 18을 표시했다. 이는 모든 사용자·속성 시간대의 UI 관측이며 동의·운영자 제외 후 순차 구매율이 아니다. 상품 보고서 메뉴는 개요로 되돌아와 상품별 W/P 값을 확보하지 못했다. 이전 기간과 정확한 KST 시간 단위 export도 미확보다.
- 최초 확인에서 `Internal Traffic`은 **제외 / 테스트**, 웹 스트림의 **내부 트래픽 IP 규칙은 0개**였다. 즉 필터 활성화만으로 해결되는 상태가 아니었다.
- 사용자 요청 “GA4 내부 트래픽 필터를 정확하게 해줘”에 따라 현재 Chrome의 공인 IPv4를 실제 조회했다. IPv6는 감지되지 않았다. `Operator workstation IPv4 2026-10-07` 규칙을 **IP 주소가 다음과 같음(단일 IP 정확 일치)**, `traffic_type=internal`로 저장했다. IP 전체 값은 저장소에 남기지 않는다.
- 기존 `Internal Traffic`의 `traffic_type=internal` **제외** 조건을 확인한 뒤 **활성**으로 저장하고 최종 목록에서 ‘활성’을 확인했다. 광역 CIDR/통신사·국가 전체 제외나 임의 계정 제외는 추가하지 않았다.
- 설정 저장 완료와 보고서 처리 검증은 구분한다. 과거 데이터는 소급 정제되지 않고, 다른 네트워크·모바일 데이터·변경된 공인 IP는 이 규칙에 매칭되지 않는다. GA 처리 후 실제 제외 건수는 아직 관찰하지 않았다. [Google 공식 내부 트래픽 필터 문서](https://support.google.com/analytics/answer/10104470?hl=ko).

### 운영 analytics 자산

공개 HTML/JS를 읽기 전용 GET으로 대조했다. `/ggulggul/`의 `?v=build-79885c7c9c24` 응답은 HTTP 200, `public, max-age=604800, stale-while-revalidate=2592000`, CF HIT였다. 응답 SHA256 `ca35cdc366a94cf127f08d079cfac67ccb31cce663aec7878e9cd5ab91d7f669`는 **현재 소스를 배포 스크립트와 같은 esbuild minify 옵션으로 변환한 결과와 바이트 단위 일치**한다. 원본 해시와 다른 것은 minify 때문이다.

반면 운영 `/yeongnyangi/fortune/` HTML은 여전히 `?v=20260814-ga4-v1`을 참조한다. 그 URL은 HTTP 200/CF HIT, Age 522,327초, SHA256 `dbd05411c9d7c5aa6122f3f95e7d69f67c085137c275e605d62154beaf003911`로 현재 minify 결과와 다르다. **React와 셸이 서로 다른 analytics 응답을 받을 수 있음을 실측**했다. 이 관찰은 특정 기능 오작동의 증명이나 전체 운영 SHA 판정은 아니다. 캐시 퍼지·운영 승격은 실행하지 않았다.

### 실제 브라우저 mock 후속

공식 `npm run dev`의 mock 전용 런처(14128/14129), Node 외부 전송 guard, 브라우저 외부 요청 차단과 API mock을 사용했다. 실결제·유료 LLM·운영 후기/공유 POST·운영 DB 쓰기는 0회다.

- 공유: 초기 `/today/`는 워크트리의 생성형 일일 정적 JSON 누락으로 500이었다. `node scripts/fortune-build-data.mjs`를 외부 네트워크 guard와 함께 실행해 로컬 데이터만 생성한 후 `node scripts/verify-insight-cards.mjs` **360/390/430/1280px 전부 PASS**. 미리보기·동의·mock 생성·복사·공유 취소·수신·철회·만료·이미지 저장·원문/토큰의 이벤트 유출 방지를 확인했다. 운영 공개 발행은 아니다.
- 후기: 기존 검사는 작성/로그인 복귀/상태/1회 제출/중복 차단/키보드 초점/구매 내역 CTA를 통과한 뒤 홈에서 timeout이었다. 홈 안내가 `#cdhMore`의 접힌 details 안에 있는 현재 구조를 검사에서 누락했다. 제품을 바꾸지 않고 검사가 실제 summary 클릭을 수행하도록 수정하고 Node 네트워크 guard를 추가했다. `REVIEW_UI_BASE_URL=http://127.0.0.1:14128 node scripts/verify-review-anytime-ui.mjs` 재실행은 **320/390/1280px, 작성·로그인 복귀·상태·1회 제출·오류/재시도·키보드 초점·내역/홈 CTA·neo 테마 전부 PASS**였다.

운영 원장의 잠정 수치 확보, GA4 제외 설정, 실제 공유 UI mock은 진전했지만 **동의·테스트 제외가 정제된 동일 KST 기간의 고객 순차 전환율**은 아직 확보하지 못했다. S05/S06 발화 연결과 React analytics 캐시 버전 정리는 별도 구현 대상으로 명확히 남긴다.
