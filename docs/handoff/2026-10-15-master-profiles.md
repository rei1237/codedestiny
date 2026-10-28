---
status: done
date: 2026-10-15
updated: 2026-10-15
next: 완료 — 재개 작업 없음.
---

# 세 서비스 마스터 프로필 — 구현 및 전달 검증 완료

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

## 전달 재개 결과
- 기존 main 실패는 `9e1d72e338376ee497c4eee4d7ea9f49f14224a8`에서 관계 성향 카드 가격 assertion을 현재 정본 100코인에 맞추며 해결됐다.
- 해당 SHA의 공식 PR CI `38659205350`은 Static guards를 포함한 `CI required`가 성공했다.
- 최신 `origin/main` `9e1d72e338376ee497c4eee4d7ea9f49f14224a8`을 병합 커밋 `84d87abb1be8ef9d50721aa28beac9d36475da57`로 충돌 없이 반영했다.
- 기존 실패 단일 테스트 재실행: 11개 통과.
- `npm run check:fast -- --committed-head`: 통과. Node 3,245개, Jest 397 suites / 6,060 tests, 결제·권한·AI mock·Worker dry-run 포함.
- 이 작업은 가격 정책을 수정하지 않았고, main의 assertion 복구 커밋만 병합해 검증했다.
- PR/운영 배포 없음. main 병합·push 후 해당 SHA의 main CI만 최종 확인한다.

현재 mock 개발 서버와 이 작업 검증 프로세스는 종료했다. main의 기존 미추적 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs`는 그대로 보존했다.
