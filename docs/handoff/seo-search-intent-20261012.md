---
status: blocked
updated: 2026-10-12
next: 다른 작업의 main CI 복구 확인 후 검증된 SEO 커밋을 main에 통합하고 pre-push 및 push, CI 확인; 승인된 운영 반영 뒤 D0 기록
---

# 꿀꿀 사주 검색 의도·사이트맵 실무 인수인계

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\seo-evidence-20261012-20261012-015123`
- 브랜치: `wt/seo-evidence-20261012-20261012-015123` (동시 세션 때문에 공식 safe-worktree 스크립트로 생성).
- 검증된 구현 커밋: `1b71a426d3844888239e4e4131b969b1815dea1c`.
- main 통합·push·PR·운영 승격: 미실행. PR은 현재 규칙상 만들지 않는다.
- 최신 확인 main CI: `7768578e9456f1ce0fe61f86215e97873e72f22f`, https://github.com/rei1237/codedestiny/actions/runs/38159011395 — completed/failure.
- 실패 근거: `docs/handoff/premium-repricing-20261011.md`의 `status: in_progress`가 허용값(active/blocked/done)이 아니어서 `verify:handoff-contract` 실패. 다른 세션 소유 문서/미커밋 변경은 건드리지 않았다. 초기에는96c567e의자미두수검사 실패였으나 최신 실패는 위 문서다. 기존 실패 위 push 금지 규칙으로 전달 보류.

## 완료한 변경

1. `/vedic/`의 중복 `sections` 속성 때문에 사라진 베다/서양 비교·각도예시 복원. 공통 intro 날짜가 최신 수정일을 덮지 않게 수정.
2. 숙요/베다 비교의 시간 미상·계산 차이·예측 정확도에 대한 오해 수정. 제목/CTR 실험 유지.
3. 사이트맵 인덱스를 urlset으로 잘못 읽던 health 검사 수정. 대표301루트와 랜딩 분리.
4. Article JSON-LD 이미지에 페이지용 trailing slash를 붙여404가 되던 결함 수정. 파일명·외부호스트·쿼리 보존, 페이지 canonical은 유지.
5. 검색 원자료·검색의도지도·원인 가설·제출 증거를 `docs/seo/2026-10-12-search-intent-evidence.md`, `docs/seo/evidence/2026-10-12/`, `SEO_STATE.json.searchIntent20261012`에 저장.

## 검증

- check:fast 계획 critical, 실행 종료0. paid mock88/88, Node3172/3172, Jest385 suites·5898/5898, lint/typecheck/Worker dry-run 등 통과.
- 추가 Article 수정 후 targeted11/11·typecheck 재통과. 개발 mock에서4경로 HTML과 추가기사 image 확인,390/1280 화면 점검.
- sitemap:generate/sync:public/verify:sitemap-drift 성공.955URL추가0제거0,lastmod값변경0. 공통 의존성 때문에720signature만 변경. 생성 원장을 손으로 고치지 말 것.
- seo:check 운영19표본·955URL·0문제. 전체955HTTP 전수검사나 리치결과 적격성 검증은 아니다.
- check:pre-push clean 커밋 트리 통과.
- 별도 `verify:handoff-contract`는 로컬에서도 기존 `premium-repricing-20261011.md`의 같은 상태값 때문에 실패했다. 새 SEO 인수인계는 허용된 `blocked`를 사용한다. 이 실패를 전체 검사 통과로 숨기지 않는다.

## 실제 외부 작업

- Google domain 속성·Naver·Bing의 기존 로그인 확인. 재로그인 요청하지 말 것(세션이 실제 만료됐을 때만 사용자 조작 요청).
- Naver `sitemap-index.xml` 신규 접수10/12 01:59:45KST. 처리상태는 아직 미확인.
- Google 기존 sitemap-index 성공955, Bing 기존 sitemap.xml Success955·오류0·경고0. 정상 파일 삭제/재등록하지 않음.
- Naver `/ggulggul/`02:03:06·`/kkul-kkul-unse/`02:04:01 수집 요청 접수. Google 같은2개 갱신 요청 접수모달 확인.
- Google 위2개와`/vedic/`의 기존 색인·canonical 일치 확인. 새 코드 공개 전 수집 완료로 간주하지 말 것.
- Bing AI203인용은 Microsoft Copilots/Partners 3개월 표본 기준선. 이번 변경 성과가 아니다.

## 다음 행동

1. 현재 main git 상태와 최신 CI를 **한 번** 확인한다. 실패가 남으면 해당 소유 작업에서 먼저 복구한다. 무관한 가격/서비스 변경을 섞지 않는다.
2. CI가 정상일 때 이 worktree의 커밋들을 현재 main에 직접 통합한다. sitemap 원장 충돌은 source 통합 후 generator로 재생성한다. 다른 세션의 미커밋 파일을 덮어쓰거나 reset/stash하지 않는다.
3. 통합 범위 targeted 검사·커밋된 트리 check:pre-push 후 `git push origin main`. 마지막에 CI1회 확인. 반복폴링/정례staging확인 금지.
4. 운영 승격은 별도 프로젝트 승인 경계다. 승인/공개 확인 후 Pages/Worker SHA 및 변경된 Vedic 본문·Article image 실제HTML을 확인하고 D0를 기록한다. 아직 D0=null이다.
5. 새 수정의 공개 확인 뒤 필요한 핵심URL만 수집 요청한다. 이미 접수한 브랜드 요청과 정상 사이트맵을 무한 재제출하지 않는다. Naver 처리와 새 문구색인을 따로 확인한다.
6. D+14/D+28의 완료된 동일요일 기간 비교. 기존 예약을 재사용하고 중복 예약하지 않는다. 베다서양/인도점성술은 실제Naver 클릭 근거가 있으나 낮은경쟁이 확정된 것은 아니다.
7. 다른 오행요리 worktree·월요일9시 기존예약을 보존한다. 배포 완료 뒤 이문서 status:done, 자기node_modules정션부터 해제하고 자기worktree만 배수한다.

미완료: 전체 Naver 진단URL 재검증, 엔진별 시장검색량/경쟁도, 크롤러별CDN로그, 실험실성능, 고정질의AI응답감사, 배포후성과. 결제/인증/API/DB/개인정보/noindex정책은 유지했다.
