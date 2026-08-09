# Phase 4~5 — 적용 내역과 실측 (2026-08-09)

> [03-report.md](03-report.md) 승인 후 적용한 것만 기록한다. **아직 물리 삭제는 없다** — 전부 `_graveyard/20260809/` 로 이동했고 [_graveyard/MANIFEST.md](../../_graveyard/MANIFEST.md) 에 항목별 복구 명령이 있다.

## 적용 커밋

| 커밋 | 내용 |
|---|---|
| `177e01a4d` | Phase 0 베이스라인 기록 |
| `d0e0426b8` | Phase 1~3 정적분석·동적검증·등급보고서 |
| `fbbb43c85` | A등급 batch 1 — 비-worker 고아 **49건** 격리 |
| `f230ef564` | A등급 batch 2 — `worker/lib` 고아 **5건** 격리 |
| `aca2a15a9` | 문서·설정 정정 (D-1~D-5) |
| `3c579e2d3` | B-1·B-2·B-5 — 결제·권한 인접 + 자미두수 구버전 **13건** 격리 |
| `9f377ceef` | **B-8** — 타로 4라우트에서 registry 분리 (Perf) |
| `259363b5f` | **B-7** — 영어 사본 로케일 7종 제거 (−5,348줄) |

## 실측 — 베이스라인 대비

| 지표 | 격리 전 | 현재 | 변화 |
|---|---:|---:|---|
| 추적 소스 LOC (`_graveyard` 제외) | 933,490 | 915,275 | **−18,215** |
| 격리 파일 | 0 | **67** (746 KB) | |
| 린트 경고 | 769 | 731 | −38 |
| 타입 에러 | 0 | 0 | — |
| jest | 105 suites / 920 | 105 suites / 920 | 동일 |
| node:test | 173 | 173 | 동일 |
| `check:critical` | 19단계 통과 | 19단계 통과 | 동일 |
| Worker 업로드 | 13,577.42 KiB | 13,581.29 KiB | **+3.87 KiB** (아래 설명) |
| `serviceFeatureRegistry.ts` | 9,504줄 / 388 KB | **4,151줄** | −5,353줄 |

### Worker 번들이 줄지 않은 이유 (예측대로)
격리한 `worker/lib` 5파일은 참조가 0이라 **esbuild 가 애초에 번들에 넣지 않았다**. +3.87 KiB 는 그 사이 다른 세션이 올린 guardian-fortune 작업분이다. [03-report.md](03-report.md) 의 "프로덕션 번들 감소 0 KB" 예측이 실측으로 확인됐다.

### 아직 측정하지 못한 것
**클라이언트 청크 실측(B-8 효과)** — 측정 시점 내내 다른 세션이 스모크 통과한 `dist/` 아티팩트를 물고 `deploy:safe` 프롬프트에서 대기 중이라 `npm run build:cf` 를 돌리지 않았다. 다음 정식 빌드 때 아래를 확인하면 된다:

```bash
# /tarot/* 4개 라우트 HTML 이 285KB 짜리 registry 청크를 더 이상 참조하지 않아야 한다
grep -rl "Precise Saju Reading" out/_next/static/chunks/    # 청크 식별
grep -rl "<해당 청크 파일명>" out/tarot/*/index.html          # 참조 0 이어야 함
```

## B-7·B-8 이 왜 안전한가 (기능 변경 0의 근거)

- **B-8**: `lookupServerCoinPrice` 함수 본문을 **바이트 그대로** `app/_lib/serviceCoinPrice.ts` 로 옮겼다. `serviceFeatureRegistry` 가 다시 export 하므로 기존 import 경로도 그대로 동작한다. 바뀐 것은 타로 클라이언트 4개의 import 경로뿐이다.
- **B-7**: 제거한 `vi hi es fr de nl ms` 7개 블록이 `en` 블록과 **바이트 단위로 동일**함을 블록별 추출·비교로 증명했다(눈으로 본 것이 아니다). `normalizeServiceFeatureLocale` 은 인식 못 하는 로케일을 `"en"` 으로 폴백하고 `resolveServiceFeatureCopy` 도 `en` 표로 폴백하므로, `"vi"` 요청은 제거 전에도 en 카피를 렌더했고 지금도 en 카피를 렌더한다.

## 배치별 회귀 검증

| 배치 | 실행한 검증 |
|---|---|
| A batch 1 | typecheck · lint · `npm test` · `check:critical` · 결정성 4종(`destiny-compass`·`love-compat`·`pet-saju`·`master-love-codex-compat`) · `public-parity` |
| A batch 2 | 위 + `build:worker` 크기 실측 + `astrology-ai-flow` |
| B batch (결제 인접) | 위 + **결제 verify 17종 전건** (`billing-pass-policy` `portone-single-payment` `paid-gate-ui` `payment-choice-parity` `checkout-pass-card` `paid-feature-billing-policy` `ai-prompt-billing-policy` `pass-recovery-path` `static-paid-gate-failsafe` `saju-unlock-entitlement-regression` `paid-feature-common-flow` `payment-service-boundary` `payment-concurrency-guards` `monthly-credit-lots` `app-store-billing-policy` `profile-card-action-policy` `paid-gate-profile-scope`) |
| B-8 / B-7 | 위 + registry 를 텍스트로 읽는 3종(`adsense-route-policy` `mobile-entry-actions` `ziwei-ai-consultation-flow`) + i18n 3종(`i18n-ko-coverage` `i18n-no-fallback` `locale-main-sync`) |

전부 통과했다.

---

## 🔴 작업 중 새로 발견한 결함 — W-6

`npm run verify:numerology-tarot-flow` 가 **HEAD 에서 이미 실패하고 있다.** 제 변경 이전 상태(`git stash`)로 되돌려 실행해 확인했으므로 이번 작업이 만든 것이 아니다.

```
[verify-numerology-tarot-flow] FAIL
- app/tarot/numerology/NumerologyTarotClient.tsx: 결제가 openDeepReading 밖으로 옮겨졌습니다.
```

**원인**: `cdd30e9e7 fix(payment): add synchronous double-click guards to music/nakshatra/numerology purchase flows` 가 `openDeepReading` 을 더블클릭 가드 래퍼로 만들고 실제 본문을 `openDeepReadingOnce` 로 분리했다. 가드는 `sliceFunctionBody(client, "async function openDeepReading(")` 안에 `ensurePaidAccess({` 가 있는지를 텍스트로 보는데, 결제 호출이 한 프레임 깊어져 `openDeepReadingOnce`(1142행) 안으로 들어갔다.

**결제 자체는 정상이다.** 같은 가드의 첫 단언(`ensurePaidAccess` 호출이 정확히 1곳)은 통과한다 — 결제 지점은 여전히 하나뿐이고, 여전히 `openDeepReading` 경로 안에 있다. 낡은 것은 가드의 텍스트 매칭이다.

**왜 아무도 몰랐나**: `verify:numerology-tarot-flow` 는 **어떤 GitHub Actions 워크플로에도 들어 있지 않다.** `check:critical` 에도 없다. 그래서 계속 빨간불이어도 드러나지 않았다.

**제안**: 가드가 래퍼를 따라가게 고친다(`openDeepReading` 또는 `openDeepReadingOnce` 중 한쪽에 `ensurePaidAccess` 가 있으면 통과). 가드의 **의도**(결제 지점은 하나, 그 경로 안)는 그대로 보존된다. 다만 결제 가드 단언 수정이라 **사용자 확인 후** 진행한다.
