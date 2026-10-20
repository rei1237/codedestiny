---
status: active
updated: 2026-10-21
next: Review the operations guild locally; finish consent-aware ledger reconciliation without production deployment.
---

# WordPress 초안과 GA4 측정 검토

작업 경로: `D:\Development\code-destiny\.codex-worktrees\wordpress-ga4-measurement`
브랜치: `codex/wordpress-ga4-measurement`
기준 커밋: `c351378436d0f290cfc2b88c75c232c6b0d5fc73`

사용자 요청에 따라 분리 브랜치만 사용하며 main 통합·운영 코드 배포는 미승인이다.
WordPress 초안 88/91/95는 저장·상태 확인 완료. 이후 본문 수정은 사용자가 한다.
원고·16개 질문·자료·소개 후보·운영 기록은 `marketing/wordpress/2026-10-21/`에 있다.

## 실제 변경

- home-funnel 템플릿의 내부 링크 2개에서 UTM 제거, 기존 portal click placement 활용. 정적 미러 동기화 완료.
- 네트워크 없는 측정 mock 검사 16개 통과. 실제 수집 성공을 의미하지 않는다.
- Cloudflare 운영 code-destiny-web의 SNS_THREADS_POST_ENABLED만 split → 0으로 적용. 운영 관리자에서 off 확인.
- worker/wrangler.toml에도 0을 준비했다. 이 브랜치가 통합되기 전 다른 배포에서 기존 split 설정이 복원될 수 있으므로 다음 배포 담당자가 이 설정을 보존해야 한다.
- 공유 SNS 큐·Telegram·cron, 결제·가격·인증·DB·계산 코드 유지.

## 최초 실행 검증 (후속 결과는 아래 참고)

- sync:public, verify:analytics-events, verify-wordpress-ga4-measurement(16), diff check 통과.
- check:fast -- --plan 통과.
- check:fast 실패: paid-gate-suite 86 통과 / 4 실패.
- 실패 항목: npm test, verify:deploy-base-guard, verify:llm-generation-resilience, verify:analysis-basis-contract.
- Jest 423 suites / 6737 tests 통과. 실패 출력에는 Swiss ephemeris MOCK_NETWORK_BLOCKED / CALCULATION_FAILED가 포함된다. 전체 실패 원인 및 기준 커밋 비교는 미완료이며 기존 오류라고 단정하지 않는다.
- 실패 후 전체 검사를 반복하거나 운영 네트워크로 우회하지 않았다. 후속 빌드·CI는 미검증.

## 남은 작업

1. 관리자 운영 길드의 통합 로그인·저장 경로를 비운영 환경에서 확인한다. mock 외부 차단은 유지한다.
2. 초기 동의 UI와 SPA 페이지뷰를 분리 브라우저에서 검증하고 승인된 비운영 속성에서 수집 확인.
3. PG 승인시각·테스트/환경·동의/식별 조건을 확보해 원장 대조 분모 확정. 일부 거래 대조만 완료했으며 누락률은 미산출.
4. 원고 공개·외부 제안 발송·운영 GA 설정은 별도 검토 후 진행한다.

비공개 감사 기록은 저장소 밖 사용자 로컬 시각화 폴더에만 있다. 거래 ID·고객 정보는 이 문서에 넣지 않는다.
롤백: 코드 후보는 이 브랜치를 통합하지 않으면 운영 영향이 없다. Threads 재개는 별도 승인 후 변수 split 복원.

## 2026-10-21 후속 조사

사용자가 검사 실패 해결과 GA 구매 누락 확인을 재요청했다. 원고 수정과 운영 배포는 하지 않는다.

- deploy-base-guard 실패는 sandbox의 임시 Git config 쓰기 차단으로 재현했다. localhost 허용 환경에서 외부 네트워크 guard를 유지하자 7종 PASS.
- llm-generation-resilience / analysis-basis-contract는 localhost ephemeris fixture 접근 EACCES로 실패했다. 외부 네트워크 guard 유지, localhost 허용 환경에서 각각 1275 / 96 checks 및 프로세스 exit 0.
- Node 전체 재현: 3446개 중 3442 통과, 4 실패. 내부 UTM을 요구하던 UI 테스트 2개를 새 경로·placement·UTM 부재 계약으로 수정했다. 환경 parity 실패 2개는 staging Threads 스위치도 0으로 맞춰 해결했다. 관련 테스트 8개 통과, Node 전체 3446/3446 통과.
- 운영 고객 결제 중 GA 거래 보고서에 아직 없는 사례를 사용자 확인과 PG 읽기 전용 화면으로 확인했다. 동의 조건과 처리 지연을 구분하기 전 실제 누락률로 계산하지 않는다. 세부 거래·금액은 비공개 로컬 감사 기록에만 둔다.
- 현재 GA 보고 ID는 혼합됨이지만 행동 모델링 사용 불가 표시를 재확인했다. 운영 호스트 사용자 수도 전체 실제 사람 수와 같다고 보장할 수 없다.
- Payment의 sessionId는 상담/reportSessionId 문맥이다. 이름만 보고 GA session_id로 간주하지 않는다. 관리자 응답에서 분석 동의·GA client_id 연결 근거는 확보하지 못했다.
- 사용자가 기존 로그인 화면 사용을 허용했으나 추가 조회에서 브라우저 AX 시간 초과가 발생했다. 추가 원장 대조는 미완료이며 재로그인을 반복 요구하지 않는다.


## 운영 길드 구현 (운영 미배포)

- 연이 편집 / 네오 결제·제공 / 영냥이 검색·측정 담당. NPC 안내는 기존 실제 집계 기반이며 LLM 호출 없음.
- 집계에 결제가 없으면 영냥이가 아쉬운 표정으로 다음 점검을 안내. 결제 원천 미확인·오류·지연이면 무매출로 해석하지 않음.
- WordPress 작업실에 기존 초안 88/91/95와 편집·통계 도구 연결. 원고 수정·공개·자동 공유 없음.
- 제안 → 퀘스트 추가 → 기존 증빙 → 서버 검증 XP. 신규 채널 wordpress를 기존 관리자 퀘스트에 추가, 새 DB 구조 없음.
- 이전 SNS 작업은 보관함으로 분리, 상세 화면 진행/증빙 변경 UI 비활성화. 과거 기록과 XP 보존.
- 홈 중복 알림 요청·알림 1분 폴링·Threads 작업 스캔 제거. 기존 캐릭터 자산 유지.
- 결제창 이벤트 횟수와 고유 거래 건수를 나눠 표시하던 비율 제거. 실제 연결되지 않은 구매율을 만들지 않음.
- 정책/가격/결제 실행/인증/계산/DB 스키마 유지. 서버 변경은 관리자 요약 읽기와 퀘스트의 선택 채널 수용.

주요 파일: app/admin/_hq/OperationsGuild.tsx, app/admin/wordpress/page.tsx, app/admin/operations-guild.css, app/admin/_hq/views/{HomeView,QuestsView,QuestDetailView,ConnectionsView}.tsx, app/admin/quests/page.tsx, lib/admin-operations.mjs, worker/ops-hq/quests.js, worker/routes/admin-hq.js.

검증: NPC 판단 5개 통과, WordPress 저장·중복 방지·기존 퀘스트/XP mock 20개 통과. 데스크톱·390px 홈 시각 검사 및 제목 수정 확인. 실제 운영 저장·XP 지급은 실행하지 않음. 자세한 범위는 docs/design/admin-operations-guild.md.

추가 검사 실행 이슈: NODE_OPTIONS의 상대경로 guard 때문에 임시 폴더 하위 테스트 9개가 MODULE_NOT_FOUND로 실패했다. 운영 통신 차단을 유지하면서 guard를 절대경로로 재실행했다. 결과는 아래 최종 검증 기록을 따른다.

다음 실제 지표: KST 동일 기간의 PG 고유 승인 거래와 GA 거래, 동의·환경·처리 지연, 운영 호스트 활성 사용자/세션, WordPress 검색 클릭과 실제 상담 이동. 전체 고객과 GA 대조 가능 거래의 분모를 분리한다.

## 최종 로컬 검증

- check:fast -- --plan: exit 0.
- check:fast: exit 0. Node 3451/3451, Jest 424 suites / 6738 tests 전부 통과. lint·typecheck·sitemap drift·결제 관련 정적 검사·Worker dry-run 빌드 포함.
- 최종 알림 필터 보완 후 verify:worker-no-undef와 build:worker(dry-run) 재확인: exit 0.
- 기존 별도 deploy-base-guard 7 / llm-generation-resilience 1275 / analysis-basis-contract 96 검사 통과.
- 운영 GA 실제 수집, 완전한 원장 대조, 실제 관리자 저장·배포·CI는 미완료/미실행이다. 로컬 성공을 운영 검증으로 확대하지 않는다.
- 로그는 저장소 밖 비공개 시각화 폴더에 보존. 임시 미리보기 서버·파일 정리 완료.
