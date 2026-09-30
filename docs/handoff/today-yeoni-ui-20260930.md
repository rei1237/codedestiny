---
status: active
updated: 2026-09-30
next: UI 외부 CI 차단인 verify:natal-day-pillar-axis 야자시 정책 비교 실패를 별도 조사하고 CI를 다시 확인한다.
---
# 연이 일일 운세 UI 전달 상태

작업 디렉터리: D:\Development\code-destiny
문서: D:\Development\code-destiny\docs\handoff\today-yeoni-ui-20260930.md
UI 커밋: 9a767faa1 (feat(today): refine Yeoni daily fortune artwork and tarot)
main 통합·push 완료: 8ea47e36565a4aaf23a50e36490c5ae6d98866e7
브랜치: main. PR 없음. 사용한 격리 워크트리는 main 병합 후 보관 완료.

## 구현
- 사주·숙요점·베다점은 기존 연이 일러스트 재사용, 수비학·무료 타로는 새 이미지 생성 및 WebP 최적화.
- 로즈/버건디 화면, 명조 제목, 네 가지 이미지 탭, 모바일 세로/데스크톱 나란한 결과 패널.
- 타로 앞면은 찻집 tarotCardImageMap의 arcana/number 정본 매핑, 뒷면은 찻집 앨범 공용 에셋. 22장 중 세 장 선택·날짜 경계·저장·공유 유지.
- 변경 파일: app/today/TodayHubClient.tsx, today-hub.module.css, DailyTarot.tsx, daily-tarot.module.css, page.js; __tests__/ui/daily-three.test.mjs; config/sitemap-lastmod.json; .impeccable/surfaces/today-yeoni.md; public/images/today/ 이미지 2개 및 provenance 2개.
- 결제/인증/API/DB/계산 엔진 변경 없음. 실결제·실LLM·운영DB 쓰기·운영 승격 없음.

## 검증
- 관련 node 회귀 7/7, 22장 찻집 이미지 매핑, typecheck, 변경 파일 lint, sitemap drift(1300 URL), impeccable 정적 검사 통과.
- check:fast 마지막 Jest에서 드라이브 간 의존성 경로로 7스위트 실행 실패(나머지 310스위트/4544테스트 통과). 동일 7스위트를 main의 설치 환경에서 재실행하여 55/55 통과.
- 로컬 mock 브라우저: 네 종류 탭 전환, 키보드 이동, 상세 로딩, 타로 3장 선택·공개, 이미지 로딩, 새로고침 후 카드 복원. 360/390/430 모바일 및 데스크톱 확인. 360/430 가로 넘침 없음. 실제 기기 미검증.
- 독립 finish review: ship, 중대한 지적 없음. surface 문서 검토: 구현과 일치.
- CI https://github.com/rei1237/codedestiny/actions/runs/36656683484 : Build Pages and Worker, Typecheck and lint, Critical checks 통과. Static guards의 verify:daeun-korean-calendar 실패로 CI required 실패.
- 오류: scripts/verify-daeun-korean-calendar.mjs:334 -> worker/lib/destiny-bias-engine.js -> lib/korean-calendar/natal.js 의 AMBIGUOUS_BIRTH_TIME. 이 세 파일은 UI 통합 전후(021d6e43c..8ea47e365) diff가 없다. UI 작업 범위 밖이라 변경하지 않았다.
- 후속: 다른 세션이 원격 main에 올린 533e88e1f가 기존 DST 전환 샘플 처리 누락을 수정했다. 해당 변경을 통합하고 npm run verify:daeun-korean-calendar 재실행 통과(16건)를 확인했다. 최초 실패 CI를 성공으로 바꾸어 적지 않으며 최종 통합 CI 결과를 별도로 확인한다.
- 최종 확인 SHA 9be4899733f36c249472480fb24727a43bf34f8e (main push 완료)의 CI https://github.com/rei1237/codedestiny/actions/runs/36657587010 는 Static guards의 verify:natal-day-pillar-axis 실패로 CI required 실패. 18개 검사 중 정책 3종과 코어 야자시 정책의 대응 검사 1개가 실패했다. 예: 1940-02-26 23시 LATE_ZI_NEXT_DAY 일주 己亥 vs 코어 庚子. 검증 스크립트와 lib/korean-calendar/natal.js는 021d6e43c..9be489973 diff가 없다. 해당 엔진/검사 변경은 UI 범위 밖이라 수정하지 않았다. 이 docs-only CI에서는 빌드/타입/critical lane이 skipped였으며 앞선 UI 통합 CI의 통과와 구분한다.
- 스테이징 배포 완료/운영 반영은 확인하지 않았다.

## 다음 작업
verify:natal-day-pillar-axis의 기존 야자시 비교 실패를 별도 조사한다. 확인한 최종 UI 전달 CI는 실패이며 전체 전달 완료로 간주하지 않는다. 이 UI를 다시 구현하거나 카드 추첨 규칙을 바꾸지 않는다. 다른 세션의 marketing·환경·검수 스크립트 미커밋 변경을 보존한다.

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny'
Get-Content -LiteralPath 'D:\Development\code-destiny\docs\handoff\today-yeoni-ui-20260930.md'
git status --short
git show --no-patch 9be4899733f36c249472480fb24727a43bf34f8e
gh run view 36657587010 --log-failed
npm run verify:natal-day-pillar-axis
```
