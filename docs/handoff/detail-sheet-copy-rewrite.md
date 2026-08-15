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

#629 로 **명백한 허위(없는 결과물을 결과라고 보여주던 것)는 제거됐다.** 가드도 반전돼
`sampleReport`/`resultPreview` 는 이제 **금지 필드**다(`scripts/verify-feature-marketing-schema.mjs`).

## 남은 작업

`index.html` 의 `var FEATURE_MARKETING_COPY` 에 있는 **실작성 64개 항목**(전체 92개 중 28개는 `inherit:` 별칭)의
**산문 필드가 아직 손으로 쓴 문구이고, 각 기능 구현과 대조되지 않았다.**

> 🔴 **개수 정정(2026-08-15 실측)**: 이 문서가 처음 적은 "실작성 67 / 전체 95"는 #629 이전 수치였다.
> 정본은 `index.html:34427~34523` 을 파싱한 값이며, 재현 명령은 아래 "진행 상황"의 카운트 스니펫이다.
> 배치 1(12종)이 끝났으므로 **남은 것은 52종**이다.

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

### 다음 배치 후보 (권고 순서)

1. **사주 `rpt_*` 13종** — `rpt_healthReportCard`·`rpt_quantumCard`·`rpt_lottoCard` 등. 구현이 `js/core/saju/*` 규칙 엔진이라
   LLM 없이 산출 구조를 그대로 읽을 수 있다. `rpt_skillTreeCard` 는 "8가지", `animal-destiny-unlock` 은 "3가지"를 주장 중 — **미검증**.
2. **오라클 7종** — `openIfaOracle` 이 "256개"를 주장 중(**미검증**), 나머지는 규칙 엔진.
3. **타로 5종** — `openTarotLoveModal` 은 이미 검증 완료(위 정본 예시). 나머지 4종.
4. 자미두수 5종 / 베다 4종 / 기타.

## 작업 규칙 (이 레포 고유 — 어기면 CI 가 막는다)

- `index.html` 을 고치면 **반드시** `npm run sync:public` (셸 7종 + js 미러 동기화)
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
npm run verify:feature-marketing-schema   # 금지 필드(resultPreview/sampleReport) 재발 차단
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
