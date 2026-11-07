# 레거시 페이지·코드 정리 인수인계 (2026-11-08)

- 워크트리: `D:\Development\codedestiny-worktrees\legacy-cleanup-20261108-034220`
- 브랜치: `wt/legacy-cleanup-20261108-034220` (기준 origin/main `db59b37f7`)
- 상태: 정리 커밋 완료, 검증 통과, **push·배포 전**. 운영 반영은 사용자 승인 뒤.

## 무엇을 했나

| 커밋 | 내용 |
|---|---|
| `2f36f4ab1` | 개발용 화면·이동 별칭·noindex 사본을 지우고 301로 모았다. 매핑은 [docs/seo/2026-11-08-legacy-cleanup-redirects.md](../seo/2026-11-08-legacy-cleanup-redirects.md) |
| `0b29c7944` | `app/yeongnyangi/_original` → `_home`. 고아 `FishCatalog.tsx` 삭제, 결제 P0 원장에서도 뺐다 |
| `7a63f81be` | 어디서도 import하지 않는 소스 68개와 그 테스트 1개 삭제 |
| `bd51cb4b6` | package.json·CI·테스트·다른 스크립트 어디서도 부르지 않는 스크립트 228개 삭제 |
| `59c9387a1` | 코드에서 이름이 한 번도 나오지 않는 옛 이미지 10장 삭제 |
| `1119fd1e8`, `6173b08e8` | 공개 미러·캐시 키, 사이트맵·lastmod 원장 재생성 |
| `fa29fc273` | `scripts/README.md`를 실제 폴더·접두사 색인으로 다시 썼다 |

합계: 435파일, 삭제 333개, 31,344줄 삭제. 지운 파일은 3.0MiB다.

## 일부러 남긴 것

- **다른 브랜치·워크트리가 고치는 파일**: 지우면 병합 충돌이 나서 남겼다. QuestionScope 묶음(`QuestionScope.tsx`, `ConsultationCompanion.tsx`와 CSS), 스크립트 27개(`scripts/design/verify-*`, `translate-*`, `verify-consultation-home-browser` 등)가 해당한다. 그 브랜치가 병합된 뒤 다시 확인해 지운다.
- **문서가 정본으로 부르는 스크립트 3개**: `verify-home-entry-locale.cjs`, `qa/recheck-yeongnyangi-samples.mjs`, `verify-yeongnyangi-relationship-browser.mjs`.
- **public 이미지 후보 175개(26.2MiB)**: 참조는 0건이지만 `${ISLAND_ASSET_ROOT}/guardians/${slug}-v1.webp`, `heaven-light-v72-ch${i}-320`, `saju/nature/${stem}-960`처럼 이름을 실행 중에 만드는 폴더에 있다. 확인하지 못해 남겼다. 후보 목록은 세션 작업 폴더의 `b3-candidates.json`, `b3-probe.txt`에 있었다.
- **트래픽을 모르는 콘텐츠**: `/nakshatra/codex/*` 27쪽, `/saju/monthly/2026-09/*` 11쪽, `/compare/*` 3쪽. 사이트맵과 허브가 링크하고 있고 검색 유입 수치가 없어 지우지 않았다.

## scripts 폴더 대이동을 하지 않은 이유

`verify-*` 354개를 하위 폴더로 옮기면 경로 참조 약 600곳이 바뀐다. 스크립트 다수가 `path.resolve(dirname, '..')`로 루트를 잡는다. CI·결제 게이트는 `scripts/verify-*.mjs` 글롭과 고정 경로를 쓴다. 열린 워크트리 33개와도 충돌한다. 대신 README에 접두사·폴더 규칙과 새 스크립트를 둘 위치를 적었다.

## 검증

- `npm run check:pre-push`: 6종 모두 통과
- `ALLOW_DEV_SERVER_DURING_BUILD=1 node scripts/check-changed.mjs --base=origin/main --committed-head`: 종료 코드 0. 빌드, `verify-dist`, `adsense-readiness`, 결제 게이트 77개 포함
- 영냥이 테스트 42/42, 결제 P0 원장 PASS(172 상품), tsc, `verify-js-module-graph` OK

## 다음

1. 사용자 승인 뒤 push한다. 공유 main 규칙대로 origin/main 작업 트리에 이 브랜치 커밋만 cherry-pick한다. 그 사이 main이 움직였으면 `sync:public`, `sitemap:generate`를 다시 돌린다.
2. 배포 뒤 301 목록의 주소를 실제로 열어 301 한 번과 목적지 200을 확인한다.
3. SEO 재구축 묶음 ③(색인 원장)이 이 삭제 목록을 함께 반영해야 한다.
4. 남긴 묶음은 해당 브랜치가 병합된 뒤 다시 스캔한다.
