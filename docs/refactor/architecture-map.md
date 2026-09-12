# 현재 구조 지도 (실측)

측정일 **2026-09-12**. 커밋 수는 달리 적지 않으면 **최근 120일** 기준이며 그 기간 총 커밋은 6,436이다.

## 1. 실행 계층

```
브라우저 ─┬─ index.html (정적 셸, 번들러 없음)        ← production "/" 의 정본
          └─ dist/** (Next.js output:"export")        ← Cloudflare Pages 가 서빙
                │
                ├─ public/_worker.js                  ← 유일한 Pages Function. /api/* 를 프록시
                │
                └─ code-destiny-web (별도 Worker)     ← worker/index.js
                      ├─ worker/routes/** 72파일
                      ├─ worker/payments/** 21모듈
                      └─ worker/lib/** (DB·LLM·권한)
                              │
                              └─ MongoDB Atlas
```

🔴 `app/page.js` 는 production `/` 가 **아니다.** 빌드 후 `scripts/promote-static-shell-to-root.mjs` 가 루트 `index.html` 을 `dist/index.html` 위로 승격하고, `app/page.js` 는 셸로 하드 리다이렉트한다. 홈 변경은 루트 셸에서 시작한다.

## 2. 주요 모듈과 규모

| 모듈 | 실체 | 비고 |
|---|---|---|
| 정적 셸 | `index.html` + `js/**` 브라우저 스크립트 | 번들러 없음. 인라인 스크립트 21,803줄 |
| Worker API | `worker/index.js` + `worker/routes/` 72파일 | 100% JS. 경로 조건문 91개, `routes/` 정적 import 0 = 동적 디스패치 |
| React | `app/**` (내보내기 빌드) | 홈은 셸로 리다이렉트 |
| 결제 | `worker/payments/` 21모듈 + `worker/lib/billing.js`·`payments.js` | 뒤 둘은 동결 |
| 엔진 | `js/saju-engine.js` 34,129줄 + 4벌 + `worker/lib/*-saju` | |
| LLM | `lib/llm-client.ts` 정본 + `worker/lib/gemini.js`, 프롬프트 26모듈 | |
| 생성물 | 미러 204경로, 셸 7벌, i18n 24MB | `sync:public` 이 생성 |

## 3. 가장 복잡한 파일 TOP 10

| 파일 | 줄 수 | 120일 커밋 | 테스트 |
|---|---:|---:|---|
| `index.html` | 38,517 | 1,525 (전체의 24%) | 렌더링 0 |
| `js/saju-engine.js` | 34,129 | — | 단위 0 |
| `js/core/index-inline-runtime.js` | 9,894 | 1,371 | |
| `app/_lib/serviceFeatureRegistry.ts` | 9,504 | — | |
| `worker/routes/fortune.js` | 6,915 | — | |
| `app/points/PointsClient.tsx` | 5,280 | — | 엔드포인트 13개 |
| `js/mobile-interaction-patch.js` | 2,666 | 1,133 | 0 |
| `js/core/checkout-entry.js` | 1,841 | — | |
| `worker/lib/service-execution-task.js` | 1,805 | — | |
| `js/core/uiBindings.js` | 789 | 1,280 | 1 |

## 4. 중복이 많은 영역

- **엔진 판정**: 사주 5벌 · 십이운성 4벌 · 십신 4벌 · Julian day 9벌 · 절기 4벌
- **권한 판정**: 이용권 3벌 · 접근 결정 재구현 ~14 worker lib
- **AI 상담**: 라우트 8개 17,805줄이 각자 전 과정 재구현
- **HTTP**: fetch 래퍼 5개 + API base 재도출 ~20곳 + 기본 origin 4개
- **상수**: pass 가격 2곳 · `KRW_PER_COIN` 3곳 · 원화 포맷 ~25곳 · `normalizeGender` 31벌 · `Asia/Seoul` 하드코딩 121파일

## 5. 결합도

**파일 간**: `index.html` 과 함께 바뀌는 상위 6개 — `index-inline-runtime` 347회 · `uiBindings` 346 · `mobile-interaction-patch` 344 · `bootstrapDestinyFlower` 277 · `init` 276 · `app.js` 276 공동 변경. `window.*` 전역 685개(`cd` 접두 195)가 사실상 화면 간 IPC다.

**DB**: repository 계층이 없다. worker 69파일에 인라인 모델 접근 ~681곳. 동일 30필드 projection 이 `worker/routes/profile.js` 945·1024·1057·1245·1391·1427 에 6번.

**결제**: 정본은 이미 분리돼 있다(`worker/payments/` 21모듈, 가격은 `paid-feature-registry.js` 단일 소스). 결합은 **판정 쪽**이다 — 이용권 판정 3벌, 주문 status enum 병렬 6개 이상, 결제 스택 2개를 `worker/index.js:1327-1448` body-sniffing 으로 중개, PortOne 로더 3개 경쟁, 환불 경로 4개, resume 영속 스키마 3개.

**LLM**: 공급자는 이미 추상화돼 있다(`worker/lib/gemini.js` 를 10개 중 9개가 사용). 구멍은 우회 3곳과 mock 게이트 5벌 재구현, 그리고 경로 모양에 의존하는 jest 목 매퍼다.

## 6. 🔴 왜 폴더를 옮기지 않는가

`features/payment/{domain,application,infrastructure,ui}` 식 재배치를 하지 않기로 했다. 근거는 두 가지다.

**(1) 파일 이동은 중복 판정을 0개 줄인다.** `worker/payments/entitlements.js` → `features/payment/domain/entitlement.js` 는 이름만 바뀐다. 이용권 판정이 3벌인 사실은 그대로다. 병의 정체는 배치가 아니라 **같은 질문에 서로 다른 답이 여러 곳에 구현된 것**이고, 그것이 "한 곳을 고치면 다른 곳과 어긋난다 → 회귀로 보인다"의 기계적 원인이다.

**(2) 이 레포의 안전망은 경로 모양이다.** 옮기면 테스트와 가드가 **조용히 꺼진다**:

| 안전망 | 경로 의존 방식 |
|---|---|
| `__tests__/ui` 149개 중 139개 | `readFileSync(고정 경로)` |
| `jest.config.cjs` LLM 목 매퍼 | `^\.\./\.\./lib/llm-client\.ts$` — **상대 깊이** 의존 |
| `config/payment-freeze.json` | 파일 경로 + 함수 본문 해시 |
| 루트 `.ignore` | 생성물 204경로 |
| `scripts/verify-*` 189개 | 경로를 grep |
| 셸 미러 7벌 | 캐시버스트 해시 |

조용히 꺼지는 것이 핵심이다. 실패하면 안다. 안 도는 것은 아무도 모른다. 1순위(회귀 방지)를 깎아 미관을 사는 거래이므로 하지 않는다.

레포 계약과도 일치한다 — [ARCHITECTURE.md:37](../../ARCHITECTURE.md) "새 payment-core나 가격표를 만들지 않는다", [:51](../../ARCHITECTURE.md) "기능 경계는 기존 위치를 유지한다. 이 지도는 새 폴더로 이동하라는 지시가 아니다". 충돌 해소 기록은 [docs/CONTEXT_AUDIT.md](../CONTEXT_AUDIT.md) 의 2026-09-12 절.

**그래서 작업 규칙은**: 중복된 판정을 없애는 변경은 한다. 파일을 옮기는 변경은 하지 않는다. 판정에 정본이 아예 없을 때만 모듈을 하나 **추가**한다(추가는 가드를 깨지 않는다).

## 7. 목표 의존 방향

```
UI → Application Service → Domain → Repository Interface → Infrastructure
```

금지 간선: UI→MongoDB · UI→PortOne · UI→LLM · Fortune Engine→Payment · Fortune Engine→UI · LLM→Payment · Payment→Fortune 알고리즘 · Repository→UI.

이 방향은 **폴더가 아니라 import 로** 달성한다. 현재 위반의 실측 목록은 [structural-issues-top20.md](structural-issues-top20.md) 의 5·7·8·9·10번이다.
