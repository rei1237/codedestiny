# 남은 유료 상세페이지 11개 — 판매·결과 재확인

> 후속 갱신: 사용자 “계산 수정해” 승인 후 주역 상하괘 대응과 난수 경계를 수정하고 64괘 회귀 검증을 통과했다. 아래 표는 최초 조사 당시 상태다. 전달·검증 현황은 `docs/handoff/2026-10-12-paid-details-sale-blockers.md`의 계산 수정 절을 따른다. 전용 상세페이지는 아직 미제작이다.

확인 기준: 원격 main `aa70afbcd951ab84daab1874b187756c65c05250`.
2026-10-11 밤부터 2026-10-12 자정까지 확인했다. 가격 변경 중인 다른 세션의 미커밋 파일은 사용하지 않았다.

## 제작 판정

현행 코드에서 바로 제작할 수 있는 신규 상품은 0개다. 아래 11개는 판매 확정 목록이 아니라 보류 후보다. 기존 154개 원본을 새 제작 실적으로 재집계하지 않는다.

| 상품 키 | 판매 진입·입력·결과 확인 | 판정과 필요한 다음 작업 |
|---|---|---|
| `openJuyukModal` | `js/core/service-registry.js`의 `juyuk-turtle`, `js/iching-engine.js`의 `_TC_FEATURE_KEY`. 질문 입력 후 질문의 메아리·대성괘·체용·비책·5분야·옛 지혜·갈무리, AI에 복사할 질문문을 제공한다. | 판매 진입은 있으나 `_doReveal`의 상하괘와 64괘 선택이 독립 난수다. 계산 수정·회귀 검증 후 상세 제작 가능. AI 질문문을 AI 답변으로 소개하지 않는다. |
| `fortune-chat-question-mackerel` | 서버 `worker/yeongnyangi/payments/catalog.ts`와 `worker/routes/fortune-chat-consultations.js`에 계약 존재. | 아래 상담실 UI 연결 조건 미충족. 독립 상세 보류. |
| `fortune-chat-question-salmon` | 같은 서버 계약의 연어 구성. | 같은 UI 연결 조건 미충족. 독립 상세 보류. |
| `fortune-chat-question-flounder` | 같은 서버 계약의 광어 구성. | 같은 UI 연결 조건 미충족. 독립 상세 보류. |
| `fortune-chat-question-tuna` | 같은 서버 계약의 참치 구성. 지원 체계 제한도 서버에 존재한다. | 같은 UI 연결 조건 미충족. 지원하지 않는 체계의 참치 상담을 약속하지 않는다. |
| `astro_monthly_transit` | 가격 정본에 존재. 현재 `js/core/astro/transit-reading.js`, `js/saju-engine.js`의 판매 기간 상품은 `astro_yearly_transit`. | 월간 독립 판매·결과 확인 불가. 기존 `astro-yearly-transit` 상세를 월간 상품으로 재포장하지 않는다. |
| `sukuyo-monthly-fortune` | `SY_PAID_FEATURES.monthlyFortune` 및 과거 해금 상태 처리에 존재. `syBindSukuyoMonthlyUnlock`은 연간 버튼을 연결한다. | 실제 결제는 `syOpenSukuyoYearlyCheckout`의 `sukyo_yearly_fortune_unlock`. 기존 `sukuyo-yearly` 상세 연결 확인. 별도 월간 상세 제작 불가. |
| `sajuDiary` | 가격 정본의 `unlock.saju_diary`만 확인. 앱·셸의 직접 상품 진입 미발견. | 현행 `luck-sync-diary`와 같은 상품이라고 단정할 근거 없음. 독립 입력·결과·판매 근거 필요. |
| `section_compat` | `index.html`, `js/core/access-store.js`, `js/core/birth-scope-unlocks.js`에 권한 별칭·출생 범위 처리 존재. | 현행 `compat-saju-compatibility` 상세는 이미 있음. 구 키의 독립 판매·결과 근거가 없으므로 중복 제작하지 않는다. |
| `premiumTarot` | 가격 정본에 존재. 현재 앱·셸의 직접 상품 진입 미발견. | 개별 타로 상품과 별개인 이 키의 입력·판매·결과를 확인해야 제작 가능. |
| `premiumDivinationPack` | 가격 정본의 `unlock.premium_divination_pack`에 존재. 현재 앱·셸의 직접 상품 진입 미발견. | 실제 포함 상품·별도 구매·결과 근거가 없어 패키지 구성을 작성할 수 없음. |

검색 범위: `index.html`, `js`, `app`, `components`, `lib`, `src`, `config`, `data` 및 관련 Worker 가격·상담 계약. 스냅샷·과거 워크트리·생성 미러는 판매 증거로 사용하지 않았다. 미발견은 이 범위의 정적 코드 조사 결과이며 운영의 모든 사용자 상태를 실측했다는 뜻은 아니다.

### 상담 4종의 미연결 근거

- `app/fortune-chat/ConsultationRoom.tsx:290`의 create는 persona/domain/question, 명식 상담이면 profileId, 타로면 tarotKind를 보낸다. fishId/questionDecision을 보내지 않는다.
- `app/fortune-chat/consultation-api.ts`의 `CreateConsultationInput`에도 두 필드가 없다.
- `worker/routes/fortune-chat-consultations.js:124`는 질문 우선 UI 출시 전 기존 유료 클라이언트를 유지하는 호환 경로임을 명시한다.
- 영냥이 생선 상담 상품과 이 네 상품은 다른 판매 진입이다. 영냥이 이미지를 재사용해 연결 완료로 표시하지 않는다.

### 주역 불일치 재현

`_doReveal`과 같은 난수식에 seed 0을 넣으면 upperIndex 2(리·불), lowerIndex 6(간·산), hexIndex 3(`산수몽`)이 나온다. 표시 상하괘와 이름이 불일치한다. 실결제·LLM·브라우저 실행 없이 순수 계산으로 확인했다.

인수인계가 계산 수정을 콘텐츠 작업에 몰래 포함하지 않도록 명시하므로, 주역 계산 수정·회귀 검증을 별도 범위로 포함할지 사용자에게 확인했다. 답변 전에는 계산 코드나 상세 자산을 수정하지 않는다.

## 기존 배포·CI 확인

- 요청된 운영 배포 [38148418850](https://github.com/rei1237/codedestiny/actions/runs/38148418850): 조회 시 `in_progress`. 중복 dispatch 없음.
- 기준 코드 CI [38148407669](https://github.com/rei1237/codedestiny/actions/runs/38148407669): `failure`, SHA `824b903b8cb74ce0a4ade0451ab89396ecfe807e`.
- 실패 단계: `Static guards / Verify ziwei chart detail view and compatibility card`. 직접 오류: `TypeError: panel.before is not a function`.
- 최종 main CI [38148771754](https://github.com/rei1237/codedestiny/actions/runs/38148771754)도 `failure`. SHA `aa70afbcd951ab84daab1874b187756c65c05250`에서 같은 `panel.before` 오류를 로그로 확인했다.
- 운영 GET `/version.json`와 `/api/version`: 모두 `54862e3094e756f998712dcfaa5102de0ac54ba1`. 요청한 배포 SHA가 아직 아님.
- 운영 GET `/api/fortune-chat/consultations/status`: `enabled: false`.
- 위 조회는 배포 완료 증거가 아니다. 새 배포, 과금 LLM, 실결제, 운영 DB 쓰기를 실행하지 않았다.

## 작업 경계

기본 main에는 가격·홈·번역 등의 다른 세션 미커밋 변경이 있다. 이번 작업본은 `D:\Development\codedestiny-worktrees\paid-details-next-20261011-235722`이며 원격 main을 기준으로 생성했다. 원본 작업본을 인수하거나 다른 세션 파일을 덮어쓰지 않았다.

가격·이용권·월정석·단건 결제·인증·API·DB는 무변경. 신규 상세페이지 제작 및 모바일 검수는 아직 시작하지 않았으며 완료로 집계하지 않는다. 기존 main CI 실패가 해소되기 전에는 추가 push하지 않는다.

검증: `npm run check:fast -- --plan`은 문서 변경만 분류했고 `npm run check:fast`의 whitespace·doc-freshness가 통과했다. `git diff --check` 통과. 신규 UI·이미지가 없으므로 모바일 검수·렌더 검사는 미실행이다.
