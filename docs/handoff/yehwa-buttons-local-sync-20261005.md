---
status: blocked
updated: 2026-10-05
next: "공용 main의 홈 파일 미커밋 변경을 소유 세션이 정리하면 origin/main을 병합하고 이 작업의 워크트리를 배수한다."
---

# 달빛 예화 버튼 및 네오 색상 보정 — 로컬 동기화

요청한 버튼 수정은 원격 main에 전달했다. 코드 변경의 마지막 SHA는 `7ed8aa715a873e8b34c1af62d24626ad06c526de`다.

- 공용 홈·뒤로 내비를 문서 흐름에 배치해 본문 겹침을 제거했다. 홈/공용 상담/찻집/수비학 버튼의 형태와 상태를 정리했다.
- 네오는 남청색·금색으로 분리했고 입장 버튼의 raster 휘장과 가지 장식을 제거했다. 문구는 중앙 정렬이다.
- 결제/인증/API/DB 처리 및 기존 이동 핸들러는 이 작업에서 변경하지 않았다. 함께 병합된 다른 세션의 Neo 결과·가격 변경은 별도 작업이다.
- mock 실제 클릭: 홈·뒤로·수비학 전체화면 홈·네오 입력 화면 진입 통과. 최종 네오 360/390/430/1280 시각 검사 통과.
- `npm run check:fast -- --committed-head` exit 0. 마지막 Jest 334 suites / 4,991 tests 통과. 미러/사이트맵 drift 통과.
- CI 호환 수정: 함께 병합된 네오 가격 정책의 홈 표시 드리프트를 기존 billing registry에서 생성해 맞췄다. sync-flower-price-copy는 질문 카드의 data-cd-price-key도 사용한다. 서버 결제 정책은 수정하지 않았다. home-service-registry, payment-freeze, 사전/사이트맵 검사 10개, 생성기 ESLint와 mirror-fresh가 통과했다.
- CI: https://github.com/rei1237/codedestiny/actions/runs/37218814432 (이 링크에서 해당 코드 SHA의 최종 판정을 확인한다).

## 남은 작업

공용 체크아웃 `D:\Development\code-destiny`의 index.html 및 public 홈 미러에 다른 세션의 미커밋 변경이 남아 Git 병합이 중단됐다. marketing/RSS/llms 파일도 다른 세션 소유다. 이들을 임의로 커밋하거나 stash/restore/reset하지 않는다.

다른 세션이 해당 홈 변경을 정리한 뒤:

1. 공용 main에서 `git fetch origin`, `git merge origin/main --no-edit`로 전달된 버튼 코드를 동기화한다.
2. 새 병합 커밋이 생기면 `git push origin main` 후 그 SHA의 CI required 성공을 확인한다. 자동 스테이징은 폴링하지 않는다.
3. 이 문서 status를 done으로 닫고 커밋/전달한다.
4. 워크트리 `D:\Development\codedestiny-worktrees\yehwa-buttons-20261004-225636`의 node_modules 정션만 먼저 해제하고 워크트리를 제거한다. 브랜치는 `wt/yehwa-buttons-20261004-225636`다. 다른 워크트리는 건드리지 않는다.

미리보기: `C:\Users\user\.codex\visualizations\2026\10\04\01a10712-bbb3-7da1-af3a-424c8f80f256\yehwa-buttons\neo-clean-390.png`.
