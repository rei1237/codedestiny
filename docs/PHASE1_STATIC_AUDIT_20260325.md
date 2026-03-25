# PHASE 1 정적 감사 보고서 (2026-03-25)

작업 범위: 정적 탐지만 수행 (코드/자산 제거 미수행)

근거 파일:
- audit_phase1/duplicate_hashes_rerun_20260325.json
- audit_phase1/function_candidates_local_unused.json

실행 메모:
- RULE 0 안전 장치에 따라 작업 시작 전 체크포인트 커밋 수행
- 동적 접근(window/globalThis/data-action/inline onclick) 여부를 교차 탐지
- Phase 2(제거)는 승인 전 미진행

[Dead Code 삭제 후보]
- js/utils/dom.js | $, $$ | 프로젝트 전역 import/호출 검색에서 참조 0건, 모듈 export만 존재 | 낮음
- js/utils/date.js | toYMD, toHM | 프로젝트 전역 import/호출 검색에서 참조 0건, 모듈 export만 존재 | 낮음
- public/js/utils/date.js | toYMD, toHM | 정적 배포 미러 파일 기준 참조 0건 (원본 js/utils/date.js와 동일 후보) | 낮음
- app/components/LocaleSwitcher.tsx | LocaleSwitcher | export 선언만 존재, app 경로 내 import 참조 0건 | 중간
- app/insights/articles.js | getArticlesByTopic | export 선언만 존재, 외부 호출 참조 0건 | 중간
- js/services/sajuWorkerExamples.js | SajuReportComponent | 예제성 컴포넌트 함수, 런타임 import/호출 참조 0건 | 중간

[중복 파일 삭제 후보]
- public/fortune/** ← 정본
- dist/fortune/** ← 제거 예정 (이유: 동일 해시 중복, dist는 빌드 아티팩트 성격)

- public/fuctionassets/** ← 정본
- dist/fuctionassets/** ← 제거 예정 (이유: 동일 해시 중복, dist는 빌드 아티팩트 성격)

- js/** ← 정본 (개발 소스)
- public/js/** ← 제거 예정 후보 (이유: 동일 해시 중복 다수)
  주의: 현재 정적 HTML의 /js 경로 참조 구조와 sync 스크립트 의존 가능성 있어 즉시 삭제 금지

- styles/** ← 정본 (개발 소스)
- public/styles/** ← 제거 예정 후보 (이유: 동일 해시 중복)
  주의: 정적 HTML 직접 서빙 경로에서 public/styles 참조 가능성 검증 필요

[보류 목록]
- js/saju-engine-continuation.js | showTsDetail, closeModal | index/public HTML의 data-action, inline onclick, 모달 닫기 흐름에서 동적 호출 확인
- js/core/saju/reportDashboard.js | renderReportDashboard, syncReportHeightFromNode | 대형 엔진 파일(js/saju-engine.js, entertain-engine.js)에서 문자열/함수명 기반 간접 호출 확인
- js/astral-soul.js, js/oracle-kcg.js, js/iching-modal.js | window.* 전역 함수군 | mobile-performance-bootstrap 및 전역 프록시에서 동적 바인딩 확인
- app/_lib/localePath.js | stripLocalePrefix | layout/feature 페이지에서 실제 import 확인
- app/_lib/serviceMap.js | getService | app/[adminHash]/[mode]/page.js에서 실제 import 확인
- duplicate_hashes_rerun_20260325.json 내 Hash:null 항목 | admin/[hash], app/[adminHash] 등 대괄호 경로 | 글롭/특수문자 경로 처리 이슈로 판정 불확실, 별도 해시 재수집 필요

판정 요약:
- 낮은 위험(즉시 제거 가능 후보): 미사용 유틸 export 3건, dist 중복 아티팩트 계열
- 중간 위험(제거 전 동작 확인 필요): 미사용 컴포넌트/도메인 함수 후보 3건
- 높은 위험(승인 및 별도 검증 필요): window/globalThis/data-action/inline onclick 연계 함수군

다음 단계:
- 현재 상태는 PHASE 1 완료 보고 상태
- 사용자 승인 전 PHASE 2 제거 작업 진행 금지
