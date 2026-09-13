---
status: done
updated: 2026-09-13
next: Phase 4(권한 판정 단일화 — TOP 3·4·5·6·15)를 시작한다. 이 문서에 남은 작업은 없다. 계획 정본은 docs/refactor/phase-plan.md.
---

# shadow 가드 41개 차단 승격

## 왜

Phase 2·3 이 다음 세션으로 넘긴 **사용자 승인 건**이었다. `guards-shadow.yml` 의 가드 41개는
비차단 관측 상태라 실패해도 아무것도 막지 않았다. 2026-09-13 승인 후 차단 게이트로 올렸다.

## 지금 상태

main 직접 커밋, 완료. TOP 20(가드 미배선)이 이로써 닫혔다 — 원장은
[structural-issues-top20.md](../refactor/structural-issues-top20.md) 의 20행.

승격 근거는 **실측**이다(문서 재인용 아님): `gh run view <id> --json jobs` 의
`steps[].conclusion` 집계로 main push **15런 × 41스텝 = 615건 전부 `success`, 오탐 0**.
🔴 잡 레벨 `conclusion` 은 근거가 못 된다 — `continue-on-error` 라 스텝이 전부 실패해도
잡은 `success` 다. 이 함정은 다음 관측 때도 그대로 유효하다.

## 한 일

1. **41개를 `pr-ci.yml` 의 `guards` lane 으로 이관.** 관측 워크플로의 다섯 축(결제·인증 9 /
   Worker·LLM 4 / 프로필·진입·UI 10 / 운세·콘텐츠 결정성 15 / 모바일 셸 3) 그대로 5개 스텝에
   묶었다. `continue-on-error` 없음. 이 lane 은 `ci-required` aggregate 의 `needs` 에 있다.
2. **`guards-shadow.yml` 삭제 + `SHADOW_OBSERVING` 을 빈 배열로.** 버킷과 `auditShadowObservation`
   의 양방향 축은 **지우지 않았다** — 다음 관측 때 다시 쓴다. 빈 상태가 정상이다.
3. **승격이 만들 뻔한 사각지대 하나를 같은 커밋에서 닫았다.** ↓

## 🔴 이 작업의 고유한 함정 — 승격은 "옮기기"가 아니다

shadow 워크플로는 **매 main push** 무조건 돌았다. `guards` lane 은 `runs_guards == 'true'`
일 때만 돈다(판정: `scripts/resolve-ci-tier.mjs` 의 `shouldRunStaticGuards`). 그래서 그냥 옮기면
평문 문서 전용 push 에서 41개가 통째로 조용해진다.

41개 전수 확인 결과 **2개가 루트 계약 문서를 읽는다**:
`verify:payment-policy-md` → `PAYMENT_POLICY.md`(상담 가격 정본),
`verify:mobile-entry-actions` → `MOBILE_FEATURE_REGISTRY.md`.
즉 **가격 정본만 고친 push 에서 가격 정합 검사가 꺼진다.** 루트 `.md` 를 평문 문서 분류에서
뺐다(자기검사 3케이스 추가). 파일명 목록을 적지 않은 이유는 주석에 있다 — 목록은 낡는다.

교훈: 비차단에서 차단으로 올릴 때는 **판정 결과**만 보면 안 된다. 두 배선의 **실행 조건**이
다르면 초록불이 그대로여도 커버리지가 줄어든다.

## 정본 예시

`.github/workflows/pr-ci.yml:731` — 승격 블록의 주석(근거·롤백·왜 build 잡이 아닌가).

## 검증

```
node scripts/resolve-ci-tier.mjs --self-test     # 22케이스(루트 계약 문서 3건 추가)
npm run verify:guard-wiring                       # shadow 0개, 미배선 62개가 전부 사유 선언됨
npm run verify:ci-required-lanes -- --self-test    # 17케이스
npm run check:fast                                 # EXIT=0
```

변이 3건 전부 탐지(도는 가드가 아니라 무는 가드인지 확인):

| 변이 | 결과 |
|---|---|
| 승격된 가드 1개를 `guards` lane 에서 제거 | 탐지 — `verify:guard-wiring` 이 미선언 미배선으로 신고 |
| `shouldRunStaticGuards` 를 승격 전 정규식으로 되돌림 | 탐지 — "root contract documentation must keep the static guards lane awake" |
| 워크플로가 없는데 `SHADOW_OBSERVING` 에 1건 선언 | 탐지 — "선언됐는데 guards-shadow.yml 가 없습니다" |

## 남은 위험 (범위 밖 — 보고만)

1. **`UNWIRED_BY_DESIGN` 의 실패 3개는 그대로다** — `verify:no-timestamp-conflict`(worker/payments
   3건 오탐) · `verify:today-hub-gate` · `verify:animal-totem-reading`. 지금도 실패하므로 배선 전에
   원인부터 고쳐야 한다. 승격 대상이 아니었다.
2. **`guards` lane 이 3분 18초 → 약 6분 20초.** `build`/`critical` 과 병렬이라 전체 wall-clock
   증가는 대부분 흡수될 전망이지만 **아직 실측 전이다** — 승격 후 첫 런에서 확인할 것.
3. **루트 `.md` 단독 push 가 이제 `guards` lane 을 깨운다.** README 류 수정 한 번에 약 6분.
   드리프트 없는 fail-closed 를 택한 대가이며, 의도한 비용이다.

## 모르는 것

없음. 승격 조건 3개는 전부 실측·승인으로 충족됐다.
