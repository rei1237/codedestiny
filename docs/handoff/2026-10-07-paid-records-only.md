---
status: verifying
updated: 2026-10-07
next: "원격 main으로 안전한 fast-forward push 후 정확한 SHA의 CI required를 확인하고 문서를 완료 처리한다. 공유 로컬 main은 다른 세션 변경 때문에 전진 불가."
---

# 무료 결과 서버 저장 및 보관함 다시 보기 제외

## 요청

"최애 운명 같은 무료 서비스는 서버에 저장하지말고 보관함에서 다시 보기를 제공하지마 오직 유료서비스만 제공하면 된다."

## 현재 상태

- 작업 디렉터리: D:\Development\code-destiny\.codex-worktrees\paid-records-only-20261007-024230
- 브랜치: wt/paid-records-only-20261007-024230
- 코드 커밋: 4417bd7cf63b1642e766d67d93c1d1748d3147f6 (fix: restrict saved readings to paid services)
- 이 문서 절대 경로: D:\Development\code-destiny\.codex-worktrees\paid-records-only-20261007-024230\docs\handoff\2026-10-07-paid-records-only.md
- main 반영/push: 보류. 공유 체크아웃 main에 다른 세션의 다수 변경이 남아 있고, 원격보다 뒤처져 있다.
- main merge 시도: git merge --ff-only wt/paid-records-only-20261007-024230. .git/index.lock이 이미 존재해 중단됐다. 잠금 파일은 삭제하지 않았다.
- 잠금 메타데이터: D:\Development\code-destiny\.git\index.lock, 0바이트, 생성/수정 2026-10-05 17:09:02. 소유자는 미확인이다. 오래됐다는 이유로 다른 세션 잠금을 강제 삭제하지 않는다.
- CI/스테이징/운영 반영: 미확인. 운영 DB 삭제 및 실제 LLM/결제는 하지 않았다.

## 구현

- 최애운명 자동 저장, 저장 재시도, 컬렉션 저장 및 보관함 링크 제거.
- POST /api/destiny-bias/cards 및 /share는 DB/인증/본문 파싱 전에 410 FREE_RESULT_STORAGE_DISABLED를 반환한다. GET /cards는 빈 목록을 반환한다.
- 최애운명 공유는 생일 없는 같은 최애 초대 링크와 기기 내 이미지 생성/다운로드를 쓴다. 신규 공유 스냅샷도 서버에 저장하지 않는다. 기존 공개 공유 링크의 읽기와 본인 카드 삭제 경로는 유지한다.
- 무료 휴먼디자인 차트의 DB 조회/쓰기 제거. 로그인과 계산 레이트리밋 및 응답 inputHash는 유지한다. 유료 리포트는 기존대로 결제 증빙 이후 독립적으로 계산/저장한다.
- 보관함 최애운명 소스 및 읽기 레지스트리 제외. 휴먼디자인 차트는 과거 유료 접근만 제공한다.
- 보관함 목록과 상세 조회가 같은 sourceCondition을 사용한다. free/free_trial 기록 및 공용 실행 저장소의 미등록/무료 기능을 제외한다. 기존 가격 레지스트리와 별칭 정규화를 재사용한다.
- 안내 문구와 화면 검증 fixture를 유료 보관 정책에 맞춤.
- 가격, 이용권/월정석/단건 결제 정책, 유료 결제/인증 로직 및 DB 스키마는 변경하지 않았다. 기존 운영 무료 데이터의 물리적 삭제는 수행하지 않았다.

## 변경 파일

- app/saju/destiny-bias/DestinyBiasClient.tsx
- app/saju/destiny-bias/components/chemi/ChemiShareBar.tsx
- app/saju/destiny-bias/page.tsx
- lib/records/service-registry.js
- lib/records/reading-registry.js
- lib/records/copy.ts
- worker/lib/record-library.js
- worker/routes/destiny-bias.js
- worker/routes/human-design.js
- scripts/design/verify-records-hub.mjs
- scripts/verify-human-design-report.mjs
- __tests__/worker/record-library.test.js
- __tests__/worker/destiny-bias-record-storage.test.js
- __tests__/worker/human-design-free-storage.test.js
- __tests__/ui/destiny-bias-record-autosave.behavior.test.mjs
- __tests__/ui/destiny-bias-share.static.test.mjs

## 검증 실측

- npm run test:jest -- --runInBand __tests__/worker/record-library.test.js __tests__/worker/destiny-bias-record-storage.test.js __tests__/worker/human-design-free-storage.test.js __tests__/worker/human-design-report.start-charge-window.test.js: 4 suites / 33 tests 통과.
- node --test __tests__/ui/destiny-bias-record-autosave.behavior.test.mjs __tests__/ui/destiny-bias-share.static.test.mjs __tests__/ui/records-reading-content.test.mjs: 16 tests 통과.
- npm run verify:human-design-report: 통과, LLM 실호출 0회.
- npm run typecheck: 최애 목록 선언이 삭제된 타입 오류를 발견했고 원래 선언으로 복구한 후 재실행 통과.
- 변경 파일 ESLint --quiet: 통과. 마지막 페이지 문구도 별도 lint 통과.
- git diff --check, node --check scripts/design/verify-records-hub.mjs: 통과.
- impeccable context 및 ChemiShareBar detect: 실행 완료. 레이아웃/토큰 변경은 없다. 실제 모바일/데스크톱 화면 검증은 미실행.
- npm run check:fast -- --plan: critical 자동 승격.
- npm run check:fast: paid gate 88개 중 87 통과/1 실패, 벽시계 781.7초. 실패는 첫 npm test 실행 당시 새 회귀 fixture가 현재보다 미래(10월 8일)로 생성되어 cutoff 필터에 걸린 1개 테스트다. 당시 Jest 345 suites 중 344 통과, 5175 tests 중 5174 통과. 날짜를 이미 지난 10월 6일로 수정하고 해당 suite를 포함한 33 tests 재실행 통과. 검사가 진행 중인 동안 이 수정이 이뤄져 최초 전체 실행 결과에는 실패가 남았다. 전체 check:fast의 최종 통과로 보고하지 않는다.
- 전체 npm test는 Jest 실패에서 멈췄으므로 전체 Node suite는 해당 실행에서 미실행. 이후 관련 Node 16개는 통과했다.
- 무료 서비스 레지스트리 제외에 따른 읽기 레지스트리 누락을 관련 Node 검사로 발견하고 레지스트리/시각 fixture를 함께 정리해 6개 읽기 검사 재실행 통과.

## 다음 행동

1. 공유 main 잠금의 소유 세션을 확인하고 그 세션에서 안전하게 정리한다. 타 세션 변경은 reset/stash/clean 또는 커밋에 섞지 않는다.
2. git fetch origin 후 원격 전진을 확인한다. 작업 커밋과 새 main의 관련 파일 겹침/충돌을 확인하고 필요한 경우 이 워크트리에서 반영한다.
3. 공유 main에 git merge --ff-only wt/paid-records-only-20261007-024230을 수행한다. 타 세션 변경 때문에 거부되면 강제하지 않는다.
4. 안정된 main에서 git push origin main 후 정확한 SHA의 CI required 성공을 확인한다. 운영 승격은 별도 요청 없이 하지 않는다.
5. 문서를 status: done으로 닫고 커밋/전달한다. 본인 워크트리는 node_modules 정션 해제 후 git worktree remove --force와 git branch -d로 배수한다. 다른 세션의 파일/워크트리는 삭제하지 않는다.

## 복사 가능한 재개 지시

D:\Development\code-destiny\.codex-worktrees\paid-records-only-20261007-024230에서 D:\Development\code-destiny\.codex-worktrees\paid-records-only-20261007-024230\docs\handoff\2026-10-07-paid-records-only.md를 읽고, 코드 커밋 4417bd7cf63b1642e766d67d93c1d1748d3147f6 및 브랜치 wt/paid-records-only-20261007-024230을 확인한 뒤, 공유 main의 .git/index.lock 소유 확인 및 안전한 정리부터 진행하라. 다른 세션의 변경을 보존하면서 main 반영, git push origin main, 정확한 SHA의 CI required 확인을 완료하라.

## 재개 세션 전달 진행 (2026-10-07)

- 요청 브랜치와 마지막 커밋 c153d60a141f3b7a1107b0a44cae789d8a653f32 일치, 재개 당시 작업 워크트리 clean 확인.
- 공유 index.lock: 0바이트, 2026-10-05 08:09:02 UTC부터 변경 없음. 프로세스 조회 결과 Git 쓰기 작업 없이 fsmonitor 데몬만 존재. FileShare.None 독점 열기 성공으로 열린 파일 핸들 없음 확인 후 잠금을 이름 변경해 안전하게 격리.
- 공유 main fast-forward는 타 세션의 수정/스테이징/미추적 파일 충돌로 Git이 거부. 해당 체크아웃의 파일, 스테이징 변경, HEAD를 그대로 보존하며 stash/reset/강제 덮어쓰기를 하지 않음.
- 작업 워크트리에서 origin/main 4edfb575ea381df4b96cd1cc57033ad64633b855 병합 성공, 충돌 없음. 병합 커밋 6db52d5048fc61164485f3f4bd6c4e6d64adc320.
- 재개 후 관련 Jest 4 suites / 33 tests, Node 16 tests, verify:human-design-report 및 git diff --check 모두 통과. LLM 실호출 0회.
- check:fast 계획은 critical. 기존 전체 실행 실패 기록을 그대로 유지하며, 전체 검증의 최종 판정은 정확한 pushed SHA의 GitHub CI에서 확인한다.
- 공유 main 작업 파일 83개 SHA256 및 스테이징 9개 raw 항목을 전달 전 스냅샷으로 비교한다. 원격 main은 HEAD:main refspec으로 전달하며 force push는 사용하지 않는다.