# Phase 5 — 최종 삭제 & 마무리

> 브랜치 `chore/orphan-cleanup-20260725` · PR **#24** → main. 격리 상태 CI 녹색 확인 후 실제 삭제 진행.

## 실행 결과

| 구분 | 내용 |
|---|---|
| **삭제 완료** | A등급 **15파일** (Maya 구중복 6 · 죽은 `lib/seo/` 5 · destiny-meeting-place 2 · 스텁 2) |
| **동반** | `tsconfig` `_graveyard` exclude 추가→삭제(원복). 순 변화: 15파일 삭제 + docs 추가 |
| **커밋 이력** | `9185bf7` 격리(_graveyard 이동) → `98be37b` 감사문서 → `8a60851` 실삭제 |

## CI 검증 (격리 상태, PR #24)

| 체크 | 결과 |
|---|---|
| Cloudflare **Pages 빌드**(전체 `next build`) | ✅ pass |
| Cloudflare **Workers 빌드** | ✅ pass |
| **gitleaks**(시크릿 스캔) | ✅ pass |
| **paid-flow-gates**(테스트·결제 검증) | ✅ pass |
| 로컬 typecheck / lint / verify:public-parity | ✅ 0에러 / 0블로킹(738→734) / OK |

→ 로컬(Windows)에서 못 돌리던 **전체 빌드를 CI가 통과** = 삭제 안전성 확증.

## 보류·미실행 (사용자 결정 반영)

| 항목 | 결정 |
|---|---|
| `@tanstack/react-virtual`(미사용 의존성) | **보류** — 제거 시 `package-lock.json`(수정 금지 파일) 갱신 필요. 별도 작업으로 이월 |
| 서사(tea-house 인트로 6 · yeon 4, 연이/꽃돼지) | **유지**(Phase 2-8 서사 자산) |
| animal-twelve 구버전 4파일 | **보류** — 사주/animal-destiny 인접, 직접 확인 후 |
| store-assets 스크린샷 12.7MB | **유지**(릴리스 자산) |
| 미배선 verify 가드 7종 | **유지** — 결제·인증 회귀 가드(의도된 미배선). 원하면 별도로 package.json 배선 복구 가능 |
| B-4 DestinyLibraryBanner · B-5 i18n-locales · B-6 saju-premium 타입 · B-9 scripts 일회성 | **미결** — `03-plan.md` 질문지에 열어둠 |

## 실질 효과 (정직한 계량)
- 제거: **15파일 ~104KB 소스**. **프로덕션 번들/런타임 변화 0**(이미 미참조). lint 경고 738→734.
- 가치: **중복 Maya·죽은 seo 디렉토리 혼동 제거 + 저장소 표면 정리**. 성능 이득 아님.

## 되돌리기
```bash
git revert 8a608513a           # 삭제 되돌리기
# 또는 격리 커밋에서 복원: git checkout 9185bf749 -- <경로>
```
