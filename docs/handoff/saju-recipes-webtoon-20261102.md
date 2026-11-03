---
status: done
updated: 2026-11-02
next: 후속 구현 없음. 운영 공개와 검증 기록은 아래 링크를 확인한다. 추가 운영 승격은 별도 사용자 요청을 따른다.
---

# 사주 요리법 무료 웹툰 통합 — 운영 공개 완료

## 공개 결과
- https://code-destiny.com/recipes/ 에 기존 요리 20편을 무료 공개했다. 모음 페이지는 하나이며 상세 주소 20개는 모두 고유하다.
- 사주 분석 reportDashboard의 ‘재미있는 사주 콘텐츠’에 연이 2D WebP 진입 카드를 연결했다. 요리 모음과 상세는 로그인·결제 없이 읽는다.
- 조리 과정은 번호, 캐릭터, 말풍선과 검색 가능한 HTML 설명으로 구성했다. Recipe 구조화 데이터도 같은 레시피 데이터를 사용한다.
- 오행과 맛은 전통 문화상의 연결로 설명하며 건강 치료나 개운 효과, 실제 셰프 검수·조리 시험을 주장하지 않는다.

## main 통합 및 운영 릴리스
- 운영 커밋: `8bf1afbadbec4e590eb580adf1d5e519611b8067` — main에 통합된 커밋이다.
- 배포 직전 main에 다른 작업이 계속 추가되어, CI가 통과한 main 커밋을 `release/recipes-20261102-8bf1afbad` 태그로 고정했다. 후속 main 작업은 보존했다.
- 사용자 승인에 따라 공식 `Release Cloudflare Pages and Worker` 워크플로의 `mode=production`으로 배포했다. 로컬 wrangler나 우회 플래그는 사용하지 않았다.
- 운영 릴리스 성공: https://github.com/rei1237/codedestiny/actions/runs/41419713244
- 해당 커밋 CI required 성공: https://github.com/rei1237/codedestiny/actions/runs/41416704272
- 전체 회귀 CI 성공: https://github.com/rei1237/codedestiny/actions/runs/41414925875 — 이후 운영 커밋까지의 차이는 네오 UI 검사 스크립트의 이미지 디코딩 안정화뿐이며, 운영 커밋의 CI도 통과했다.
- 실제 `/version.json`과 `/api/version`을 읽어 Pages와 Worker 모두 위 운영 SHA임을 확인했다.

## 해결한 차단 원인
- 이전 main의 hydrated H1 실패는 upstream `b8e04222e` 수정을 재사용했다. 중복 수정은 남기지 않았다.
- 문서 신선도는 최신 main의 `Last curated: 2026-11-01` 상태를 확인해 통과했다. 날짜만 임의 갱신하지 않았다.
- 요리 제목 표시 폭을 줄이고, 새 홈 링크의 12개 언어 번역을 정본에 추가했다. 합쳐진 `/recipes` immersive 경로 중복 한 줄을 정리했다.
- 이 문서의 YAML 프론트매터와, 병합된 사주 성향 인수인계 문서의 누락된 `next` 한 줄을 보완했다. 당시 전체 266개 인수인계 문서가 규약 검사를 통과했다.
- 정본 홈 템플릿·공개 미러·사이트맵을 생성기로 동기화했다. 요리 모음 1개와 상세 20개가 실제 공개 사이트맵에 포함된다.

## 검증
- `npm run check:pre-push`: 커밋된 통합 트리 통과.
- `npm run verify:handoff-contract`: 통과.
- 요리 공개·해외 홈·심리검사 진입 관련 Node 검사 16개 통과.
- 전체 Jest 443개 스위트·7,246개 테스트 통과. 전체 회귀 및 빌드·SEO·정적 계약 검사는 위 공식 CI 결과를 기준으로 한다.
- `npm run verify:deployed-sha -- --sha=8bf1afbadbec4e590eb580adf1d5e519611b8067`: 운영 Pages·Worker 모두 일치.
- 실제 서비스 비로그인 GET: 모음 및 상세 21개 모두 HTTP 200, 무료 공개 문구·구조화 데이터 확인, noindex 없음.
- 실제 서비스 이미지: 요리 20개와 진입 이미지 1개 모두 WebP 인코딩, 1200×800 확인.
- 실제 서비스 390px·1280px 모음/상세: H1 한 개, 가로 넘침 0, 깨진 이미지 0. 웹툰 조리 장면과 화면 캡처 확인.
- 사주 진입은 실제 renderer의 독립 fixture 및 배포된 dashboard 스크립트와 직접 링크를 확인했다. 전체 사주 입력 과정을 재현한 운영 E2E 검사는 아니다.
- 증거: `C:/Users/user/Documents/Codex/2026-11-02/new-chat/release-evidence/`의 `ci-verification.json`, `live-verification.json`, `recipes-manifest.json`, `live-*.png`.

## 유지한 영역
- 이번 요리 작업은 결제 가격, 이용권·월정석·단건 결제 구조, 인증, API 계약, DB 스키마와 사주 계산을 바꾸지 않았다.
- 공유 `D:/Development/code-destiny` 체크아웃의 다른 세션 변경과 기존 SEO 작업 디렉터리를 보존했다. 작업은 별도 worktree에서 수행했다.
- 검색 노출·순위 상승은 검증하지 않았다. 운영 공개와 검색 성과를 구분한다.
