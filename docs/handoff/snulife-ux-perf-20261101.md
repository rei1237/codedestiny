---
status: active
updated: 2026-11-01
next: "main 복구 CI 결과를 1회 확인하고 성공이면 통합 코드를 main으로 전달한다"
---

# SNULIFE 이용 흐름·웹 성능

## 왜

승인한 코드+계정+본인 프로필 방식으로 선물 이용을 연결하고, 공통 사주·전문가 상담·홈·영냥이 성능을 개선한다. 운영 활성화·DB·실결제·LLM·메일·운영 배포는 범위 밖이다.

## 지금 상태

- 작업본: `D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056`, `wt/snulife-ux-perf-20261101-142056`. 코드 검증 기준 `ce67cc94d7f73fdae28d01eef4ef3b910ebb25a8`, 이후 인수인계 문서 커밋만 추가.
- 최신 main `0cd89ca4a`를 합쳤다. 원장 충돌은 생성기로 해결했다. **push·운영 반영 없음**. main 직전 CI `6fa75e36d` 실패 후 복구 CI [41282998959](https://github.com/rei1237/codedestiny/actions/runs/41282998959)가 마지막 확인에서 진행 중이었다. 기다리거나 반복 조회하지 않았다.
- 근거·전체 수정 파일·전후 표·PNG·JSON·로그: `D:\Development\code-destiny\outputs\snulife-ux-perf-20261101\verification.md`.

## 남은 작업

- [ ] 복구 CI를 1회 확인한다. 성공 전 추가 push 보류. 최신 main이 바뀌었으면 격리 작업본에 합쳐 관련 검사·`check:pre-push`를 통과시킨다.
- [ ] 정상인 main에 비강제 fast-forward로 전달하고, main CI 결과를 계약대로 1회 확인한다. 공유 main 폴더는 오래된 등록 상태라 건드리지 않았다. `git push origin HEAD:main` 사용 시 먼저 `origin/main`이 HEAD 조상인지 검증한다.
- [ ] 전달 후 문서를 done으로 닫고 자기 워크트리만 배수한다. 원래 폴더의 `feat/world-cast-page` 미커밋 변경과 다른 워크트리는 보존한다.
- [ ] 성능 목표 미달 20/21개와 실제 조작 200ms·INP·실기기 검증은 남았다. 표는 통합 전 분리 빌드 측정이며 통합 후 build/perf 증거가 아니다.

## 정본 예시

`js/core/snu-reading-flow.mjs`, `worker/lib/snu-campus.js`, `scripts/verify-snulife-flow-browser.mjs`.

## 검증

worker mock 31개, 흐름/사주/안내 19개, 앱 문구 5개, 프로필·권한·세션 가드 통과. 4너비 브라우저(키보드·포커스·고정 프로필·10링크·noindex·넘침) 통과. 통합 후 typecheck·check:pre-push 통과. check:fast 전체는 메모리 경합으로 중단되어 미통과다. 공식 CI가 필요하다.

## 재개

```text
D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056에서 D:\Development\code-destiny\.codex-worktrees\snulife-ux-perf-20261101-142056\docs\handoff\snulife-ux-perf-20261101.md를 읽고, 검증 기준 ce67cc94d7f73fdae28d01eef4ef3b910ebb25a8과 작업본 상태를 확인한 뒤 main 복구 CI 41282998959 결과를 1회 확인하는 단계부터 이어서 진행하라.
```
