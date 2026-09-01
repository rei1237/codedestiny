---
status: done
updated: 2026-09-02
next: 없음 — 6종 전부 판정·처리 완료. 후속은 `reports/unused-files-report.json` 980건 스윕(별도 세션)
---

# 미배선 verify 스크립트 6종 — 배선인가 이관인가

## 왜

레포 전수 정리(워크트리·산출물·죽은 코드) 중 **참조 0건 스크립트 17개**가 나왔다. 3면 감사 후 10개는 지웠고, 6개는 "죽은 게 아니라 배선이 안 된 것"이라 판정을 미뤘다.

## 지금 상태

**6종 전부 처리 완료.** 판정은 둘로 갈렸고, 가른 것은 "제품 코드가 무슨 언어냐"였다.

- **jest 이관 후 삭제 (4개)** — 대상이 `.js` 라 jest 가 그대로 임포트한다. portone webhook · admin 월정석 지급 · saju 프롬프트 2종.
- **배선 (2개)** — 대상이 `.ts` 라 **jest 로는 못 옮긴다.** 🔴 이 레포의 jest 에는 TS 프리셋이 없다(`jest.config.js` 머리주석: `package-lock.json` 을 못 건드려 devDependency 추가 불가). 두 스크립트는 `ts.transpileModule` 로 TS 를 직접 변환해 실행하는 로더를 들고 있어서, 그 로더가 곧 존재 이유다.
- PR #1416·#1418 머지 완료 — `.ignore` 정정과 스크립트 10개 삭제까지 끝났다.
- `verify:guard-wiring` 은 이들을 잡지 못했다 — 그 가드의 universe 는 `scripts/` 디렉터리가 아니라 **`package.json` 의 `verify:*` 키**다(`scripts/verify-guard-wiring.mjs:294`). 즉 "미배선으로 걸리고 있다"는 가설은 기각됐다.

## 처리 내역

- [x] `verify-portone-webhook-signature.mjs` — **jest 이관 후 삭제.** 별칭 단언을 `__tests__/worker/payments-v2.webhook.test.js` 의 「기존 구현과 동일하다」 블록으로 옮겼고, 신구 두 구현(`worker/routes/payments.js:240-242` · `worker/payments/webhook.js:127-129`)을 함께 단언한다.
- [x] `verify-admin-monthly-credit-grant.mjs` — **jest 이관 후 삭제.** 7개 단언을 `__tests__/worker/admin-monthly-credit-grant.test.js` 로. `__adminMonthlyCreditGrantTestUtils` export 는 남긴다 — 이제 그 스위트가 소비한다.
- [x] `test-saju-ai-prompt-advanced-factors.mjs` · `test-saju-calibration-prompt.mjs` — **jest 이관 후 삭제.** 둘 다 LLM 실호출 0건(순수 프롬프트 빌더)이라 과금 규칙 1과 무관했다. 🔴 **두 스크립트는 이미 죽어 있었다** — tempdir 복사 목록이 `fortune-reasoning-contract.js` 를 안 따라가 `ERR_MODULE_NOT_FOUND` 로 즉사했고 `promptVersion` 단언도 `v4`(현재 `v6`)로 낡아 있었다. 이관처: `__tests__/worker/saju-calibration-prompt.test.js`(5건) · `__tests__/worker/saju-ai-prompt-advanced-factors.test.js`(11건).
- [x] `verify-famous-saju-magazine.mjs` — **배선.** `package.json` 등록 + `pr-ci.yml` fast 잡의 기존 famous-saju 스텝에 한 줄 추가. 배선된 `verify:famous-saju-editorial`·`verify:famous-saju-multisystem` 과 **단언이 겹치지 않는다**(실측: `"시 미상"` 라벨을 `"시간 모름"` 으로 바꾸면 magazine 만 실패하고 나머지 둘은 초록). 고유 축은 시 미상 3주 명식 분기 · 매거진↔엔진 간지 일치 · 상세 페이지 구성요소 12종 · 직접 리딩 계약 · 기계적 상투구/U+FFFD 금지.
- [x] `verify-ziwei-deep-counseling-quality.cjs` — **배선.** `pr-ci.yml` fast 잡의 ziwei 스텝 옆에 신규 스텝. `app/_lib/generate-ziwei-deep-chapter.ts` 를 제품 밖에서 실행하는 유일한 코드이고 `__tests__` 커버리지 0건이다(`git grep generate-ziwei-deep-chapter` → 제품 참조는 `app/_lib/ziwei-deep-runtime.ts` 하나뿐). 배선된 `verify:ziwei-deep-report-flow` 는 워커 라우트·프롬프트·패널 흐름만 봐서 이 파일을 아예 읽지 않는다.

## 함정

- 🔴 **미배선 스크립트는 조용히 썩는다 — 판정 전에 먼저 그냥 실행할 것.** saju 2종은 로드 단계에서 죽어 있었고, 단언 하나(`validateSajuAIResultText` 가 길이 하한 없이 통과)는 제품이 하한 11,500자를 되살려 **사실과 반대**였다. 스크립트 본문을 사양으로 읽지 말고 현재 코드로 재측정한 뒤 옮긴다.
- 🔴 **가드가 "돈다"와 "문다"는 다르다.** ziwei 가드는 살아 있는데도 변이 3종(sanitizer 제거 · 문장 중복 제거기 무력화 · 섹션 깊이 패딩 제거)에 전혀 물지 않았다 — 그 셋은 애초에 여유가 커서 임계에 안 닿는다. 실제로 문 것은 내부 토큰 유출(`해석 신호:`)과 궁 이름 고정(오삽입 22건)이었다. **배선하기 전에 변이로 물게 만들 것.**
- 🔴 새 `verify:*` 를 배선하면 워크플로 트리거 `paths` 에도 넣어야 한다 — [[new-verify-script-must-be-wired]]. 단 `pr-ci.yml` 은 `paths` 필터가 없고 세 잡이 항상 도므로, 거기에 넣을 때는 `paths` 작업이 없다.
- 🔴 삭제 방향으로 가면 3면이 아니라 **6면 `git grep`** 이다(+ `public/**` 미러 · `.github/workflows` · `docs`). `.ignore` 가 미러를 rg 에서 빼므로 반드시 `git grep`.

## 곁가지로 고친 것

- `verify-famous-saju-magazine.mjs` 의 직접 리딩 계약 단언이 5개 절 중 **첫 절 하나만** 보고 있었다. 나머지 넷(생시 미상 3주 · 계산값 밖 임의 보충 금지 · 건강/사고/범죄/연애/가족 추측 금지 · 단정형 예언 금지)은 실존 인물 화면의 안전 제약인데 지워도 아무도 실패하지 않았다(변이 실측). 5개 전부 못 박도록 고쳤다.

## 남은 것 (이 작업과 무관)

- `scripts/verify-famous-saju-magazine.mjs` 는 `scripts/lib/load-ts-module.mjs` 와 사실상 같은 TS 로더를 자기 안에 또 들고 있다(같은 폴더의 editorial·multisystem 은 공용 모듈을 쓴다). 통합하면 좋지만 `jsx` 옵션과 `baseUrl/paths` 가 미묘하게 달라 이번 배선 범위 밖으로 뒀다.
- 로컬 브랜치 183개(`: gone]`) 삭제 — 오토 모드 분류기가 일괄 삭제를 막는다. 디스크 이득은 0에 가까워 선택 사항.
- `reports/unused-files-report.json` 의 unusedCandidates **980건** 스윕 — 별도 세션 과제.

## 검증

```
npm run verify:guard-wiring
npm run verify:famous-saju-magazine
npm run verify:ziwei-deep-counseling-quality
npm run check:critical
npx jest __tests__/worker/payments-v2.webhook.test.js __tests__/worker/admin-monthly-credit-grant.test.js
npx jest __tests__/worker/saju-calibration-prompt.test.js __tests__/worker/saju-ai-prompt-advanced-factors.test.js __tests__/worker/saju-ai-prompt-domain-templates.test.js
```
