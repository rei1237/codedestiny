---
status: active
updated: 2026-10-04
next: "Check main CI for 433ffb2ed2d93c72f61d37b9979e5935c7551a80, resolve any external gate in its authorized scope, then request explicit production promotion approval before verifying the new Threads format."
---

# Threads 발행 형식과 참여형 편성 인수인계

## 요청과 전달

사용자는 첨부 예시처럼 대상 띠·출생연도·설명·행동 조언이 이어지는 글과 대중적인 소재로 하루 2~3개의 Threads 글을 운영하도록 요청했다. 계정은 @codedestiny_official이다. 코드 변경 커밋은 `3ba93f7f5`, 원격 main 통합·push SHA는 `433ffb2ed2d93c72f61d37b9979e5935c7551a80`이다. PR은 만들지 않았다.

작업 위치: `D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257`.
작업 브랜치: `wt/threads-editorial-20261004-003257`.
정본 기획: `marketing/threads-editorial-plan-20261004.md`.
실제 엔진 기반 미리보기: `marketing/threads-editorial-preview-20261004.md`.

원격 main은 최신 변경을 합쳐 직접 push했다. 공유 `D:\Development\code-destiny`의 로컬 main은 다른 세션의 index.html·정적 미러·마케팅 로그·RSS 미커밋 변경 때문에 fast-forward가 거절됐다. 파일을 보존하고 격리 worktree에서 `git push origin HEAD:main`으로 전달했다. 공유 main에 reset/stash/강제 checkout을 하지 않는다. 이 작업의 검수 문서가 현재 worktree에 있으므로 로컬 main 동기화 후 배수한다.

## 적용한 내용

- Worker 기본 08:30 띠별·12:00 사주·20:30 마음 노트의 독립 원글 3편 유지. 띠별은 대상·연도 원글 + 3띠씩 4답글, 각 글 480자 이내.
- 출생연도는 찾기용 대표 예시이며 입춘 경계 안내를 포함. 같은 역법·지지 관계를 사용하고 호통·인연 확정 문구를 교체.
- 저녁은 관계·연락·소비·일·휴식 등 15개 검수 주제와 질문 하나. 띠별·저녁 홍보 링크 제거, 낮 링크 유지. 브랜드 태그 #꿀꿀운세.
- 10월 5일 09:00 별도 소개글은 그날 12:00 슬롯 대체. 11월 1일~2027년 1월 3일 일요일 21:10 신년 예약은 20:30 슬롯 대체. 별도 예약은 정지하거나 복제하지 않았다.
- T03/T05/T07/T10 예비 큐의 깨진 루트 목적지를 실제 관련 페이지로 교정. 13편 검수 통과, 이미 게시된 글 재게시 없음.
- Codex 자동화 `code-destiny-2027`의 기존 ID·ACTIVE·07:10/21:10 KST·target chat을 보존하고 prompt를 `editorial-20261004-v1`로 갱신한 뒤 저장을 재확인했다. 실행은 준비·점검·계측이며 정상 Worker에 원글을 추가하지 않는다.
- 자기 연속 답글을 참여에서 제외하고 24h/72h/7d·14일 비교 기준을 저장. 별도 댓글 대응·DM·광고 운영은 추가하지 않았다.

## 검증과 경계

- `npm run verify:threads-daily-jobs`: 34개 통과. 366일 × 6유형 × 결정론/모의 모델 최대 길이, 연도/띠 일치, 12띠 누락, 예약 대체·중복·실패 경로 포함.
- `node scripts/verify-threads-queue.mjs`: 13개 통과, realPosts 0.
- `npm run check:fast -- --plan` 및 `npm run check:fast`: critical로 자동 승격. paid-gate-suite 88개·lint 통과 후 `verify:sitemap-drift` 실패. 날짜 운세 URL 2026-10-04 추가/2026-09-04 제외 등 소스/추적 사이트맵 불일치. 사이트맵·라우트는 이번 변경 대상이 아니다. 이후 단계는 이 실행에서 미실행이다.
- 최종 변경 파일 대상 ESLint와 `git diff --check` 통과.
- [코드 main CI](https://github.com/rei1237/codedestiny/actions/runs/37134786176). CI 종료 결론은 링크에서 확인하며 로컬 검사 통과와 혼동하지 않는다.
- 이후 원격 main의 사이트맵·정적 소개 페이지 수정 `d5ae0fddad92e01d08574e468e07b5f42b686f54`를 통합했다. 이 수정은 다른 작업의 변경이며 위 로컬 실패를 소급해 통과로 바꾸지 않는다. 최신 원격 main의 전체 CI를 확인한다.
- 유료 LLM 0회, 실결제 0회, 실제 게시 0건, 운영 DB 쓰기 0회, 운영 승격 미실행. 결제/인증/가격/DB 스키마/발행 잠금은 유지했다.
- 브라우저 연결은 timeout으로 실패하여 이번 턴의 최신 프로필·인사이트 실측은 없다. 이전 마케팅 로그는 과거 관측으로만 사용했다.

## 다음 행동

1. 위 SHA의 main CI 종료 결과를 확인한다. 실패하면 실제 job 로그로 귀책을 구분하고 범위 밖 게이트는 별도 승인 범위에서 해결한다. CI를 생략하거나 낮추지 않는다.
2. CI가 녹색이어도 운영 승격은 사용자 명시 승인 후 수행한다. 근거: CLAUDE.md 및 docs/context/delivery-and-ci.md의 production 별도 승인 규칙. 승격 전 전체 main 포함 변경이 승인 범위인지 확인한다.
3. 승인된 릴리스에서 Pages/Worker SHA를 확인하고 다음 정상 Threads 슬롯의 원글·답글 공개 URL을 확인한다. 확인 전 새 형식이 실제 운영 중이라고 기록하지 않는다. 즉시 시험 게시로 중복을 만들지 않는다.
4. 예약 소개글·신년이 원글 4개째가 되지 않는지 확인한다. 수동 원글은 Worker가 자동 계정 한도로 차단하지 않으므로 사전 편성에 포함한다.
5. 공유 main의 미커밋 변경 소유자가 정리한 뒤 fast-forward하고 원격 main에 포함된 이 worktree를 안전하게 배수한다. node_modules 정션은 공유 디렉터리를 삭제하지 않도록 먼저 링크만 제거한다.

재개 지시:

```text
D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257에서 D:\Development\codedestiny-worktrees\threads-editorial-20261004-003257\docs\handoff\threads-editorial-20261004.md를 읽고, 원격 main에 433ffb2ed2d93c72f61d37b9979e5935c7551a80이 포함됐는지와 CI 37134786176의 결과를 확인하라. 미커밋 작업을 보존하고 외부 게이트를 보고한 뒤, 사용자 운영 승격 승인 범위를 확인하는 단계부터 이어가라.
```
