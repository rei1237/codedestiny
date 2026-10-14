---
status: blocked
date: 2026-10-15
---

# 세 서비스 마스터 프로필 — 구현 완료, 전달 차단

## 재개 위치
- 작업 디렉터리: `D:\Development\codedestiny-worktrees\master-profiles-20261015-083302`
- 브랜치: `wt/master-profiles-20261015-083302`
- 구현 커밋: `e07c173dba2317066f8f2badee4b7ddfd7719e54`
- 이 문서: `D:\Development\codedestiny-worktrees\master-profiles-20261015-083302\docs\handoff\2026-10-15-master-profiles.md`
- main 기준: `b530a08c9140a83ef37b61ea4493a28b818d808b`

## 요청과 완료 내용
사용자가 승인한 초상 + HTML 소개 + 접힌 전체 프로필 시트를 마스터 인연의 서, 네오 전략실, 연이 찻집의 진입 화면에 추가했다. 새 소개 이름은 마스터이며 기존 서한비 서사/결과는 유지했다.

- 마스터: 제공 PNG를 WebP로 변환하고 초상 추출.
- 네오: 제공 얼굴 기준, 기존 전략실 남색 제복/금장/흰 망토/검정 장갑과 백사자 설정으로 built-in image_gen 제작.
- 연이: 이번 제공 인간형 얼굴 기준, 저고리/고름/치마 한복과 따뜻한 찻집 설정으로 built-in image_gen 제작.
- 공통 UI/문구: `components/fortune/MasterProfile.tsx`, `master-profile.module.css`, `master-profiles.ts`.
- 세 서비스 진입 컴포넌트에만 연결. 전체 시트는 펼칠 때 마운트, 원본 새 탭 링크 제공.
- `public/images/master-profiles/`의 WebP 6개와 `provenance.json`에 제작 기준/참조/변환 정보를 보존.
- `config/sitemap-lastmod.json`은 생성기로 해당 3개 경로 서명만 갱신.
- 결제/가격/인증/API/DB/AI 프롬프트/저장 결과 변경 없음.

## 검증
- 변경 5개 TS/TSX ESLint: 통과.
- `npm run typecheck`: 통과.
- `git diff --check`: 통과.
- Impeccable detector: anti-pattern 0. 글자 크기 advisory 2개는 기존 display 토큰과 16px 본문 크기로 정리.
- mock 개발 서버에서 3개 서비스 × 360/390/430/1440px: 가로 넘침 없음. 전체 시트 초기 미마운트, 키보드 열기/닫기, 이미지 decode, 원본 링크 확인.
- 네오 상담 진입 및 연이 프롤로그 진입 후 프로필이 제거됨을 확인.
- 화면 캡처: `C:\Users\user\.codex\visualizations\2026\10\14\01a13cb1-9689-7dd1-806b-71ac3384db43\master-profiles`의 `master-390.png`, `master-1440.png`, `neo-390.png`, `neo-1440.png`, `yeoni-390.png`, `yeoni-1440.png`.
- 로컬 서버에서 기존 CDN 폰트 CORS 오류와 간헐적인 dev chunk 로딩 오류가 관찰됐다. 재로드 후 프로필 렌더 및 상호작용 확인 성공. 운영/실기기 검증은 하지 않았다.
- `npm run check:fast -- --plan`: 공통 소스 변경으로 critical 자동 승격.
- `npm run check:fast`: paid-gate-suite 87개 통과, npm test 1개 실패로 중단. 내부 Jest 397 suites / 6,060 tests 통과. Node 테스트의 기존 관계 성향 카드 가격 assertion 불일치가 실패 원인.
- `node --test --test-reporter=dot __tests__/ui/luck-sync-diary-planner.static.test.js`: 같은 실패 재현. 105행은 coinCost:50을 기대하지만 `js/core/saju/reportDashboard.js`는 100이다. 두 파일 모두 기준 HEAD 대비 변경 없음. 이 작업에서 정책/테스트를 수정하지 않았다.
- `npm run check:pre-push`: 최초 sitemap 원장 drift 확인 → `npm run sitemap:generate`로 세 경로만 갱신 → 재실행 통과(레지스트리/미러/사이트맵 959 URL).

## 전달 차단과 다음 행동
기존 main 커밋 b530a08c9의 공식 PR CI가 이미 실패했다: https://github.com/rei1237/codedestiny/actions/runs/38653682887 (Static guards, CI required 실패). 저장소 지시대로 실패한 main 위에 push하지 않았다. 이 구현은 main에 merge하지 않았고 로컬 워크트리에 보존했다. PR/운영 배포 없음.

1. 현재 main의 공식 CI 및 기존 관계 성향 카드 assertion 해결 여부를 확인한다. 이 작업 범위를 가격 정책 수정으로 확대하지 않는다.
2. 해결된 main을 작업 브랜치에 반영하고 충돌 시 이 작업 14개 파일 범위만 검토한다. 변경/실패와 관련된 검사와 check:pre-push를 수행한다. 통과한 전체 테스트를 이유 없이 반복하지 않는다.
3. main 작업 디렉터리의 다른 세션 변경을 확인/보존하고 이 브랜치를 main에 merge한다. 인수인계 status를 done으로 닫고 커밋한 뒤 `git push origin main`한다. 최종 보고 직전에 해당 SHA의 main CI를 한 번 확인한다. CI/staging 반복 폴링 금지.
4. 전달 완료 후 자기 워크트리의 node_modules 정션을 먼저 해제하고 worktree 및 머지된 wt 브랜치를 제거한다. 기존 다른 작업 파일/워크트리는 건드리지 않는다.

현재 mock 개발 서버와 이 작업 검증 프로세스는 종료했다. main의 기존 미추적 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs`는 그대로 보존했다.
