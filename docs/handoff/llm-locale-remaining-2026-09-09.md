# LLM locale 전수 보강 — 미완료 작업 인수인계

## 재개 판단

**머지는 다음 작업의 선행 조건이 아니다.** 이 문서는 완료 세션에서 최신 main으로 새 작업을 시작하는 인수인계가 아니라, 미완료 초안 PR을 기존 워크트리에서 이어가는 기록이다. PR #1860을 먼저 머지하거나 Ready로 바꾸지 않는다. 새 대화에서도 아래 워크트리·브랜치를 그대로 사용한다. `session:start`로 새 워크트리를 만들지 않는다.

- 작업 디렉터리: `D:\Development\code-destiny-llm-locale-20260909`
- 브랜치: `codex/llm-locale-completion-20260909`
- PR: https://github.com/rei1237/codedestiny/pull/1860 (OPEN / draft)
- 마지막 검증·푸시된 구현 SHA: `16846f0f0b707160eb507e51ffa186c0b4ad3129`
- 기준 main: `495afa4b719e21eda7105503e991f55b815f02df`
- 위 구현 SHA의 GitHub 체크 11개 SUCCESS, 충돌 없음(MERGEABLE)을 문서 작성 시 다시 확인했다.
- 이 인수인계 문서는 위 구현 이후의 문서 전용 커밋으로 전달한다. 새 커밋의 CI 결과는 별도로 조회해야 한다. 과거 검사 결과를 새 코드의 검증으로 재사용하지 않는다.
- 머지·스테이징·운영 배포를 수행하지 않았다. 사용자의 이번 요청도 머지 승인이 아니다.

## 목표와 변경 금지

기존 12개 언어 `ko/en/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms`를 유지하며 모든 LLM 기능의 신규 생성·재생성·후속 상담·결제 복귀를 현재 서비스 언어로 일관되게 제공한다. 대표 기능만 수정한 상태를 완료로 표시하지 않는다.

실제 LLM·결제·운영 DB 호출 금지. mock/stub/fixture만 사용한다. 실제 모델 검증이 필요한 부분은 목록으로 남긴다. 계산식, provider, 모델, temperature, 가격, 차감·영수증·멱등 키 알고리즘을 바꾸지 않는다. 해외 유료 과거 결과가 없다는 사용자 설명에 따라 과거 결과 일괄 변환·자동 번역은 제외하고 데이터를 보존한다.

## 먼저 읽을 파일

1. `AGENTS.md`, `CLAUDE.md`, `docs/context/ai-and-db.md`, `docs/context/delivery-and-ci.md`
2. `docs/ai-locale-inventory.md`: 실제 확인한 연결과 미해결 근거
3. `config/ai-locale-call-inventory.json`, `scripts/audit-ai-locale-calls.mjs`
4. 필요한 경우 `.codex-tmp/LLM-LOCALE-STATUS.md`: 로컬 상세 보고서와 99개 파일 변경 이유. Git 추적 문서가 아니므로 없어도 위 정식 문서로 재개 가능하다.

## 이미 구현한 것

- `lib/i18n/locale-normalize.js`: 기존 정규화에 지역/script 별칭 보강(zh-SG 간체, zh-HK/TW 번체 등).
- `lib/i18n/ai-locale.js`: ko도 명시적으로 출력 언어 지시. 질문/history보다 서비스 locale 우선, JSON key·enum·고정 식별자 유지.
- `lib/i18n/dictionary.ts`: 명시적 `/ko` 판별. native runtime의 현재 언어를 읽되 `__cdNativeLangBound` 조건으로 React bridge 재귀를 방지한다.
- `app/_lib/auth-client.ts`: 요청 시 locale 헤더, 기존 JSON body locale 정렬. `worker/lib/ai-locale-context.js`와 `worker/index.js`: 헤더 → 호환 body → 기존 cookie/Accept-Language fallback을 요청별 AsyncLocalStorage context로 연결.
- 정적 홈 공통 fetch, React 타로 3종, 관리자 prompt lab locale 전달 보강. **독립 정적 페이지 전체를 해결한 것은 아니다.**
- `app/hooks/usePaidResume.ts`, `js/core/checkout-entry.js`: 기존 resume descriptor에 locale 보존, handler 실행 전 복원. 기존 결제 키 알고리즘 유지.
- 휴먼디자인: 12개 locale 타입·모델 enum·장 제목·신규 생성 언어. `worker/routes/human-design-report.js`의 후속 웨이브/repair에 저장 locale을 provider 옵션으로 명시.
- 귀인 운세: `worker/lib/guardian-fortune-generate.js`에서 context·generator·공유 메타데이터 입력 locale 정렬, `guardian-fortune-llm.js`에서 provider 옵션에 locale 명시. **후처리의 한국어 혼입까지 해결한 것은 아니다.**
- 공통 로그에 정규화 locale 추가. 정적 미러·캐시 핀·sitemap 재생성.
- 호출 인벤토리와 12개 언어 provider/브라우저 판별 mock 가드를 PR workflow에 연결.

## 첫 번째 다음 행동: 조사표를 실제 기능 단위로 완성

현재 **43개 소스 / 105개 호출·import·REST 근거**는 기능 수나 실제 provider 호출 수가 아니다. 기능 총수·P0–P5 전체 문제 수는 미확정이다. 조사표의 🔍 항목을 정상으로 임의 변경하지 않는다.

각 기능을 화면 URL → 입력 → locale → request → handler → prompt → provider → 후처리 → 저장/캐시 → UI로 추적하고, repair/stream/재시도/후속 질문을 하위 경로로 기록한다. 계산 전용·image-only·유지보수 번역기·한국어 예약 SNS와 미사용 경로는 근거를 남겨 분리한다.

AST 스캐너는 보조 가드다. 알려진 주입형 호출 이름을 일부 명시했고 검증 스크립트를 제외한다. 동적 import, 새 래퍼/별칭, 새로운 provider의 누락 가능성을 별도 검색으로 확인한다. `--write`로 새 목록을 승인하기 전에 실제 경로를 검토한다.

## 우선 처리할 확인된 미해결 경로

1. **독립 정적 API 요청(P1)**: `geomancy-oracle-v4.html`의 `/api/oracle/geomancy` fetch는 공통 홈 runtime을 거치지 않는다. `pet-saju.html`의 apiFetch, `celestial-harmony.html`의 buildAuthHeaders, `vedic-astrology.html`의 일반/Prashna 요청, `yoga-guru.html`, `tarot-ijik.html`을 실제 locale 초기화 코드와 함께 확인한다. html lang이 고정 ko인 화면에서는 그것만 읽어 헤더를 붙이면 잘못된다. 일부 독립 normalizeLang/MAP의 vi·zh-TW 누락도 확인한다.
2. **한국어 후처리(P0/P4)**: `worker/routes/oracle.js`의 buildFallbackOracle/normalizeOraclePayload가 짧은 필드를 한국어로 대체한다. `worker/lib/guardian-fortune-result.js`는 fallback·짧은 답변 확장·CTA·shareText·목록 보완 과정에서 한국어가 섞일 수 있다. 공통 language instruction만으로 해결되지 않는다. 정상 비한국어 답변을 한국어 키워드 부재로 거절하지 않되 품질·안전 검사를 통째로 우회하지 않는다.
3. **저장·배치(P2/P3)**: `worker/routes/ziwei-deep-report.js`의 저장본/이어가기 토큰에 locale이 없고 idempotencyKey로 재사용한다. `worker/routes/vedic-ai.js`의 startLocks와 저장 조회도 userId+idempotencyKey 기준이다. 결제 키를 임의로 언어별 변경하지 말고 기존 증빙과 생성 결과 locale을 구분한다. 신규 저장 locale, legacy 무locale 결과, 다른 언어 요청의 재사용을 mock으로 검증한다.
4. **늦은 응답·후속 대화**: 시작 locale을 결과에 귀속하고 언어 변경 뒤 도착하는 응답이 새 언어 화면 결과를 덮지 않게 한다. 모든 renderer, 재생성, 후속 질문, streaming 완료/오류/reconnect를 추적한다. 공통 resume 테스트 통과는 모든 결제 화면의 복귀 검증이 아니다.
5. **휴먼디자인 UI/PDF(P4)**: `lib/human-design/report-plan.js`의 부가 T 라벨은 ko/en, 도표 용어는 기존 5개 언어(나머지 영어 fallback), `lib/pdf/export-human-design-report-pdf.ts`는 ko/en 분기를 사용한다. 기존 PDF 폰트의 일본어·중국어·Hindi glyph 검증도 없다. 12개 본문/장 제목 지원과 전체 UI/PDF 지원을 혼동하지 않는다.
6. 다른 모든 기능의 로딩·오류·결정론 fallback·PDF·용어집과 전체 renderer fixture를 확인한다. React/static, 로그인/비로그인, 무료/유료, 모바일 360–430px/데스크톱의 실제 렌더링 검증이 남았다.

## 검증 증거와 한계

구현 SHA `16846f0f0`에서 최종 `npm run ci:preflight` PASS:

- Node 981 tests, Jest 221 suites / 2455 tests
- 결제 회귀 86/86, lint·TypeScript·Pages/Worker build·public mirror 정합
- `node scripts/audit-ai-locale-calls.mjs --check`: 43 files / 105 evidence points
- `node scripts/verify-ai-locale-browser-contract.mjs`: locale 판별 VM 검사 PASS(실제 전체 화면 검증 아님)
- `node scripts/verify-ai-locale-provider-contract.mjs`: 12개 언어 Gemini/fallback/retry/repair, 캐시 분리, alias/body/context 격리 PASS(실제 transport stub)
- 관련 Jest: locale 14, checkout 62, guardian 30 PASS
- GitHub 체크 11개 SUCCESS. 초안이라 원격 Build 잡의 성공만으로 실제 빌드 실행을 주장하지 않는다. 빌드 실행 증거는 로컬 ci:preflight다.

실제 모델의 언어 준수·상담 문체·전문용어·간체/번체 품질은 **실제 LLM 호출 검증 필요**. 임의 실행 금지.

## 환경과 검증 함정

- 원래 `D:\Development\code-destiny` 공유 체크아웃의 미커밋 변경을 보존했다. 거기에서 편집하지 않는다.
- 이 워크트리 node_modules는 `npm ci --ignore-scripts`로 설치한 전용 디렉터리다. `.codex-tmp/shared-node_modules`는 원래 공유 node_modules를 가리키는 보존된 junction이다. 그 타깃을 삭제하지 않는다.
- 중단한 사전검사 snapshot이 `D:\Development\.preflight-*`에 남았을 수 있다. 다른 작업의 워크트리와 혼동해 정리하지 않는다.
- 임시 산출물은 `.codex-tmp/`에 둔다. 루트의 임시 JSON은 preflight snapshot에 포함될 수 있다.
- static 변경 시 `npm run sync:public`, `npm run sitemap:generate`, `npm run verify:public-mirror-fresh`, `npm run verify:payment-choice-parity`를 수행한다. 독립 `public/ifa-oracle.html`, `public/static/geomancy-oracle-v4.html`의 checkout 캐시 핀은 자동 동기화되지 않았다. 현재 구현 핀은 `build-d2987b1ff23f`이며 다음 변경 시 검사기가 유도한 새 값을 쓴다.
- 한국어 지시 추가로 기존 systemInstruction 정확 일치 가드 기대값을 갱신했다. 휴먼디자인 순수성 가드는 report-plan/report-sections의 canonical locale-normalize import만 좁게 허용했다. 계산 엔진의 외부 import 금지는 유지한다.
- 소스 또는 main이 바뀌면 이전 preflight receipt는 최신 검증이 아니다. 필요한 mock/검사를 실행하고 다음 코드 전달 전에 최종 preflight를 다시 통과한다.
- 다른 PR의 공통 정적 미러 변경과 겹칠 수 있다. `worktree:status`로 확인하고, main 통합 후 생성기를 재실행한다. 새 세션이 임의 머지·배포하지 않는다.

## 복사해서 재개

```powershell
Set-Location 'D:\Development\code-destiny-llm-locale-20260909'
Get-Content 'D:\Development\code-destiny-llm-locale-20260909\docs\handoff\llm-locale-remaining-2026-09-09.md'
git status --short
git branch --show-current
gh pr view 1860 --json state,isDraft,headRefOid,mergeable,statusCheckRollup
npm run worktree:status
node scripts/audit-ai-locale-calls.mjs --check
```

확인할 브랜치는 `codex/llm-locale-completion-20260909`다. 첫 작업은 위 조사표를 기능별로 완성하면서 독립 정적 요청과 한국어 fallback 후처리의 확인된 누락을 수정하는 것이다. 전체 Acceptance Criteria와 A–G 보고를 완성할 때까지 같은 초안 PR에 이어서 전달한다.
