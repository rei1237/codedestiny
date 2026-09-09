---
status: done
updated: 2026-09-09
next: llm-locale-p3-investigation-2026-09-09.md의 승인 후 구현·전달 기록에서 이어가기
---

# LLM locale P3 후속 인수인계

> 아래는 조사 시작 전 중단 당시의 결정이다. 이후 사용자가 P3 4곳 수정과 #1860 전달을 승인했다. 최신 상태는 `llm-locale-p3-investigation-2026-09-09.md`를 따른다. 머지·배포 보류는 유지한다.

## 사용자 결정

- PR #1860은 **아직 머지하지 않는다**. CI·입장검사·스테이징·운영 승격도 모두 보류한다.
- 다음 작업은 새 채팅에서 P3를 **조사부터** 진행한다. 이 문서는 그 시작점만 제공하며, 새 변경을 미리 구현하지 않는다.
- 현재 세션에서는 이 문서 외 코드·생성물·PR 상태를 변경하지 않는다.

## #1860 보존 상태

- 작업 디렉터리: `D:\Development\code-destiny-llm-locale-20260909`
- 브랜치: `codex/llm-locale-completion-20260909`
- PR: https://github.com/rei1237/codedestiny/pull/1860 (draft 유지)
- 원격에 푸시된 마지막 HEAD: `987f203d5` (`chore(locale): refresh static mirrors`)
- 로컬에만 미커밋 생성물 1개가 있다: `config/sitemap-lastmod.json`.
  - `npm run ci:preflight`가 `verify:sitemap-drift`에서 이를 발견한 뒤 멈췄다.
  - `npm run sitemap:generate`으로 재생성한 정상 생성물이며, **커밋·푸시하지 않았다**.
  - 새 채팅에서 먼저 `git diff -- config/sitemap-lastmod.json`으로 정확한 차이를 확인한다. #1860을 다시 전달하기로 결정된 경우에만 sitemap 생성물과 그 검증을 별도 커밋으로 처리한다.
- #1860에 포함된 P2 저장/재열람, 기존 P3 늦은 FortuneChat 응답 차단, P4 휴먼디자인 PDF 실패-폐쇄 구현의 상세는 기존 문서 `docs/handoff/llm-locale-remaining-2026-09-09.md`를 참고한다.

## 다음 P3의 범위: 후속 locale 경계 조사

기존 FortuneChat의 요청 취소·응답 세대 대조(P3)는 구현되어 있다. 다음 P3는 이를 완료로 확대 해석하지 말고, **다른 LLM/스트리밍/재연결 renderer에서 언어 전환 중 늦은 응답이 섞이는 경계가 있는지 조사**하는 작업이다.

조사 우선순위:

1. `config/ai-locale-call-inventory.json`과 `docs/ai-locale-inventory.md`에서 stream, SSE, reconnect, polling, resume, retry 표기가 있는 경로를 추린다.
2. 각 경로를 요청 시작점 → abort/controller 또는 request id → 응답 반영 상태 → 저장/재열람 순으로 추적한다.
3. 언어 전환 이벤트(`languagechange`, `cd:locale-ready`) 또는 현재 locale 재확인이 없는 경로만 후보로 기록한다.
4. 후보마다 실제 언어 혼합 가능성, 결제/멱등성/저장 경계 영향, mock으로 고정할 최소 회귀 테스트를 적는다.
5. 조사 결과와 수정 후보를 먼저 보고한 뒤에만 구현 범위를 확정한다. 실 LLM·실결제·운영 DB 호출은 금지한다.

## 새 채팅 시작 명령

```powershell
Set-Location 'D:\Development\code-destiny-llm-locale-20260909'
Get-Content 'D:\Development\code-destiny-llm-locale-20260909\docs\handoff\llm-locale-p3-followup-2026-09-09.md'
Get-Content 'D:\Development\code-destiny-llm-locale-20260909\docs\handoff\llm-locale-remaining-2026-09-09.md'
git status --short --branch
git diff -- config/sitemap-lastmod.json
npm run worktree:status
node scripts/audit-ai-locale-calls.mjs --check
```

`worktree:status`에서 공통 파일 중첩이 확인되면 수정 전에 순서를 조정한다. 새 워크트리는 만들지 말고 이 보존된 #1860 작업 디렉터리에서 조사만 시작한다.

## 유지할 경계

- 12개 locale: `ko/en/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms`
- 결제 정책, 이용권·월정석·단건 결제, `userId + idempotencyKey`, 저장 데이터의 과거 일괄 변환은 변경하지 않는다.
- 실제 LLM, 실제 결제, 운영 DB, 배포 호출은 하지 않는다.
- 휴먼디자인 PDF의 `ja/zh-CN/zh-TW/hi`는 현 글꼴 glyph 미지원으로 계속 생성 차단 상태를 유지한다. 글꼴·라이선스와 glyph 검증이 확정되기 전 allowlist를 넓히지 않는다.
