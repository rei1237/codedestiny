---
status: active
updated: 2026-09-02
next: "사주 rpt_* 13종 저작. PR-B 는 이미 배선돼 있었고(아래 실측 5점), 로케일 구멍 28종은 #1485 로 닫혔다"
---

# 인수인계 — 상세 팝업 문구를 사실 기반으로 재작성

> 작성 2026-08-15. 작성 세션이 컨텍스트를 소진해 **남은 작업을 넘긴다**(CLAUDE.md 코딩 원칙 13).
> 이어받는 세션은 이 문서만 읽고 시작할 수 있어야 한다. 부족하면 그 자체를 이 문서에 보태라.

## 배경 — 사용자가 화를 낸 지점

모바일 상세 팝업(기능 카드 탭 → 바텀시트)의 설명이 **실제 기능과 달랐다.** 사용자 표현 그대로:

> 상세 팝업창 내용과 실제 서비스 내용이 다르잖아? … 한번만 더 이따위 거짓으로 작성하면 소송할줄 알아

🔴 **그래서 이 작업의 제1 원칙은 "모르면 쓰지 않는다"다.** 근거를 못 찾은 문장은 **빈칸으로 두는 것이 맞다.**
상상해서 채우면 그게 정확히 사용자가 금지한 행위다.

## 이미 끝난 것 (다시 하지 말 것)

| PR | 내용 | 상태 |
|---|---|---|
| #625 | 유료 기능 진입 불가 근본 수정(고스트 클릭 억제가 CTA 진입 클릭을 삼킴) | 머지·라이브 |
| #629 | **지어낸 결과 예시 전면 삭제** — `resultPreview` 44개 + `sampleReport` 28개, 렌더러·DOM·가드까지 | 머지·라이브 |
| #632 | paid-flow-gates 가 결제 diff 에서만 돌도록 선판정 추가 | 머지·라이브 |
| #634 | 이 인수인계 문서 + 코딩 원칙 13 | 머지·라이브 |
| 배치 1 | **숫자 주장 12종 재작성**(아래 "진행 상황") | PR 생성 |
| #1457 | **배치 2 = PR-A1** — 유료 15종(타로 4 · 오라클 6 · 해금형 4) 재작성 + `'/tarot/prompt-maker/'` 별칭 + "63개 스프레드"→77 정정 | 머지됨 |
| #1467 | **배치 3 = PR-A2** — 사주 파생 4 · 명상/요가 2 · 작명 1 · 상담 3 재작성 + 최애운명 무료 오분류 수정 + 손금 `featureId` 정정 | 머지됨 |
| #1473 | **PR-C** — 재작성 24종을 11개 로케일에 반영 + 하이픈 죽은 키 10개 정리 + `feats` 오염 5종 수정 + 새 가드 | **CLOSED** — base 를 `main` 으로 돌리면서 #1479 가 이 두 커밋을 함께 실어 갔다 |
| #1479 | **톤 패스** — App Router 모달의 지어낸 결과 예시 17블록 제거 + 사전 223노드 정리 + 가드를 허브까지 확장 | 머지됨(`cda7e6cac`) — PR-C 분량 포함 |
| #1485 | **로케일 구멍 닫기** — 사전 없던 무료 허브·도구 **28종**을 11개 로케일에 채우고 래칫을 28 → **0** | PR 생성·CI 8종 통과 |

#629 로 **명백한 허위(없는 결과물을 결과라고 보여주던 것)는 제거됐다.** 가드도 반전돼
`sampleReport`/`resultPreview` 는 이제 **금지 필드**다(`scripts/verify-feature-marketing-schema.mjs`).

## 남은 작업

`index.html` 의 `var FEATURE_MARKETING_COPY` 에 있는 **실작성 64개 항목**(전체 92개 중 28개는 `inherit:` 별칭)의
**산문 필드가 아직 손으로 쓴 문구이고, 각 기능 구현과 대조되지 않았다.**

> 🔴 **개수는 그날의 측정값이다 — 인용하지 말고 아래 카운트 스니펫을 다시 돌려라.**
> 2026-09-02 실측: 전체 141키 = 별칭 48 + 실작성 93, 그중 `feats` 보유 27 · `faq` 보유 50.
> (2026-08-15 에 적힌 "전체 92 / 실작성 64 / 남은 52" 는 그날의 값이고 지금과 다르다.)
> 배치 1(12종) + 배치 2(15종)가 끝났고, **유료 표면 기준 남은 것은 아래 "다음 배치 후보" 의 A2 묶음**이다.

대상 필드:
- `headline` / `subheadline` → 팝업의 `tagline`
- `painPoints` → 팝업의 기능 목록 자리(단, #629 에서 실제 `feats` 가 우선하도록 고침)
- `unlockBenefits` → "리포트에 담기는 것"
- `recommendedFor` → "누구에게 맞는가"
- `trustNotes` / `answersQuestions` / `analysisSteps` / `valueCompare` / `faq` / `ctaNote` / `reportScale`

**팝업에서 이미 진짜인 것**(건드리지 말 것): 가격(`worker/lib/paid-feature-registry.js` 연동)과 해금/보유 상태.

## 방법 — 항목마다 이렇게 한다

1. `featureId`(= featureKey)로 **그 기능의 실제 구현**을 찾는다. 진입 액션(`data-action`)으로 로더를 따라가면 된다:
   `js/core/uiBindings.js` 의 `__lazyActionLoaders` → 그 기능의 `js/*.js`.
2. 구현에서 **검증 가능한 사실만** 뽑는다:
   - 입력이 무엇인가(생년월일? 카드 뽑기? 사진?)
   - 산출 구조가 무엇인가(포지션/섹션 이름, 개수)
   - 생성 방식이 무엇인가(서버 LLM? 규칙 엔진? 정적 콘텐츠?) — API 엔드포인트로 확인
   - 가격은 **레지스트리**에서 확인(팝업 문구에 가격을 새로 쓰지 말 것, 이미 연동돼 있다)
3. 그 사실로 문장을 만든다. **구현에서 확인되지 않는 효능·감정·보장은 쓰지 않는다.**
4. 근거를 PR 본문에 `파일:줄` 로 남긴다.

### 정본 예시 — `openTarotLoveModal`(이미 검증 완료, 그대로 써도 된다)

`js/tarot-love-experience.js` 에서 확인한 사실:
- **6카드 관계 스프레드** — `RELATIONSHIP_POSITIONS`(`:31`), 실제 포지션 라벨(`:8-15`):
  ① 내가 바라보는 상대 ② 상대가 관계 전체를 보는 시각 ③ 상대가 나를 바라보는 마음
  ④ 상대의 연애 의지와 열망 ⑤ 관계를 가로막는 핵심 요인 ⑥ 가까운 흐름과 선택 기준
- 생성: `POST /api/tarot/draw`(`spreadType: relationship_six_card`) → `POST /api/tarot/love-reading`,
  **서버가 LLM 상담문을 동기 생성**(`:29` 주석, 서버 상한 ~42s)
- 가격 5,000원 = 레지스트리 50코인 × 100원(`worker/lib/paid-feature-registry.js:182`) — **일치 확인됨**

즉 "6장" 주장과 가격은 **사실**이었고, 거짓이었던 건 결과 예시(#629 에서 삭제)와
실제 기능 목록을 덮던 `painPoints` 였다.

## 진행 방식 권고

**한 번에 다 하지 말고 배치로.** 예: 타로 컬렉션 → 사주 → 오라클/기타 순으로 **10~15개씩 한 PR**.
배치마다 근거를 남기면 나중에 검증이 가능하고, 컨텍스트도 버틴다.

## 진행 상황

### 배치 1 — 숫자 주장 12종 (2026-08-15, 완료·PR 생성)

숫자를 먼저 골랐다. 참/거짓이 딱 갈리고, 12종 전부 20,000~30,000원 상품이라 허위일 때 피해가 가장 크며,
근거가 `worker/lib/*-prompt.*` 에 배열/상수로 존재해 대조가 빠르다.

**실측 결과 — 4건이 틀렸다.**

| featureId | 팝업이 주장하던 값 | 실측 | 근거 |
|---|---|---|---|
| `love-secret-ai-consultation` | 15섹션 | ❌ **28섹션 / 6그룹**, 하한 18,000자 | `worker/lib/love-secret-ai-prompt.js:39,183,424` · `worker/routes/love-secret-ai.js:919` |
| `sukuyo-compatibility-ai` | 14섹션 · 12,000자 | ❌ **15섹션 · 18,400자**(표기는 #635 를 따라 18,000) | `worker/routes/sukuyo-compatibility-ai.js:49-67` |
| `new-year-ai-consultation` | 10섹션 · 12,000자 · "2026년" | ❌ **5섹션 · 15,000자**, 연도는 사용자가 고름(기본=내년) | `worker/routes/new-year-ai.js:26,42` · `app/new-year-ai-consultation/NewYearAiClient.tsx:191,1889` |
| `life-book-ai-consultation` | 10챕터 · 10,000자 | ⚠️ 챕터는 맞고 분량이 과소 — **하한 15,000자** | `worker/routes/life-book-ai.js:78,82` |
| `master-love-codex` | 20챕터 · 50,000자 | ✅ 일치(하한 46,000) | `worker/lib/master-love-codex-prompt.mjs` `_CHAPTERS`/`_META` |
| `master-love-codex-compat` | 20챕터 · 50,000자 | ✅ 일치(하한 46,000) | `worker/lib/master-love-codex-compat-prompt.mjs:24,39` |
| `ziwei-deep-pdf` | 15챕터 · 36,000자 | ✅ 일치(하한 34,000) | `worker/lib/ziwei-deep-report-prompt.mjs:22,41` |
| `neo-operation-room-consultation` | 14섹션 | ✅ 일치 | `worker/lib/neo-operation-room-prompt.js:689` |
| `fusion-fortune-consultation` | 9섹션 · 20,000자 | ✅ 일치(본문 9섹션, `total.min`) | `worker/lib/fusion-fortune-prompt.js:12,55,133` |
| `nakshatra-ai-consultation` | 21섹션 · 14,000자 | ✅ 일치(5+6+10, 하한 14,700) | `worker/lib/nakshatra-ai-prompt.js:151,174` · `worker/routes/nakshatra-ai.js:86-90` |
| `karma-destiny-ai-consultation` | 15챕터 | ✅ 일치 | `worker/routes/karma-destiny-ai.js:134` |
| `life-fortune-ai-consultation` | 10챕터 · 30,000자 | ✅ 일치(+전문가 리딩 4편) | `worker/routes/life-book-ai.js:86,193` · `:1352` |

🔴 **`minWords` 는 목표가 아니라 서버가 강제하는 하한을 쓴다** — 작업 중 #635(`fix/paid-volume-copy-sync`)가 먼저 머지돼
`valueCompare` 의 분량 문구를 **하한**으로 고쳐 뒀는데, `reportScale` 은 손대지 않아 두 값이 한 팝업 안에서 어긋나 있었다.
필드 이름이 `minWords` 이므로 **하한이 맞다**. 배치 1 에서 양쪽을 하한으로 통일했다 —
마스터 인연의 서 본편·궁합 `minTotalChars` 46,000(목표 50,000), 자미두수 심층 PDF 34,000(목표 36,000),
숙요 궁합 18,000(실측 합 18,400 — #635 의 표기를 따랐다).
**다음 배치도 같은 규칙을 쓸 것**: `totalCharTarget` 이 아니라 `minTotalChars`/섹션 `minChars` 합.

**숫자 외에 함께 한 것**
- `unlockBenefits` 를 **구현이 갖고 있는 실제 목차**로 교체했다(예: `MASTER_LOVE_CODEX_CHAPTERS` 의 "제1장 · 운명의 문 …" 20장).
- 각 엔트리에 **`feats`**(= 팝업 "주요 기능" 목록)를 추가했다. 12종 중 10종은 레거시 `D` 레코드가 없어
  그 자리에 `painPoints`("이런 고민 있죠?")가 렌더되고 있었다.
- 검증할 수 없는 **무료 티어 분량 주장**(`valueCompare[].free` 의 "약 300자"·"약 200자")을 지웠다.
  렌더러가 빈 값을 `—` 로 그리므로 삭제가 곧 정직한 표시다(`_renderCompare`).
- 카피에 하드코딩돼 있던 **가격 문구**("기존 결제 정책(30,000원)")를 지웠다 — 가격은 레지스트리 연동으로 이미 표시된다.

**렌더러 결함 2건도 함께 고쳤다**
- 목록 제목이 무조건 `'이런 생각이 들 때 열어보면 좋아요.'` 로 덮여 있었는데, #629 이후 그 아래는 실제 기능 목록이라
  제목과 내용이 어긋났다. 이제 **폴백(`painPoints`)일 때만** 그 제목을 쓰고, 실제 `feats` 면
  `preview.featuresLabel`(= "주요 기능")을 쓴다. 이 키는 `public/i18n/{en,ja,zh-tw,de}.json` 에 **존재한다**
  ("Key features"/"主な機能"/"主要功能") — 즉 비한국어 로케일에 한국어가 노출되던 버그가 함께 고쳐졌다.
- 그 제목의 폴백을 DOM 에서 되읽으면 **직전 타일의 제목이 남는다**(이 라벨만 타일마다 값이 달라진다).
  마크업 원본 텍스트를 `_featsLabelDefault` 로 초기 1회만 캐시하도록 바꿨다.

**남은 52종의 카운트 재현**

```bash
node -e "
const fs=require('fs');const BS=String.fromCharCode(92),Q=String.fromCharCode(39);
const src=fs.readFileSync('index.html','utf8');
const i=src.indexOf('var FEATURE_MARKETING_COPY=');const st=src.indexOf('{',i);
let d=0,e=-1,s=null;
for(let p=st;p<src.length;p++){const c=src[p];
 if(s){if(c===BS){p++;continue;}if(c===s)s=null;continue;}
 if(c===Q||c==='\"'||c===String.fromCharCode(96)){s=c;continue;}
 if(c==='{')d++;else if(c==='}'){d--;if(d===0){e=p;break;}}}
const M=eval('('+src.slice(st,e+1)+')');const k=Object.keys(M);
console.log('total',k.length,'alias',k.filter(x=>M[x].inherit).length,'authored',k.filter(x=>!M[x].inherit).length);
console.log('feats 있음',k.filter(x=>M[x].feats).length);"
```

### 배치 2 = PR-A1 — 타로 4 · 오라클 6 · 해금형 4 (2026-09-02, PR #1457 · CI 통과)

15종을 전부 구현 대조 후 재작성했다. **서빙 키와 근거 파일:줄은 PR #1457 본문의 표가 정본**이므로
여기 옮겨 적지 않는다. 다음 배치가 알아야 할 것만 남긴다.

**이번에 확정된 렌더러 사실 (다음 배치도 그대로 적용된다)**
- `_resolvePreviewData`(`index.html:33751`)는 `Object.assign({}, template, D, COPY)` 다.
  🔴 **COPY 에 `feats` 를 안 쓰면 레거시 `D.feats` 의 옛 주장이 그대로 렌더된다.** 이번 15종 중 11종이
  그 상태였다(주역 "한자 원문", 이파 "블리윗", 룬 "24룬", 케멧 "47개 신", 홍차 "20가지 상징" 등 전부 허위).
  **재작성 대상마다 `feats` 를 반드시 저작할 것.**
- 키 조회(`_marketingKeys`)에 **trailing-slash 정규화가 없다.** `trailingSlash` 설정 때문에 실제 경로는
  슬래시가 붙으므로 `'/x'` 키만 있으면 그 화면은 폴백 템플릿을 탄다. 이번에 `'/tarot/prompt-maker/'` 를 추가했고,
  다음 배치도 `href`/`path` 로 서빙되는 키가 있으면 같은 점검이 필요하다.
- COPY 의 키 표기는 **파일 안에서 섞여 있다**(식별자 키는 따옴표 없이, 경로·하이픈 키는 작은따옴표).
  패치 스크립트를 쓸 때 한쪽만 가정하면 매칭 0건이 난다.
- 🔴 **`index.html` 은 이 워크트리에서 LF 다**(`.gitattributes` 의 `eol=lf`). "CRLF 파일" 로 알려져 있었으나
  2026-09-02 실측은 CRLF 0 · LF 37,393. 패치 스크립트는 개행을 **감지해서 되쓸 것**.
- `app/_lib/serviceFeatureRegistry.ts`·`serviceSections.js` 를 고치면 **sitemap 원장이 무효화된다.**
  `npm run sitemap:generate` 를 돌려 같은 커밋에 담는다(이번엔 `/about/` + 4개 로케일 insights 의 lastmod 만 이동).

**이번에 의도적으로 비운 것** — `reportScale`·`valueCompare`·`ctaNote` 를 15종 전부에서 생략했다.
규칙 엔진 상품에는 서버 강제 분량 하한이 없고(천체의 선율의 4,800은 `minWords` 가 아니라 **문자** 하한),
무료 티어 대비 주장도 근거가 없다. **다음 배치도 근거 없으면 비우는 쪽이 정답이다.**

### 배치 3 = PR-A2 — 사주 파생 4 · 명상/요가 2 · 작명 1 · 상담 3 (2026-09-02, PR #1467)

10종을 구현 대조 후 재작성했다. **서빙 키·근거 `파일:줄` 표는 PR #1467 본문이 정본.** 다음 배치가 알아야 할 것만 남긴다.

🔴 **이번에 발견한 렌더러 사실 — 배치 2 의 `feats` 규칙만으로는 부족하다.**
`_templateForTile` 은 타일이 자기 COPY 를 가져도 **템플릿 전체를 돌려준다.** 그래서 COPY 가
`analysisSteps`·`answersQuestions`·`valueCompare`·`faq` 를 비우면 **범용 `saju` 템플릿의 주장이 그대로 렌더된다** —
실제로 네빌 명상·요가·손금·러브 시뮬레이션 팝업에 "명식 계산 … 대운·세운", "무료: 기본 명식과 성향 요약",
"태어난 시간을 모르면 못 보나요?" 가 붙어 있었다. **재작성 대상마다 이 4개 + `feats` 를 저작할 것.**
(`_inferMarketingTemplate` 에 명상·요가·손금·작명 분기가 없어 전부 `saju`/`report` 로 떨어진다.)

**문안 밖 수정 3건**(전부 이번 PR 에 포함, 회귀 위험은 PR 본문 참조)
- **최애운명(`/saju/destiny-bias`)은 무료다** — `worker/routes/destiny-bias.js:62` · 레지스트리에 키 없음 ·
  `serviceFeatureRegistry.ts` `accessType:"free"`. 그런데 팝업은 "가격 확인 중" + 유료 안내를 띄웠다.
  🔴 **세 곳을 같이 고쳐야 한다** — `_hasPaidPreviewSignal` 정규식에서 제거 + 타일에 `data-pvw-free="1"`
  (없으면 팝업이 아예 안 열린다) + 레거시 `D.openDestinyBias` 의 `ct:'paid'`→`'free'`·허위 `cost` 제거
  (`_resolvePreviewData` 가 `merged.ct==='paid'` 로도 유료 렌더를 켠다). `scripts/measure-home-score.mjs:617` 에 같은 정규식 사본이 있다.
- **손금 `featureId` 오타** — `palm-reading` → `palm-reading-general`(레지스트리 키). 값이 틀리면 가격이 영영 "확인 중"이다.

**의도적으로 비운 것** — 러브 시뮬레이션 "최소 10장면"(`MIN_PLAYABLE_SCENES` 의미 미확인), 만남의 장소 시드 재현성,
베다 "항성 기준", 점성술 무료 비교열, 작명 PDF. 근거를 못 찾아 뺐다.

**안 한 것** — 🔴 **배치 1 완료 12종의 톤 패스는 미착수다.** PR-A2 범위에 있었으나 컨텍스트가 모자라 넘긴다.

### 🔴 미해결 — 사용자 판단이 필요한 결제 결함 3건 (PR #1457 본문에도 있음)

1. **`saju-guardian-unlock` 이 영구 해금 집합에 없다.** 시트·타일은 "영구 해금 10,000원" 으로 파는데
   `worker/routes/fortune.js:2214-2253` 의 `PERSISTENT_UNLOCK_KEY_SET` 과 `index.html:29263` 의
   `_CD_PERSISTENT_UNLOCK_BASE_KEYS` 에 그 키가 없다. **결제자가 재열람을 못 할 수 있다.**
   그래서 이번 문안에서 가디언만 "영구/재열람" 표현을 뺐다 — 고쳐지면 문구도 함께 보강할 것.
2. **가격 표기가 표면마다 어긋난다** — `app/_lib/serviceSections.js:36` "영구 해금 10,000원" vs 같은 파일의
   "5,000 per use" vs 런타임 정본(`worker/lib/paid-feature-registry.js`)의 프롬프트 메이커 4구간(3,000~10,000).
3. **레거시 `D` 의 royal-tea `cost` 가 3,000원**인데 레지스트리는 5,000원(`paid-feature-registry.js:201`).
   시트 표시는 레지스트리를 쓰므로 정상이나 D 값이 낡았다.

### PR-C — 로케일 드리프트 (2026-09-02, PR #1473 · CI 통과)

재작성 24종의 영어를 손저작해 11개 로케일에 넣었다(사용자 결정대로 en 1개만 저작 후 복사, 과금 실호출 없음).
**근거 표와 병합 규칙은 PR #1473 본문이 정본.** 다음 세션이 알아야 할 것만 남긴다.

🔴 **하이픈이 든 사전 키는 셸에서 영영 조회되지 않는다** — `_pvwSafeKey`(`index.html:33522`)가 `[^A-Za-z0-9]+` 를
`_` 로 바꾼다. 새 네임스페이스를 만들 때 **하이픈을 쓰지 말 것.** 이번에 10개를 정리했다(5 흡수 · 5 rename).

🔴 **사전 `feats` 가 `painPoints` 번역본이던 5종을 고쳤다** — 셸은 `feats` 를 먼저 쓰는데(`index.html:33850`
`if(!merged.feats)`) 사전이 옛 공감 문구를 들고 있어 11개 로케일이 그것을 봤고 ko 4번째 줄은 한국어가 샜다.
`feats`/`painPoints` 를 둘 다 가진 36종 중 **길이가 같아 조용히 어긋나는 것은 0개**라 개수 기반 가드로 오늘은 충분하다.

**새 가드 `npm run verify:feature-marketing-dictionary`** (`scripts/verify-feature-marketing-dictionary.mjs`,
`pr-ci.yml` i18n 스텝에 배선). 변이 4종 전부 물었다. 한계: 카테고리 템플릿이 채우는 몫은 안 세므로
요구 경로 수는 **하한**이다 — 통과가 "화면 전체 번역됨"을 뜻하지 않는다.

🔴 **남은 구멍 2건 — 둘 다 닫혔다**
1. ~~**사전이 아예 없는 COPY 키 28개**~~ → **#1485 로 해결**(아래).
2. ~~**App Router 모달의 `resultPreview`**~~ → **#1479 로 해결**(아래).

### 톤 패스 (2026-09-02, PR #1479 · CI 통과)

배치 1 12종의 문안을 손보러 들어갔다가 **더 큰 것**을 찾았다. `FeatureMarketingDetailModal.tsx` 가
지어낸 결과 예시를 **17블록** 들고 있었다 — `EXPLICIT_COPY` 의 `resultPreview` 9종뿐 아니라
`CATEGORY_COPY` 의 `sampleReport` **8종**까지. 후자는 카테고리 기본값이라 그 카테고리로 떨어지는
**모든** 상품에 붙는다. 캡션이 "실제 … 결과의 도입부를 **그대로 옮긴** 샘플"이라고 단언한다.

🔴 **가드가 초록불이었던 이유**: `verify:feature-marketing-schema` 는 그 필드를 금지하지만
**`index.html` 만 읽었다.** `/app` 사본은 아무도 안 봤다. 이제 허브 모달까지 보고, 파일을 못 읽으면
실패한다(fail-closed). 변이 주입으로 무는 것을 확인했다.

지운 것: 데이터 17블록 · 죽은 코드(타입 2·필드 2·localize 2·렌더 섹션 ③) = `.tsx` **-99줄** ·
사전 **223노드**(11개 로케일 × 17 + `preview.sample*` 3키 × 12).

🔴 **배치 1 12종의 문안 자체는 손대지 않았다.** 그중 7종이 카테고리 템플릿의 일반 `analysisSteps` 를
물려받지만, 워커 라우트를 확인하니 **7종 전부 실제로 질문 입력을 받는다**
(`karma-destiny-ai.js:433,561` · `life-book-ai.js:1027` · `love-secret-ai.js:294` ·
`sukuyo-compatibility-ai.js:334` · `new-year-ai.js:291,877` · `neo-operation-room.js:188`).
**거짓이 아니라 일반적일 뿐**이라 기능별 저작은 선택 사항으로 남긴다.

### PR-B 는 이미 배선돼 있었다 (2026-09-02 실측 — 착수하지 말 것)

`#cdFinder` 추천 카드가 상세 시트를 못 연다는 이 문서의 서술은 **낡았다.** 클릭 경로 5점을 전부 열어 확인했다:

1. [js/core/home-service-finder.js:195-218](../../js/core/home-service-finder.js#L195-L218) `openerNode()` 가 유료 항목에 `data-feature-key` + `data-pvw-paid="1"`, 무료 항목에 `data-pvw-free="1"` 을 이미 붙인다(호출부 246 · 306).
2. [index.html:34454](../../index.html#L34454) 델리게이션 선택자에 `[data-pvw-free],[data-pvw-paid]` 가 들어 있다.
3. [index.html:33757](../../index.html#L33757) `_hasPaidPreviewSignal()` 의 첫 검사가 `data-pvw-paid` 다.
4. [index.html:34457](../../index.html#L34457) 모바일 유료 전용 게이트를 그 신호가 통과시킨다.
5. [docs/handoff/home-ux-audit-2026-09-01.md:265](home-ux-audit-2026-09-01.md#L265) 가 이 배선을 **완료(2026-09-02)** 로 기록한다.

🔴 `data-pvw-paid` 는 **결제를 무장하지 않는 표식**이다 — 무장 속성은 `data-coin-cost`·`data-tile-lock-cost`·
`data-tile-lock-key` 셋뿐이고, `openerNode()` 의 주석이 그 셋을 붙이지 말라고 못박고 있다. 값 없는
`data-feature-key` 는 이 레포 관례상 결제 키가 아니다. 그래서 `paid-gate-auditor` 선행 조건도 소멸했다.

### 로케일 구멍 닫기 (2026-09-02, PR #1485 · CI 통과)

사전이 없던 **28종 전부 무료 허브·도구 타일**이었고, 한국어 원문은 이미 셸에 있었다. 즉 **저작이 아니라 번역**이다.
가드의 `requiredPaths` 가 요구하는 **362경로 × 11로케일 = 3,982 문자열**을 채웠다(로케일당 `608/0` — 순수 추가).

- 🔴 **유료 LLM 실호출 0회.** 영어를 손으로 옮기고 나머지 10개 로케일에 복사했다(2026-09-02 결정).
- `featureId`·`category`·`badge` 는 사전 조회 대상이 **아니다** — `requiredPaths` 를 읽고 범위를 잡을 것.
  전체 필드를 세면 477이 나오지만 실제 대상은 362다.
- 통화는 기존 관례 `₩10,000`(`openSibylModal.premiumOutcomes.1`)을 따라 `₩5,000`·`₩30,000`.
- `UNTRANSLATED_BUDGET` **28 → 0**. 🔴 이제 `FEATURE_MARKETING_COPY` 에 키를 새로 넣으면
  **같은 커밋에 11개 로케일도 채워야** CI 가 통과한다.
- 가드가 무는지 변이로 확인했다(`ja.json` 경로 1건 제거 → 종료코드 1). 🔴 되돌릴 때 `git checkout` 을
  쓰지 않았다 — 같은 파일의 미커밋 변경을 날린다.

### 다음 배치 후보 (권고 순서)

1. **사주 `rpt_*` 13종** — `js/core/saju/*` 규칙 엔진이라 산출 구조를 그대로 읽을 수 있다. **추천**: 근거가
   코드에 있어 "모르면 쓰지 않는다" 원칙과 충돌하지 않는다.
2. (선택) 배치 1 중 7종의 기능별 `analysisSteps` 저작 — 위 톤 패스 절 참고. 거짓이 아니라 일반적일 뿐이라 급하지 않다.
3. (선택) 셸 한국어 원문 자체의 구현 대조 — #1485 는 원문을 **옮기기만** 했고 사실 검증은 하지 않았다.

## 작업 규칙 (이 레포 고유 — 어기면 CI 가 막는다)

- `index.html` 을 고치면 **반드시** `npm run sync:public` (셸 7종 + js 미러 동기화)
- 🔴 **스택 PR 의 base 를 부모 브랜치로 두면 CI 가 한 건도 안 돈다** — `pr-ci.yml` 트리거가
  `branches: [main]` 이다. `no checks reported` 는 GitHub 이 이벤트를 흘린 게 아니라 이것이다.
  base 를 `main` 으로 바꾼 뒤 **close → reopen** 해야 런이 뜬다(`edited` 는 트리거 타입에 없다).
  머지 순서 제약은 base 와 무관하게 그대로다 — 부모 PR 을 먼저 머지한다.
- 격리 워크트리에서 작업한다 — 메인 작업 디렉터리를 다른 세션이 동시에 쓴다(실사고 있음):
  ```
  git worktree add .claude/worktrees/<name> -b <branch> origin/main
  cmd //c mklink //J node_modules "D:\Development\code-destiny\node_modules"
  ```
  정리는 `cmd //c rmdir node_modules` → `git worktree remove` → 빈 껍데기 남으면 `rmdir`
- `main` 은 자주 움직인다. 충돌하면 생성 파일 충돌을 풀지 말고 **현재 main 위에 커밋을 다시 쌓는 편이 안전**하다
  (소스 변경이 작을 때. 실제로 두 번 그렇게 처리했다)
- 머지(=프로덕션 배포)는 **사용자가 한다.** PR 생성까지가 범위다.

### 검증 (문구 변경 시)

```
npm run verify:feature-marketing-schema      # 금지 필드(resultPreview/sampleReport) 재발 차단
npm run verify:feature-marketing-dictionary  # 🔴 ko 카피만 고치면 11개 로케일이 옛 문구를 계속 낸다
npm run verify:rpt-preview-cta            # 실제 Chrome — 팝업이 뜨고 CTA 로 진입되는지
npm run verify:mobile-cdp-smoke           # MOBILE_CDP_FOCUS=all-fortunes
npm run verify:public-parity
npm run verify:mobile-detail-nonintrusive
npm run typecheck
```

## 이어받는 세션에게

- 이 문서에 적힌 "이미 검증됨" 항목은 **날짜와 근거가 함께 있는 것만** 신뢰하라(원칙 9).
- 진행하면서 이 문서를 갱신하라 — 어디까지 했는지, 무엇을 근거로 썼는지.
- 근거를 못 찾은 기능이 나오면 **추측해서 채우지 말고** 그 기능을 목록에 남기고 사용자에게 물어라.
