---
status: active
updated: 2026-09-08
next: PR 최신 CI와 main 충돌을 확인하고 사용자 승인 및 delivery admission 후에만 병합한다.
---

# 홈 다이어리·검색·전체 서비스 복원

- cwd: D:/Development/worktrees/home-diary-disclosures
- branch: codex/home-diary-disclosures
- base: 978b037ce2b50610e781be86fbed5914832fbc53 (최신 main 통합)
- PR: https://github.com/rei1237/codedestiny/pull/1838 (Draft; CI 진행 중)
- 구현: 다이어리·전문가 상담을 홈으로 복원, 대화형 상담 위치 상향, 전체 검색 기본 접힘, 컬렉션은 펼치기 바로 아래, 하단 모든 운세 원래 액션 복원, 음악 1천원대 필터와 12개 언어 라벨.
- 기존 가격·결제·인증·API·DB 계약 유지. 이미지 바이트 변경 없음. sync:public 캐시 키/미러와 sitemap 원장은 생성 결과다.
- 전체 화면 컬렉션은 navigation store 구독으로 원래 inputPage 부모에 잠시 옮기고 닫으면 홈 슬롯으로 복원한다. 홈 내부 paint containment가 fullscreen을 가두지 않도록 한다.
- 검색 상세는 native details, 기존 검색 엔진은 처음 열 때 초기화한다. 기존 검색 hash는 자동 펼침과 포커스를 유지한다.

## 검증

- npm run check:fast -- --plan: shared UI 변경으로 전체 검사 승격.
- npm run check:fast: exit 0, lint/typecheck/Node/정책 가드/Worker dry-run/Jest 218 suites, 2432 tests 통과. 프론트엔드 build는 CI에 위임.
- npm run verify:mobile-bottom-nav-sync: 7개 셸, 12개 사전의 84개 라벨 통과.
- npm run verify:home-service-registry: registry 57개 및 셸 결제 타일 31개 통과.
- npm run verify:hero-contrast / verify:mobile-detail-nonintrusive / node scripts/verify-payment-freeze.mjs: 통과.
- node scripts/design/build-home-funnel.mjs --check: 통과.
- 브라우저: scripts/design/verify-home-funnel.cjs, 360/390/430/768/1280/1440, 두 테마, 접기/펼치기, 검색/초기화/음악 필터, 하단 카테고리/닫기, 회원 프로필 mock. 결과 build-cache/home-ui.
- 외부 브라우저 요청 차단, 로컬 CDN 경로는 원본 로컬 이미지로 모사. 초기 CDN 404와 공용 이미지 fallback 경쟁은 로컬 fixture에서 제거했으며 운영 CDN 검증을 뜻하지 않는다.
- Impeccable scan: 기존 CSS의 폰트/크기 경고와 신규 fluid type advisory. 기존 브랜드 유지, 차단 오류 없음.

## 남은 확인

PR CI/build 및 최신 main 충돌 확인. 다른 홈 작업과 공통 파일 중첩이 있으므로 순차 통합한다. 병합/스테이징/운영 배포는 수행하지 않았다. 커밋 후 verify:public-mirror-fresh 통과. PR CI는 진행 중이다.

```powershell
Set-Location 'D:/Development/worktrees/home-diary-disclosures'
codex 'docs/handoff/home-diary-disclosures.md를 읽고 codex/home-diary-disclosures PR 최신 CI와 충돌을 확인하라. 승인 없이 병합하거나 운영 배포하지 말 것.'
```

