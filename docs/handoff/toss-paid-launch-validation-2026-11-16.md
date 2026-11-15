---
status: in-progress
updated: 2026-11-16
next: 기존 모의 AIT 76개 검증 행렬을 이어서 확인하고 실패를 제품/테스트로 구분해 수정·검증·커밋한다. root가 Linux AIT와 콘솔 전달을 담당한다.
---

## 첫 행동

handoff 스킬·CLAUDE.md를 읽고 이 작업 워크트리에서 상태를 확인한다. 이미 실행 중인 행렬을 중복 시작하지 않는다. 아래 프로세스가 종료됐으면 matrix.json의 성공 항목을 보존한 채 같은 러너를 재실행한다.

## 지금 상태

- 워크트리 `D:/Development/codedestiny-worktrees/toss-launch-footer-20261116-030309`, 브랜치 `wt/toss-launch-footer-20261116-030309`, 시작 SHA3e17ab8b8(이전 CI43742498744 SUCCESS).
- root가 하단 구매기록/복구/설정3개를 달빛 예화 버튼으로 구현했다. 수정은 UnifiedHome.tsx·characters.css, 기존 라벨 aria-label과 라우팅 유지. 360/390/430 시각검수·실제3개 CTA 경로 PASS. 원화·상품·인증/API/DB 변경 없음.
- UI check:fast 프로세스84618(로그 `.tmp-footer-check.log`)가 실행 중이었다. root가 이 검사를 확인하고 UI 커밋/병합한다. 후속은 root가 전달한 UI SHA를 확인해 이 문서 갱신. root가 handoff를 넘긴 뒤에만 테스트 파일 수정 시작.
- 모의 Vite build + `apps/toss/private-simulation`에서 `../node_modules/.bin/ait.cmd build` PASS. Windows 모의 archive `apps/toss/private-simulation/ai-saju-studio.ait`, deployment01a1e063-e5d6-78a1-af96-0ba5954e9bf2. 원본과 동일 파일 사본은 Downloads/CodeDestiny/20261116-launch-validation/mock-only-windows.ait. **업로드용이 아님**, Linux/일반판100MB와 구분한다.
- 76개 검사 러너 `D:/Development/code-destiny/.tmp/footer-paid-matrix.mjs`, 실행 프로세스32999. 두 개 독립 Chromium/임시 localhost로 실행, 실제 외부 API 차단. case별 log와 matrix.json은 `C:/Users/user/Downloads/CodeDestiny/20261116-launch-validation/`. 이미 catalog·찻집6모드 PASS, 편지 검증 진행 중. catalog 한 행은 영냥이 여러상품을 포함한다. 실패1개면 새 작업 시작을 멈추고 이미 진행 중인 다른1개가 끝난 뒤 종료한다. 성공 행은 재실행하지 않는다.
- 사용자 미리보기4334는 독립 Downloads/CodeDestiny/20261116-footer-preview에서 서버32191로 실행 중. **사용자 기록/서버 조작 금지**. QA4336(11829)는 root 시각검수용이며 root가 정리한다. 후속 테스트는 archive의 임의 포트만 사용한다.

## 승인 상태

2026-11-16 최신 요청 원문: “이런 텍스트도 고급스럽게 개선해주도록하고 버튼에는 달빛 예화 스타일을 적용시켜준 이후에 실제 모든 기능들이 결제 이후에 잘 제공되는지 검증 후 실제 론칭까지 진행해줘”. 앞선 지시: “실결제와 새 검토 제출은 계속 보류해.” root는 개발/모의 전수 검증과 비공개 전달을 진행하고 구체적 최종 버전·상품·영향을 제시한 뒤 과금/검토의 상충 범위를 확인한다고 안내했다. 후속은 실결제·실LLM·운영DB쓰기·새 검토/공개출시·운영재배포를 하지 않는다. 기존 승인으로 임의 상품·금액을 실결제하지 않는다. 신규판매는 닫힘 유지.

## 작업 규칙과 함정

- 원본 앱 흐름을 수정해 테스트를 통과시키지 않는다. 먼저 현 UI와 테스트를 대조한다. 발견된 오래된 테스트: `private-expert-reports.mjs`9행/38행에서 기존 `내 정보` 버튼을 찾지만 현재 실제 홈 라벨은 `설정·고객지원`이다. 접근 가능한 이름만 맞추면 기존 설정→로그인·보관함 흐름을 검증할 수 있다. 제품 인증 수정 필요 없음.
- 어떤 검증도 실 네트워크로 폴백하지 않는다. 실패한 상품만 고치고 독립적인 성공 검증을 반복하지 않는다. 같은 원인 실패2회면 재실행을 멈추고 root에게 원인·범위 전달.
- 테스트 .mjs 수정은 check:fast critical 자동 승격될 수 있다. 계획을 낮추지 않는다. 전체 정식 검사/커밋/pre-push를 완료해 root에 SHA 전달. root 체크아웃은 편집하지 않는다.
- 이 워크트리는 root node_modules 정션, 앱별 npm ci --ignore-scripts 설치 완료. 오늘 결정적 fortune 데이터 mock guard 생성 완료. 임시 log는 무시됨. 문서는 docs, 이미지/로그는 Downloads. 공개 웹·가격·권리·계정/서비스 경계 유지.
- Windows rg는 경로 wildcard 대신 `rg pattern apps/toss/test -g 'private-*.mjs'`. 전체 저장소 스캔 금지. 초반 복사/CPU 경쟁 때문에 Ego load timeout이 있었으나 실제 페이지 로드 후 시각검수 정상. 루트 브라우저space26은 root 전담.

## 설계

행렬: 영냥이 catalog, 찻집6, 연이/네오 편지12, 네오4체계+상대입력4, native14, paid-family4, paid-tarot4, extended4, expert7, 무료/소유결과/기타16 =76행. 각 helper가 실제 홈에서 시작하고 주문/생성/재열람/계정B를 검증한다. 케이스 이름만으로110개 웹 기능 전부 통과라고 쓰지 말고 실제 helper의 단언 범위를 보고한다. 상품별 상세 등급은 별도API계약과 E2E coverage를 구분한다.

## 단계

- [x] 하단 UI 구현과 모바일/3개 경로 확인
- [ ] UI 정식 check:fast·커밋·main 전달(root)
- [ ] 76행 모의 archive 검사·실패 해결·결과표
- [ ] 테스트 보완 정식 검사·커밋·pre-push
- [ ] 일반 Linux AIT·고정소스 CI·비공개 QR(root)
- [ ] 실제 판매/SKU/검토·공개출시 가능 범위 및 차단 항목 보고(root)
- [ ] handoff done·main 최종 전달·자기 worktree 정리(root)
