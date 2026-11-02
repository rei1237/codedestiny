---
status: blocked
updated: 2026-11-02
next: 최신 main과 기존 레시피 기반을 통합하고 현행 검증을 통과한 뒤 push
---

# 2026-11-02 주간 레시피

이번 주 5개: 사과 양배추 두부 월남쌈, 치커리 배 보리 샐러드, 당근 옥수수 채소죽, 생강 양배추 버섯 볶음우동, 김 참깨 구운 감자. 기존 15개와 중복 없음. lib/lifestyle/recipes-week-20261102.mjs의 week 필드로 중복 실행을 확인한다. 공통 데이터로 목록/상세/Recipe JSON-LD에 연결했다. 원본 레퍼런스, 결제·인증·API·DB는 변경하지 않았다.

내장 image_gen으로 2D 이미지 5장 생성, sharp quality84로 실제 WebP 1200x800 변환. 순서대로 160946, 184640, 134306, 153190, 210608 bytes. 전체 프롬프트와 원본 경로: public/images/five-elements/provenance-week-20261102.json. 생성 이미지의 음식과 캐릭터 스타일을 확인했다. 요리는 실조리 검수하지 않았으며 시간은 예상치다.

검증: 콘텐츠 계약 3/3 통과. 변경 모듈 ESLint 통과. 상세 5개 SSR HTTP200, 제목·JSON-LD·이미지 참조 확인. Playwright 월남쌈 페이지 390/1280px 가로 넘침 false, 깨진 이미지 0. sitemap:generate 977 URL. 기존 생성기에서 날짜 경과에 따른 광범위 lastmod 갱신이 발생하므로 최신 main 통합 때 신규 URL 이외 불필요한 갱신은 현행 생성기와 대조해야 한다.

check:fast -- --plan 및 check:fast 실행. 기존 docs/CURRENT_DEV_BASELINE.md 2026-10-02가 31일 경과해 doc-freshness 단계에서 실패. 나머지 전체 검사는 미실행이며 성공으로 보지 않는다. git merge-tree 읽기 전용 사전 검사에서 .ignore, AppChrome, SEO_STATE, 사이트맵 생성기/산출물 충돌을 재확인. 실제 merge/push/운영 승격은 하지 않았다.

main PR CI 조회: ba3b19318eef1a688f575e3e934af479deafb389, https://github.com/rei1237/codedestiny/actions/runs/41379565626, in_progress. 대기 상태를 실패나 성공으로 추정하지 않는다. 반복 polling하지 않았다.

작업 디렉터리: D:\Development\codedestiny-worktrees\seo-five-elements-20261011-20261011-235701
이전 커밋: fd7e3d95214595d9eb8286d11851160ef572e7f4
재개: 이 문서를 읽고 최신 main과 기존 레시피 기반의 충돌을 해결한다. 다른 세션의 변경을 보존하며 현재 SEO·브랜드 정책에 맞춰 검증하고 main에 전달한다. 새 주차 콘텐츠는 동일 주 재생성하지 않는다.
