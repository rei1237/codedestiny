---
status: done
updated: 2026-09-27
next: "영냥이 사주 종격 확인 질문(C)은 구현·push 완료다. 남은 것은 별도 승인이 필요한 선택 확장(신강·신약 경계값 확인 질문)뿐이니, 하려면 이 문서의 '남은 것'부터 읽고 RED 선보고한다."
---

# 영냥이 사주: 종격 가능성이 있으면 과거 좋았던·나빴던 해를 먼저 묻기 (C, 구현 완료)

## 요구 (사용자 원문, 2026-09-27)

> 꿀꿀 운세 사주 로직 중에서 지장간이나 종격 판정 같은 경우도 종격일 가능성이 있으면 사용자에게 질문을 통해서 언제가 좋았고 나빴는지 물어본 이후에 운세를 봐주도록 영냥이 사주 운세 기능을 개선해줘

사용자 결정: 같은 세션에서는 A(연도 특정)·B(결과 시각화)만 구현했다. C는 다음 세션에서 한다. 질문 시점은 **결제 전, 입력 단계**다.

## 같은 세션에서 끝난 것 (참고)

- `0f3deb556` A: 질문 속 연도(올해·내년·작년·재작년·내후년·`20xx년`·`병오년`/`丙午年`)를 상담일 기준으로 확정한다(`consultation.period.years`·start/end).
  - 프롬프트에는 요청 기간의 시기 근거만 넘기고, 항목마다 `relation`(past/current/future)과 `referenceYear`를 붙인다.
  - 생성 뒤 "올해(2025년)"처럼 상대어와 연도가 어긋나면 결정적으로 교정한다(`alignRelativeYears`, 로그 `[yeongnyangi-year-alignment]`).
  - 계획의 `ASK_YEAR_MISMATCH` 거부는 쓰지 않았다. 첫 장은 품질 재생성이 1회뿐이라, 거부하면 결과가 안 나올 위험(원칙 17)이 더 크기 때문이다.
- `a6cbc1614` B: 짧은 질문 상담에도 사주 원국표·답변 표·영냥이 말풍선·시기 타임라인을 연다.
  - 새 "질문한 해" 카드(올해 · 2026년 丙午 + 천간·지지 오행 칩)를 추가했다.
  - 타임라인에서는 질문한 해를 띠로 강조한다.
  - 1만 자 이상 전용 장식(한눈에 보기·핵심·삽화)은 기존 게이트를 유지한다.
- 이미 생성된 상담(스크린샷 건)은 재생성되지 않는다.

## 현재 상태 (실측)

- **판정:** `worker/yeongnyangi/fortune/saju/runtime.ts:113-114`가 `detectJong(p)`로 판정하고 `applyRuntimeYongshinPolicy(calcPower(p), jong, johu)`로 용신을 정한다.
- **확인 표시:** `:130`은 `confirmationRequired: jong.isJong === true`로 표시만 한다. 사용자 확인 경로는 없다.
- **조건부 문구:** `saju/index.ts:27`은 `confirmationRequired`면 "생활 이력 확인을 거치지 않은 … 조건부" 한계 문구만 붙인다.
- **`detectJong` 반환값:** `lib/saju/natal-power.js:93`에 있다. 진종격은 `isJong:true`(:198)다. 가종격도 `isJong:true`(:247)다. 그 외는 `{isJong:false}`(:214, :285)다.
- **영향 범위 (구현 때 정정):** 비프리미엄 등급(`tuna`·`assorted`·`omakase` 외)은 전체 리딩(`chapter-facts.ts:20,26`)과 질문 상담(`ask/packet.ts:97`) **양쪽 모두**에서 `jong`·`usefulGod` 근거를 뺀다. 그래서 효과가 미치는 곳은 프리미엄 3등급뿐이다. 처음에 "전체 사주 리딩에 효과"라고 쓴 서술은 틀렸다.
- **꿀꿀 운세 원본:** `js/saju-engine.js:4519` `extractSixPastTestingYears`가 좋았던 해 3개·나빴던 해 3개를 뽑는다. `:4605,4615` 오버레이가 예/아니오를 묻는다.
- **원본의 결함** (이식할 때 고친다):
  1. `:4543`: `birthYear = p.y.y ? … : (cY - 30)`. 원국 객체에 연도 숫자가 없으면 나이를 30세로 가정해 "8세 이전 제외"(`:4551`)가 틀어진다. 영냥이 입력의 `birthDate`에서 연도를 직접 쓴다. 꿀꿀 쪽 호출부에서 `p.y.y`가 실제로 비는지는 미검증이다.
  2. 후보가 `new Date()`의 연도 기준이다. 워커에서는 상담 `asOf`를 기준으로 한다(A와 같은 원칙).
  3. 엄격 매칭(천간·지지 모두 용신)이 3개가 안 되면 **천간 또는 지지 하나만** 맞아도 채운다. 판정이 느슨하다. 느슨한 해는 표시하거나 빼는 규칙을 정한다.
  4. 라디오 기본값이 '예'(`checked`)라 확인 쪽으로 치우친다. 기본값 없이 필수 선택으로 하고 "잘 모르겠음"을 둔다.

## 설계안 (구현 전 추천안 — 실제와 다른 점은 '구현 결과')

1. **질문 연도 계산 (워커, 순수 함수):**
   - `worker/yeongnyangi/fortune/saju/`에 `jongCheckYears(pillars, jong, {birthYear, asOf})`를 둔다. LLM·DB·시계 호출이 없다.
   - 결과는 `{best:[{year,ganji}], worst:[…]}`이고, 각 최대 3개, 8세 이후부터 작년까지다.
   - 간지 계산은 A의 `yearGanji`(`fortune/consultation.ts`)를 재사용한다.
2. **결제 전 노출:**
   - 추천: 계산 전용 엔드포인트(예: `POST /api/yeongnyangi/saju/jong-check`)를 새로 둔다. 입력 폼이 생년월일시를 받은 직후 호출해 `isJong`이면 질문을 띄운다.
   - 대안: `prepareFortune`(`worker/yeongnyangi/service.ts:58`)이 요청을 만들기 전에 `needsJongCheck`를 돌려주는 2단계 방식. 결제 요청 생성 경로를 건드리므로 더 위험하다.
3. **답 저장:**
   - 답(`{best:'yes'|'no'|'unsure', worst:…}`)을 입력 body → consultation에 넣는다.
   - `service.ts:102` fingerprint에 포함해, 같은 입력의 재시도가 같은 판정을 쓰게 한다.
4. **판정 적용:** `saju/runtime.ts:113-130`에서 답에 따라 분기한다.
   - 둘 다 '아니오': `applyRuntimeYongshinPolicy(calcPower(p), {isJong:false}, johu)`로 억부 용신에 되돌린다. `jong`은 `{...jong, rejectedByUser:true}`로 남긴다.
   - 둘 다 '예': `confirmationRequired:false`로 두고 `index.ts:27` 조건부 문구를 뺀다.
   - 엇갈림·'잘 모르겠음': 지금과 같다(조건부 문구 유지).
5. **문구:** 질문 문구는 12개 로케일로 쓴다. 저작은 ko·en·ja·zh-CN·zh-TW이고, 나머지는 기존 영냥이 입력 문구의 폴백 규칙을 따른다.
6. **테스트** (mock만, 과금 LLM 0회):
   - 연도 선정 순수 함수: 8세 제외, asOf 기준, 엄격/느슨 구분.
   - runtime 분기 3가지.
   - fingerprint에 답이 들어가는지.
   - 입력 화면에서 질문 노출·필수 선택.

## 확정 결정 (2026-09-27 사용자 답변)

1. **판정 반영:** 둘 다 '아니오'면 억부 용신으로 되돌린다. 둘 다 '예'면 종격을 확정하고 조건부 문구를 뺀다. 엇갈림·'잘 모르겠음'은 지금과 같다.
2. **질문 연도:** 엄격 매칭만(천간·지지 모두). 좋았던 해·나빴던 해가 **각각 2개 이상**일 때만 묻고, 모자라면 질문 없이 조건부 문구를 유지한다.
3. **노출 등급:** 프리미엄 3등급만(`saju_tuna`·`fusion_saju_ziwei`·`fusion_all`). 근거는 위 '영향 범위 (구현 때 정정)'.
4. **작업 위치:** main 직접.

## 구현 결과 (2026-09-27)

| 커밋 | 내용 |
|---|---|
| `7a35093ca` | 워커 순수 함수·runtime 분기. `saju/jong-check-policy.ts`(`jongCheckApplies`), `saju/jong-check.ts`(`jongCheckYears`·`parseJongAnswer`·`resolveJongVerdict`), `runtime.ts` `calculateScreenSaju(profile, now, jongAnswer?)`, `index.ts` 한계 문구 분기 |
| `d2ccd587f` | `POST /api/yeongnyangi/saju/jong-check`(`service.ts` `jongCheckFortune`, 인증·읽기 전용·`private, no-store`)와 `prepareFortune` 배선 |
| `f914e6b7c` | 입력 화면 질문(`Consultation.tsx`), 문구 `app/yeongnyangi/_lib/jong-check-copy.ts`(ko·en·ja·zh-CN·zh-TW, 나머지 en 폴백), CSS |

- **판정 흐름:** 답은 서버가 prepare 시점에 다시 계산한 질문 연도와 **정확히 같을 때만** 쓴다. 다르면 `unconfirmed`(지금과 같은 조건부 동작)다.
  - rejected: 억부 용신·일반격 격국으로 읽고, 한계 문구를 "생활 이력 확인 결과가 종격 흐름과 맞지 않아 일반격(억부) 용신으로 읽었습니다."로 바꾼다. `jong`은 `{isJong:false, rejectedByUser:true, candidateName, userCheck}`로 남는다. 합화 사실은 유지한다.
  - confirmed: `confirmationRequired:false`, 조건부 문구 없음.
- **요청 id:** 답이 없으면 fingerprint에 필드를 넣지 않아 기존 요청 id가 그대로다(편집 전후 scratch 대조로 실측). 답은 프리미엄·사주·비영혼(`!spiritInput`)일 때만 읽고, 그 밖에는 버린다. 형식이 틀리면 `INVALID_JONG_CHECK`(fail-closed)다.
- **입력 화면:** 질문이 떠 있으면 두 답이 모두 필수다. 확인 요청 중에는 결제 버튼이 잠깐 비활성이다(8초 timeout). 확인이 실패하면 질문 없이 결제로 진행한다. 연도 항목은 390px에서도 한 줄(nowrap)이다.
- **상대방·질문 상담 시기 확장·daily-cross·무료 리딩**은 답을 받지 않는다(상대 재귀 호출은 `jongAnswer:undefined`).
- **원본과 다른 점 (의도):**
  - 기신 목록에서 용신 오행을 뺀다. 원본은 두 목록에 같은 오행이 들어갈 수 있어, 같은 해가 좋았던 해 후보이자 나빴던 해 후보가 될 수 있었다.
  - 한 해는 좋았던 해·나빴던 해 한쪽에만 들어간다.
- **알려진 경계:** 출생지를 자유 입력(`extraPlace`)으로만 보완하면 지오코딩이 prepare 때 일어나, 확인 질문은 기본 위치로 계산된다. 둘의 연도가 다르면 답은 무시되고 조건부 동작으로 돌아간다(오판정 쪽으로는 가지 않는다).
- **테스트:**
  - `__tests__/ui/yeongnyangi-jong-check.test.mjs`: 순수 함수, runtime 분기 3종.
  - `__tests__/ui/yeongnyangi-consultation-kinds.test.mjs`: 답이 없으면 id 불변, 비프리미엄은 무시, 프리미엄은 id 변경.
  - `__tests__/worker/yeongnyangi-route.test.js`: 새 경로가 인증·no-store·공유 보안을 탄다.
  - `__tests__/ui/yeongnyangi-ui-locale-copy.test.mjs`: 문구.
  - `scripts/verify-yeongnyangi-consultation-browser.mjs`: tuna는 질문 노출·필수·`jongCheck` 전송, flounder는 미노출.

## 남은 것

- **선택 확장 (별도 승인):** 지장간을 쓰지 않는 `calcPower`(`lib/saju/natal-power.js:54`)는 경계값(score≈30)에서 신강/신약이 모호하다. 같은 확인 질문으로 묻는 안이다.

## 위험·검증·롤백 (RED)

- **위험:**
  - 결제 전 입력 흐름과 fingerprint를 바꾼다(결제 진입·멱등성).
  - fingerprint에 필드가 추가되면 기존 진행 중 요청과 키가 달라진다. 답이 없을 때는 필드를 생략해 기존 키를 유지해야 한다.
- **필독·감사:** [payment-gating](../context/payment-gating.md), paid-gate-auditor. 입력 화면은 [design-and-ui](../context/design-and-ui.md).
- **검증:**
  - `npm run check:fast`, 영냥이 UI 테스트(`node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/yeongnyangi-*.test.mjs`).
  - 입력 화면 390px 캡처는 visual-checker로 판정한다.
  - 결제 변경이 있으면 `verify:paid-gate-ui`도 돌린다.
- **롤백:** 순수 함수·runtime 분기·입력 UI를 각각 커밋하고, 문제가 된 커밋만 `git revert`한다.
- **권장:** Opus / effort high.

## 보고만 (범위 밖, 같은 세션에서 발견)

- `app/yeongnyangi/_components/Result.tsx:136`의 `/assets/yeongnyangi/hero.webp`가 추적되지 않는 파일일 수 있다(미검증).
- 시기 타임라인의 기존 문제:
  - 라벨 칩이 짧은 막대를 가린다.
  - 0인 오행 막대가 2px로 보인다.
  - 한 해짜리 구간이 "2025 – 2025"로 표시된다.
  - 금색 막대 위에서는 질문한 해 띠 채움이 거의 안 보인다(테두리로만 구분).
- 타임라인은 차트에 시기 그룹(대운·세운 사실 선택)이 있을 때만 뜬다. 짧은 질문 상담에서는 없을 수 있다. 그때는 질문한 해 카드가 연도를 대신 보여준다.
- 시각화 문구(`visualCopy`)는 ko·en·ja만 있고, 나머지 로케일은 en 폴백이다(기존 패턴).
