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
# 2026-10-21 후속 검증

투명 영냥이 관리자 자산 및 재현 가능한 격리 통합 검증 스크립트를 추가했다. 실제 UI에서 생성·증빙·완료·되돌림·재완료를 확인했고, 실제 HQ 라우트 + 메모리 DB 검사에서 120 XP·레벨 2·레벨업 확인·업적을 검증했다. 완료 직후 업적 미갱신을 발견해 기존 업적 동기화를 연결했다.

GA4는 동일 속성·확장 기간에서 거래 대조를 계속했다. 추가 승인 거래의 GA 미표시를 확인했으나 동의·테스트·환경 조건이 불완전하여 전체 누락률은 미확정이다. 거래별 금액·시각·식별 정보는 저장소 밖 비공개 감사 기록에만 보존한다.

운영 배포 금지 요청을 유지한다. 이번 수정도 분리 브랜치에 보관하며 main 병합·push·운영 DB 쓰기·구매 보충 송신은 하지 않는다.

검증 환경 기록: 첫 check:fast의 임시 Git fixture 생성이 샌드박스 `.git/config` 쓰기 권한으로 실패했다. 해당 실행을 중단하고 절대경로 mock-network-guard, LLM_DRY_RUN=true, WORKERS_AI_ENABLED=false를 유지한 로컬 권한 실행으로 재검증했다. deploy-base-guard·llm-generation-resilience·analysis-basis-contract는 재실행에서 통과했다. 이는 운영 배포 검증이 아니다.

통합 재현: `node scripts/preview-admin-guild.mjs --verify`.
화면 재현: `node scripts/preview-admin-guild.mjs` 후 `http://127.0.0.1:4321/admin/`.
브라우저 화면은 메모리 DB를 사용하며 프로세스 종료 시 테스트 기록이 사라진다. 검증 종료 후 서버·탭·자체 임시 번들은 정리했다.

추가 측정 수정: `app/points/PointsClient.tsx`의 단건 결제 서버 확인 성공 경로에는 기존 `trackConfirmedPurchase` 호출이 빠져 있었다(정기결제 경로에는 존재). 성공 응답 뒤 기존 함수를 호출하도록 연결했다. `purchase-analytics.test.mjs`가 실제 콜백을 추출·실행해 HTTP 실패·미승인·지급 대기·확정·복구 중복을 검증하며 16/16 통과했다. 동의 기본값·구매 판정·중복 방지·결제 처리는 바꾸지 않았다. 관측된 고객 거래와 이 경로의 인과관계는 미확정이고, 과거 거래 재송신은 하지 않았다.

운영 공개 확인: `/points/`가 지연 로드하는 `/_next/static/chunks/8363.d6e6109c918e1c7c.js`에서도 단건 confirm 성공 뒤 추적 호출이 없고 subscription confirm에는 존재함을 확인했다. 공개 HTML과 webpack 매니페스트의 실제 참조를 따라 소스만 읽었으며 실행하지 않았다.

후속 최종 검증: check:fast exit 0 — paid gate 90/90, Node 3452/3452, Jest 424 suites·6738/6738, lint·typecheck·sitemap drift·Worker dry-run 포함. 별도 실제 HQ route 격리 검증 및 payment-freeze 통과. 원장 대조의 동의·식별·실제 결제 진입 경로는 미확인으로 남는다. 운영 배포·실제 GA 수집·CI 성공을 의미하지 않는다.

## 2026-10-21 운영 승격 승인

사용자가 검증 통과 후 관리자 패널·GA4 구매 추적 수정을 운영 배포하고 반영 확인하도록 승인했다. 위의 배포 보류 지시는 이번 승격에 한해 대체된다. main 통합에서 사이트맵 원장 충돌은 main 원장을 기반으로 공식 생성기로 재계산했다. 운영 실결제·가짜 구매·과거 거래 재송신은 검증에 사용하지 않는다.

방문 측정 후속: 분석 스크립트의 세 경로·동의 세 상태·중복 초기화 mock은 통과했다. Next 공통 컴포넌트에서 동의 선택 UI 연결은 여전히 확인되지 않았다. load 이후 idle 태그 주입 정책은 유지하며, 짧은 방문 누락 가능성·SPA 실제 수집·비운영 호스트 분리·동의 및 주문 연결 근거는 추가 확인 항목이다. 현재 GA 사용자 수를 실제 방문자 전체로 확정하지 않는다. 배포 성공과 거래 대조 완료는 별개다.

## 2026-10-21 방문 측정 후속 수정

이전 관리자·단건 구매 추적 릴리스 248c78801be8는 운영 Pages/Worker에 일치 반영됐다. 이번 동의·환경 분리 변경은 별도 수정이며 운영 승격하지 않는다.

- Next 공통 RuntimeClientGuards에 AnalyticsConsent를 연결했다. /, /yeongnyangi/, /points/ 직접 진입에서 미선택 상태를 표시하고 accepted/essential 호스트 쿠키를 정적 셸과 공유한다. 선택 저장 후 기존 cdSyncConsent를 호출한다. 쿠키 설정에서 철회 가능하며 저장 실패 시 granted로 바꾸지 않는다. 관리자·gift·정적 셸에는 중복 배너를 만들지 않고 앱 런타임의 기존 정책을 보존한다.
- analytics.js는 HTTPS code-destiny.com 외에서 운영 측정 ID의 태그·큐·구매 송신을 초기화하지 않는다. 별도 비운영 측정 ID를 명시한 경우만 기존 테스트 속성 경로를 허용한다. 기존 GA 영구 필터·과거 데이터는 변경하지 않는다.
- 검증: 실제 React 컴포넌트의 기본 denied/수락/거부/철회/재진입/태그 전 선택/저장 실패, 비운영 7 origin × ID 3조건, 명시적 테스트 ID, 단일 config를 격리 검사했다. 데스크톱·390px 브라우저 선택과 경로 이동도 확인했다. CSP로 외부 요청을 차단했다. Google 실제 수집 성공을 의미하지 않는다.
- /ggulggul/ 기존 동의 UI와 native app 동의 정책은 유지한다. SEO title/canonical/본문/색인 정책을 변경하지 않았다. sync:public 및 sitemap 생성기는 사용했고 sitemap lastmod 변경은 0이다.
- 고객 확인 2건: 같은 GA 속성·모든 사용자·2026-09-22~10-20 거래번호 검색에서 계속 0건. 현재 관리자 새 탭은 로그인 화면이므로 추가 주문 상세·접속 로그 조회는 미완료. 이전 읽기 전용 원장 근거는 보존한다. 단건 확인 호출 누락(이전 릴리스에서 수정)과 브라우저 복귀 없는 결제 확정은 재현된 경로이며 각 고객의 실제 원인으로 단정하지 않는다.
- 다음 대조에 필요한 최소 근거: 주문별 실제 checkout 경로, 서버 confirm 요청 시각/성공 여부, PG 웹훅 시각, 해당 방문의 분석 동의/식별 연결 근거. 개인 질문·생년월일·토큰은 필요하지 않다. 동의·GA 연결 근거가 없으면 원인과 누락률은 판단 보류한다.
- 추가 발견: NavigationProvider에 수동 SPA page_view가 있고 향상된 history 측정도 활성이라는 이전 관측이 있다. 중복 여부는 승인된 비운영 속성의 실제 수집으로 별도 검증해야 하며 이번에는 수동 이벤트나 태그 로드 시점을 임의로 바꾸지 않았다.
- 롤백: 이 후속 커밋만 revert. 가격·승인/환불·인증·DB 스키마·계산·과거 구매 재전송은 변경하지 않는다.
`Google consent default/update 참고: https://developers.google.com/tag-platform/security/guides/consent (2026-10-21 확인). Next 태그 URL 버전도 갱신하여 기존 7일 JS 캐시의 영향을 줄인다.`

후속 실측: 로그인된 기존 관리자 탭에서 두 대상 주문의 PG/DB paid, 승인 금액 일치, 제공 완료, 환불 없음, Transaction.Paid processed를 다시 확인했다. 관리자 화면의 confirmAttempts는 markOrderPaid에서 증가하며 웹훅·복구도 같은 confirmOrder를 사용하므로 브라우저 복귀 증거가 아니다. 주문 상세 API에는 과거 분석 동의·GA 식별자·실제 수집 응답이 노출되지 않아 개별 누락 원인을 확정하지 않는다. 운영 /ggulggul/ 꽃 버튼은 새 검증 탭에서 /admin/login/ 이동이 정상 재현됐다. 현재 로그인 장애 원인은 미확정이며 인증 설정은 변경하지 않았다.

검증 보완: check:fast의 paid gate 90/90 통과 후 새 테스트의 module 변수명 lint가 실패했다. compiledModule로 이름을 수정하고 해당 lint 및 실제 컴포넌트 테스트 4/4를 재실행했다. 전체 check:fast 최초 실행은 실패이며 재실행한 개별 검사와 공식 CI를 별도로 기록한다.

다음 UI 범위: 사용자가 /admin/content/ 글 편집 화면을 게임 방식으로 정돈하는 후속 과제를 지정했다. 작성·검수·발행 준비 상태를 실제 입력값으로 안내하고, 기존 저장·예약·발행·버전 기능과 서버 권한을 보존한다. 미리보기 준비율을 실제 운영 XP로 표시하지 않는다.

## 글 편집 공방 후속 UI

- app/admin/content/page.tsx와 ContentQuest.tsx, content-workshop.module.css에 기존 별빛 운영본부 스타일과 연이 자산을 적용했다. 질문·원문·검색 안내의 입력 여부와 다음 작업 위치를 보여준다. 준비 상태는 운영 XP 또는 발행 검수 통과가 아니다.
- 본 서비스 인사이트 편집과 WordPress 작업실을 구분하고, 원고 목록 폭과 보조 도구의 기본 노출을 줄였다. 본문 글자 수와 자동저장 아님을 표시한다. 저장·예약·발행·버전·API·권한 로직은 유지했다.
- 실제 React/Tiptap 화면을 localhost CSP 격리와 메모리 초안 API로 검증했다. 입력 0/3→3/3, 임시저장, 390px에서 재열기, SEO 위치 이동과 펼침을 확인했다. 운영 원고 생성·예약·발행은 하지 않았다.
- 기존 본문 인용문 border-l-4 두 곳은 디자인 검사에서 표시됐으나 카드 장식이 아닌 인용문 표시여서 유지했다. 관리자 noindex/공개 문서 SEO 정책은 변경하지 않았다.
