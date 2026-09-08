# 기본 자미두수 별 지도 · PR 1834

## 재개 위치

- cwd: `D:\Development\worktree-ziwei-chart-experience`
- branch: `codex/ziwei-chart-experience`
- PR: https://github.com/rei1237/codedestiny/pull/1834
- 구현 SHA: `091293996e642211ac9908d415280b6ec444395d`
- 이 문서는 위 구현 뒤 추가된 인수인계 커밋에 포함된다. 최신 푸시 SHA는 `git rev-parse HEAD`로 확인한다.

## 구현

- 기존 기본 자미두수 모달의 전체 12궁을 4×4 명반으로 초기 표시. animation:none 상태에서 opacity:0이 남던 결함 수정.
- 모든 궁 클릭/Enter/Space 상세: 12궁별 역할, 14주성 풀이, 강점·조율점·생활 활용, 실제 삼합/대궁.
- 공궁은 대궁 주성을 차성으로 명시하며 본궁 주성 개수와 분리. 입력 계산 결과 불변.
- 기존 celestial-atlas.webp만 장식 이미지로 사용. 긴 설명은 한국어이며 전체 다국어 번역은 미완료.
- 실제 daHanList 흐름표와 기본 공개 풀이, 기존 대한10년운 게이트로 연결. 원래 잠금 본문·해금키·과금정책 유지.
- 14개 상담 주제/예시. domain을 요청·멱등 식별자·결제 복귀에 유지. 서버 주제별 주궁·삼합·대궁과 부족한 근거 안내 강화.
- 원본: js/core/saju/basicFortunePresentation.js, styles/basic-fortune-library.css, js/saju-engine.js, worker/lib/ziwei-ai-prompt.js.
- 생성 미러와 cache-bust 변경은 npm run sync:public 결과. 직접 편집 금지.
- 디자인 기록: docs/design/ziwei-basic-star-atlas.md. 승인 목업은 예시 데이터이며 실제 명반의 근거가 아니다.

## 검증 완료

- npm run check:fast -- --plan: critical/full verification.
- npm run check:fast: 통과. Jest 218 suites / 2417 tests. 기존 lint 경고 있음. frontend build는 CI 위임, worker dry-run 포함.
- node scripts/verify-basic-fortune-library.mjs: 통과. 실제 홈+엔진을 mock으로 360/390/430/768/1280 확인, 계산 결과 일치, 전체12궁 클릭, focus/history/키보드,5개locale 주요 라벨, 상담 domain 복귀/같은 paid requestId 실패 재시도.
- node scripts/verify-ziwei-basic-consult-prompt.mjs: 14 domains 통과.
- verify:ziwei-consult-categories 146, verify:ziwei-chart-detail-view 48, verify:ziwei-borrowed-strength 88 checks 통과.
- npm run verify:public-mirror-fresh: 커밋 뒤 통과.
- 별도 마감 검토5항목 해결 판정. 실제 LLM·결제·운영 DB·배포 실행 없음.
- 캡처: .impeccable/basic-fortune/after/ (gitignored). 승인 목업 캡처2개는 사용자 visualization 작업 폴더로 옮겨 보존함.
- 공유 node_modules junction의 lock mismatch 경고 있음. 로컬 통과는 clean CI 대체 불가.

## 병합 차단 (delivery:admit 실제 결과)

- 현재 origin/main: `8cc8d24b7f6a60b715e58750a30bf3e9738c1699`.
- 활성 충돌: codex/nakshatra-dual-star-renewal (홈/cache-bust), codex/sukuyo-reading-house (홈 + basicFortunePresentation.js + basic-fortune-library.css).
- 후보에 최신 main 미포함, PR mergeable=CONFLICTING / state=DIRTY.
- PR HEAD CI check_runs=0. 통과로 보고하지 말 것.
- 직전 main 스테이징 SHA는 Pages·Worker 모두 `7fad20ae9e6775579e48cb1766e20f2c2fff6af4`로 뒤처짐.
- 현재 워크트리/브랜치 보존. 다른 작업 중첩을 우회해서 merge/force push/배포하지 않는다.

## 다음 행동

1. npm run worktree:status로 활성 숙요점/낙샤트라 중첩 상태부터 확인. 해당 작업 완료 후 공통 파일을 순서대로 통합한다.
2. 최신 origin/main과의 충돌은 자신의 격리 워크트리에서만 해결하고, 타 작업의 미커밋 파일은 건드리지 않는다. 생성 미러는 원본 통합 뒤 sync:public으로 재생성.
3. 위 mock 검증 및 check:fast를 통합 상태에서 재실행. 필요한 깨끗한 의존성/빌드는 CI에서 확인.
4. PR 최신 HEAD의 필수 CI가 성공하면 npm run delivery:admit -- --pr=1834를 다시 실행. 직전 main 스테이징 도달도 필수.
5. admit 통과 전 병합 금지. 병합한 경우 병합 SHA의 스테이징 Pages·Worker 및 읽기 전용 응답을 확인하고 자신의 clean 워크트리만 제거. 프로덕션은 별도 승인 없이는 금지.

```text
D:\Development\worktree-ziwei-chart-experience에서 D:\Development\worktree-ziwei-chart-experience\docs\handoff\2026-09-08-ziwei-star-atlas-pr1834.md를 읽고, codex/ziwei-chart-experience / PR #1834의 상태를 확인한 뒤 npm run worktree:status로 활성 중첩 확인부터 이어서 진행하라.
```
