---
status: in-progress
updated: 2026-11-09
next: 최종 mock 검증과 HTTP 성능 측정 결과 확인 후 전달 검사·main push·정리
---

## 첫 행동
이 문서와 실제 로그를 읽고 같은 작업을 이어간다. 승인 재확인 금지. 실제 LLM·PG·운영 DB 호출 없이 mock만 사용한다.

## 지금 상태
- 워크트리: D:\Development\codedestiny-worktrees\saju-mobile-reading-20261109-094908
- 브랜치: wt/saju-mobile-reading-20261109-094908, base fbc3a41df78d54b6570859aca792e98aa39a080f
- 원본 D:\Development\code-destiny 및 실제 main은 타 세션 변경이 있으므로 건드리지 않는다.
- 구현 체크포인트는 이 문서와 함께 커밋한다. 최종 SHA는 git log로 확인한다.

## 승인 상태
사용자 2026-11-09: “PLEASE IMPLEMENT THIS PLAN”. 모바일 사주 결과를 프로필·작은 명식·접는 상세로 개편, 주아체/Pretendard 유지, 제휴 추천 결과 호출 제거, SNULIFE 표시는 이용 가능한 풀이로 변경, 선택 프로필 즉시 진입, 폰트/LCP 최적화, main 전달 승인. 운영 승격 제외.

## 설계
compact-reading.mjs는 기존 카드 노드를 그대로 details로 이동한다. 기존 ID·리스너·결제 게이트는 유지하며 유료 원문을 복사하지 않는다. 명식·기질/흐름/더 살펴보기 그룹이 기본 닫힘. 무료 개요는 G_PILLARS·선택 프로필만 읽는다. 키에 프로필·명식·시간 미상을 포함, 화자 전환은 펼침 보존. 해시 진입은 부모 details를 먼저 연다. 작은 프로필 변경은 기존 dpOpenList 사용. 단독 ESM을 정적 셸에 넣어 VM 단위 검사의 동적 import 부작용을 피했다.
프로필 엔진 진입은 200ms 지연/폴링/입력 영역 스크롤을 없애고 기존 모듈 준비 promise 후 기존 계산 실행. 대기 중 계정 scope 변경은 취소. 결제/권한/계산 정책 변경 없음.
이용권 카드의 별도 명조/Noto를 공통 토큰으로 연결하고 아래쪽 카드에 content-visibility 적용. 공식 WOFF2 자산은 그대로 유지한다.

## 작업 규칙과 함정
- sync:public은 자동 파생 파일을 많이 바꾼다. 직접 미러를 고치지 않는다.
- destiny-profile 변경은 독립 HTML 캐시 핀도 바꿔야 한다: node scripts/restamp-paid-runtime-pins.mjs. 첫 77 경계 검사 중 이 문제 1건을 수정했고 재검사 통과, 나머지76 통과.
- 첫 전체 Node 검사: 4,784개 중4,777통과/7실패. fortune:build-data 누락1, 이전 추천 재마운트 검사2, VM dynamic import1, 추천 호출 존재 가정1, 새 CSS 캐시 핀2였다. 추천 호출 제거 요구에 맞게 검사 갱신, ESM 별도 로드, CSS ?v 추가, 공식 데이터 생성 후 관련 기능44개·정적15개 모두 통과했다. 추천 테스트가 닫지 못한 JSDOM 때문에 프로세스가 남아 소유 PID45556만 종료했다. 다른 프로세스는 건드리지 않았다.
- 전체 Node를 재실행 성공했다고 보고하지 않는다. 공식 계획 후반을 .tmp/continue-after-tests.mjs로 이어 실행 중이다.
- 기존 성능 도구는 before CSS/JS만 route.fulfill해 조건이 불공정했다. 그 결과는 최종 개선 수치로 사용 금지. 수정한 scripts/measure-typography-home.mjs는 before/after 모두 같은 로컬 HTTP 서버로 전달하며 이 서버는 끝나면 닫는다. 5회씩 매우 느린 네트워크로 실행 중이라 오래 걸린다.

## 검증 기록과 실행 상태
- 실제 mock 계산 브라우저5폭360/390/430/768/1440 통과. build-cache/saju-mobile/result-*.png, layout.json. 390px 접힘 높이 약920px/전체 약15,000px. 최초 가짜 게스트로는 로그인 화면이 떠 실패했으므로 로그인 mock fixture로 고쳤다.
- .tmp/check-fast.log: 첫 공식 검사77개, 캐시핀1건 보완. .tmp/remaining-checks.log: lint/typecheck 통과, 전체 Node4784 결과.
- .tmp/recovery-functional.log:44개 통과. .tmp/recovery-static.log:15개 통과. .tmp/compact-test.log: 노드 보존·해시·상태·시간미상·언어전환.
- .tmp/final-guards.log: 공식 나머지 검사 및 Jest 실행 중 (exec session84523).
- .tmp/performance-http.log: 동일 HTTP 5회씩 성능 측정 중 (exec53626, 소유 nodePID20128, 임시 포트61654).
- mock dev 서버 exec92123, 포트4180/4181. 끝나면 Ctrl-C로 자기 자식만 종료한다.
- 브라우저 최신 확인 exec1314 완료, build-cache/saju-mobile/layout.json. 마지막 locale/제목 수정 후 작은 단위 재검사는 했고, 최종 시각 확인 필요.
- detector 한 번 실행(.tmp/design-scan.json):0 anti-patterns, 크기 advisory. 잘못된 --format 인자로 json 경로 경고를 냈으나 검사 자체 수행. 다시 스캔하지 않는다.
- 시각 리뷰 에이전트 compact_visual_review 완료: 캡처 잘림/겹침 없음. 제목 .sec-title 누락, 시간 미상 키, 언어전환 라벨 3건을 수정했다.

## 단계
- [x] 결과 축약·폰트 역할·추천 제거·프로필 진입 개선
- [x] mock 실제 계산5폭 및 관련 회귀, 독립 캐시 핀 복구
- [ ] 동일 HTTP 성능 5회 중앙값 확인, 필요 시 측정 도구 문제만 수정
- [ ] 공식 후반 검사 완료, 최종 미러/sitemap/관련 검사
- [ ] 최신 main 합치기·pre-push·main fast-forward push
- [ ] 산출물 안정 경로 복사·handoff done·자기 워크트리 정리·CI1회 확인
