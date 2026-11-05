---
status: blocked
---
# 연이 게임형 다이어리 전달 인수인계

기준 시각: 2026-11-05 한국 시간. CI와 작업 트리 상태는 바뀔 수 있으므로 실행 직전에 다시 확인한다. 상세 경과와 검증 기록은 같은 디렉터리의 `daily-home-20261104.md`를 읽는다. 그 문서의 과거 시점 상태와 운영 승격 불가 안내보다 이 문서의 최신 사용자 지시를 우선한다.

## 목표와 승인

공개 홈 `/`에 연이를 키우는 게임형 프로필 카드로 출석·기존 꿀방울·퀘스트·다이어리를 연결한 변경만 최신 main에 전달한다. 사용자는 병합, push, 배포 및 배포 결과 확인을 승인했다. 실제 단말기 대신 모바일 브라우저 검증을 선택했다. 다른 세션 변경은 보존하고, 그 미커밋 변경이 안전하게 정리되고 최신 main 필수 CI 및 배포 게이트가 정상일 때만 진행한다.

## 현재 상태

- 전용 작업 트리: `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`
- 브랜치: `wt/daily-home-20261104-040025`; 이 문서 작성 전 마지막 커밋: `9418b4729b30fbcdd8b9671a7cbed186c0a8b2f8`. 작업 트리는 작성 전 clean이었다. 새 인수인계 문서의 커밋 여부는 `git status`와 `git log`로 확인한다.
- 주요 구현: `d7856f90b` 게임형 카드, `c0615473d` 카드 내 패널 전환, `f3ad4819e` 공개 홈 직접 표시 및 기존 꿀방울 이미지 축소. 연이 이미지는 사용자가 제공한 `D:\CodeDestiny-Build\연이 프로필1.png`를 직접 참조했다.
- 출석·레벨·퀘스트·다이어리는 기존 기능과 저장소를 재사용한다. 퀘스트 꿀방울은 신설하지 않았다. 결제·인증·DB·API 계약을 임의로 변경하지 않는다. 기록은 기기 브라우저에 저장된다.
- 최신 확인 시 원격 main `ec32df3dd5612d5ef012fb297efefca161796da5`의 [PR CI](https://github.com/rei1237/codedestiny/actions/runs/41995443835)는 실패했다. Pages 빌드, Critical checks의 테스트, Static guards가 실패했다. [배포 워크플로](https://github.com/rei1237/codedestiny/actions/runs/41996693662)도 실패한 실행이 있다. 최신 커밋과 해당 커밋 검사 결과를 반드시 재확인한다.
- 다른 세션의 main 체크아웃: `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530`. 최종 확인 시 미커밋 8개: `app/fortune-chat/ConsultationAccessPanel.tsx`, `app/fortune-chat/ConsultationRoom.tsx`, `app/fortune-chat/consultation-access.ts`, `js/prompt-hub-honey.js`, `styles/saju-reading.css`, `worker/lib/honey-per-use.js`, `worker/lib/honey-unlock-catalog.js`, `worker/lib/honey-wallet.js`. 이 작업 트리의 파일을 수정·이동·삭제하거나 reset·stash·checkout하지 않는다. 해당 세션이 안전하게 정리하기 전에는 기다린다.
- 아직 다이어리 작업은 main에 병합·push·배포되지 않았다. 현재 활성 자동 추적 `automation-4`가 조건을 주기적으로 확인한다. 클로드가 실제 인계받아 작업할 경우 중복 병합·push 방지를 위해 사용자와 기존 자동 추적의 중지 또는 조정을 먼저 확인한다.

## 기존 검증 및 한계

- 모바일 브라우저 mock에서 출석 5일째 5방울 지급, 중복 출석 비활성화, 퀘스트 완료, 홈과 다이어리 기록 일치 및 새로고침 유지 확인.
- 스와이프 판정 포함 다이어리·홈 경로 33건, 홈 SEO·진입 22건, 기존 꿀방울 출석 mock 12건 통과. `npm run check:fast -- --plan`, `npm run check:fast` 통과 (Jest 445 스위트·7,282건), `npm run check:pre-push` 통과. 사이트맵 1,059 URL 일치.
- 모바일 브라우저의 버튼 전환은 확인했으나 실제 터치 스와이프는 미검증이다. 모바일 브라우저 검증 선택에 따라 실제 단말기 검증을 완료했다고 주장하지 않는다. 위 결과는 이전 트리 기준이므로 병합으로 관련 코드가 바뀌면 적절히 재검증한다.

## 전달 절차

1. 저장소의 `AGENTS.md`, `CLAUDE.md`, `docs/context/delivery-and-ci.md`와 상세 인수인계를 확인한다. `git status`, 각 작업 트리의 HEAD, GitHub의 실제 최신 main SHA와 해당 SHA의 CI·배포 결과를 읽기 전용으로 확인한다. 다른 세션의 미커밋 변경을 임의로 정리하지 않는다.
2. 다른 세션 작업이 안전하게 정리되고 최신 main의 필수 CI 및 배포 게이트가 정상인 경우에만 전달한다. 실패 중인 다른 작업의 CI를 임의로 수정하거나 실패 위에 push하지 않는다. 조건 미충족이면 원인과 링크를 기록하고 대기한다.
3. 최신 main과 다이어리 변경을 검토하고 다른 작업을 보존하여 병합한다. 충돌을 해결할 때 사용자 요구인 공개 홈 직접 카드, 공유 저장소, 기존 보상 정책을 유지한다. 병합으로 관련 코드가 바뀐 경우 모바일 브라우저와 관련 기능 mock을 다시 확인한다.
4. 사이트맵 드리프트 검사, `npm run check:fast -- --plan`, 변경 기준 `npm run check:fast`, 커밋된 트리에서 `npm run check:pre-push`를 실행한다. 실결제·운영 DB 쓰기·과금 LLM 호출은 검증에 사용하지 않는다.
5. 정상인 경우 인수인계 문서를 완료 상태로 정리하고, 원격이 계속 같은 상태인지 재확인한 뒤 `git push origin main` 및 사용자 승인 배포를 진행한다. 해당 커밋의 main CI와 배포 결과를 확인한다. 배포 결과를 확인하기 전 완료라고 보고하지 않는다.
6. 성공 후 본인 소유 전용 작업 트리만 저장소 절차에 따라 정리하고, 자동 추적도 중지한다. 다른 세션의 작업 트리나 파일은 정리하지 않는다.

## 클로드에 전달할 프롬프트

```text
Code Destiny 연이 게임형 다이어리 작업을 이어서 완료해줘.

먼저 D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025\docs\handoff\daily-home-claude-20261105.md 와 같은 디렉터리의 daily-home-20261104.md를 읽고, AGENTS.md와 CLAUDE.md도 확인해줘. 전용 작업 트리의 9418b4729b30fbcdd8b9671a7cbed186c0a8b2f8 이후 상태와 최신 origin/main을 직접 확인해줘.

C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530의 다른 세션 미커밋 변경은 수정·이동·삭제하거나 reset/stash/checkout하지 마. 그 변경이 안전하게 정리되고 최신 main 필수 CI와 배포 게이트가 정상인 경우에만 다이어리 변경을 최신 main에 병합해. 조건이 충족되지 않으면 실패 항목과 링크를 보고하고, 다른 작업을 임의로 고치지 말고 기다려줘.

공개 홈의 연이 게임형 카드가 출석·기존 꿀방울·퀘스트·다이어리를 한 카드에서 연결해야 해. 기존 보상·결제·인증·DB 정책은 유지하고 퀘스트 꿀방울 보상은 만들지 마. 병합 후 사이트맵, check:fast 계획과 변경 기준 검사, 커밋된 트리의 check:pre-push를 실행하고 필요한 모바일 브라우저 및 mock 기능을 검증해. 실제 단말기 검증은 이번에 필수가 아니며 실결제·운영 DB 쓰기·과금 LLM 호출은 금지야.

검증이 통과하고 게이트가 정상이라면 main에 push하고 내가 승인한 배포를 진행한 뒤 그 커밋의 CI와 배포 결과까지 확인해줘. 성공 후 네가 맡은 전용 작업 트리만 정리해줘. 이미 실행 중인 Codex 자동 추적 automation-4와 중복 실행되지 않도록 먼저 사용자에게 추적 중지 또는 조정을 확인해줘.
```
