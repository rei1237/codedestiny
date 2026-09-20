---
status: active
updated: 2026-09-20
next: "①승격은 완료·실측 확인됐다(운영 Pages·Worker 모두 bd144f4e64a4). 남은 것은 **소진된 10장의 재생성 승인** — `LLM_PARTNER_EVIDENCE_MISSING`·`LLM_OUTPUT_TOO_SHORT` 표본 1건의 원인을 먼저 보고 비용과 함께 사용자에게 확인받는다. ②크론 자가 치유가 남은 117장을 재생성하는 중이므로 몇 시간 뒤 `node scripts/audit-master-love-codex-incomplete.mjs --db code_destiny` 로 진척을 본다(운영 읽기 전용 승인 3회는 모두 소진 — 추가 조회는 재승인 필요). ③20장 완주 실호출은 여전히 미검증이다."
---

# 마스터 인연의 서 — 부분 생성 장애 근본 수정 · 복구 · 운영 승격

이전 인수인계 2건([09-17 chapter1-only](2026-09-17-master-love-codex-chapter1-only.md), [09-18 dedupe-fix](2026-09-18-master-love-codex-dedupe-fix.md))의 인연의 서 항목은 이 문서로 닫는다. 두 문서에 남은 카카오페이 복귀 항목은 그대로 유효하다.

## 확정된 원인 (A·B 둘 다 성립, 화면에 보이던 것은 B)

정본 구성은 **모드당 5막 × 4장 = 20장**이다. 화면의 I~V는 장이 아니라 막이다.

- **B — 앞구간 절단.** `worker/routes/master-love-codex.js` 저장 1386 · 충돌복구 1424 · 조회 `publicSession` 749 가 "첫 구멍에서 break" 했다. 2장이 실패하면 DB에 3·4장이 있어도 API가 1장만 준다. 지연 로딩 분리가 아니다 — `/session` 은 목차와 본문을 함께 주는 단일 API고, 잘린 것은 목록 자체다.
- **A — 한 장이 책을 죽임.** 같은 파일 1339-1351 에서 `attempts >= 3` 인 장이 하나라도 있으면 세션 전체가 `generation_failed` + `reviewRequired` 가 되고, `handleGenerate`·`runCodexBatches`·크론 `buildAbandonedFilter` 세 경로가 모두 그 세션을 건너뛴다.
- 프런트는 그 부분 상태를 완성본으로 그렸다 — `CodexSeal` 이 `completed` 가드 없이 렌더, 탭 `disabled={!isReady}`, 장 수 표기가 받은 길이, 하단 CTA 가 `/destiny-island.html`, 게이지가 서버가 아닌 화면 추정.
- **가드가 결함을 정답으로 고정하고 있었다** — `verify-master-love-codex-flow.mjs:399` 와 `verify-master-love-codex-batch-budget.mjs:85-116` 이 "앞쪽 연속분만 커밋"을 단언했고, 그 대상 `planBatchCommit` 은 운영 호출부 0의 죽은 코드였다. `paid-flow-gates.yml` 트리거에는 `worker/routes|lib/master-love-codex-*` 가 빠져 워커만 고치면 유료 게이트가 깨어나지 않았다(fail-open).

**이전 수정이 해결하지 못한 이유**: `f1dd780a4`(실출력 게이트)·`6a3cbe2de`(중복 판정 키)는 장이 게이트에서 탈락하는 **빈도**만 낮췄고, 영구 정지 구조와 앞구간 절단은 건드리지 않았다. `4e589d650` 의 크론 재개는 `LLM_OUTPUT_REPEATED` 로만 닫힌 세션에 1회만 적용된다.

## 무엇을 고쳤나

커밋 11건(`605fee56d..bd144f4e6`, `git log --oneline` 이 정본). 축별로:
서버 절단 제거 + 시도 가능한 장만 배치 + `reviewRequired` 판정을 "미완 전부 소진"으로 좁힘 / `generationProgress` 확장(`validated`·`finalized`·`percent`·`step`·`outline`) + 크론 일반 재개 / 가드·유료 게이트 트리거 갱신 / 리더가 구매 구성 기준 전 20장 렌더 + 봉인 가드 + 하단 CTA 를 정확히 '보관함'(`/master-love-codex#codex-library`, 기존 지도 핸들러 제거) / 게이지 서버 연동 / 감사·복구 스크립트 2종.

완료 조건은 개수 비교가 아니라 **기대 id 전체 + 장별 하한 + 재조회 검증**이다(1435 부근, 기존 조건 유지).

## 증거 (운영 읽기 전용 조회, 본문·개인정보 무출력)

- 감사: 8세션 · 완주 0 · `generation_failed` 3 / `generating` 5 · 궁합판 6 / 개인판 2 · 환불 0. 부류 (a)0 (b)1 (c1)8 (c2)0 (d)2. **미생성 127장**(시도가능 117 · 소진 10). 오류코드 `LLM_OUTPUT_TOO_SHORT` 3 · `LLM_JSON_INVALID` 1 · `LLM_PARTNER_EVIDENCE_MISSING` 1 · `LLM_EVIDENCE_INVALID` 1.
- 원인 B 직접 증거: `mlc-e6f6…fe2c` 저장 9 / 노출 1, `mlc-531c…8b22` 저장 8 / 노출 1.
- 🔴 **읽기 경로 수정만으로 이 두 건은 DB 쓰기 0으로 전 장이 노출된다** — `savedChapterRows`(:756)가 `chapters` 와 `deliveryMeta.savedChapters` 를 합집합으로 읽는다. 메타데이터 복구는 저장 문서 정리이지 화면 복구의 전제가 아니다.
- 복구 dry-run: 8 스캔 · 3 계획 · 0 적용 · 0 차단 · 예상 재생성 37장.

## 테스트 (mock 과 실호출을 구분한다)

- **mock/픽스처**: A–O 전 항목 통과. `npm run test:jest -- __tests__/worker/master-love-codex` + `node --test __tests__/ui/master-love-codex-*.behavior.test.js`. 수정 전 실패 → 후 성공을 확인한 재현 테스트가 원인 B(`publicSession`)와 원인 A(한 장 소진)에 각각 있다.
- **실제 LLM**: 스테이징 Gemini **8회(승인 전량 소진)**. 개인판 4회 → 4장 저장·노출. 궁합판 4회 → 3장 저장(`02 self` 가 운영과 같은 `LLM_PARTNER_EVIDENCE_MISSING` 으로 실패)인데 **1·3·4장이 그대로 노출되고 세션은 `generating` 유지** — 구멍 뒤 장의 생존·노출을 실모델로 확인했다.
- 🔴 **미검증**: 20장 완주 실호출(승인 범위 밖), 크론 재개의 실행 경로(스테이징 `crons = []` 라 운영에서만 관측 가능). 모바일은 390px **에뮬레이션**이며 실기기 확인은 사용자 몫.

## 배포 (실측 확인 완료)

- 기준 `605fee56d` → 승격 `bd144f4e64a4c76a01c0050dc51e30683e141e16`. 운영보다 **110커밋** 앞섰다(계획서의 "약 30커밋"은 오기). 99건은 이번 건과 무관한 타 세션 작업이고 릴리스 관례대로 함께 나갔다.
- 스테이징: dispatch 런 35488216316 → `verify:staging --sha=bd144f4e64a4…` PASS.
- 프로덕션: 릴리스 런 **35492906482** (`release :: success`, `rollback :: skipped`). Pages 배포 `79829626-5926-4f20-a8a4-c1a03450bf34`, Worker 버전 `5b69b556-5dd6-463d-bdbe-508be2d8592e`(`worker_promoted=true`).
- 🔴 **워크플로 통과와 별개로 직접 확인**: 캐시 무력화 요청으로 `/version.json`·`/api/version` 둘 다 `bd144f4e64a4c76a01c0050dc51e30683e141e16`, buildTime `2026-09-20T06:04:23.976Z`. `npm run verify:deployed-sha` PASS.
- 운영 워커 동작 확인(무인증): `GET /api/master-love-codex/plan` 이 개인판 20장(`gate…letter`), `?mode=compat` 이 궁합판 20장(`facing/self/other…letter`)을 서빙한다.
- 복구 적용(운영 쓰기, 승인 범위 `--metadata-only`): 8세션 조회 · **2세션 반영** · 보류 0 · 추가 LLM 0. `mlc-e6f6…fe2c` 노출 **1→9**, `mlc-531c…8b22` 노출 **1→8**. 결제·구매 권리 무변경. 되돌리기용 before-image 는 `deliveryMeta.repairSnapshot` 과 `backups/migrations/master-love-codex-repair-code_destiny.before.json`(gitignore 대상).
- 롤백: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=rollback` (Pages `871e3ed3-5833-4ad2-8312-b643355782a1` / Worker `69e4f375-cf12-441d-a8fe-b2563c025881`). 부분은 해당 커밋만 `git revert`. **코드 롤백과 데이터 복구는 분리한다** — `reset --hard` 나 유료 결과 일괄 삭제로 대응하지 않는다.

## 함정

- 🔴 **릴리스 런이 green 이어도 main 이 나간 것이 아닐 수 있다.** `target_sha` + `pages_only` 는 "지금 라이브인 커밋의 Pages 재발행" 전용 입력이다. 2026-09-19 런 35451404468 은 `mode=production` 인데 `target_sha=8df4768d4…` 라 8df4768d4 를 다시 올리고 "8df4768d4 맞다"로 통과했다. 승격할 때는 두 입력을 **비워 둬야** `github.sha` 가 대상이 된다. 확인은 항상 `/version.json` 과 `/api/version` 을 캐시 무력화로 직접 읽어서 한다.
- `GET /api/master-love-codex/plan` 의 `mode` 는 `compat` 축약형만 받는다. 상품 id(`master-love-codex-compat`)를 넣으면 조용히 개인판 구성이 돌아온다.
- `scripts/verify-guard-wiring.mjs` 는 fail-closed 3중이다. 새 `verify:*` 는 CI 게이트에 배선하거나 `UNWIRED_BY_DESIGN` 에 사유와 함께 선언해야 한다(실호출 하네스가 그 경우).
- 윈도우에서 한글·이모지 앵커를 `python -` 로 패치하지 말 것(cp949 로 깨진다). heredoc 파일 + `awk` 삽입을 쓴다.

## 모르는 것

- 소진된 10장이 재시도로 통과할지. `LLM_PARTNER_EVIDENCE_MISSING`·`LLM_OUTPUT_TOO_SHORT` 는 프롬프트·증거 구성 문제일 수 있어, 재생성 승인 전에 표본 1건으로 원인을 먼저 봐야 한다. 추측으로 대량 재생성하지 않는다.
- 크론 자가 치유가 틱당 3세션을 재개하므로 배포 후 수 시간에 걸쳐 약 117장이 자동 재생성된다. 실제 소요 시간과 성공률은 운영에서만 관측된다.

## 검증

```
npm run test:jest -- --runInBand __tests__/worker/master-love-codex
node --test __tests__/ui/master-love-codex-*.behavior.test.js
npm run verify:master-love-codex-flow && npm run verify:master-love-codex-budget
npm run verify:deployed-sha -- --sha=bd144f4e64a4c76a01c0050dc51e30683e141e16
node scripts/audit-master-love-codex-incomplete.mjs --db code_destiny
```
