# 모든 엔진 소비자 후속 구현 결과

status: done
scope_status: partial-default-off
baseline: c7f46acf26fc1e7881635a9bce7d2f905d17ee1e
implementation_commit: 0e1fd0fe7

보고서 작성 및 아래 구현 단위는 완료했다. 사용자가 요청한 모든 상품의 신규 계산→LLM→저장→재열람→PDF·공유 연결이 전부 완료된 것은 아니다. 적용 목록 43개 경로군의 미연결·미확인 행은 완료 집계에서 제외한다. 단순 문서 작성으로 끝내지 않고 승인된 선별 구현, mock 생명주기, 실제 Next 신규/저장 결과·PDF 검증을 수행했다.

## 시작 상태·승인

- 지정 워크트리 codex/results-main-gyeokguk-20261102 / c7f46acf… 확인, 시작 미커밋 변경 없음. D: 접근은 샌드박스에서 Git 상태 조회가 실패하여 자동 승인된 외부 접근으로 확인했다. 다른 워크트리·main은 수정하지 않았다.
- 초기 감사 트리 c6ec06f2의 CR-001/002/003/004/005/006 최신 승인 상태와 07/09/10/11/17 보고서, 현 트리 CR-008 및 21~24 보고서를 대조했다. 오래된 제안 본문의 미승인 표기와 최신 status를 구분했다.
- 초기 감사 커밋 전체 merge/cherry-pick 없이 관련 파일·diff만 선별했다. 현재 CR-008 분기와 후보·보류를 보존했다. 별도 결제 주문 경합 수정은 제외하고 createOrReusePaymentPayload의 작업 시작 함수 원문 동일성을 검사했다.

## 수정한 파일·의도

1. lib/korean-calendar/authority*.js, core/ganji/index/natal/policy, lib/ziwei-birth-clock.js, worker/lib/ziwei-ai-chart.js, app/saju/animal-destiny/lib/sajuAdapter.ts 및 engine/localSajuCalculator.ts: 승인 CR-001~004의 기존 diff만 선별 통합. 기본 OFF; CR-008 해석 옵션은 그대로 유지. 계산 규칙을 새로 설계하지 않았다.
2. worker/lib/ziwei-execution-adapter.js, ziwei-calculation-preparation.js, worker/routes/ziwei-ai.js, models.js, app/ziwei-ai/ZiweiAiClient.tsx: 승인 CR-005/006의 준비·생성·재개 명반 고정. 기존 모델은 유지하고 승인된 전용 준비 모델 정의만 추가. 새 프로토콜은 legacy 명반도 영속 고정하지만 새 역법 선택은 기본 false다.
3. engine-fact-snapshot.js, guardian-fortune-context/prompt.js, guardian-fortune/adapters/ziwei.js, guardian-paid-delivery.js, fusion-fortune-prompt.js: 같은 사실·버전·후보 상태를 기본 결과/LLM/기존 seed/결과 metadata에 전달. guardian의 사주·자미·타로 신규 seed만 체계별 서버 *_CONSUMER_FACTS_V1=true에서 선택한다. 요청 body로 켜지지 않는다. Swiss 3체계는 test 환경의 주입 provider만 사용해 합성 전달을 검증했다.
4. tarot-fact-consumer.js 및 love-tarot-delivery/mindscan-delivery/tarot-oracle-delivery.js: 최초 생성의 base/input/sectionInputs, 카드 순서·정역·질문·spread·버전 고정. love/mindscan은 서버 drawVersion/deckVersion/카드도 함께 보존. 기존 저장 완료본은 변경하지 않는다. 재개 시 유실·변조된 신규 pin은 legacy 재계산으로 숨기지 않는다.
5. lib/sha256-text.mjs 및 saju-authority-consumer.js: 기존 Node 전용 SHA-256이 영냥이 브라우저 번들에 유입되는 오류 수정. UTF-8/블록 경계/백만 문자 표본에서 Node SHA-256과 동일함을 확인해 기존 pin 호환성을 유지했다. 인증용 해시/서명 함수는 변경하지 않았다.
6. 회귀 fixture/테스트와 mock Next 하네스: 전체 Worker/실 DB/Swiss import 없이 실제 함수 AST와 허용된 공개 계산 어댑터를 실행. 하네스의 자미 계산 소스 해시는 기존 승인 그래프와 동일하고, guardian adapter의 sourceFacts 부가 필드 차이만 검토해 별도 manifest로 고정했다.
7. 사이트맵: 기존 생성기로 소스 서명 572개·lastmod 24개만 갱신. URL 1,058개, priority 및 날짜 외 XML은 동일하다. 공개 URL/문구/색인 정책 변경 없음.

## 유지한 정책·영역

- 이용권·월정석·단건 결제 가격/권한/차감/환불 정책, PortOne/Inicis 실행 파일, 인증, 기존 결과/자산/구매 원문 보존.
- calculateLocalResult() 본문, KASI prefetch timezone, normalizeSaju timezone 변경 없음. CR-001~004에 이미 승인된 계산 diff 외 6개 엔진 내부 변경 없음.
- CR-008 단일 용신 null, 후보·충돌·pending/not-evaluated 유지. 타 체계에 사주 규칙을 적용하지 않음.
- DB는 기존 데이터 변경·마이그레이션 없이 CR-006 전용 모델 정의의 forward 추가만 있음. 실제 PG·LLM·DB 호출 0; 운영 플래그 변경·설치·Swiss 실행·push·배포·main 병합 없음.
- 레이아웃/CSS/문구·i18n 키 변경 없음. 실제 Next 960px/390px에서 저장 결과를 확인했다.

## 검증 명령·실측

- node --require ./tools/oracle/next-delivery/guard.cjs --test [관련 15개 파일]: 166/166 통과. 기존 사주·인생의 책·저장 장애·유료 재개·계정/locale/권한 회수와 신규 자미/타로 소비 회귀 포함.
- 추가 초융합 6체계/pending/신규 pin 유실 검사 후 all-engine-fact-consumers + saju-authority-consumers 16/16 통과. 이 중 15개는 앞 묶음과 중복이며 단순 합산하지 않는다.
- calendar-authority-regression.test.mjs: 5/5; 공식 101건/1,109필드, 168 절입 경계, 24 역사 음력월, 추가 4건. 현재 최종 통합 트리에서 실행했다.
- calendar-authority-expansion.test.mjs: 7/7; 확대 348절입 경계, 음력 15,504일/범위 밖 29일, 공개 양음력 1,572쌍, 대운 골든 2,016건, 시각/성별 미상 및 범위 거절. fixture와 독립 산술 기준의 회귀이며 새 독립 천문 수집은 하지 않았다.
- node tools/oracle/next-delivery/verify-service-results.mjs: 실제 Next 저장 결과 15/15, 960px/390px, 원문 해시·접힘·재열람 보존.
- node tools/oracle/next-delivery/verify.mjs --engine=on --case=normal --customer-view: 신규 준비→mock PG 복귀→생성→새로고침/보관함→실제 PDF 다운로드 통과. PDF가 접힌 계산 근거를 포함하고 다운로드 후 UI 상태 복원. 브라우저 오류 0.
- node tools/oracle/next-delivery/verify.mjs --engine=rollback --case=partial: 부분 생성 후 OFF 재개는 같은 v2 준비본, 다음 신규 요청은 legacy, 원문 재열람 통과. 브라우저 오류 0.
- node node_modules/typescript/bin/tsc --noEmit: 통과. 변경 코드 ESLint --quiet: 통과. git diff --check: 통과.
- npm run verify:worker-no-undef: 804개 파일 통과(기존 데드코드 예외 3건). verify:ai-prompt-billing-policy, verify:no-nested-retry 통과.
- impeccable detect --json app/ziwei-ai/ZiweiAiClient.tsx: [] (기계 검사; 생명주기 검증 대체 아님).
- npm run check:fast -- --plan: critical. 전체 Node/Jest/worker build에 Swiss 연결이 포함되므로 전체 실행하지 않고 위 허용 대상만 실행. 전체 CI 통과로 표시하지 않는다.
- npm run check:pre-push: 최초 사이트맵 드리프트 실패, 원인 확인·생성 후 최종 재검증 결과는 아래 마감 기록에 추가한다.

## 실패와 수정 기록

- Python 실행기가 없어 최초 편집 명령 실패, 파일 변경 전에 종료. Node로 정상 적용했다.
- 초기 이식 테스트가 별도 감사 트리의 결제 변경 해시를 요구해 26/27 통과. 결제 함수 변경을 가져오는 대신 현재 시작 커밋 원문과 동일성 검증으로 바꾼 뒤 27/27 통과했다.
- 최초 저장 화면 브라우저 검증 9/15, 영냥이 6개가 기존 CR-008 node:crypto 클라이언트 의존으로 실패. 같은 해시의 브라우저 호환 구현 후 15/15 통과했다. 검증 우회 alias나 외부 폴백 없음.
- 사이트맵 생성 첫 자동 승인 거절: 공개 SEO 파일 변경 범위 확인 필요. 읽기 전용 --check로 URL·priority 불변 및 572서명/24날짜 변화 증명 후 동일 명령을 재승인받아 실행했다. 우회 실행하지 않았다.

## 추가 확인·미완료

- 25번 행렬의 정적 기본 운세, destiny-compass, 영냥이 신규 생성, 궁합 당사자별 pin, 일부 연애/재물/찻집/네오 별도 상품은 아직 신규 공통 pin으로 전환하지 않았다. 전체 서비스 전수 연결 완료를 주장하지 않는다.
- stateless 섬/대한의 영속 준비 연결은 CR-009 신규 저장/identity 제안. 승인 전 모델·endpoint를 임의 추가하지 않았다.
- 타로 /paid-draw 최초 카드 저장은 기존대로 유지하지만 준비 시점부터 해석 문구 전체를 고정한 것은 아니다. 이번 추가는 생성 seed 경계다. 오라클은 사용자 선택 배열의 서버 검증 후 고정하며 신규 서버 추첨을 추가하지 않는다.
- PDF 실다운로드는 신규 자미 1개 경로를 검증했다. 타로·guardian 및 나머지 상품별 PDF/공유 end-to-end는 미완료다. 저장 화면 15개 통과가 그 검증을 대신하지 않는다.
- Swiss 3체계 및 초융합 전체 계산은 계속 차단. 합성 전달 검증으로 독립 정확도·운영 활성화 준비 완료를 주장하지 않는다. 실제 DB 트랜잭션·PG·LLM 품질·공식 CI는 미검증.

## 추적 파일 목록

- __tests__/fixtures/korean-calendar/authority-v2-golden.json
- __tests__/fixtures/korean-calendar/authority-v2-impact-golden.json
- __tests__/ui/all-engine-fact-consumers.test.mjs
- __tests__/ui/calendar-authority-regression.test.mjs
- __tests__/ui/saju-authority-consumers.test.mjs
- __tests__/ui/tarot-fact-consumers.test.mjs
- __tests__/ui/ziwei-execution-lifecycle.test.mjs
- app/saju/animal-destiny/engine/localSajuCalculator.ts
- app/saju/animal-destiny/lib/sajuAdapter.ts
- app/ziwei-ai/ZiweiAiClient.tsx
- config/sitemap-lastmod.json
- docs/engine-audit/results/implementation-20261101/verified-authorities.json
- lib/korean-calendar/authority-data.generated.js
- lib/korean-calendar/authority-expanded.generated.js
- lib/korean-calendar/authority.js
- lib/korean-calendar/core.js
- lib/korean-calendar/ganji.js
- lib/korean-calendar/index.js
- lib/korean-calendar/natal.js
- lib/korean-calendar/policy.js
- lib/sha256-text.mjs
- lib/ziwei-birth-clock.js
- public/sitemap-ko.xml
- public/sitemap.xml
- sitemap-ko.xml
- sitemap.xml
- worker/lib/engine-fact-snapshot.js
- worker/lib/fusion-fortune-prompt.js
- worker/lib/guardian-fortune-context.js
- worker/lib/guardian-fortune-prompt.js
- worker/lib/guardian-fortune/adapters/ziwei.js
- worker/lib/guardian-paid-delivery.js
- worker/lib/love-tarot-delivery.js
- worker/lib/mindscan-delivery.js
- worker/lib/models.js
- worker/lib/saju-authority-consumer.js
- worker/lib/tarot-fact-consumer.js
- worker/lib/tarot-oracle-delivery.js
- worker/lib/ziwei-ai-chart.js
- worker/lib/ziwei-calculation-preparation.js
- worker/lib/ziwei-execution-adapter.js
- worker/routes/ziwei-ai.js

## 마감 기록

- 구현 0e1fd0fe7, 추가 mock/확대 회귀 7c2cf77cc, 검증된 사이트맵 메타데이터 4ae71260e를 로컬 커밋했다.
- 추가 하네스 및 변경 테스트 ESLint --quiet, 최종 tsc --noEmit와 git diff --check 통과.
- 마지막 pre-push 시도는 미커밋 변경 때문에 mirror 검사가 중단됐다. 커밋한 트리에서 다시 실행한다.
