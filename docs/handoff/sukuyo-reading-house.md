---
status: active
updated: 2026-09-08
next: Ready PR의 최신 HEAD 검사 상태를 확인하고 명시적으로 승인된 경우에만 머지 및 스테이징 SHA를 검증한다.
---
# 숙요 읽기 공간 구현

- 작업 폴더: D:\Development\worktree-sukuyo-reading-house
- 브랜치: codex/sukuyo-reading-house
- 기준: origin/main 174c363ee9e3 (PR #1818)
- 상태: 사용자 승인 시안 적용 및 로컬 검증 완료. PR 생성 진행 중.
- PR/마지막 푸시: 생성 후 이 문서에 기록한다.

## 구현과 유지 경계

- 기본 해석과 기존 명반·달력·상세 진입을 펼친 상태로 복원했다. 기존 컨트롤/ID와 모달 포커스·뒤로가기 동작을 보존했다.
- 새 WebP public/images/sukuyo/moon-garden.webp (1440x960, 183894 bytes)를 승인된 버건디·장미·금색 방향으로 연결했다.
- 27숙 도감은 기존 professionalSukuyoTraits 정본을 사용한다. 危·胃를 구별하며 도감 선택이 본명숙·명반 계산 상태를 바꾸지 않는다.
- 관련 글 26편은 기존 INSIGHT_SEED_ARTICLES의 숙요점 카테고리에서 생성한다. 목록/본문/복귀/원문 링크와 검색을 제공하고 본문은 선택할 때 로드한다.
- 기존 관계 설명의 명(命)·성위(成危) 명칭과 해석을 계산 정본에 맞췄다. 기존 슬러그와 URL은 유지한다. 회복 조언의 질병 단정과 시기 운의 확정적 표현을 완화했다.
- 계산 공식, 인증, API 응답, DB, 가격, 이용권·월정석·단건 결제 정책은 변경하지 않았다. 심층 hidden/karma/mantra/health/timing은 기존 유료 상세 렌더러에 남겨 둔다.
- 참고 사이트는 탐색·정보 구조만 참고했으며 원문 대량 번역이나 이미지 복제를 하지 않았다. 이미지 생성 프롬프트는 docs/design/sukuyo-reading-house/asset-provenance.md.

## 검증

- npm run check:fast -- --plan / npm run check:fast: 통과. lint, typecheck, 지급·결제 안전 가드, Worker dry-run, Jest 218 suites / 2417 tests 포함.
- node scripts/verify-basic-fortune-library.mjs: 통과. baseline 계산 비교, 5언어, 키보드·뒤로가기·새로고침·오류/로딩/공유, 숙요/자미두수/점성술 확인.
- node scripts/verify-sukuyo-reading-house.mjs: 기존 컨트롤 보존, 27숙 탐색 중 본명숙 불변, 글 26편 열기/포커스 복귀, 360/390/430/1280 가로 넘침 없음, JS 오류 없음.
- node scripts/verify-insight-authored.mjs sukuyo-myeongseong sukuyo-wiseong: 원문 렌더·1200자 이상·중복 지문 검사 통과 (2460/2512자).
- npm run sync:public / npm run sitemap:generate: 정본에서 미러·사이트맵 재생성.
- 검증은 전부 mock 네트워크다. 실 LLM·결제·운영 DB·배포를 호출하지 않았다.
- 실제 화면과 승인 시안의 독립 마감 검토: 차단 회귀 없음. Impeccable 정적 detector 결과 []는 기능 검증과 별도로 확인했다.
- 증거: .impeccable/basic-fortune/house/house-report.json 및 스크린샷, .impeccable/sukuyo-check-fast.log (로컬 전용).

## 다음 작업

PR의 최신 검사 결과를 확인한다. 머지 및 스테이징·프로덕션은 아직 실행하지 않았다. 사용자의 명시적 승인 범위에서만 진행한다. 이 작업의 워크트리는 보존한다. node_modules는 이 워크트리에 npm ci로 설치한 독립 디렉터리다.

## 재개 명령

```powershell
Set-Location 'D:\Development\worktree-sukuyo-reading-house'
codex 'D:\Development\worktree-sukuyo-reading-house\docs\handoff\sukuyo-reading-house.md를 읽고 codex/sukuyo-reading-house 브랜치의 Ready PR 최신 검사 상태부터 확인하라. 머지는 명시적 승인 이후에만 진행하고 스테이징 SHA와 정상 응답을 검증하라.'
```
