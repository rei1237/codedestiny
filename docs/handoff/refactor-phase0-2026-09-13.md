---
status: active
updated: 2026-09-13
next: Phase 1 은 끝났다(refactor-phase1-2026-09-13.md). 다음 세션은 그 문서를 읽고 Phase 2(LLM 경계 닫기)부터 시작한다.
---

# 점진 구조 개선 Phase 0 인수인계

🔴 **Phase 1 은 완료됐다 — 최신 인계는 [refactor-phase1-2026-09-13.md](refactor-phase1-2026-09-13.md) 다.**
이 문서는 계속 유효하다: 아래의 **작업 규칙·금지 영역·현재 구조·남은 문제 4건**이 리팩터링 전체의
정본이다. 단 맨 아래 "다음 작업 — Phase 1" 절은 측정으로 뒤집혔으니 Phase 1 문서를 따른다.

## 왜 이 작업을 하는가

모든 변경에서 회귀가 나고, 한 기능을 고치려면 여러 파일을 함께 만져야 하고, AI 가 작은 수정에도
과도한 컨텍스트를 읽는 상태를 고치는 것이 목적이다. 우선순위는 **회귀 방지 > 안정성 > 유지보수성 >
코드 미관**이고, 목표는 예쁜 코드가 아니라 "고장 나기 어렵고, 고쳐야 할 때 빨리 고칠 수 있는 서비스"다.

전수 측정으로 확인된 병의 정체는 **폴더 배치가 아니라 판정의 중복**이다. 같은 질문(이 사용자가
이 기능을 쓸 수 있는가 · 이 생일의 사주는 무엇인가 · 성별을 어떻게 정규화하는가)이 여러 곳에
**서로 다른 답**으로 구현돼 있어서, 한 곳을 고치면 다른 곳과 어긋나고 그 어긋남이 회귀로 보인다.

🔴 **작업 규칙(이 리팩터링 전체에 적용): 중복된 판정을 없애는 변경은 한다. 파일을 옮기는 변경은
하지 않는다.** 근거는 [docs/CONTEXT_AUDIT.md](../CONTEXT_AUDIT.md) 의 `2026-09-12` 항목과
[docs/refactor/architecture-map.md](../refactor/architecture-map.md) 6절에 있다 — 이 레포의
안전망이 **경로 모양**(`__tests__/ui` 139/149 가 `readFileSync` 고정 경로, jest LLM 목 매퍼가
상대 깊이 의존, `payment-freeze` 가 경로+본문 해시, verify 189개가 경로 grep)이라 파일을 옮기면
가드가 조용히 꺼진다. 다시 논의하지 말고 이 규칙을 따른다.

## 완료한 Phase

**Phase 0 — 감사 문서 + 가드 shadow 배선 + guardian 가드 현행화.** 운영 코드 0줄 변경.

| 커밋 | 내용 |
|---|---|
| `517939421` | guardian 무료 한도 가드가 정책 숫자(3·2·1)를 박는 대신 정본 상수를 읽는다 → 7실패 → 0 |
| `ecc17b406` | `verify-guard-wiring.mjs` 에 `SHADOW_OBSERVING` 버킷 + 양방향 축 (self-test 24케이스) |
| `9163a7dac` | `.github/workflows/guards-shadow.yml` 신설 + 실측 통과 가드 41개 이관 |
| `e051b101f` | 구조 부채 원장 4종 + `CONTEXT_AUDIT` 충돌 해소 1항목 |

**검증된 마지막 변경 = `e051b101f`** — 위 4개를 `check:fast` 33스텝(`--committed-head
--base=1add8df4a --head=e051b101f`)으로 확인했다. 그 뒤의 커밋은 이 인수인계 문서뿐이므로,
되돌릴 일이 생기면 `e051b101f` 가 아니라 **문제를 만든 그 커밋 하나만** `git revert` 한다.

🔴 이 레포는 main 을 옆 세션과 공유한다. 내 push 가 그 세션의 커밋을 함께 올릴 수 있다
(2026-09-13: `47e8b88c9` 꽃돼지 스프라이트 — 내 검증 범위 밖이다). `git log` 를 내 작업 목록으로
읽지 말고 위 표의 SHA 로 판단한다.

## 현재 구조 (요지만 — 전체는 원장 문서)

- production `/` 는 `app/page.js` 가 아니라 **38,517줄 수작업 `index.html`** 이다
  (`scripts/promote-static-shell-to-root.mjs` 가 덮어쓴다). 120일 커밋의 24%가 이 파일이다.
- API 는 `worker/index.js` 의 경로 조건문 91개 + `worker/routes/` 72파일 동적 디스패치.
- 결제 **정본은 이미 분리돼 있다**(`worker/payments/` 21모듈, 가격은 `paid-feature-registry.js`
  단일 소스). 결합은 코드 배치가 아니라 **판정** 쪽이다 — 이용권 판정 3벌, 주문 status enum 병렬
  6개 이상, 권한 writer 4개 × TTL 4종.
- LLM 공급자도 이미 추상화돼 있다(`worker/lib/gemini.js`). 구멍은 우회 3곳과 경로 의존 목 매퍼다.

세부 수치·줄번호·측정일은 [docs/refactor/](../refactor/) 4개 문서에 있다.
🔴 **그 숫자를 다시 전수 측정하지 마라.** 필요한 행만 그 문서의 "측정 방법 재현" 명령으로 재확인하고
해당 행의 날짜를 갱신한다. 반복 전수 분석이 애초에 이 문서들을 만든 이유다.

## 수정한 파일

```
scripts/verify-guardian-fortune-failure-contract.mjs   기대값을 정본 상수에서 유도
scripts/verify-guard-wiring.mjs                        SHADOW_OBSERVING + 축 4개 + 41개 이관
.github/workflows/guards-shadow.yml                    신설 (283줄, 가드 스텝 41개)
docs/refactor/{README,architecture-map,regression-risk-map,structural-issues-top20,phase-plan}.md  신설
docs/CONTEXT_AUDIT.md                                  판정-단위 충돌 해소 1항목
```

## 남은 문제

### 1. shadow 41개는 아직 아무것도 막지 않는다 (설계대로)

`guards-shadow.yml` 은 `ci-required` 의 `needs` 에 **없고** 스텝마다 `continue-on-error: true` 다.
차단 승격 조건은 **main push 10회 관측(관측시작일 2026-09-13) + 그 기간 오탐 0 + 사용자의 명시적
승인**이다. 게이트 추가는 승인 사항이므로 임의로 올리지 않는다. Phase 9 에서 제안한다.

관측 집계: `gh run list --workflow=guards-shadow.yml -R <repo>` → `gh run view <id> --json jobs`
의 `steps[].conclusion`.

**관측 1/10 (2026-09-13, 커밋 `c3aa60546`, run `34715837924`): 가드 41개 전원 성공, 오탐 0.**
같은 push 의 `CI required` 는 영향 없이 success — 차단력 0 이 실제로 확인됐다.

🔴 관측 집계표의 정본은 [refactor-phase1-2026-09-13.md](refactor-phase1-2026-09-13.md) 로 옮겼다
(2026-09-13 기준 **4/10**, 오탐 0). 여기에 중복해서 적지 않는다.

### 2. 실패 가드 3개 — 원인은 범위 밖이라 보고만 한다 (코딩 원칙 14)

`UNWIRED_BY_DESIGN` 에 그대로 남겼다. 통과하지 않는 것을 관측에 넣으면 "오탐 0" 기준이 처음부터
무의미해진다. 고칠 때는 각각을 **독립 작업**으로 다룬다.

| 가드 | 실패 내용 |
|---|---|
| `verify:no-timestamp-conflict` | `$setOnInsert` ↔ mongoose `timestamps` 충돌 3건 |
| `verify:today-hub-gate` | 부분 실패 안내·지연 공개 계산 누락 |
| `verify:animal-totem-reading` | five 티어 판정 1건 |

### 3. 🔴 테스트가 실과금 LLM 호출을 할 수 있는 상태 (Phase 2 에서 닫는다)

`jest.config.cjs` 의 목 매퍼가 `^\.\./\.\./lib/llm-client\.ts$` 라는 **상대 깊이**에만 걸린다.
깊이가 다른 테스트는 목을 못 받는다. 그때까지 새 LLM 테스트를 추가하면 반드시 목 주입을 직접 확인한다.

### 4. `public/js/` 에 소스 없는 수작업 파일 3개 — 보고만 (2026-09-13 실측)

`public/js/` 는 명목상 `js/` 의 생성 미러인데(`scripts/sync-legacy-static-to-public.mjs`), 아래 3개는
`js/` 에 원본이 **없다**. 그 스크립트는 `cpSync` 로 더하기만 하고 target 을 솎아내지 않으므로
미러 아닌 파일이 영구히 남아 `dist/`·`out/`·Android 번들까지 실려 나간다.

| 파일 | LOC | 판정 (검색 범위: 레포 전체, `dist/`·`out/`·`apps/mobile/android/` 제외) |
|---|---|---|
| `public/js/sukuyo-book.js` | 3,863 | **고아.** 참조가 `docs/payments/payment-inventory.json`·`payment-p0-inventory.json` 과 죽은 `styles/life-book.css:2232-2380`(`#sukuyoBookModal`, 아무도 생성하지 않음)뿐. script 태그·import 0 |
| `public/js/vedic-astrology-module.js` | 80 | **고아.** 참조 0 |
| `public/js/birth-place-groups.js` | 130 | 🔴 **살아 있다.** `app/fusion-fortune/FusionFortuneClient.tsx:2339`, `vedic-astrology.html:864`, `public/vedic-astrology.html:864` 가 `/js/birth-place-groups.js` 를 동적 로드 |

🔴 **`public/js/` 를 정리하거나 sync 를 솎아내기(prune) 전에 `birth-place-groups.js` 의 `js/` 원본을
먼저 만들어야 한다.** 지금 상태에서 미러를 청소하면 융합 운세의 출생지 선택기가 죽는다. 고아 2개도
결제 인벤토리에 유료 표면으로 올라가 있으니 삭제는 [cleanup 규칙](../../CLAUDE.md)대로 별도 변경으로
다루고, 소스·테스트·verify 3면 확인을 먼저 한다(코딩 원칙 9).

## 다음 작업 — Phase 1 (C급 중복 수렴) 〔완료 — 이 절은 측정으로 뒤집혔다〕

🔴 아래 목록은 2026-09-13 Phase 1 에서 **변이 검증으로 대부분 부정됐다.** pass 가격과 worker 내
`KRW_PER_COIN` 은 이미 가드가 묶고 있었고, 원화 포맷·`normalizeGender` 은 벌끼리 계약이 달라 C급이
아니며(→ Phase 6), `Asia/Seoul`·Julian day·`iana-offset` 은 이번 리팩터링에서 하지 않는다.
결과와 근거는 [refactor-phase1-2026-09-13.md](refactor-phase1-2026-09-13.md) 와
[structural-issues-top20.md 의 "16·17 재측정"](../refactor/structural-issues-top20.md#1617-재측정-2026-09-13-phase-1)
에 있다. 기록으로만 남긴다:

- pass 가격 4종: `lib/payment/pass-pricing.js:18-21` ↔ `worker/lib/app-store-pricing.js:73-76`
- `KRW_PER_COIN` 3곳, 원화 포맷 인라인 ~25곳
- `normalizeGender` 31벌, `Asia/Seoul` 하드코딩 121파일, Julian day 9벌
- `iana-offset` 정본 importer 6 vs 경쟁 파서 4

🔴 가격·이용권 상수는 **등급 C 가 아니다.** 값이 하나라도 바뀌면 결제 금액이 바뀐다. "정본을 읽게
바꾼다"와 "값을 통일한다"를 섞지 말고, 불일치를 발견하면 먼저 보고한다. 작업 루프는
[phase-plan.md](../refactor/phase-plan.md) 에 고정돼 있다. **이 두 문단은 Phase 2 이후에도 유효하다.**

## 절대 건드리면 안 되는 영역

- **동결 파일**: `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`,
  `worker/lib/billing.js`·`payments.js`. 변경은 `config/payment-freeze.json` 절차를 따른다.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 결과물,
  `worker/wrangler.toml` 구조.
- `.github/workflows/pr-ci.yml` (68KB) — Phase 3 의 작업 대상이며 그 전에는 만지지 않는다.
- `js/saju-engine.js` `calculate()` — 34,129줄·단위 테스트 0. characterization 고정 전 구조 변경 금지.
- 실 LLM 호출 · 실결제 · 운영 DB 쓰기 · PR 생성 · 브랜치 생성.

## 검증 명령

```bash
node scripts/verify-guardian-fortune-failure-contract.mjs   # 0 실패
node scripts/verify-guard-wiring.mjs --self-test            # 24 케이스
node scripts/verify-guard-wiring.mjs                        # 254 배선(41 shadow) / 62 선언 / 배포게이트 27-27
npm run check:fast                                          # 변경 기반 1회
```

🔴 `check:fast` 의 기본 베이스는 **작업 트리**다. 옆 세션의 미커밋 파일이 있으면 검사 범위가 그쪽으로
넓어진다. 내 커밋만 보려면 `--committed-head --base=<sha> --head=<sha>` 를 쓴다(이번 세션에서
그렇게 했다). 공유 체크아웃에서 `reset --hard`·`stash`·`checkout --` 는 옆 세션 작업을 복구 불가로
지운다 — 쓰지 않는다.

## 함정 (이번에 실제로 밟은 것)

- `scripts/verify-guard-wiring.mjs` 와 워크플로 yml 은 **CRLF** 다. `Edit`·`sed` 가 EOL 을 떨구므로
  EOL 을 보존하는 node 패치로 고쳤다.
- `isWired()` 는 **도달 가능성만** 본다 — 스텝이 무는지는 보지 않는다. 그래서 shadow 항목을 기존
  버킷에서 지우는 순간 감사가 "없는 보호를 있다"고 단언한다. `SHADOW_OBSERVING` 이 그걸 막는다.
- `edgesFrom()` 은 `npm run <이름>` 문자열을 찾는다. 워크플로에 그 문자열이 없으면 배선으로 안 보인다.
- 잡 레벨 `continue-on-error` 는 **쓰지 않았다.** 걸면 `npm ci` 가 깨진 런도 초록이라 "41개 전부
  통과" 와 "한 번도 안 돌았다" 가 구분되지 않는다.
- `mock-network-guard.cjs` 를 CI 잡의 `NODE_OPTIONS` 로 넣으면 `actions/checkout`·`setup-node`·
  `npm ci` 까지 막힌다. 로컬 실측에서만 켠다.
- 도는 가드 ≠ 무는 가드. 새 축 4개는 **변이 5건을 만들어** 전부 잡히는지 확인했다.
