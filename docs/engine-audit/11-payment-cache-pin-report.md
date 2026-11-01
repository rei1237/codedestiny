# 결제 캐시 핀 복구와 실 DB·PG 검증 준비

status: implemented-verified-local-only

사용자 요청: 남은 결제 캐시 핀 실패 수정과 관련 회귀 검증, 실제 DB·PG 검증 전 준비/승인 범위 정리. 중간 로컬 커밋 후에도 계속 작업하며 push·배포하지 않는다. 기준은 CR-006 완료 `068dcd374`다.

계획: 기존 전용 핀 생성기 → 공개 미러 생성/검사 → 결제 선택·복귀/저장 보존·CR-006 회귀 → 실 DB·PG의 구체적 준비/승인 표 → 로컬 커밋과 최종 보고. v2 기본 OFF, Swiss 차단, 기존 결과/유료 자산 보존, 실 LLM/DB/PG 미호출을 유지한다.

## 수정 원인과 범위

`js/destiny-profile.js`의 내용에서 기존 검사기가 산출한 독립 결제 런타임 핀은 `build-fc0c52ff363f`다. 독립 페이지/React 로더/검사 기대값에 남은 `build-2029b9340aa4` 때문에 `verify:payment-choice-parity`가 실패했다. 런타임의 계산·결제 코드를 고치거나 검사 예외를 추가하지 않는다.

기존 `scripts/restamp-paid-runtime-pins.mjs`를 사용하고 `scripts/sync-legacy-static-to-public.mjs`로 생성 소유권을 맞췄다. 전자는 25개 파일을 갱신했고, 후자는 셸 방식으로 관리되는 베다 페이지 원본/미러 2개를 기존 값으로 복원했다. 최종 변경은 다음 **23개 파일의 참조 한 곳씩**이다.

- 원본 HTML 10개: `celestial-harmony.html`, `cosmic-soul-meditation.html`, `fortune-teller-fish.html`, `geomancy-oracle-v4.html`, `ifa_oracle_v2_full.html`, `neville-meditation.html`, `pet-saju.html`, `royal-tea-oracle.html`, `tarot-ijik.html`, `yoga-guru.html`.
- 공개 미러 11개: 위 페이지들의 `public/` 사본(ifa는 `public/ifa-oracle.html`)과 `public/static/geomancy-oracle-v4.html`.
- React 로더 `app/_lib/billing-client.ts`의 `PAID_SERVICE_RUNTIME_SRC`, `scripts/verify-paid-gate-ui-regression.mjs`의 동일 URL 기대값.

`verify-payment-choice-parity.mjs`의 내용 기반 핀 산식/판정은 변경하지 않는다. 기대 문자열 수정은 새 핀에 대한 동일한 단언을 유지하는 갱신이며 검사를 우회하지 않는다. 새 의존성·문구·가격·결제 데이터 형식·엔진·저장 모델 변경은 없다. 베다 페이지를 실행하지 않았고, 최종 파일도 기준과 같다.

추가로 `config/payment-freeze.json`의 **React 로더 해시 한 항목**을 기존 `verify-payment-freeze.mjs --update`로 갱신했다(`5b0e93d65eec45cb` → `c6f87f977533f780`). 이 가드는 URL 한 줄 변경에도 적용되므로 최초 회귀 검사에서 의도대로 실패했다. `worker/payments/`에는 해당 브라우저 자산 URL 참조가 없고 이번에 바뀐 서버 파일도 없음을 확인했다. 서버 결제 처리부를 복제 수정할 필요가 없으며, 원장의 다른 해시/줄 수 상한/검사기 본문은 보존했다. 로더와 원장 변경은 같은 커밋에 포함한다.

부가 `sync-feature-marketing-copy.mjs`는 이번 캐시 변경과 무관한 소개 JSON 재생성을 시작해 중단했다. 이번 작업 시작 시 깨끗했던 워크트리에서 이 명령이 만든 `public/feature-details/*.json` 73개만 기준 커밋 바이트로 복원했다. 소개 문구/관련 콘텐츠 목록 변경은 포함하지 않는다. 공개 미러 신선도 검사는 커밋된 트리에서 별도 확인한다.

## 실 DB·PG 검증 전 준비

아래는 **향후 실행안**이다. 이번 요청은 준비/승인 범위 정리까지이며 실제 연결·주문 생성·결제·배포 권한을 의미하지 않는다. 운영 설정/비밀값을 조회하지 않았고, 연결 가능성·테스트 채널·실제 금액은 미확인이다.

| 순서 | 준비할 것 | 통과 조건 / 이번 상태 |
|---|---|---|
| 1. 코드/실행 그래프 | 검증한 커밋, 잠금 파일, OFF 기본값, 읽기 전용 엔진 핀을 고정. 계산은 기존 공개 래퍼만 호출 | 로컬 확인. 전체 Worker·PG 라우트 import의 Swiss 비연결 증명은 아직 없음 |
| 2. 환경 분리 | 별도 테스트 DB명/계정/호스트 허용 목록, 운영과 다른 자격 증명, 한정된 사용자/실행 접두사 지정 | 미설정·미접속. `.env` 자동 로딩이나 운영 주소 기본값을 사용하지 않는 좁은 러너 필요 |
| 3. DB 구조 읽기 | 대상 DB의 `ziweiCalculationPreparations`와 `ziweiAiConsultations`만 컬렉션/인덱스 확인. 준비 `_id` 고유성과 기존 `(userId,idempotencyKey)` unique, TTL 유무, 샤딩·읽기/쓰기 설정 확인 | 실제 DB 미확인. `autoIndex:false`에서 기존 선언만으로 인덱스 존재를 추정하지 않음. 인덱스 생성/수선은 별도 승인 |
| 4. DB 왕복 | 합성 정보만 사용. 새 준비 저장, 두 연결 경합, 응답 유실 후 재조회, 다른 입력/계정 충돌, 기존 호환 snapshot reader, 손상 fixture 보류 | 아래 제한된 DB 쓰기 승인안 후 실행. 고객 결과 복제·수선·덮어쓰기 없음 |
| 5. PG 경로·금액 | 자미 prepare → 공통 결제창 → 실제 선택한 주문 발급/확정/웹훅 → 자미 generate의 요청 키·주문 ID 대응표 작성. 테스트/실운영 채널과 청구액을 서버에서 확인 | 로컬 소스만 추적. 실 채널/청구액 미확인. 스테이징이라는 이름만으로 비과금으로 보지 않음 |
| 6. 결과 전달 | LLM은 기존 mock 고정. 동일 요청 재전송·부분 재개·결제 복귀에 원래 준비 명반/버전 사용, 차감·생성 횟수 확인 | 로컬 mock 검증 범위. 실제 Mongo/브라우저/PG 결합 증거는 아님 |
| 7. 물리 기기 | PC 창 복귀와 모바일 리다이렉트 복귀를 구분. 승인된 동일 주문으로 복귀/재열람만 반복 | 기기·브라우저·계정 지정 후 별도 실증. 새 주문/추가 결제로 재현하지 않음 |

### 금액과 부작용에서 주의할 실제 코드 근거

- `worker/routes/ziwei-ai.js::buildPaymentPayload/createOrReusePaymentPayload`는 `pricing.amountKRW`를 쓰며, 설정된 채널이면 prepare에서 `Payment.create`로 pending 주문을 만들 수 있다. 따라서 **화면 준비/결제창 열기만 해도 DB 쓰기**다.
- 이 체크아웃의 `worker/lib/paid-feature-registry.js`에서 `ziwei-ai-consultation` 정가는 30,000원이다. 이것은 로컬 기준 값이며 다음 실험 전에 주문 경로의 실제 서버 금액을 다시 확인해야 한다.
- `docs/context/payment-gating.md`의 스테이징 소액 테스트 계약은 지정된 주문 경로에 관한 것이다. 자미 전용 prepare는 그 헬퍼를 직접 호출하지 않는다. 공통 V2 주문으로 이어질 수 있다는 이유만으로 **실제 청구가가 1,000원이라고 단정하지 않는다**. 이 작업에서 가격·테스트 금액·PortOne/Inicis 코드는 바꾸지 않았다.
- `scripts/verify-pg-window-live-e2e.mjs`는 기본 대상이 운영 주소이고 `.env`를 읽으며, 문서상 1회마다 pending 주문 1건을 만든다. 기존 `--live` 명령을 이번 준비 검사로 실행하지 않는다.
- `scripts/verify-mongo-launch-indexes.mjs`도 `.env`와 전체 모델을 로드해 실제 연결한다. 이번 승인 범위의 오프라인 정적 검사로 취급하지 않는다. 전체 모델/라우트 그래프가 Swiss 차단 조건을 만족하는지부터 별도 확인해야 한다.

## 다음 실행의 승인 단위

| 승인 단위 | 구체적으로 승인에 포함할 값 | 포함하지 않는 작업 |
|---|---|---|
| DB 읽기 전용 준비 확인 1회 | 정확한 환경/DB명, 전용 계정 역할, 위 2개 컬렉션의 메타데이터/인덱스 및 지정 합성 ID 읽기. 비밀값은 보안 저장소 참조만 기록 | 전체 고객 문서 조회/덤프, 데이터 변경, 인덱스 생성, PG/LLM |
| 격리 DB 쓰기 회귀 1회 | 합성 owner 2개, 준비 레코드 최대 4개·상담 fixture 최대 2개. 동일 키에 두 연결로 최대 20회 준비 시도. 최초 확정본 1개, 충돌/재개/손상 fixture 보류 확인. 이 한정 테스트 컬렉션의 최초 생성 허용 여부 명시 | 운영 DB, 실제 결제/원장, 고객 데이터, 기존 컬렉션 인덱스 수선. 자동 삭제/전체 DB 초기화 없음 |
| DB 실험 정리 | 승인된 실행 접두사와 정확한 생성 ID 목록만 삭제하거나 보존 기간을 지정. 실행 증거는 비식별 해시/개수만 남김 | 고객·기존 유료 결과 삭제, 포괄적 컬렉션 삭제 |
| PG 설정/창 확인 | 정확한 환경 URL, 전용 계정, 채널이 테스트인지 실청구인지 확인, 허용 주문 최대 1건과 만료/보관 방침. 금액/주문 ID 확인까지의 경계 지정 | 카드 승인·실청구·취소/환불, 임의의 새 주문 재시도 |
| PG 승인 왕복 1건 | 먼저 비과금 테스트 채널을 확인해 선택. 실청구가 필요하면 사용자가 **상품·최종 서버 금액·최대 총액·1회 한도·수단·계정**을 지정. 동일 주문에 대한 확인/웹훅 중복/복귀 재시도만 허용 | 다른 주문의 추가 결제, 금액 상향, 가격 변경, 실 LLM, 운영 승격 |
| 취소/환불 확인 | 별도로 지정한 그 주문 1건의 취소/환불 허용 여부와 최대 금액·증거/정산 확인. 기존 자동 실패 복원 경로를 실제로 시험할지까지 사전 명시 | “결제 1회 승인”을 환불/정산 승인으로 확대하지 않음 |
| push/배포/운영 ON | 별도 명시 승인, Swiss 비연결 실행 그래프와 필요한 공식 CI 확인, 클라이언트/Worker 버전 호환 확인 | DB/PG 시험 승인에서 자동 파생되지 않음. 이번에는 모두 금지 |

승인 전에 환경/계정/채널·금액이 아직 비어 있으면 실행하지 않는다. 준비 문서는 재사용 가능한 승인 범위이며 지금 승인 질문이나 실제 실행을 요청하는 것은 아니다. 외부 법적/PG 최소금액·최신 API 조건은 이번 오프라인 감사에서 확인한 사실로 주장하지 않는다.

## 실험 중단·보존·되돌림 기준

- 예상하지 않은 호스트/운영 DB/Swiss import, 승인되지 않은 PG 금액·채널·LLM 호출이면 해당 단계 시작 전 중단.
- 동일 키에 명반/버전/연도가 달라지거나 준비 자료가 손실되면 현재 requestId와 증거를 보존하고 재개만 보류. 새 키·새 주문으로 우회하지 않음.
- 중복 생성·추가 차감·타 계정 접근·기존 결과 해시 변화가 1건이라도 있으면 실제 PG 단계로 넘어가지 않음.
- 결제 상태가 불명확하면 같은 주문을 조회하며 신규 결제/자동 환불 실행으로 가정하지 않음. 승인된 범위를 벗어난 취소·정산은 별도 결정.
- v2 기본 OFF와 CR-006 호환 reader는 유지. 저장 자료를 모르는 구 Worker로 단순 복귀하거나 저장·유료 결과를 재계산하지 않음.
- 캐시 핀만 되돌려 오래된 런타임 주소를 다시 배포하지 않음. 향후 런타임 수정/되돌림이 필요하면 승인된 런타임 내용에서 새 핀을 재산출하고 원본·미러·회귀 검사를 함께 수행.

## 로컬 검증 결과

[최종 수정 범위 증거](results/payment-cache-pins-20261101/final-source-proof.json)는 23개 파일 각각이 **기준 파일의 캐시 URL 1개를 바꾼 결과와 완전히 같은지** 대조한다. 계산/결제 런타임, CR-006 래퍼/라우트/모델, 가격, PortOne/PG, 결제 복귀 훅, package/lock, 베다 원본/미러, 핵심 검사기 등 18개 파일의 기준 해시도 보존됐다. 동결 원장은 위의 한 항목만 달라졌음을 구조 비교로 확인했다. [최초 범위 증거](results/payment-cache-pins-20261101/source-proof.json)는 원장 갱신 전 상태로 별도 보존한다.

[추가 검사 출력](results/payment-cache-pins-20261101/verification.json):

| 검사 | 결과 |
|---|---|
| `verify-payment-choice-parity.mjs --self-test` | 통과. 실패해야 하는 합성 입력 6건·정상 2건도 통과. 10개 렌더러, 105 CSS 규칙, 12개 로케일 문구 검사 유지 |
| `verify-runtime-cache-sync.mjs` | 통과. 셸/미러의 런타임 참조 일치 |
| `verify-static-asset-cache-keys.mjs` | 통과. 자산 4종·참조 34건 |
| `verify-paid-resume-wiring.mjs` | 통과. React 49/49·정적 49/49·사주 단건 2/2, 재개 kind 47개 연결 |
| 변경된 React 로더·기존 UI 가드 대상 ESLint | 종료 0 |
| `verify-doc-freshness.mjs` | 종료 0 |

새 테스트를 구현과 같은 모양으로 추가하지 않고 기존 검증기를 사용했다. [CR-006/저장 보존 재실행](results/preparation-pinning-20261101/post-cache-pin-verification.json)은 이전 증거를 덮어쓰지 않고 별도 파일에 남겼다. **선택·준비·재개 23/23, 최초 확정 101건을 포함하는 공식/확대 골든 12/12, 저장·유료 mock 28/28 — 합계 63/63 통과**다. `tsc --noEmit`, CR-006 런타임 대상 lint, 결제 선택/카드 동작/정책 검사도 종료 0이다.

위 11개 명령의 최초 실행은 10개 통과, `payment-freeze` 1개 실패로 종료 1이었다. 이를 성공 로그로 바꾸지 않았다. 원장 한 항목 갱신 후 [동결 검사 재실행](results/payment-cache-pins-20261101/freeze-recheck.json)은 **region 4·file 3·줄 수 상한 2 모두 통과**했다. 이후 바뀐 것은 원장 메타데이터와 문서뿐이므로 63개 계산/저장 테스트를 불필요하게 반복하지 않았다. 추가 6개 명령은 모두 종료 0이다.

현재 핀 작업 재검증은 위 JSON의 명령 인자와 `node scripts/verify-payment-choice-parity.mjs --self-test`, `node scripts/verify-payment-freeze.mjs`를 사용한다. 과거 CR-006 묶음 러너는 당시 승인 범위에서 동결 원장 원문도 고정하므로, 이후 승인된 이번 원장 변경까지 그대로 재실행할 수 있다고 주장하지 않는다. 과거 기준 검사/증거를 약화하거나 덮어쓰지 않았다.

[check:fast 계획](results/payment-cache-pins-20261101/check-fast-plan.json)은 critical/full 경로를 선택했다. Swiss 연결 전체 Worker/라우트 import·전체 테스트/빌드/공식 CI는 계속 미실행이다. `verify:billing-pass-policy`와 `verify:portone-single-payment`도 기존 import 차단을 유지하며 가드를 약화하지 않는다. 허용 검사 통과를 전체 CI·실결제·운영 검증 통과로 표시하지 않는다.

실제 DB·PG·LLM·운영 배포는 미실행이다. 사용자 노출 문구·960px 레이아웃·공개 URL/색인 정책·가격/이용권/월정석 정책과 저장/유료 결과는 보존했다. 캐시 주소만 변경되어 새 화면 시안이나 실제 결제창 접속 검증은 하지 않았다. 로컬 커밋 후 미러/전달 정적 검사 결과는 아래에 기록한다.

## 최종 전달 상태

- 수정/동결 원장/검증 증거 로컬 커밋: `74241e06b02bb2ad4df994b8c2b3b4ce7ce93868`.
- 커밋 이후에도 중단하지 않고 `npm run check:pre-push`를 실행해 **종료 0** 확인. 홈 등록부 63개, 공개 미러 재생성 차이 없음, 사이트맵 1,037개, llms·SEO 등록부 통과. 사이트맵 원장이나 URL 집합의 추가 변경은 없었다.
- 검증 증거는 [manifest.json](results/payment-cache-pins-20261101/manifest.json)에 해시로 고정했다. 공백·문서 링크 검사 통과. 이번 변경은 기본 OFF, Swiss 차단과 기존 자산 보존 조건을 유지한다.
- 남은 것은 위 승인표의 실제 환경/DB/PG/물리 기기 검증 및 Swiss 비연결 공식 CI 경계다. 이번 캐시 핀 실패와 동결 가드 불일치는 해결했다. 이것을 운영 적용/실결제 성공으로 주장하지 않는다.
- 기존 감사 워크트리에 로컬 커밋으로 보존하며 다른 세션 변경은 건드리지 않았다. main 병합·push·배포는 하지 않았다.
