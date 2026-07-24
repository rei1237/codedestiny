# Phase 4 — 격리(Quarantine) 검증 로그

> 브랜치 `chore/orphan-cleanup-20260725` (격리 worktree). **삭제 아님 — `git mv`로 `_graveyard/20260725/` 이동(이력 보존).**

## 격리한 항목 (승인된 A-1~A-4, 15파일)

전부 `git status`에서 **R(rename)** 으로 기록 = git 이력 보존.

| 그룹 | 파일 | → 이동 위치 |
|---|---|---|
| A-1 Maya 구중복 | lib/maya/maya-calendar.ts · maya-data.ts · maya-reading.ts, components/maya/MayaFortunePage.tsx · MayaCalendarWheel.tsx · MayaResultCard.tsx | `_graveyard/20260725/` + 원경로 |
| A-2 lib/seo 죽은 디렉토리 | lib/seo/breadcrumbs.ts · createMetadata.ts · schema.ts · keywords.ts · keyword-clusters.ts | 〃 |
| A-3 destiny-meeting-place | components/fortune/destiny-meeting-place/DestinyMeetingPlaceFeature.tsx · DestinyMeetingPlaceHero.tsx | 〃 |
| A-4 스텁 | lib/fpti/saju-fpti-adapter.ts · lib/optimized-image-url.ts | 〃 |

- **동반 편집 1건**: `tsconfig.json` `exclude`에 `_graveyard` 추가(기존 `_scripts-archive` 관례와 동일). 격리 파일의 클러스터 내 `@/` 절대경로 자기참조가 컴파일에서 검사되지 않도록 — 라이브 빌드 무영향.
- **A-5 의존성 `@tanstack/react-virtual`**: 파일 이동이 아니라 `package.json` 편집이므로 Phase 5의 "의존성 제거" 커밋으로 분리(로컬 빌드 불가 → CI 빌드로 확인).

## 검증 결과 (자동)

| 검사 | 명령 | Phase 0 베이스라인 | 격리 후 | 판정 |
|---|---|---|---|---|
| Typecheck | `tsc --noEmit` | exit 0 · 0 에러 | **exit 0 · 0 에러** | ✅ 동일 — 라이브 import 무손상 확증 |
| Lint | `next lint` | exit 0 · ~738 경고 | **exit 0 · 734 경고** | ✅ 블로킹 0, 죽은 파일 unused-vars 4건 감소 |
| `_graveyard` lint 스캔 | (grep) | — | **0건** | ✅ 격리 파일은 lint 대상 아님 |
| 미러 정합 | `verify:public-parity` | — | **OK**(html5·js5) | ✅ 정적 셸 미러 무손상 |

- **전체 `next build`는 로컬(Windows) 미완주 → CI "Deploy Cloudflare Pages"에서만 최종 확인**(Phase 5 전제).

## 수동 스모크 체크리스트 (배포/실행 환경에서 확인 요망)

격리 대상이 전부 **미참조 죽은 코드**라 회귀 위험은 낮으나, Phase 5(삭제) 전 실사용 1회 확인 권장:

- [ ] 메인 홈 로드 / 테마(연이·네오) 토글
- [ ] Maya 운세 라우트(`/maya`)가 **정상 동작**(src 버전 사용 — 이번 격리는 구 `components/maya`·`lib/maya`만 제거)
- [ ] SEO 메타(임의 페이지 `<title>`/OG) 정상 — `lib/seo.ts`·`seo.v2.ts` 경로 무손상
- [ ] 프로필 카드 / 바텀 네비 전체 / 사주 결과 1건 / 타로 1건
- [ ] 결제 진입(게이트까지, 실결제 없이) / 앱 WebView 첫 진입 FOUC

## 되돌리기 (실패 시 즉시 전체 복구)

```bash
# 개별/전체 복구 (git mv 역방향) 또는:
git -C <worktree> restore --staged _graveyard/20260725 && \
  (cd <worktree> && for f in $(git diff --cached --name-only); do :; done)
# 가장 단순: 커밋 전이면
git -C <worktree> checkout -- . ; git -C <worktree> clean -fd _graveyard
# 브랜치 폐기: git worktree remove <worktree> && git branch -D chore/orphan-cleanup-20260725
```

## 다음 단계 (Phase 5)
- **전제**: 격리 상태로 CI "Deploy Cloudflare Pages" 1회 이상 정상 확인.
- 커밋 4분할: (1) 미사용 파일 제거(_graveyard 삭제) (2) 미사용 export (해당 시) (3) 미사용 의존성(`@tanstack/react-virtual`) (4) 미사용 에셋(해당 시). 커밋 본문에 "왜 안전한가(통과한 검증)".
- **미결(사용자 답변 반영)**: 서사(tea-house/yeon)·store-assets = **유지**, animal-twelve = **보류**(별도 확인).
