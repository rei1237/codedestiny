# 모든 운세 엔진 → 기본 결과·LLM 상담 연결 인수인계

status: done
next_task_status: partial-default-off
date: 2026-11-02

이 문서는 인수인계 작성 완료를 뜻한다. 모든 엔진의 정확도 개선·서비스 연결·운영 적용이 완료됐다는 뜻이 아니다.

## 1. 다음 채팅의 사용자 요청

> 사주 이외에도 다른 운세 엔진 관련해서도 서비스 llm이나 기본 운세 등의 모든 부분에 적용되도록 수정해주는것을 후속으로 진행해줄 인수인계 문서 만들어서 새 채팅창에서 진행할 수 있도록 작성해줘

후속 목표: 검증된 엔진 결과를 기본 운세, 상세 분석, LLM 상담, 결제 후 생성·전달, 재열람, PDF·공유 등 실제 소비 경로에 빠짐없이 연결한다. 사주뿐 아니라 자미두수·타로·서양점성술·숙요·베다/낙샤트라를 포함한다. 연애·재물·총운·궁합·운명의 찻집·네오·영냥이·초융합 등 상품은 사용 체계별 사실 스냅샷을 소비한다.

새 채팅은 문서 작성만 반복하지 말고 허용된 경로 조사→구현→mock 회귀→보고까지 진행한다. 중간 커밋에서 멈추지 않는다. 차단된 체계는 명확히 남기고 독립적으로 진행 가능한 경로를 계속 완료한다. 실제 운영 활성화·push·배포는 이번 승인이 아니다.

## 2. 작업 위치와 확정 기준

| 구분 | 값 |
| --- | --- |
| 후속 작업 디렉터리 | `D:/Development/code-destiny/.codex-worktrees/results-main-gyeokguk-20261102` |
| 현재 브랜치 | `codex/results-main-gyeokguk-20261102` |
| 검증된 구현·보고서 기준 HEAD | `d4a133b48e0238c6d2587141b3c824e7f8d4dab4` |
| 새 사주 소비 경로 구현 | `7b4ac41cc12030bb8604af4d0919f7f86d817e21` |
| 사이트맵 생성 메타데이터 | `fd466db1c` (서명 7개만, URL/날짜 동일) |
| 별도 초기 감사 워크트리 | `D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440` |
| 별도 감사 HEAD 확인값 | `c6ec06f2fa210ae63724d022fad58120a055c2db` |

작성 시작 시 현재 워크트리는 clean이었다. 이 문서 자체의 커밋은 위 구현 기준 뒤에 추가된다. 두 워크트리는 같은 저장소의 서로 다른 이력이며 **초기 감사 브랜치 CR-001~006 전체가 현재 트리에 합쳐졌다고 가정하면 안 된다**. 과거 공식 101건 회귀는 별도 감사 트리의 검증이며 최종 통합 트리의 통과 증명이 아니다.

다음 시작 시 이 작업 위치의 `AGENTS.md`, `CLAUDE.md`, 관련 상세 계약을 읽고 `git status`, `git branch --show-current`, `git log -5 --oneline`, `git worktree list`로 실제 상태를 확인한다. 이 경로가 없어졌다면 Git 워크트리 목록에서 위 커밋이 있는 트리를 찾는다. 무조건 새 브랜치를 만들거나 다른 세션의 dirty main을 덮어쓰지 않는다. 기존 격리 트리를 우선 사용하고 main 통합은 차이·동시 작업·회귀를 확인한 뒤 저장소 규칙에 따른다. 사용자 지시로 push·배포는 금지다.

## 3. 반드시 유지할 승인·불변 경계

1. `app/saju/animal-destiny/lib/sajuAdapter.ts`의 `calculateLocalResult()` 수정 금지. KASI prefetch에 timezone 주입 금지. `normalizeSaju.ts` timezone 필드 추가 금지.
2. 6개 엔진 내부는 읽기 전용. 래퍼·어댑터·정규화·프롬프트·표시/전달 경계에서 연결한다. 이미 승인된 CR의 정확한 diff 범위 외 내부 수정은 `docs/engine-audit/change-requests/CR-xxx.md`로 결함·재현·기대값·근거·제안 diff를 작성하고 해당 변경만 승인 대기한다. CR-008은 다른 체계의 계산 규칙이나 새 학파 결정까지 승인하지 않았다.
3. PortOne/Inicis 결제 실행 파일은 별도 승인 없이 수정하지 않는다. 가격·이용권·월정석·단건 결제 의미, 인증·계정 범위, 환불/권한 정책을 바꾸지 않는다.
4. 운영 플래그 기본 OFF. 테스트 환경에서만 명시적으로 ON 검증 가능. 기존 저장·유료 결과 원문은 재계산·덮어쓰기·마이그레이션하지 않는다. KV/R2/자산/결제 스키마 forward-fix-only.
5. Swiss Ephemeris와 모든 래퍼의 실행·설치·오라클 사용 차단. 기존 의존성이 설치됐다는 이유로 실행하지 않는다. 전체 라우트/어댑터 묶음을 import하기 전에 그래프를 확인한다. 실제 DB·PG·LLM 호출 금지, mock 실패 시 실제 서비스로 폴백 금지.
6. 허용 신규 라이선스: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense, 0BSD. 미확인/금지 라이선스 설치 금지. 오라클은 `tools/oracle/`, `tools/oracle-py/` 격리, 버전·SHA 고정, 실제 LICENSE/전이 의존성을 원장에 기록한다. 운영 package.json에 추가하지 않는다. 기존 금지 의존성 제거·교체도 이 문서에서 새로 승인한 것이 아니다.
7. CR-007의 MongoDB SSPL 예외는 **당시 전용 로컬 테스트 서버 한정**이다. 이번 mock 요청을 실제 DB·운영 도입 승인으로 확대하지 않는다.
8. 960px 데스크톱 레이아웃과 모바일 가독성, 사용자 노출 문자열 i18n 키 유지. 고객의 결론·구체적인 해석이 먼저 보여야 한다. 읽는 법·계산 근거는 최소화하거나 기본 접힘. 저장 원문을 바꾸지 않고 표시 순서/접힘으로 해결한다. 폐기 코드가 생기면 `_graveyard/` 규칙을 따른다.
9. 다른 미커밋 작업, 기존 산출물, 다른 워크트리를 건드리지 않는다. 검증된 변경만 작은 로컬 커밋. 하드 리셋·무관 파일 일괄 stage 금지. 사용자 요구 없는 실제 생성·배포·push 금지.

사실/학파 차이를 구분한다. 결정적 사실은 공식 KASI·명시된 천문 근거로 판정하고, 학파 차이를 오라클 다수결로 덮어쓰지 않는다. 미확정·후보·지원 밖 값을 확정값으로 승격하지 않는다.

## 4. 이미 완료한 부분 — 다시 만들지 말 것

우선 [21-cr008-implementation.md](21-cr008-implementation.md), [22-authority-consumer-rollout.md](22-authority-consumer-rollout.md), [23-saju-authority-consumers.md](23-saju-authority-consumers.md)를 읽는다.

- CR-008 판정: `lib/saju/gyeokguk-authority.mjs`, `gyeokguk-authority-copy.mjs`. 버전 `saju-gyeokguk-authority-v1`, 프로필 `rok-yangin-strictjong-v1`, 기본 OFF.
- 사주 공통 소비자: `worker/lib/saju-authority-consumer.js`. 기존 기둥을 승인 판정으로 투영하고 digest·명반·판정 ID를 검증한다. `selectSajuAuthority`, `readSajuAuthority`, `connectLifeBookSajuAuthority`, `sajuAuthorityPromptFacts`가 핵심이다.
- 사주 격국·외격·용신 후보는 같은 ID. 단일 확정 용신은 `null`, 후보·충돌·`pending`·`not-evaluated` 유지. 미평가 양신성상/가화/종세나 용신 중재 기준을 새로 구현하지 않았다.
- `worker/lib/saju-ai-prompt.js` + `worker/routes/fortune.js`: 명식 상담의 **신규 생성 실행**에서 서버 `SAJU_GYEOKGUK_AUTHORITY_V2 === "true"`일 때 pin 선택, 기존 생성 CAS와 같은 기록에 저장. 재개는 저장 pin 사용, OFF 뒤에도 유지. 완료본은 원문 반환.
- `worker/routes/life-book-ai.js`: 인생의 책·총운의 기존 `llmMeta.factSnapshot`에 새 판정을 저장하고 각 장에 전달. 원 계산기 `worker/lib/life-book-ai-saju.js`는 수정하지 않음.
- `worker/lib/guardian-paid-delivery.js`: 연이·네오 **사주 유료 턴의 신규 seed**만 ON 가능. `guardian-fortune/adapters/saju.js`, `guardian-fortune-context.js`, `guardian-fortune-prompt.js`가 pin을 보존한다. 무료 턴·다른 체계까지 모두 전환한 것은 아니다.
- `worker/lib/fusion-fortune-prompt.js`: 받은 사주 pin을 프롬프트에 전달하는 계약만 연결. 초융합 전체 계산/생성 활성화는 하지 않음.
- 브라우저용 `app/saju/animal-destiny/lib/approvedSajuAnalysis.ts`에는 별도 준비/재개 공개 래퍼가 있다. 이를 서비스 전체의 결제 이전 준비 경계까지 연결했다고 가정하지 않는다.

새 사주 서버 pin은 현재 **생성 기록/seed 경계**다. 사전 준비→결제 복귀→생성의 모든 경계 통합은 초기 감사 브랜치 CR-005/006와의 차이 검토가 필요하다. 현재 일반 역법 계산을 CR-001/002의 공식 정정까지 반영된 계산이라고 부르지 않는다.

## 5. 엔진별 후속 작업과 차단 상태

| 엔진 | 현재 확인 수준 | 다음 작업 |
| --- | --- | --- |
| 자미두수 | 별도 감사 트리에 역법 수정·준비 pin·공식 회귀가 있음. 현재 결과 표시 mock 검증은 있음 | 우선순위 1. 승인 CR 차이를 선별 통합하고 기본 명반/정밀 상담/대한·유년/궁성 상담/섬 리포트/guardian/영냥이에 같은 명반·버전 전달. 오행국·주성·사화·윤달·기준 옵션을 별도 필드로 보존 |
| 타로 | 저장 결과 표시 회귀 있음. 엔진·해석 품질 개선 완료 아님 | 우선순위 2. 최초 카드 선택·순서·정역·spread·질문 모드·덱/해석 버전 고정. 결제 복귀·재시도·PDF·재열람에서 다시 뽑지 않음. 확률 예언의 정확도를 수치로 지어내지 않음 |
| 숙요 | 주요 서비스 경로가 달 경도 기반이며 Swiss 연결 차단 | 기존 저장/합성 fixture로 기본 결과·관계·LLM·연간 운세 전달 계약을 검증. 음력만 검증하고 전체 숙요 정확도가 확정됐다고 하지 않음. 허용 계산 경로가 증명된 부분만 실행 |
| 베다/낙샤트라 | Swiss 연결, 허용 라이선스 주 검증기 미확보 | 스냅샷 전달·후보/지원 밖 상태·LLM 계약부터 mock 구현. 항성 경도·아야남사·낙샤트라/파다·다샤·node 방식은 명시된 근거 확보 전 정확도 개선 완료/실행 활성화 금지 |
| 서양점성술 | Swiss 연결 경로 차단 | 합성/저장 fixture로 태양/달/상승점·하우스·aspect·황도/하우스 체계·버전 전달 검증. 출생시각/장소 미상에서 상승점·하우스를 지어내지 않음 |
| 사주 잔여 소비자 | 4절 범위만 연결 완료 | 궁합 당사자별 pin, 연애/재물/신년/찻집/네오/영냥이/기타 기본 운세에 같은 사실 공급. 이미 연결된 경로는 회귀 유지. 타 체계에 사주 격국/용신 규칙을 적용하지 않음 |

서양·베다·숙요의 차단을 해소하려고 Swiss를 시험 실행하지 않는다. 합성 전달 테스트와 독립 계산 정확도 검증은 별도 열로 기록한다. 차단 체계는 adapter/provider 주입 mock으로 계약을 완성할 수 있으나 미검증 실계산을 켜지 않는다.

## 6. 탐색 시작점과 전체 적용 목록

아래 경로는 파일 존재를 확인한 탐색 시작점이며 전체 호출 관계/Swiss 비연결을 확인한 목록은 아니다. 실제 수정 전에 import → 호출부 → 결과 renderer → 저장 reader 순으로 추적한다. 저장소 전체 재귀 검색 대신 `ARCHITECTURE.md`와 관련 디렉터리 범위를 사용한다.

- 자미두수: `app/_lib/normalize-ziwei-input.ts`, `validate-ziwei-chart.ts`, `ziwei-engine.ts`(엔진 읽기 전용), `worker/routes/ziwei-ai.js`, `ziwei-deep-report.js`, `ziwei-daehan.js`, `ziwei-island*.js`, `worker/lib/guardian-fortune/adapters/ziwei.js`.
- 타로: `worker/routes/tarot.js`, `lib/tarot/`, `worker/lib/guardian-fortune/adapters/tarot.js`.
- 숙요: `worker/routes/sukuyo.js`, `sukuyo-compatibility-ai.js`, `sukuyo-archive.js`, `worker/lib/guardian-fortune/adapters/sukuyo.js`.
- 베다: `worker/routes/vedic-ai.js`, `nakshatra.js`, `nakshatra-ai.js`, `nakshatra-premium.js`, `worker/lib/guardian-fortune/adapters/vedic.js`. `lib/vedicSwissChart.js`는 차단 경로로 취급.
- 서양: `app/astrology/`, `app/astrology-ai/`, `worker/routes/astrology-ai.js`, `worker/lib/guardian-fortune/adapters/astrology.js`.
- 복합 상품: `worker/routes/fortune.js`, `fortune-tea-house.js`, `neo-operation-room.js`, `love-secret-ai.js`, `master-love-codex.js`, `fusion-fortune.js`, `saju-compat-basic.js`.
- 기타 소비자: `worker/yeongnyangi/fortune/`, `app/destiny-compass/_engine/adapters/`, 정적 `js/` 화면, `components/` 결과·PDF·공유. 정확한 관련 파일은 해당 기능에서 좁혀 찾는다.

먼저 `docs/engine-audit/25-all-engine-consumer-matrix.md`를 작성한다. 각 실제 서비스/결과 표면마다 아래 열을 채운다. 파일을 찾지 못한 행은 미확인으로 두고 완료 집계에서 제외한다.

`체계 / 상품·화면·API / 입력 원본 / 공개 어댑터 / 기본 결과 / LLM 입력 / 준비·생성 pin 위치 / 저장·재개 reader / PDF·공유 / 현재 버전·기준 옵션 / 지원 밖 처리 / OFF 동일성 / ON 전달 회귀 / 독립 정확도 근거 / Swiss 차단 / 승인 CR / 상태`

한 가지 사주 플래그를 모든 체계의 승인으로 재사용하지 않는다. 각 엔진의 사실·지원 범위·버전과 서비스의 신규 선택 경계를 명시한다. 공통화는 검증된 최소 envelope/reader 수준부터 하고 전면 리팩터링하지 않는다.

## 7. 구현 순서

1. 현재 트리와 초기 감사 트리의 CR·보고서·변경 파일을 읽기 전용 비교한다. 초기 트리 `00-inventory.md`, `01-license-ledger.md`, `03-fix-plan.md`, `08-service-rollout-plan.md`, `09-execution-selection-report.md`, `10-preparation-pinning-report.md`, `11-payment-cache-pin-report.md`, `17-next-enabled-delivery-report.md`, `change-requests/`를 확인한다. 초기 감사 커밋 전체를 일괄 merge/cherry-pick하지 않는다.
2. 사용자에게 이미 승인된 CR-001/002, CR-005/006, CR-008의 정확한 범위와 현재 트리 차이를 확인한다. CR-003/004 등은 문서·대화 근거로 승인 상태를 확인하고 포괄 승인으로 추정하지 않는다. 추가 엔진 내부 결함은 별도 CR.
3. 자미두수 허용 경로부터 적용 목록을 완성하고, 동일 입력의 공식/골든값·현재 OFF 출력 기준을 고정한다. 공식 101건의 실제 테스트 위치·대상 어댑터를 찾아 최종 통합 트리에서 재실행한다.
4. 신규 요청에서만 서버가 버전을 선택한다. 입력 digest·기준일·시각/위치 미상·체계 옵션·계산 사실·해석 버전·지원 상태를 기존 저장 계약에 함께 고정한다. 클라이언트의 version/flag/pin을 무검증 신뢰하지 않는다.
5. 기본 결과와 LLM은 고정 사실을 공유한다. 프롬프트에서 다시 계산하거나 다른 엔진 데이터로 결손을 메우지 않는다. 후보·보류·윤달/자시/학파 옵션을 전달한다. 궁합은 두 당사자의 ID와 역할을 각각 보존한다.
6. 결제 복귀·부분 생성·재시도는 저장 pin을 우선한다. 캐시는 엔진/해석 버전과 사실 digest, locale/질문/모드를 구분한다. 완료 결과는 추가 차감·추가 생성 없이 저장 원문만 읽는다. 저장 실패는 완료로 표시하지 않고 같은 요청으로 복구한다.
7. 타로 및 다른 허용 경로에 같은 계약을 적용한다. Swiss 경로는 합성 입력과 mock 어댑터로 전달만 검증한다. 엔진 내부에 임의 대체 계산/유료 fallback을 넣지 않는다.
8. 고객 화면은 결론·개인별 해석·행동 조언을 먼저 보여준다. 계산 근거와 읽는 법은 기본 접힘 또는 최소화한다. 기존 원문·PDF·공유 내용 누락/변조가 없는지 확인한다.
9. 관련 회귀를 통과한 작업 단위별로 로컬 커밋하고 계속 진행한다. 모든 행의 완료/차단/미확인을 보고한 후 종료. 플래그는 운영 OFF, push·배포는 하지 않는다.

## 8. 필수 검증과 되돌림 기준

- OFF: 변경 전 같은 입력의 원본 결과/프롬프트/기존 저장 reader JSON 동일성. UI 변경은 기존 본문 보존을 별도로 확인.
- ON: 신규 기본 결과·LLM 사실·저장 pin·PDF/공유의 명반/카드·버전·지원 상태 일치. 기존 엔진 정확도와 전달 정확도를 구분.
- 생명주기: 준비→mock 결제 복귀→생성→부분 저장→새로고침→재개→완료→재열람. 생성 중 OFF, 서버 재시작/다른 인스턴스, 원래 요청 재전송도 포함.
- 경쟁/장애: 동시 요청, 응답 유실, 캐시 적중, 저장 실패, 낡은 lease, 위변조 pin, 다른 명반 혼입, 계정/프로필/locale 전환, 권한 취소. 중복 과금·중복 생성·타인 결과 노출 금지.
- 지원 밖: 시각/장소 미상, 범위 밖 날짜, 윤달/기준 옵션 불명확, 판정 후보/미평가. 임의 확정·숫자 생성·조용한 버전 폴백 금지.
- 브라우저: 실제 Next 앱에서 서비스별 신규 결과와 기존 저장 결과를 mock으로 검증한다. PG·LLM·DB 요청은 테스트 경계에서 차단/대체하며 외부 호출 실패를 실제 서비스로 재시도하지 않는다. desktop 960px와 모바일 확인.
- 되돌림: 명반/버전 불일치, 저장 원문 변경, 중복 차감/생성, 지원 밖 값의 강제 확정이 1건이라도 있으면 해당 신규 선택은 OFF 유지. 이미 pin된 진행 중 결과는 해당 버전 reader로 완성하며 과거 reader를 제거하지 않는다.

현재 재사용 가능한 명령(워크트리 루트에서, 실행 전 import 그래프 확인):

```powershell
node --test __tests__/ui/saju-authority-consumers.test.mjs __tests__/ui/life-book-paid-delivery.behavior.test.js
node tools/oracle/gyeokguk/verify-authority.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run verify:worker-no-undef
npm run verify:ai-prompt-billing-policy
npm run verify:no-nested-retry
npm run check:fast -- --plan
npm run check:pre-push
```

추가 기존 회귀 8개 파일과 명령은 23번 보고서에 있다. 현재 실측은 **58+74=132개 통과**, CR-008 OFF48/ON48·명명26·변형1,144·거절1,144 통과, 타입/worker/결제 정책/pre-push 통과다. 이는 과거 완료 상태이며 새 수정 뒤 필요한 범위를 다시 검증한다.

브라우저 출발점: `tools/oracle/next-delivery/README.md`, `guard.cjs`, `verify-service-results.mjs`. 기존 전체 결과 fixture 테스트는 새 엔진 사실 전달 테스트를 대신하지 않는다. 이번 소비자 작업에서는 실제 브라우저 검증을 재실행하지 않았다. 합성 카드/명반 fixture를 실계산 정답으로 보고하지 않는다.

`check:fast` critical 전체 Node/Jest/worker build에는 Swiss 연결이 포함될 수 있다. 계획/실제 import를 확인하고 금지 경로 전체 실행 대신 허용 대상 검사만 실행한다. 전체 빌드·CI 미실행은 명시한다. 기존 설치 의존성으로 네트워크 없이 실행하고 추가 설치가 필요하면 라이선스 게이트부터 적용한다.

## 9. 새 채팅의 완료 산출물

- `25-all-engine-consumer-matrix.md`: 기본 운세/LLM/저장/재열람/PDF·공유까지 빠짐없는 적용 목록. 완료·차단·미확인을 분리.
- 구현과 해당 회귀 테스트. 스냅샷/어댑터/기능 플래그 경계, 기본 OFF, 원문 불변 증거 포함.
- 추가 엔진 내부 수정이 필요하면 별도 CR. 독립 검증이 없는 체계를 완료로 표시하지 않음.
- 후속 결과 보고서: 변경 파일·의도·보존 정책·검증 명령/실측·로컬 커밋·남은 적용 조건. 실제 PG/LLM/DB·운영 배포 미검증 표시.
- 임시 검증 파일만 안전하게 정리하고 다른 작업은 보존. main 통합 여부와 원격 반영 여부를 구분해 보고.

## 10. 첫 행동

작업 경로와 커밋·dirty 상태를 확인한 뒤 21~24번 보고서와 초기 감사 트리의 인벤토리/승인 CR을 읽는다. 자미두수와 타로부터 **엔진×소비 경로 적용 목록**을 만들고, Swiss 비연결 경로의 신규 계산 pin 구현을 시작한다. 이 문서의 범위에서 가능한 구현과 mock 검증을 끝까지 진행하며, 다른 체계의 차단 때문에 허용된 작업 전체를 중단하지 않는다.

## 후속 구현 기록 (2026-11-02)

승인된 자미 준비·타로/guardian 소비자 구현과 mock 회귀를 진행했다. 전체 경로 연결은 미완료이며 25번 적용 행렬 및 26번 결과 보고서에서 완료·차단·잔여를 구분한다. 운영 OFF/Swiss 차단/기존 원문 보존을 유지했다.
