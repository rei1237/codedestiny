# 대표·전문가 상담 우선 후속 구현 결과

status: done
rollout_status: partial-default-off
date: 2026-11-02

요청한 우선순위에 따라 대표·전문가 상담의 계산 근거 연결을 우선 구현했다. 모든 운세의 계산 정확도 개선이나 운영 전환이 완료됐다는 뜻은 아니다. 적용 경로와 남은 범위는 25번 행렬의 최신 표에 명시했다.

## 시작·승인·커밋

- 브랜치 codex/results-main-gyeokguk-20261102, 후속 시작 HEAD 7ef443f7e2ad756a5717053d38ca6552bab0132b, 시작 시 clean.
- 사용자 최초 기준 c7f46acf 이후 이미 선별 통합한 CR-001~006/008만 사용. 새 엔진 내부 수정 없음. CR-009는 proposed-not-implemented 유지.
- 701de896a: 대표 상담 대운/사실 고정, 전문가 합성 사실 저장 경계.
- 84ce425d9: 자미·타로 기본 결과/guardian/영냥이/대표 상담 소비자 연결.
- push·배포·main 통합 없음. 다른 작업/워크트리 보존.

## 변경 의도

- 신년운세는 이전에 순역행 요약만 사용했다. 신규 명시 ON 결과에서 인생의 책과 같은 실제 대운 계산을 사용하되, 원국 기둥이 일치해야 연결한다. 시각 미상/대운 불가 사유를 그대로 유지한다.
- 연애 비책은 기존 대운을 포함한 원 계산+grounding facts를 신규에 한해 고정한다. OFF 재개에도 저장 근거를 재생성하지 않는다.
- 자미 전문가 준비/기본 근거/생성 모두 신뢰된 서버 플래그를 전달한다. 저장 준비가 있으면 이후 OFF/연도 변경에도 해당 명반을 사용한다.
- 자미 정밀, 연애 대작전 A/B와 연간 흐름, 네오 self/partner, guardian, 영냥이 개인 명반/기본 표시/LLM에 공통 선택을 연결한다.
- 기본 타로와 영냥이 추첨은 기존 카드·순서·정역·spread·질문 옵션을 신규 사실 envelope로 보존한다. 다시 뽑는 로직을 추가하지 않았다.
- 점성술/베다/숙요 전문가 상담은 기존 provider 결과를 저장 사실과 대조한다. 합성 입력으로만 검증했으며 새 천문 계산기를 도입하거나 Swiss를 실행하지 않았다. 신규 플래그는 각각 ASTROLOGY/VEDIC/SUKUYO_CONSUMER_FACTS_V1, 모두 기본 OFF다.

## 보존한 정책

PG·LLM·DB는 mock. 실호출/설치/운영 데이터 쓰기 없음. 가격·이용권·월정석·단건 결제·인증·소유권 정책 및 DB 스키마 변경 없음. 저장된 유료 완료 원문을 재계산·마이그레이션하지 않음. 후보/pending/null/미지원 유지. 사주 대운을 다른 체계에 혼합하지 않음. Swiss 및 새 라이선스 의존성 차단. API의 기존 응답 필드는 유지하고 신규 사실 메타데이터만 명시 ON에서 추가했다.

## 검증

- 14개 관련 Node mock 파일: 224건 통과(대표/전문가 새 사실, 자미 준비/정밀, 네오/연애 대작전/섬/전문가 재개 포함).
- life-book-paid-delivery.behavior, fortune-tea-house-paid-resume.static, tarot-fact-consumers: 57건 통과. 합계 281건.
- node node_modules/typescript/bin/tsc --noEmit: 통과.
- npm run verify:worker-no-undef: 808개 파일 통과.
- 최신 변경 ESLint: 오류 0, 기존 미사용 변수 등 경고 25. 나머지 소비자 변경의 targeted lint 통과.
- verify:ai-prompt-billing-policy, verify:no-nested-retry, git diff --check: 통과.
- node tools/oracle/next-delivery/verify-service-results.mjs: 실제 Next 저장 결과 15개 통과. 960px/390px, 계산 근거 접힘/재열람 원문 해시 보존. Swiss·실 DB·외부 네트워크 차단; CDN 글꼴은 차단 기록.
- check:fast -- --base=7ef443f7e --plan 확인. 전체 critical 그래프에는 Swiss/실 DB import 가능 경로가 있어 전체 test/build 대신 위 허용 targeted 검증을 사용했다. 전체 빌드·원격 CI 미실행.
- sitemap:check가 원장 source signature만 드리프트 보고. 기존 생성기로 갱신 후 URL·lastmod 불변 여부 확인.

## 추가 확인이 필요한 부분

운영 플래그 OFF 상태다. 독립 천문 검증이 없는 Swiss 체계는 정확도 개선 완료로 표시하지 않는다. 전문가 합성 테스트는 실제 계산/과금 검증을 대체하지 않는다. 신규 전 상품 브라우저 결제 생명주기 완료를 주장하지 않는다. island 영속 연결 CR-009, 보호된 앱 내부 엔진, 결제 전 타로 해석 버전 준비 계약, 그 외 미확인 기본 상품은 25번 행렬에 남겼다.

## 수정 파일
- __tests__/ui/expert-consumer-facts.test.mjs
- __tests__/ui/love-secret-paid-delivery.behavior.test.js
- __tests__/ui/new-year-paid-delivery.behavior.test.js
- __tests__/ui/non-saju-consumer-rollout.test.mjs
- __tests__/ui/representative-consumer-facts.test.mjs
- __tests__/ui/ziwei-deep-paid-delivery.behavior.test.js
- __tests__/ui/ziwei-execution-lifecycle.test.mjs
- tools/oracle/delivery-integration/consumer-source-pins.json
- worker/lib/expert-consumer-facts.js
- worker/lib/guardian-fortune-context.js
- worker/lib/guardian-fortune/adapters/ziwei.js
- worker/lib/guardian-paid-delivery.js
- worker/lib/master-love-codex-consultation.js
- worker/lib/representative-consumer-facts.js
- worker/lib/tarot-fact-consumer.js
- worker/lib/ziwei-consumer-chart.js
- worker/routes/astrology-ai.js
- worker/routes/love-secret-ai.js
- worker/routes/master-love-codex.js
- worker/routes/neo-operation-room.js
- worker/routes/new-year-ai.js
- worker/routes/sukuyo-compatibility-ai.js
- worker/routes/tarot.js
- worker/routes/vedic-ai.js
- worker/routes/ziwei-ai.js
- worker/routes/ziwei-deep-report.js
- worker/routes/ziwei-island.js
- worker/yeongnyangi/fortune/chapter-facts.ts
- worker/yeongnyangi/fortune/charts.ts
- worker/yeongnyangi/fortune/free/readings.ts
- worker/yeongnyangi/fortune/relationship-calculation.ts
- worker/yeongnyangi/fortune/shared/consumer-facts.ts
- worker/yeongnyangi/fortune/shared/contracts.ts
- worker/yeongnyangi/fortune/shared/domain.ts
- worker/yeongnyangi/fortune/shared/privacy.ts
- worker/yeongnyangi/fortune/shared/prompt.ts
- worker/yeongnyangi/fortune/ziwei/index.ts
- worker/yeongnyangi/service.ts

## 최종 브라우저·전달 확인

- verify.mjs --engine=on --case=normal --customer-view: 실제 Next 결제 복귀 mock → 생성 → 재열람 → 실제 PDF 다운로드(접힌 명반 포함) → reader 상태 복원 → 반응형 검사 통과. 오류 0. 마지막 준비 API 402는 실제 네트워크 폴백이 차단되는지 확인한 의도된 사례다.
- verify.mjs --engine=rollback --case=partial: 저장된 묶음 재사용, 생성 중 OFF에도 기존 v2 준비 유지, 다음 신규 요청 legacy 선택, 완료 원문 보존 통과. 오류 0.
- 자미 생명주기 테스트의 테스트 전용 선택 override를 제거하고 실제 서버 env 전달만으로 14건 재검증 통과. f7d796115에 반영.
- 사이트맵 원장 변경은 signature 24개뿐이며 URL·lastmod는 전후 동일함을 구조 비교했다. 공개 title/description/H1·canonical·robots·광고 정책은 변경하지 않았다.
- 기존 공용 브라우저 증거 디렉터리는 다른 작업 산출물이 섞일 수 있어 삭제하지 않는다. 이번 전용 임시 결과는 JSON 증거만 outputs로 보존한 뒤 정리한다.
