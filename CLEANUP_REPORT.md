# CLEANUP_REPORT

## 1) 작업 목적과 방식
- 요청 기준: 중복/임시/빌드 산출물/캐시 정리 + 성능 및 배포 안정성 점검.
- 안전 원칙: 즉시 대량 삭제 대신 참조 분석 후 dry-run 리포트 중심으로 진행.
- 실제 삭제는 서비스 경로에 직접 영향 없는 중복 페이지 2건만 수행.

## 2) 실제 코드 패치 요약
- secret-house 경로 단일화
  - 내부 링크를 /secret-house_real.html 로 변경
  - 레거시 /secret-house-final.html 는 middleware 308 리다이렉트로 호환 유지
- 정리 자동화 추가
  - scripts/audit-unused-files.mjs 신규
  - scripts/safe-clean-repo.mjs 신규
- npm scripts 추가
  - audit:files
  - audit:duplicates
  - audit:cleanup
  - clean:repo:dry
  - clean:repo:apply
- .gitignore 보강
  - build/coverage/playwright-report/test-results/.wrangler/.tsbuildinfo/log/env/reports 임시 패턴 포함

## 3) 삭제한 파일 목록
- secret-house-final.html
- public/secret-house-final.html
- clean:repo:apply로 삭제된 임시/캐시/로그 33건
  - 상세 목록: reports/cleanup-applied.json

## 4) 삭제하지 않고 보류한 파일 목록과 이유
- 루트 HTML 다수
  - 예: celestial-harmony.html, vedic-astrology.html 등
  - 이유: 서비스 섹션/런타임/정적 링크 참조가 존재하거나 외부 유입 가능성 있음
- 루트 JS 런타임 파일
  - AnalysisEngine.js, PhysiognomyUI.js, HwatuFortune.js
  - 이유: 동적 스크립트 로딩 경로에서 실제 사용
- manifest-samba.json
  - 이유: 테마 모드 전환 및 service-worker 경로에서 실사용
- 대규모 root/public 미러 파일
  - 이유: 현재 배포 파이프라인(sync-legacy-static-to-public.mjs)에서 의도된 동기화 구조

## 5) 중복 파일 후보 (리포트 기준)
출처: reports/duplicate-files-report.json

주요 그룹 예시:
- js/saju-engine.js <-> public/js/saju-engine.js
- public/index.html <-> public/static/index.html
- secret-house_real.html <-> public/secret-house_real.html
- fortune/data/* <-> public/fortune/data/* 다수

판단:
- 일부는 불필요 중복이 아니라 현행 배포 구조(root 소스 + public 서빙 미러)로 의도된 중복임.
- 즉시 삭제 대신 단일 소스 정책 전환을 별도 마이그레이션으로 분리 권장.

## 6) 대용량 파일 후보 (리포트 기준)
출처: reports/large-files-report.json

상위 후보 예시:
- _tmp_ppt_review/source.zip
- _tmp_public_saju_6f02552.js
- _tmp_saju_6f02552.js
- _tmp_51a_index.html 계열
- public/ephe/semo_18.se1
- server/data/tarot-cards.db.json

이미지 포맷 최적화 후보:
- _tmp_ppt_review/unzipped/ppt/media/*.png
- public/fuctionassets/... 일부 PNG

판단:
- _tmp_* 계열은 정리 우선순위 매우 높음.
- ephe/db 파일은 기능 핵심 자산 가능성이 높아 삭제 금지.

## 7) 실제로 참조되지 않는 파일 후보
출처: reports/unused-files-report.json

주의:
- 동적 로딩/런타임 문자열 조합 때문에 오탐 가능성 있음.
- 본 작업에서는 자동 삭제하지 않고 후보 분류만 수행.

대표 후보 성격:
- _tmp_* 임시 파일
- 과거 1회성 점검 산출물
- 일부 루트 JSX/패치성 파일

## 8) .gitignore 변경 내용
추가/보강된 핵심 항목:
- node_modules/
- .next/
- out/
- dist/
- build/
- coverage/
- playwright-report/
- test-results/
- .wrangler/
- *.tsbuildinfo
- *.log
- .env
- .env.*
- !.env.example
- .DS_Store
- Thumbs.db
- reports/*.tmp.json

## 9) 성능 개선 내용
- 불필요 중복 페이지 2건 제거(secret-house-final root/public)
- secret-house 경로를 canonical(real)로 단일화하여 링크 중복과 유지보수 비용 축소
- 레거시 URL 308 리다이렉트 추가로 SEO/북마크/외부 링크 회귀 방지
- 파일 감사/정리 자동화 스크립트 추가로 반복 정리 비용 감소

## 10) 배포 구조 점검 결과
- GitHub Actions 기준 Pages 배포 워크플로우는 비활성(manual notice)
- Worker 배포 워크플로우는 수동 실행 구조
- wrangler.toml(루트 Pages), worker/wrangler.toml(Worker) 역할 분리 상태 확인
- package.json deploy 기본 경로는 deploy:cf -> deploy:cf:worker

## 11) 검증 실행 결과
실행 명령과 결과:
- npm install: 성공
- npm run audit:files: 성공
- npm run clean:repo:dry: 성공 (후보 33개)
- npm run clean:repo:apply: 성공 (삭제 33개, 실패 0)
- npm run clean:repo:dry (재검증): 성공 (후보 0개)
- npm run audit:files (재검증): 성공
- npm run lint: 실패 (기존 다수 ESLint 오류/경고, 본 패치 유발 아님)
- npm run build: 성공
- npm run build:cf: 성공
- npm run verify:no-secret-leak: 성공
- npm run verify:worker-size: 성공 (handler.mjs 미존재로 스킵)
- npm run verify:runtime-cache-sync: 성공
- npm run perf:psi:before: 실패 (scripts/measure-psi.mjs 파일 없음)
- npm run perf:psi:after: 실패 (scripts/measure-psi.mjs 파일 없음)

## 12) 사람이 추가 확인해야 할 위험 항목
- lint 실패 항목은 기존 코드베이스 전역 이슈로 보이며, 별도 린트 정비 작업 필요
- reports/unused-files-report.json 후보는 동적 로딩 오탐 가능성이 있어 즉시 삭제 금지
- root/public 미러 구조 단일화는 대규모 배포 정책 변경이므로 별도 브랜치에서 단계적 진행 필요

## 13) Git 추적 캐시 파일 정리 안내
현재/과거에 캐시 파일이 Git 추적 중이면 아래 명령으로 index 정리가 필요함:

- git rm -r --cached .wrangler
- git rm --cached tsconfig.tsbuildinfo

(작업 트리 파일 삭제가 아니라 Git 추적만 해제)
