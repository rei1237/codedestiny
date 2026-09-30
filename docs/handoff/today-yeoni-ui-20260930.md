---
status: active
updated: 2026-09-30
next: 사주 대운 달력 검증의 AMBIGUOUS_BIRTH_TIME 실패를 해당 엔진 작업에서 해결한 뒤 main CI를 재확인한다.
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
- 스테이징 배포 완료/운영 반영은 확인하지 않았다. CI 성공이라고 보고하지 않는다.

## 다음 작업
해당 사주 엔진 작업 범위에서 오류를 조사한다. 이 UI를 다시 구현하거나 카드 추첨 규칙을 바꾸지 않는다. 다른 세션의 marketing·환경·검수 스크립트 미커밋 변경을 보존한다.

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny'
Get-Content -LiteralPath 'D:\Development\code-destiny\docs\handoff\today-yeoni-ui-20260930.md'
git status --short
git show --no-patch 8ea47e36565a4aaf23a50e36490c5ae6d98866e7
npm run verify:daeun-korean-calendar
```
