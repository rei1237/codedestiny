---
status: active
updated: 2026-09-02
next: 남은 2개 `verify-ziwei-deep-counseling-quality.cjs`·`verify-famous-saju-magazine.mjs` — 배선된 verify 와 단언 중복인지 먼저 대조
---

# 미배선 verify 스크립트 6종 — 배선인가 이관인가

## 왜

레포 전수 정리(워크트리·산출물·죽은 코드) 중 **참조 0건 스크립트 17개**가 나왔다. 3면 감사 후 10개는 지웠고, 6개는 "죽은 게 아니라 배선이 안 된 것"이라 판정을 미뤘다.

## 지금 상태

- PR #1416·#1418 머지 완료 — `.ignore` 정정과 스크립트 10개 삭제까지 끝났다.
- 앞 세 항목(portone webhook · admin 월정석 지급 · saju 프롬프트 2종)은 jest 이관 후 삭제했다. **남은 2개는 손대지 않았다** — 저장소에 그대로 있고 `package.json` 에도 없다.
- 세 번 다 판정이 "이관"으로 같았다: 제품 코드가 살아 있고(라우터에서 실제로 호출) `__tests__` 커버리지가 0이면, 배선(워크플로 `paths` 까지 손대야 함)보다 jest 이관이 싸고 티어와 무관하게 항상 돈다.
- `verify:guard-wiring` 은 이들을 잡지 못한다 — 그 가드의 universe 는 `scripts/` 디렉터리가 아니라 **`package.json` 의 `verify:*` 키**다(`scripts/verify-guard-wiring.mjs:294`). 즉 "미배선으로 걸리고 있다"는 가설은 기각됐다.

## 남은 작업

남은 2개 각각에 대해 **배선(package.json 등록) / jest 이관 / 삭제** 중 하나를 고른다. 판정 기준은 "이 스크립트가 사라지면 단언이 0이 되는 제품 코드가 있는가".

- [x] `verify-portone-webhook-signature.mjs` — **jest 이관 후 삭제 완료.** 별칭 단언을 `__tests__/worker/payments-v2.webhook.test.js` 의 「기존 구현과 동일하다」 블록으로 옮겼고, 신구 두 구현(`worker/routes/payments.js:240-242` · `worker/payments/webhook.js:127-129`)을 함께 단언한다. 별칭 분기를 지우면 그 테스트 1건만 실패하는 것을 실측했다.
- [x] `verify-admin-monthly-credit-grant.mjs` — **jest 이관 후 삭제 완료.** 7개 단언을 `__tests__/worker/admin-monthly-credit-grant.test.js` 로 옮겼다. `__adminMonthlyCreditGrantTestUtils` export 는 **남긴다** — 이제 그 jest 스위트가 소비하며, `worker/routes/admin.js` 의 `__adminEntryTestUtils` 와 같은 레포 관행이다. 변이 4종(플래그·상한·멱등키 패턴·sourceId)을 넣어 각각 1~2건이 실패하는 것을 실측했다.
- [x] `test-saju-ai-prompt-advanced-factors.mjs` · `test-saju-calibration-prompt.mjs` — **jest 이관 후 삭제 완료.** 둘 다 LLM 실호출 0건(순수 프롬프트 빌더, `fetch`/키 참조 없음)이라 과금 규칙 1과 무관했다. 🔴 **두 스크립트는 이미 죽어 있었다** — `worker/lib/fortune-question-prompt.js` 가 `fortune-reasoning-contract.js` 를 새로 import 하는데 tempdir 복사 목록이 안 따라가 `ERR_MODULE_NOT_FOUND` 로 즉사했고, `promptVersion` 단언도 `v4`(현재 `v6`)로 낡아 있었다. 이관처: `__tests__/worker/saju-calibration-prompt.test.js`(5건) · `__tests__/worker/saju-ai-prompt-advanced-factors.test.js`(11건). 십성표·rubric 은 기존 `saju-ai-prompt-domain-templates.test.js` 와 중복이라 옮기지 않고, 거기에 없던 프롬프트 고정문 2건만 그 스위트에 보탰다.
- [ ] `verify-ziwei-deep-counseling-quality.cjs` — `app/_lib/generate-ziwei-deep-chapter.ts` 를 제품 코드 밖에서 실행하는 유일한 코드. **배선된 `verify:ziwei-deep-report-flow` 와 단언이 중복인지 미대조.**
- [ ] `verify-famous-saju-magazine.mjs` — 배선된 `verify:famous-saju-editorial`·`verify:famous-saju-multisystem`(`package.json:37-38`)과 **단언 중복인지 미대조.** `docs/orphan-audit/03-plan.md` B-8 이 "삭제 금지 권장"으로 등재.

## 정본 예시

`scripts/verify-guard-wiring.mjs:294` — 배선 판정의 universe 가 어디서 오는지.

## 함정

- 🔴 새 `verify:*` 를 배선하면 워크플로 트리거 `paths` 에도 넣어야 한다 — [[new-verify-script-must-be-wired]].
- 🔴 삭제 방향으로 가면 3면이 아니라 **6면 `git grep`** 이다(+ `public/**` 미러 · `.github/workflows` · `docs`). `.ignore` 가 미러를 rg 에서 빼므로 반드시 `git grep`.
- 결제 축을 건드리면 `config/payment-freeze.json` 매니페스트를 같은 커밋에 갱신.
- 🔴 **남은 2개도 먼저 그냥 실행해 볼 것** — 미배선 스크립트는 조용히 썩는다. saju 2종은 tempdir 복사 목록이 낡아 로드 단계에서 죽어 있었고, 단언 하나(`validateSajuAIResultText` 가 길이 하한 없이 통과)는 제품이 하한 11,500자를 되살려 사실과 반대였다. **스크립트 본문을 사양으로 읽지 말고 현재 코드로 재측정한 뒤 옮긴다.**

## 검증

```
npm run verify:guard-wiring
npm run check:critical
npx jest __tests__/worker/payments-v2.webhook.test.js __tests__/worker/admin-monthly-credit-grant.test.js
npx jest __tests__/worker/saju-calibration-prompt.test.js __tests__/worker/saju-ai-prompt-advanced-factors.test.js __tests__/worker/saju-ai-prompt-domain-templates.test.js
```

## 모르는 것

- 위 두 "미대조" 항목(ziwei·famous-saju)은 파일 본문을 서로 비교하지 않았다. **추측으로 중복이라 단정하지 말 것.**
- 6개 전부 "배선이 원래 의도였는지, 1회성 도구였는지"는 커밋 메시지로도 확정하지 못했다 — 사용자에게 물어야 한다.

## 이 작업과 무관하게 남은 것

- 로컬 브랜치 183개(`: gone]`) 삭제 — 오토 모드 분류기가 일괄 삭제를 막는다. 디스크 이득은 0에 가까워 선택 사항.
- `reports/unused-files-report.json` 의 unusedCandidates **980건** 스윕 — 별도 세션 과제.
