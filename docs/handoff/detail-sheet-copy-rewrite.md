---
status: active
updated: 2026-09-03
next: "남은 것은 선택 항목 2건뿐. 🔴 미해결 결제 결함 4건은 사용자 판단 대기 중"
---

# 인수인계 — 상세 팝업 문구를 사실 기반으로 재작성

🔴 **제1 원칙: 모르면 쓰지 않는다.** 팝업 설명이 실제 기능과 달라 사용자가 소송을 언급했다(2026-08-15).
근거를 못 찾은 문장은 **빈칸으로 두는 것이 맞다.** 상상해서 채우면 그게 정확히 금지된 행위다.

## 남은 작업 (권고 순서)

1. (선택) 배치 1 완료 12종의 기능별 `analysisSteps` — 7종이 범용 템플릿을 물려받지만 워커 라우트를 확인하니
   7종 전부 실제로 질문 입력을 받는다. **거짓이 아니라 일반적일 뿐**이라 급하지 않다.
2. (선택) 셸 한국어 원문의 구현 대조 — #1485 는 원문을 **옮기기만** 했고 사실 검증은 하지 않았다.
   사주 `rpt_*` 13종은 대조를 마쳤으므로(PR #1490) **그 13종은 대상에서 뺀다.**

완료 이력은 `gh pr list` 와 각 PR 본문이 정본이다(#629 · #1457 · #1467 · #1479 · #1485).
🔴 **PR-B(`#cdFinder` 추천 카드 배선)는 이미 배선돼 있다 — 착수하지 말 것**(2026-09-02 클릭 경로 5점 확인).
`data-pvw-paid` 는 결제를 **무장하지 않는** 표식이라 `paid-gate-auditor` 선행 조건도 없다
(무장 속성은 `data-coin-cost`·`data-tile-lock-cost`·`data-tile-lock-key` 셋뿐).

## 🔴 미해결 — 사용자 판단이 필요한 결제 결함 4건

1. **`saju-guardian-unlock` 이 영구 해금 집합에 없다.** 시트·타일은 "영구 해금 10,000원" 으로 파는데
   `worker/routes/fortune.js` 의 `PERSISTENT_UNLOCK_KEY_SET` 과 `index.html` 의
   `_CD_PERSISTENT_UNLOCK_BASE_KEYS` 에 그 키가 없다. **결제자가 재열람을 못 할 수 있다.**
   그래서 문안에서 가디언만 "영구/재열람" 표현을 뺐다 — 고쳐지면 문구도 함께 보강할 것.
2. **가격 표기가 표면마다 어긋난다** — `app/_lib/serviceSections.js` 의 "영구 해금 10,000원" vs 같은 파일의
   "5,000 per use" vs 런타임 정본(`worker/lib/paid-feature-registry.js`)의 프롬프트 메이커 4구간(3,000~10,000).
3. **레거시 `D` 의 royal-tea `cost` 가 3,000원**인데 레지스트리는 5,000원. 시트 표시는 레지스트리를 쓰므로
   화면은 정상이나 D 값이 낡았다.
4. **셸의 재잠금 방지 목록이 서버의 영구 해금 집합보다 훨씬 좁다**(2026-09-03 실측).
   `worker/routes/fortune.js:2235-2241` 은 유료 `rpt_*` 7종을 전부 영구 해금으로 두는데
   `index.html:29332` 의 `_CD_PERSISTENT_UNLOCK_BASE_KEYS` 는 `animal-destiny-unlock` ·
   `loveSimulation` 둘뿐이다. 그 배열은 **서버가 일시적으로 false 를 돌려줘도 재잠금하지 않는 시각적 방어**라
   (index.html:29329-29331 주석), 권리 상실이 아니라 **결제한 타일이 순간 다시 잠겨 보이는 위험**이다.
   실제 접근은 서버가 재검증하므로 데이터 손상은 아니다. 넓힐지 말지는 결제 영역 판단이라 손대지 않았다.

## 항목마다 이렇게 한다

1. `featureId`(= featureKey)로 **그 기능의 실제 구현**을 찾는다 — `js/core/uiBindings.js` 의
   `__lazyActionLoaders` 에서 진입 액션(`data-action`)을 따라가면 `js/*.js` 가 나온다.
2. 검증 가능한 사실만 뽑는다 — **입력**(생년월일? 카드? 사진?) · **산출 구조**(포지션·섹션 이름과 개수) ·
   **생성 방식**(서버 LLM? 규칙 엔진? 정적 콘텐츠?) · **가격**은 `worker/lib/paid-feature-registry.js`.
3. **구현에서 확인되지 않는 효능·감정·보장은 쓰지 않는다.** 근거가 없으면 그 필드를 **비운다** —
   렌더러가 빈 값을 `—` 로 그리므로 삭제가 곧 정직한 표시다.
4. 근거를 PR 본문에 `파일:줄` 로 남긴다. 팝업 문구에 **가격을 새로 쓰지 않는다**(레지스트리 연동돼 있다).

## 🔴 렌더러 함정 (모르면 허위가 렌더된다)

- **COPY 에 `feats` 를 안 쓰면 레거시 `D.feats` 의 옛 주장이 그대로 렌더된다** — 배치 2에서 15종 중 11종이
  그 상태였다(주역 "한자 원문", 룬 "24룬", 케멧 "47개 신" 등 전부 허위). 재작성 대상마다 반드시 저작할 것.
- **`_templateForTile` 은 타일이 자기 COPY 를 가져도 템플릿 전체를 돌려준다** — `analysisSteps` ·
  `answersQuestions` · `valueCompare` · `faq` 를 비우면 **범용 `saju` 템플릿의 주장이 렌더된다**
  (명상·요가·손금 팝업에 "명식 계산 … 대운·세운" 이 붙어 있었다). 이 4개 + `feats` 를 함께 저작한다.
- **사전 키에 하이픈 금지** — `_pvwSafeKey` 가 `[^A-Za-z0-9]+` 를 `_` 로 바꿔 셸에서 영영 조회되지 않는다.
- **키 조회에 trailing-slash 정규화가 없다** — `trailingSlash` 설정 탓에 실제 경로엔 슬래시가 붙는다.
  `'/x'` 키만 있으면 그 화면은 폴백 템플릿을 탄다.
- **분량 주장은 `minTotalChars` / 섹션 `minChars` 합**을 쓴다 — `totalCharTarget`(목표)이 아니라 서버 강제 하한.
- COPY 의 키 표기가 파일 안에서 **섞여 있다**(식별자는 따옴표 없이, 경로·하이픈 키는 작은따옴표).
  패치 스크립트가 한쪽만 가정하면 매칭 0건이 난다.
- `index.html` 은 이 레포에서 **LF** 다(`.gitattributes` 의 `eol=lf`). 패치는 개행을 **감지해서** 되쓸 것.

## 로케일 사전

- 대상은 **11개**다 — ko 는 셸 소스가 정본이라 사전에 `featureMarketing` 네임스페이스가 없다.
- 🔴 **`UNTRANSLATED_BUDGET` 은 0 이다**(2026-09-02, #1485). COPY 키를 새로 넣으면
  **같은 커밋에 11개 로케일을 채워야** CI 가 통과한다.
- 범위는 필드 전수가 아니라 `scripts/verify-feature-marketing-dictionary.mjs` 의 **`requiredPaths()`** 다
  (실측: 필드를 다 세면 477인데 실제 대상은 **362**. `featureId`·`category`·`badge` 는 조회하지 않는다).
- 🔴 자동 번역기 `i18n:translate-pending` 은 **Gemini 유료 실호출**이라 금지. 영어를 손으로 저작해 10개에 복사한다.
- 이 가드는 카테고리 템플릿이 채우는 몫을 안 세므로 요구 경로 수가 **하한**이다 —
  통과가 "화면 전체 번역됨"을 뜻하지 않는다.

## 검증

```
npm run verify:feature-marketing-schema      # 금지 필드(resultPreview/sampleReport) 재발 차단
npm run verify:feature-marketing-dictionary  # 🔴 ko 만 고치면 11개 로케일이 옛 문구를 계속 낸다
npm run verify:rpt-preview-cta               # 실제 Chrome — 팝업이 뜨고 CTA 로 진입되는지
npm run verify:mobile-cdp-smoke              # MOBILE_CDP_FOCUS=all-fortunes
npm run verify:public-parity
npm run verify:mobile-detail-nonintrusive
npm run typecheck
```

- `index.html` 을 고치면 **반드시** `npm run sync:public`(셸 7종 + js 미러).
- `app/_lib/serviceFeatureRegistry.ts` · `serviceSections.js` 를 고치면 **sitemap 원장이 무효화된다** —
  `npm run sitemap:generate` 를 같은 커밋에 담는다.
- 🔴 스택 PR 의 base 를 부모 브랜치로 두면 **CI 가 한 건도 안 돈다**(`pr-ci.yml` 트리거가 `branches: [main]`).
  `no checks reported` 는 이것이다. base 를 `main` 으로 바꾼 뒤 **close → reopen** 해야 런이 뜬다.

## 카운트 재현

🔴 **개수는 그날의 측정값이다 — 이 문서의 숫자를 인용하지 말고 다시 세라.**
(2026-09-02: 전체 141키 = 별칭 48 + 실작성 93, `feats` 보유 27 · `faq` 보유 50.)

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

---

이 문서에 적힌 "이미 검증됨" 은 **날짜와 근거가 함께 있는 것만** 신뢰하라(원칙 9).
진행하면서 갱신하되, **완료 회고는 쓰지 않는다** — `git log` 와 PR 본문이 정본이다.
