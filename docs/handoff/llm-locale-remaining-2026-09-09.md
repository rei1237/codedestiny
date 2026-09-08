---
status: active
updated: 2026-09-09
next: 휴먼디자인 PDF의 다중 문자권 글꼴 자산을 확정하고 P4를 구현
---

# LLM locale 전수 보강 — 기존 초안 PR 재개

## 현재 상태

- 작업 디렉터리: `D:\Development\code-destiny-llm-locale-20260909`
- 브랜치: `codex/llm-locale-completion-20260909`
- PR: https://github.com/rei1237/codedestiny/pull/1860 — OPEN / draft 유지
- 마지막 구현 커밋: `f1b6031b7f71903b851e7de503c0f12f6f9c589b`
- 재배치 기준 main: `1f37e3634fa27c0fb7739f917af14e03eb643f9f`
- 기존 브랜치에서 rebase했다. 충돌은 `config/sitemap-lastmod.json` 1곳이며 최신 main 원장으로 생성기를 재실행했다. locale 관련 소스는 rebase 전후 동일함을 별도 비교했다.
- 이 문서는 구현 이후의 문서 커밋으로 전달한다. 원격 최신 HEAD/CI는 아래 명령으로 다시 조회한다. 구현과 인수인계는 원격에 푸시했다. 문서 변경 후 최신 HEAD 검사 결과는 별도 조회한다.
- **새 워크트리 생성·PR 머지·배포 금지.** 이번 사용자의 명시적 제약이다. `session:start`로 새 작업을 시작하지 않는다.
- `ci:preflight`는 임시 Git 워크트리를 만드는 구현이므로 실행하지 않았다. 같은 작업 디렉터리에서 검사·빌드를 개별 실행했다. 기존 preflight receipt는 최신 증거가 아니며 재사용하지 않는다.

## 유지해야 할 경계

기존 12개 언어 `ko/en/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms`를 유지한다. 실제 LLM·결제·운영 DB 호출 금지. mock/stub/fixture와 외부 네트워크 차단 가드만 사용한다. 계산식, provider, 모델, temperature, 가격, 차감·영수증·멱등 키 알고리즘은 변경하지 않는다. 과거 결과 일괄 변환/자동 번역은 범위 밖이다.

원래 공유 체크아웃의 미커밋 변경과 다른 워크트리는 보존했다. 이 워크트리는 전용 node_modules를 사용한다. `.codex-tmp/shared-node_modules`는 공유 node_modules를 가리키는 보존된 junction이므로 타깃을 삭제하지 않는다.

## 먼저 읽기

`AGENTS.md`, `CLAUDE.md`, `docs/context/ai-and-db.md`, `docs/context/delivery-and-ci.md`, `docs/ai-locale-inventory.md`, `config/ai-locale-call-inventory.json`.

## 이번 재개에서 수정한 것

1. `js/core/standalone-ai-locale.js`: 독립 페이지의 query/locale path/기존 저장 언어/cookie 판별, 지역 별칭, 12언어 정규화. 고정 html lang=ko를 사용하지 않는다. 기존 checkout resume가 읽는 cdGetCurrentLanguage도 제공한다.
2. 지오맨시·반려동물·천체의 선율·베다 일반/Prashna·요가·이직 타로의 직접 요청에 locale 헤더를 연결했다. 베다의 페이지 내 언어 선택은 요청 URL의 lang에도 반영한다. 이직 타로 `/ijik-reading`은 실제 LLM이 아닌 서버 결정론 해석임을 확인했다.
3. `worker/routes/oracle.js`: locale를 provider에 명시하고 비한국어 요청에 한국어 fallback을 붙이지 않는다. 필수 필드/분량 부족은 품질 실패(502)로 반환한다. 한국어 fallback은 유지한다.
4. 지오맨시 renderer의 결과 소제목·실패 안내를 12언어로 제공한다. 외국어 요청 실패 뒤 브라우저가 한국어 해석을 다시 만드는 경로를 막았다. 요청 중 언어가 바뀌면 늦은 응답을 반영하지 않는다. 타이핑 도중 언어 전환·카드 원문·주변 UI 전체 현지화는 남아 있다.
5. `worker/lib/guardian-fortune-result.js`: 비한국어 산문을 한국어로 늘리지 않고, 한국어 CTA label/공유문/목록으로 보완하지 않는다. CTA label만 11언어로 추가했다. 금지 표현과 근거 없는 주장은 한국어 치환 대신 안전성 실패로 처리한다. 분량·필수 필드/목록·민감정보·체계 경계·CTA 목적지 검사는 유지한다.
6. **비한국어 결정론 fallback은 아직 제공하지 않는다.** 짧거나 불완전한 결과는 기존 미전달 실패 경로로 반환한다. 이를 12언어 fallback 지원 완료로 보고하지 않는다. 결제 취소/환불을 새로 수행하거나 보장하지 않는다.
7. 기능별 우선 경로 8개와 나머지 라우트/하위 경로 인벤토리를 확장했다. 소스 스캐너의 43파일/105근거는 기능 수가 아니며, 전체 end-to-end locale 조사가 완료된 것은 아니다.
8. `app/palm-reading/PalmDestinyMain.tsx`의 `/api/palm/analyze` 최초 요청과 401 Bearer 재시도, `app/fortune-chat/FortuneChatClient.tsx`의 `/api/fortune/guardian/generate`에 현재 locale을 정규화해 body와 `x-code-destiny-locale` header로 전달했다. FortuneChat 재개·후속 질문은 호출마다 현재 locale을 다시 읽는다. `scripts/verify-palm-flow.mjs`와 `__tests__/ui/fortune-chat.static.test.js`로 계약을 고정했다.
9. 반려동물 report/compat, 천체의 선율, 요가 구루는 비한국어 요청에서 LLM 실패·부분 결과를 한국어 결정론 텍스트로 채우지 않고 `AI_LOCALE_RESULT_INCOMPLETE` 502로 반환한다. 한국어 fallback과 정상 비한국어 모델 결과는 유지했다. 연애 타로의 결정론 normalizer에는 현재 ambient locale을 전달하고, 지원되는 비한국어 locale이 한국어 원문으로 되돌아가지 않게 했다. 현지화된 결정론 fallback을 새로 제공한 것은 아니다.
10. **P2 저장·재열람 경계 완료**: ziwei-deep-report와 vedic-ai가 최초 생성 locale을 결과 레코드에 저장하고, 결과 목록·단건 재열람 응답에 노출한다. locale 없는 과거 저장본은 기존 실제 출력인 `ko`로 읽는다. ziwei의 배치 재개 JWT와 토큰 없는 부분 저장본 재개는 저장 locale을 우선해 장 사이 언어 혼합을 막는다. vedic은 provider 호출에 저장 locale을 명시하고, 결제 리다이렉트 resume payload에도 locale을 고정한다. **`userId + idempotencyKey` 결제/재열람 키와 기존 인덱스는 변경하지 않았다**; 같은 키의 다른 UI 언어 요청은 기존 결과를 재열람한다.

## 로컬 검증

재배치 후 현재 구현 기준:

- `npm run check:fast -- --plan`, `npm run check:fast`: PASS. Node **997 tests**, Jest **222 suites / 2467 tests**, lint·TypeScript·Worker dry-run build.
- `npm run build:cf`: PASS. Next 컴파일·837개 정적 페이지·최종 산출물 처리 완료. 배포하지 않았다. 타입/린트는 별도 check:fast로 검증했다.
- `node scripts/run-paid-gate-suite.mjs`: **86/86 PASS**, 실제 LLM/결제/DB 없이 mock network guard 사용.
- `node scripts/verify-ai-locale-browser-contract.mjs`: 12언어·별칭·명시적 ko·저장소 차단·실제 독립 request/header 함수의 fetch stub 검사 PASS.
- `node --experimental-strip-types --no-warnings scripts/verify-ai-locale-provider-contract.mjs`: 12언어 provider/fallback/cache/body/context fixture PASS.
- `ai-locale-postprocessing.test.js`: 12 tests PASS. 11개 locale에 영문 합성 fixture를 넣어 구조/안전 게이트를 검증한 것이며, 11언어 번역 품질 증거가 아니다.
- `node scripts/audit-ai-locale-calls.mjs --check`: **43 files / 105 evidence points**, PASS.
- `npm run sync:public`, `npm run sitemap:generate`, `npm run verify:public-mirror-fresh`, `npm run verify:payment-choice-parity`: PASS. 미러 신선도는 구현 커밋 후 확인했다.
- 지오맨시 HTML fixture: 외부 요청 전체 차단, 360/390/430/1280px에서 ja/hi/de/en 결과 텍스트 줄 넘침 없음. 실제 앱/결제 복귀 또는 전체 12언어 화면 검증을 뜻하지 않는다.
- 기존 lint 경고·Browserslist 데이터 경고·i18n fallback 인자 기준선 경고(221/181)는 유지했다. 기준선을 올리거나 게이트를 비활성화하지 않았다. 디자인 detector는 기존 glow/글자 크기 등을 지적했으며 이번 수정 범위 밖이다.

로컬 상세 로그와 화면 fixture는 `.codex-tmp/locale-*`에 있다. 원격에 포함되지 않으므로 없으면 해당 mock 검사를 재실행한다. 실제 모델 언어 준수·전문용어·상담 문체·간체/번체 품질은 미검증이며 허락 없이 실호출하지 않는다.

## 다음 작업: 확인된 누락부터

1. **늦은 응답·후속 대화 P3 (부분 완료)**: FortuneChat의 최초·결제 복귀·후속 질문은 같은 `requestReading` 경로를 지나며, 언어 전환 이벤트에서 진행 요청을 abort하고 세대 번호와 현재 locale을 응답 직전에 다시 대조한다. 이미 JSON 처리가 시작된 늦은 응답도 화면·저장 대화에 반영하지 않으며, 현재 언어의 재질문 안내를 표시한다. `__tests__/ui/fortune-chat.static.test.js`로 이 경계를 고정했다. 다른 renderer의 stream/reconnect 전수 확인은 별도 기능별 조사 없이는 완료로 보지 않는다.
2. **휴먼디자인 UI/PDF P4**: 본문/장 제목은 기존 12언어이며 플랜·조판 fixture도 12언어로 실행된다. 다만 report-plan 부가 라벨과 도표 용어는 기존 5언어/영문 fallback이고, PDF는 R2의 `Mulmaru.ttf`·`Paperlogy-5Medium.ttf` 두 파일만 임베드한다. 일본어·중국어·Hindi glyph를 실제로 보장할 다중 문자권 폰트 자산·용량·라이선스가 정해지기 전에는 PDF 지원 완료로 주장하지 않는다.
4. 인벤토리의 미확인 칸을 입력→locale→request→handler→prompt→provider→후처리→저장/캐시→UI 순서로 채운다. 준비·계산·관리자·예약 SNS·provider transport를 사용자 LLM 기능으로 중복 집계하지 않는다. 모든 Acceptance Criteria가 끝나기 전 초안을 Ready로 바꾸지 않는다.

## 재개 명령

```powershell
Set-Location 'D:\Development\code-destiny-llm-locale-20260909'
Get-Content 'D:\Development\code-destiny-llm-locale-20260909\docs\handoff\llm-locale-remaining-2026-09-09.md'
git status --short --branch
git branch --show-current
gh pr view 1860 --json state,isDraft,headRefOid,mergeable,statusCheckRollup
npm run worktree:status
node scripts/audit-ai-locale-calls.mjs --check
```

브랜치 `codex/llm-locale-completion-20260909` / PR #1860에서 이어간다. 새 워크트리·머지 없이 손금과 FortuneChat 직접 요청부터 추적하고 수정한다.
