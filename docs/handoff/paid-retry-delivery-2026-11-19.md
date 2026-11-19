---
status: in-progress
updated: 2026-11-19
next: "R0 — 현행 실패 경로 지도 작성(대표 7종: 실패·정체 시 상태·환불·클라이언트 표시·재시도 진입점)"
---

# 유료 LLM "다시 시도로 반드시 결과 받기" 인수인계

## 요청 원문 (2026-11-19)
> 네오 환불은 다시 시도가 가능하도록 그리고 신년 운세 등 대표 상담들도 전달 실패할 경우에 다른 기능들도 다시 시도를 통해서 반드시 결과를 받을 수 있도록해주고 컨텍스트가 너무 길어졌으니 인수인계해서 진행하자

앞 세션 760e7f24(상태 파일 `.claude/state/760e7f24.md`, 계획 `C:\Users\user\.claude\plans\lazy-finding-kay.md` 의 S16 절)에서 이어진다.

## 첫 행동
1. `git branch --show-current`·`git status`·`git pull --ff-only`. 루트 체크아웃은 다른 세션(iOS)이 쓰고 있을 수 있으니 `scripts/create-safe-worktree.ps1 -Slug paid-retry` 로 워크트리를 만든다.
   - PS 5.1 에서 git stderr 때문에 스크립트가 중간에 멈추면 남은 단계(`node scripts/setup-git-merge-drivers.mjs`, node_modules 정션, `.env.local`·`.env.cloudflare.local` 하드링크)를 손으로 한다.
   - 새 워크트리는 `npm run fortune:build-data` 를 먼저 돌려야 check:fast 가 된다.
2. 이 문서의 단계 체크박스를 보고 `next` 부터 진행한다.

## 지금 상태
- main = `b3b77221c` 시점에 작성. 운영 = `25d9bc034`(2026-11-19 Release run 44501694109 성공, S13·S15·S16 반영).
- 이 작업용 워크트리·브랜치는 아직 없다.

## 승인 상태
- 이 요청은 **코드 수정·main push(스테이징 배포까지)** 승인이다.
- 🔴 **운영 승격은 승인 없음.** 끝나면 결과를 보고하고 사용자에게 1회 승인을 받은 뒤에만 Release production 을 dispatch 한다. push 를 승격 승인으로 확대하지 않는다.
- 과금 LLM 실호출 승인 없음 → 전부 mock(`scripts/run-mock-tests.mjs`, LLM_DRY_RUN).
- 실결제·운영 DB 쓰기·환불 실행 금지.

## 설계 (가정 — 최종 보고에 명시하고 사용자 확인을 받는다)
현재(S16): 대표 6종은 완성본만 전달하고, 진전 없이 약 1시간이면 `generation_failed` + 자동 전액 환불(`worker/lib/paid-delivery-stuck.js` `settleStuckConsultation`). 신년운세는 기존 구제·환불 경로.
사용자 요구: 실패해도 **다시 시도로 결과를 끝까지 받게** 한다. 그래서 정책을 "실패 → 즉시 환불"에서 **"실패 → 다시 시도 가능(무료) → 끝내 못 받으면 환불"** 로 바꾼다.

1. **다시 시도 가능 상태**: 생성 실패·정체로 끝난 건은 결과를 숨긴 채 `retryable` 로 둔다(상태명은 기존 enum 을 확인해 최소 추가). 고객 화면에는 "생성이 잠시 막혔어요 — 다시 시도" 버튼과 "추가 결제·차감 없음" 문구를 보인다.
2. **다시 시도 동작**: 완성된 장은 보존하고 **빠진 장만** 다시 생성한다. 추가 결제·이용권 차감·라운드 차감 없음. 같은 결제 건(주문·이용권 증빙)에 묶어 다른 계정·다른 입력으로는 재사용할 수 없게 한다. 동시 클릭은 기존 lock(`llmMeta.lockedAt`/lease) 으로 하나만.
3. **자동 재시도 먼저**: 고객이 누르기 전에 복구 크론(`worker/lib/consultation-recovery-task.js`)이 기존처럼 이어 생성한다. 정체 판정(6회 무진전)은 이제 환불이 아니라 `retryable` 전환이다.
4. **환불은 마지막**: 다시 시도 가능 상태로 **7일**이 지나도 완성되지 않았거나, 고객이 환불을 요청하면 기존 공용 환불(`settleFailedConsultationRefund` / 카드 자동 환불 / 이용권 `refundPassUseEvidence`)로 전액 환불한다. 환불되면 다시 시도는 닫힌다(기존 환불 시 접근 회수 규칙). 7일은 기존 복구 무시 창과 맞춘다 — 코드에서 실제 값을 확인해 같게 둔다.
5. **네오 팩폭 작전실**
   - 수정 라운드: 실패 시 `retryable: true` + 라운드 미차감(`worker/routes/neo-operation-room.js:2140-2147`)은 이미 있다. 결과 페이지(`src/features/neo-war-room/NeoOperationRoomResultPage.tsx`)에서 **같은 답변으로 다시 시도 버튼**이 실제로 보이고 반복 가능한지 확인·보강한다.
   - 첫 브리핑 실패도 위 1~4 정책을 따른다(즉시 환불 → 다시 시도 우선).
6. **결과 보존 규칙 유지**: 이미 완성된 결과는 바꾸지 않는다. 완성본 판정(`is<Service>Complete`)·도중 비노출(S16)은 그대로 둔다.

## 범위·단계
대표 상담 = `lib/saju/saju-service-catalog.mjs` saju-signature 7종(흑월·네오·찻집·마스터 인연의 서·연애 비책·신년운세·인생의 책). "다른 기능들" = `scripts/verify-paid-llm-delivery-contract.mjs` 계약 목록의 나머지 유료 LLM 서비스.

- [ ] R0 지도: 대표 7종마다 실패·정체 시 상태/환불 호출 위치/클라이언트 표시/재시도 진입점(API·버튼)을 `파일:줄` 표로. 이 문서 아래 "실측"에 붙인다.
- [ ] R1 공용: `paid-delivery-stuck.js` 정체 → `retryable` 전환, 7일 뒤 환불로 이동. 공용 "다시 시도" 헬퍼(빠진 장만 재생성 대기로 되돌림, 결제 건 소유 확인). 테스트 먼저(TDD).
- [ ] R2 네오(첫 브리핑 + 수정 라운드 버튼 확인)
- [ ] R3 인생의 책
- [ ] R4 신년운세 (S16 대상 밖이었으므로 완성본 판정·비노출 여부도 먼저 확인. 비노출 추가는 하지 않고 다시 시도만 붙인다 — 요청 범위)
- [ ] R5 연애 비책
- [ ] R6 흑월(웹 + `worker/toss/native-heukwol.js` Toss 경로)
- [ ] R7 찻집 · 마스터 인연의 서
- [ ] R8 검증기: 계약 목록 각 서비스가 "실패 시 retryable + 다시 시도 경로 + 7일 환불"을 갖는지 fail-closed 로 검사(`scripts/verify-paid-llm-delivery-contract.mjs` 확장, 변이 1종으로 무는지 확인). 문서 `docs/context/ai-and-db.md` 유료 LLM 전달 계약 절 갱신.
- [ ] R9 대표 7종 머지 → `npm test --prefix apps/toss` → `npm run check:fast -- --base=<origin/main SHA>` → `node scripts/run-paid-gate-suite.mjs --base=<SHA>` → `node scripts/verify-myeongri-tables.mjs` → `npm run check:pre-push` → push → main CI(PR CI·Paid Flow Gates) 녹색.
- [ ] R10 "다른 기능들": 계약 목록 나머지 서비스에 같은 정책을 묶음별로(서비스마다 커밋). 지도 → TDD → 검사 체인 → push.
- [ ] R11 최종 보고 + 운영 승격 승인 질문(AskUserQuestion, 추천 "CI 녹색 뒤 1회 승격"). 승격 직전 `git log 25d9bc034..origin/main` 으로 다른 세션 커밋을 확인해 질문에 적는다.
- [ ] R12 정리: 워크트리 배수(`npm run worktree:remove -- <경로>`, 다른 체크아웃에서), 스크래치 삭제, 이 문서 `status: done`.

## 작업 규칙과 함정 (앞 세션 실측)
- main 직접, 브랜치·PR 없음. 워크트리 → main 머지 후 `git push origin HEAD:main`(push 전 `git merge-base --is-ancestor origin/main HEAD`).
- origin 이 자주 움직인다(iOS 세션). 머지할 때마다: `config/sitemap-lastmod.json` 충돌은 `git checkout --theirs` → `npm run sync:public` → `npm run sitemap:generate` → `node scripts/extract-saju-section-runtime.mjs --check` → `node scripts/build-saju-natal-core.mjs --check` → 미러 커밋.
- 🔴 로컬 `check:fast` 는 `verify:myeongri-tables` 와 Toss 테스트를 돌리지 않는다 — 위 R9 체인에 따로 넣었다(2026-11-19 CI 실패 원인).
- Toss 앱(`apps/toss`)에 서비스 하네스가 있다. 라우트를 바꾸면 Toss 테스트 픽스처도 깨질 수 있다(S16 에서 3건).
- 결제·환불 파일을 고치기 전에 paid-gate-auditor 로 동결 매니페스트·금지 패턴 확인.
- S16 의 인생의 책 흐름 검증기는 시도 횟수를 하드코딩한다(`verify-life-book-ai-flow`) — 시도·상태를 바꾸면 같이 갱신.
- 보관함 보존: 완성 결과는 숨기거나 지우지 않는다. 자동 삭제 TTL 은 결과에 쓰지 않는다.
- `.claude/skills/fire-your-seo-agency/` 는 남의 미추적 파일 — add 금지. `git add .` 금지, `git status`·`git diff --stat` 확인 후 파일 지정.
- 커밋 트레일러: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## 열린 후속 (이번 범위 밖, 보고만)
S15 품질: 한자 증가, 연애 비책 용신 데이터("금") vs 판정(토) 불일치, 흑월 근거 실패 3→5, '조심'인데 '기회' 톤. 연애 비책 정체 환불 재시도가 `refundEligibleAt` 미사용. 마스터 인연의 서 운영 스크립트 재개방 위험 미확인. S14 프롬프트 최적화 대기.

## 실측
(단계별로 여기에 추가)
