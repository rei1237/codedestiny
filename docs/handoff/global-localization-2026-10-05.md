---
status: active
updated: 2026-10-05
next: main CI 결과를 확인하고 한국어 전용 관계·타로·건강·symbolic 상담의 입력과 검증기를 현지화한다.
---
# 해외 현지화 및 영냥이 진입 개선
요청: 해외 PayPal 안내, 전체 유료 콘텐츠 로케일 현지화, 미국 등 해외 시장 용어/마케팅, 대통령 분석 기록 강조, 영냥이 메인 강조 및 고급 전환.
작업 위치: D:/Development/code-destiny/.codex-worktrees/global-localization-20261005-225523
기준: 15f2f09e8041270affeb4782ad3e0d40ee4a0653
다른 세션 main index.html/styles/marketing 변경 보존. 새 PR 없음.
확인: 공통 AI 및 영냥이 기본 상담 12개 locale 지원. 일부 koOnly/symbolic 상담은 전용 검증기 때문에 한국어 제한. 결과 차트 일부 7언어 영어 폴백. PayPal USD 경로 이미 존재, 서버 설정 전 비활성.
방향: 기존 결제/가격/권리 유지; PayPal 안내 공통화; 홈 영냥이 우선 배치와 다국어 전환; 현지 문체 지침 및 결과 UI 보완. 대통령 기록은 날짜/원문/후속 사건 비교, 적중 보장 아님. Naver 원문 웹 도구 접근 실패, 직접 인용하지 않음.
시장: Pew 2025 미국 성인 30% 연간 점술 이용. 해외 희소성 단정 불가.
검증: 아직 미실행. 실 LLM/결제/DB/배포 없음.
실패: powershell 실행정책 차단 → NoProfile/Bypass. fetch sandbox 차단 → 승인된 격리 스크립트 실행으로 생성 완료. python 없음 → node 사용.

## 구현 및 검증 진행
- 12개 로케일의 홈/전환/PayPal 안내 8키 ×12 저작. 공통 AI 현지 문체 및 결과 차트 231문구 추가.
- 홈 생성 원본은 templates/home-funnel.html임을 확인; index.html만 수정하면 sync에서 사라져 템플릿을 수정했다.
- JA360·390·430 첫 화면에서 잘림 발견: 제목 줄바꿈과 .cdh-more의 min-content를 수정. 마지막 JA360 실화면 정상, EN/KO 및 데스크톱 정상. reduced-motion 클릭 overlay=0 확인.
- global-localization node 4/4, ai-locale+checkout-entry Jest 78/78, typecheck exit0, checkout-pass-card PASS, AI locale 14 invariants PASS, payment-choice parity PASS.
- impeccable detect: 0 anti-patterns / 기존 스타일 포함 79 advisory.
- check:fast 실행 중 npm test 실패, 전체 suite 원인 출력 대기. 별도 verify-home-funnel는 sandbox Chromium spawn EPERM(실화면 확인은 승인된 visual-checker가 별도로 완료).
- public mirror fresh는 미커밋 상태 판정불가; 커밋 후 확인 필요.
- 공유 main에 다른 세션 index/styles staged+unstaged가 남아 있음. 합칠 때 보존.
- 전체 한국어 전용 유료 유형의 12언어 개방은 미완료. 상세 범위 docs/global-localization-audit-2026-10-05.md.

## 통합 검증
- 초기 check:fast paid suite 87/88. Jest 342 suites / 5,115 tests 통과. Node 2,618 중 2개 실패(정치 기록 허용목록, 사이트맵 서명). 전체 suite 실행 1,213초.
- 승인된 원문 기록 소개의 정확한 허용 개수(템플릿3/저작사전2)만 등록. app/layout 결제 캐시 핀 변경에 따른 sitemap ledger 재생성. 관련 7개 재실행 전부 통과. 전체 묶음 재실행은 하지 않고 main CI를 최종 게이트로 사용.
- 최초 커밋 29be3801ebc05e5734f09be4cfd637f937155c6f. origin/main dc0160fa5를 5f1b43732097bd9fbab2b1e2c1b6daaeecad1bd3에 충돌 없이 병합. 생성 HTML 캐시 키를 재생성함.
- public mirror 최초 커밋에서 PASS. 병합 후 재생성 필요 발견; sandbox의 index.lock 권한 때문에 검사 자체 복원은 실패했으며 재생성 결과를 다음 커밋에 포함한다.
- 최종 JA360 카드298px/본문 넘침없음. 스크린샷: C:/Users/user/.codex/visualizations/2026/10/05/01a10c55-5ccf-7a23-94b0-464fa841c850/global-localization/ja-360.png.

최종 보완: lint 대상 0 errors/376 기존 warning, sitemap --check PASS, merged public mirror PASS. Git 공유 main 기존 index.lock으로 로컬 병합 불가. origin/main 추가 변경은 격리 worktree에서 병합, 생성 ledger 충돌만 최신 원격 정본에서 재생성했다. push는 강제 옵션 없이 main으로만 시도한다.
