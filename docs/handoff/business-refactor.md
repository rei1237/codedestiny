---
status: active
updated: 2026-09-21
next: "main CI 확인 후 운영 승격·실환경 검증과 남은 P1 확장을 이어간다"
---
# 사업 리팩토링 인수인계

정본: [사업 마스터](../business-refactor.md), [계측](../analytics-kpi.md).

## 제약과 승인
기존 구매권·가격·결제 검증·계산·URL 보존. 무료 세 장은 no-LLM.
실 PG·유료 LLM·운영 DB 쓰기·고객 메시지 발송 승인 없음. 운영 승격 별도.
다른 세션의 marketing 변경 보존. DB 마이그레이션 없음. 롤백은 이 작업 커밋만 역순 revert.

## 완료한 변경
- 9cfe1a8db: 승인/완료 관찰/열람 분리, 초기 분석 로드 전 이벤트 보완. 기존 이벤트 이름 유지하며 새 열람 의미 분리.
- 2d5bf280f: /today/ 연이의 무료 세 장, MindScan CardBack만 재사용, 정적 22카드×3 해석, KST/복원/공유/완결 후 단일 상담 링크.
- 3a12b5a3a: 홈 대표 구매/무료 행동과 registry 가격, 연애 비책 현재 이미지, 경력·대통령 원문 링크, 사전/미러/사이트맵.
- 주요 파일: app/today/DailyTarot.tsx, lib/tarot/daily-three.mjs, js/core/analytics.js, lib/analytics.ts, app/yeongnyangi/_components/Consultation.tsx, templates/home-funnel.html, lib/brand/prediction-records.json.

## 검증
- check:fast exit0, paid suite88, Jest288 suites/4039 tests, lint/typecheck/Worker build 통과.
- 일일/분석10 tests 통과. 대표 영냥이 상품·조회503·생성실패·중단·환불 mock5 cases 통과. 실PG/LLM/운영DB writes0.
- Chrome 로컬390px 선택/Space키/순차 공개/복원/공유수신/이미지·overflow 확인. today-hub mock API 미지원 오류 중에도 완료.
- 새 출처 표시 이후 ESLint, home-builder --check, sitemap drift 통과. 마지막 CI로 최종 커밋 판정 예정.
- 카카오 채널 _GgxaGX 소개는 사용자 지시로 원래 경력·적중 문구 복원, reload 값 확인. 메시지·환영 활성화 없음.
- 운영 배포 증거 아직 없음. 조사 당시 Pages/Worker f0ffba34e168b27879409ae1ceaddca7e56cd19e. 로컬 수정/CI를 배포 완료라고 하지 않는다.

## 중요한 사용자 정정
“두 대통령 적중”은 반드시 유지. 9월20일 대화 01a0be27-944f-7ef0-bfaf-e2acf06b4053에서 사용자가 제공했던 원문을 회수했다. 사용자에게 다시 링크를 요구하지 않는다.
- 윤석열: https://blog.naver.com/neosaju/222876455500 (2022-09-16), https://blog.naver.com/neosaju/223444062729 (2024-05-12)
- 이재명: https://blog.naver.com/neosaju/223459696339 (2024-05-27)
- 223442610559는 휘성 글이므로 대통령 사례 아님.
Chrome에서 게시일/본문 확인. 원문 수정이력·전 예측 적중률을 독립 검증했다고 기록하지 않는다. 관련 SEO 정본에 최신 출처 발견을 반영했다.

## 다음 순서
1. main 전달 SHA fe1d0235c0c3ddf9f47cd5c94178694e1799541c의 CI 링크 아래 확인. 운영 승격 승인과 live PG/LLM/실기기 검증은 별도. main 합치기와 push를 반복하지 않는다.
2. 연애 비책 실제 사주 결과→상세→결제 전 이미지/가격, 기존 MindScan 선택·복귀·재열람 브라우저 검사 공백 보강. 일일 API 성공/저장소차단/스크린리더·OG 실기기 확인.
3. 전 체계 상담 진입 정리·상품 전수표/실원가·기존 이용권 잔여권리, 카카오 메뉴/지원 동선 및 7일/30일 실제 지표. 메시지 발송은 승인 전 금지.

## 반복하지 않을 조사
GA4/DB 현재차이·테스트 미분류 수치는 마스터 참조. 방문자325는 적격 전환 분모 아님. 영냥이 홈 진입은 원래 존재했다. 연애 비책은 CSS 배경만 오래된 상태였다. 마인드스캔 전체를 무료 경로에 삽입하지 않는다.

## 작업 환경
원 작업 main: D:/Development/code-destiny. 동시작업 예외 worktree: D:/Development/codedestiny-worktrees/business-retention-20260921-131612. 로컬 mock dev 포트34976, API34977. node_modules는 main을 향한 junction이며 디렉터리 재귀삭제 금지. 인수인계 후 제거 시 junction 링크만 먼저 해제.

## 재개 문장
docs/handoff/business-refactor.md와 관련 마스터 문서를 읽고, 완료된 작업을 반복하지 말고 다음 미완료 우선순위부터 구현·검증·배포를 이어가라.

## main 전달 기록
fe1d0235c0c3ddf9f47cd5c94178694e1799541c main push 완료. 동시 main 변경과의 충돌은 sitemap-lastmod 생성 원장만 있었고 최신 main 기준 재생성 후 검증했다.
- [코드 CI](https://github.com/rei1237/codedestiny/actions/runs/35562505911)
- [결제 가드](https://github.com/rei1237/codedestiny/actions/runs/35562505885)
링크 생성 확인 시 실행 중이었으며 최종 상태는 링크의 해당 SHA로 확인한다. 자동 스테이징과 프로덕션 승격은 별개다.

## CI에서 발견해 수정한 회귀
fe1d0235c 빌드는 /sukuyo/calendar 고아 URL 검사에서 실패. TodayHubClient의 한국어 전문 도구 링크를 유료 추천과 함께 숨긴 것이 원인. 무료 전문 도구 3개 링크를 복원하고 FusionCrossSell만 한국어에서 숨기도록 수정했다. 따라서 이전 실패 CI를 최종 통과로 인용하지 않는다.

최신 코드 전달: 8760d5258212d7e725166fd63e8fe75cfa7ce38d. [회귀 수정 후 CI](https://github.com/rei1237/codedestiny/actions/runs/35562836889). 사주아이/청월당 공식 주체·제한된 모바일 DOM 관찰을 마스터에 추가했다.
