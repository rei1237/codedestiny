---
status: active
updated: 2026-09-29
next: "Astra: 재시도 비용 최적화와 경미한 근거 오류의 전달 정책을 먼저 구현·mock 검증한다. 기존 변경을 main에 전달하고 정확한 SHA의 CI를 통과시킨 뒤 v7 ON·운영 반영. 추가 실 LLM 호출 없이 진행한다."
---

# Astra 인수인계: LLM 재시도 비용 최적화와 v7 운영 반영

## 가장 최근 사용자 요청이 우선

2026-09-29 사용자가 기존 계획을 다음과 같이 변경했다.

1. 모든 LLM 상담에서 재시도 때문에 비용이 커지는 문제를 최적화한다. 사용자는 “재시도가 너무 많아서 비용이 올라가니까 이런 문제 자체를 없도록 최적화해달라는 의미야”라고 확인했다. **전체 리포트를 LLM 호출 한 번으로 합치라는 요구가 아니다. 최초 장별 생성은 허용하고 추가 생성·보정·재시도 비용을 제거하는 방향**이다.
2. “근거가 다소 잘못되더라도 미완료로 하지말고 어느정도 괜찮다면 고객에게 전달되도 괜찮아.” 경미한 근거·해석 오류나 짧은 응답을 이유로 새 호출을 구매하거나 유효한 상담 전체를 폐기하지 않는다. 기존 ‘의미 기준 미달이면 무조건 미완료’ 방침을 그대로 적용하면 안 된다.
3. **v7 ON 후 운영 반영까지 승인했다.** 이전 계획의 v7 OFF·운영 배포 제외는 후속 구현의 완료 조건에서 변경됐다. 승인 범위를 반복 확인하지 않는다.
4. 마지막 요청은 **“인수인계 작업만”**이었다. 따라서 현재 세션은 비용 정책 수정·v7 ON·운영 반영을 시작하지 않고 문서로 넘긴다. Astra로 모델을 실제 전환하거나 새 채팅을 생성한 것은 아니다.

최신 요청 이후 추가 실 LLM 호출은 0회다. 운영 DB 직접 수정, 실결제·환불·재정산, 다른 체계의 실생성은 이번 세션에서 실행하지 않았다. 운영 코드 반영 승인을 실결제 테스트 승인으로 확대하지 않는다.

## 작업 위치와 보존 경계

- 기본 저장소: `D:\Development\code-destiny`
- 현재 main 확인 SHA: `77ce70ebd3bdd26bceabf69afd54580f81324cb4` — 다른 UX 세션이 main을 전진시켰다. 시작 시 다시 확인해야 한다.
- **이어받을 격리 작업 디렉터리:** `C:\Users\user\.codex\worktrees\consultation-quality\code-destiny`
- main에 다른 세션의 마케팅 이미지·문구와 `next-env.d.ts` 변경이 남아 있다. reset/restore/stash 또는 `git add -A` 금지. 이 변경을 이번 커밋·운영 반영에 섞지 않는다.
- 격리 디렉터리는 앱이 관리하는 detached HEAD worktree이며 작업 브랜치·PR은 만들지 않았다. 기존 worktree를 이어 쓰고 새 worktree를 중복 생성하지 않는다.
- `node_modules`는 `D:\Development\code-destiny\node_modules`를 가리키는 junction이다. 공용 대상을 삭제하지 않는다. 모든 검증 명령에 격리 디렉터리를 명시한다.
- main 병합·push 전 다른 세션의 작업과 충돌이 없는지 다시 확인한다. 작업이 main에 전달되지 않았으므로 이 worktree를 지금 archive하지 않는다.

## 완료한 코드와 아직 미전달인 커밋

아래 세 커밋은 격리 worktree에만 있다. **main 병합·push 및 해당 SHA의 GitHub CI는 미실행**이다.

| 커밋 | 내용 |
|---|---|
| `d867c8d04` | 네 체계 단일 상담에 실제 계산 근거와 연결하는 공통 상담 지침 추가 |
| `76ac5cd6b` | 승인된 기존 checkpoint의 명시적 오프라인 이관, raw 우선 복구, 잔여 생성 범위·예산 보존 |
| `e7627c575c1b61557941aeb4dd152169f322587e` | 의도한 네 체계 prompt 변화만 회귀 해시 기준에 반영 |

변경 파일:

- `worker/yeongnyangi/prompts/domain/consultation-quality.ts`: 공통 결론→근거→조건→반대 가능성→행동·관찰 기준 및 사주/자미두수/베다/서양 점성술별 지침. 단일 체계 원본 분석에만 적용, fusion·타로·숙요·상징 상담 제외.
- `worker/yeongnyangi/providers/chapter.ts`: 기존 prompt의 domainRules에 내부 지침 연결. 출력 필드·공개 API·DB 스키마·추가 거절 기준은 만들지 않았다.
- `scripts/lib/v7-golden-checkpoint.mjs`: 해시·scope·manifest·모드·기존 시도 보존 검사 및 별도 편집본 이관.
- `scripts/yeongnyangi-v7-golden.mjs`: 명시적 import CLI, 지침 버전/해시를 내부 identity·summary에 기록. 일반 resume identity 검사는 유지.
- `__tests__/ui/yeongnyangi-consultation-quality.test.mjs`: 실제 오프라인 엔진을 사용한 네 체계 현재 티어/상담 종류 및 v7 personal/ask prompt mock 연결·배제 범위.
- `__tests__/ui/yeongnyangi-v7-checkpoint-import.test.mjs`: 원본 불변·해시 거절·시도 보존·10장 무호출 복구·잔여만 생성·완성 재개 0회·28회 상한.
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`: 78개 네 체계 현재 경로의 request hash만 갱신. 당시 prepare/id/검증 결과/manifest hash는 동일했으며 fusion·타로·숙요·spirit 기준은 바꾸지 않았다. **향후 v7 ON은 이보다 넓은 의도적 manifest 변화이므로 별도 회귀 설계가 필요하다.**

유지한 영역: 가격, 이용권·월정석·단건 결제 구조, 인증, 공개 응답 타입, DB 스키마, 기존 고객 주문·결과. 현재 `READING_V7_ENABLED=false`이며 비용 재시도 정책은 아직 고치지 않았다.

## 승인된 참치 실측: 완료, 새 호출 금지

이 실측은 후속 사용자 요청 이전에 승인된 범위에서 완료했다.

- 원본: `C:\Users\user\.codex\artifacts\v7-golden-20260929-live2\checkpoint.json`
- 원본 SHA-256: `287721af3aa391f4f0c1be11fd7df784a0a08db44b4243b971604fed47e4bbb4`
- 최종 재확인에서도 원본 SHA-256 동일. 원본 9장 저장·10번째 raw를 복구했으며 첫 10장을 별도 편집본으로 이관했다. 과거 실패/시도/사용량 기록은 그대로 보존했다.
- fixture: 양력 1998-02-28 14:30, 여성, 서울. 사주 personal, 기준일 `2026-09-29T03:00:00Z`.
- 새 artifact 디렉터리: `C:\Users\user\.codex\artifacts\v7-counseling-20260929`
- 신규 생성은 참치 11~24장 **14회**, 장별 첫 시도 성공, 신규 재시도 **0회**. 최대 28회 승인 예산을 채우기 위해 추가 생성하지 않는다.
- 첫 10장은 새로 구매하지 않았으며 이관된 편집본을 이전 장 맥락으로 사용했다. 신규 raw 및 시도 기록은 모두 저장되어 있다.
- 모델: Gemini 2.5 Flash. 지침 `four-system-counseling-v1`, 해시 `e68c2c9829259ade7c7bb1df86bf0dd55cd7d1391a2bc468e5bb68a75279310a`.
- live 명령의 `sourceSHA`는 `d867c8d04`다. 이는 상담 지침 커밋 표기이며 **전체 도구 실행 버전의 최종 커밋 SHA라고 주장하지 않는다.** 도구 코드 이력은 위 세 커밋을 함께 참조한다.
- 신규 14회 토큰: input 130,390 / output 27,531 / thinking 11,717 / cached 5,236. 기존 도구 단가·환율 가정으로 계산한 신규 비용은 약 **190.15원**이다. 참치 과거 시도까지 합산한 도구 계산 비용은 약 **383.01원**. 공급자의 실제 청구액이 아니다. 이번 결과를 다른 체계·질문 상담의 실측으로 일반화하지 않는다.
- provider generation 14회와 tokenizer 네트워크 요청은 서로 다른 지표다. ‘모든 네트워크 요청 총 14회’라고 표현하지 않는다.

### 아티팩트와 의미 검토의 한계

| 절대 경로 아래 파일 | 용도 |
|---|---|
| `continuation/checkpoint.json` | 이관한 첫 10장, 신규 14장, 원본 raw·실패·시도·토큰 기록 |
| `continuation/summary.json` | 완성 장수·원가·새 호출 수·범위·지침 해시 |
| `edited-chapters.json` | 신규 생성 이전에 사용한 첫 10장 별도 편집본·근거·이유 |
| `review-data.json` | 실제 오프라인 엔진 계산 자료와 24장별 선택 근거·manifest |
| `final-review.md` | 첫 10장 편집과 신규 14장 오프라인 교정을 구분한 읽기용 검토본 |
| `final-review.json`, `semantic-review.json` | 장별 출처 해시·근거 ID·이유 및 자체 평가 |
| `live.log`, `import-tests.log`, `invariance-final.log` | 실측·targeted 검증 기록 |
| `check-fast.log`, `check-fast-final.log` | 초기 실패와 재검증 중단 기록 |

생성 checkpoint SHA-256: `1d5ba85aac22002d66b3d11816ab698acd5f5def12cab4aae35a0c5928730c67`

자동 구조·근거 ID 검증을 통과했다고 의미 품질이 입증되지는 않는다. 신규 raw에는 다음 문제가 관찰됐다: 편인의 특별한 직관, 비견의 리더십, 부모의 실제 영향·유년 경험, 실제 자녀·후배 가정, 오행에서 신체 상태를 추론하거나 색·물건의 효능을 주장하는 문장, 대운·세운에서 특정 사건을 보장하는 표현. v7의 문장 pruning이 실제 근거 문장까지 지워 소절을 짧게 만들기도 했다.

추가 LLM 보정은 하지 않았다. 별도 `final-review.md`에서 실제 배치·기간을 다시 연결하고 경험의 가정·부재 비약·효능·확정 사건을 제거했다. 24장/87소절/약 2.8만자 검토 문서다. 기존 소절은 유지했지만 **유료 분량 납품 판정이나 실제 고객 전달 완료를 뜻하지 않는다.** 출처는 JSON에 기록되어 있다.

근거 충실성·해석 연결·주제 적합성·실행 가능성·가독성은 각각 4/5로 자체 편집 평가했다. `questionRelevance` 필드는 이번 personal 장별 주제 적합성 평가이며 실제 질문 상담의 의미 실측이 아니다. 독립 전문가 인증·적중률 증거가 아니며 raw에 대해 모두 4점 이상이라고 주장하지 않는다. 최신 사용자 요청은 경미한 오류까지 자동 보류하는 정책을 완화하는 것이므로 이 자체 점수를 새 고객 거절 게이트로 만들지 않는다.

## 검증 상태: 완료와 미완료를 구분

- 네 체계 상담 지침 targeted mock: 3/3 통과. 실제 계산 근거와 지침 연결, 네 체계 티어/상담 종류, v7 personal/ask를 검사한다. 공급자 응답 의미의 전문가 검증이 아니다.
- 이관 신규 2개 + 기존 golden 1개 targeted mock: 3/3 통과. `import-tests.log` 보관.
- 읽기 불변성 targeted: 1/1 통과. `invariance-final.log` 보관.
- 초기 `check:fast`는 node 테스트 1,855개 성공·1개 실패로 종료했다. 실패는 의도적 prompt hash 변화였고 이를 좁게 갱신한 후 targeted 검사를 통과했다.
- 다시 실행한 아래 `check:fast`는 여러 targeted guard·Worker dry-run·strict encoding 검사를 통과하고 Jest에서 오래 대기했다. 사용자의 인수인계 전용 요청에 따라 **현재 세션의 Jest PID 35664만 종료**했다. 로그의 `test:jest failed (4294967295)`는 수동 중단 결과다. 검사 성공이나 확정된 Jest 회귀로 표시하지 않는다.
- **최종 check:fast 전체 통과, main CI, staging, production 모두 미확인.** 실결제/운영 DB 쓰기/운영 배포 테스트도 미실행이다.

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\consultation-quality\code-destiny'
npm run check:fast -- --plan --base=f72ad321528550b9fbffcc872be6f5dbd0c8ce41
npm run check:fast -- --base=f72ad321528550b9fbffcc872be6f5dbd0c8ce41
node --test __tests__/ui/yeongnyangi-consultation-quality.test.mjs
node --test __tests__/ui/yeongnyangi-v7-checkpoint-import.test.mjs __tests__/ui/yeongnyangi-reading-v7-golden.test.mjs
node --test __tests__/ui/yeongnyangi-reading-invariance.test.mjs
```

재검증 전에 test 파일의 존재와 `package.json`의 mock guard를 확인한다. Jest는 공유 node_modules의 실행 파일을 쓰므로 cwd·대상 root·cache가 격리 경로를 사용하는지 조사한다. main의 다른 세션 프로세스를 종료하지 않는다.

## Astra가 먼저 구현할 비용·전달 방침

아직 구현하지 않았다. 아래 요구를 구체적인 mock 회귀로 만든 뒤 코드를 변경한다.

1. 한 번의 결제/기존 entitlement에서 필요한 각 장·부분의 최초 생성만 수행한다. 결과 재표시는 저장 데이터를 읽는다. 버튼 재클릭·queue redelivery·cron·lease 종료·fix epoch·수동 복구가 같은 부분의 추가 생성 예산을 만들지 않도록 한다.
2. provider 내부 재시도, cache 참조 실패 후 생성 재구매, 다른 provider fallback, 짧은 응답의 lengthRepair, 문체·중복·의미 평가에 따른 재생성을 각각 조사한다. HTTP 부분 처리 1건 제한은 추가 생성 비용의 상한이 아니다.
3. 유효한 응답이 있으면 원래 raw를 저장하고 로컬 정규화·중복 정리·인용 보정·문제 문장의 제한적 제거로 활용한다. 짧다는 이유로 전체를 폐기하지 않는다. **경미한 근거·해석 불일치가 있어도 읽을 만한 상담이면 고객에게 제공한다는 최신 방침이 우선**이다. ID 집합 완전 일치나 높은 문체 점수를 일률적인 재생성·미완료 조건으로 만들지 않는다.
4. 기존 총분량·완성 판정이 유효한 응답의 전달을 막는 경우도 검토 대상이다. 분량만 늘리는 추가 구매로 돌아가지 않고 남아 있는 실제 본문을 활용해 전달한다. 가격·상품 분량 표시와의 정합성을 확인하며 실제로 달성하지 않은 길이를 달성했다고 표시하지 않는다.
5. 어느 정도면 제공할 수 있는지는 읽을 만한 본문, 질문에 대한 답, 남은 본문의 양, 오류의 영향 등을 실제 회귀 사례로 정리한다. 중대한 문제와 가벼운 불일치를 같은 거절로 취급하지 않는다. 완전한 무응답이나 타인 데이터 등 쓸 수 있는 상담문 자체가 없는 경우는 내용을 지어내 완료로 만들지 않는다. 기존 결과·결제는 유지하고 재구매를 유도하지 않는다.
6. 타입/API/DB schema를 늘리기 전에 기존 raw/checkpoint/상태 계약을 활용한다. 비용 최적화를 이유로 인증·가격·환불 정책을 임의로 변경하지 않는다.

### 읽기 전용 조사에서 발견한 추가 비용 경로

현재는 읽기 전용 조사만 했다. 해당 코드를 읽고 import→호출부→예약/저장→재개 순으로 추적한다. 숫자를 전체 치환하지 않는다. DB·결제·Cloudflare deploy retry는 LLM 생성 retry와 다르므로 해당 숫자를 함께 줄이지 않는다.

| 진입점 | 현재 상태와 조사 대상 |
|---|---|
| `worker/yeongnyangi/repository.js` | automatic 3 + manual 2 + system 2 + user hold 2×2 + fix 2×3 = 최대17/장. `allowedChapterAttempts`, `claimChapter`, `reconcileAttemptLimit`, `resumeRequest`, `escalateStopped`, `resumeHeldAfterFix`, `resumeHeldByUser`. 과거 grant가 상한을 늘리는 경로도 조사 |
| `worker/yeongnyangi/service.ts` | quality repair를 다음 장 호출에 전달. ask에는 별도 분석 호출과 저장된 분석 재사용이 있음. 장수와 분석 호출 수를 혼동하지 않음 |
| `worker/yeongnyangi/providers/code-destiny.ts` | 이미 maxProviderAttempts=1 / fallbackToWorkersAI=false. 여기만 수정해도 repository의 추가 구매를 막을 수 없음 |
| `lib/llm-client.ts` | `callGeminiWithRetry`: 기본 최대3. cache 실패 후 무cache 재생성, Workers AI fallback. 명시적인 시도1도 무cache 재생성은 별도로 실행될 수 있음 |
| `worker/lib/gemini.js` | callLLM에 options를 전달하는 공통 진입점, ambient paid-generation context |
| `worker/lib/paid-narrative-delivery.js` | 공통11서비스, missing part 최대3, 짧은 본문 저장과 보강 |
| `worker/lib/fusion-fortune.js`, `fusion-fortune-consultation.js` | FUSION_GROUP_MAX_ATTEMPTS=3, durable 예약, failed/short/duplicate/thin 재생성 후보 |
| `worker/lib/celestial-report-delivery.js`, `relationship-report-delivery.js`, `naming-report-delivery.js` | part/후보별 최대3, 복원과 lengthRepair |
| `worker/routes/fortune.js` | 저장 part 최대4, 총분량 보강. feature AI 최초 최대2 및 끊긴 응답 completion repair |
| `worker/routes/fortune-tea-house.js` | 저장 part 최대3, lengthRepair. honey letter도 최대2 |
| `worker/routes/astrology-ai.js`, `vedic-ai.js`, `ziwei-ai.js`, `sukuyo-compatibility-ai.js` | 최대3, 짧은 본문 보강, meta/summary 별도 호출. 각 예약 검사 추적 |
| `worker/routes/ziwei-deep-report.js`, `ziwei-island-ai.js`, `nakshatra-ai.js` | 최대3, 본문 복구와 분량 보강 |
| `worker/routes/neo-operation-room.js`, `destiny-compass-ai.js`, `new-year-ai.js` | 초기/정교화/총분량에 최대3. Neo 정교화는 본인의 새 답변에 기반한 최초 생성과 같은 내용의 retry를 구분 |
| `worker/routes/master-love-codex.js`, `life-book-ai.js` | CHAPTER_ATTEMPT_LIMIT / LIFE_BOOK_MAX_SECTION_ATTEMPTS=3, 저장 draft/needsRepair |
| `worker/routes/love-secret-ai.js`, `karma-destiny-ai.js` | group 최대4/3, karma reinforcement 최대2. 분량 부족과 표시/완성 판정 확인 |
| `worker/lib/guardian-fortune-llm.js`, `tarot-oracle-llm.js` | 전자는 maxRetries 루프, 후자는 TRANSPORT_ATTEMPTS=2. 공통 경로 밖도 조사 |

이 표는 전체 경로를 빠짐없이 조사했다는 보장이 아니다. 이전 인수인계의 `report-paid-delivery-inventory.mjs`와 좁은 검색으로 일반 상담·질문·follow-up·비checkpoint helper를 포함한 호출 경로를 확인한다.

## v7 ON과 운영 반영

1. `CLAUDE.md`, `docs/context/ai-and-db.md`, `docs/context/delivery-and-ci.md`를 먼저 읽는다. main/미커밋 작업을 확인하고 격리 경로에서 계속한다.
2. 먼저 비용 방침과 경미한 오류의 전달 방침을 구현하고 mock 회귀를 통과시킨다. 높은 retry 예산을 남긴 채 v7 ON만 먼저 운영에 내보내지 않는다.
3. `worker/yeongnyangi/fortune/reading-v7.ts`의 `READING_V7_ENABLED`는 현재 false. `v7Applies`는 네 체계에 한정되지 않으며 single/v6-tier product와 해당 kind의 조건에서 **숙요·타로도 포함될 수 있다**. 사용자의 v7 ON 요청을 네 체계만의 전환으로 오해하지 않고 적용 범위를 확인한다.
4. prepare의 manifest/version/fingerprint/timing snapshot은 새 주문에 적용한다. 기존 주문을 최신 manifest로 덮어쓰거나 기존 payment로 별도 주문을 임의로 만들지 않는다.
5. `npm run check:fast -- --plan`→필요한 targeted mock→`npm run check:fast`. 의도한 v7 ON 차이에 맞춰 적용 범위와 복구를 검증한다. fail closed baseline을 단순히 없애지 않는다.
6. 검증한 변경만 commit, 현재 main과 안전하게 통합, `git push origin main`. 정확한 SHA의 `.github/workflows/pr-ci.yml` GitHub CI를 확인한다. main push는 staging 예약이며 production이 아니다.
7. 승인된 운영 반영은 `.github/workflows/cloudflare-pages-deploy.yml`, **Release Cloudflare Pages and Worker / workflow_dispatch(mode=production)**에서 수행한다. 로컬 production deploy나 break-glass를 쓰지 않는다. 실행 전 최신 main 전체 차이와 정확한 CI를 확인하며 다른 세션의 미확인 변경을 임의로 함께 배포하지 않는다.
8. release smoke·Pages `/version.json`과 Worker `/api/version`의 SHA 일치·workflow 완료를 확인한다. 이 최종 release 검증은 필요하다. 일반 push마다 staging을 폴링하지 않는다.
9. 최종 보고는 변경 파일·의도·유지한 가격/인증/계약·명령과 출력·실제 provider 호출 수·남은 확인을 포함한다. 검증 결과를 mock/실생성/production으로 구분한다.

## 재개 명령

아래는 읽기 전용이다. 기존 live 생성은 완료됐으므로 **live 명령을 재실행하지 않는다**. 먼저 본 문서의 최신 방침을 적용한다.

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\consultation-quality\code-destiny'
git show --no-patch --oneline e7627c575c1b61557941aeb4dd152169f322587e
Get-Content -Raw 'C:\Users\user\.codex\worktrees\consultation-quality\code-destiny\docs\handoff\2026-09-29-astra-llm-cost-and-v7-production.md'
Get-Content -Raw 'C:\Users\user\.codex\artifacts\v7-counseling-20260929\continuation\summary.json'
Get-FileHash 'C:\Users\user\.codex\artifacts\v7-golden-20260929-live2\checkpoint.json' -Algorithm SHA256
# 다음 행동: Astra로 추가 생성 비용 경로와 경미한 오류의 전달을 구현·mock 검증. 추가 실 LLM 생성 없이 진행. v7 ON은 수정·CI 통과 후 승인된 production workflow로 반영.
```

이전 문서: `D:\Development\code-destiny\docs\handoff\2026-09-29-llm-sequential-and-v7-golden.md`. 그 문서의 10/24 미완료·v7 OFF 게이트는 과거 시점의 기록이며, 본 문서의 24장 실측 결과와 최신 사용자 승인이 우선한다.
