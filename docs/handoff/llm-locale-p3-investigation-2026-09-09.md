---
status: active
updated: 2026-09-09
next: #1860 최신 HEAD CI를 확인하고, 추가 renderer 전수 조사는 별도 범위로 진행. 머지·배포는 보류.
---

# P3 후속 locale 경계 조사

## 조사 이후 승인된 구현

사용자가 “수정 진행해서 #1860에 올려서 마무리”를 승인했다. 아래 조사 당시의 구현·CI 보류는 이 범위에서 해제했다. PR 머지·배포 보류, 기존 워크트리 사용, 실 LLM·결제·운영 DB 금지는 유지한다.

- `app/hooks/useLocaleRequestScope.ts`: 정규화한 locale와 이벤트 세대를 함께 대조한다. ko→en→ko 전환, 언마운트 이후 응답을 차단하고 같은 locale의 중복 이벤트는 무시한다.
- `app/fusion-fortune/FusionFortuneClient.tsx`: SSE 단계/결과, 복구 GET, 재열람 GET, 완료 후 이동을 보호한다. 새 controller와 이전 복구 GET의 경합도 차단한다. locale 전환은 결제 requestId/저장 body를 지우지 않는다.
- `app/destiny-compass/_hooks/useCompassReport.ts`: 웨이브 A/B 요청 언어를 고정하고 새 캐시에 locale을 기록한다. 이미 시작한 유료 작업은 원래 언어로 완료·보관하되 전환된 화면을 덮지 않는다. 기존 locale 없는 캐시는 언어를 추측하지 않고 기존 보관본 복원으로만 읽으며 삭제하지 않는다. 캐시 재열람 시 새 결제를 열지 않는다.
- `app/astrology-ai/AstrologyAiClient.tsx`: start 재시도, 202 폴링 sleep/fetch/body, 결과 창 열기 전에 응답 수명을 검사한다. 멱등 키를 유지한다.
- `js/saju-engine.js`: 폴링 세대·언어·DOM 연결 상태를 대조한다. 진행 중 결과 GET·직접 생성·오류 반영도 보호하고 pending job/결제 증빙을 유지한다. public 미러는 생성기로 동기화한다.
- `__tests__/ui/locale-request-boundaries.behavior.test.js`: 실제 소스 함수와 훅을 추출해 실행하는 deferred mock 회귀. 실제 네트워크가 필요하면 실패하는 network guard로 실행한다.

승인된 4곳의 구현과 직접 회귀는 완료했다. Node 1,018 tests, Jest 223 suites / 2,475 tests, lint·TypeScript, Pages 843개 정적 페이지 및 Worker 빌드, 12언어 browser/provider mock, 인벤토리 44 files / 107 evidencePoints가 통과했다. P3 전용 회귀는 18개다. 실 LLM·실결제·운영 DB·배포·실기기 검증은 실행하지 않았다.

preflight에서 발견한 검증기 문제도 함께 수정했다: 원본 followup의 허용되지 않는 `status: paused`를 `done`으로 정리했고, 통합 운세 단계 흐름 검사가 새 `stale` 반환 타입과 다음 단계 차단을 검증하도록 갱신했다. `verify:fusion-fortune-stage-flow`는 1단계 partial→2단계 completed 병합 36,687자·예약·옛 보관본 계약을 모두 통과했다. 최종 preflight 전체 실행 기록은 `.codex-tmp/locale-p3-preflight-delivery.log`에 남긴다(로컬 전용). 이 문서 작성 이후의 원격 최신 HEAD·검사 결과는 아래 명령으로 조회한다.

P3 구현 커밋은 `d7273575e`다. 검사 도중 main이 갱신되어 최신 main `1587621ed`를 기존 브랜치에 추가 통합했다(헤더 2파일, P3 소스 중첩 없음). 앞서 통과한 전체 검사 기준 main은 `05c18c84053eaa0647b3c60e198d004d5102e9ce`이며 최종 preflight는 새 main 기준으로 실행한다. 개발 워크트리는 그대로 사용했으며 preflight만 임시 검증 체크아웃을 자동 생성·정리한다. 다른 작업의 미커밋 파일은 수정하지 않았다. 인수인계 이후의 sitemap `/vedic-ai/` 서명 변경과 이번 `/destiny-compass/` 서명 변경은 생성기로 검증했다. 가격·결제 증빙·멱등 키·인증·서버 API 응답·DB 스키마는 이번 P3 수정에서 변경하지 않았다.


아래는 수정 전 조사 근거와 당시 상태다.

## 현재 상태

- cwd: `D:\Development\code-destiny-llm-locale-20260909`
- branch: `codex/llm-locale-completion-20260909`
- PR: https://github.com/rei1237/codedestiny/pull/1860
- GitHub 조회: OPEN / draft / 미병합, HEAD `987f203d53fa21c0700062508b19dc23b095f386`, mergeable_state `unknown`.
- 원래 followup 문서의 조사 우선 및 CI·입장검사·머지·배포 보류를 유지했다. 코드 수정과 원격 쓰기는 하지 않았다.
- 기존 `config/sitemap-lastmod.json`의 `/vedic-ai/` signature만 `fcbf2a2cc5d464c8` → `06fa9cc93c542c1e`로 달라져 있다. 기존 untracked followup 문서와 함께 보존했다.

## 조사 방법과 한계

인벤토리에서 stream/retry/resume/저장/폴링 경로를 추린 뒤 실제 프론트의 요청, 응답 상태 반영, 캐시와 복구 조회를 추적했다. `app`, `components`, `lib`, `js`에서 `getReader`, `text/event-stream`, `EventSource`, reconnect/polling도 검색했다. 키워드만으로 전체 renderer 검증 완료를 주장하지 않는다. 아래는 코드상 가드 누락 후보이며 지연 응답 mock 재현은 아직 실행하지 않았다.

## 우선 구현 후보

| 경로 | 코드 근거와 위험 | 최소 mock 회귀 | 유지할 경계 |
|---|---|---|---|
| 통합 운세 | `app/fusion-fortune/FusionFortuneClient.tsx:2366` runGeneration은 시작 시 이전 controller를 취소하지만 locale 전환과 연결되지 않는다. 2387 이후 단계 결과가 즉시 setResult에 반영된다. 2156 recoverPaidResult도 조회 후 그대로 applyOpenedConsultation한다. 1951의 locale 이벤트는 UI copy만 바꾼다. | SSE 지연 result 및 stage 이벤트 사이 언어 전환, 실패 후 늦은 복구 GET, 이전 요청 finally가 새 loading을 덮는 경우를 검증한다. | requestId·결제 복귀 body 보존, 취소를 미결제나 환불로 처리하지 않음. 서버 저장 결과는 명시적 재열람 가능하게 유지. |
| 운명 나침반 | `app/destiny-compass/_hooks/useCompassReport.ts:93` postJson은 매 호출 detectLocale을 읽으며 controller는 timeout용이다. 166 runWaveB는 받은 섹션을 병합하고 캐시에 저장한다. 67 sessionKeyFor는 field.seed/question만 사용한다. 이전 웨이브가 새 UI를 덮거나 현재 locale의 캐시로 오인될 후보다. 서버 continue의 저장 locale 고정도 추가 검증 필요. | 웨이브 A 대기 중 전환, A→B 사이 전환, B retry 전환, ko→en→ko 전환 후 지연 응답, 캐시 재열람 구분. | 결제·멱등 키를 locale별 새 키로 바꾸지 않음. 저장본을 삭제하거나 자동 번역하지 않음. |
| 사주 상담 폴링 | `js/saju-engine.js:7960` pollPendingJob → status → 8010 handleCompletedPayload. callback이 가변 activePendingJob를 사용하며 이 파일에 locale 전환 이벤트 가드가 없다. 타이머 정지만으로 이미 진행된 fetch의 반영을 막을 수 없다. | status 대기/결과 GET 대기 중 전환, 이전 job 응답이 새 job에 반영되는 경우, 재시도 타이머 잔존. | jobId/requestId와 복구·환불 분기를 보존. 공통 파일 중첩 해소 후 순차 수정. |
| 점성술 상담 | `app/astrology-ai/AstrologyAiClient.tsx:1530` pollAstrologyResult는 sleep/GET 반복으로 signal·세대 대조가 없다. 1688 이후 start 재시도→202 폴링→setConsultation/setPhase 흐름도 응답 시 locale 재확인이 없다. 1357의 이벤트는 UI copy만 바꾼다. | start 재시도 및 polling 202→200 사이 전환, 늦은 성공/오류/결과 열기 후속 동작 차단. | sessionId/idempotencyKey 유지, 기존 결과 URL로 재열람하는 행위는 보존. |

## 제외 및 미확정

- FortuneChat에는 이미 locale 이벤트·controller 취소 구현이 있다. 기존 P3를 다른 renderer 전체 완료로 확대하지 않는다.
- 휴먼디자인은 `HumanDesignReportClient.tsx:177`에서 저장된 doc.locale을 본문 언어로 사용한다. 다른 UI 언어에서 저장 본문을 보여주는 것 자체는 결함이 아니다. `_lib/useReportGeneration.ts`의 결과 간 경합은 별도 mock 검증이 필요하며 이번 4곳 확정 후보에 합산하지 않았다.
- 지오맨시 typeOut 중 언어 전환, 그 밖의 배치/후속 상담 renderer는 미완료로 유지한다.
- 인벤토리에는 이미 보강된 FortuneChat/손금 locale 헤더와 P2 저장 경계를 여전히 미해결로 표시하는 과거 행이 있다. 다음 구현 시 최신 근거와 함께 정리한다.

## 검증 결과

- `git status --short --branch`: 기존 branch와 sitemap 변경 및 untracked followup 확인.
- `git diff -- config/sitemap-lastmod.json`: signature 1건 변경 확인.
- `npm run worktree:status`: isolated=true. 48 worktrees, active overlap 1개. sitemap/index/static mirror 등 공통 파일 중첩이 있어 수정 전 순서 조정 필요.
- `node scripts/audit-ai-locale-calls.mjs --check`: PASS, 44 files / 107 evidencePoints. 기능 수나 E2E 통과 수가 아니다.
- GitHub PR get: 위 draft/HEAD 확인. CI는 실행하거나 재시작하지 않았다.
- 실 LLM·실결제·운영 DB·배포 호출 없음. mock 지연 응답 회귀 및 build/check:fast는 미실행.

## 재개 명령

```powershell
Set-Location 'D:\Development\code-destiny-llm-locale-20260909'
Get-Content 'D:\Development\code-destiny-llm-locale-20260909\docs\handoff\llm-locale-p3-investigation-2026-09-09.md'
git status --short --branch
npm run worktree:status
# branch codex/llm-locale-completion-20260909 / PR #1860
gh pr view 1860 --json state,isDraft,headRefOid,mergeable,statusCheckRollup
# 첫 작업: 최신 HEAD CI 확인. 추가 승인 없이는 머지·배포하지 않음.
```
