---
status: active
updated: 2026-11-02
next: 독립 작업 공간의 요리 통합 트리 검사와 main push 후 CI 확인, 승인된 production 승격 및 라이브 무료 공개 검증.
---

# 사주 요리법 무료 웹툰 통합

## 결과
- 기존 seo-five-elements 작업 디렉터리의 레시피 20개와 2D WebP를 재사용했다. 모음은 /recipes/ 하나, 상세는 기존 고유 슬러그 20개다.
- 사주 분석의 reportDashboard(재미있는 사주 콘텐츠)에 무료 직접 진입 카드 1개를 추가했다. 기존 결제 타일과 독립된 일반 링크다.
- 연이의 새 진입 그림 1200x800 및 640x427 WebP, 제작 프롬프트/출처 기록 포함.
- 조리 과정은 번호, 캐릭터, 말풍선, 검색 가능한 조리 설명으로 구성한다. 로그인/결제 없이 전체를 읽는다.
- 결제 가격/이용권/월정석/단건 결제, 인증, API, DB, 사주 계산은 변경하지 않았다.

## 검증
- node --test __tests__/ui/recipes-public.test.mjs: 3/3 통과.
- node --check js/core/saju/reportDashboard.js: 통과.
- npx eslint --ext .jsx,.mjs app/recipes lib/lifestyle: 오류 0, 정적 사주 셸 hard-navigation 앵커 경고 4.
- 실제 Next 개발 서버에서 상세 20개 모두 HTTP 200 및 HTML 조리 설명/JSON-LD 확인.
- 360/390/430/1280px 허브와 상세: 가로 넘침/깨진 이미지 0. 독립 시각 검수도 중대 결함 없음.
- 별도 fixture에서 실제 reportDashboard renderer 두 번 호출: 진입 카드 1개, 클릭 후 /recipes/ 이동. 전체 실제 사주 입력 흐름의 증거는 아님.
- 브라우저 통합 검사에서는 허브/상세 검증 후 재사용한 페이지의 fixture 표시가 시간 초과했다. 깨끗한 별도 context의 entry 검사는 통과했다. 이 두 범위를 구분한다.
- 증거: C:/Users/user/.codex/visualizations/2026/10/11/01a12b74-17e4-7352-bc59-4440069b68f3/recipe-webtoon/verification.json 및 entry-verification.json, 동일 폴더 PNG.

## 전달 차단
- npm run check:fast: 기존 docs/CURRENT_DEV_BASELINE.md의 Last curated 2026-10-17, 허용 14일 초과로 중단. 문서 날짜만 조작하지 않았다.
- 기존 원격 main 5ac923923fe2e54b9a958c90f00f8971b8b2a8a6, CI 41391113434 실패: Build Pages and Worker / Verify hydrated H1 integrity. 이번 요리 변경 이전 실패다.
- https://github.com/rei1237/codedestiny/actions/runs/41391113434
- 다른 세션의 홈/카카오/i18n 변경을 보존했다. 현재 sitemap*.xml / public/sitemap*.xml / config/sitemap-lastmod.json은 현재 공유 체크아웃에서 생성되어 그 변경들도 반영한다. 해당 생성물은 독립 소스 커밋에 섞지 않고 로컬에 보존한다. 전달 전 확정된 통합 트리에서 sitemap:generate 및 verify:sitemap-drift 재실행과 별도 생성물 커밋이 필요하다.
- 원격 push와 운영 배포 미실행. 검색 노출/순위 상승은 검증하지 않았다.

## 로컬 복구 지점
- 소스/그림 커밋: 2b15b4a5805393ba2cfa11ef0e91f4854a3c7a61.
- 완료 시 확인된 체크아웃은 feat/world-cast-page다. 이 작업에서 새 브랜치/전환을 수행하지 않았다. main 통합으로 보고하지 않는다. 다른 세션의 체크아웃을 임의 전환하거나 병합하지 않았다.
- 마지막 verify:sitemap-drift는 1040 URL 일치로 통과했다. 마지막 재생성 시 sitemap.xml 쓰기는 UNKNOWN 오류가 있었지만 선행 생성물과 갱신 원장에 대해 읽기 전용 일치 검사가 통과했다. 생성물 최종 커밋은 여전히 보류한다.
- WebP 26개 포맷/크기 및 dashboard source/public mirror 일치 확인.

## 2026-11-02 배포 재개
- 사용자가 기존 CI/문서 문제 해결, main 통합, 실제 무료 공개 배포를 명시 승인했다.
- 최신 main 문서 Last curated 2026-11-01 확인. 이전 로컬 날짜 문제는 최신 main을 사용하여 해소된다.
- CI 제목 실패 수정 b8e04222e가 다른 작업에서 main에 먼저 반영되어 중복 수정은 제거하고 해당 main을 병합했다. 결제/광고 변경은 이번 작업에서 수정하지 않는다.
- 격리 작업 경로: C:/Users/user/Documents/Codex/2026-11-02/new-chat/recipes-release-20261102-160222. 공유 D:/Development/code-destiny 체크아웃과 미커밋 변경은 보존한다.
- 현재 트리의 문서 신선도 검사 통과. 신규 요리 21 URL 생성 후 전체 사이트맵 1058 URL 확인.
- 기존 빌드의 라우트 목록을 사용한 소스 수준 hydrated-H1 검사: 226 경로 통과. 최종 빌드 전체 검증은 GitHub CI에서 수행한다.
- 홈 읽을거리 정본 templates/home-funnel.html에 /recipes/ 직접 링크를 추가해 JavaScript 이전에도 모음/상세가 2홉 안에 발견되도록 했다. 생성된 index.html/공개 미러와 캐시 키를 함께 반영한다.
- 2026-11-02 사용자 배포 요청은 이 릴리스 1회에 대한 승인이다. 기존 CI 실패 해결 이후 main에 통합하며, 공식 production workflow만 사용하고 실결제/운영 DB 변경은 수행하지 않는다.
