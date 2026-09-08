---
status: active
updated: 2026-09-08
next: PR #1834의 GitHub CI 전체 결과를 확인하고 통과 시 병합 순서를 다시 점검한다.
---

# 기본 자미두수 별 지도 · PR 1834

## 재개 위치

- cwd: `D:\Development\worktree-ziwei-chart-experience`
- branch: `codex/ziwei-chart-experience`
- PR: https://github.com/rei1237/codedestiny/pull/1834
- 구현 SHA: `9cc6013ad7488111927c1360f13c8060500dd53e` (최신 main 재배치·미러 갱신 포함)
- 이 문서는 위 구현 뒤 추가된 인수인계 커밋에 포함된다. 최신 푸시 SHA는 `git rev-parse HEAD`로 확인한다.

## 구현

- 후속 그래프 구현: 선택한 12궁의 기존 5축 지표를 SVG 레이더로 표시. 기존 계산식과 원본 입력을 유지한다.
- 인생 흐름 곡선: 대한 구간에 해당하는 궁의 원국 배치 지표. 전체 / 일과 재물(2개 곡선) / 관계 / 회복 전환, 점 선택·좌우 키보드·궁 상세 연결. 모바일은 그래프 내부만 가로 스크롤.
- 곡선 보간은 시각적 연결이며 중간 나이 예측이 아니다. 대한 사화·연도별 세운을 계산한 그래프가 아니며 성취 확률·의학 지표로 해석하지 않도록 설명한다. 기존 유료 시기 해석과 별도.
- 후속 그래프 mock 검증: 모든 궁의 5축 표시값과 엔진 지표 일치, 12개 시기 점, 복수 곡선 전환, 클릭/방향키, 비정상 좌표 없음. 360/390/430/1280 레이더·곡선 캡처 추가.
- 그래프 후속에서 check:fast 재통과: Jest 218 suites / 2417 tests. public-mirror-fresh, 상세 48, 차성 88, 상담 14 domains 재통과. 88683b599 푸시 후 delivery:admit는 아래 활성 중첩/main 충돌/CI 없음으로 차단됐으며 워크트리는 clean이다.
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

- 그래프 후속 확인 시 origin/main: `ad63ac91fbd69ed72c5590d7a26472f79d9729d4`.
- 활성 충돌: codex/home-diary-disclosures (홈/cache-bust 공통 파일). 다음 실행 때 worktree:status로 재확인한다.
- 후보에 최신 main 미포함, PR mergeable=CONFLICTING / state=DIRTY.
- PR HEAD CI check_runs=0. 통과로 보고하지 말 것.
- 직전 main 스테이징 SHA는 Pages·Worker 모두 `ad63ac91fbd69ed72c5590d7a26472f79d9729d4`로 도달. 이 PR의 스테이징 배포 증거는 아니다.
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
