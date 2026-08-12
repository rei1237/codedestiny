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

**조치 (완료, `06fe236e4`)**: 가드가 `await` 위임을 한 단계 따라가게 고쳤다. 코드는 건드리지 않았고 가드의 의도(결제 지점은 하나, 그 경로 안)는 그대로다.

양방향으로 확인했다 — 초록불만 보고 끝내지 않았다:

| 시험 | 결과 |
|---|---|
| 현재 코드 | ✅ PASS |
| `openDeepReading` 이 결제 함수를 더는 호출하지 않게 변경 | 🔴 FAIL — "결제가 openDeepReading 경로 밖으로 옮겨졌습니다" |
| `ensurePaidAccess` 호출을 하나 더 심음 | 🔴 FAIL — "ensurePaidAccess 호출이 2곳입니다" |

> 첫 음성대조 시도는 `openDeepReadingOnce` 를 호출·정의 양쪽에서 리네임하는 것이었는데 통과했다. 위임 링크가 그대로라 통과가 맞는 동작이었고, 시험 설계가 틀렸던 것이다. 링크를 실제로 끊는 쪽으로 다시 시험했다.

**CI 추가는 하지 않았다** — 요청 없이 게이트를 늘리지 않는다는 방침에 따랐다. 이 가드는 여전히 수동 실행이다.

---

## 이번 회차에서 의도적으로 **하지 않은** 것 (사용자 결정)

| 항목 | 결정 |
|---|---|
| **B-6** 결제 게이팅 중복 175줄 통합 (`fortune-access-guard.js` ↔ `worker/routes/fortune.js`) | **이번 회차 제외.** 이용권 판정 경로라 잘못 합치면 결제가 갈리고, 롤백에 Worker 재배포가 필요하다. 별도 세션에서 집중 처리 |
| **B-3** animal-destiny 다마고치 UI 11건 / **B-4** 찻집 내러티브 9건 | **보류.** 참조는 0이지만 하나의 미완성 기능 세트라 살릴지 접을지는 제품 판단이다. 특히 B-4 는 2026-07-25 선행 감사가 "keep" 으로 결정한 항목이라 임의로 뒤집지 않는다 |
| ~~**W-1** 앱 세션 30분 만료~~ (`/api/auth/app/exchange` 호출자 0) | **2026-08-13 확인: 만료 문제는 이미 해소됐다.** 앱 갱신은 이 엔드포인트가 아니라 `x-code-destiny-refresh-token` 헤더 + 앱 로그인 응답 본문의 `refreshToken` 으로 배선돼 있다(`__tests__/worker/auth.app-refresh-token.test.js` 가 지킨다). 남은 것은 인증 버그가 아니라 **호출자 없는 죽은 엔드포인트**뿐이다. 자세한 근거는 [03-report.md](03-report.md) W-1 참고 |
| **C-1** ts-prune 830 / knip export 690 + types 182 | 개별 동적 참조 검증 미실시. 다음 회차 과제 |
| **Phase 6** 물리 삭제 | 관측 기간(프로덕션 배포 후 1주, 오류 0건) 전이다. `_graveyard/` 67파일은 그대로 둔다 |
