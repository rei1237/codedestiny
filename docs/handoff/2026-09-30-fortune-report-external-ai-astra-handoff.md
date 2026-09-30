---
status: implemented-awaiting-main-ci
updated: 2026-09-30
next: push the integrated main commit and verify its CI required check; do not run production or paid providers
---

# 운세 설명과 외부 AI 제작 프롬프트 전환

## 확정한 제품 방향
- 서비스 안에서 보고서 PNG를 생성하지 않는다. 운세 특징 → 저장된 근거와 한계 → 상담 발췌 → 외부 AI용 프롬프트 순서로 읽는다.
- 프롬프트는 소유자가 직접 확인·수정·복사한다. 외부 AI 자동 전송/API 호출은 없다. 글자·차트 값·한자·기간을 원문과 대조하고 이미지 기능이 없으면 편집 가능한 HTML/SVG를 요청한다.
- 영냥이는 흰 고양이와 남보라/골드, 꿀꿀 운세는 꽃돼지와 로즈/크림으로 분리한다.
- 기존 유료 완료 결과에서만 표시한다. 이용권·월정석·단건 결제, 가격, 인증, API 응답, DB 스키마는 변경하지 않는다.
- 공개 링크는 별도이며 기존 동의·만료·해제·소유권·원본 차트 변경 검사를 유지한다. 개인용 프롬프트나 상담문을 공개 데이터에 넣지 않는다.

## 구현 위치
- 영냥이 여섯 운세: `app/yeongnyangi/_components/SummaryReport.tsx`.
- 공통 React 안내와 프롬프트 편집: `components/fortune/ExternalImageGuide.tsx`, `PaidResultImageGuide.tsx`.
- 12개 로케일의 운세별 설명과 프롬프트: `js/core/fortune-report-content.mjs`.
- 꿀꿀 레거시 완료 결과: `js/core/paid-editorial-report.mjs`, `js/saju-engine.js`.
- 꿀꿀 독립 결과: 점성술 결과, 베다점 본화면/결과, 자미두수 본화면의 기존 유료 결과 경로.
- 정상 구조화 상담의 짧은 문장·날짜·수치 보존: `lib/fortune/report-passages.ts`.
- 저장된 차트가 없거나 정정 대상이면 해당 근거를 생략하고 사유를 표시한다. 다른 운세 차트나 현재 입력 화면의 전역 명식으로 대체하지 않는다.
- 폐기한 이미지 렌더러와 전용 PNG 검증기를 제거했다. 정적 public 미러는 공식 동기화기로 생성한다.

## 검증 기록
- `node --test __tests__/ui/yeongnyangi-summary-report.test.mjs __tests__/ui/yeongnyangi-report-share.test.mjs`: 14/14 통과.
- `npm run typecheck`: 통과.
- `node scripts/verify-saju-summary-report.mjs <출력 경로>`: 6개 운세 × 12개 언어 × 4개 너비 = 288건 통과. 프롬프트 편집·복사, 공개 링크 동의·해제, 미완료 상태 차단 포함.
- `node scripts/verify-paid-editorial-report.mjs <출력 경로>`: 360/390/430/1280px 통과, 이전 결과 제거 및 유료/완료 mock 경계 확인.
- 모든 브라우저 요청을 mock으로 가로채며 외부 요청 0건. 실제 구매 결과와 일치한다는 증거는 아니다.
- 독립 화면 검토의 두 P2(계산 한계 누락, 정상 JSON 짧은 본문 누락)는 수정 후 해결 판정. 디자인 검출기 primary 0; 두 폰트 크기 권고도 기존 크기로 조정했다.
- 최초 `check:fast` 실패 원인: Windows 줄바꿈으로 인한 정적 검사, 삭제 파일의 Git 추적 상태, Node 테스트 위치, 구 기준의 Family 환급 날짜. 앞의 세 항목을 수정했고 마지막 항목은 최신 main에 이미 해결되어 main 단독 9개 환급 테스트가 통과했다.
- 수정 후 PortOne/사주 해금/상세 팝업/해외결제 안내 정적 검사 모두 통과. 최신 main 통합 뒤 공식 check:fast 및 CI를 재확인한다.

## 현재 기준과 남은 증거
- 원래 재개 커밋: `1b17e5f2f84411cd2bc1cd190b08ba13cb5c8827`.
- 최신 main 위의 구현 커밋: `2613d735e` (`feat: replace fortune PNG export with external AI guide`).
- 작업 디렉터리: `C:\Users\user\.codex\worktrees\fortune-summary-report\code-destiny`.
- 공유 main의 다른 세션 변경은 보존한다. 브랜치/PR을 새로 만들지 않는다.
- 실제 구매 결과·실기기·카카오톡·운영 공유 링크·외부 AI 생성 품질은 미검증. 실결제/유료 LLM/운영 DB 작업은 실행하지 않았다.
- 화면 캡처: `C:\Users\user\.codex\visualizations\2026\09\30\01a0efff-5e39-7872-9168-5984e5319986\report-guide`.
- 로컬 디자인 기준: `docs/design/fortune-result-guide.md`.

## 재개 명령
```powershell
Set-Location 'C:\Users\user\.codex\worktrees\fortune-summary-report\code-destiny'
Get-Content -LiteralPath 'C:\Users\user\.codex\worktrees\fortune-summary-report\code-destiny\docs\handoff\2026-09-30-fortune-report-external-ai-astra-handoff.md'
git status --short
git show --stat 2613d735e
Write-Host '최신 main 통합 및 push 여부를 확인하고 정확한 push SHA의 CI required 결과부터 확인한다. 운영 배포와 과금 호출은 하지 않는다.'
```

에셋 출처: 새 영냥이 PNG는 이전 세션에서 기존 `hero.webp`를 참조해 image_gen으로 만든 투명 흰 고양이이다. 새 생성 호출은 하지 않았다. 꽃돼지는 기존 `yeoni-moonstone-reward-v1.png`를 그대로 사용한다.
