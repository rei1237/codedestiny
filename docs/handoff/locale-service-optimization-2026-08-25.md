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

### 🔴 남은 것

**1. vi·hi 전용 프로파일**

지금은 라틴 프로파일에 묶여 있고, 무료 초안도 라틴 이름 풀(영어 이름)을 본다. vi 는 Hán-Việt 이 있어
CJK 쪽에 가깝고, hi 는 나크샤트라 기반 Namakaran 전통이 따로 있다. **미구현이지 "해당 없음"이 아니다.**
지금은 `freeDraftPoolNote` 로 "영어 이름 목록"임을 밝혀 두었을 뿐이다.

**2. `verify:naming-prompt` 가 CI 에서 안 돈다 — 사유가 사실과 다르다**

`scripts/verify-guard-wiring.mjs` 가 이 가드를 "LLM 실호출 — 원칙 8, 사용자 허락 후 수동" 으로
분류해 두었는데, `scripts/verify-naming-prompt-flow.mjs` 는 **전부 정적 검사다**(스크립트 자체 헤더가
그렇게 적고 있고, 실제로 import 하는 것은 `paid-feature-registry.js` 뿐이다). 즉 지금 이 가드는
아무것도 지키지 않는다. 배선은 게이트 추가라 사용자 승인 사항이므로 손대지 않았다.
그래서 이번 작업의 가드는 그 스크립트가 아니라 `__tests__/` 쪽에 두었다.

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
npm run test:node                     # 로케일 이름 풀·초안 카피·장 제목 패턴 가드
```

🔴 **LLM 실호출은 하지 않는다.** 위 전부 정적이거나 로컬 렌더다. 지시 준수율은 과금 실호출 없이는
못 재므로 **미검증**으로 남긴다 — 그 사실을 숨기지 말 것.
