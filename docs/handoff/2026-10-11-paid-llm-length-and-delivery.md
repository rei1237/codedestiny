---
status: done
updated: 2026-10-12
next: "없음. 후속은 '결과' 절의 후속 항목(ENOBUFS, 반려동물 '재물운' 표현, 가격 인상분 분량 상향)을 본다."
---

# 유료 LLM 분량 완화·전달 안정화

## 왜

사용자 지시(2026-10-11)는 아래와 같다.

- "지오멘시 분량을 그럼 줄이도록하고 정신 분석 해몽의 소제목이 섞여나오는 문제 해결하도록하고 반려동물 사주 리포트의 문제점 해결해주도록하고 마인드 스캔 타로 등 가격에 비해서 분량이 너무 많은 타로 등은 적절하게 분량을 조절해주도록해줘 다른 세션에서 인수인계 이후 진행하는 편이 더 낫겠다."
- "애초에 중요한 건 llm 서비스에서 분량 기준을 너무 타이트하게 하지 않는거야 결제 이후에 고객에게 전달만 잘되면돼"

근거는 [2026-10-11-paid-report-quality-followups.md](2026-10-11-paid-report-quality-followups.md) 4번 실호출 결과다. 원문은 `build-cache/llm-sample-review-20261009/{G4,D4,P4}/result.md` 에 있다.

- 지오맨시: 목표 20,000자의 42%인 8,496자로 완료했다. 7부분 모두 같은 해석을 처음부터 다시 했다.
- 정신분석 해몽: 완료했다. 다만 chapter-3-b 본문에 `### 3.` 소제목이 섞여 나왔다.
- 반려동물 사주 리포트: 0/13 실패. 첫 부분이 본문 안에 리포트 전체 스키마 JSON 을 넣어 보냈다.

## 원칙 (모든 단계에 적용)

1. **분량은 목표일 뿐이다.**
   - 짧아도 완결된 본문이면 받는다. 엔진은 이미 그렇게 동작한다(`worker/lib/paid-narrative-delivery.js:126-127,189`). 이 동작을 지킨다.
   - 분량 때문에 추가 호출이 생기는 `repairShortParts` 는 끈다.
2. **거부는 고객에게 보여줄 수 없는 본문에만 쓴다.** 대상은 JSON 덩어리, 시스템·프롬프트 누출, 빈 본문이다.
   - 마지막 시도에서도 그렇다면 환불이나 검토 대기로 보내지 않는다. 살릴 수 있는 텍스트를 뽑아 전달한다.
3. **가격 기준 분량 목표**(제안값이다. 바꾸면 근거를 이 문서에 적는다)
   - 3,000원(30코인) 상품: 합계 바닥 약 9,000자.
   - 5,000원(50코인) 상품: 합계 바닥 약 12,000~14,000자.
   - 부분 `minChars` 를 바꿀 때 프롬프트 속 "최소 N자"·"목표 N~M자" 문구도 같이 바꾼다. 지오맨시와 해몽은 이 문구를 따로 하드코딩하고 있다.
4. seed 의 `minBodyChars: 20000` 은 엔진이 읽지 않는다(`worker/lib/paid-report-quality.js:2` 정의만 있음). 분량을 정하는 값은 부분 `minChars` 뿐이다.

## 가격 대비 분량 현황 (2026-10-11 main 기준)

1코인은 100원이다(`worker/lib/billing-policy.js:1`). 가격 출처는 `worker/lib/paid-feature-registry.js` 다. 바닥은 부분 `minChars` 합이고, 프롬프트는 그 1.3~1.5배를 요구한다.

| 상품 (featureKey) | 가격 | 호출 | 부분 minChars | 바닥 | 1,000원당 |
|---|---|---|---|---|---|
| 마인드스캔 (`tarot-mindscan`) | 3,000 (L233) | **19**. 짧으면 재호출해 최대 38 | 1000 ×15, intro 1000, summary 2000, masterAdvice 1200, closing 800 | 20,000 | 6,667 |
| 연애 타로 (`tarot-love-relationship`) | 3,000 (L230) | 9. 최대 18 | card 3000 ×6, overview 3600, final 2000, matrix 2800 | **26,400** | **8,800** |
| 오라클 타로 1~4장 (`tarot-prompt-maker`) | 3,000 (L241) | 15~19 | 고정 12부분 14,700, 카드 합 6,500, 짝 600씩 | 21,200~23,000 | ~7,300 |
| 오라클 타로 5~7장 (`-standard`) | 3,000 (L242) | 20~22 | 같음, 카드당 ≥1100 | 23,000~24,200 | ~7,900 |
| 오라클 타로 8~10장 (`-deep`) | 5,000 (L243) | 23~25 | 같음 | 25,300~27,500 | ~5,300 |
| 오라클 타로 11~14장 (`-master`) | 5,000 (L244) | 26~29 | 같음 | 28,600~31,900 | ~6,000 |
| 지오맨시 (`geomancy`) | 3,000 (L295) | 7 | 3000 ×7 | 21,000 | 7,000 |
| 정신분석 해몽 (`dream-psycho-analysis`) | 3,000 (L251) | 10 | 2000 ×10 | 20,000 | 6,667 |
| 반려동물 사주 (`pet-saju-ai-consultation`) | 3,000 (L286) | 13 | 2200 ×2, 1600 ×5, 1000 ×3, 1600, 2200, 1000 | 20,200 | 6,733 |
| 반려동물 궁합 (`pet-compatibility-ai`) | 3,000 (L287) | 14 | 2000 ×7, 1000 ×3, 800 ×2, 1500, 60 | 20,160 | 6,720 |
| 참고: 찻집 타로 3/5장 | 5,000 (L253-254) | 3 그룹 | — | 6,000 / 7,200 | 1,200 / 1,440 |

- 치유 타로(브라우저 계산, 무료), 시코옌 주석점(API 없음), 재회·이직·연운·수비학·크리스털 타로(`worker/routes/tarot.js`, LLM 없음)는 대상이 아니다.
- `config/pass-cost-planning-20260921.json:52` 는 마인드스캔을 25부분으로 적고 있다. 지금은 19부분이다(`f6a24b4d5`). `scripts/report-pass-economics.mjs:10` 이 이 값을 읽으니 분량을 바꿀 때 함께 고친다.

## 작업 순서

각 단계는 실패 테스트 → 수정 → `npm run check:fast` → 커밋 순서로 한다. push 는 안정된 시점에 `git push origin HEAD:main` 으로 한다.

### 1. 반려동물 전달 실패 (최우선)

- [x] **부분 프롬프트에서 스키마를 뺀다.**
  - 위치: `worker/routes/pet-saju-ai.js:198`·`:202`.
  - 지금 seed 의 prompt 는 `buildReportPrompt`(L129-145)·`buildCompatPrompt`(L170-186) 전체다. 사실 블록 뒤에 "아래 JSON 스키마를 채우세요"와 전체 스키마가 붙어 있다. 스키마 키는 report 가 personality·habitats·plays·coach·care·closing, compat 이 verdict·overview·dimensions·places·cautions·routine 이다.
  - seed 에는 `buildReportFacts`(L83-110)·`buildCompatFacts`(L149-168)와 공통 문체 규칙만 넣는다. 해몽이 `dream.js:1217` 에서 `[출력 규칙]` 앞까지만 넣는 것과 같은 방식이다.
  - 펫은 `produce` 가 없다(L189-191). 그래서 엔진 기본 프롬프트(`paid-narrative-delivery.js:156`)가 쓰이고, 거기에 범위와 `narrativePriorDigest` 가 이미 들어간다.
  - 관리자 프롬프트 랩(`buildAdminLabPrompt` L119-127)은 운영과 같아야 한다. 바뀐 seed 를 그대로 보여주게 맞춘다.
- [x] **JSON 본문을 명시적으로 거부한다.**
  - 지금은 `[`·`{` 로 시작하는 본문을 정규화 없이 두고(L181), 분량이 `minChars` 미만일 때만 우연히 거부한다. 길기만 하면 L189 `longEnough(body) ? candidate || body` 로 받아들여진다.
  - 엔진에 "JSON 처럼 보이는 본문은 부분 결과가 아니다"라는 검사를 넣는다.
  - 마지막 시도에서는 JSON 의 문자열 값을 문단으로 이어 전달한다(원칙 2).
- [x] **`withFloor` 를 없앤다.** `worker/lib/pet-report-delivery.js:2-5` 가 합계를 20,000자까지 강제로 올린다. 이것을 없애고 부분 `minChars`(L7-10, L14-18)를 원칙 3 목표로 줄인다.
- [x] 테스트(먼저 실패시킨다):
  - "부분 프롬프트에 report·compat 스키마 키가 없다."
  - "JSON 본문은 부분 결과로 받지 않고, 마지막 시도에서는 텍스트로 살린다."
  - 기존 `__tests__/worker/pet-paid-delivery.test.js` 의 mock 은 `'[이번 호출 범위]\n'` 로 나누고(L35), 호출 수는 `tasks.length` 에서 나온다(L51, 62).

### 2. 정신분석 해몽 소제목 누출

- [x] **도우미를 추가한다.** `worker/lib/paid-narrative-candidate.js` 에 본문 속 마크다운 소제목 줄(`^#{1,6}\s.*$`)을 지우는 함수를 둔다.
  - 기존 `normalizeNarrativeBody`(L26)는 소제목 문단을 '완결 문단'으로 본다(`LABEL_PARAGRAPH` L25). 그래서 중간의 `###` 를 남기고, 끝에 붙은 라벨만 지운다(L36).
  - `__tests__/worker/paid-narrative-candidate.test.js:26-37` 의 기존 기대는 유지한다.
- [x] **해몽 produce 에 적용한다.** `worker/routes/dream.js:1184`(`parseNarrativeResponse`) 다음에 넣는다. 거부가 아니라 정리라서 추가 호출이 없다.
  - L1185 의 거부(`Chapter N.`·시스템 누출)는 그대로 둔다.
  - 화면용 소제목은 `renderPsychoDelivery`(L1168-1174)가 붙인다.
- [x] **반복을 줄인다.** produce 프롬프트(L1179-1180)에 `narrativePriorDigest` 를 붙이고 "꿈 장면 요약은 1장에서만" 범위 문장을 넣는다. 실측에서는 6/10 부분이 같은 요약으로 시작했다.
  - tasks 에 `title` 이 없다(L1218-1219). digest 는 `row.title || row.id` 를 쓴다.
- [x] **분량을 줄인다.** `minChars: 2000`(L1218)과 프롬프트의 "2,000자 이상, 목표 2,600~3,100자"(L1179)를 함께 원칙 3 목표로 낮춘다. 10부분 합계가 약 9,000자가 되게 한다.
- [x] 테스트: "부분 본문 중간의 `### 3.` 가 저장 본문에 남지 않는다."
  - 관련 테스트: `__tests__/worker/dream-psycho-analysis.route.test.js`(mock L35, 10회 L45·77), `__tests__/ui/psycho-dream-paid-delivery.test.js`(`totalParts:10`).

### 3. 지오맨시 분량 축소

- [x] **분량을 낮춘다.** `minChars: 3000`(`worker/routes/oracle.js:190`)과 produce 프롬프트의 "최소 3,000자, 목표 3,900~4,600자"(L143-144)를 함께 낮춘다. 7부분 합계가 약 9,000자가 되게 한다.
- [x] **부분 호출에서 전체 스키마를 뺀다.**
  - 기본 프롬프트 `buildGeomancyPrompt`(L91-120)에 JSON 7필드 스키마(L99-101)와 필드별 문장 수 규칙(L105-112)이 있다. "answer 5~7문장", "advice 한 줄 경구" 같은 규칙이 부분 분량 지시와 충돌한다.
  - 부분 호출에는 사실 블록과 문체 규칙만 넣는다.
- [x] **반복을 줄인다.** produce 에 `narrativePriorDigest` 와 부분 범위 문장을 붙인다. 예: "이번 부분은 risk 만. 세 형상의 기본 상징 설명은 answer 에서 끝났다." 실측에서는 7부분 모두 같은 원인 해석으로 시작했다.
- [x] **서버 해시를 쓴다.** `parseJsonCandidate`(L148) 대신 `parseNarrativeResponse` 를 쓴다. 본보기는 `worker/lib/tarot-oracle-delivery.js:94-106` 이다.
- [x] L178 의 `featureKey: "geomancy",` 문자열은 바꾸지 않는다. `scripts/lib/paid-delivery-inventory.mjs:57` 이 그대로 찾는다.
- [x] 테스트 mock 은 프롬프트 형식을 읽는다. `[이번 호출 범위] <id>` 형식을 유지하거나, 바꾸면 mock 도 함께 고친다.
  - `__tests__/worker/geomancy-paid-delivery.test.js:35`
  - `__tests__/worker/paid-llm-sequential.test.js:32`
  - `__tests__/worker/paid-narrative-recovery-task.test.js:38`
- [x] 화면·마케팅 문구는 지오맨시 분량을 약속하지 않는다(확인함). 문구는 바꿀 필요가 없다.

### 4. 타로 분량 조절 (마인드스캔 → 연애 → 오라클)

- [x] **마인드스캔** (`worker/lib/mindscan-delivery.js`)
  - 위치마다 meaning·emotion·action 3필드를 한 호출로 묶는다(L15-19, L25-29). 19 → 9회가 된다(5위치 + intro·summary·masterAdvice·closing).
  - 부분 `minChars`(L26, L30-33)와 summary 10문단 고정(L31)을 원칙 3 목표로 줄인다.
  - `repairShortParts: true`(L76)를 끈다.
  - 화면이 3필드를 따로 보여주면 렌더러가 한 본문을 나누거나 합쳐 보여주게 맞춘다. 화면 고정 테스트 `__tests__/ui/mindscan-immersive.static.test.js` 를 확인한다.
- [x] **연애 타로** (`worker/lib/love-tarot-delivery.js`): 바닥 26,400자(L25, 28, 30, 32)를 원칙 3 목표로 낮춘다. `repairShortParts`(L74)를 끈다.
- [x] **오라클 타로** (`worker/lib/tarot-oracle-delivery.js`): 아래를 가격대(3,000/5,000)별 목표로 낮추고, `repairShortParts`(L93)를 끈다.
  - 고정 12부분(`GENERAL` L15-23)
  - 카드별 분량 `max(1100, ceil(6500/n))`(L34, 41)
  - 짝 해석 600자(L46)
- [x] `config/pass-cost-planning-20260921.json:52` 의 부분 수를 갱신한다.
- [x] 호출 수를 고정한 테스트는 의도된 변경이다. 기대값을 새 구조에 맞추고, 이유를 테스트 이름이나 커밋에 적는다.
  - `__tests__/worker/mindscan-delivery.route.test.js`: 19회(L53·68·69·104·111·150), 38회(L74), 20회(L71), summary 10문단(L50), 5섹션(L96·120)
  - `__tests__/worker/love-tarot-delivery.route.test.js`: 9회(L54·69·70·116·138·181), 18회(L75), 10회(L72·162), matrix 8문단(L50)
  - `__tests__/worker/oracle-consultation.route.test.js`: 17회(L44·45·47·131), 34회(L50), `card.0.0` 존재(L83-84)
  - 재호출을 끄면 "짧으면 한 번 더" 류 기대(38·18·34)는 "짧아도 받는다"로 바뀐다. `__tests__/worker/paid-narrative-candidate.test.js:4` "length is advisory" 가 이 원칙을 고정한다.

### 5. 재검 실호출

- [x] 서비스마다 호출 수와 비용 견적을 보이고 따로 승인받는다. 부분당 1회, 재시도 없이 돌린다.
  - 하네스는 `harness/fu.mjs G4|D4|P4` 와 마인드스캔용 B1b(`harness/b1b.mjs`)다. 위치는 `build-cache/llm-sample-review-20261009/` 아래다.
  - 사용자 결정(2026-10-12): 반려동물 사주(P4)만 실호출한다. 나머지 서비스는 mock 으로만 검증한다.
- [x] 결과는 전체 원문 또는 절대 경로로 전달한다. 이 문서 '결과'에 호출·비용·분량·판정을 표로 적는다.

## 지켜야 할 규칙

- CLAUDE.md 를 따른다. 루트 체크아웃에 다른 세션의 미커밋이 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리를 만든다.
- 테스트는 먼저 실패시킨다. 기대값만 바꿔 통과시키지 않는다(4번의 호출 수 변경은 구조 변경에 따른 기대 변경이다).
- 출생 원값을 픽스처·로그·문서·결과에 쓰지 않는다. 사람 출생 정보는 P1·P2 마스킹 픽스처만 쓴다.
- 실결제·운영 DB 쓰기·환불·배포 명령은 하지 않는다. admin 우회와 스테이징도 쓰지 않는다.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, migrations, `worker/wrangler.toml` 구조는 건드리지 않는다. 비밀값은 출력하지 않는다.
- 정적 스크립트나 `index.html` 이 바뀌면 `npm run sync:public` 결과를 같은 커밋에 담는다.
  - `verify:public-mirror-fresh` 는 미커밋 변경이 있으면 판정을 거부한다. 커밋한 뒤 확인한다.
  - 2026-10-11 에 이 누락으로 main CI 가 실패했다(`162188523` 로 복구).
- 브랜치 push 와 PR 은 만들지 않는다. `git push origin HEAD:main` 만 쓴다.

## 함정

- 엔진 L189 `longEnough(body) ? candidate || body` 는 길기만 하면 완결성 검사를 건너뛴다. 1번의 JSON 검사가 이 경로를 막아야 한다. 다른 어댑터에 미치는 영향은 범위 밖이니 보고만 한다.
- 지오맨시와 해몽은 프롬프트 속 분량 문구가 `minChars` 와 따로 하드코딩돼 있다. 한쪽만 바꾸면 모델은 예전 분량을 쓴다.
- 반려동물 `withFloor` 는 부분 값을 줄여도 합계를 20,000자로 되돌린다.

## 결과

### 커밋 (2026-10-11~12)

| 단계 | SHA | 내용 |
|---|---|---|
| 1 반려동물 | `6473d6be1` | seed 에서 report·compat 스키마를 빼고 사실 블록·문체 규칙만 넣는다. 관리자 랩도 같은 seed 를 보여준다 |
| 1 반려동물 | `285dbbad8` | 엔진: 산문 부분의 JSON 본문을 거부하고, 마지막 시도에서는 문자열 값을 문단으로 이어 전달한다(`narrativeTextFromJson`) |
| 1 반려동물 | `f75d49ae2` | `withFloor` 를 없애고 부분 minChars 를 줄였다(report 합계 약 8,900자) |
| 2 해몽 | `955492ffa` | `stripNarrativeHeadings` 로 소제목 줄을 지운다. 앞 부분 요지를 넘기고 "꿈 장면 요약은 1장에서만" 범위를 넣었다. minChars 2000→900, 프롬프트 목표 1,200~1,500자(합계 9,000자) |
| 3 지오맨시 | `51eae274d` | 부분 호출에서 7필드 스키마·문장 수 규칙을 뺐다. 요지와 범위 문장을 넣고 `parseNarrativeResponse` 로 바꿨다. minChars 3000→1300, 목표 1,700~2,000자(합계 9,100자) |
| 4 마인드스캔 | `11eeab855` | 위치마다 3필드를 한 호출로 묶었다(19→9회). 렌더러는 여섯 문단을 순서대로 3필드에 나눈다. 예전 상태(`section-N-field`)도 렌더한다. 합계 약 9,100자. `repairShortParts` 를 껐고 pass-cost-planning 의 parts 를 25→9 로 바꿨다 |
| 4 연애 타로 | `fe2f2230e` | card 900 ×6, overview 1300, final 800, matrix 1600(합계 약 9,100자). `repairShortParts` 를 껐다 |
| 4 오라클 타로 | `d3c7931fd` | 공통 12부분 5,300자. 카드 합계는 30코인 3,000자, 50코인 5,500자(카드당 최소 450자). 짝 해석은 400자. 3,000원 약 8,300~9,700자, 5,000원 약 12,000~12,800자. `repairShortParts` 를 껐다 |
| 5 반려동물 | `4559a0469` | 한 문단으로 온 긴 부분을 렌더에서 문장 끝 기준 약 400자 문단으로 나눈다(본문 불변) |
| 5 오라클 타로 | `67345e000` | 가격 재조정(50/100코인)에 맞춰 `CARD_BUDGET` 키를 `{50:3000, 100:5500}` 으로 바꿨다. 분량 불변 |

- 2~4단계 SHA 는 origin/main 위로 rebase 한 뒤의 값이다.
- 마인드스캔 summary 는 10문단 고정을 유지했다. 화면이 10개 키(`SUMMARY`)를 따로 보여주기 때문이다. 분량만 2000→1200 으로 줄였다.
- 짧아도 완결된 부분은 재호출 없이 전달된다. 마인드스캔·연애·오라클 테스트가 이것을 고정한다.

### 검증

- 전체 jest: 385개 스위트, 5,897개 테스트 통과.
- 대상 테스트·검증기 통과: resilience, paid-gate-ui-regression, verify-oracle-consultation, verify-tarot-love-instant-flow, report-pass-economics.
- check:fast(`--base=origin/main`): paid-gate-suite 88/88, jest 385개 스위트·5,897개, node 3,171개 통과.
### 5단계 재검 (2026-10-12)

| 서비스 | 방식 | 호출 | 비용 | 분량 | 판정 |
|---|---|---|---|---|---|
| 반려동물 사주 리포트(P4) | 실호출, 부분당 1회 | 13회 | 약 $0.031 | 14,249자 | 13/13 부분 첫 시도 완료. JSON·소제목·프롬프트 누출 없음. 반복 문장 1개(shingle 겹침 최대 12.2%). 13부분 중 9부분이 한 문단이라 렌더에서 나눈다(`4559a0469`) |
| 해몽·지오맨시·마인드스캔·연애·오라클 | mock | 0회 | 0 | 테스트 고정 | 대상 테스트 통과(마인드스캔·연애·해몽·지오맨시 177개, 오라클 55개) |

- P4 원문: `D:\Development\code-destiny\build-cache\llm-sample-review-20261009\P4\result.md`. 같은 폴더의 `raw.json`·`prompt.json`·`overlap.json` 과, 문단 분할 뒤 오프라인 재렌더 `rendered-after-paragraph-split.json`(부분당 3~7문단, 문단 최대 494자, 글자 수 동일)이 있다.
- 가격 재조정 `dbecc8bf2`(다른 세션)가 오라클 구간을 50/50/100/100코인으로 바꿔 `CARD_BUDGET` 키가 어긋났다(origin/main 에서 1·4·7장 테스트 실패). `67345e000` 에서 키를 `{50:3000, 100:5500}` 으로 바꿨다. 분량은 그대로이고, 가격이 오른 상품의 분량 상향은 `premium-repricing-20261011.md` ④ 몫이다.
- 후속(범위 밖): 반려동물 본문에 "재물운" 같은 사람용 표현이 나온다. 사실 블록의 '재' 관계에서 온 것으로 보인다.
- 후속(범위 밖): 반려동물·해몽·지오맨시·마인드스캔·연애 타로가 5,000원이 됐지만 분량 목표는 3,000원 기준(약 9,000자)이다. premium-repricing ④에서 다룬다.
- 후속(범위 밖): AI Locale Gate 의 `scripts/audit-ai-locale-calls.mjs` 가 `spawnSync git ENOBUFS` 로 실패한다. `git ls-files -z` 출력(약 1.07MB)이 `execFileSync` 기본 maxBuffer(1MB)를 넘기 때문이다. `verify-payment-choice-parity.mjs` 는 main 에서 이미 `maxBuffer: 32MB` 로 고쳤다.

## 실행 명령

```
/handoff D:/Development/code-destiny/docs/handoff/2026-10-11-paid-llm-length-and-delivery.md # 첫 행동: 반려동물 부분 프롬프트에 스키마 키가 없다는 실패 테스트부터. 분량은 느슨하게, 전달 우선. 실호출은 서비스별 1회 승인·부분당 1회.
```
