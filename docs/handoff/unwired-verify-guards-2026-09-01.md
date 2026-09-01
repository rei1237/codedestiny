---
status: active
updated: 2026-09-01
next: 아래 6개 중 `verify-portone-webhook-signature.mjs` 부터 — 단언을 jest 로 옮길지 package.json 에 배선할지 사용자에게 묻는다
---

# 미배선 verify 스크립트 6종 — 배선인가 이관인가

## 왜

레포 전수 정리(워크트리·산출물·죽은 코드) 중 **참조 0건 스크립트 17개**가 나왔다. 3면 감사 후 10개는 지웠고, 6개는 "죽은 게 아니라 배선이 안 된 것"이라 판정을 미뤘다.

## 지금 상태

- PR #1416·#1418 머지 완료 — `.ignore` 정정과 스크립트 10개 삭제까지 끝났다.
- 아래 6개는 **손대지 않았다.** 저장소에 그대로 있고 `package.json` 에도 없다.
- `verify:guard-wiring` 은 이들을 잡지 못한다 — 그 가드의 universe 는 `scripts/` 디렉터리가 아니라 **`package.json` 의 `verify:*` 키**다(`scripts/verify-guard-wiring.mjs:294`). 즉 "미배선으로 걸리고 있다"는 가설은 기각됐다.

## 남은 작업

6개 각각에 대해 **배선(package.json 등록) / jest 이관 / 삭제** 중 하나를 고른다. 판정 기준은 "이 스크립트가 사라지면 단언이 0이 되는 제품 코드가 있는가".

- [ ] `verify-portone-webhook-signature.mjs` — 🔴 **결제 축, 먼저 처리.** `worker/routes/payments.js:240-242` 의 `x-webhook-*` 별칭 분기를 단언하는 유일한 코드(해당 스크립트 38-49행). 나머지 단언은 `__tests__/worker/payments-v2.webhook.test.js:60-97` 이 이미 덮는다 → **별칭 케이스만 그 테스트로 옮기면 삭제 가능.**
- [ ] `verify-admin-monthly-credit-grant.mjs` — `worker/routes/admin-monthly-credits.js:239` 의 `__adminMonthlyCreditGrantTestUtils` 유일 소비자. 지운다면 그 export 도 함께(워커 크기 축).
- [ ] `test-saju-ai-prompt-advanced-factors.mjs` · `test-saju-calibration-prompt.mjs` — `worker/lib/saju-calibration.js` 의 유일한 실행 경로. `__tests__` 커버리지 0건.
- [ ] `verify-ziwei-deep-counseling-quality.cjs` — `app/_lib/generate-ziwei-deep-chapter.ts` 를 제품 코드 밖에서 실행하는 유일한 코드. **배선된 `verify:ziwei-deep-report-flow` 와 단언이 중복인지 미대조.**
- [ ] `verify-famous-saju-magazine.mjs` — 배선된 `verify:famous-saju-editorial`·`verify:famous-saju-multisystem`(`package.json:37-38`)과 **단언 중복인지 미대조.** `docs/orphan-audit/03-plan.md` B-8 이 "삭제 금지 권장"으로 등재.

## 정본 예시

`scripts/verify-guard-wiring.mjs:294` — 배선 판정의 universe 가 어디서 오는지.

## 함정

- 🔴 새 `verify:*` 를 배선하면 워크플로 트리거 `paths` 에도 넣어야 한다 — [[new-verify-script-must-be-wired]].
- 🔴 삭제 방향으로 가면 3면이 아니라 **6면 `git grep`** 이다(+ `public/**` 미러 · `.github/workflows` · `docs`). `.ignore` 가 미러를 rg 에서 빼므로 반드시 `git grep`.
- 결제 축을 건드리면 `config/payment-freeze.json` 매니페스트를 같은 커밋에 갱신.

## 검증

```
npm run verify:guard-wiring
npm run check:critical
npx jest __tests__/worker/payments-v2.webhook.test.js
```

## 모르는 것

- 위 두 "미대조" 항목(ziwei·famous-saju)은 파일 본문을 서로 비교하지 않았다. **추측으로 중복이라 단정하지 말 것.**
- 6개 전부 "배선이 원래 의도였는지, 1회성 도구였는지"는 커밋 메시지로도 확정하지 못했다 — 사용자에게 물어야 한다.

## 이 작업과 무관하게 남은 것

- 로컬 브랜치 183개(`: gone]`) 삭제 — 오토 모드 분류기가 일괄 삭제를 막는다. 디스크 이득은 0에 가까워 선택 사항.
- `reports/unused-files-report.json` 의 unusedCandidates **980건** 스윕 — 별도 세션 과제.
