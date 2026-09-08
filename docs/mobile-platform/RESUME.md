# #1824 재개 가이드

상세페이지 구현은 완료·검증 단계다. 기존 워크트리와 브랜치를 그대로 사용한다. 새 worktree 생성, reset, 공유 checkout 편집 금지.

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny-mobile-platform-ux'
Get-Content -LiteralPath 'docs/handoff/mobile-platform-ux.md'
git status --short --branch
git log -6 --oneline
npm run worktree:status
gh pr view 1824 --json url,isDraft,headRefOid,mergeStateStatus,statusCheckRollup
```

기대 브랜치: `codex/mobile-platform-ux-20260908`

## 남은 순서

1. 로컬 전체 검사 결과 확인. 실패는 실제 원인과 flaky timeout을 구분한다.
2. 변경 파일만 커밋·푸시한다.
3. 후속 PR에서 65개 고유 실행 경로·63개 공개·`points`/`saju-animal` 2개 source-inventory-only 상태를 확인한다.
4. 최신 CI 필수 검사 완료까지 확인한다.
5. 사용자 머지 승인 전 머지·스테이징·운영 배포 금지.

## 완료 정본

- 상세 범위: [feature-detail-coverage.md](feature-detail-coverage.md)
- 상태와 검증: [../handoff/mobile-platform-ux.md](../handoff/mobile-platform-ux.md)
- 수기 상세 콘텐츠: `index.html`의 `FEATURE_VISUAL_DETAILS`
- 검토 허용 목록·생성: `scripts/lib/build-visual-details.mjs`
- 공통 렌더러: `js/feature-detail-panels.mjs`
- 목록 UX: `app/features/FeatureIntroductionCatalog.tsx`

## 안전 경계

- 실제 LLM·PG·운영 DB·배포 사용 금지.
- `points`는 결제 정책 화면이라 소개 결과 목록에서 제외.
- `face-reading`은 `/animal/physio` 실행과 `/features/face-reading/` 소개로 연결하며, 레거시 `/face-reading` 301은 `/physiognomy/`로 유지한다.
- 개인 결과 공개 공유 백엔드는 별도 개인정보·DB 설계 없이 추가 금지.
