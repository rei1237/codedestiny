---
status: active
updated: 2026-08-25
next: "\"🔴 남은 것 — 2026-08-25 3차 재측정\" 절부터"
---

# 영어·일본어·중국어 서비스 최적화 — 인수인계 (2026-08-25)

> **이 문서만 읽고 시작할 수 있게 쓴다.**
> 사전 스윕(화면에 보이는 한국어 제거)은 별도 계보다 — [locale-sweep-2026-08-25-part4.md](locale-sweep-2026-08-25-part4.md) 를 볼 것.
> 이 문서는 **"이 서비스가 en/ja/zh 사용자에게 제대로 동작하는가"** 를 다룬다. 겹치지만 다른 축이다.

## 🔴 먼저: 세 층을 구분하지 않으면 없는 문제를 만든다

이 레포의 로케일은 **서로 다른 세 개의 파이프**로 처리된다. 어느 층의 문제인지 먼저 정하지 않으면
엉뚱한 곳을 고치게 된다. 2026-08-25 세션이 실제로 그 함정에 빠졌다(아래 "내가 틀렸던 것").

| 층 | 무엇 | 처리 방식 | 정본 |
|---|---|---|---|
| ① 화면 텍스트 | 마크업·서버 렌더 산문 | **런타임 역인덱스**가 텍스트 노드를 통째로 치환 | `public/i18n/<locale>/shellRuntime.json` + `lib/i18n/dictionary.ts` |
| ② 생성 문구 | 보간·조합으로 만들어지는 문자열, 에러 메시지 | **소스의 12로케일 카피 표** | 각 컴포넌트(`NamingAiClient.tsx` 등) |
| ③ AI 응답 | LLM 이 쓰는 본문 | **요청 스코프 앰비언트 파이프** | `lib/i18n/ai-locale.js` |

①은 사전에 키를 넣으면 끝난다. ②는 사전이 못 잡는다(문자열이 런타임에 조립되므로). ③은 둘 다 아니고
프롬프트가 정한다.

### ③ AI 응답 파이프 — **이미 전 라우트에 배선돼 있다**

```
worker/index.js:481   runWithAiLocale(resolveAiLocaleFromRequest(request), runRoute)   ← 46개 라우트 전부
worker/lib/ai-locale-context.js                                    AsyncLocalStorage
worker/lib/gemini.js         locale: options.locale || getAmbientAiLocale()   (callGeminiText)
lib/llm-client.ts:965      applyOutputLocale()  → systemPrompt **와** 프롬프트 꼬리 양쪽에 지시문 주입
```

🔴 **그래서 "이 라우트에 locale 이 없다"는 것은 결함의 증거가 아니다.** 라우트가 로케일을 몰라도
출력 언어는 이미 지시된다. `grep -c locale worker/routes/*.js` 로 판단하면 안 된다.

🔴 지시문을 새로 만들지 말 것. `lib/i18n/ai-locale.js` 가 **한국어로 지시문을 쓰면 안 되는 이유**를
실측 근거와 함께 적어 두었다 — 폴백 모델은 한국어 지시 준수율이 낮아 "영어로 써라"를 한국어로 말하면
그대로 한국어를 뱉는다. 정본은 대상 언어 + 영어를 병기하고 "위쪽 한국어 지시를 무효화한다"까지 박아 둔다.

## 내가 틀렸던 것 (같은 실수를 반복하지 않도록)

이 세션은 작명 서비스를 고치면서 **"영어 사용자가 결제하면 한국어 리포트를 받는다"** 고 진단했다.
근거는 `worker/routes/naming-prompt.js` 1,802줄에 `locale|lang|language` 가 0건이라는 grep 이었다.

**틀렸다.** 위 ③ 파이프가 이미 출력 언어를 강제하고 있었다. 실제 문제는 언어가 아니라 **내용**이었다:
한국 이름, 대법원 인명용 한자, 원형이정 4격, 한글 초성 소리오행. 언어는 맞고 문화가 틀린 상태였다.

그 오진 때문에 출력 언어 지시 블록을 새로 만들어 붙였고, 결과적으로 **같은 지시가 세 번** 들어갔다
(systemPrompt + 프롬프트 꼬리 + 내 블록). 커밋 `7d39e678d` 에서 걷어냈다.

🔴 **교훈**: 파일 단위 grep 으로 파이프의 부재를 단언하지 말 것. 앰비언트 주입은 호출부에 안 보인다.
호출 경로를 끝까지 따라갈 것 — `runWithAiLocale` → `getAmbientAiLocale` → `applyOutputLocale`.

## 지금 상태 (2026-08-25 실측)

### ③ AI 응답 — 12개 로케일 완비

`AI_OUTPUT_LOCALES` 12개 전부가 출력 대상이다. `verify:ai-locale-pipeline` 이 14개 불변식을 지킨다.
**남은 것은 "지시가 실제로 지켜지는가"인데, 이건 과금 실호출 없이는 못 잰다(미검증).**

### ② 소스 카피 표 — 절반쯤

```
app/**/*.tsx  총 488개
  한국어 없음            204
  로케일 배선 있음       104
  한국어 + 배선 없음     180
```

🔴 **180개가 전부 결함은 아니다.** 그중 다수는 서버 렌더 SEO 산문이고, 그건 ① 사전 스윕이 처리한다.
게다가 한국어 서버 렌더 분량은 **일부러 유지해야 한다** — `verify-adsense-readiness` 가 그 분량을 센다.
배선이 필요한 것은 **보간으로 조립되는 문자열**뿐이다(에러 메시지, `${n}자`, 날짜 포맷 등).

배선이 이미 있는 대표: `app/naming-ai/NamingAiClient.tsx`(12), `app/fusion-fortune/FusionFortuneClient.tsx`(12),
`app/naming-ai/result/resultCopy.ts`(5 + en 폴백, 이번에 추가).

### ① 화면 텍스트 사전 — 별도 문서

라우트가중 101,072(2026-08-25, 359 라우트). [locale-sweep-2026-08-25-part4.md](locale-sweep-2026-08-25-part4.md) 참조.

## 작명 서비스 — 이번에 한 것과 남은 것

PR #1121(`feature/naming-locale-branch`). 커밋 5개.

### 끝난 것

| 층 | 내용 |
|---|---|
| ③ | `worker/lib/naming-locale-profile.js` — ko/ja/zh-CN/zh-TW/라틴 문화 분기. ja 는 姓名判断 五格 + 法務省 人名用漢字, zh 는 八字起名 + 三才五格 + 谐音, 라틴은 획수 대신 어원·의미 |
| ③ | 로케일이 **`inputHash` 에 안 들어간다** — 넣으면 배포 전 결제자가 막히고, 언어만 바꿔도 30,000원이 재청구된다 |
| ③ | 이름 카드 라벨은 어떤 언어에서도 한국어 고정 — 파서의 키이고 실패가 **조용히 강등**된다 |
| ② | `app/naming-ai/result/resultCopy.ts` — 결과 페이지 70문자열 × 5로케일 |
| ② | 무료 초안에 "이 후보는 한국 이름 기준" 고지 12로케일 |
| — | `parseAssistantSections` 의 `numberedHeadings` 폴백 — 없으면 비-ko 작명첩이 **문단 균등 분할**로 엉뚱한 장에 들어간다 |

가드: ko 프롬프트 **골든 스냅샷**(13,221바이트, 렌더 비교), 로케일 전수 발견(음성 테스트 완료),
한국 전용 수리 누출 줄 단위 검사, 카드 블록 파서 왕복.

### 끝난 것 — 2026-08-25 후속 (1·2번)

**1. 무료 초안 로케일별 이름 풀 — 완료.** `app/naming-ai/namingNamePools.ts` (신규).

- 조합이 아니라 **실재하는 이름 목록**이다. 버킷 4개: `ja`(41) · `zh-CN`(47) · `zh-TW`(43) · `latin`(44).
  `latin` 은 en 외에 vi·hi·es·fr·de·nl·ms 가 함께 쓴다.
- 🔴 **ko 는 이 파일을 타지 않는다.** `resolveNamePoolBucket` 이 `ko` 와 빈 값을 `null` 로 돌려
  기존 한글 조합 경로를 그대로 태운다. `buildRecommendationBundle(input, hints)` 처럼 locale 을 생략한
  호출도 ko 경로다 — 실측으로 `locale 생략 === "ko"` 결과가 완전히 같음을 확인했다.
- 오행 태깅은 **소리가 아니라 뜻**이다(한글 초성 오행은 한국어 전용). CJK 는 字义五行, 라틴권은
  `worker/lib/naming-locale-profile.js` 의 `latinProfile` C절 매핑을 그대로 따른다. 두 표가 갈라지면
  무료 초안과 유료 작명첩의 근거가 어긋난다.
- 🔴 **오행·성별마다 한 글자와 두 글자를 모두 갖춰야 한다.** 폼의 "이름 글자 수"가 먼저 거르기 때문에
  한 칸이라도 비면 그 길이에서 요청한 오행·성별이 통째로 사라진다 — 실측으로 zh-CN 의 두 글자 후보가
  木 뿐이라 女·水 요청에 男·木 이름이 상위에 올랐다. 가드가 이 불변식을 단언한다.
- 라틴권은 **이름이 성 앞에 오고**(`Iris Kim`), **글자 수 조건을 적용하지 않는다**(개념이 없다 — 적용하는
  척하면 근거 없는 필터가 된다). 그 사실을 status 문구로 밝힌다.
- 화면 문구(후보 설명·안내문·분위기 칩)는 `app/naming-ai/namingDraftCopy.ts` 에 en·ja·zh-CN·zh-TW 로
  저작했고 나머지 일곱은 영어 폴백이다(resultCopy.ts 와 같은 관행).
- `NamingAiClient.tsx` 의 `freeDraftKoreanOnlyNote` 는 `freeDraftPoolNote` 로 이름이 바뀌었다.
  ja·zh-CN·zh-TW·en 은 빈 문자열(자기 문화권 이름이라 고지가 필요 없다), 라틴 폴백 일곱은
  "영어 이름 목록에서 골랐다"로 문안을 고쳤다(예전 문안은 "한국어 음절"이라 이제 거짓이다).

**2. 로케일별 장 제목 패턴 — 완료.** `resultCopy.ts` 에 `chapterTitleKeywords` 를 로케일마다 두고
`NamingAiResultClient.tsx` 가 그것을 쓴다. ko 패턴은 한 글자도 바꾸지 않았다.

🔴 **그 과정에서 진짜 결함을 하나 찾았다.** `lib/llm-text.js` 의 키워드 경로 헤딩 상한이 46자였는데,
영어 2장 제목 "Your chart, and the favourable element verified" 는 47자라 **헤딩으로 잡히지도 않았다**.
아래 `numberedHeadings` 경로가 이미 80자를 허용하므로 창을 그쪽에 맞췄다(46 → 80). `titleKeywords`
일치 조건은 그대로라 느슨해지는 것은 "장 제목 낱말을 품은 47~80자 줄"뿐이고, 이 함수의 프로덕션
호출부는 작명 결과 화면 **한 곳뿐**이다(`git grep parseAssistantSections` 전수).

가드: `__tests__/ui/naming-locale-pools.test.js` (node --test — PR CI 의 fast 잡이라 티어와 무관하게
항상 돈다) + `__tests__/lib/assistant-sections.numbered-headings.test.js` 에 로케일 패턴 왕복 추가.
🔴 검사 대상은 손으로 열거하지 않고 모듈·소스에서 전수 발견한다. 음성 테스트 5건으로 가드가 실제로
실패하는 것까지 확인했다(한글 이름 혼입 / ko 누출 / 패턴 누락 / 카피 공백 / 로케일 미전달).

### 끝난 것 — 2026-08-25 후속 2회차 (유료 결과 화면)

작명에서 고친 것과 같은 축을 다른 유료 결과 화면으로 넓혔다. 결제가 끝난 사용자가 **자기 언어의 본문을
한국어 껍데기 안에서** 받던 자리들이다.

| 화면 | 고친 것 |
|---|---|
| 인연의 서 결과 | `MasterLoveCodexResultClient`(오류·aria·생년월일 줄) · `CodexReader`(PDF 파일명·표지 부제) · `CodexChapter`(sr-only 장 번호·화자 이름) · `CodexPrologueScene`(alt 2) · `CodexReportOutro`(마무리 한 줄) |
| 베다점 결과 | `app/vedic-ai/result/resultCopy.ts` 신설 + 화면 문구 14개 배선 |
| 자미두수 심화 PDF | 내려받는 **파일명과 표지 제목**이 한국어 고정이었다(화면 표지는 이미 로케일화돼 있었는데 export 경로만 새고 있었다) |

🔴 **`useMasterLoveCodexCopy()` 는 렌더마다 새 객체를 돌려준다**(EN 과 스프레드 병합). 의존성 배열에
그대로 넣으면 무한 fetch 가 된다 — 결과 화면에서 실제로 밟았고, `useMasterLoveCodexLocale()` + `useMemo`
로 신원을 고정해 고쳤다. 훅 쪽에도 경고를 적어 두었다.

가드: `__tests__/ui/paid-result-locale-copy.test.js` (node --test — 티어 무관 항상 돈다). 넷을 본다 —
①소스 카피 표의 **로케일 간 키 집합 일치**(레포 전수, `i18n:check` 가 못 보는 층이다) ②유료 카피 모듈의
저작 5로케일 커버리지 ③그 블록이 **조회표에 등록돼 실제로 도달 가능한가** ④유료 결과 화면에 하드코딩된
한국어가 없는가. 음성 테스트 4건으로 전부 실패하는 것을 확인했다.

#### 🔴 앞선 실측이 부풀려져 있었다 — 다시 재는 법

"한국어 + 로케일 배선 없음 180개" 같은 수치는 **탐지기가 놓치는 배선 방식** 때문에 크게 부푼다.
2026-08-25 재측정에서 다음이 전부 오탐이었다:

- **사전 배선**(`useTPick`/`useT`) — 소스의 한국어가 ko 정본이고 나머지 11개는 `public/i18n/**.json` 이 준다.
  `FeatureMarketingDetailModal.tsx`(501줄) 이 이 모양이라 최대 결함으로 잡혔지만 **이미 완료**였다.
- **`Partial<Record<NonKoLocale, …>>`** — `Record<LoadingLocale` 만 찾으면 안 걸린다.
  `src/features/neo-war-room/data/result-copy.ts`(94줄)가 그렇고, ko·en·ja·zh-CN·zh-TW 완비였다.
- **`const X_EN` 폴백 상수** — Record 안에 `en:` 키가 없는 것이 정본이다. "en 누락" 7건 중 6건이 이것이었다.
- **개발 전용 픽스처** — `NeoOperationRoomResultPage.tsx` 의 한국어 83줄은 전부 `NODE_ENV !== "production"`
  게이트 뒤의 미리보기 데이터와 개발 네비다. 라이브 노출 **0**.
- **기계 계약 키** — `realityCheckOptions` 의 한국어는 파서 키이고 렌더는 `getNeoRealityCheckLabel(item, locale)` 이다.
  `CodexChapter` 의 `/^제\s*\d+\s*장\s*·\s*/` 도 같다. **번역하면 조용히 죽는다.**

재측정 결과(2026-08-25, `app/**` + `components/**` + `src/**` 의 `"use client"` 파일):
**78개 파일 · 한국어 표면 2,092개**. 관리자 콘솔(사용자 노출 없음)과 찻집(별도 워크스트림)은 뺀 수치다.

### 끝난 것 — 2026-08-25 후속 3회차 (공용 껍데기)

유료 결과 화면들이 **공통으로 얹는** 컴포넌트가 한국어로 남아 있었다. 본문은 일본어인데 넘김 버튼만
한국어인 화면이 나오던 자리다. `components/fortune/_lib/fortune-shared-copy.ts` 를 신설해 한 번에 고쳤다.

| 대상 | 왜 값어치가 큰가 |
|---|---|
| `PagedResultViewer` | 유료 결과 화면 **11곳**이 함께 쓴다(astrology·destiny-compass·island-consult·life-book·love-secret·naming·sukuyo·vedic·ziwei·인연의 서·네오 작전실) |
| `AnalysisBasisPanel` · `AnalysisBasisLoading` | 기본 prop 값이 한국어였다 — 여러 상담 결과가 그대로 받아 썼다 |
| `GlossaryTerm` · `YeonSpriteFrame` | aria 기본값 |
| `CrystalGem` | SVG `aria-label` 이 한국어 고정이었다. 호출부는 이미 로케일 이름을 갖고 있어 `ariaLabel` prop 으로 넘기게 했다 |
| `AnimalShareCard` | 라벨을 `_lib/copy.ts` 로 옮겼다(값 `animal.*` 은 그 모듈이 명시적으로 제외하는 데이터 콘텐츠라 그대로) |

🔴 **리터럴 grep 가드가 하나 깨졌다.** `__tests__/ui/animal-destiny-narrative.static.test.js` 가 공유 카드의
한국어 문구(`row("연주"` 등)를 단언하고 있어서, 문구가 로케일화됐다는 이유만으로 실패했다. 지키려던 것은
문구가 아니라 **네 기둥이 카드에 다 들어가는가** 였으므로 카피 키와 데이터 경로로 재조준했다.

🔴 **가드 자신의 구멍도 음성 테스트가 찾았다.** `paid-result-locale-copy.test.js` 의 파일 수집이 `app/`·`src/`
만 훑고 **최상위 `components/` 를 빼먹고 있었다** — 공용 껍데기가 사는 바로 그 디렉터리다. 고쳤다.

### 🔴 남은 것 — 2026-08-25 3차 재측정

앞선 두 번의 수치(180개 → 2,092개)가 **둘 다 부풀려져 있었다.** 원인은 탐지기가 배선 방식을 못 본 것이고,
가장 크게 놓친 것은 **형제 디렉터리의 `_lib/*-copy.ts` 모듈**이었다(같은 폴더의 `*Copy.ts` 만 봤다).
임포트를 한 단계 따라가도록 고쳐 다시 재면:

```
"use client" + 한국어 · 배선 있음      132개
"use client" + 한국어 · 배선 전무       27개 · 한국어 표면 123
```

재현: 측정기는 다음 여섯 가지를 **전부** 배선으로 인정해야 한다 — 하나라도 빠지면 수치가 부푼다.

1. `Record<LoadingLocale, X>` / `Partial<Record<…>>`
2. `Partial<Record<NonKoLocale, X>>` + ko 기본값 (예: neo-war-room `result-copy.ts`)
3. `const X_EN` 폴백 **객체**
4. `const X_EN` 폴백 **문자열** (예: `LoveSimulationClient.tsx` — "진짜 en 누락"이라 적었던 것은 오탐이었다)
5. 사전 훅 `useT` / `useTPick`
6. 🔴 **형제 `_lib/*-copy.ts` 모듈 import** — FPTI·animal-destiny·sikojen-povailu·타로 3종·자미두수가 전부 이 모양이다

그리고 배선이 없어도 **결함이 아닌 것**이 남은 123개의 상당수다:

- `SikojenpovailuContext.tsx`(15) — `'금전운' | '연애운' | '행운'` 은 **한국어 타입 리터럴 = 기계 키**다.
- `CrystalGem.tsx`(48) — `GEM_META.name/keywords` 는 ko 정본이고 호출부가 `GEM_DISPLAY_COPY` 로 덮어쓴다.
  🔴 다만 `GEM_META.energy`(12문장)는 **소비처가 하나도 없는 데드 필드**다(3면 grep). 지우지는 않았다.
- `app/dev-status/page.tsx`(4) — production 에서 404 인 개발 전용 페이지.
- `LocaleSwitcher.tsx`(3) — "한국어"는 그 언어 자신의 표기라 번역 대상이 아니다.

**실제로 남은 결함**

| 대상 | 문자열 | 성격 |
|---|---|---|
| `app/human-design/**` | ~18 | 🔴 **ko/en 이중 언어만** 있다(`locale === "ko" ? A : B` 삼항). ja·zh 가 아예 없어 카피 모듈 신설이 필요하다 — 이 슬라이스에서 가장 큰 실제 결함 |
| `app/_lib/moonlight-store-snapshot.ts` | 4 | 상점 요약 오류 메시지 |
| `app/saju/animal-destiny/components/*` | ~15 | Hero·연출 컴포넌트 3종. 이미 있는 `_lib/copy.ts` 에 키를 더하면 된다 |
| `app/saju/love-simulation/_components/DialogueBox.tsx` | 2 | |

🔴 **콘텐츠 번역은 별개 계보다.** `love-simulation/_data/loveCodeMvp.ts` 한 파일이 5,323줄이고,
자미두수 해석 엔진 문장과 12궁·별 이름은 `advanced-ziwei-copy.ts` 헤더가 **로케일 무관으로 명시 제외**한다
(Vedic·나크샤트라와 같은 규칙). UI 카피 슬라이스와 섞어 세지 말 것.
## 다른 서비스로 넓힐 때 — 무엇을 실제로 확인할 것인가

작명에서 얻은 체크리스트다. `grep locale` 로 끝내지 말고 이 순서로 본다.

1. **출력 언어**: ③ 파이프가 처리한다. 확인만 하고 넘어간다. 새로 만들지 않는다.
2. **문화 가정**: 프롬프트가 특정 나라의 법·제도·관습을 전제하는가?

   **2026-08-25 실측 — 작명이 유일한 예외였다.** `worker/lib` + `worker/routes` 에서 한국어 프롬프트를
   가진 파일 **109개**를 `대법원|호적|가족관계등록부|주민등록|한국 사회|현대 한국|설날|수능|병역|국내`
   로 훑은 결과:

   | 파일 | 걸린 것 | 판정 |
   |---|---|---|
   | `worker/lib/naming-locale-profile.js` | 한국 사회·대법원·현대 한국·가족관계등록부·호적 | **의도된 것** — ko 프로파일이 한국 규정을 담는 자리다 |
   | `worker/routes/auth.js` | 국내 | 프롬프트가 아니라 인증 안내 문구(오탐) |

   즉 **다른 서비스의 프롬프트에는 한국 전용 전제가 없다.** 사주·자미두수·타로·점성술·숙요는
   원래 문화 중립적인 체계라, 출력 언어만 맞으면 내용도 성립한다. 작명이 특이했던 이유는
   **산출물이 "그 나라에서 실제로 등록 가능한 고유명사"** 였기 때문이다.

   재현:
   ```bash
   node -e "const fs=require('fs');const R=/대법원|호적|가족관계등록부|주민등록|한국 사회|현대 한국|설날|수능|병역|국내/g;
   const scan=d=>fs.readdirSync(d).filter(f=>/\.(js|mjs)$/.test(f)).map(f=>d+'/'+f)
     .filter(p=>/당신은|하세요|합니다/.test(fs.readFileSync(p,'utf8')))
     .forEach(p=>{const h=[...new Set(fs.readFileSync(p,'utf8').match(R)||[])];if(h.length)console.log(p,h.join(','))});
   scan('worker/lib');scan('worker/routes');"
   ```

   🔴 이 결과는 **오늘의 측정값**이다. 새 서비스를 붙이면 다시 돌릴 것.
3. **기계 계약**: 응답에서 파싱하는 라벨·헤딩·JSON 키가 번역되면 무엇이 죽는가?
   - 🔴 이게 가장 조용한 실패다. 작명의 이름 카드가 그랬고, 숙요 궁합은 응답 스키마가 **title 문자열**에
     걸려 있다(`lib/i18n/ai-locale.js` 주석). 파서를 먼저 열어 보고, 라벨 고정 지시를 프롬프트에 넣는다.
   - 확인 방법: 각 로케일 프롬프트의 예시 블록을 **실제 파서에 통과시키는 테스트**를 쓴다.
4. **결과 화면 카피**: 유료 결과 페이지가 한국어 하드코딩인가? (작명이 그랬다)
5. **결제 정체성**: locale 을 입력 해시에 넣지 않았는가?

## 다시 하지 말 것

- **파일 단위 grep 으로 파이프 부재를 단언하기** → 앰비언트 주입은 호출부에 안 보인다. 경로를 끝까지 따라갈 것.
- **출력 언어 지시문을 새로 만들기** → 정본이 있고, 한국어로 쓰면 안 되는 이유까지 적혀 있다.
- **로케일을 `inputHash` 에 넣기** → 배포 전 결제자가 막히고 재청구가 난다.
- **응답에서 파싱하는 라벨을 번역 대상에 넣기** → 파서가 조용히 빈 결과를 내고 UI 가 사라진다.
- **이름·고유명사를 조합으로 생성하기** → 이름이 아닌 것이 나온다. 실재 목록에서 고를 것.
- **"한국어 + 로케일 배선 없음" 파일 수를 결함 수로 읽기** → 서버 렌더 SEO 산문은 한국어가 정상이고,
  AdSense 가드가 그 분량을 센다.

## 검증 명령

```bash
npm run verify:ai-locale-pipeline     # 14 불변식 — AI 출력 로케일 파이프
npm run verify:naming-prompt          # 작명 배선 + 로케일 프로파일 전수
npm run test:jest -- __tests__/worker/naming-prompt.locale-profile.test.js
npm run test:jest -- __tests__/lib/assistant-sections.numbered-headings.test.js
npm run i18n:check                    # 사전 패리티(①)
npm run test:node                     # 로케일 이름 풀·초안 카피·장 제목 패턴 + 유료 결과 화면 카피 가드
```

🔴 **LLM 실호출은 하지 않는다.** 위 전부 정적이거나 로컬 렌더다. 지시 준수율은 과금 실호출 없이는
못 재므로 **미검증**으로 남긴다 — 그 사실을 숨기지 말 것.
