---
status: active
updated: 2026-11-22
---

# Trait-First(타고난 성향 우선) 운영 문서

유료 상담의 첫 성향 장이 "내 명식에서 나온 근거"로 시작하도록 사주 성향 근거를 프롬프트에 넣는 장치다. 장 구조·완성 판정·결제·전달 경로는 바꾸지 않는다(게이트 A). 작업 이력과 승인 원문은 [trait-first-upgrade.md](../handoff/trait-first-upgrade.md).

## 범위 (1차, 2026-11-22 운영 반영)

| 서비스 | 성향 장 | 주입 위치 |
|---|---|---|
| 신년운세 | `nature` | [new-year-ai.js](../../worker/routes/new-year-ai.js) `buildFirstPrompt` |
| 연애 비책 | `nature` 그룹 | [love-secret-ai-prompt.js](../../worker/lib/love-secret-ai-prompt.js) `loveSecretTraitFirstLines` |
| 카르마 | `chapter-00` 기질 장 | [karma-destiny-ai.js](../../worker/routes/karma-destiny-ai.js) |
| 흑월 | `temperament` | [heukwol-report.js](../../worker/lib/heukwol-report.js) `heukwolPrompt` |
| 인생의 책 | 타고난 사주의 원형 장 | [life-book-ai.js](../../worker/routes/life-book-ai.js) `buildSectionPrompt` |
| 마스터 인연의 서 | `gate` (ko 만) | [master-love-codex.js](../../worker/routes/master-love-codex.js) `codexTraitFacts` |

자미·서양·베다·숙요·타로·통합 기능(초융합·Compass 등)은 아직 대상이 아니다. 첫 장이 질문 답·총론인 기능에 성향 장을 새로 만드는 일은 장 계획 버전·완성 판정·클라이언트 순서를 함께 바꾸는 별도 RED 다([phase0 보고서](../handoff/trait-first-phase0-report.md) 위험 1·6).

## 구성

- 추출기·검사기: [worker/lib/trait-profile/](../../worker/lib/trait-profile/)
  - `index.js`: `selectTraitFirst`·`pinTraitFirst`·`sajuTraitFirstLines`·`traitFirstShadowCheck`
  - `saju.js`: `buildSajuTraitProfile`(버전 `trait-profile-20261122-v1`), `checkTraitFirstSection`
  - `saju-kb.js`: 해석 KB(`saju-trait-kb-20261122-v1`). 검수표는 [trait-kb-review.md](trait-kb-review.md) — 코드를 고친 뒤 표를 다시 만든다.
- 계산 사실의 정본은 기존 장치다: 십성·신강약은 [saju-temperament.js](../../worker/lib/saju-temperament.js), 오행 과다 29%·부족 16% 판정은 [saju-derived-signals.js](../../worker/lib/saju-derived-signals.js). 희신은 넣지 않는다.
- 승인 사주(`approvedSaju`)가 있는 차트에는 주입하지 않는다.

## 플래그와 고정

- 플래그 `TRAIT_FIRST_SAJU` 는 [engine-rollout.js](../../worker/lib/engine-rollout.js) 의 코드 기본값으로 켠다. `[vars]` 는 텍스트 바인딩 예산이 차서 쓰지 않는다. 같은 이름의 `[vars]` 가 있으면 그 값이 이긴다.
- 새 세션만 생성 시작 때 `llmMeta.traitFirst = 'v1'` 로 고정한다(`pinTraitFirst`). 키가 없는 옛 세션·진행 중 세션은 끝까지 OFF 로 이어 쓴다. 그래서 플래그를 바꿔도 이어쓰기 중인 결과의 장 구성이 섞이지 않는다.
- 저장된 결과 재열람은 저장 원본이라 플래그와 무관하다.

## 섀도 검사 (전달을 막지 않는다)

성향 장이 생성된 뒤 `traitFirstShadowCheck` 가 헤드라인 누락·얼버무림 표현 등을 검사하고 **로그만** 남긴다. 검사 실패로 재시도·거부·환불이 일어나지 않는다 — 결제 후 미제공을 늘리는 새 거부 조건을 만들지 않는다는 게이트 B 결정이다. 검사 자체가 예외를 내도 `shadow_check_error` 로 기록하고 넘어간다.

로그 태그(워커 로그에서 `Trait First Shadow` 로 찾는다): `ok:false` 는 warn, `ok:true` 는 info. 필드는 `ok`·`issues`·`headline`.

## 롤백

1. `engine-rollout.js` 의 `TRAIT_FIRST_SAJU: 'true'` 줄을 지우는 revert 커밋(켠 커밋 0469561a0).
2. main push → 운영 배포 dispatch(`gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`).
3. 이미 `v1` 로 고정된 진행 중 세션은 고정값대로 끝까지 간다. 즉시 끊어야 하면 각 라우트가 세션에 고정된 `traitFirst` 를 읽는 곳(`pinTraitFirst`, 카르마의 `llmMeta.traitFirst` 직접 읽기)을 무시하게 하는 별도 변경이 필요하다(장 구조는 같아서 이어쓰기는 깨지지 않는다).

## 검증

- mock 테스트: `__tests__/worker/{heukwol,heukwol-basis-quality,karma-chapter-plan-v2,life-book-ai.sections,love-secret-ai-prompt.gate,master-love-codex-paid-delivery,new-year-section-plan-v2}.test.js`, `__tests__/ui/love-secret-paid-delivery.behavior.test.js`, `__tests__/ui/engine-rollout.test.mjs`.
- 골든셋(과금 실호출 12회, 2026-11-22 1회 승인): [trait-first-phase5-verification.md](../handoff/trait-first-phase5-verification.md). 프롬프트 수준 비교이며 E2E 가 아니다. 스테이징 E2E 는 실행하지 않았다.

## 운영 확인 (Phase 6, 미측정)

켠 뒤 볼 지표: 결제 후 결과 전달률(목표 100%), 폴백률, 생성 실패율, p95 지연, 고아 주문 0건, 섀도 `ok:false` 비율. 운영 DB 조회는 읽기 전용이라도 1회 승인 후 [audit-paid-orphans](../handoff/trait-first-phase1-integrity.md) 방식으로 한다. 이상이 보이면 위 롤백 후 원인을 보고한다.

## 남은 과제

- 인연의 서 골든셋 OFF 쪽 빈 응답(0자, 오류 코드 없음): 원인은 미기록이지만 운영 전달 구멍은 아니다(2026-11-22 코드 확인). 운영 경로에서 빈 응답은 `generateCodexChapterResponse` 가 `LLM_OUTPUT_EMPTY` 로 던지고([master-love-codex-quality.js](../../worker/lib/master-love-codex-quality.js)), `generateChapter` 가 `ok:false` 실패 장으로 돌려 웨이브가 다시 시도한다 — 빈 본문이 완료로 저장되지 않는다(`__tests__/worker/master-love-codex-quality.test.js` 의 LLM_OUTPUT_EMPTY 3건). 0자는 골든 하니스가 실패 응답의 오류를 기록하지 않은 탓으로 본다(추정).
- 인생의 책 얼버무림 표현("경향이 있을 수 있습니다")이 ON·OFF 모두에서 걸린다 — 기존 어조 문제.
- 인연의 서 ON 에서 `label_leak`(근거 id 노출 의심).
- 2차 엔진(자미·서양·베다·숙요·타로) 확장은 미착수.
