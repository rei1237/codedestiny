---
status: done
updated: 2026-10-05
next: "없음 — 1~4단계 main 반영, 5단계는 판단·보고로 종료. 운영 승격은 별도 1회 요청 때만."
---

# 자미 사업운 근거를 다른 자미 상품과 공유 — 설계·인수인계

## 결과 (2026-10-05, 세션 854d63b7)

| 단계 | 커밋 | 실측 |
|---|---|---|
| 1 공용 모듈 추출 | `a570e6955` | derived 5 + invariance 1 통과, 해시 변경 0. 구 TS↔신 JS 무작위 명반 5000×3함수·비정상 입력 diff 0 |
| 2 `formatZiweiBusinessLines` | `2b8ea3d2e` | 역할 1줄 + 연결 최대 4줄(궁 사이 → 대궁 충 → 생년사화 순) + 한계 1줄, 줄당 ≤120자. 실제 명반 2,880개: 연결 1~10개, 최장 85자 |
| 3 자미 AI `achievement` 묶음 | `cc4dbe966` | 7회 중 1회, 평균 +410자(최대 489, 약 2.5%). 근거 검사는 존재 검사라 재시도 증가 경로 없음. `ziwei-ai-chart.js` 부분 mock 2곳에 사화 표 추가 |
| 4 심화 PDF 4장 | `c3a1f662c` | `children`·`wealth`·`career`·`property` 만. 리포트당 평균 +1,533자(최대 1,892, 약 4.5%). 출력 상한(9000) 불변. 네 장은 프롬프트 기반 장 캐시가 새로 생성됨 |
| 5 판단 | 코드 변경 없음 | 아래 |

5단계 판단:
- **영냥이 legacy money 선택자(`consultation-kinds.ts:73`)**: 바꾸지 않는다. 자미 단일 상품은 `catalog.ts` `MANIFEST_VERSION`=v6 이라 `:63` 에서 v6 로 먼저 반환되고, v6 money 는 이미 `businessBasis` 를 쓴다(`reading-v6.ts:38`). spirit 모드(v4)는 클라이언트가 `consultationKind` 를 보내지 않아(`SpiritConsultation.tsx:31`) `:66` 에서 반환, fusion 은 kind 가 personal·ask 뿐. 정상 신규 주문의 도달 경로 0(정적 실측) — v6 이전 주문 재생성·비정상 요청만 남는다.
- **섬 궁 상담(`palace-prompts.js` `palaceFactsBlock`)**: 넣지 않는다. 자녀궁(자녀·창작)·전택궁(거처) 상담의 초점이 사업이 아니라 줄을 넣으면 주제가 끌려간다. 재백·관록 궁 상담에만 넣을지는 상품 판단이 필요해 보고만 한다.
- 표기 오류: 아래 검증 절의 `verify:ziwei-basic-consult-prompt` 는 package.json 에 없다. 대신 `verify:ziwei-personality-context` 를 돌렸다.
- 과금 LLM 실호출 0회(전부 mock).

출처: [영냥이 챕터 후속 과제](yeongnyangi-chapter-followups-20261005.md) 5번. 이전 세션(616d0488)이 설계까지 하고, 구현은 새 세션이 이 문서로 이어 간다.
사용자 요청(2026-10-05): "다른 리포트에서도 로직을 공유하도록 설계" → **이 설계 방향은 승인된 범위**다. RED(유료 상품 프롬프트)이므로 시작할 때 위험·검증·롤백을 한 번 보고하고, 범위를 다시 묻지 않고 진행한다.

## 첫 행동

1. `CLAUDE.md` → `git branch --show-current`·`git status`·`git fetch origin`. 루트 체크아웃에 다른 세션 미커밋이 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리(호출에 `2>&1` 붙이지 않는다). 2026-10-05 기준 루트는 옆 세션 미커밋 + `index.lock` 으로 pull 이 막혀 있었다.
2. 아래 줄 번호는 `36a46cc31` 기준이다. origin/main 에서 다시 확인한다.
3. 필독: [ai-and-db](../context/ai-and-db.md)(LLM 안전 규칙·원칙 17), [payment-gating](../context/payment-gating.md)(결제 코드는 건드리지 않지만 유료 상품 전달 계약 확인용).

## 현재 상태 (실측, 36a46cc31)

- 로직: `worker/yeongnyangi/fortune/ziwei/derived.ts` — `ziweiPalaceFlights`(:34), `buildZiweiBusinessBasis`(:75), `buildZiweiHealthBasis`(:111), `ZIWEI_DERIVED_VERSION`(:16), `ZIWEI_HEALTH_DISCLAIMER`(:17). 순수·결정적. 입력은 `worker/lib/ziwei-ai-chart.js` `calculateZiweiAiChart()` 의 `palaces`(궁간 `stem`·`branchIndex`·별·`transformations`)와 `uncertainty.birthTimeUnknown`. 의존은 엔진의 `FOUR_TRANSFORMATIONS`·`TRANSFORMATION_LABELS`(:14) 뿐.
- 반입처는 `worker/yeongnyangi/fortune/ziwei/index.ts:8` 하나. 엔진 반환값은 바꾸지 않고 context 키(`businessBasis`·`healthBasis`)로 붙인다.
- 다른 소비처(사업운 미적용):

| 상품 | 근거가 프롬프트가 되는 곳 | 사업·재물 단위 | 호출 수 |
|---|---|---|---|
| 자미 AI 유료 상담 | `worker/routes/ziwei-ai.js` `buildConsultationHeaderLines`(:1370) = 차트 JSON + `buildCanonicalZiweiFacts`(:1107, 자화 줄 있음) | 섹션 묶음 `achievement`(:127, career·wealth·domain_matrix) | 섹션 묶음 6 + meta 1 = 7회, 헤더는 전부 공통 |
| 심화 자미두수 PDF(`ziwei-deep-pdf`, 30,000원) | `worker/lib/ziwei-deep-report-prompt.mjs` `formatZiweiChartForPrompt`(:173, 생년사화만) | 장 `children`·`wealth`·`career`·`property`(+`sihua`) | 15장 |
| 섬 궁 상담 | `worker/lib/island/consult/palace-prompts.js` `palaceFactsBlock`(:94) | 궁별(재백·관록·자녀·전택) | 궁마다 1회 |
| 영냥이 legacy money | `worker/yeongnyangi/fortune/consultation-kinds.ts:73` `palaces[관록궁,재백궁,전택궁]` | v7·v6 둘 다 아닐 때만 | — |

- 범위 밖(이번에 안 함): `worker/lib/ziwei-ai-prompt.js`(차트를 클라이언트가 보냄), `app/_lib/ziwei-*`(앱 엔진에 궁간이 없어 비화 계산 불가).

## 설계

### 원칙

1. **로직은 한 곳, 붙이는 범위는 상품별.** 계산은 공용 모듈 하나, 어느 섹션·장에 싣는지는 각 상품이 정한다. 공용 엔진 반환값과 차트 JSON 은 바꾸지 않는다 — `scripts/verify-ziwei-worker-chart-facts.mjs:144` 가 `JSON.stringify(chart).length<=14000` 을 강제하고, `lib/ziwei-derived-facts.js` 머리말(:18-21)도 파생값을 차트에 다시 싣지 말라고 한다. 파생은 **프롬프트 조립 때 텍스트 줄**로 넣는다.
2. **JS 공용 모듈 + TS 재수출.** jest 에 TS 프리셋이 없고(`jest.config.cjs` 머리말), ziwei-ai·심층 리포트 라우트를 jest 와 plain node verify 가 직접 import 한다. 그래서 공용 모듈은 `worker/lib/ziwei-derived-signals.js`(ESM)로 두고 `derived.ts` 는 재수출만 한다. 선례: `worker/lib/saju-derived-signals.js`(사주 파생, 같은 방식).
3. **비용은 필요한 곳에만.** 공통 헤더에 넣으면 자미 AI 7회·PDF 15장 모두에 실린다. 사업운 줄은 자미 AI `achievement` 묶음, PDF 의 `wealth`·`children`·`career`·`property` 장에만 넣는다.
4. **원칙 17.** 새 근거 때문에 거절·재시도 조건을 늘리지 않는다. 근거 밖 문장은 기존 장치로만 다룬다.

### 모듈 형태

```js
// worker/lib/ziwei-derived-signals.js (ESM, 순수)
export const ZIWEI_DERIVED_VERSION, ZIWEI_HEALTH_DISCLAIMER;
export function ziweiPalaceFlights(palaces)                       // derived.ts 에서 그대로 이동
export function buildZiweiBusinessBasis(palaces, birthTimeUnknown) // 〃
export function buildZiweiHealthBasis(palaces, birthTimeUnknown)   // 〃
export function formatZiweiBusinessLines(basis)                    // 새로: 프롬프트용 한국어 줄 배열
```

- `formatZiweiBusinessLines` 는 `basis.links`(이미 한국어 문장)와 네 궁 역할을 짧은 줄로 만든다. 상품마다 다른 머리말("사업운 근거:" 등)은 호출부가 붙인다. 출력 길이 상한을 정하고(예: 6줄·줄당 120자) 테스트로 고정한다.
- `derived.ts` 는 `export {…} from '../../../lib/ziwei-derived-signals.js'` 와 `ZiweiFlight` 타입만 남긴다.
- 건강(`buildZiweiHealthBasis`)도 함께 옮기지만 **다른 상품에 붙이지 않는다**(면책 문구·질병 단정 차단 정책이 상품마다 달라 별도 결정).

### 단계와 커밋 (각각 독립 커밋, 되돌려도 다른 단계가 흔들리지 않게)

| 단계 | 내용 | 통과 기준 |
|---|---|---|
| 1 | 공용 모듈 추출 + `derived.ts` 재수출 | `__tests__/ui/yeongnyangi-ziwei-derived.test.mjs` 통과, `yeongnyangi-reading-invariance.test.mjs` 해시 **변경 0** |
| 2 | `formatZiweiBusinessLines` + 단위 테스트 | 시간 미상 한계 문장, 연결 없음 고정 문장, 길이 상한 |
| 3 | 자미 AI: `achievement` 묶음 프롬프트에만 사업운 줄 | 테스트: achievement 묶음 프롬프트에 줄 있음, 다른 묶음·meta 에는 없음. `config/ai-locale-call-inventory.json` 줄 번호 재생성 |
| 4 | 심화 PDF: `wealth`·`children`·`career`·`property` 장에만 | 테스트: 네 장에 있음, `health` 등 다른 장에는 없음. 인벤토리 재생성 |
| 5 | 판단 후 처리 | 섬 궁 상담(재백·관록·자녀·전택 궁 상담에 줄 추가 여부), 영냥이 legacy money 선택자(:73)에 `자녀궁`·`businessBasis` 추가 또는 legacy 경로 도달 여부 실측 후 보고만 |

### 먼저 확인할 위험

- **자미 AI 근거 검사(grounding)**: `ziwei-ai.js:2063` 부근의 Grounding Retry 가 궁·별 이름을 차트와 대조한다. 비화 문장("재백궁 궁간 화록이 관록궁으로")이 새 용어를 부르면 재시도가 늘 수 있다. 3단계 전에 검사 어휘·허용 목록을 읽고, 필요하면 허용 쪽을 넓힌다(거절을 늘리지 않는다).
- **비용**: 늘어나는 글자 수 × 호출 수를 실측해 보고한다. `config/pass-cost-planning-20260921.json` 의 `ziwei-deep-pdf` 는 출력 상한 기준이라 입력 증가가 상한을 넘는지 확인한다.
- **분량 계약**: 자미 AI 묶음 `minChars 3960`(achievement :129) 등 기존 하한은 건드리지 않는다.
- **결제**: 결제·이용권 코드는 건드리지 않는다. `config/payment-freeze.json` 에 자미 파일은 없다(실측). 그래도 커밋 전 `npm run check:fast` 가 paid-gate 를 승격하면 그대로 따른다.

### 검증

- 모두 mock. 과금 실호출은 **정확한 1회 승인** 없이는 하지 않는다. 승인받아 돌리면 생성 본문 전체를 사용자에게 보고하고 원문 파일 경로를 준다.
- 단계마다 `npm run check:fast`(스크래치는 `.tmp/` 에만 — 다른 곳에 두면 미분류로 fail-closed 되어 paid-gate 전체가 돈다).
- 관련 verify: `verify:ziwei-worker-chart-facts`, `verify:ziwei-ai-consultation-flow`, `verify:ziwei-deep-report-flow`, `verify:ziwei-basic-consult-prompt`. check:fast 계획(`--plan`)에 안 잡히면 직접 실행한다.
- 롤백: 단계별 커밋 `git revert`. 3·4단계는 서로 독립.

## 끝나면

- 이 문서와 [후속 과제](yeongnyangi-chapter-followups-20261005.md) 5번 절에 결과(SHA)를 적고 이 문서를 `status: done` 으로 닫는다.
- 운영 승격은 하지 않는다(명시적 1회 요청 때만). 워크트리 배수(정션 먼저 해제)·`.tmp` 삭제까지 한다.
